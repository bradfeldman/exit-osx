// Snapshot Recalculation Utility — V2
// Recalculates valuation snapshot for a company using latest data.
// Writes BOTH V1 and V2 fields to the snapshot for gradual migration.

import { prisma } from '@/lib/prisma'
import { getIndustryMultiples, estimateEbitdaFromRevenue } from './industry-multiples'
import {
  ALPHA,
  calculateCoreScore,
  calculateValuation,
  calculateValuationV2,
  type CoreFactors,
} from './calculate-valuation'
import { calculateAutoDCF } from './auto-dcf'
import { renormalizeTaskValues } from '@/lib/playbook/generate-tasks'
import {
  DEFAULT_CATEGORY_WEIGHTS,
  type ScoringResponse,
  deduplicateResponses,
  calculateCategoryScores,
  calculateWeightedBriScore,
  getCategoryScore as getCatScore,
} from './bri-scoring'
import { calculateRiskDiscounts, type RiskDiscountInputs } from './risk-discounts'
import { calculateBusinessQualityScore, buildAdjustmentProfile } from './business-quality-score'
import { calculateDealReadinessScore } from './deal-readiness-score'
import { calculateValueGapV2 } from './value-gap-v2'
import { adjustMultiples } from './multiple-adjustments'

// Market salary benchmarks by revenue size category
export const MARKET_SALARY_BY_REVENUE: Record<string, number> = {
  UNDER_500K: 80000,
  FROM_500K_TO_1M: 120000,
  FROM_1M_TO_3M: 150000,
  FROM_3M_TO_10M: 200000,
  FROM_10M_TO_25M: 300000,
  OVER_25M: 400000,
}

export function getMarketSalary(revenueSizeCategory: string | null | undefined): number {
  if (!revenueSizeCategory) return 150000
  return MARKET_SALARY_BY_REVENUE[revenueSizeCategory] || 150000
}

export interface RecalculateResult {
  success: boolean
  snapshotId?: string
  error?: string
  companyId: string
  companyName: string
}

/**
 * Recalculate and create a new snapshot for a company.
 * Writes both V1 and V2 fields for gradual migration.
 */
