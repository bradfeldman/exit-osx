// Canonical Valuation Calculation
// This is the SINGLE SOURCE OF TRUTH for valuation calculations.
// All other code should import and use these functions.

/**
 * Alpha constant for non-linear BRI discount calculation.
 * Higher alpha = more aggressive discount for low BRI scores.
 * 1.4 provides a reasonable curve where:
 * - BRI 90% → ~4% discount
 * - BRI 70% → ~19% discount
 * - BRI 50% → ~35% discount
 * - BRI 30% → ~52% discount
 */
export const ALPHA = 1.4

/**
 * Core factor scoring tables.
 * Used to convert categorical business attributes to 0-1 scores.
 * NOTE: revenueSizeCategory is intentionally EXCLUDED because
 * revenue already affects valuation through the EBITDA × multiple calculation.
 * Including it here would double-count revenue impact.
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

/**
 * Core factor weights for the weighted average.
 * ownerInvolvement is down-weighted to 0.5 because the BRI TRANSFERABILITY
 * assessment captures owner dependency with much more granularity (4 questions,
 * 47 max impact points). Without down-weighting, owner dependency would be
 * double-counted: once here in Core Score (positioning within range) and again
 * in BRI Score (discount from range). See issue 3.9.
 */
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
 * Core Score positions the company within its industry multiple range.
 */
export function calculateCoreScore(factors: CoreFactors | null): number {
  if (!factors) return 0.5 // Default if no factors provided

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

export interface ValuationInputs {
  adjustedEbitda: number
  industryMultipleLow: number
  industryMultipleHigh: number
  coreScore: number // 0-1 scale
  briScore: number // 0-1 scale (NOT 0-100)
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
 * Calculate valuation using the canonical non-linear formula.
 *
 * The formula:
 * 1. baseMultiple = industryMultipleLow + coreScore × (industryMultipleHigh - industryMultipleLow)
 *    - Core Score positions the company within its industry range
 *    - Score of 1.0 = top of range, Score of 0.0 = bottom of range
 *
 * 2. discountFraction = (1 - briScore)^ALPHA
 *    - Non-linear discount based on buyer readiness
 *    - ALPHA=1.4 provides accelerating discount for lower scores
 *
 * 3. finalMultiple = industryMultipleLow + (baseMultiple - industryMultipleLow) × (1 - discountFraction)
 *    - Floor guarantee: never goes below industry low multiple
 *    - High BRI = minimal discount, Low BRI = significant discount
 *
 * 4. currentValue = adjustedEbitda × finalMultiple
 * 5. potentialValue = adjustedEbitda × industryMultipleHigh (industry ceiling)
 * 6. valueGap = potentialValue - currentValue
 *
 * @param inputs - The valuation calculation inputs
 * @returns Calculated valuation values
 */
export function calculateValuation(inputs: ValuationInputs): ValuationResult {
  const {
    adjustedEbitda,
    industryMultipleLow,
    industryMultipleHigh,
    coreScore,
    briScore,
  } = inputs

  // Guard: negative or zero EBITDA cannot produce meaningful valuations
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

  // Step 1: Core Score positions within industry range
  const baseMultiple = industryMultipleLow + coreScore * (industryMultipleHigh - industryMultipleLow)

  // Step 2: Non-linear discount based on BRI
  const discountFraction = Math.pow(1 - briScore, ALPHA)

  // Step 3: Final multiple with floor guarantee
  const finalMultiple = industryMultipleLow + (baseMultiple - industryMultipleLow) * (1 - discountFraction)

  // Step 4-6: Calculate values
  const currentValue = adjustedEbitda * finalMultiple
  // Potential value = industry max multiple × EBITDA (best-case for your industry)
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
 * Convenience function for onboarding where BRI is provided as 0-100 scale.
 * Converts to 0-1 scale before calculating.
 */
export function calculateValuationFromPercentages(inputs: {
  adjustedEbitda: number
  industryMultipleLow: number
  industryMultipleHigh: number
  coreScore: number // 0-1 scale
  briScorePercent: number // 0-100 scale
}): ValuationResult {
  return calculateValuation({
    ...inputs,
    briScore: inputs.briScorePercent / 100,
  })
}
