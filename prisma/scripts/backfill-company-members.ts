/**
 * Backfill CompanyMember records from existing access models.
 *
 * Sources (processed in order):
 *   1. CompanyOwnership  -- most specific, per-company
 *   2. CompanyStaffAccess -- per-company staff
 *   3. OrganizationUser   -- broadest, org-wide implied access
 *
 * Role mapping:
 *   CompanyOwnership  isSubscribingOwner=true   -> LEAD
 *   CompanyOwnership  isSubscribingOwner=false   -> CONTRIBUTOR
 *   CompanyStaffAccess (all)                     -> CONTRIBUTOR
 *   OrganizationUser  SUPER_ADMIN / ADMIN        -> LEAD
 *   OrganizationUser  TEAM_LEADER / MEMBER       -> CONTRIBUTOR
 *   OrganizationUser  VIEWER                     -> VIEWER
 *
 * Upserts use role-priority logic: only upgrades, never downgrades.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   npx tsx prisma/scripts/backfill-company-members.ts
 *   DRY_RUN=1 npx tsx prisma/scripts/backfill-company-members.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Local type definitions for CompanyRole
// CompanyRole may not be in the generated Prisma client yet (added in Phase 1
// migration). We define it locally so the script can run as soon as the
// migration is applied, even before `prisma generate` regenerates the client
// with the new enum. The string values match the Prisma enum exactly.
// ---------------------------------------------------------------------------

type CompanyRole = 'LEAD' | 'CONTRIBUTOR' | 'VIEWER'
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEADER' | 'MEMBER' | 'VIEWER'

// ---------------------------------------------------------------------------
// Role hierarchy: higher numeric value = higher privilege
// ---------------------------------------------------------------------------

const ROLE_RANK: Record<CompanyRole, number> = {
  VIEWER: 1,
  CONTRIBUTOR: 2,
  LEAD: 3,
}

function isHigherRole(candidate: CompanyRole, existing: CompanyRole): boolean {
  return ROLE_RANK[candidate] > ROLE_RANK[existing]
}

function orgUserRoleToCompanyRole(role: string): CompanyRole {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return 'LEAD'
    case 'TEAM_LEADER':
    case 'MEMBER':
      return 'CONTRIBUTOR'
    case 'VIEWER':
      return 'VIEWER'
    default:
      return 'CONTRIBUTOR'
  }
}

// ---------------------------------------------------------------------------
// Dry-run detection
// ---------------------------------------------------------------------------

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'

// ---------------------------------------------------------------------------
// In-memory tracker for role upgrades across sources
// Keys are "companyId:userId"
// ---------------------------------------------------------------------------

const memberMap = new Map<string, { companyId: string; userId: string; role: CompanyRole; assignedById: string | null }>()

function compositeKey(companyId: string, userId: string): string {
  return `${companyId}:${userId}`
}

/**
 * Upsert into the in-memory map. Only upgrades the role, never downgrades.
 * Returns 'created' | 'upgraded' | 'skipped'.
 */
function trackMember(
  companyId: string,
  userId: string,
  role: CompanyRole,
  assignedById: string | null,
): 'created' | 'upgraded' | 'skipped' {
  const key = compositeKey(companyId, userId)
  const existing = memberMap.get(key)

  if (!existing) {
    memberMap.set(key, { companyId, userId, role, assignedById })
    return 'created'
  }

  if (isHigherRole(role, existing.role)) {
    existing.role = role
    // Keep the most meaningful assignedById (non-null preferred)
    if (assignedById) {
      existing.assignedById = assignedById
    }
    return 'upgraded'
  }

  return 'skipped'
}

// ---------------------------------------------------------------------------
// Phase 1: CompanyOwnership
// ---------------------------------------------------------------------------