export async function recalculateSnapshotForCompany(
  companyId: string,
  snapshotReason: string,
  createdByUserId?: string
): Promise<RecalculateResult> {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        coreFactors: true,
        ebitdaAdjustments: true,
      },
    })

    if (!company) {
      return { success: false, error: 'Company not found', companyId, companyName: 'Unknown' }
    }

    // Gather latest responses across ALL assessments (PROD-013 fix)
    const allResponses = await prisma.assessmentResponse.findMany({
      where: { assessment: { companyId } },
      include: {
        question: true,
        selectedOption: true,
        effectiveOption: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (allResponses.length === 0) {
      return { success: false, error: 'No assessment responses found', companyId, companyName: company.name }
    }

    // Convert to scoring format and calculate BRI scores
    const scoringResponses: ScoringResponse[] = allResponses.map(r => {
      const optionToUse = r.effectiveOption || r.selectedOption
      return {
        questionId: r.questionId,
        briCategory: r.question.briCategory,
        maxImpactPoints: Number(r.question.maxImpactPoints),
        scoreValue: optionToUse ? Number(optionToUse.scoreValue) : null,
        hasOption: !!optionToUse,
        updatedAt: r.updatedAt,
      }
    })

    const dedupedResponses = deduplicateResponses(scoringResponses)
    const categoryScores = calculateCategoryScores(dedupedResponses)

    const categoryWeights = await getBriWeightsForCompany(company.briWeights)
    const briScore = calculateWeightedBriScore(categoryScores, categoryWeights)

    // Core factors
    const coreFactors = company.coreFactors
    const coreScore = calculateCoreScore(coreFactors as CoreFactors | null)

    // Industry multiples
    const multiples = await getIndustryMultiples(
      company.icbSubSector, company.icbSector, company.icbSuperSector, company.icbIndustry
    )

    // ─── Adjusted EBITDA (V2: bidirectional owner comp) ────────────────
    const baseEbitda = Number(company.annualEbitda)
    const ownerComp = Number(company.ownerCompensation)
    const addBacks = company.ebitdaAdjustments
      .filter(a => a.type === 'ADD_BACK')
      .reduce((sum, a) => sum + Number(a.amount), 0)
    const deductions = company.ebitdaAdjustments
      .filter(a => a.type === 'DEDUCTION')
      .reduce((sum, a) => sum + Number(a.amount), 0)

    const revenueSizeCategory = coreFactors?.revenueSizeCategory
    const marketSalaryBenchmark = getMarketSalary(revenueSizeCategory)

    // V2: Bidirectional owner comp — underpaid owner REDUCES adjusted EBITDA
    const ownerCompAdjustment = ownerComp - marketSalaryBenchmark

    let adjustedEbitda: number
    if (baseEbitda > 0) {
      adjustedEbitda = baseEbitda + addBacks + ownerCompAdjustment - deductions
    } else {
      const revenue = Number(company.annualRevenue)
      const estimatedEbitda = estimateEbitdaFromRevenue(revenue, multiples)
      adjustedEbitda = estimatedEbitda + addBacks + ownerCompAdjustment - deductions
    }

    const industryMultipleLow = multiples.ebitdaMultipleLow
    const industryMultipleHigh = multiples.ebitdaMultipleHigh

    // ─── V1 Valuation (kept for backwards compat) ──────────────────────
    const v1Valuation = calculateValuation({
      adjustedEbitda,
      industryMultipleLow,
      industryMultipleHigh,
      coreScore,
      briScore,
    })

    // ─── V2: Business Quality Score ────────────────────────────────────
    const getCategoryScore = (cat: string) => getCatScore(categoryScores, cat)
    const transferabilityScore = getCategoryScore('TRANSFERABILITY')

    const adjustmentProfile = buildAdjustmentProfile({
      annualRevenue: Number(company.annualRevenue),
      annualEbitda: Number(company.annualEbitda),
      coreFactors: coreFactors ? {
        revenueSizeCategory: coreFactors.revenueSizeCategory,
        revenueModel: coreFactors.revenueModel,
      } : null,
      transferabilityScore,
    })

    const bqsResult = calculateBusinessQualityScore(adjustmentProfile)

    // ─── V2: Deal Readiness Score ──────────────────────────────────────
    const drsResult = calculateDealReadinessScore(categoryScores)

    // ─── V2: Risk Discounts ────────────────────────────────────────────
    const riskInputs: RiskDiscountInputs = {
      ownerInvolvement: coreFactors?.ownerInvolvement ?? null,
      transferabilityScore,
      topCustomerConcentration: null, // TODO: populate from company profile
      top3CustomerConcentration: null,
      legalTaxScore: getCategoryScore('LEGAL_TAX'),
      financialScore: getCategoryScore('FINANCIAL'),
      revenueSizeCategory: revenueSizeCategory ?? null,
    }
    const riskResult = calculateRiskDiscounts(riskInputs)

    // ─── V2: Valuation Formula ─────────────────────────────────────────
    const v2Valuation = calculateValuationV2({
      adjustedEbitda,
      industryMultipleLow,
      industryMultipleHigh,
      qualityAdjustments: bqsResult.adjustments,
      riskDiscounts: riskResult.discounts,
      riskMultiplier: riskResult.riskMultiplier,
    })

    // ─── V2: Value Gap Decomposition ───────────────────────────────────
    // Find size discount from adjustments
    const sizeAdj = bqsResult.adjustments.adjustments.find(a => a.factor === 'size_discount')
    const sizeDiscountRate = sizeAdj?.impact ?? 0

    const gapResult = calculateValueGapV2({
      adjustedEbitda,
      industryMedianMultiple: v2Valuation.industryMedianMultiple,
      industryMultipleHigh,
      qualityAdjustedMultiple: v2Valuation.qualityAdjustedMultiple,
      riskAdjustedMultiple: v2Valuation.riskAdjustedMultiple,
      riskDiscounts: riskResult.discounts,
      sizeDiscountRate,
    })

    // ─── V2: DLOM details ──────────────────────────────────────────────
    const dlomDiscount = riskResult.discounts.find(d => d.name.includes('DLOM'))
    const dlomRate = dlomDiscount?.rate ?? 0
    const dlomAmount = v2Valuation.evMid > 0 ? v2Valuation.evMid * dlomRate / (1 - dlomRate) : 0

    // ─── Auto-DCF cross-check ──────────────────────────────────────────
    let dcfData: Record<string, unknown> = {}
    try {
      const dcfAssumptions = await prisma.dCFAssumptions.findUnique({
        where: { companyId },
        select: { isManuallyConfigured: true },
      })

      if (!dcfAssumptions?.isManuallyConfigured) {
        const dcfResult = await calculateAutoDCF(companyId, briScore, adjustedEbitda)
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
            dcfCompanySpecificRisk: dcfResult.companySpecificRisk,
            dcfSource: 'auto',
          }

          // V2 cross-check: flag >25% divergence
          if (v2Valuation.evMid > 0 && dcfResult.enterpriseValue > 0) {
            const divergence = Math.abs(dcfResult.enterpriseValue - v2Valuation.evMid) / v2Valuation.evMid
            if (divergence > 0.25) {
              console.log(`[V2-DCF-CHECK] Company ${companyId}: DCF diverges ${(divergence * 100).toFixed(1)}% from multiple-based EV. DCF=${dcfResult.enterpriseValue.toFixed(0)}, EV_mid=${v2Valuation.evMid.toFixed(0)}`)
            }
          }
        }
      }
    } catch (error) {
      console.error(`[AUTO-DCF] Error for company ${companyId}:`, error)
    }

    // ─── Create snapshot with BOTH V1 and V2 fields ────────────────────
    const snapshot = await prisma.valuationSnapshot.create({
      data: {
        companyId,
        createdByUserId,
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
        // V1 fields
        coreScore,
        briScore,
        briFinancial: getCategoryScore('FINANCIAL'),
        briTransferability: getCategoryScore('TRANSFERABILITY'),
        briOperational: getCategoryScore('OPERATIONAL'),
        briMarket: getCategoryScore('MARKET'),
        briLegalTax: getCategoryScore('LEGAL_TAX'),
        briPersonal: getCategoryScore('PERSONAL'),
        baseMultiple: v1Valuation.baseMultiple,
        discountFraction: v1Valuation.discountFraction,
        finalMultiple: v1Valuation.finalMultiple,
        currentValue: v2Valuation.evMid, // V2 evMid as currentValue
        potentialValue: v1Valuation.potentialValue,
        valueGap: gapResult.totalGap,
        alphaConstant: ALPHA,
        snapshotReason,
        // V2 fields
        businessQualityScore: bqsResult.score,
        dealReadinessScore: drsResult.score,
        riskSeverityScore: riskResult.riskSeverityScore,
        industryMedianMultiple: v2Valuation.industryMedianMultiple,
        qualityAdjustedMultiple: v2Valuation.qualityAdjustedMultiple,
        riskAdjustedMultiple: v2Valuation.riskAdjustedMultiple,
        evLow: v2Valuation.evLow,
        evMid: v2Valuation.evMid,
        evHigh: v2Valuation.evHigh,
        spreadFactor: v2Valuation.spreadFactor,
        dlomRate,
        dlomAmount,
        riskDiscounts: riskResult.discounts.map(d => ({
          name: d.name, rate: d.rate, explanation: d.explanation,
        })),
        qualityAdjustments: bqsResult.adjustments.adjustments.map(a => ({
          factor: a.factor, impact: a.impact, explanation: a.explanation,
        })),
        totalQualityAdjustment: v2Valuation.totalQualityAdjustment,
        addressableGap: gapResult.addressableGap,
        structuralGap: gapResult.structuralGap,
        aspirationalGap: gapResult.aspirationalGap,
        // DCF
        ...dcfData,
      },
    })

    // Update DRS on company
    await prisma.company.update({
      where: { id: companyId },
      data: {
        dealReadinessScore: drsResult.score,
        dealReadinessUpdatedAt: new Date(),
      },
    })

    // Renormalize task values against V2 gap
    try {
      const renormResult = await renormalizeTaskValues(companyId, gapResult.totalGap)
      if (renormResult.updated > 0) {
        console.log(`[SNAPSHOT-V2] Renormalized ${renormResult.updated} task values for company ${companyId}`)
      }
    } catch (renormError) {
      console.error(`[SNAPSHOT-V2] Task renormalization failed (non-fatal):`, renormError)
    }

    console.log(`[SNAPSHOT-V2] Company ${companyId}: BQS=${bqsResult.score.toFixed(3)}, DRS=${drsResult.score.toFixed(3)}, RSS=${riskResult.riskSeverityScore.toFixed(3)}, EV_mid=${v2Valuation.evMid.toFixed(0)}, range=[${v2Valuation.evLow.toFixed(0)}, ${v2Valuation.evHigh.toFixed(0)}]`)

    return { success: true, snapshotId: snapshot.id, companyId, companyName: company.name }
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

async function getBriWeightsForCompany(companyBriWeights: unknown): Promise<Record<string, number>> {
  if (companyBriWeights && typeof companyBriWeights === 'object') {
    return companyBriWeights as Record<string, number>
  }
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'bri_category_weights' },
    })
    if (setting?.value) return setting.value as Record<string, number>
  } catch (error) {
    console.error('Error fetching global BRI weights:', error)
  }
  return DEFAULT_CATEGORY_WEIGHTS
}

