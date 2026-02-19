// Business Quality Score (BQS) — V2
// Wraps the multiple-adjustments engine and normalizes to 0-1.
// BQS drives the quality-adjusted multiple (Step 3 of V2 formula).

import {
  adjustMultiples,
  type AdjustmentProfile,
  type AdjustmentResult,
} from './multiple-adjustments'

export interface BusinessQualityResult {
  /** Normalized 0-1 score (0 = worst quality, 1 = best quality) */
  score: number
  /** The raw adjustment result from multiple-adjustments engine */
  adjustments: AdjustmentResult
  /** The adjustment multiplier applied to the median multiple */
  adjustmentMultiplier: number
}

/**
 * Calculate Business Quality Score from an AdjustmentProfile.
 *
 * BQS = normalizedMultiplier mapped to 0-1:
 *   multiplier range is [0.3, 1.5] (from adjustMultiples)
 *   BQS = (multiplier - 0.3) / (1.5 - 0.3) = (multiplier - 0.3) / 1.2
 *
 * This provides an intuitive 0-1 score where:
 *   - BQS 0.0 = worst adjustments (0.3x multiplier)
 *   - BQS ~0.58 = no adjustments (1.0x multiplier)
 *   - BQS 1.0 = best adjustments (1.5x multiplier)
 */
export function calculateBusinessQualityScore(
  profile: AdjustmentProfile
): BusinessQualityResult {
  const result = adjustMultiples(profile)

  // Normalize: adjustmentMultiplier is clamped to [0.3, 1.5] by adjustMultiples
  const MIN_MULTIPLIER = 0.3
  const MAX_MULTIPLIER = 1.5
  const score = (result.adjustmentMultiplier - MIN_MULTIPLIER) / (MAX_MULTIPLIER - MIN_MULTIPLIER)

  return {
    score: Math.max(0, Math.min(1, score)),
    adjustments: result,
    adjustmentMultiplier: result.adjustmentMultiplier,
  }
}

/**
 * Build an AdjustmentProfile from company data.
 * This is the bridge between Prisma company data and the pure adjustment engine.
 */
export function buildAdjustmentProfile(company: {
  annualRevenue: number | { toNumber(): number }
  annualEbitda: number | { toNumber(): number }
  coreFactors: {
    revenueSizeCategory?: string | null
    revenueModel?: string | null
  } | null
  /** BRI transferability score (0-1), used for owner dependency */
  transferabilityScore?: number | null
  /** Top customer revenue concentration (0-1) */
  topCustomerConcentration?: number | null
  /** Top 3 customer revenue concentration (0-1) */
  top3CustomerConcentration?: number | null
  /** YoY revenue growth rate as decimal */
  revenueGrowthRate?: number | null
}): AdjustmentProfile {
  const revenue = typeof company.annualRevenue === 'number'
    ? company.annualRevenue
    : company.annualRevenue.toNumber()
  const ebitda = typeof company.annualEbitda === 'number'
    ? company.annualEbitda
    : company.annualEbitda.toNumber()

  const ebitdaMargin = revenue > 0 ? ebitda / revenue : null
  const isRecurringRevenue = company.coreFactors?.revenueModel === 'SUBSCRIPTION_SAAS'
    || company.coreFactors?.revenueModel === 'RECURRING_CONTRACTS'

  return {
    revenue,
    revenueSizeCategory: company.coreFactors?.revenueSizeCategory ?? undefined,
    revenueGrowthRate: company.revenueGrowthRate ?? null,
    ebitdaMargin: ebitdaMargin !== null && ebitdaMargin >= 0 ? ebitdaMargin : null,
    topCustomerConcentration: company.topCustomerConcentration ?? null,
    top3CustomerConcentration: company.top3CustomerConcentration ?? null,
    transferabilityScore: company.transferabilityScore ?? null,
    revenueModel: company.coreFactors?.revenueModel ?? undefined,
    isRecurringRevenue,
  }
}
