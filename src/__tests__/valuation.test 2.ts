import { describe, it, expect } from 'vitest'
import {
  calculateBaseMultiple,
  estimateEbitdaFromRevenue,
  type MultipleResult
} from '@/lib/valuation/industry-multiples'

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
})
