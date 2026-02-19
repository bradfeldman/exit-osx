// V2 Canonical Valuation Calculation
// This is the SINGLE SOURCE OF TRUTH for valuation calculations.
// All other code should import and use these functions.
//
// V2 Formula:
//   1. Adjusted EBITDA (bidirectional owner comp)
//   2. Industry median multiple = (low + high) / 2
//   3. Quality-adjusted multiple = median × adjustmentMultiplier (from BQS)
//   4. Discrete risk discounts applied multiplicatively
//   5. Risk-adjusted multiple = quality-adjusted × riskMultiplier
//   6. Enterprise value range: evMid ± spreadFactor
//   7. Cross-check with DCF (flag divergence >25%)
//   8. Value gap decomposed: addressable + structural + aspirational

import type { AdjustmentResult } from './multiple-adjustments'
import type { RiskDiscount } from './risk-discounts'

// ─── V1 EXPORTS (kept for backwards compatibility during migration) ───

/**
 * @deprecated V1 constant — no longer used in V2 formula.
 * Kept for migration compatibility with existing code that imports it.
 */
export const ALPHA = 1.4

/**
 * Core factor scoring tables.
 * Used to convert categorical business attributes to 0-1 scores.
 * NOTE: revenueSizeCategory is intentionally EXCLUDED because
 * revenue already affects valuation through the EBITDA × multiple calculation.
 */
export const CORE_FACTOR_SCORES: Record<string, Record<string, number>> = {
  revenueModel: {
    PROJECT_BASED: 0.25,
    TRANSACTIONAL: 0.5,
    RECURRING_CONTRACTS: 0.75,
    SUBSCRIPTION_SAAS: 1.0,
  },
  grossMarginProxy: {
    LOW: 0.25,
    MODERATE: 0.5,
    GOOD: 0.75,
    EXCELLENT: 1.0,
  },
  laborIntensity: {
    VERY_HIGH: 0.25,
    HIGH: 0.5,
    MODERATE: 0.75,
    LOW: 1.0,
  },
  assetIntensity: {
    ASSET_HEAVY: 0.33,
    MODERATE: 0.67,
    ASSET_LIGHT: 1.0,
  },
  ownerInvolvement: {
    CRITICAL: 0.0,
    HIGH: 0.25,
    MODERATE: 0.5,
    LOW: 0.75,
    MINIMAL: 1.0,
  },
}

export interface CoreFactors {
  revenueModel: string
  grossMarginProxy: string
  laborIntensity: string
  assetIntensity: string
  ownerInvolvement: string
}

const CORE_FACTOR_WEIGHTS = {
  revenueModel: 1.0,
  grossMarginProxy: 1.0,
  laborIntensity: 1.0,
  assetIntensity: 1.0,
  ownerInvolvement: 0.5,
} as const

/**
 * Calculate Core Score from business quality factors.
 * Returns a value between 0 and 1.
 * In V2, this is used as an input to the adjustment profile, not directly in the formula.
 */
export function calculateCoreScore(factors: CoreFactors | null): number {
  if (!factors) return 0.5

  const entries: [number, number][] = [
    [CORE_FACTOR_SCORES.revenueModel[factors.revenueModel] ?? 0.5, CORE_FACTOR_WEIGHTS.revenueModel],
    [CORE_FACTOR_SCORES.grossMarginProxy[factors.grossMarginProxy] ?? 0.5, CORE_FACTOR_WEIGHTS.grossMarginProxy],
    [CORE_FACTOR_SCORES.laborIntensity[factors.laborIntensity] ?? 0.5, CORE_FACTOR_WEIGHTS.laborIntensity],
    [CORE_FACTOR_SCORES.assetIntensity[factors.assetIntensity] ?? 0.5, CORE_FACTOR_WEIGHTS.assetIntensity],
    [CORE_FACTOR_SCORES.ownerInvolvement[factors.ownerInvolvement] ?? 0.5, CORE_FACTOR_WEIGHTS.ownerInvolvement],
  ]

  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0)
  return entries.reduce((sum, [score, w]) => sum + score * w, 0) / totalWeight
}

// ─── V2 TYPES ─────────────────────────────────────────────────────────

export interface ValuationV2Inputs {
  adjustedEbitda: number
  industryMultipleLow: number
  industryMultipleHigh: number
  /** From multiple-adjustments engine */
  qualityAdjustments: AdjustmentResult
  /** From risk-discounts engine */
  riskDiscounts: RiskDiscount[]
  /** Product of (1 - discount_i) from risk-discounts engine */
  riskMultiplier: number
  /** Spread factor for range width (default 0.15) */
  spreadFactor?: number
}

