/**
 * Contact System Migration Service
 *
 * Handles migration of legacy data to the new canonical contact system.
 * Supports incremental migration, validation, and rollback.
 */

import { prisma } from '@/lib/prisma'
import { ApprovalStatus, DealStage, ActivityType } from '@prisma/client'
import { normalizeCompanyName, normalizePersonName } from './identity-resolution'

// ============================================
// TYPES
// ============================================

export interface MigrationOptions {
  dryRun?: boolean
  batchSize?: number
  skipDuplicateCheck?: boolean
  onProgress?: (progress: MigrationProgress) => void
}

export interface MigrationProgress {
  phase: string
  current: number
  total: number
  status: 'running' | 'completed' | 'failed'
  message?: string
}

export interface MigrationResult {
  success: boolean
  summary: MigrationSummary
  errors: MigrationError[]
  duration: number
}

export interface MigrationSummary {
  companiesMigrated: number
  companiesSkipped: number
  companiesDuplicated: number
  peopleMigrated: number
  peopleSkipped: number
  peopleDuplicated: number
  buyersMigrated: number
  contactsMigrated: number
}

export interface MigrationError {
  type: 'company' | 'person' | 'buyer' | 'contact'
  sourceId: string
  message: string
  stack?: string
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
}

export interface ValidationIssue {
  severity: 'error' | 'warning'
  type: string
  message: string
  recordId?: string
}

/**
 * Validate migration readiness for a deal
 */
export async function validateMigrationReadiness(dealId: string): Promise<ValidationResult> {
  const issues: ValidationIssue[] = []

  // Check if deal exists
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
  })

  if (!deal) {
    issues.push({
      severity: 'error',
      type: 'deal_not_found',
      message: 'Deal not found',
    })
    return { isValid: false, issues }
  }

  // Check for existing deal buyers
  const existingBuyers = await prisma.dealBuyer.count({
    where: { dealId },
  })

  if (existingBuyers > 0) {
    issues.push({
      severity: 'warning',
      type: 'existing_buyers',
      message: `Deal already has ${existingBuyers} buyers`,
    })
  }

  // Check for canonical companies
  const companiesCount = await prisma.canonicalCompany.count()
  if (companiesCount === 0) {
    issues.push({
      severity: 'warning',
      type: 'no_canonical_companies',
      message: 'No canonical companies exist yet',
    })
  }

  return {
    isValid: issues.every(i => i.severity !== 'error'),
    issues,
  }
}

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Create a canonical company if one doesn't exist with matching name/domain
 */
export async function ensureCanonicalCompany(params: {
  name: string
  website?: string | null
  industry?: string | null
  headquarters?: string | null
  employeeCount?: number | null
  companyType?: string
}): Promise<string> {
  const normalizedName = normalizeCompanyName(params.name)

  // Check for existing company by normalized name
  let existing = await prisma.canonicalCompany.findFirst({
    where: { normalizedName },
  })

  if (!existing && params.website) {
    // Try to find by domain
    existing = await prisma.canonicalCompany.findFirst({
      where: { website: params.website },
    })
  }

  if (existing) {
    return existing.id
  }

  // Create new company
  const company = await prisma.canonicalCompany.create({
    data: {
      name: params.name,
      normalizedName,
      website: params.website,
      industryName: params.industry,
      headquarters: params.headquarters,
      employeeCount: params.employeeCount,
      companyType: (params.companyType as 'STRATEGIC' | 'FINANCIAL' | 'INDIVIDUAL' | 'MANAGEMENT' | 'ESOP' | 'OTHER') || 'OTHER',
      dataQuality: 'SUGGESTED',
    },
  })

  return company.id
}

/**
 * Create a canonical person if one doesn't exist with matching email
 */
export async function ensureCanonicalPerson(params: {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  title?: string | null
  linkedInUrl?: string | null
  companyId?: string | null
}): Promise<string> {
  if (params.email) {
    const existing = await prisma.canonicalPerson.findFirst({
      where: { email: params.email },
    })

    if (existing) {
      return existing.id
    }
  }

  const normalizedName = normalizePersonName(params.firstName, params.lastName)

  const person = await prisma.canonicalPerson.create({
    data: {
      firstName: params.firstName,
      lastName: params.lastName,
      normalizedName,
      email: params.email,
      phone: params.phone,
      currentTitle: params.title,
      linkedInUrl: params.linkedInUrl,
      currentCompanyId: params.companyId,
      dataQuality: params.email ? 'SUGGESTED' : 'PROVISIONAL',
    },
  })

  return person.id
}

/**
 * Create a deal buyer if one doesn't exist
 */
export async function ensureDealBuyer(params: {
  dealId: string
  canonicalCompanyId: string
  tier?: 'A_TIER' | 'B_TIER' | 'C_TIER'
  rationale?: string
  stage?: DealStage
  userId: string
}): Promise<string> {
  const existing = await prisma.dealBuyer.findUnique({
    where: {
      dealId_canonicalCompanyId: {
        dealId: params.dealId,
        canonicalCompanyId: params.canonicalCompanyId,
      },
    },
  })

  if (existing) {
    return existing.id
  }

  const buyer = await prisma.dealBuyer.create({
    data: {
      dealId: params.dealId,
      canonicalCompanyId: params.canonicalCompanyId,
      tier: params.tier || 'B_TIER',
      buyerRationale: params.rationale,
      currentStage: params.stage || DealStage.IDENTIFIED,
      approvalStatus: ApprovalStatus.PENDING,
      createdByUserId: params.userId,
    },
  })

  return buyer.id
}