async function processCompanyOwnerships(): Promise<{ processed: number; created: number; upgraded: number; skipped: number }> {
  console.log('\n--- Phase 1: CompanyOwnership ---')

  const ownerships = await prisma.companyOwnership.findMany({
    where: { status: 'ACTIVE' },
    include: { company: { select: { deletedAt: true } } },
  })

  let processed = 0
  let created = 0
  let upgraded = 0
  let skipped = 0

  for (const ownership of ownerships) {
    // Skip soft-deleted companies
    if (ownership.company.deletedAt !== null) {
      skipped++
      continue
    }

    processed++
    const role: CompanyRole = ownership.isSubscribingOwner ? 'LEAD' : 'CONTRIBUTOR'

    const result = trackMember(
      ownership.companyId,
      ownership.userId,
      role,
      null, // CompanyOwnership has invitedById but it's less relevant
    )

    if (result === 'created') created++
    else if (result === 'upgraded') upgraded++
    else skipped++
  }

  console.log(`  Processed: ${processed} | Created: ${created} | Upgraded: ${upgraded} | Skipped: ${skipped}`)
  return { processed, created, upgraded, skipped }
}

// ---------------------------------------------------------------------------
// Phase 2: CompanyStaffAccess
// ---------------------------------------------------------------------------

async function processCompanyStaffAccess(): Promise<{ processed: number; created: number; upgraded: number; skipped: number }> {
  console.log('\n--- Phase 2: CompanyStaffAccess ---')

  const staffAccess = await prisma.companyStaffAccess.findMany({
    where: { status: 'ACTIVE' },
    include: { company: { select: { deletedAt: true } } },
  })

  let processed = 0
  let created = 0
  let upgraded = 0
  let skipped = 0

  for (const access of staffAccess) {
    if (access.company.deletedAt !== null) {
      skipped++
      continue
    }

    processed++

    const result = trackMember(
      access.companyId,
      access.userId,
      'CONTRIBUTOR',
      access.invitedById,
    )

    if (result === 'created') created++
    else if (result === 'upgraded') upgraded++
    else skipped++
  }

  console.log(`  Processed: ${processed} | Created: ${created} | Upgraded: ${upgraded} | Skipped: ${skipped}`)
  return { processed, created, upgraded, skipped }
}

// ---------------------------------------------------------------------------
// Phase 3: OrganizationUser
// ---------------------------------------------------------------------------

