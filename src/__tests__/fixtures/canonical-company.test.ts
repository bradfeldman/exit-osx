import { describe, it, expect } from 'vitest'
import {
  CANONICAL_COMPANY,
  EXPECTED_VALUATION,
  FOUNDER_DEPENDENT_COMPANY,
  HIGH_CONCENTRATION_COMPANY,
  PERFECT_SAAS_COMPANY,
  calculateExpectedValuation,
  assertValuationMatches,
} from './canonical-company'
import { calculateValuation } from '@/lib/valuation/calculate-valuation'
import { DEFAULT_BRI_WEIGHTS } from '@/lib/bri-weights'

describe('Canonical Company Fixtures', () => {
  describe('CANONICAL_COMPANY fixture', () => {
    it('should have correct structure and values', () => {
      expect(CANONICAL_COMPANY.name).toBe('Test Co - Canonical')
      expect(CANONICAL_COMPANY.annualRevenue).toBe(1000000)
      expect(CANONICAL_COMPANY.annualEbitda).toBe(150000)
      expect(CANONICAL_COMPANY.industryMultipleLow).toBe(3.0)
      expect(CANONICAL_COMPANY.industryMultipleHigh).toBe(6.0)
    })

    it('should have optimal core factors', () => {
      expect(CANONICAL_COMPANY.coreFactors.revenueModel).toBe('SUBSCRIPTION_SAAS')
      expect(CANONICAL_COMPANY.coreFactors.grossMarginProxy).toBe('EXCELLENT')
      expect(CANONICAL_COMPANY.coreFactors.laborIntensity).toBe('LOW')
      expect(CANONICAL_COMPANY.coreFactors.assetIntensity).toBe('ASSET_LIGHT')
      expect(CANONICAL_COMPANY.coreFactors.ownerInvolvement).toBe('MINIMAL')
    })

    it('should have 70% BRI score across all categories', () => {
      expect(CANONICAL_COMPANY.briScores.FINANCIAL).toBe(0.70)
      expect(CANONICAL_COMPANY.briScores.TRANSFERABILITY).toBe(0.70)
      expect(CANONICAL_COMPANY.briScores.OPERATIONAL).toBe(0.70)
      expect(CANONICAL_COMPANY.briScores.MARKET).toBe(0.70)
      expect(CANONICAL_COMPANY.briScores.LEGAL_TAX).toBe(0.70)
      expect(CANONICAL_COMPANY.briScores.PERSONAL).toBe(0.70)
    })

    it('should have BRI weights that sum to 1.0', () => {
      const sum = Object.values(CANONICAL_COMPANY.briWeights).reduce((a, b) => a + b, 0)
      expect(sum).toBe(1.0)
    })

    it('should use default BRI weights', () => {
      expect(CANONICAL_COMPANY.briWeights).toEqual(DEFAULT_BRI_WEIGHTS)
    })
  })

  describe('EXPECTED_VALUATION fixture', () => {
    it('should have correct input values', () => {
      expect(EXPECTED_VALUATION.adjustedEbitda).toBe(150000)
      expect(EXPECTED_VALUATION.industryMultipleLow).toBe(3.0)
      expect(EXPECTED_VALUATION.industryMultipleHigh).toBe(6.0)
      expect(EXPECTED_VALUATION.coreScore).toBe(1.0)
      expect(EXPECTED_VALUATION.briScore).toBeCloseTo(0.70, 2)
    })

    it('should have correct calculated values', () => {
      // baseMultiple = 3.0 + 1.0 * (6.0 - 3.0) = 6.0
      expect(EXPECTED_VALUATION.baseMultiple).toBe(6.0)

      // discountFraction = (1 - 0.7)^1.4 ≈ 0.1853
      expect(EXPECTED_VALUATION.discountFraction).toBeCloseTo(0.1853, 3)

      // finalMultiple = 3.0 + (6.0 - 3.0) * (1 - 0.1853) ≈ 5.44
      expect(EXPECTED_VALUATION.finalMultiple).toBeCloseTo(5.44, 2)

      // currentValue = 150,000 * 5.44 ≈ 816,600
      expect(EXPECTED_VALUATION.currentValue).toBeCloseTo(816600, -2)

      // potentialValue = 150,000 * 6.0 = 900,000
      expect(EXPECTED_VALUATION.potentialValue).toBe(900000)

      // valueGap = 900,000 - 816,600 ≈ 83,400
      expect(EXPECTED_VALUATION.valueGap).toBeCloseTo(83400, -2)
    })

    it('should match canonical valuation formula', () => {
      const result = calculateValuation({
        adjustedEbitda: EXPECTED_VALUATION.adjustedEbitda,
        industryMultipleLow: EXPECTED_VALUATION.industryMultipleLow,
        industryMultipleHigh: EXPECTED_VALUATION.industryMultipleHigh,
        coreScore: EXPECTED_VALUATION.coreScore,
        briScore: EXPECTED_VALUATION.briScore,
      })

      expect(result.currentValue).toBe(EXPECTED_VALUATION.currentValue)
      expect(result.potentialValue).toBe(EXPECTED_VALUATION.potentialValue)
      expect(result.valueGap).toBe(EXPECTED_VALUATION.valueGap)
      expect(result.baseMultiple).toBe(EXPECTED_VALUATION.baseMultiple)
      expect(result.finalMultiple).toBe(EXPECTED_VALUATION.finalMultiple)
      expect(result.discountFraction).toBe(EXPECTED_VALUATION.discountFraction)
    })

    it('should use ALPHA=1.4', () => {
      expect(EXPECTED_VALUATION.alphaConstant).toBe(1.4)
    })
  })

  describe('calculateExpectedValuation helper', () => {
    it('should calculate correct values for CANONICAL_COMPANY', () => {
      const result = calculateExpectedValuation(CANONICAL_COMPANY)

      expect(result.coreScore).toBe(1.0)
      expect(result.briScore).toBeCloseTo(0.70, 2)
      expect(result.currentValue).toBeCloseTo(EXPECTED_VALUATION.currentValue, -2)
    })

    it('should calculate correct values for FOUNDER_DEPENDENT_COMPANY', () => {
      const result = calculateExpectedValuation(FOUNDER_DEPENDENT_COMPANY)

      // Core score should be lower due to CRITICAL owner involvement
      expect(result.coreScore).toBe(0.8)

      // BRI score should be lower due to reduced scores
      // Actual calculation: 0.60*0.25 + 0.30*0.20 + 0.50*0.20 + 0.65*0.15 + 0.70*0.10 + 0.40*0.10 = 0.5175
      expect(result.briScore).toBeCloseTo(0.5175, 2)

      // Current value should be lower than canonical due to both factors
      expect(result.currentValue).toBeLessThan(EXPECTED_VALUATION.currentValue)
    })

    it('should calculate correct values for HIGH_CONCENTRATION_COMPANY', () => {
      const result = calculateExpectedValuation(HIGH_CONCENTRATION_COMPANY)

      // Core score should still be optimal
      expect(result.coreScore).toBe(1.0)

      // BRI score should be lower due to concentration issues
      expect(result.briScore).toBeLessThan(0.70)

      // Current value should be lower than canonical
      expect(result.currentValue).toBeLessThan(EXPECTED_VALUATION.currentValue)
    })

    it('should calculate correct values for PERFECT_SAAS_COMPANY', () => {
      const result = calculateExpectedValuation(PERFECT_SAAS_COMPANY)

      // Perfect scores
      expect(result.coreScore).toBe(1.0)
      expect(result.briScore).toBe(1.0)

      // No discount for perfect BRI
      expect(result.discountFraction).toBe(0)

      // Current value should equal potential value (no gap)
      expect(result.valueGap).toBe(0)
      expect(result.currentValue).toBe(result.potentialValue)

      // Larger revenue should result in larger valuation
      expect(result.currentValue).toBeGreaterThan(EXPECTED_VALUATION.currentValue)
    })
  })

  describe('assertValuationMatches helper', () => {
    it('should return all true for matching values', () => {
      const matches = assertValuationMatches(
        EXPECTED_VALUATION,
        EXPECTED_VALUATION
      )

      expect(matches.currentValue).toBe(true)
      expect(matches.potentialValue).toBe(true)
      expect(matches.valueGap).toBe(true)
      expect(matches.baseMultiple).toBe(true)
      expect(matches.finalMultiple).toBe(true)
      expect(matches.discountFraction).toBe(true)
    })

    it('should return false for values outside tolerance', () => {
      const slightlyDifferent = {
        ...EXPECTED_VALUATION,
        currentValue: EXPECTED_VALUATION.currentValue + 200, // Outside $100 tolerance
      }

      const matches = assertValuationMatches(
        slightlyDifferent,
        EXPECTED_VALUATION
      )

      expect(matches.currentValue).toBe(false)
      expect(matches.potentialValue).toBe(true) // This one still matches
    })

    it('should accept custom tolerance values', () => {
      const slightlyDifferent = {
        ...EXPECTED_VALUATION,
        currentValue: EXPECTED_VALUATION.currentValue + 200,
      }

      const matches = assertValuationMatches(
        slightlyDifferent,
        EXPECTED_VALUATION,
        { value: 250, multiple: 0.01, fraction: 0.001 } // Wider tolerance
      )

      expect(matches.currentValue).toBe(true) // Now it passes
    })
  })

  describe('Determinism verification', () => {
    it('should produce identical results on repeated calculations', () => {
      const result1 = calculateExpectedValuation(CANONICAL_COMPANY)
      const result2 = calculateExpectedValuation(CANONICAL_COMPANY)
      const result3 = calculateExpectedValuation(CANONICAL_COMPANY)

      expect(result1).toEqual(result2)
      expect(result2).toEqual(result3)
    })

    it('should match EXPECTED_VALUATION exactly', () => {
      const calculated = calculateExpectedValuation(CANONICAL_COMPANY)

      // These should be EXACTLY equal (not just close)
      expect(calculated.currentValue).toBe(EXPECTED_VALUATION.currentValue)
      expect(calculated.potentialValue).toBe(EXPECTED_VALUATION.potentialValue)
      expect(calculated.valueGap).toBe(EXPECTED_VALUATION.valueGap)
      expect(calculated.baseMultiple).toBe(EXPECTED_VALUATION.baseMultiple)
      expect(calculated.finalMultiple).toBe(EXPECTED_VALUATION.finalMultiple)
      expect(calculated.discountFraction).toBe(EXPECTED_VALUATION.discountFraction)
    })
  })

  describe('Alternative scenarios', () => {
    it('FOUNDER_DEPENDENT_COMPANY should have lower valuation', () => {
      const canonical = calculateExpectedValuation(CANONICAL_COMPANY)
      const founderDependent = calculateExpectedValuation(FOUNDER_DEPENDENT_COMPANY)

      expect(founderDependent.coreScore).toBeLessThan(canonical.coreScore)
      expect(founderDependent.briScore).toBeLessThan(canonical.briScore)
      expect(founderDependent.currentValue).toBeLessThan(canonical.currentValue)
      expect(founderDependent.valueGap).toBeGreaterThan(canonical.valueGap)
    })

    it('HIGH_CONCENTRATION_COMPANY should have moderate discount', () => {
      const canonical = calculateExpectedValuation(CANONICAL_COMPANY)
      const highConcentration = calculateExpectedValuation(HIGH_CONCENTRATION_COMPANY)

      expect(highConcentration.coreScore).toBe(canonical.coreScore) // Same business model
      expect(highConcentration.briScore).toBeLessThan(canonical.briScore) // Lower BRI
      expect(highConcentration.currentValue).toBeLessThan(canonical.currentValue)
    })

    it('PERFECT_SAAS_COMPANY should have highest valuation', () => {
      const canonical = calculateExpectedValuation(CANONICAL_COMPANY)
      const perfect = calculateExpectedValuation(PERFECT_SAAS_COMPANY)

      expect(perfect.coreScore).toBe(1.0)
      expect(perfect.briScore).toBe(1.0)
      expect(perfect.discountFraction).toBe(0)
      expect(perfect.valueGap).toBe(0)
      expect(perfect.currentValue).toBeGreaterThan(canonical.currentValue) // Larger revenue
    })
  })
})
