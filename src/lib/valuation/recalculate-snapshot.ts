// Snapshot Recalculation Utility
// Recalculates valuation snapshot for a company using latest data

import { prisma } from '@/lib/prisma'
import { getIndustryMultiples, estimateEbitdaFromRevenue } from './industry-multiples'
import {
  ALPHA,
  CORE_FACTOR_SCORES,
  calculateValuation,
} from './calculate-valuation'
import { calculateAutoDCF } from './auto-dcf'

// Default category weights for BRI calculation
const DEFAULT_CATEGORY_WEIGHTS: Record<string, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

// Market salary benchmarks by revenue size category
// Based on industry compensation studies for owner/CEO roles
const MARKET_SALARY_BY_REVENUE: Record<string, number> = {
  UNDER_500K: 80000,
  FROM_500K_TO_1M: 120000,
  FROM_1M_TO_3M: 150000,
  FROM_3M_TO_10M: 200000,
  FROM_10M_TO_25M: 300000,
  OVER_25M: 400000,
}

/**
 * Get market salary based on company revenue size
 * Falls back to $150K if revenue size category is unknown
 */
function getMarketSalary(revenueSizeCategory: string | null | undefined): number {
  if (!revenueSizeCategory) return 150000
  return MARKET_SALARY_BY_REVENUE[revenueSizeCategory] || 150000
}

// VAL-003 FIX: EBITDA improvement potential by BRI category
// These represent the typical margin improvement achievable when addressing issues in each category
const EBITDA_IMPROVEMENT_BY_CATEGORY: Record<string, number> = {
  FINANCIAL: 0.05,        // 5% - Better pricing, collections, cost control
  TRANSFERABILITY: 0.02,  // 2% - Reduced key-person risk doesn't directly improve EBITDA
  OPERATIONAL: 0.08,      // 8% - Process improvements, efficiency gains
  MARKET: 0.04,           // 4% - Better market position can improve margins
  LEGAL_TAX: 0.03,        // 3% - Tax optimization, risk reduction
  PERSONAL: 0.01,         // 1% - Owner readiness has minimal direct EBITDA impact
}

/**
 * Calculate potential EBITDA improvement based on BRI category gaps
 * Returns the estimated EBITDA multiplier (e.g., 1.15 for 15% improvement potential)
 */
function calculateEbitdaImprovementMultiplier(
  categoryScores: Array<{ category: string; score: number }>,
  categoryWeights: Record<string, number>
): number {
  let totalImprovementPotential = 0

  for (const cs of categoryScores) {
    const gap = 1 - cs.score // How far from perfect score
    const categoryWeight = categoryWeights[cs.category] || 0
    const maxImprovement = EBITDA_IMPROVEMENT_BY_CATEGORY[cs.category] || 0

    // Improvement potential is proportional to the gap and weighted by category importance
    totalImprovementPotential += gap * maxImprovement * (categoryWeight / 0.25) // Normalize by average weight
  }

  // Cap total improvement at 25% to be conservative
  return 1 + Math.min(totalImprovementPotential, 0.25)
}

/**
 * Fetch BRI weights for a company
 * Priority: Company-specific > Global custom > Default
 */
async function getBriWeightsForCompany(companyBriWeights: unknown): Promise<Record<string, number>> {
  // 1. If company has custom weights, use them
  if (companyBriWeights && typeof companyBriWeights === 'object') {
    return companyBriWeights as Record<string, number>
  }

  // 2. Check for global custom weights
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'bri_category_weights' },
    })
    if (setting?.value) {
      return setting.value as Record<string, number>
    }
  } catch (error) {
    console.error('Error fetching global BRI weights:', error)
  }

  // 3. Fall back to defaults
  return DEFAULT_CATEGORY_WEIGHTS
}

export interface RecalculateResult {
  success: boolean
  snapshotId?: string
  error?: string
  companyId: string
  companyName: string
}

