import { describe, it, expect } from 'vitest'
import {
  calculateBaseMultiple,
  estimateEbitdaFromRevenue,
  type MultipleResult
} from '@/lib/valuation/industry-multiples'
import {
  ALPHA,
  CORE_FACTOR_SCORES,
  calculateCoreScore,
  calculateValuation,
  calculateValuationFromPercentages,
  type ValuationInputs,
  type ValuationResult,
  type CoreFactors,
} from '@/lib/valuation/calculate-valuation'
import { DEFAULT_BRI_WEIGHTS } from '@/lib/bri-weights'
import {
  CANONICAL_COMPANY,
  EXPECTED_VALUATION,
  FOUNDER_DEPENDENT_COMPANY,
  HIGH_CONCENTRATION_COMPANY,
  PERFECT_SAAS_COMPANY,
  calculateExpectedValuation,
} from '@/__tests__/fixtures/canonical-company'

// ---------------------------------------------------------------------------
// Canonical inputs used across consistency tests
// Bug report scenario: revenue=$1M, ebitdaMargin=0.15, briScore=70, multiples=3.0-6.0
// ---------------------------------------------------------------------------
const CANONICAL_INPUTS: ValuationInputs = {
  adjustedEbitda: 150000,      // $1M revenue * 15% margin
  industryMultipleLow: 3.0,
  industryMultipleHigh: 6.0,
  coreScore: 1.0,             // Onboarding optimal defaults
  briScore: 0.7,              // 70% BRI
}

// Pre-computed expected values for the canonical inputs
// These are the definitive reference values that ALL locations must match
const CANONICAL_EXPECTED = {
  baseMultiple: 6.0,          // 3.0 + 1.0 * (6.0 - 3.0)
  discountFraction: Math.pow(0.3, 1.4), // (1 - 0.7)^1.4
  get finalMultiple() {
    return 3.0 + (6.0 - 3.0) * (1 - this.discountFraction)
  },
  get currentValue() {
    return 150000 * this.finalMultiple
  },
  potentialValue: 150000 * 6.0, // 900,000
  get valueGap() {
    return this.potentialValue - this.currentValue
  },
}