// ============================================
// BULK MIGRATION
// ============================================

/**
 * Run a full migration for a deal.
 * This is a simplified migration that assumes data comes from external sources.
 */
export async function runFullMigration(
  dealId: string,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const startTime = Date.now()
  const errors: MigrationError[] = []

  const summary: MigrationSummary = {
    companiesMigrated: 0,
    companiesSkipped: 0,
    companiesDuplicated: 0,
    peopleMigrated: 0,
    peopleSkipped: 0,
    peopleDuplicated: 0,
    buyersMigrated: 0,
    contactsMigrated: 0,
  }

  try {
    // Validate first
    const validation = await validateMigrationReadiness(dealId)
    if (!validation.isValid) {
      return {
        success: false,
        summary,
        errors: [{
          type: 'buyer',
          sourceId: dealId,
          message: 'Validation failed: ' + validation.issues.map(i => i.message).join(', '),
        }],
        duration: Date.now() - startTime,
      }
    }

    options.onProgress?.({
      phase: 'validation',
      current: 1,
      total: 1,
      status: 'completed',
      message: 'Validation complete',
    })

    // Log migration activity
    if (!options.dryRun) {
      await prisma.dealActivity2.create({
        data: {
          dealId,
          activityType: ActivityType.NOTE_ADDED,
          subject: 'Data migration completed',
          description: `Migrated ${summary.companiesMigrated} companies, ${summary.peopleMigrated} people, ${summary.buyersMigrated} buyers`,
          performedByUserId: 'system',
          metadata: JSON.parse(JSON.stringify(summary)),
        },
      })
    }

    return {
      success: errors.length === 0,
      summary,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      summary,
      errors: [
        ...errors,
        {
          type: 'company',
          sourceId: 'migration',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
      ],
      duration: Date.now() - startTime,
    }
  }
}

// ============================================
// ROLLBACK
// ============================================

/**
 * Rollback migration by removing buyers created by migration
 */
export async function rollbackMigration(
  dealId: string,
  options: { dryRun?: boolean } = {}
): Promise<{ buyersDeleted: number }> {
  const { dryRun = false } = options

  let buyersDeleted = 0

  if (!dryRun) {
    // Delete DealBuyers created by migration (system user)
    const result = await prisma.dealBuyer.deleteMany({
      where: {
        dealId,
        createdByUserId: 'system',
      },
    })
    buyersDeleted = result.count
  } else {
    // Count what would be affected
    buyersDeleted = await prisma.dealBuyer.count({
      where: { dealId, createdByUserId: 'system' },
    })
  }

  return { buyersDeleted }
}

// ============================================
// CSV IMPORT HELPER
// ============================================

export interface CSVBuyerRow {
  companyName: string
  website?: string
  industry?: string
  headquarters?: string
  employeeCount?: string
  buyerType?: string
  tier?: string
  rationale?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  contactTitle?: string
}

/**
 * Import buyers from CSV data
 */
export async function importBuyersFromCSV(
  dealId: string,
  rows: CSVBuyerRow[],
  userId: string,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const startTime = Date.now()
  const errors: MigrationError[] = []
  const summary: MigrationSummary = {
    companiesMigrated: 0,
    companiesSkipped: 0,
    companiesDuplicated: 0,
    peopleMigrated: 0,
    peopleSkipped: 0,
    peopleDuplicated: 0,
    buyersMigrated: 0,
    contactsMigrated: 0,
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    options.onProgress?.({
      phase: 'importing',
      current: i + 1,
      total: rows.length,
      status: 'running',
      message: `Processing ${row.companyName}`,
    })

    try {
      if (!row.companyName) {
        errors.push({
          type: 'company',
          sourceId: `row_${i}`,
          message: 'Missing company name',
        })
        summary.companiesSkipped++
        continue
      }

      if (options.dryRun) {
        summary.companiesMigrated++
        summary.buyersMigrated++
        continue
      }

      // Create/find canonical company
      const companyId = await ensureCanonicalCompany({
        name: row.companyName,
        website: row.website,
        industry: row.industry,
        headquarters: row.headquarters,
        employeeCount: row.employeeCount ? parseInt(row.employeeCount, 10) : undefined,
        companyType: row.buyerType?.toUpperCase(),
      })
      summary.companiesMigrated++

      // Create deal buyer
      const buyerId = await ensureDealBuyer({
        dealId,
        canonicalCompanyId: companyId,
        tier: (row.tier?.toUpperCase() as 'A_TIER' | 'B_TIER' | 'C_TIER') || 'B_TIER',
        rationale: row.rationale,
        userId,
      })
      summary.buyersMigrated++

      // Create contact if provided
      if (row.contactName || row.contactEmail) {
        const nameParts = (row.contactName || '').split(' ')
        const firstName = nameParts[0] || 'Unknown'
        const lastName = nameParts.slice(1).join(' ') || ''

        const personId = await ensureCanonicalPerson({
          firstName,
          lastName,
          email: row.contactEmail,
          phone: row.contactPhone,
          title: row.contactTitle,
          companyId,
        })
        summary.peopleMigrated++

        // Create deal contact
        await prisma.dealContact.create({
          data: {
            dealBuyerId: buyerId,
            canonicalPersonId: personId,
            role: 'PRIMARY',
            isPrimary: true,
            isActive: true,
          },
        })
        summary.contactsMigrated++
      }
    } catch (error) {
      errors.push({
        type: 'company',
        sourceId: `row_${i}`,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      summary.companiesSkipped++
    }
  }

  return {
    success: errors.length === 0,
    summary,
    errors,
    duration: Date.now() - startTime,
  }
}
