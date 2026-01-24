import { describe, it, expect } from 'vitest'
import { DEFAULT_BRI_WEIGHTS, type BriWeights } from '@/lib/bri-weights'

describe('BRI Weights', () => {
  describe('DEFAULT_BRI_WEIGHTS', () => {
    it('should have all required categories', () => {
      expect(DEFAULT_BRI_WEIGHTS).toHaveProperty('FINANCIAL')
      expect(DEFAULT_BRI_WEIGHTS).toHaveProperty('TRANSFERABILITY')
      expect(DEFAULT_BRI_WEIGHTS).toHaveProperty('OPERATIONAL')
      expect(DEFAULT_BRI_WEIGHTS).toHaveProperty('MARKET')
      expect(DEFAULT_BRI_WEIGHTS).toHaveProperty('LEGAL_TAX')
      expect(DEFAULT_BRI_WEIGHTS).toHaveProperty('PERSONAL')
    })

    it('should have weights that sum to 1.0 (100%)', () => {
      const sum = Object.values(DEFAULT_BRI_WEIGHTS).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1.0, 10)
    })

    it('should have FINANCIAL as the highest weight', () => {
      expect(DEFAULT_BRI_WEIGHTS.FINANCIAL).toBe(0.25)
      const otherWeights = Object.entries(DEFAULT_BRI_WEIGHTS)
        .filter(([key]) => key !== 'FINANCIAL')
        .map(([, value]) => value)

      otherWeights.forEach(weight => {
        expect(DEFAULT_BRI_WEIGHTS.FINANCIAL).toBeGreaterThanOrEqual(weight)
      })
    })

    it('should have correct individual weight values', () => {
      expect(DEFAULT_BRI_WEIGHTS.FINANCIAL).toBe(0.25)
      expect(DEFAULT_BRI_WEIGHTS.TRANSFERABILITY).toBe(0.20)
      expect(DEFAULT_BRI_WEIGHTS.OPERATIONAL).toBe(0.20)
      expect(DEFAULT_BRI_WEIGHTS.MARKET).toBe(0.15)
      expect(DEFAULT_BRI_WEIGHTS.LEGAL_TAX).toBe(0.10)
      expect(DEFAULT_BRI_WEIGHTS.PERSONAL).toBe(0.10)
    })

    it('should have all positive weights', () => {
      Object.values(DEFAULT_BRI_WEIGHTS).forEach(weight => {
        expect(weight).toBeGreaterThan(0)
      })
    })

    it('should have exactly 6 categories', () => {
      expect(Object.keys(DEFAULT_BRI_WEIGHTS)).toHaveLength(6)
    })
  })

  describe('BriWeights type', () => {
    it('should be usable as a type', () => {
      const customWeights: BriWeights = {
        FINANCIAL: 0.30,
        TRANSFERABILITY: 0.20,
        OPERATIONAL: 0.20,
        MARKET: 0.10,
        LEGAL_TAX: 0.10,
        PERSONAL: 0.10,
      }

      expect(customWeights.FINANCIAL).toBe(0.30)
    })
  })
})
