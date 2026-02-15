// GET /api/companies/[id]/comparables
// PROD-004: Returns comparable companies, multiple adjustments, and final multiple ranges.
//
// This endpoint combines three steps:
//   1. AI-powered comparable company identification (cached for 24 hours)
//   2. Company-specific multiple adjustments
//   3. Final multiple range calculation with full audit trail
//
// Cache strategy: Comparables are AI-generated and expensive. We cache the AI result
// in a SystemSetting keyed by company ID. The cache expires after 24 hours or can be
// force-refreshed with ?refresh=true.

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { findComparables, type CompanyProfile, type ComparableResult } from '@/lib/valuation/comparable-engine'
import { applyUserRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'
import {
  adjustMultiples,
  calculateMultipleRange,
  type AdjustmentProfile,
} from '@/lib/valuation/multiple-adjustments'

/** Cache duration: 24 hours in milliseconds */
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000

/** Cache key prefix for comparable results stored in SystemSetting */
const CACHE_KEY_PREFIX = 'comparable_cache_'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  // SEC-034: Rate limit AI endpoints
  const rl = await applyUserRateLimit(request, result.auth.user.id, RATE_LIMIT_CONFIGS.AI)
  if (!rl.success) return createRateLimitResponse(rl)

  try {
    // Check for force refresh parameter
    const url = new URL(request.url)
    const forceRefresh = url.searchParams.get('refresh') === 'true'

    // Fetch company with all data needed for profile building
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        coreFactors: true,
        valuationSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        financialPeriods: {
          orderBy: { fiscalYear: 'desc' },
          take: 2,
          include: {
            incomeStatement: true,
          },
        },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Build company profile for comparable search
    const companyProfile = buildCompanyProfile(company)

    // Build adjustment profile
    const adjustmentProfile = buildAdjustmentProfile(company)

    // --- Step 1: Get or generate comparables (with caching) ---
    let comparableResult: ComparableResult
    let fromCache = false

    if (!forceRefresh) {
      const cached = await getCachedComparables(companyId)
      if (cached) {
        comparableResult = cached
        fromCache = true
      } else {
        comparableResult = await findComparables(companyProfile)
        await cacheComparables(companyId, comparableResult)
      }
    } else {
      comparableResult = await findComparables(companyProfile)
      await cacheComparables(companyId, comparableResult)
    }

    // --- Step 2: Calculate adjustments ---
    const adjustmentResult = adjustMultiples(adjustmentProfile)

    // --- Step 3: Calculate final multiple ranges ---
    const multipleRangeResult = calculateMultipleRange(
      comparableResult.weightedEbitdaMultiple,
      comparableResult.weightedRevenueMultiple,
      adjustmentResult,
      comparableResult.comparables.length,
      comparableResult.comparables
    )

    return NextResponse.json({
      companyId,
      companyName: company.name,
      // Comparable companies
      comparables: comparableResult.comparables,
      // Adjustments applied
      adjustments: adjustmentResult.adjustments,
      totalAdjustment: adjustmentResult.totalAdjustment,
      adjustmentMultiplier: adjustmentResult.adjustmentMultiplier,
      // Final multiple ranges
      ebitdaMultipleRange: multipleRangeResult.ebitdaMultipleRange,
      revenueMultipleRange: multipleRangeResult.revenueMultipleRange,
      // Source data for audit trail
      sources: {
        ...multipleRangeResult.sources,
        analyzedAt: comparableResult.analyzedAt,
        fromCache,
        aiModel: comparableResult.aiUsage.model,
      },
      // Warnings from the analysis
      warnings: comparableResult.warnings,
      // FIX 2.1: AI-estimated data disclaimer
      dataSource: 'ai_estimated',
      disclaimer: 'Comparable companies and their financial metrics are AI-estimated based on publicly available information. These estimates have not been independently verified and may contain inaccuracies. They should be validated with current market data before making financial decisions.',
    })
  } catch (error) {
    console.error('Error fetching comparables:', error instanceof Error ? error.message : String(error))

    // Distinguish AI errors from other errors
    const message = error instanceof Error ? error.message : 'Unknown error'
    const isAIError = message.includes('ANTHROPIC_API_KEY') || message.includes('API')

    return NextResponse.json(
      {
        error: 'Failed to fetch comparables',
        message: isAIError
          ? 'AI service is unavailable. Please try again later.'
          : 'An unexpected error occurred while analyzing comparables.',
        detail: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: isAIError ? 503 : 500 }
    )
  }
}

// =============================================================================
// Profile Builders
// =============================================================================

/**
 * Build a CompanyProfile for the comparable engine from Prisma data.
 */