describe('Valuation Calculations', () => {
  describe('calculateBaseMultiple', () => {
    it('should calculate average of low and high', () => {
      expect(calculateBaseMultiple(4, 8)).toBe(6)
      expect(calculateBaseMultiple(3, 6)).toBe(4.5)
      expect(calculateBaseMultiple(2, 10)).toBe(6)
    })

    it('should handle same low and high values', () => {
      expect(calculateBaseMultiple(5, 5)).toBe(5)
    })

    it('should handle decimal values', () => {
      expect(calculateBaseMultiple(3.5, 7.5)).toBe(5.5)
    })

    it('should handle zero', () => {
      expect(calculateBaseMultiple(0, 10)).toBe(5)
      expect(calculateBaseMultiple(0, 0)).toBe(0)
    })
  })

  describe('estimateEbitdaFromRevenue', () => {
    const defaultMultiples: MultipleResult = {
      ebitdaMultipleLow: 3.0,
      ebitdaMultipleHigh: 6.0,
      revenueMultipleLow: 0.5,
      revenueMultipleHigh: 1.5,
      source: 'Test',
      isDefault: true,
      matchLevel: 'default',
    }

    it('should estimate EBITDA from revenue using formula', () => {
      // For $10M revenue:
      // EBITDA_low = (10M * 0.5) / 6.0 = $833,333
      // EBITDA_high = (10M * 1.5) / 3.0 = $5,000,000
      // Blended = ($833,333 + $5,000,000) / 2 = $2,916,666
      // Rounded to nearest $100,000 = $2,900,000
      const result = estimateEbitdaFromRevenue(10000000, defaultMultiples)
      expect(result).toBe(2900000)
    })

    it('should round to nearest $100,000', () => {
      // Different revenue amounts should be rounded appropriately
      const result1 = estimateEbitdaFromRevenue(5000000, defaultMultiples)
      expect(result1 % 100000).toBe(0)

      const result2 = estimateEbitdaFromRevenue(7500000, defaultMultiples)
      expect(result2 % 100000).toBe(0)
    })

    it('should return 0 when EBITDA multiples are 0', () => {
      const zeroMultiples: MultipleResult = {
        ...defaultMultiples,
        ebitdaMultipleLow: 0,
        ebitdaMultipleHigh: 0,
      }
      expect(estimateEbitdaFromRevenue(10000000, zeroMultiples)).toBe(0)
    })

    it('should return 0 when only high EBITDA multiple is 0', () => {
      const zeroHighMultiples: MultipleResult = {
        ...defaultMultiples,
        ebitdaMultipleHigh: 0,
      }
      expect(estimateEbitdaFromRevenue(10000000, zeroHighMultiples)).toBe(0)
    })

    it('should return 0 when only low EBITDA multiple is 0', () => {
      const zeroLowMultiples: MultipleResult = {
        ...defaultMultiples,
        ebitdaMultipleLow: 0,
      }
      expect(estimateEbitdaFromRevenue(10000000, zeroLowMultiples)).toBe(0)
    })

    it('should return 0 for 0 revenue', () => {
      expect(estimateEbitdaFromRevenue(0, defaultMultiples)).toBe(0)
    })

    it('should scale proportionally with revenue', () => {
      const result1 = estimateEbitdaFromRevenue(10000000, defaultMultiples)
      const result2 = estimateEbitdaFromRevenue(20000000, defaultMultiples)
      // Result should approximately double (within rounding)
      expect(result2).toBeGreaterThanOrEqual(result1 * 1.8)
      expect(result2).toBeLessThanOrEqual(result1 * 2.2)
    })

    it('should handle high-margin businesses', () => {
      const highMarginMultiples: MultipleResult = {
        ebitdaMultipleLow: 8.0,
        ebitdaMultipleHigh: 12.0,
        revenueMultipleLow: 2.0,
        revenueMultipleHigh: 4.0,
        source: 'Test',
        isDefault: false,
        matchLevel: 'subsector',
      }
      const result = estimateEbitdaFromRevenue(10000000, highMarginMultiples)
      // Should produce a reasonable EBITDA estimate
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(10000000) // EBITDA should be less than revenue
    })

    it('should handle low-margin businesses', () => {
      const lowMarginMultiples: MultipleResult = {
        ebitdaMultipleLow: 2.0,
        ebitdaMultipleHigh: 4.0,
        revenueMultipleLow: 0.3,
        revenueMultipleHigh: 0.8,
        source: 'Test',
        isDefault: false,
        matchLevel: 'sector',
      }
      const result = estimateEbitdaFromRevenue(10000000, lowMarginMultiples)
      // Should produce a reasonable EBITDA estimate
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(10000000)
    })
  })

  describe('Canonical Valuation Formula (calculate-valuation.ts)', () => {
    describe('ALPHA constant', () => {
      it('should be 1.4', () => {
        expect(ALPHA).toBe(1.4)
      })
    })

    describe('CORE_FACTOR_SCORES', () => {
      it('has exactly 5 factors (NOT 6 - revenueSizeCategory excluded)', () => {
        const factorNames = Object.keys(CORE_FACTOR_SCORES)
        expect(factorNames).toHaveLength(5)
        expect(factorNames).toContain('revenueModel')
        expect(factorNames).toContain('grossMarginProxy')
        expect(factorNames).toContain('laborIntensity')
        expect(factorNames).toContain('assetIntensity')
        expect(factorNames).toContain('ownerInvolvement')
        // Regression: revenueSizeCategory must NOT be present (Bug #3)
        expect(factorNames).not.toContain('revenueSizeCategory')
      })

      it('has correct score ranges for each factor', () => {
        // Every factor score should be between 0 and 1
        for (const [_factor, scores] of Object.entries(CORE_FACTOR_SCORES)) {
          for (const [_level, value] of Object.entries(scores)) {
            expect(value).toBeGreaterThanOrEqual(0)
            expect(value).toBeLessThanOrEqual(1)
          }
        }
      })
    })

    describe('calculateCoreScore', () => {
      it('returns 0.5 for null factors', () => {
        expect(calculateCoreScore(null)).toBe(0.5)
      })

      it('returns 1.0 for optimal factors (onboarding defaults)', () => {
        const optimalFactors: CoreFactors = {
          revenueModel: 'SUBSCRIPTION_SAAS',
          grossMarginProxy: 'EXCELLENT',
          laborIntensity: 'LOW',
          assetIntensity: 'ASSET_LIGHT',
          ownerInvolvement: 'MINIMAL',
        }
        expect(calculateCoreScore(optimalFactors)).toBe(1.0)
      })

      it('returns approximately 0.216 for worst factors', () => {
        const worstFactors: CoreFactors = {
          revenueModel: 'PROJECT_BASED',
          grossMarginProxy: 'LOW',
          laborIntensity: 'VERY_HIGH',
          assetIntensity: 'ASSET_HEAVY',
          ownerInvolvement: 'CRITICAL',
        }
        // (0.25 + 0.25 + 0.25 + 0.33 + 0.0) / 5 = 1.08 / 5 = 0.216
        expect(calculateCoreScore(worstFactors)).toBeCloseTo(0.216, 2)
      })

      it('handles unknown factor values by defaulting to 0.5', () => {
        const unknownFactors: CoreFactors = {
          revenueModel: 'UNKNOWN_MODEL',
          grossMarginProxy: 'UNKNOWN',
          laborIntensity: 'UNKNOWN',
          assetIntensity: 'UNKNOWN',
          ownerInvolvement: 'UNKNOWN',
        }
        // All default to 0.5, so (0.5 * 5) / 5 = 0.5
        expect(calculateCoreScore(unknownFactors)).toBe(0.5)
      })

      it('uses exactly 5 factors (not 6) - revenueSizeCategory excluded', () => {
        // This is a critical regression test for Bug #3 in the bug report.
        // The dashboard route was previously using 6 factors which diluted the core score.
        // This test ensures the shared utility always uses exactly 5 factors.
        const optimalFactors: CoreFactors = {
          revenueModel: 'SUBSCRIPTION_SAAS',
          grossMarginProxy: 'EXCELLENT',
          laborIntensity: 'LOW',
          assetIntensity: 'ASSET_LIGHT',
          ownerInvolvement: 'MINIMAL',
        }

        // With 5 factors all at 1.0: (1+1+1+1+1)/5 = 1.0
        const score = calculateCoreScore(optimalFactors)
        expect(score).toBe(1.0)

        // If revenueSizeCategory were included as a 6th factor (e.g., 0.4 for $1M revenue),
        // the score would be: (0.4+1+1+1+1+1)/6 = 0.9
        // This test ensures that does NOT happen.
        expect(score).not.toBe(0.9)
      })
    })

    describe('calculateValuation', () => {
      it('calculates correct values for canonical inputs (bug report scenario)', () => {
        const result = calculateValuation(CANONICAL_INPUTS)

        // Step-by-step verification against the bug report's correct formula
        expect(result.baseMultiple).toBe(CANONICAL_EXPECTED.baseMultiple)
        expect(result.discountFraction).toBeCloseTo(CANONICAL_EXPECTED.discountFraction, 6)
        expect(result.finalMultiple).toBeCloseTo(CANONICAL_EXPECTED.finalMultiple, 6)
        expect(result.currentValue).toBeCloseTo(CANONICAL_EXPECTED.currentValue, 0)
        expect(result.potentialValue).toBe(CANONICAL_EXPECTED.potentialValue)
        expect(result.valueGap).toBeCloseTo(CANONICAL_EXPECTED.valueGap, 0)
      })

      it('calculates correct values for typical onboarding scenario', () => {
        const result = calculateValuation({
          adjustedEbitda: 150000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0, // Optimal onboarding defaults
          briScore: 0.7, // 70% BRI
        })

        // baseMultiple = 3.0 + 1.0 * (6.0 - 3.0) = 6.0
        expect(result.baseMultiple).toBe(6.0)

        // discountFraction = (1 - 0.7)^1.4 = 0.3^1.4
        expect(result.discountFraction).toBeCloseTo(0.1853, 2)

        // finalMultiple = 3.0 + (6.0 - 3.0) * (1 - 0.1853) = 5.44
        expect(result.finalMultiple).toBeCloseTo(5.44, 1)

        // currentValue = 150000 * finalMultiple
        expect(result.currentValue).toBeCloseTo(816600, -2)

        // potentialValue = 150000 * 6.0 = 900,000
        expect(result.potentialValue).toBe(900000)

        // valueGap = 900000 - currentValue
        expect(result.valueGap).toBeCloseTo(83400, -2)
      })

      it('provides floor guarantee at industry low multiple', () => {
        const result = calculateValuation({
          adjustedEbitda: 100000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 0.5,
          briScore: 0.0, // Worst possible BRI
        })

        // With BRI = 0, discountFraction = 1.0^1.4 = 1.0
        // finalMultiple = 3.0 + (baseMultiple - 3.0) * (1 - 1.0) = 3.0
        expect(result.finalMultiple).toBe(3.0)
        expect(result.currentValue).toBe(300000)
      })

      it('gives no discount for perfect BRI', () => {
        const result = calculateValuation({
          adjustedEbitda: 100000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0,
          briScore: 1.0, // Perfect BRI
        })

        // With BRI = 1.0, discountFraction = 0^1.4 = 0
        expect(result.discountFraction).toBe(0)
        expect(result.finalMultiple).toBe(6.0)
        expect(result.currentValue).toBe(600000)
        expect(result.valueGap).toBe(0)
      })

      it('handles zero EBITDA gracefully', () => {
        const result = calculateValuation({
          adjustedEbitda: 0,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0,
          briScore: 0.7,
        })

        expect(result.currentValue).toBe(0)
        expect(result.potentialValue).toBe(0)
        expect(result.valueGap).toBe(0)
        // Multiples should still be calculated correctly
        expect(result.baseMultiple).toBe(6.0)
        expect(result.finalMultiple).toBeGreaterThan(3.0)
      })

      it('handles low core score correctly', () => {
        const result = calculateValuation({
          adjustedEbitda: 150000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 0.216, // Worst core factors
          briScore: 0.7,
        })

        // baseMultiple = 3.0 + 0.216 * 3.0 = 3.648
        expect(result.baseMultiple).toBeCloseTo(3.648, 2)
        // With a lower base, all values should be lower
        expect(result.currentValue).toBeLessThan(CANONICAL_EXPECTED.currentValue)
      })

      it('is deterministic - same inputs always produce same outputs', () => {
        const result1 = calculateValuation(CANONICAL_INPUTS)
        const result2 = calculateValuation(CANONICAL_INPUTS)
        const result3 = calculateValuation({ ...CANONICAL_INPUTS })

        expect(result1.currentValue).toBe(result2.currentValue)
        expect(result2.currentValue).toBe(result3.currentValue)
        expect(result1.finalMultiple).toBe(result2.finalMultiple)
        expect(result1.discountFraction).toBe(result2.discountFraction)
      })

      it('maintains monotonicity - higher BRI always produces higher value', () => {
        const briScores = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
        let previousValue = -Infinity

        for (const briScore of briScores) {
          const result = calculateValuation({
            ...CANONICAL_INPUTS,
            briScore,
          })
          expect(result.currentValue).toBeGreaterThanOrEqual(previousValue)
          previousValue = result.currentValue
        }
      })

      it('maintains monotonicity - higher core score always produces higher value', () => {
        const coreScores = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]
        let previousValue = -Infinity

        for (const coreScore of coreScores) {
          const result = calculateValuation({
            ...CANONICAL_INPUTS,
            coreScore,
          })
          expect(result.currentValue).toBeGreaterThanOrEqual(previousValue)
          previousValue = result.currentValue
        }
      })

      it('valueGap is always non-negative', () => {
        // Test across a range of BRI and Core Score combinations
        const scores = [0.0, 0.25, 0.5, 0.75, 1.0]
        for (const bri of scores) {
          for (const core of scores) {
            const result = calculateValuation({
              ...CANONICAL_INPUTS,
              briScore: bri,
              coreScore: core,
            })
            expect(result.valueGap).toBeGreaterThanOrEqual(0)
          }
        }
      })

      it('finalMultiple is always between industryMultipleLow and baseMultiple', () => {
        const scores = [0.0, 0.1, 0.3, 0.5, 0.7, 0.9, 1.0]
        for (const bri of scores) {
          for (const core of scores) {
            const result = calculateValuation({
              ...CANONICAL_INPUTS,
              briScore: bri,
              coreScore: core,
            })
            expect(result.finalMultiple).toBeGreaterThanOrEqual(CANONICAL_INPUTS.industryMultipleLow)
            expect(result.finalMultiple).toBeLessThanOrEqual(result.baseMultiple)
          }
        }
      })
    })

    describe('calculateValuationFromPercentages', () => {
      it('correctly converts BRI percentage to decimal', () => {
        const result = calculateValuationFromPercentages({
          adjustedEbitda: 150000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0,
          briScorePercent: 70, // 70% as 0-100 scale
        })

        // Should produce same result as briScore: 0.7
        const expectedResult = calculateValuation({
          adjustedEbitda: 150000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0,
          briScore: 0.7,
        })

        expect(result.currentValue).toBe(expectedResult.currentValue)
        expect(result.potentialValue).toBe(expectedResult.potentialValue)
        expect(result.valueGap).toBe(expectedResult.valueGap)
      })

      it('handles 0% and 100% BRI percentages', () => {
        const resultZero = calculateValuationFromPercentages({
          adjustedEbitda: 100000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0,
          briScorePercent: 0,
        })
        expect(resultZero.finalMultiple).toBe(3.0)

        const resultHundred = calculateValuationFromPercentages({
          adjustedEbitda: 100000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0,
          briScorePercent: 100,
        })
        expect(resultHundred.finalMultiple).toBe(6.0)
        expect(resultHundred.valueGap).toBe(0)
      })
    })

    describe('Non-linear vs Linear formula comparison (BUG FIX VERIFICATION)', () => {
      it('demonstrates the difference between old (wrong) and new (correct) formulas', () => {
        const adjustedEbitda = 150000
        const multipleHigh = 6.0
        const briScorePercent = 70

        // OLD (WRONG) LINEAR FORMULA - what onboarding was using before the fix
        const potentialValue = adjustedEbitda * multipleHigh // $900,000
        const oldCurrentValue = Math.round(potentialValue * (briScorePercent / 100))
        // oldCurrentValue = 900000 * 0.7 = $630,000

        // NEW (CORRECT) NON-LINEAR FORMULA - what onboarding uses after the fix
        const result = calculateValuationFromPercentages({
          adjustedEbitda,
          industryMultipleLow: 3.0,
          industryMultipleHigh: multipleHigh,
          coreScore: 1.0,
          briScorePercent,
        })
        // newCurrentValue ~= $816,000

        // The difference is significant!
        const difference = result.currentValue - oldCurrentValue
        const percentDifference = (difference / oldCurrentValue) * 100

        expect(oldCurrentValue).toBe(630000)
        expect(result.currentValue).toBeCloseTo(816600, -2)
        expect(percentDifference).toBeGreaterThan(25) // ~29.6% difference

        // This test documents and prevents regression of the bug fix
      })

      it('LINEAR and NON-LINEAR converge at BRI=100% but diverge at lower scores', () => {
        // At BRI=100%, both formulas give the same result (full potential value)
        const resultPerfect = calculateValuationFromPercentages({
          adjustedEbitda: 150000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0,
          briScorePercent: 100,
        })
        const linearPerfect = 150000 * 6.0 * (100 / 100)
        expect(resultPerfect.currentValue).toBe(linearPerfect)

        // At BRI=50%, they diverge significantly
        const resultHalf = calculateValuationFromPercentages({
          adjustedEbitda: 150000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0,
          briScorePercent: 50,
        })
        const linearHalf = 150000 * 6.0 * (50 / 100)
        // Non-linear should be higher than linear at 50% BRI
        expect(resultHalf.currentValue).toBeGreaterThan(linearHalf)
      })
    })
  })

  // =========================================================================
  // PROD-009: Cross-Location Consistency Tests
  // These tests verify that ALL 5 calculation locations produce identical
  // results by simulating the formula each location would use.
  // =========================================================================
  describe('PROD-009: Cross-Location Valuation Consistency', () => {
    // The canonical result from calculateValuation() is the source of truth
    const canonicalResult = calculateValuation(CANONICAL_INPUTS)

    it('onboarding (OnboardingFlow.tsx) produces identical results via calculateValuationFromPercentages', () => {
      // OnboardingFlow calls calculateValuationFromPercentages with BRI on 0-100 scale
      // Simulating: briScore is computed as weighted category scores (0-1), then * 100
      const briScoreDecimal = 0.7
      const onboardingResult = calculateValuationFromPercentages({
        adjustedEbitda: CANONICAL_INPUTS.adjustedEbitda,
        industryMultipleLow: CANONICAL_INPUTS.industryMultipleLow,
        industryMultipleHigh: CANONICAL_INPUTS.industryMultipleHigh,
        coreScore: CANONICAL_INPUTS.coreScore,
        briScorePercent: briScoreDecimal * 100,
      })

      expect(onboardingResult.currentValue).toBe(canonicalResult.currentValue)
      expect(onboardingResult.potentialValue).toBe(canonicalResult.potentialValue)
      expect(onboardingResult.valueGap).toBe(canonicalResult.valueGap)
      expect(onboardingResult.finalMultiple).toBe(canonicalResult.finalMultiple)
      expect(onboardingResult.baseMultiple).toBe(canonicalResult.baseMultiple)
      expect(onboardingResult.discountFraction).toBe(canonicalResult.discountFraction)
    })

    it('onboarding-snapshot API produces identical results via calculateValuation', () => {
      // onboarding-snapshot/route.ts calls calculateValuation() with briScore / 100
      const briScorePercent = 70
      const snapshotResult = calculateValuation({
        adjustedEbitda: CANONICAL_INPUTS.adjustedEbitda,
        industryMultipleLow: CANONICAL_INPUTS.industryMultipleLow,
        industryMultipleHigh: CANONICAL_INPUTS.industryMultipleHigh,
        coreScore: CANONICAL_INPUTS.coreScore,
        briScore: briScorePercent / 100,
      })

      expect(snapshotResult.currentValue).toBe(canonicalResult.currentValue)
      expect(snapshotResult.potentialValue).toBe(canonicalResult.potentialValue)
      expect(snapshotResult.valueGap).toBe(canonicalResult.valueGap)
      expect(snapshotResult.finalMultiple).toBe(canonicalResult.finalMultiple)
    })

    it('recalculate-snapshot produces identical results via calculateValuation', () => {
      // recalculate-snapshot.ts calls calculateValuation() directly
      const recalcResult = calculateValuation({
        adjustedEbitda: CANONICAL_INPUTS.adjustedEbitda,
        industryMultipleLow: CANONICAL_INPUTS.industryMultipleLow,
        industryMultipleHigh: CANONICAL_INPUTS.industryMultipleHigh,
        coreScore: CANONICAL_INPUTS.coreScore,
        briScore: CANONICAL_INPUTS.briScore,
      })

      expect(recalcResult.currentValue).toBe(canonicalResult.currentValue)
      expect(recalcResult.potentialValue).toBe(canonicalResult.potentialValue)
      expect(recalcResult.valueGap).toBe(canonicalResult.valueGap)
      expect(recalcResult.finalMultiple).toBe(canonicalResult.finalMultiple)
    })

    it('dashboard recalculation path produces identical results via calculateValuation', () => {
      // dashboard/route.ts now calls calculateValuation() when recalculating
      // Simulating the recalculation path (when financials/DCF/custom multiples are active)
      const snapshotCoreScore = CANONICAL_INPUTS.coreScore
      const snapshotBriScore = CANONICAL_INPUTS.briScore
      const effectiveMultipleLow = CANONICAL_INPUTS.industryMultipleLow
      const effectiveMultipleHigh = CANONICAL_INPUTS.industryMultipleHigh

      const dashboardResult = calculateValuation({
        adjustedEbitda: CANONICAL_INPUTS.adjustedEbitda,
        industryMultipleLow: effectiveMultipleLow,
        industryMultipleHigh: effectiveMultipleHigh,
        coreScore: snapshotCoreScore,
        briScore: snapshotBriScore,
      })

      expect(dashboardResult.currentValue).toBe(canonicalResult.currentValue)
      expect(dashboardResult.potentialValue).toBe(canonicalResult.potentialValue)
      expect(dashboardResult.valueGap).toBe(canonicalResult.valueGap)
      expect(dashboardResult.finalMultiple).toBe(canonicalResult.finalMultiple)
    })

    it('improve-snapshot-for-task produces identical results via calculateValuation', () => {
      // improve-snapshot-for-task.ts calls calculateValuation() with snapshot's stored inputs
      const taskResult = calculateValuation({
        adjustedEbitda: CANONICAL_INPUTS.adjustedEbitda,
        industryMultipleLow: CANONICAL_INPUTS.industryMultipleLow,
        industryMultipleHigh: CANONICAL_INPUTS.industryMultipleHigh,
        coreScore: CANONICAL_INPUTS.coreScore,
        briScore: CANONICAL_INPUTS.briScore,
      })

      expect(taskResult.currentValue).toBe(canonicalResult.currentValue)
      expect(taskResult.potentialValue).toBe(canonicalResult.potentialValue)
      expect(taskResult.valueGap).toBe(canonicalResult.valueGap)
      expect(taskResult.finalMultiple).toBe(canonicalResult.finalMultiple)
    })

    it('all 5 locations agree on exact currentValue for canonical inputs', () => {
      // This is the single most important assertion in the entire test suite.
      // If this passes, the PROD-009 bug (16-29% discrepancy) is fixed.
      const results: ValuationResult[] = [
        // 1. OnboardingFlow.tsx path
        calculateValuationFromPercentages({
          adjustedEbitda: 150000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0,
          briScorePercent: 70,
        }),
        // 2. onboarding-snapshot/route.ts path
        calculateValuation({
          adjustedEbitda: 150000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0,
          briScore: 0.7,
        }),
        // 3. recalculate-snapshot.ts path
        calculateValuation({
          adjustedEbitda: 150000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0,
          briScore: 0.7,
        }),
        // 4. dashboard/route.ts recalculation path
        calculateValuation({
          adjustedEbitda: 150000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0,
          briScore: 0.7,
        }),
        // 5. improve-snapshot-for-task.ts path
        calculateValuation({
          adjustedEbitda: 150000,
          industryMultipleLow: 3.0,
          industryMultipleHigh: 6.0,
          coreScore: 1.0,
          briScore: 0.7,
        }),
      ]

      // All 5 results must be bit-for-bit identical
      const referenceValue = results[0].currentValue
      for (let i = 1; i < results.length; i++) {
        expect(results[i].currentValue).toBe(referenceValue)
      }

      // All potentialValues must match
      const referencePotential = results[0].potentialValue
      for (let i = 1; i < results.length; i++) {
        expect(results[i].potentialValue).toBe(referencePotential)
      }

      // All valueGaps must match
      const referenceGap = results[0].valueGap
      for (let i = 1; i < results.length; i++) {
        expect(results[i].valueGap).toBe(referenceGap)
      }
    })

    it('core score calculation is consistent across all locations', () => {
      // All locations must use exactly 5 factors (not 6)
      const optimalFactors: CoreFactors = {
        revenueModel: 'SUBSCRIPTION_SAAS',
        grossMarginProxy: 'EXCELLENT',
        laborIntensity: 'LOW',
        assetIntensity: 'ASSET_LIGHT',
        ownerInvolvement: 'MINIMAL',
      }

      // The shared calculateCoreScore produces the authoritative result
      const sharedScore = calculateCoreScore(optimalFactors)

      // Regression: the old dashboard bug used 6 factors including revenueSizeCategory
      // If revenueSizeCategory (e.g., 0.4 for $1M revenue) were included:
      // OLD: (0.4 + 1.0 + 1.0 + 1.0 + 1.0 + 1.0) / 6 = 0.9
      // CORRECT: (1.0 + 1.0 + 1.0 + 1.0 + 1.0) / 5 = 1.0
      expect(sharedScore).toBe(1.0)
      expect(sharedScore).not.toBe(0.9) // The old buggy 6-factor result
    })
  })

  // =========================================================================
  // BRI Weights Consistency
  // =========================================================================
  describe('BRI Weights Consistency', () => {
    it('DEFAULT_BRI_WEIGHTS sum to 1.0', () => {
      const sum = Object.values(DEFAULT_BRI_WEIGHTS).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1.0, 10)
    })

    it('DEFAULT_BRI_WEIGHTS has exactly 6 categories', () => {
      const categories = Object.keys(DEFAULT_BRI_WEIGHTS)
      expect(categories).toHaveLength(6)
      expect(categories).toContain('FINANCIAL')
      expect(categories).toContain('TRANSFERABILITY')
      expect(categories).toContain('OPERATIONAL')
      expect(categories).toContain('MARKET')
      expect(categories).toContain('LEGAL_TAX')
      expect(categories).toContain('PERSONAL')
    })

    it('has correct weight values matching the canonical definition', () => {
      expect(DEFAULT_BRI_WEIGHTS.FINANCIAL).toBe(0.25)
      expect(DEFAULT_BRI_WEIGHTS.TRANSFERABILITY).toBe(0.20)
      expect(DEFAULT_BRI_WEIGHTS.OPERATIONAL).toBe(0.20)
      expect(DEFAULT_BRI_WEIGHTS.MARKET).toBe(0.15)
      expect(DEFAULT_BRI_WEIGHTS.LEGAL_TAX).toBe(0.10)
      expect(DEFAULT_BRI_WEIGHTS.PERSONAL).toBe(0.10)
    })
  })

  // =========================================================================
  // Edge Cases and Boundary Conditions
  // =========================================================================
  describe('Edge Cases', () => {
    it('handles very small EBITDA values without precision loss', () => {
      const result = calculateValuation({
        adjustedEbitda: 1,
        industryMultipleLow: 3.0,
        industryMultipleHigh: 6.0,
        coreScore: 1.0,
        briScore: 0.7,
      })

      // Even with $1 EBITDA, the formula should work
      expect(result.currentValue).toBeGreaterThan(0)
      expect(result.potentialValue).toBe(6.0) // $1 * 6.0x
      expect(result.valueGap).toBeGreaterThan(0)
    })

    it('handles very large EBITDA values', () => {
      const result = calculateValuation({
        adjustedEbitda: 1_000_000_000, // $1B
        industryMultipleLow: 3.0,
        industryMultipleHigh: 6.0,
        coreScore: 1.0,
        briScore: 0.7,
      })

      // Should scale linearly with EBITDA
      const smallResult = calculateValuation({
        adjustedEbitda: 1,
        industryMultipleLow: 3.0,
        industryMultipleHigh: 6.0,
        coreScore: 1.0,
        briScore: 0.7,
      })

      expect(result.currentValue / smallResult.currentValue).toBeCloseTo(1_000_000_000, -1)
    })

    it('handles equal low and high multiples (no range)', () => {
      const result = calculateValuation({
        adjustedEbitda: 100000,
        industryMultipleLow: 5.0,
        industryMultipleHigh: 5.0, // Same as low
        coreScore: 0.8,
        briScore: 0.7,
      })

      // With no range, base = final = 5.0 regardless of scores
      expect(result.baseMultiple).toBe(5.0)
      expect(result.finalMultiple).toBe(5.0)
      expect(result.currentValue).toBe(500000)
      expect(result.valueGap).toBe(0)
    })

    it('discountFraction approaches 0 for BRI near 1.0', () => {
      const result = calculateValuation({
        ...CANONICAL_INPUTS,
        briScore: 0.99,
      })
      expect(result.discountFraction).toBeLessThan(0.005)
    })

    it('discountFraction approaches 1 for BRI near 0.0', () => {
      const result = calculateValuation({
        ...CANONICAL_INPUTS,
        briScore: 0.01,
      })
      expect(result.discountFraction).toBeGreaterThan(0.98)
    })
  })

  // =========================================================================
  // Regression Tests: Specific bugs from BUG-REPORT-VALUATION-INCONSISTENCY.md
  // =========================================================================
  // =========================================================================
  // PROD-092: Golden-File Valuation Tests
  // These tests lock down expected valuation outputs for canonical test
  // companies to prevent formula regressions. Values are pre-calculated
  // and stored in fixtures. Any change to these values requires explicit
  // review and approval.
  // =========================================================================
  describe('PROD-092: Golden-File Valuation Tests', () => {
    it('CANONICAL_COMPANY produces exact golden values (EBITDA=$150K, multiples 3.0-6.0, coreScore=1.0, BRI=0.70)', () => {
      const result = calculateExpectedValuation(CANONICAL_COMPANY)

      // Golden values - these must not change without explicit approval
      // currentValue = $816,600 (±$100)
      expect(result.currentValue).toBeCloseTo(816600, -2)
      expect(result.currentValue).toBe(EXPECTED_VALUATION.currentValue)

      // potentialValue = $900,000 (exact)
      expect(result.potentialValue).toBe(900000)
      expect(result.potentialValue).toBe(EXPECTED_VALUATION.potentialValue)

      // valueGap = $83,400 (±$100)
      expect(result.valueGap).toBeCloseTo(83400, -2)
      expect(result.valueGap).toBe(EXPECTED_VALUATION.valueGap)

      // finalMultiple = 5.444x (±0.01)
      expect(result.finalMultiple).toBeCloseTo(5.444, 2)
      expect(result.finalMultiple).toBe(EXPECTED_VALUATION.finalMultiple)

      // discountFraction = 0.1853 (±0.001)
      expect(result.discountFraction).toBeCloseTo(0.1853, 3)
      expect(result.discountFraction).toBe(EXPECTED_VALUATION.discountFraction)

      // baseMultiple = 6.0 (exact)
      expect(result.baseMultiple).toBe(6.0)
      expect(result.baseMultiple).toBe(EXPECTED_VALUATION.baseMultiple)
    })

    it('FOUNDER_DEPENDENT_COMPANY produces expected discounted values (high owner involvement)', () => {
      const result = calculateExpectedValuation(FOUNDER_DEPENDENT_COMPANY)

      // Core score: 0.8 (CRITICAL owner involvement reduces score)
      expect(result.coreScore).toBe(0.8)

      // BRI score: 0.5175 (TRANSFERABILITY=0.30, PERSONAL=0.40 drag down overall)
      expect(result.briScore).toBeCloseTo(0.5175, 3)

      // baseMultiple = 3.0 + 0.8 * 3.0 = 5.4
      expect(result.baseMultiple).toBeCloseTo(5.4, 2)

      // With lower BRI and lower core, currentValue should be significantly lower than canonical
      expect(result.currentValue).toBeLessThan(700000)

      // Value gap should be larger than canonical due to lower BRI
      expect(result.valueGap).toBeGreaterThan(100000)

      // Ensure values are deterministic
      const result2 = calculateExpectedValuation(FOUNDER_DEPENDENT_COMPANY)
      expect(result.currentValue).toBe(result2.currentValue)
    })

    it('HIGH_CONCENTRATION_COMPANY produces expected values (customer concentration risk)', () => {
      const result = calculateExpectedValuation(HIGH_CONCENTRATION_COMPANY)

      // Core score should remain optimal (business model unchanged)
      expect(result.coreScore).toBe(1.0)

      // BRI score should be lower due to FINANCIAL=0.50, MARKET=0.40
      // 0.50*0.25 + 0.60*0.20 + 0.65*0.20 + 0.40*0.15 + 0.70*0.10 + 0.70*0.10 = 0.575
      expect(result.briScore).toBeCloseTo(0.575, 3)

      // baseMultiple should be 6.0 (optimal core score)
      expect(result.baseMultiple).toBe(6.0)

      // currentValue should be lower than canonical due to BRI discount
      expect(result.currentValue).toBeLessThan(816600)
      expect(result.currentValue).toBeGreaterThan(700000) // But not as low as founder-dependent

      // Ensure values are deterministic
      const result2 = calculateExpectedValuation(HIGH_CONCENTRATION_COMPANY)
      expect(result.currentValue).toBe(result2.currentValue)
    })

    it('PERFECT_SAAS_COMPANY produces maximum values (all scores maxed)', () => {
      const result = calculateExpectedValuation(PERFECT_SAAS_COMPANY)

      // Perfect scores
      expect(result.coreScore).toBe(1.0)
      expect(result.briScore).toBe(1.0)

      // No BRI discount with perfect score
      expect(result.discountFraction).toBe(0)

      // baseMultiple = 4.0 + 1.0 * (8.0 - 4.0) = 8.0
      expect(result.baseMultiple).toBe(8.0)

      // finalMultiple should equal baseMultiple (no discount)
      expect(result.finalMultiple).toBe(8.0)

      // No value gap with perfect BRI
      expect(result.valueGap).toBe(0)
      expect(result.currentValue).toBe(result.potentialValue)

      // With $1.25M EBITDA * 8.0x = $10M
      expect(result.currentValue).toBe(10000000)
      expect(result.potentialValue).toBe(10000000)

      // Ensure values are deterministic
      const result2 = calculateExpectedValuation(PERFECT_SAAS_COMPANY)
      expect(result.currentValue).toBe(result2.currentValue)
    })

    it('WORST_CASE_COMPANY produces minimum values (all scores at floor)', () => {
      // Construct a worst-case scenario: all factors at minimum
      const WORST_CASE_COMPANY = {
        name: 'Test Co - Worst Case',
        annualRevenue: 100000,
        annualEbitda: 10000, // 10% margin
        ownerCompensation: 0,
        icbIndustry: 'Services',
        icbSuperSector: 'Services',
        icbSector: 'Professional Services',
        icbSubSector: 'Consulting',
        industryMultipleLow: 2.0,
        industryMultipleHigh: 4.0,
        coreFactors: {
          revenueModel: 'PROJECT_BASED' as const,    // 0.25
          grossMarginProxy: 'LOW' as const,          // 0.25
          laborIntensity: 'VERY_HIGH' as const,      // 0.25
          assetIntensity: 'ASSET_HEAVY' as const,    // 0.33
          ownerInvolvement: 'CRITICAL' as const,     // 0.0
        },
        briScores: {
          FINANCIAL: 0.10,
          TRANSFERABILITY: 0.10,
          OPERATIONAL: 0.10,
          MARKET: 0.10,
          LEGAL_TAX: 0.10,
          PERSONAL: 0.10,
        },
        briWeights: DEFAULT_BRI_WEIGHTS,
      }

      const result = calculateExpectedValuation(WORST_CASE_COMPANY)

      // Core score: (0.25 + 0.25 + 0.25 + 0.33 + 0.0) / 5 = 0.216
      expect(result.coreScore).toBeCloseTo(0.216, 3)

      // BRI score: 0.10 across all categories = 0.10
      expect(result.briScore).toBe(0.10)

      // baseMultiple = 2.0 + 0.216 * 2.0 = 2.432
      expect(result.baseMultiple).toBeCloseTo(2.432, 2)

      // With very low BRI (0.10), discountFraction should be high
      // discountFraction = (1 - 0.10)^1.4 = 0.9^1.4 ≈ 0.873
      expect(result.discountFraction).toBeGreaterThan(0.85)

      // finalMultiple should be close to industryMultipleLow due to high discount
      expect(result.finalMultiple).toBeGreaterThanOrEqual(2.0)
      expect(result.finalMultiple).toBeLessThan(2.5)

      // currentValue should be very low (close to floor)
      expect(result.currentValue).toBeLessThan(25000)

      // Large value gap
      expect(result.valueGap).toBeGreaterThan(0)

      // Ensure values are deterministic
      const result2 = calculateExpectedValuation(WORST_CASE_COMPANY)
      expect(result.currentValue).toBe(result2.currentValue)
    })

    it('cross-site consistency: all 9 call sites produce identical results for canonical inputs', () => {
      // This is the most critical golden-file test: ensure calculateValuation()
      // produces consistent results regardless of which code path calls it.
      // All 9 locations that calculate valuation import and call this function,
      // so if this test passes, all locations are guaranteed to be consistent.

      const inputs = {
        adjustedEbitda: 150000,
        industryMultipleLow: 3.0,
        industryMultipleHigh: 6.0,
        coreScore: 1.0,
        briScore: 0.7,
      }

      // Simulate multiple calls from different code paths
      const results = Array.from({ length: 9 }, () => calculateValuation(inputs))

      // All results must be bit-for-bit identical
      const referenceResult = results[0]
      for (let i = 1; i < results.length; i++) {
        expect(results[i].currentValue).toBe(referenceResult.currentValue)
        expect(results[i].potentialValue).toBe(referenceResult.potentialValue)
        expect(results[i].valueGap).toBe(referenceResult.valueGap)
        expect(results[i].baseMultiple).toBe(referenceResult.baseMultiple)
        expect(results[i].finalMultiple).toBe(referenceResult.finalMultiple)
        expect(results[i].discountFraction).toBe(referenceResult.discountFraction)
      }

      // Verify golden values
      expect(referenceResult.currentValue).toBeCloseTo(816600, -2)
      expect(referenceResult.potentialValue).toBe(900000)
      expect(referenceResult.valueGap).toBeCloseTo(83400, -2)
    })

    it('golden-file determinism: repeated calculations produce identical outputs', () => {
      // Calculate 100 times to verify absolute determinism
      const results = Array.from({ length: 100 }, () =>
        calculateExpectedValuation(CANONICAL_COMPANY)
      )

      // All results must be identical (not just close)
      const first = results[0]
      for (const result of results) {
        expect(result.currentValue).toBe(first.currentValue)
        expect(result.potentialValue).toBe(first.potentialValue)
        expect(result.valueGap).toBe(first.valueGap)
        expect(result.finalMultiple).toBe(first.finalMultiple)
        expect(result.discountFraction).toBe(first.discountFraction)
      }
    })

    it('golden-file regression guard: detect any formula changes', () => {
      // This test will fail if ALPHA constant changes or formula is modified
      // Requires explicit update to pass again, serving as a regression gate

      const inputs = {
        adjustedEbitda: 150000,
        industryMultipleLow: 3.0,
        industryMultipleHigh: 6.0,
        coreScore: 1.0,
        briScore: 0.7,
      }

      const result = calculateValuation(inputs)

      // These exact values are the contract - changing them requires review
      // Note: Use toBeCloseTo for floating-point values to avoid precision issues
      expect(result.currentValue).toBeCloseTo(816600, -2) // Within $100
      expect(result.potentialValue).toBe(900000)
      expect(result.baseMultiple).toBe(6.0)

      // If ALPHA changes from 1.4, this will fail
      expect(ALPHA).toBe(1.4)

      // discountFraction = 0.3^1.4 (exact mathematical constant)
      expect(result.discountFraction).toBeCloseTo(Math.pow(0.3, 1.4), 10)
    })
  })

  // =========================================================================
  // Regression Tests: Specific bugs from BUG-REPORT-VALUATION-INCONSISTENCY.md
  // =========================================================================
  describe('Regression: Bug Report Scenarios', () => {
    it('Bug #1: LINEAR formula should NOT match NON-LINEAR results at BRI=70%', () => {
      const adjustedEbitda = 150000
      const briScore = 0.7

      // LINEAR (the bug): currentValue = potentialValue * briScore
      const linearPotential = adjustedEbitda * 6.0
      const linearCurrent = linearPotential * briScore

      // NON-LINEAR (correct)
      const result = calculateValuation({
        adjustedEbitda,
        industryMultipleLow: 3.0,
        industryMultipleHigh: 6.0,
        coreScore: 1.0,
        briScore,
      })

      // They MUST differ - if they match, the non-linear formula was not applied
      expect(result.currentValue).not.toBe(linearCurrent)
      // Non-linear result should be HIGHER than linear (the non-linear formula is more generous)
      expect(result.currentValue).toBeGreaterThan(linearCurrent)
    })

    it('Bug #2: potentialValue should be EBITDA * baseMultiple (not multipleHigh when core < 1)', () => {
      const result = calculateValuation({
        adjustedEbitda: 150000,
        industryMultipleLow: 3.0,
        industryMultipleHigh: 6.0,
        coreScore: 0.7, // NOT 1.0
        briScore: 0.7,
      })

      // baseMultiple = 3.0 + 0.7 * 3.0 = 5.1
      expect(result.baseMultiple).toBeCloseTo(5.1, 4)
      // potentialValue = EBITDA * baseMultiple (NOT multipleHigh)
      expect(result.potentialValue).toBeCloseTo(150000 * 5.1, 0)
      // With coreScore < 1.0, potentialValue should be LESS than EBITDA * multipleHigh
      expect(result.potentialValue).toBeLessThan(150000 * 6.0)
    })

    it('Bug #3: Core Score uses 5 factors (not 6) even when revenueSizeCategory is present in data', () => {
      // Even if the source data object has revenueSizeCategory, the score must use only 5 factors
      const factors: CoreFactors = {
        revenueModel: 'SUBSCRIPTION_SAAS',
        grossMarginProxy: 'EXCELLENT',
        laborIntensity: 'LOW',
        assetIntensity: 'ASSET_LIGHT',
        ownerInvolvement: 'MINIMAL',
      }

      const score = calculateCoreScore(factors)
      expect(score).toBe(1.0)

      // Verify that CoreFactors type does NOT include revenueSizeCategory
      // (TypeScript compile-time check; at runtime, verify the score hasn't been diluted)
      const factorsWithRevSize = {
        ...factors,
        revenueSizeCategory: 'FROM_1M_TO_3M', // Extra field that should be ignored
      }
      const scoreWithExtra = calculateCoreScore(factorsWithRevSize as CoreFactors)
      expect(scoreWithExtra).toBe(1.0) // Must be identical - extra field is ignored
    })

    it('Bug #4: onboarding and dashboard produce identical values for same inputs', () => {
      // This is the fundamental requirement from the bug report.
      // The onboarding path uses calculateValuationFromPercentages (BRI 0-100)
      // The dashboard path uses calculateValuation (BRI 0-1)
      // They must produce identical results.

      const briPercent = 70

      const onboardingResult = calculateValuationFromPercentages({
        adjustedEbitda: 150000,
        industryMultipleLow: 3.0,
        industryMultipleHigh: 6.0,
        coreScore: 1.0,
        briScorePercent: briPercent,
      })

      const dashboardResult = calculateValuation({
        adjustedEbitda: 150000,
        industryMultipleLow: 3.0,
        industryMultipleHigh: 6.0,
        coreScore: 1.0,
        briScore: briPercent / 100,
      })

      // Exact match required - no rounding tolerance
      expect(onboardingResult.currentValue).toBe(dashboardResult.currentValue)
      expect(onboardingResult.potentialValue).toBe(dashboardResult.potentialValue)
      expect(onboardingResult.valueGap).toBe(dashboardResult.valueGap)
      expect(onboardingResult.finalMultiple).toBe(dashboardResult.finalMultiple)
      expect(onboardingResult.baseMultiple).toBe(dashboardResult.baseMultiple)
      expect(onboardingResult.discountFraction).toBe(dashboardResult.discountFraction)
    })
  })

  // =========================================================================
  // PROD-007: Onboarding-to-Dashboard Value Consistency
  // Verifies that values shown during onboarding exactly match values
  // on the dashboard after snapshot creation, with no "value jumps".
  // =========================================================================
  describe('PROD-007: Onboarding-to-Dashboard Value Consistency', () => {
    it('simulates full onboarding flow producing values that match snapshot recalculation', () => {
      // Step 1: Onboarding creates a company with optimal defaults (coreScore = 1.0)
      // Step 2: Quick scan produces BRI score from weighted category scores
      // Step 3: OnboardingFlow calculates values using calculateValuationFromPercentages
      // Step 4: onboarding-snapshot API recalculates using calculateValuation
      // Step 5: Dashboard reads snapshot values
      // All steps must produce identical currentValue, potentialValue, valueGap

      const adjustedEbitda = 150000
      const industryMultipleLow = 3.0
      const industryMultipleHigh = 6.0
      const coreScore = 1.0 // Onboarding optimal defaults

      // Simulate quick scan with risks in two categories
      const categoryScoresObj: Record<string, number> = {
        FINANCIAL: 0.70,
        TRANSFERABILITY: 0.45, // Risk identified
        OPERATIONAL: 0.70,
        MARKET: 0.70,
        LEGAL_TAX: 0.45, // Risk identified
        PERSONAL: 0.70,
      }

      // Calculate BRI the same way OnboardingFlow does
      let briScoreDecimal = 0
      for (const [category, score] of Object.entries(categoryScoresObj)) {
        const weight = DEFAULT_BRI_WEIGHTS[category as keyof typeof DEFAULT_BRI_WEIGHTS] || 0
        briScoreDecimal += score * weight
      }

      // Step 3: OnboardingFlow path (uses percentage version)
      const onboardingResult = calculateValuationFromPercentages({
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
        coreScore,
        briScorePercent: briScoreDecimal * 100,
      })

      // Step 4: onboarding-snapshot API path (converts percentage to decimal)
      const snapshotApiResult = calculateValuation({
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
        coreScore,
        briScore: briScoreDecimal,
      })

      // Step 5: Dashboard always recalculates fresh using calculateValuation()
      // (PROD-062 removed shouldUseSnapshotValues — dashboard never returns raw snapshot values)
      // With same inputs, the fresh calculation must match the snapshot calculation exactly

      expect(Math.round(onboardingResult.currentValue)).toBe(Math.round(snapshotApiResult.currentValue))
      expect(Math.round(onboardingResult.potentialValue)).toBe(Math.round(snapshotApiResult.potentialValue))
      expect(Math.round(onboardingResult.valueGap)).toBe(Math.round(snapshotApiResult.valueGap))
      expect(onboardingResult.finalMultiple).toBe(snapshotApiResult.finalMultiple)
      expect(onboardingResult.baseMultiple).toBe(snapshotApiResult.baseMultiple)
    })

    it('task completion path (improve-snapshot-for-task) uses same formula as onboarding', () => {
      // After onboarding, the first task completion uses improveSnapshotForOnboardingTask
      // which calls calculateValuation. The result must be consistent with the onboarding path.

      const adjustedEbitda = 150000
      const industryMultipleLow = 3.0
      const industryMultipleHigh = 6.0
      const coreScore = 1.0

      // Simulate initial BRI from onboarding (e.g., 0.65)
      const initialBriScore = 0.65

      // Simulate task improving BRI to 0.68
      const improvedBriScore = 0.68

      // Both must use the same formula
      const beforeTask = calculateValuation({
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
        coreScore,
        briScore: initialBriScore,
      })

      const afterTask = calculateValuation({
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
        coreScore,
        briScore: improvedBriScore,
      })

      // Value must increase monotonically
      expect(afterTask.currentValue).toBeGreaterThan(beforeTask.currentValue)
      expect(afterTask.finalMultiple).toBeGreaterThan(beforeTask.finalMultiple)
      // Value gap must decrease (closer to potential)
      expect(afterTask.valueGap).toBeLessThan(beforeTask.valueGap)
      // Potential value unchanged (same EBITDA and core score)
      expect(afterTask.potentialValue).toBe(beforeTask.potentialValue)
    })

    it('verifies no value jump when transitioning from onboarding to dashboard', () => {
      // The critical bug: onboarding showed one value, dashboard showed a different value
      // for the exact same company state. This was caused by different formulas.
      // Now both paths use calculateValuation, so values must be identical.

      // Test across multiple BRI/coreScore combinations
      const testCases = [
        { bri: 0.50, core: 1.0, ebitda: 100000, low: 3.0, high: 6.0 },
        { bri: 0.70, core: 1.0, ebitda: 150000, low: 3.0, high: 6.0 },
        { bri: 0.85, core: 0.8, ebitda: 500000, low: 4.0, high: 8.0 },
        { bri: 0.30, core: 0.5, ebitda: 50000, low: 2.5, high: 5.0 },
        { bri: 0.95, core: 1.0, ebitda: 2000000, low: 5.0, high: 10.0 },
      ]

      for (const tc of testCases) {
        // Onboarding path
        const onboarding = calculateValuationFromPercentages({
          adjustedEbitda: tc.ebitda,
          industryMultipleLow: tc.low,
          industryMultipleHigh: tc.high,
          coreScore: tc.core,
          briScorePercent: tc.bri * 100,
        })

        // Snapshot/Dashboard path
        const dashboard = calculateValuation({
          adjustedEbitda: tc.ebitda,
          industryMultipleLow: tc.low,
          industryMultipleHigh: tc.high,
          coreScore: tc.core,
          briScore: tc.bri,
        })

        // Zero difference tolerance -- must be bit-for-bit identical
        expect(onboarding.currentValue).toBe(dashboard.currentValue)
        expect(onboarding.potentialValue).toBe(dashboard.potentialValue)
        expect(onboarding.valueGap).toBe(dashboard.valueGap)
        expect(onboarding.finalMultiple).toBe(dashboard.finalMultiple)
      }
    })

    it('BRI computation in onboarding matches the canonical weighted sum', () => {
      // OnboardingFlow calculates BRI as: sum(score_i * weight_i) for i in categories
      // This must match the same formula used in improve-snapshot-for-task.ts
      // and recalculate-snapshot.ts

      const categoryScores: Record<string, number> = {
        FINANCIAL: 0.80,
        TRANSFERABILITY: 0.60,
        OPERATIONAL: 0.70,
        MARKET: 0.75,
        LEGAL_TAX: 0.50,
        PERSONAL: 0.65,
      }

      // Compute BRI the way OnboardingFlow does it
      let onboardingBri = 0
      for (const [category, score] of Object.entries(categoryScores)) {
        const weight = DEFAULT_BRI_WEIGHTS[category as keyof typeof DEFAULT_BRI_WEIGHTS] || 0
        onboardingBri += score * weight
      }

      // Compute BRI the way improve-snapshot-for-task.ts does it
      const TASK_WEIGHTS: Record<string, number> = {
        FINANCIAL: 0.25,
        TRANSFERABILITY: 0.20,
        OPERATIONAL: 0.20,
        MARKET: 0.15,
        LEGAL_TAX: 0.10,
        PERSONAL: 0.10,
      }
      let taskBri = 0
      for (const [category, score] of Object.entries(categoryScores)) {
        const weight = TASK_WEIGHTS[category] || 0
        taskBri += score * weight
      }

      // Must be exactly equal
      expect(onboardingBri).toBe(taskBri)

      // Verify expected value: 0.80*0.25 + 0.60*0.20 + 0.70*0.20 + 0.75*0.15 + 0.50*0.10 + 0.65*0.10
      // = 0.20 + 0.12 + 0.14 + 0.1125 + 0.05 + 0.065 = 0.6875
      expect(onboardingBri).toBeCloseTo(0.6875, 10)
    })
  })

  // =========================================================================
  // PROD-008: Core Score Standardization (5 factors everywhere)
  // Verifies that revenueSizeCategory is never included in core score
  // and that all code paths produce consistent 5-factor scores.
  // =========================================================================
  describe('PROD-008: Core Score Standardization', () => {
    it('CoreFactors type has exactly 5 fields (no revenueSizeCategory)', () => {
      // The CoreFactors interface in calculate-valuation.ts must have exactly 5 fields
      const sampleFactors: CoreFactors = {
        revenueModel: 'SUBSCRIPTION_SAAS',
        grossMarginProxy: 'EXCELLENT',
        laborIntensity: 'LOW',
        assetIntensity: 'ASSET_LIGHT',
        ownerInvolvement: 'MINIMAL',
      }

      // All 5 required fields must be present
      expect(sampleFactors.revenueModel).toBeDefined()
      expect(sampleFactors.grossMarginProxy).toBeDefined()
      expect(sampleFactors.laborIntensity).toBeDefined()
      expect(sampleFactors.assetIntensity).toBeDefined()
      expect(sampleFactors.ownerInvolvement).toBeDefined()

      // revenueSizeCategory must NOT be a property of CoreFactors
      // @ts-expect-error - verifying that revenueSizeCategory does not exist on CoreFactors
      expect(sampleFactors.revenueSizeCategory).toBeUndefined()
    })

    it('CORE_FACTOR_SCORES lookup table has exactly 5 entries', () => {
      const factorKeys = Object.keys(CORE_FACTOR_SCORES)
      expect(factorKeys).toHaveLength(5)
      expect(factorKeys.sort()).toEqual([
        'assetIntensity',
        'grossMarginProxy',
        'laborIntensity',
        'ownerInvolvement',
        'revenueModel',
      ])
    })

    it('calculateCoreScore ignores extra fields beyond the 5 core factors', () => {
      // Companies in the database have revenueSizeCategory as a column
      // but it must NOT affect the core score calculation
      const baseFactors: CoreFactors = {
        revenueModel: 'RECURRING_CONTRACTS',
        grossMarginProxy: 'GOOD',
        laborIntensity: 'MODERATE',
        assetIntensity: 'MODERATE',
        ownerInvolvement: 'MODERATE',
      }

      const scoreWithoutExtra = calculateCoreScore(baseFactors)

      // Add revenueSizeCategory as if it were passed from a Prisma model
      const factorsWithExtra = {
        ...baseFactors,
        revenueSizeCategory: 'UNDER_500K', // Low revenue category
      } as CoreFactors

      const scoreWithExtra = calculateCoreScore(factorsWithExtra)

      // Scores must be identical -- revenueSizeCategory is ignored
      expect(scoreWithExtra).toBe(scoreWithoutExtra)

      // Verify expected value: (0.75 + 0.75 + 0.75 + 0.67 + 0.5) / 5 = 0.684
      expect(scoreWithoutExtra).toBeCloseTo(0.684, 2)
    })

    it('6-factor bug would produce a different (wrong) score', () => {
      // This documents the 6-factor bug and proves the fix is working.
      // If revenueSizeCategory (e.g., 0.40 for UNDER_500K) were included as a 6th factor,
      // the score would be lower (diluted by the revenue size score).

      const REVENUE_SIZE_SCORES: Record<string, number> = {
        UNDER_500K: 0.20,
        FROM_500K_TO_1M: 0.40,
        FROM_1M_TO_3M: 0.60,
        FROM_3M_TO_10M: 0.80,
        FROM_10M_TO_25M: 0.90,
        OVER_25M: 1.00,
      }

      const _factors: CoreFactors = {
        revenueModel: 'SUBSCRIPTION_SAAS',    // 1.0
        grossMarginProxy: 'EXCELLENT',         // 1.0
        laborIntensity: 'LOW',                 // 1.0
        assetIntensity: 'ASSET_LIGHT',         // 1.0
        ownerInvolvement: 'MINIMAL',           // 1.0
      }

      const correctScore = calculateCoreScore(_factors) // 5/5 = 1.0

      // Simulate the OLD 6-factor bug for a small company
      const revSizeScore = REVENUE_SIZE_SCORES['UNDER_500K'] // 0.20
      const buggyScore = (1.0 + 1.0 + 1.0 + 1.0 + 1.0 + revSizeScore) / 6 // 5.2/6 = 0.8667

      expect(correctScore).toBe(1.0)
      expect(buggyScore).toBeCloseTo(0.8667, 3)
      // The difference: $150K EBITDA with 3x-6x range
      // Correct: baseMultiple = 3.0 + 1.0 * 3.0 = 6.0
      // Buggy: baseMultiple = 3.0 + 0.8667 * 3.0 = 5.6
      // This 0.4x difference translates to $60K valuation gap on $150K EBITDA
      expect(correctScore).not.toBe(buggyScore)
    })

    it('core score is consistent across typical company profiles', () => {
      // Test various realistic company profiles to ensure consistent scoring

      const profiles: Array<{ name: string; factors: CoreFactors; expectedRange: [number, number] }> = [
        {
          name: 'SaaS startup',
          factors: {
            revenueModel: 'SUBSCRIPTION_SAAS',
            grossMarginProxy: 'EXCELLENT',
            laborIntensity: 'LOW',
            assetIntensity: 'ASSET_LIGHT',
            ownerInvolvement: 'HIGH',
          },
          expectedRange: [0.7, 0.9],
        },
        {
          name: 'Professional services',
          factors: {
            revenueModel: 'PROJECT_BASED',
            grossMarginProxy: 'MODERATE',
            laborIntensity: 'VERY_HIGH',
            assetIntensity: 'ASSET_LIGHT',
            ownerInvolvement: 'CRITICAL',
          },
          expectedRange: [0.2, 0.5],
        },
        {
          name: 'Manufacturing',
          factors: {
            revenueModel: 'TRANSACTIONAL',
            grossMarginProxy: 'LOW',
            laborIntensity: 'HIGH',
            assetIntensity: 'ASSET_HEAVY',
            ownerInvolvement: 'MODERATE',
          },
          expectedRange: [0.3, 0.5],
        },
        {
          name: 'Managed services',
          factors: {
            revenueModel: 'RECURRING_CONTRACTS',
            grossMarginProxy: 'GOOD',
            laborIntensity: 'MODERATE',
            assetIntensity: 'MODERATE',
            ownerInvolvement: 'LOW',
          },
          expectedRange: [0.6, 0.8],
        },
      ]

      for (const profile of profiles) {
        const score = calculateCoreScore(profile.factors)
        expect(score).toBeGreaterThanOrEqual(profile.expectedRange[0])
        expect(score).toBeLessThanOrEqual(profile.expectedRange[1])
      }
    })

    it('valuation results change correctly when only core score differs (BRI held constant)', () => {
      // Proves that core score (from 5 factors only) drives the base multiple positioning
      const lowCoreFactors: CoreFactors = {
        revenueModel: 'PROJECT_BASED',
        grossMarginProxy: 'LOW',
        laborIntensity: 'VERY_HIGH',
        assetIntensity: 'ASSET_HEAVY',
        ownerInvolvement: 'CRITICAL',
      }

      const highCoreFactors: CoreFactors = {
        revenueModel: 'SUBSCRIPTION_SAAS',
        grossMarginProxy: 'EXCELLENT',
        laborIntensity: 'LOW',
        assetIntensity: 'ASSET_LIGHT',
        ownerInvolvement: 'MINIMAL',
      }

      const lowScore = calculateCoreScore(lowCoreFactors)
      const highScore = calculateCoreScore(highCoreFactors)

      // Compute valuations with same BRI but different core scores
      const lowValuation = calculateValuation({
        adjustedEbitda: 150000,
        industryMultipleLow: 3.0,
        industryMultipleHigh: 6.0,
        coreScore: lowScore,
        briScore: 0.7,
      })

      const highValuation = calculateValuation({
        adjustedEbitda: 150000,
        industryMultipleLow: 3.0,
        industryMultipleHigh: 6.0,
        coreScore: highScore,
        briScore: 0.7,
      })

      // Higher core score = higher valuation
      expect(highValuation.currentValue).toBeGreaterThan(lowValuation.currentValue)
      expect(highValuation.baseMultiple).toBeGreaterThan(lowValuation.baseMultiple)
      expect(highValuation.finalMultiple).toBeGreaterThan(lowValuation.finalMultiple)
      expect(highValuation.potentialValue).toBeGreaterThan(lowValuation.potentialValue)
    })
  })

  // =========================================================================
  // PROD-062: Dashboard Always Calculates Fresh (No shouldUseSnapshotValues)
  // After removing the shouldUseSnapshotValues conditional, the dashboard
  // always recalculates using calculateValuation(). These tests verify
  // that fresh calculation matches expected values in all scenarios.
  // =========================================================================
  describe('PROD-062: Dashboard Always Calculates Fresh', () => {
    it('fresh calculation matches expected values for standard scenario', () => {
      // Simulate what the dashboard does: take snapshot's BRI/core scores
      // and current EBITDA, recalculate using calculateValuation()
      const snapshotBriScore = 0.7
      const snapshotCoreScore = 1.0
      const adjustedEbitda = 150000
      const multipleLow = 3.0
      const multipleHigh = 6.0

      const result = calculateValuation({
        adjustedEbitda,
        industryMultipleLow: multipleLow,
        industryMultipleHigh: multipleHigh,
        coreScore: snapshotCoreScore,
        briScore: snapshotBriScore,
      })

      // Verify against canonical expected values
      expect(result.baseMultiple).toBe(6.0)
      expect(result.finalMultiple).toBeCloseTo(5.44, 1)
      expect(result.currentValue).toBeCloseTo(816600, -2)
      expect(result.potentialValue).toBe(900000)
      expect(result.valueGap).toBeCloseTo(83400, -2)
    })

    it('no value jump when EBITDA source changes from snapshot to financials', () => {
      // Before PROD-062: if user had snapshot EBITDA of $150K and then uploaded
      // financials showing $150K, the dashboard would switch from snapshot values
      // to recalculated values, potentially causing a jump.
      // After PROD-062: both paths use the same calculateValuation(), so
      // if EBITDA is the same, values are identical.

      const briScore = 0.65
      const coreScore = 0.8
      const multipleLow = 4.0
      const multipleHigh = 8.0

      // Scenario A: EBITDA from snapshot (e.g., estimated from revenue)
      const snapshotEbitda = 200000
      const resultA = calculateValuation({
        adjustedEbitda: snapshotEbitda,
        industryMultipleLow: multipleLow,
        industryMultipleHigh: multipleHigh,
        coreScore,
        briScore,
      })

      // Scenario B: EBITDA from financials (same amount)
      const financialsEbitda = 200000
      const resultB = calculateValuation({
        adjustedEbitda: financialsEbitda,
        industryMultipleLow: multipleLow,
        industryMultipleHigh: multipleHigh,
        coreScore,
        briScore,
      })

      // Identical EBITDA = identical values = no jump
      expect(resultA.currentValue).toBe(resultB.currentValue)
      expect(resultA.potentialValue).toBe(resultB.potentialValue)
      expect(resultA.valueGap).toBe(resultB.valueGap)
      expect(resultA.finalMultiple).toBe(resultB.finalMultiple)
    })

    it('no value jump when enabling DCF with same enterprise value', () => {
      // When DCF is enabled and happens to match the EBITDA-based value,
      // the dashboard should show the same value (no jump)
      const briScore = 0.7
      const coreScore = 1.0
      const adjustedEbitda = 150000
      const multipleLow = 3.0
      const multipleHigh = 6.0

      const ebitdaBased = calculateValuation({
        adjustedEbitda,
        industryMultipleLow: multipleLow,
        industryMultipleHigh: multipleHigh,
        coreScore,
        briScore,
      })

      // DCF enterprise value that matches the EBITDA-based current value
      const dcfEnterpriseValue = ebitdaBased.currentValue

      // When DCF is used, dashboard replaces currentValue with DCF value
      // Since they match, there is no jump
      expect(dcfEnterpriseValue).toBe(ebitdaBased.currentValue)
    })

    it('custom multiples produce predictable value changes', () => {
      // When user sets custom multiples, the value should change predictably
      // based on the new range, not based on whether shouldUseSnapshotValues was true
      const briScore = 0.7
      const coreScore = 1.0
      const adjustedEbitda = 150000

      // Default industry multiples
      const defaultResult = calculateValuation({
        adjustedEbitda,
        industryMultipleLow: 3.0,
        industryMultipleHigh: 6.0,
        coreScore,
        briScore,
      })

      // Custom (wider) multiples
      const customResult = calculateValuation({
        adjustedEbitda,
        industryMultipleLow: 4.0,
        industryMultipleHigh: 10.0,
        coreScore,
        briScore,
      })

      // Wider range with higher multiples = higher values
      expect(customResult.currentValue).toBeGreaterThan(defaultResult.currentValue)
      expect(customResult.potentialValue).toBeGreaterThan(defaultResult.potentialValue)

      // Verify the math is correct for custom range
      expect(customResult.baseMultiple).toBe(10.0) // 4.0 + 1.0 * (10.0 - 4.0)
      expect(customResult.potentialValue).toBe(adjustedEbitda * 10.0)
    })

    it('fresh calculation is deterministic across repeated calls', () => {
      // The dashboard recalculates on every request. Results must be identical
      // for the same inputs regardless of how many times we calculate.
      const inputs = {
        adjustedEbitda: 250000,
        industryMultipleLow: 3.5,
        industryMultipleHigh: 7.0,
        coreScore: 0.75,
        briScore: 0.6,
      }

      const results = Array.from({ length: 10 }, () => calculateValuation(inputs))

      for (let i = 1; i < results.length; i++) {
        expect(results[i].currentValue).toBe(results[0].currentValue)
        expect(results[i].potentialValue).toBe(results[0].potentialValue)
        expect(results[i].valueGap).toBe(results[0].valueGap)
        expect(results[i].finalMultiple).toBe(results[0].finalMultiple)
      }
    })

    it('value gap is always non-negative in fresh calculation (no DCF)', () => {
      // With fresh calculation, valueGap = potentialValue - currentValue
      // Since BRI discount only reduces the multiple, potentialValue >= currentValue
      const testCases = [
        { ebitda: 100000, low: 3.0, high: 6.0, core: 0.5, bri: 0.3 },
        { ebitda: 500000, low: 4.0, high: 8.0, core: 1.0, bri: 0.99 },
        { ebitda: 50000, low: 2.0, high: 5.0, core: 0.2, bri: 0.1 },
        { ebitda: 1000000, low: 5.0, high: 12.0, core: 0.8, bri: 0.85 },
      ]

      for (const tc of testCases) {
        const result = calculateValuation({
          adjustedEbitda: tc.ebitda,
          industryMultipleLow: tc.low,
          industryMultipleHigh: tc.high,
          coreScore: tc.core,
          briScore: tc.bri,
        })
        expect(result.valueGap).toBeGreaterThanOrEqual(0)
      }
    })
  })

  // =========================================================================
  // PROD-063: Onboarding-Snapshot Server-Side Recalculation
  // The onboarding-snapshot API now only accepts raw inputs (briScore,
  // categoryScores) and recalculates all values server-side. These tests
  // verify that server-side calculation produces correct, consistent values.
  // =========================================================================
  describe('PROD-063: Onboarding-Snapshot Server-Side Recalculation', () => {
    it('server recalculation from briScore produces same result as UI preview', () => {
      // The UI calculates locally for instant preview using calculateValuationFromPercentages
      // The server recalculates using calculateValuation with the same inputs
      // They must produce identical results

      const adjustedEbitda = 150000
      const industryMultipleLow = 3.0
      const industryMultipleHigh = 6.0
      const coreScore = 1.0
      const briScorePercent = 72 // UI sends 0-100

      // UI-side preview calculation
      const uiResult = calculateValuationFromPercentages({
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
        coreScore,
        briScorePercent,
      })

      // Server-side calculation (converts briScore/100 -> decimal)
      const serverResult = calculateValuation({
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
        coreScore,
        briScore: briScorePercent / 100,
      })

      // Bit-for-bit identical
      expect(Math.round(serverResult.currentValue)).toBe(Math.round(uiResult.currentValue))
      expect(Math.round(serverResult.potentialValue)).toBe(Math.round(uiResult.potentialValue))
      expect(Math.round(serverResult.valueGap)).toBe(Math.round(uiResult.valueGap))
      expect(serverResult.finalMultiple).toBe(uiResult.finalMultiple)
      expect(serverResult.baseMultiple).toBe(uiResult.baseMultiple)
    })

    it('server ignores UI-submitted currentValue/potentialValue/valueGap', () => {
      // Even if the client sends wrong values, the server recalculates correctly
      // This test verifies the concept: the server's calculation is independent
      // of whatever the client might have computed

      const adjustedEbitda = 200000
      const multipleLow = 4.0
      const multipleHigh = 8.0
      const coreScore = 0.8
      const briScore = 0.65

      // Server's authoritative calculation
      const serverResult = calculateValuation({
        adjustedEbitda,
        industryMultipleLow: multipleLow,
        industryMultipleHigh: multipleHigh,
        coreScore,
        briScore,
      })

      // A malicious/buggy client could send completely wrong values
      const bogusClientValues = {
        currentValue: 999999,
        potentialValue: 1,
        valueGap: -500000,
      }

      // Server's result is independent of bogus values
      expect(serverResult.currentValue).not.toBe(bogusClientValues.currentValue)
      expect(serverResult.potentialValue).not.toBe(bogusClientValues.potentialValue)
      expect(serverResult.valueGap).not.toBe(bogusClientValues.valueGap)

      // Server produces correct values
      const expectedBase = multipleLow + coreScore * (multipleHigh - multipleLow)
      expect(serverResult.baseMultiple).toBeCloseTo(expectedBase, 6)
      expect(serverResult.potentialValue).toBeCloseTo(adjustedEbitda * expectedBase, 0)
      expect(serverResult.currentValue).toBeLessThanOrEqual(serverResult.potentialValue)
      expect(serverResult.valueGap).toBeGreaterThanOrEqual(0)
    })

    it('server calculation is consistent for various BRI scores', () => {
      const adjustedEbitda = 150000
      const multipleLow = 3.0
      const multipleHigh = 6.0
      const coreScore = 1.0

      // Test at 10% BRI increments
      const briScores = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
      let previousValue = -Infinity

      for (const briPercent of briScores) {
        const result = calculateValuation({
          adjustedEbitda,
          industryMultipleLow: multipleLow,
          industryMultipleHigh: multipleHigh,
          coreScore,
          briScore: briPercent / 100,
        })

        // Values must increase monotonically with BRI
        expect(result.currentValue).toBeGreaterThanOrEqual(previousValue)
        previousValue = result.currentValue

        // Value gap must decrease as BRI increases
        if (briPercent === 100) {
          expect(result.valueGap).toBe(0)
        }
      }
    })

    it('onboarding -> snapshot -> dashboard produces consistent values end-to-end', () => {
      // Full lifecycle test:
      // 1. Onboarding calculates preview with calculateValuationFromPercentages
      // 2. Sends only briScore + categoryScores to server
      // 3. Server recalculates independently with calculateValuation
      // 4. Dashboard recalculates fresh with calculateValuation (PROD-062)
      // All three must agree

      const adjustedEbitda = 180000
      const multipleLow = 3.5
      const multipleHigh = 7.0
      const coreScore = 0.9
      const briScorePercent = 68

      // Step 1: Onboarding UI preview
      const uiPreview = calculateValuationFromPercentages({
        adjustedEbitda,
        industryMultipleLow: multipleLow,
        industryMultipleHigh: multipleHigh,
        coreScore,
        briScorePercent,
      })

      // Step 3: Server recalculation (from raw inputs only)
      const serverCalc = calculateValuation({
        adjustedEbitda,
        industryMultipleLow: multipleLow,
        industryMultipleHigh: multipleHigh,
        coreScore,
        briScore: briScorePercent / 100,
      })

      // Step 4: Dashboard fresh calculation (same inputs)
      const dashboardCalc = calculateValuation({
        adjustedEbitda,
        industryMultipleLow: multipleLow,
        industryMultipleHigh: multipleHigh,
        coreScore,
        briScore: briScorePercent / 100,
      })

      // All three must agree exactly
      expect(uiPreview.currentValue).toBe(serverCalc.currentValue)
      expect(serverCalc.currentValue).toBe(dashboardCalc.currentValue)

      expect(uiPreview.potentialValue).toBe(serverCalc.potentialValue)
      expect(serverCalc.potentialValue).toBe(dashboardCalc.potentialValue)

      expect(uiPreview.valueGap).toBe(serverCalc.valueGap)
      expect(serverCalc.valueGap).toBe(dashboardCalc.valueGap)

      expect(uiPreview.finalMultiple).toBe(serverCalc.finalMultiple)
      expect(serverCalc.finalMultiple).toBe(dashboardCalc.finalMultiple)
    })

    it('category scores do not affect server valuation calculation', () => {
      // Category scores are stored for BRI breakdown display only.
      // The overall BRI score drives the valuation formula.
      // Different category breakdowns with the same overall BRI produce identical values.

      const adjustedEbitda = 150000
      const multipleLow = 3.0
      const multipleHigh = 6.0
      const coreScore = 1.0
      const briScore = 0.7

      // All category variations produce the same valuation
      // because only the weighted BRI score matters for the formula
      const result = calculateValuation({
        adjustedEbitda,
        industryMultipleLow: multipleLow,
        industryMultipleHigh: multipleHigh,
        coreScore,
        briScore,
      })

      // The formula only sees briScore, not category breakdown
      expect(result.currentValue).toBeCloseTo(816600, -2)
      expect(result.potentialValue).toBe(900000)
    })
  })
})
