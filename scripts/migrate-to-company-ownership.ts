/**
 * Migration Script: Migrate to Company Ownership Model
 *
 * This script migrates existing data from the organization-based model
 * to the new company-based ownership model.
 *
 * Steps:
 * 1. Set userType based on email domain (COMPED for pasadena-private.com/pasadenapw.com)
 * 2. Create CompanyOwnership records for existing OrganizationUsers
 * 3. The first admin user of each organization becomes the subscribing owner
 *
 * Run with: npx tsx scripts/migrate-to-company-ownership.ts
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const COMPED_DOMAINS = ['pasadena-private.com', 'pasadenapw.com']

function isCompedEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return COMPED_DOMAINS.includes(domain)
}

async function migrate() {
  console.log('Starting migration to company ownership model...\n')

  // Step 1: Update user types based on email domain
  console.log('Step 1: Updating user types based on email domain...')
  const users = await prisma.user.findMany({
    select: { id: true, email: true, userType: true }
  })

  let compedCount = 0
  for (const user of users) {
    if (isCompedEmail(user.email)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { userType: 'COMPED' }
      })
      compedCount++
    } else if (user.userType !== 'SUBSCRIBER') {
      await prisma.user.update({
        where: { id: user.id },
        data: { userType: 'SUBSCRIBER' }
      })
    }
  }
  console.log(`  - Updated ${compedCount} users to COMPED status`)
  console.log(`  - ${users.length - compedCount} users set as SUBSCRIBER\n`)

  // Step 2: Get all organizations with their users and companies
  console.log('Step 2: Creating CompanyOwnership records...')
  const organizations = await prisma.organization.findMany({
    include: {
      users: {
        include: {
          user: true
        },
        orderBy: [
          { role: 'asc' }, // SUPER_ADMIN and ADMIN come first
          { joinedAt: 'asc' } // Oldest first
        ]
      },
      companies: {
        where: { deletedAt: null }
      }
    }
  })

  let ownershipCreated = 0
  let companiesProcessed = 0

  for (const org of organizations) {
    // Find the primary owner (first admin or super admin)
    const primaryOwner = org.users.find(u =>
      u.role === 'SUPER_ADMIN' || u.role === 'ADMIN'
    ) || org.users[0]

    if (!primaryOwner) {
      console.log(`  - Skipping organization ${org.name} (no users)`)
      continue
    }

    // Create ownership records for each company
    for (const company of org.companies) {
      companiesProcessed++

      // Check if ownership already exists
      const existingOwnership = await prisma.companyOwnership.findUnique({
        where: {
          companyId_userId: {
            companyId: company.id,
            userId: primaryOwner.userId
          }
        }
      })

      if (!existingOwnership) {
        await prisma.companyOwnership.create({
          data: {
            companyId: company.id,
            userId: primaryOwner.userId,
            isSubscribingOwner: true,
            ownershipPercent: 100,
            status: 'ACTIVE'
          }
        })
        ownershipCreated++
      }
    }
  }

  console.log(`  - Processed ${companiesProcessed} companies`)
  console.log(`  - Created ${ownershipCreated} CompanyOwnership records\n`)

  // Step 3: Verify migration
  console.log('Step 3: Verification...')
  const ownershipCount = await prisma.companyOwnership.count()
  const companyCount = await prisma.company.count({ where: { deletedAt: null } })
  const subscribingOwnerCount = await prisma.companyOwnership.count({
    where: { isSubscribingOwner: true }
  })

  console.log(`  - Total companies: ${companyCount}`)
  console.log(`  - Total ownership records: ${ownershipCount}`)
  console.log(`  - Companies with subscribing owner: ${subscribingOwnerCount}`)

  // Check for companies without owners
  const companiesWithoutOwner = await prisma.company.findMany({
    where: {
      deletedAt: null,
      ownerships: { none: {} }
    },
    select: { id: true, name: true }
  })

  if (companiesWithoutOwner.length > 0) {
    console.log(`\n  WARNING: ${companiesWithoutOwner.length} companies have no owner:`)
    companiesWithoutOwner.forEach(c => console.log(`    - ${c.name} (${c.id})`))
  }

  console.log('\nMigration completed successfully!')
}

async function rollback() {
  console.log('Rolling back migration...\n')

  // Delete all company ownership records
  const deleted = await prisma.companyOwnership.deleteMany({})
  console.log(`Deleted ${deleted.count} CompanyOwnership records`)

  // Reset user types to SUBSCRIBER
  const reset = await prisma.user.updateMany({
    data: { userType: 'SUBSCRIBER' }
  })
  console.log(`Reset ${reset.count} users to SUBSCRIBER`)

  console.log('\nRollback completed!')
}

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--rollback')) {
    await rollback()
  } else if (args.includes('--dry-run')) {
    console.log('DRY RUN MODE - No changes will be made\n')

    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    })
    const compedCount = users.filter(u => isCompedEmail(u.email)).length
    console.log(`Would update ${compedCount} users to COMPED status`)

    const organizations = await prisma.organization.findMany({
      include: {
        users: { include: { user: true } },
        companies: { where: { deletedAt: null } }
      }
    })

    let ownershipsNeeded = 0
    for (const org of organizations) {
      const primaryOwner = org.users.find(u =>
        u.role === 'SUPER_ADMIN' || u.role === 'ADMIN'
      ) || org.users[0]

      if (primaryOwner) {
        for (const company of org.companies) {
          const existing = await prisma.companyOwnership.findUnique({
            where: {
              companyId_userId: { companyId: company.id, userId: primaryOwner.userId }
            }
          })
          if (!existing) ownershipsNeeded++
        }
      }
    }

    console.log(`Would create ${ownershipsNeeded} CompanyOwnership records`)
  } else {
    await migrate()
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