function buildCompanyProfile(company: {
  name: string
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
  annualRevenue: unknown
  annualEbitda: unknown
  businessDescription: string | null
  coreFactors: {
    revenueSizeCategory: string
    revenueModel: string
  } | null
  financialPeriods: Array<{
    fiscalYear: number
    incomeStatement: { revenue?: unknown; ebitda?: unknown } | null
  }>
}): CompanyProfile {
  const revenue = Number(company.annualRevenue)
  const ebitda = Number(company.annualEbitda)
  const ebitdaMargin = revenue > 0 && ebitda > 0 ? ebitda / revenue : null

  // Calculate growth rate from financial periods if available
  let revenueGrowthRate: number | null = null
  if (company.financialPeriods.length >= 2) {
    const current = company.financialPeriods[0]?.incomeStatement
    const prior = company.financialPeriods[1]?.incomeStatement
    if (current?.revenue && prior?.revenue) {
      const currentRev = Number(current.revenue)
      const priorRev = Number(prior.revenue)
      if (priorRev > 0) {
        revenueGrowthRate = (currentRev - priorRev) / priorRev
      }
    }
  }

  const isRecurring =
    company.coreFactors?.revenueModel === 'SUBSCRIPTION_SAAS' ||
    company.coreFactors?.revenueModel === 'RECURRING_CONTRACTS'

  return {
    name: company.name,
    industry: formatIcbName(company.icbSubSector),
    industryPath: [
      formatIcbName(company.icbIndustry),
      formatIcbName(company.icbSuperSector),
      formatIcbName(company.icbSector),
      formatIcbName(company.icbSubSector),
    ]
      .filter(Boolean)
      .join(' / '),
    revenue,
    revenueSizeCategory: company.coreFactors?.revenueSizeCategory,
    revenueGrowthRate,
    ebitdaMargin,
    revenueModel: company.coreFactors?.revenueModel,
    isRecurringRevenue: isRecurring,
    businessDescription: company.businessDescription || undefined,
  }
}

/**
 * Build an AdjustmentProfile from Prisma data.
 */
function buildAdjustmentProfile(company: {
  annualRevenue: unknown
  annualEbitda: unknown
  businessProfile: unknown
  coreFactors: {
    revenueSizeCategory: string
    revenueModel: string
  } | null
  valuationSnapshots: Array<{
    briTransferability: unknown
  }>
  financialPeriods: Array<{
    fiscalYear: number
    incomeStatement: { revenue?: unknown; ebitda?: unknown } | null
  }>
}): AdjustmentProfile {
  const revenue = Number(company.annualRevenue)
  const ebitda = Number(company.annualEbitda)
  const ebitdaMargin = revenue > 0 && ebitda > 0 ? ebitda / revenue : null

  // Calculate growth rate
  let revenueGrowthRate: number | null = null
  if (company.financialPeriods.length >= 2) {
    const current = company.financialPeriods[0]?.incomeStatement
    const prior = company.financialPeriods[1]?.incomeStatement
    if (current?.revenue && prior?.revenue) {
      const currentRev = Number(current.revenue)
      const priorRev = Number(prior.revenue)
      if (priorRev > 0) {
        revenueGrowthRate = (currentRev - priorRev) / priorRev
      }
    }
  }

  // Extract transferability score from latest snapshot
  const latestSnapshot = company.valuationSnapshots[0]
  const transferabilityScore = latestSnapshot
    ? Number(latestSnapshot.briTransferability)
    : null

  // Extract customer concentration from business profile if available
  let topCustomerConcentration: number | null = null
  let top3CustomerConcentration: number | null = null
  if (company.businessProfile && typeof company.businessProfile === 'object') {
    const bp = company.businessProfile as Record<string, unknown>
    if (typeof bp.topCustomerConcentration === 'number') {
      topCustomerConcentration = bp.topCustomerConcentration
    }
    if (typeof bp.top3CustomerConcentration === 'number') {
      top3CustomerConcentration = bp.top3CustomerConcentration
    }
  }

  const isRecurring =
    company.coreFactors?.revenueModel === 'SUBSCRIPTION_SAAS' ||
    company.coreFactors?.revenueModel === 'RECURRING_CONTRACTS'

  return {
    revenue,
    revenueSizeCategory: company.coreFactors?.revenueSizeCategory,
    revenueGrowthRate,
    ebitdaMargin,
    topCustomerConcentration,
    top3CustomerConcentration,
    transferabilityScore,
    revenueModel: company.coreFactors?.revenueModel,
    isRecurringRevenue: isRecurring,
  }
}

// =============================================================================
// Cache Helpers
// =============================================================================

/**
 * Retrieve cached comparable results for a company.
 * Returns null if no cache exists or cache is expired.
 */
async function getCachedComparables(companyId: string): Promise<ComparableResult | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: `${CACHE_KEY_PREFIX}${companyId}` },
    })

    if (!setting || !setting.value) return null

    // Prisma Json fields return parsed objects directly
    const cached = setting.value as Record<string, unknown>

    // Check expiration
    if (cached.analyzedAt && typeof cached.analyzedAt === 'string') {
      const analyzedAt = new Date(cached.analyzedAt).getTime()
      const now = Date.now()
      if (now - analyzedAt > CACHE_DURATION_MS) {
        return null // Cache expired
      }
    }

    return cached as unknown as ComparableResult
  } catch {
    // Cache read failure is non-fatal; just regenerate
    return null
  }
}

/**
 * Cache comparable results for a company.
 * Prisma Json fields accept plain objects (no JSON.stringify needed).
 */
async function cacheComparables(companyId: string, result: ComparableResult): Promise<void> {
  try {
    // Prisma Json type expects a plain object, not a string
    const value = JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue
    await prisma.systemSetting.upsert({
      where: { key: `${CACHE_KEY_PREFIX}${companyId}` },
      create: {
        key: `${CACHE_KEY_PREFIX}${companyId}`,
        value,
      },
      update: {
        value,
      },
    })
  } catch {
    // Cache write failure is non-fatal; log and continue
    console.warn(`Failed to cache comparables for company ${companyId}`)
  }
}

// =============================================================================
// Utility
// =============================================================================

/**
 * Format ICB classification name for display.
 * Converts SCREAMING_SNAKE_CASE to Title Case.
 */
function formatIcbName(value: string | null): string {
  if (!value) return ''
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
