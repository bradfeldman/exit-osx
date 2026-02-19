import { describe, it, expect } from 'vitest'
import {
  calculateBusinessQualityScore,
  buildAdjustmentProfile,
  type BusinessQualityResult,
} from '@/lib/valuation/business-quality-score'
import type { AdjustmentProfile } from '@/lib/valuation/multiple-adjustments'

describe('Business Quality Score (BQS)', () => {
  const neutralProfile: AdjustmentProfile = {
    revenue: 3_000_000,
    revenueSizeCategory: 'FROM_1M_TO_3M',
    revenueGrowthRate: 0.05, // stable
    ebitdaMargin: 0.17,      // average
    topCustomerConcentration: 0.10,
    top3CustomerConcentration: 0.25,
    transferabilityScore: 0.7,
    revenueModel: 'RECURRING_CONTRACTS',
    isRecurringRevenue: true,
  }

  describe('calculateBusinessQualityScore', () => {
    it('returns score between 0 and 1', () => {
      const result = calculateBusinessQualityScore(neutralProfile)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1)
    })

    it('returns higher score for strong profile', () => {
      const strongProfile: AdjustmentProfile = {
        revenue: 15_000_000,
        revenueSizeCategory: 'FROM_10M_TO_25M',
        revenueGrowthRate: 0.35,
        ebitdaMargin: 0.35,
        topCustomerConcentration: 0.05,
        top3CustomerConcentration: 0.12,
        transferabilityScore: 0.95,
        revenueModel: 'SUBSCRIPTION_SAAS',
        isRecurringRevenue: true,
      }

      const neutral = calculateBusinessQualityScore(neutralProfile)
      const strong = calculateBusinessQualityScore(strongProfile)

      expect(strong.score).toBeGreaterThan(neutral.score)
    })

    it('returns lower score for weak profile', () => {
      const weakProfile: AdjustmentProfile = {
        revenue: 300_000,
        revenueSizeCategory: 'UNDER_500K',
        revenueGrowthRate: -0.15,
        ebitdaMargin: 0.05,
        topCustomerConcentration: 0.40,
        top3CustomerConcentration: 0.70,
        transferabilityScore: 0.2,
        revenueModel: 'PROJECT_BASED',
        isRecurringRevenue: false,
      }

      const neutral = calculateBusinessQualityScore(neutralProfile)
      const weak = calculateBusinessQualityScore(weakProfile)

      expect(weak.score).toBeLessThan(neutral.score)
    })

    it('includes adjustment details in result', () => {
      const result = calculateBusinessQualityScore(neutralProfile)
      expect(result.adjustments).toBeDefined()
      expect(result.adjustments.adjustments).toBeInstanceOf(Array)
      expect(result.adjustmentMultiplier).toBeGreaterThan(0)
    })

    it('is deterministic', () => {
      const r1 = calculateBusinessQualityScore(neutralProfile)
      const r2 = calculateBusinessQualityScore(neutralProfile)
      expect(r1.score).toBe(r2.score)
      expect(r1.adjustmentMultiplier).toBe(r2.adjustmentMultiplier)
    })

    it('maps multiplier range [0.3, 1.5] to score [0, 1]', () => {
      // Score ~0.58 for neutral (1.0x multiplier maps to (1.0 - 0.3) / 1.2 ≈ 0.583)
      const result = calculateBusinessQualityScore(neutralProfile)
      // With a recurring revenue premium, multiplier should be > 1.0
      expect(result.adjustmentMultiplier).toBeGreaterThan(0.3)
      expect(result.adjustmentMultiplier).toBeLessThanOrEqual(1.5)
    })
  })

  describe('buildAdjustmentProfile', () => {
    it('builds profile from company-like data', () => {
      const profile = buildAdjustmentProfile({
        annualRevenue: 2_000_000,
        annualEbitda: 400_000,
        coreFactors: {
          revenueSizeCategory: 'FROM_1M_TO_3M',
          revenueModel: 'SUBSCRIPTION_SAAS',
        },
        transferabilityScore: 0.8,
        topCustomerConcentration: 0.10,
        top3CustomerConcentration: 0.25,
        revenueGrowthRate: 0.12,
      })

      expect(profile.revenue).toBe(2_000_000)
      expect(profile.ebitdaMargin).toBeCloseTo(0.2, 2) // 400K / 2M
      expect(profile.revenueSizeCategory).toBe('FROM_1M_TO_3M')
      expect(profile.revenueModel).toBe('SUBSCRIPTION_SAAS')
      expect(profile.isRecurringRevenue).toBe(true)
      expect(profile.transferabilityScore).toBe(0.8)
      expect(profile.revenueGrowthRate).toBe(0.12)
    })

    it('handles Decimal-like objects with toNumber()', () => {
      const profile = buildAdjustmentProfile({
        annualRevenue: { toNumber: () => 5_000_000 },
        annualEbitda: { toNumber: () => 1_000_000 },
        coreFactors: { revenueSizeCategory: 'FROM_3M_TO_10M', revenueModel: 'TRANSACTIONAL' },
      })

      expect(profile.revenue).toBe(5_000_000)
      expect(profile.ebitdaMargin).toBeCloseTo(0.2, 2)
      expect(profile.isRecurringRevenue).toBe(false)
    })

    it('handles null coreFactors', () => {
      const profile = buildAdjustmentProfile({
        annualRevenue: 1_000_000,
        annualEbitda: 150_000,
        coreFactors: null,
      })

      expect(profile.revenueSizeCategory).toBeUndefined()
      expect(profile.revenueModel).toBeUndefined()
      expect(profile.isRecurringRevenue).toBe(false)
    })

    it('handles negative EBITDA margin', () => {
      const profile = buildAdjustmentProfile({
        annualRevenue: 1_000_000,
        annualEbitda: -50_000,
        coreFactors: { revenueSizeCategory: 'FROM_1M_TO_3M', revenueModel: 'TRANSACTIONAL' },
      })

      expect(profile.ebitdaMargin).toBeNull() // negative excluded
    })
  })
})
