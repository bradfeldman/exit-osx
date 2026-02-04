import { describe, it, expect } from 'vitest'
import {
  calculateBaseMultiple,
  estimateEbitdaFromRevenue,
  type MultipleResult
} from '@/lib/valuation/industry-multiples'
import {
  ALPHA,
  calculateCoreScore,
  calculateValuation,
  calculateValuationFromPercentages,
} from '@/lib/valuation/calculate-valuation'

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

    describe('calculateCoreScore', () => {
      it('returns 0.5 for null factors', () => {
        expect(calculateCoreScore(null)).toBe(0.5)
      })

      it('returns 1.0 for optimal factors (onboarding defaults)', () => {
        const optimalFactors = {
          revenueModel: 'SUBSCRIPTION_SAAS',
          grossMarginProxy: 'EXCELLENT',
          laborIntensity: 'LOW',
          assetIntensity: 'ASSET_LIGHT',
          ownerInvolvement: 'MINIMAL',
        }
        expect(calculateCoreScore(optimalFactors)).toBe(1.0)
      })

      it('returns approximately 0.216 for worst factors', () => {
        const worstFactors = {
          revenueModel: 'PROJECT_BASED',
          grossMarginProxy: 'LOW',
          laborIntensity: 'VERY_HIGH',
          assetIntensity: 'ASSET_HEAVY',
          ownerInvolvement: 'CRITICAL',
        }
        // (0.25 + 0.25 + 0.25 + 0.33 + 0.0) / 5 = 1.08 / 5 = 0.216
        expect(calculateCoreScore(worstFactors)).toBeCloseTo(0.216, 2)
      })
    })

    describe('calculateValuation', () => {
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

        // discountFraction = (1 - 0.7)^1.4 = 0.3^1.4 ≈ 0.1853
        expect(result.discountFraction).toBeCloseTo(0.1853, 2)

        // finalMultiple = 3.0 + (6.0 - 3.0) * (1 - 0.1853) = 5.44
        expect(result.finalMultiple).toBeCloseTo(5.44, 1)

        // currentValue = 150000 * finalMultiple ≈ 816,600
        expect(result.currentValue).toBeCloseTo(816600, -2)

        // potentialValue = 150000 * 6.0 = 900,000
        expect(result.potentialValue).toBe(900000)

        // valueGap = 900000 - 816600 ≈ 83,400
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
        // newCurrentValue ≈ $816,000

        // The difference is significant!
        const difference = result.currentValue - oldCurrentValue
        const percentDifference = (difference / oldCurrentValue) * 100

        expect(oldCurrentValue).toBe(630000)
        expect(result.currentValue).toBeCloseTo(816600, -2)
        expect(percentDifference).toBeGreaterThan(25) // ~29.6% difference

        // This test documents and prevents regression of the bug fix
      })
    })
  })
})
