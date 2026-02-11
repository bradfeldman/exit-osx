import { describe, it, expect } from 'vitest'
import { calculateDots, calculateEvidenceScore } from '../score-calculator'
import type { EvidenceCategory } from '../evidence-categories'

describe('score-calculator', () => {
  describe('calculateDots', () => {
    it('returns 5 when expected is 0', () => {
      expect(calculateDots(0, 0)).toBe(5)
    })

    it('returns 0 for no uploads', () => {
      expect(calculateDots(0, 5)).toBe(0)
    })

    it('returns 1 for < 20% coverage', () => {
      expect(calculateDots(1, 10)).toBe(1) // 10%
    })

    it('returns 2 for 20-39% coverage', () => {
      expect(calculateDots(2, 10)).toBe(2) // 20%
      expect(calculateDots(3, 10)).toBe(2) // 30%
    })

    it('returns 3 for 40-59% coverage', () => {
      expect(calculateDots(4, 10)).toBe(3) // 40%
      expect(calculateDots(5, 10)).toBe(3) // 50%
    })

    it('returns 4 for 60-99% coverage', () => {
      expect(calculateDots(6, 10)).toBe(4) // 60%
      expect(calculateDots(9, 10)).toBe(4) // 90%
    })

    it('returns 5 for 100% coverage', () => {
      expect(calculateDots(10, 10)).toBe(5)
      expect(calculateDots(15, 10)).toBe(5) // over 100% still 5
    })
  })

  describe('calculateEvidenceScore', () => {
    const emptyCategories: Record<EvidenceCategory, number> = {
      financial: 0,
      legal: 0,
      operational: 0,
      customers: 0,
      team: 0,
      ipTech: 0,
    }

    it('returns 0% for empty categories', () => {
      const result = calculateEvidenceScore(emptyCategories)
      expect(result.totalPercentage).toBe(0)
      expect(result.totalUploaded).toBe(0)
      expect(result.totalExpected).toBeGreaterThan(0)
    })

    it('returns correct number of categories', () => {
      const result = calculateEvidenceScore(emptyCategories)
      expect(result.categories).toHaveLength(6)
    })

    it('calculates weighted score correctly', () => {
      // Upload all scoring docs in financial (weight 0.30)
      // Financial has 7 scoring docs (required + expected, not helpful)
      const result = calculateEvidenceScore({
        ...emptyCategories,
        financial: 7,
      })

      // Financial is full (weight 0.30), others empty
      // Score should be 0.30 * 100 = 30
      expect(result.totalPercentage).toBe(30)
    })

    it('caps documents at expected count', () => {
      // Upload more than expected
      const result = calculateEvidenceScore({
        ...emptyCategories,
        financial: 100,
      })

      // Should be capped at the scoring docs count
      const financialCat = result.categories.find(c => c.category === 'financial')
      expect(financialCat).toBeDefined()
      expect(financialCat!.percentage).toBe(100)
    })

    it('returns 100% when all categories are full', () => {
      // Fill all categories to their scoring doc counts
      const result = calculateEvidenceScore({
        financial: 7,  // 7 scoring docs
        legal: 5,      // 5 scoring docs
        operational: 4, // 4 scoring docs
        customers: 3,  // 3 scoring docs
        team: 4,       // 4 scoring docs
        ipTech: 2,     // 2 scoring docs (1 required + 1 expected)
      })

      expect(result.totalPercentage).toBe(100)
    })

    it('each category has correct structure', () => {
      const result = calculateEvidenceScore(emptyCategories)

      for (const cat of result.categories) {
        expect(cat).toHaveProperty('category')
        expect(cat).toHaveProperty('documentsUploaded')
        expect(cat).toHaveProperty('documentsExpected')
        expect(cat).toHaveProperty('percentage')
        expect(cat).toHaveProperty('dots')
        expect(cat).toHaveProperty('weightedScore')
        expect(cat.documentsUploaded).toBeGreaterThanOrEqual(0)
        expect(cat.documentsExpected).toBeGreaterThanOrEqual(0)
        expect(cat.percentage).toBeGreaterThanOrEqual(0)
        expect(cat.percentage).toBeLessThanOrEqual(100)
        expect(cat.dots).toBeGreaterThanOrEqual(0)
        expect(cat.dots).toBeLessThanOrEqual(5)
      }
    })

    it('weights sum to 1.0', () => {
      // Verify evidence categories weights sum correctly
      void calculateEvidenceScore(emptyCategories)
      // If all categories were 100%, total should be 100
      // This verifies via the formula: sum(weight_i * 100) = 100
      const fullResult = calculateEvidenceScore({
        financial: 100,
        legal: 100,
        operational: 100,
        customers: 100,
        team: 100,
        ipTech: 100,
      })
      expect(fullResult.totalPercentage).toBe(100)
    })
  })
})