/**
 * Find all companies affected by an industry multiple update
 */
export async function findAffectedCompanies(
  icbSubSector?: string, icbSector?: string, icbSuperSector?: string, icbIndustry?: string
): Promise<Array<{ id: string; name: string; icbSubSector: string }>> {
  const orConditions: Array<Record<string, string>> = []
  if (icbSubSector) orConditions.push({ icbSubSector })
  if (icbSector) orConditions.push({ icbSector })
  if (icbSuperSector) orConditions.push({ icbSuperSector })
  if (icbIndustry) orConditions.push({ icbIndustry })
  if (orConditions.length === 0) return []

  return prisma.company.findMany({
    where: { OR: orConditions },
    select: { id: true, name: true, icbSubSector: true },
  })
}

/**
 * Recalculate snapshots for all companies affected by a multiple update
 */
export async function recalculateSnapshotsForMultipleUpdate(
  icbSubSector?: string, icbSector?: string, icbSuperSector?: string, icbIndustry?: string,
  updateType: 'EBITDA' | 'Revenue' | 'Both' = 'Both', createdByUserId?: string
): Promise<{ totalCompanies: number; successful: number; failed: number; results: RecalculateResult[] }> {
  const snapshotReason = `Industry ${updateType} multiples updated`
  const companies = await findAffectedCompanies(icbSubSector, icbSector, icbSuperSector, icbIndustry)

  const results: RecalculateResult[] = []
  let successful = 0
  let failed = 0

  for (const company of companies) {
    const result = await recalculateSnapshotForCompany(company.id, snapshotReason, createdByUserId)
    results.push(result)
    if (result.success) successful++
    else failed++
  }

  return { totalCompanies: companies.length, successful, failed, results }
}