async function processOrganizationUsers(): Promise<{ processed: number; created: number; upgraded: number; skipped: number }> {
  console.log('\n--- Phase 3: OrganizationUser ---')

  // Fetch all org users with their organization's companies
  const orgUsers = await prisma.organizationUser.findMany({
    include: {
      organization: {
        include: {
          companies: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
      },
    },
  })

  let processed = 0
  let created = 0
  let upgraded = 0
  let skipped = 0

  for (const orgUser of orgUsers) {
    const companyRole = orgUserRoleToCompanyRole(orgUser.role)
    const companies = orgUser.organization.companies

    for (const company of companies) {
      processed++

      const result = trackMember(
        company.id,
        orgUser.userId,
        companyRole,
        null,
      )

      if (result === 'created') created++
      else if (result === 'upgraded') upgraded++
      else skipped++
    }
  }

  console.log(`  Processed: ${processed} | Created: ${created} | Upgraded: ${upgraded} | Skipped: ${skipped}`)
  return { processed, created, upgraded, skipped }
}

// ---------------------------------------------------------------------------
// Flush: write in-memory map to database via upserts
// ---------------------------------------------------------------------------

async function flushToDatabase(): Promise<{ upserted: number; upgraded: number; unchanged: number }> {
  console.log('\n--- Writing to database ---')

  const entries = Array.from(memberMap.values())
  console.log(`  Total unique company-user pairs to write: ${entries.length}`)

  if (DRY_RUN) {
    console.log('  [DRY RUN] Skipping database writes.')
    // Summarize what would happen
    const roleCounts = { LEAD: 0, CONTRIBUTOR: 0, VIEWER: 0 }
    for (const entry of entries) {
      roleCounts[entry.role]++
    }
    console.log(`  Would create/update: ${entries.length} records`)
    console.log(`    LEAD: ${roleCounts.LEAD}`)
    console.log(`    CONTRIBUTOR: ${roleCounts.CONTRIBUTOR}`)
    console.log(`    VIEWER: ${roleCounts.VIEWER}`)
    return { upserted: 0, upgraded: 0, unchanged: 0 }
  }

  // Batch in chunks to avoid overwhelming the database
  const BATCH_SIZE = 100
  let upserted = 0
  let upgraded = 0
  let unchanged = 0

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE)

    await prisma.$transaction(
      batch.map((entry) =>
        prisma.companyMember.upsert({
          where: {
            companyId_userId: {
              companyId: entry.companyId,
              userId: entry.userId,
            },
          },
          create: {
            companyId: entry.companyId,
            userId: entry.userId,
            role: entry.role,
            assignedById: entry.assignedById,
          },
          update: {
            // Only upgrade role, never downgrade.
            // Prisma doesn't support conditional updates in upsert,
            // so we set the role to the desired value. Since our in-memory
            // map already resolved to the highest role across all sources,
            // this is correct even if a record already exists in the DB
            // from a previous run -- UNLESS someone manually set a higher
            // role. We handle this by reading existing records first.
            role: entry.role,
            assignedById: entry.assignedById,
          },
        }),
      ),
    )

    const batchEnd = Math.min(i + BATCH_SIZE, entries.length)
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: upserted records ${i + 1}-${batchEnd}`)
    upserted += batch.length
  }

  // Verify: read back existing records to count actual upgrades vs unchanged
  // (This is optional but useful for reporting accuracy)
  console.log(`  Upserted ${upserted} total records`)
  return { upserted, upgraded, unchanged }
}

// ---------------------------------------------------------------------------
// Pre-flight: load existing CompanyMember records so we respect manually-set roles
// ---------------------------------------------------------------------------

async function loadExistingMembers(): Promise<number> {
  const existing = await prisma.companyMember.findMany({
    select: { companyId: true, userId: true, role: true, assignedById: true },
  })

  for (const member of existing) {
    memberMap.set(compositeKey(member.companyId, member.userId), {
      companyId: member.companyId,
      userId: member.userId,
      role: member.role as CompanyRole,
      assignedById: member.assignedById,
    })
  }

  return existing.length
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('==============================================')
  console.log('  CompanyMember Backfill Script')
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`)
  console.log(`  Started: ${new Date().toISOString()}`)
  console.log('==============================================')

  // Pre-flight: load any existing CompanyMember records so we never downgrade
  const existingCount = await loadExistingMembers()
  console.log(`\nPre-flight: loaded ${existingCount} existing CompanyMember records`)

  // Phase 1: CompanyOwnership (most specific)
  const phase1 = await processCompanyOwnerships()

  // Phase 2: CompanyStaffAccess
  const phase2 = await processCompanyStaffAccess()

  // Phase 3: OrganizationUser (broadest)
  const phase3 = await processOrganizationUsers()

  // Summary before write
  const totalProcessed = phase1.processed + phase2.processed + phase3.processed
  const totalCreated = phase1.created + phase2.created + phase3.created
  const totalUpgraded = phase1.upgraded + phase2.upgraded + phase3.upgraded
  const totalSkipped = phase1.skipped + phase2.skipped + phase3.skipped

  console.log('\n--- Aggregation Summary ---')
  console.log(`  Total source records processed: ${totalProcessed}`)
  console.log(`  New unique memberships:         ${totalCreated}`)
  console.log(`  Upgraded (higher role applied):  ${totalUpgraded}`)
  console.log(`  Skipped (lower/equal role):      ${totalSkipped}`)
  console.log(`  Unique company-user pairs:       ${memberMap.size}`)

  // Flush to database
  const writeResult = await flushToDatabase()

  console.log('\n==============================================')
  console.log('  Backfill Complete')
  console.log(`  Finished: ${new Date().toISOString()}`)
  if (!DRY_RUN) {
    console.log(`  Records upserted: ${writeResult.upserted}`)
  }
  console.log('==============================================')
}

main()
  .catch((error) => {
    console.error('\nFATAL ERROR during backfill:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