export interface ValuationV2Result {
  /** Industry median multiple = (low + high) / 2 */
  industryMedianMultiple: number
  /** Median × adjustmentMultiplier */
  qualityAdjustedMultiple: number
  /** Quality-adjusted × riskMultiplier */
  riskAdjustedMultiple: number
  /** adjustedEbitda × riskAdjustedMultiple × (1 - spreadFactor) */
  evLow: number
  /** adjustedEbitda × riskAdjustedMultiple */
  evMid: number
  /** adjustedEbitda × riskAdjustedMultiple × (1 + spreadFactor) */
  evHigh: number
  /** The spread factor used */
  spreadFactor: number
  /** Total quality adjustment from multiple-adjustments */
  totalQualityAdjustment: number
}

/**
 * V2 Canonical Valuation Formula.
 *
 * Steps:
 *   1. industryMedian = (low + high) / 2
 *   2. qualityAdjustedMultiple = industryMedian × adjustmentMultiplier
 *   3. riskAdjustedMultiple = qualityAdjustedMultiple × riskMultiplier
 *   4. evMid = adjustedEbitda × riskAdjustedMultiple
 *   5. evLow = evMid × (1 - spreadFactor)
 *   6. evHigh = evMid × (1 + spreadFactor)
 */
export function calculateValuationV2(inputs: ValuationV2Inputs): ValuationV2Result {
  const {
    adjustedEbitda,
    industryMultipleLow,
    industryMultipleHigh,
    qualityAdjustments,
    riskMultiplier,
    spreadFactor: inputSpreadFactor,
  } = inputs

  const spreadFactor = inputSpreadFactor ?? 0.15

  // Step 1: Industry median
  const industryMedianMultiple = (industryMultipleLow + industryMultipleHigh) / 2

  // Step 2: Quality adjustments (from multiple-adjustments engine)
  const qualityAdjustedMultiple = industryMedianMultiple * qualityAdjustments.adjustmentMultiplier

  // Step 3: Risk discounts (multiplicative)
  const riskAdjustedMultiple = qualityAdjustedMultiple * riskMultiplier

  // Guard: negative or zero EBITDA
  if (adjustedEbitda <= 0) {
    return {
      industryMedianMultiple,
      qualityAdjustedMultiple,
      riskAdjustedMultiple,
      evLow: 0,
      evMid: 0,
      evHigh: 0,
      spreadFactor,
      totalQualityAdjustment: qualityAdjustments.totalAdjustment,
    }
  }

  // Step 4-6: Enterprise value range
  const evMid = adjustedEbitda * riskAdjustedMultiple
  const evLow = evMid * (1 - spreadFactor)
  const evHigh = evMid * (1 + spreadFactor)

  return {
    industryMedianMultiple,
    qualityAdjustedMultiple,
    riskAdjustedMultiple,
    evLow,
    evMid,
    evHigh,
    spreadFactor,
    totalQualityAdjustment: qualityAdjustments.totalAdjustment,
  }
}

// ─── V1 COMPATIBILITY ─────────────────────────────────────────────────
// These types and functions are kept so existing callers (onboarding, dashboard)
// continue to work during the Phase 3 migration.

export interface ValuationInputs {
  adjustedEbitda: number
  industryMultipleLow: number
  industryMultipleHigh: number
  coreScore: number
  briScore: number
}

export interface ValuationResult {
  currentValue: number
  potentialValue: number
  valueGap: number
  baseMultiple: number
  finalMultiple: number
  discountFraction: number
}

/**
 * V1 valuation formula — kept for backwards compatibility.
 * During Phase 3, callers will be migrated to calculateValuationV2.
 */
export function calculateValuation(inputs: ValuationInputs): ValuationResult {
  const {
    adjustedEbitda,
    industryMultipleLow,
    industryMultipleHigh,
    coreScore,
    briScore,
  } = inputs

  if (adjustedEbitda <= 0) {
    const baseMultiple = industryMultipleLow + coreScore * (industryMultipleHigh - industryMultipleLow)
    return {
      currentValue: 0,
      potentialValue: 0,
      valueGap: 0,
      baseMultiple,
      finalMultiple: baseMultiple,
      discountFraction: 0,
    }
  }

  const baseMultiple = industryMultipleLow + coreScore * (industryMultipleHigh - industryMultipleLow)
  const discountFraction = Math.pow(1 - briScore, ALPHA)
  const finalMultiple = industryMultipleLow + (baseMultiple - industryMultipleLow) * (1 - discountFraction)
  const currentValue = adjustedEbitda * finalMultiple
  const potentialValue = adjustedEbitda * industryMultipleHigh
  const valueGap = potentialValue - currentValue

  return {
    currentValue,
    potentialValue,
    valueGap,
    baseMultiple,
    finalMultiple,
    discountFraction,
  }
}

/**
 * V1 convenience function — kept for backwards compatibility.
 */
export function calculateValuationFromPercentages(inputs: {
  adjustedEbitda: number
  industryMultipleLow: number
  industryMultipleHigh: number
  coreScore: number
  briScorePercent: number
}): ValuationResult {
  return calculateValuation({
    ...inputs,
    briScore: inputs.briScorePercent / 100,
  })
}