/**
 * Recalculate and create a new snapshot for a company
 * Uses the company's latest completed assessment for BRI scores
 * and latest industry multiples for valuation
 */
export async function recalculateSnapshotForCompany(
  companyId: string,
  snapshotReason: string,
  createdByUserId?: string
): Promise<RecalculateResult> {
  try {
    // Get company with all required data
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        coreFactors: true,
        ebitdaAdjustments: true,
      },
    })

    if (!company) {
      return {
        success: false,
        error: 'Company not found',
        companyId,
        companyName: 'Unknown',
      }
    }

    // Get the latest assessment for this company (completed or in-progress)
    // This allows inline category assessments to trigger recalculation
    // Include both selectedOption and effectiveOption for Answer Upgrade System
    const latestAssessment = await prisma.assessment.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        responses: {
          include: {
            question: true,
            selectedOption: true,
            effectiveOption: true, // For Answer Upgrade System
          },
        },
      },
    })

    if (!latestAssessment) {
      return {
        success: false,
        error: 'No assessment found',
        companyId,
        companyName: company.name,
      }
    }

    // Need at least some responses to calculate scores
    if (latestAssessment.responses.length === 0) {
      return {
        success: false,
        error: 'No responses found in assessment',
        companyId,
        companyName: company.name,
      }
    }

    // Calculate category scores from assessment responses
    // Use effectiveOption if available (from completed tasks), otherwise use selectedOption
    const scoresByCategory: Record<string, { total: number; earned: number }> = {}

    for (const response of latestAssessment.responses) {
      // Skip NOT_APPLICABLE responses (they don't have a selected option)
      const optionToUse = response.effectiveOption || response.selectedOption
      if (!optionToUse) continue

      const category = response.question.briCategory
      const maxPoints = Number(response.question.maxImpactPoints)
      // Answer Upgrade System: use effective answer if tasks have upgraded it
      const scoreValue = Number(optionToUse.scoreValue)
      const earnedPoints = maxPoints * scoreValue

      if (!scoresByCategory[category]) {
        scoresByCategory[category] = { total: 0, earned: 0 }
      }
      scoresByCategory[category].total += maxPoints
      scoresByCategory[category].earned += earnedPoints
    }

    const categoryScores: Array<{ category: string; score: number }> = []
    for (const [category, scores] of Object.entries(scoresByCategory)) {
      categoryScores.push({
        category,
        score: scores.total > 0 ? scores.earned / scores.total : 0,
      })
    }

    // Fetch BRI weights (company-specific or global) and calculate weighted BRI score
    const categoryWeights = await getBriWeightsForCompany(company.briWeights)
    let briScore = 0
    for (const cs of categoryScores) {
      const weight = categoryWeights[cs.category] || 0
      briScore += cs.score * weight
    }

    // Calculate Core Score from company factors using shared utility
    const coreFactors = company.coreFactors
    let coreScore = 0.5 // Default if no core factors

    if (coreFactors) {
      // Core Score is based on business model quality factors only
      // Revenue size is NOT included - it already affects valuation through revenue × multiple
      // Uses shared CORE_FACTOR_SCORES from calculate-valuation.ts
      const scores = [
        CORE_FACTOR_SCORES.revenueModel[coreFactors.revenueModel] ?? 0.5,
        CORE_FACTOR_SCORES.grossMarginProxy[coreFactors.grossMarginProxy] ?? 0.5,
        CORE_FACTOR_SCORES.laborIntensity[coreFactors.laborIntensity] ?? 0.5,
        CORE_FACTOR_SCORES.assetIntensity[coreFactors.assetIntensity] ?? 0.5,
        CORE_FACTOR_SCORES.ownerInvolvement[coreFactors.ownerInvolvement] ?? 0.5,
      ]

      coreScore = scores.reduce((a, b) => a + b, 0) / scores.length
    }

    // Get latest industry multiples (needed for both EBITDA estimation and valuation)
    const multiples = await getIndustryMultiples(
      company.icbSubSector,
      company.icbSector,
      company.icbSuperSector,
      company.icbIndustry
    )

    // Calculate adjusted EBITDA
    // If actual EBITDA exists, use it with adjustments
    // Otherwise, estimate EBITDA from revenue using industry multiples
    const baseEbitda = Number(company.annualEbitda)
    const ownerComp = Number(company.ownerCompensation)
    const addBacks = company.ebitdaAdjustments
      .filter(a => a.type === 'ADD_BACK')
      .reduce((sum, a) => sum + Number(a.amount), 0)
    const deductions = company.ebitdaAdjustments
      .filter(a => a.type === 'DEDUCTION')
      .reduce((sum, a) => sum + Number(a.amount), 0)

    // VAL-001 FIX: Use revenue-size-appropriate market salary instead of hardcoded $150K
    const revenueSizeCategory = coreFactors?.revenueSizeCategory
    const marketSalaryBenchmark = getMarketSalary(revenueSizeCategory)
    const marketSalary = Math.min(ownerComp, marketSalaryBenchmark)
    const excessComp = Math.max(0, ownerComp - marketSalary)

    let adjustedEbitda: number
    if (baseEbitda > 0) {
      // Actual EBITDA provided - use adjusted calculation
      adjustedEbitda = baseEbitda + addBacks + excessComp - deductions
    } else {
      // No EBITDA provided - estimate from revenue using industry multiples
      const revenue = Number(company.annualRevenue)
      const estimatedEbitda = estimateEbitdaFromRevenue(revenue, multiples)
      // Still apply add-backs and owner comp adjustments to estimated base
      adjustedEbitda = estimatedEbitda + addBacks + excessComp - deductions
    }
    const industryMultipleLow = multiples.ebitdaMultipleLow
    const industryMultipleHigh = multiples.ebitdaMultipleHigh

    // Use shared utility for consistent valuation calculation
    const valuation = calculateValuation({
      adjustedEbitda,
      industryMultipleLow,
      industryMultipleHigh,
      coreScore,
      briScore,
    })

    const { baseMultiple, finalMultiple, discountFraction } = valuation

    // VAL-003 FIX: Calculate potential EBITDA improvement from addressing BRI gaps
    const ebitdaImprovementMultiplier = calculateEbitdaImprovementMultiplier(categoryScores, categoryWeights)
    const potentialEbitda = adjustedEbitda * ebitdaImprovementMultiplier

    // Calculate valuations
    // Current value uses current EBITDA with BRI-discounted multiple (from shared utility)
    const currentValue = valuation.currentValue
    // Potential value uses improved EBITDA with full base multiple (no BRI discount)
    // This differs from the basic formula because it considers EBITDA improvement potential
    const potentialValue = potentialEbitda * baseMultiple
    const valueGap = potentialValue - currentValue

    // Helper to get category score
    const getCategoryScore = (cat: string) => {
      const cs = categoryScores.find(c => c.category === cat)
      return cs ? cs.score : 0
    }

    // Auto-DCF: calculate DCF valuation from financial data if available
    // Skip if user has manually configured DCF assumptions
    let dcfData: Record<string, unknown> = {}
    try {
      const dcfAssumptions = await prisma.dCFAssumptions.findUnique({
        where: { companyId },
        select: { isManuallyConfigured: true },
      })

      if (!dcfAssumptions?.isManuallyConfigured) {
        const dcfResult = await calculateAutoDCF(companyId)
        if (dcfResult.success) {
          dcfData = {
            dcfEnterpriseValue: dcfResult.enterpriseValue,
            dcfEquityValue: dcfResult.equityValue,
            dcfWacc: dcfResult.wacc,
            dcfBaseFcf: dcfResult.baseFcf,
            dcfGrowthRates: dcfResult.growthRates,
            dcfTerminalMethod: dcfResult.terminalMethod,
            dcfPerpetualGrowthRate: dcfResult.perpetualGrowthRate,
            dcfNetDebt: dcfResult.netDebt,
            dcfImpliedMultiple: dcfResult.impliedMultiple,
            dcfSource: 'auto',
          }
          console.log(`[AUTO-DCF] Company ${companyId}: EV=${dcfResult.enterpriseValue.toFixed(0)}, WACC=${(dcfResult.wacc * 100).toFixed(1)}%, baseFCF=${dcfResult.baseFcf.toFixed(0)}`)
        } else {
          console.log(`[AUTO-DCF] Company ${companyId}: Skipped — ${dcfResult.reason}`)
        }
      } else {
        console.log(`[AUTO-DCF] Company ${companyId}: Skipped — manually configured`)
      }
    } catch (error) {
      console.error(`[AUTO-DCF] Error for company ${companyId}:`, error)
      // Non-fatal: snapshot still gets created without DCF fields
    }

    // Create new snapshot
    const snapshot = await prisma.valuationSnapshot.create({
      data: {
        companyId,
        createdByUserId,
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
        coreScore,
        briScore,
        briFinancial: getCategoryScore('FINANCIAL'),
        briTransferability: getCategoryScore('TRANSFERABILITY'),
        briOperational: getCategoryScore('OPERATIONAL'),
        briMarket: getCategoryScore('MARKET'),
        briLegalTax: getCategoryScore('LEGAL_TAX'),
        briPersonal: getCategoryScore('PERSONAL'),
        baseMultiple,
        discountFraction,
        finalMultiple,
        currentValue,
        potentialValue,
        valueGap,
        alphaConstant: ALPHA,
        snapshotReason,
        ...dcfData,
      },
    })

    return {
      success: true,
      snapshotId: snapshot.id,
      companyId,
      companyName: company.name,
    }
  } catch (error) {
    console.error(`Error recalculating snapshot for company ${companyId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      companyId,
      companyName: 'Unknown',
    }
  }
}

/**
 * Find all companies that would be affected by an industry multiple update
 * Returns companies matching at any level of the ICB hierarchy
 */
export async function findAffectedCompanies(
  icbSubSector?: string,
  icbSector?: string,
  icbSuperSector?: string,
  icbIndustry?: string
): Promise<Array<{ id: string; name: string; icbSubSector: string }>> {
  // Build OR conditions for any matching level
  const orConditions: Array<Record<string, string>> = []

  if (icbSubSector) {
    orConditions.push({ icbSubSector })
  }
  if (icbSector) {
    orConditions.push({ icbSector })
  }
  if (icbSuperSector) {
    orConditions.push({ icbSuperSector })
  }
  if (icbIndustry) {
    orConditions.push({ icbIndustry })
  }

  if (orConditions.length === 0) {
    return []
  }

  const companies = await prisma.company.findMany({
    where: {
      OR: orConditions,
    },
    select: {
      id: true,
      name: true,
      icbSubSector: true,
    },
  })

  return companies
}

/**
 * Recalculate snapshots for all companies affected by a multiple update
 */
export async function recalculateSnapshotsForMultipleUpdate(
  icbSubSector?: string,
  icbSector?: string,
  icbSuperSector?: string,
  icbIndustry?: string,
  updateType: 'EBITDA' | 'Revenue' | 'Both' = 'Both',
  createdByUserId?: string
): Promise<{
  totalCompanies: number
  successful: number
  failed: number
  results: RecalculateResult[]
}> {
  const snapshotReason = `Industry ${updateType} multiples updated`

  // Find all affected companies
  const companies = await findAffectedCompanies(
    icbSubSector,
    icbSector,
    icbSuperSector,
    icbIndustry
  )

  const results: RecalculateResult[] = []
  let successful = 0
  let failed = 0

  // Recalculate snapshot for each company
  for (const company of companies) {
    const result = await recalculateSnapshotForCompany(company.id, snapshotReason, createdByUserId)
    results.push(result)

    if (result.success) {
      successful++
    } else {
      failed++
    }
  }

  return {
    totalCompanies: companies.length,
    successful,
    failed,
    results,
  }
}
