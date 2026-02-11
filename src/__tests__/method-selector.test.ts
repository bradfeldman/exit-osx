import { describe, it, expect } from 'vitest'
import {
  selectValuationMethod,
  buildFinancialProfile,
  type CompanyFinancialProfile,
} from '@/lib/valuation/method-selector'

// =============================================================================
// PROD-012: Valuation Method Auto-Selection Tests
// =============================================================================

/**
 * Helper to build a default profile that can be selectively overridden.
 */
function makeProfile(overrides: Partial<CompanyFinancialProfile> = {}): CompanyFinancialProfile {
  return {
    revenue: 5000000,          // $5M revenue
    ebitda: 750000,            // $750K EBITDA (15% margin)
    yearsOfFinancialData: 2,
    hasCashFlowStatements: false,
    hasPositiveFreeCashFlow: false,
    revenueGrowthRate: null,
    isRecurringRevenue: false,
    ...overrides,
  }
}

describe('PROD-012: Valuation Method Auto-Selection', () => {

  // ---------------------------------------------------------------------------
  // Decision 1: Negative or zero EBITDA -> Revenue
  // ---------------------------------------------------------------------------
  describe('Negative/zero EBITDA -> Revenue method', () => {
    it('should select revenue method when EBITDA is negative', () => {
      const result = selectValuationMethod(
        makeProfile({ ebitda: -100000 })
      )
      expect(result.primaryMethod).toBe('revenue')
      expect(result.methodLabel).toBe('Revenue Multiple')
      expect(result.reasons).toContain(
        'EBITDA is negative or zero, making earnings-based multiples unreliable'
      )
    })

    it('should select revenue method when EBITDA is zero', () => {
      const result = selectValuationMethod(
        makeProfile({ ebitda: 0 })
      )
      expect(result.primaryMethod).toBe('revenue')
    })

    it('should have medium confidence when revenue is positive but EBITDA negative', () => {
      const result = selectValuationMethod(
        makeProfile({ ebitda: -50000, revenue: 2000000 })
      )
      expect(result.confidence).toBe('medium')
    })

    it('should have low confidence when both revenue is zero and EBITDA negative', () => {
      const result = selectValuationMethod(
        makeProfile({ ebitda: -50000, revenue: 0 })
      )
      expect(result.confidence).toBe('low')
    })

    it('should suggest EBITDA alternative when EBITDA is near breakeven', () => {
      // EBITDA is -$25K against $5M revenue (only -0.5%)
      const result = selectValuationMethod(
        makeProfile({ ebitda: -25000, revenue: 5000000 })
      )
      expect(result.primaryMethod).toBe('revenue')
      expect(result.alternativeMethods.some(a => a.method === 'ebitda')).toBe(true)
    })

    it('should NOT suggest EBITDA alternative when EBITDA is deeply negative', () => {
      // EBITDA is -$500K against $5M revenue (-10%)
      const result = selectValuationMethod(
        makeProfile({ ebitda: -500000, revenue: 5000000 })
      )
      expect(result.primaryMethod).toBe('revenue')
      expect(result.alternativeMethods.some(a => a.method === 'ebitda')).toBe(false)
    })

    it('should include explanation text about negative EBITDA', () => {
      const result = selectValuationMethod(
        makeProfile({ ebitda: -100000 })
      )
      expect(result.explanation).toContain('negative or zero EBITDA')
    })
  })

  // ---------------------------------------------------------------------------
  // Decision 2: High growth -> Revenue
  // ---------------------------------------------------------------------------
  describe('High growth -> Revenue method', () => {
    it('should select revenue method when growth exceeds 30%', () => {
      const result = selectValuationMethod(
        makeProfile({ revenueGrowthRate: 0.35 })
      )
      expect(result.primaryMethod).toBe('revenue')
      expect(result.explanation).toContain('35%')
    })

    it('should select revenue method at exactly 31% growth', () => {
      const result = selectValuationMethod(
        makeProfile({ revenueGrowthRate: 0.31 })
      )
      expect(result.primaryMethod).toBe('revenue')
    })

    it('should NOT select revenue method at exactly 30% growth', () => {
      // 30% is the threshold, not exceeded
      const result = selectValuationMethod(
        makeProfile({ revenueGrowthRate: 0.30 })
      )
      expect(result.primaryMethod).not.toBe('revenue')
    })

    it('should have high confidence for high-growth companies', () => {
      const result = selectValuationMethod(
        makeProfile({ revenueGrowthRate: 0.50 })
      )
      expect(result.confidence).toBe('high')
    })

    it('should suggest DCF as alternative when data supports it', () => {
      const result = selectValuationMethod(
        makeProfile({
          revenueGrowthRate: 0.40,
          yearsOfFinancialData: 4,
          hasCashFlowStatements: true,
          hasPositiveFreeCashFlow: true,
        })
      )
      expect(result.primaryMethod).toBe('revenue')
      expect(result.alternativeMethods.some(a => a.label.includes('DCF'))).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Decision 3: Recurring revenue + low margin -> Revenue
  // ---------------------------------------------------------------------------
  describe('Recurring revenue + low margin -> Revenue method', () => {
    it('should select revenue for SaaS company with margin below 15%', () => {
      const result = selectValuationMethod(
        makeProfile({
          isRecurringRevenue: true,
          revenue: 3000000,
          ebitda: 300000, // 10% margin
        })
      )
      expect(result.primaryMethod).toBe('revenue')
      expect(result.explanation).toContain('recurring revenue')
    })

    it('should NOT select revenue for SaaS company with margin above 15%', () => {
      const result = selectValuationMethod(
        makeProfile({
          isRecurringRevenue: true,
          revenue: 3000000,
          ebitda: 600000, // 20% margin
        })
      )
      // With 20% margin and recurring revenue, should default to EBITDA
      expect(result.primaryMethod).toBe('ebitda')
    })

    it('should NOT trigger for non-recurring revenue companies', () => {
      const result = selectValuationMethod(
        makeProfile({
          isRecurringRevenue: false,
          revenue: 3000000,
          ebitda: 270000, // 9% margin — below 10% threshold, should go to hybrid
        })
      )
      // Without recurring revenue, low margin goes to hybrid
      expect(result.primaryMethod).toBe('hybrid')
    })

    it('should suggest hybrid as alternative', () => {
      const result = selectValuationMethod(
        makeProfile({
          isRecurringRevenue: true,
          revenue: 3000000,
          ebitda: 300000, // 10% margin
        })
      )
      expect(result.alternativeMethods.some(a => a.method === 'hybrid')).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Decision 4: Low margin -> Hybrid
  // ---------------------------------------------------------------------------
  describe('Low margin (positive EBITDA) -> Hybrid method', () => {
    it('should select hybrid when EBITDA margin is below 10%', () => {
      const result = selectValuationMethod(
        makeProfile({
          revenue: 5000000,
          ebitda: 400000, // 8% margin
          isRecurringRevenue: false,
        })
      )
      expect(result.primaryMethod).toBe('hybrid')
      expect(result.methodLabel).toBe('Blended (EBITDA + Revenue)')
    })

    it('should select hybrid at 5% margin', () => {
      const result = selectValuationMethod(
        makeProfile({
          revenue: 10000000,
          ebitda: 500000, // 5% margin
          isRecurringRevenue: false,
        })
      )
      expect(result.primaryMethod).toBe('hybrid')
    })

    it('should NOT select hybrid at 10% margin (threshold not exceeded)', () => {
      const result = selectValuationMethod(
        makeProfile({
          revenue: 5000000,
          ebitda: 500000, // exactly 10%
          isRecurringRevenue: false,
        })
      )
      // 10% is the threshold — at exactly 10%, we should go to EBITDA, not hybrid
      expect(result.primaryMethod).toBe('ebitda')
    })

    it('should suggest both EBITDA and revenue as alternatives', () => {
      const result = selectValuationMethod(
        makeProfile({
          revenue: 5000000,
          ebitda: 400000, // 8% margin
          isRecurringRevenue: false,
        })
      )
      expect(result.alternativeMethods.some(a => a.method === 'ebitda')).toBe(true)
      expect(result.alternativeMethods.some(a => a.method === 'revenue')).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Decision 5: Mature with data -> EBITDA (with DCF cross-check)
  // ---------------------------------------------------------------------------
  describe('Mature company with DCF data -> EBITDA + DCF cross-check', () => {
    it('should select EBITDA as primary when DCF data is available', () => {
      const result = selectValuationMethod(
        makeProfile({
          yearsOfFinancialData: 4,
          hasCashFlowStatements: true,
          hasPositiveFreeCashFlow: true,
        })
      )
      expect(result.primaryMethod).toBe('ebitda')
    })

    it('should suggest DCF as alternative when data supports it', () => {
      const result = selectValuationMethod(
        makeProfile({
          yearsOfFinancialData: 5,
          hasCashFlowStatements: true,
          hasPositiveFreeCashFlow: true,
        })
      )
      expect(result.alternativeMethods.some(a => a.label.includes('DCF'))).toBe(true)
    })

    it('should have high confidence with extensive data', () => {
      const result = selectValuationMethod(
        makeProfile({
          yearsOfFinancialData: 5,
          hasCashFlowStatements: true,
          hasPositiveFreeCashFlow: true,
        })
      )
      expect(result.confidence).toBe('high')
    })

    it('should mention DCF availability in explanation', () => {
      const result = selectValuationMethod(
        makeProfile({
          yearsOfFinancialData: 3,
          hasCashFlowStatements: true,
          hasPositiveFreeCashFlow: true,
        })
      )
      expect(result.explanation).toContain('DCF')
    })

    it('should NOT suggest DCF if less than 3 years of data', () => {
      const result = selectValuationMethod(
        makeProfile({
          yearsOfFinancialData: 2,
          hasCashFlowStatements: true,
          hasPositiveFreeCashFlow: true,
        })
      )
      // Should be default EBITDA, no DCF in alternatives
      expect(result.alternativeMethods.some(a => a.label.includes('DCF'))).toBe(false)
    })

    it('should NOT suggest DCF if no cash flow statements', () => {
      const result = selectValuationMethod(
        makeProfile({
          yearsOfFinancialData: 5,
          hasCashFlowStatements: false,
          hasPositiveFreeCashFlow: false,
        })
      )
      expect(result.alternativeMethods.some(a => a.label.includes('DCF'))).toBe(false)
    })

    it('should NOT suggest DCF if negative free cash flow', () => {
      const result = selectValuationMethod(
        makeProfile({
          yearsOfFinancialData: 5,
          hasCashFlowStatements: true,
          hasPositiveFreeCashFlow: false,
        })
      )
      expect(result.alternativeMethods.some(a => a.label.includes('DCF'))).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Decision 6: Default -> EBITDA
  // ---------------------------------------------------------------------------
  describe('Default -> EBITDA method', () => {
    it('should select EBITDA for a typical profitable company', () => {
      const result = selectValuationMethod(makeProfile())
      expect(result.primaryMethod).toBe('ebitda')
      expect(result.methodLabel).toBe('EBITDA Multiple')
    })

    it('should have high confidence with 2+ years of data', () => {
      const result = selectValuationMethod(
        makeProfile({ yearsOfFinancialData: 2 })
      )
      expect(result.confidence).toBe('high')
    })

    it('should have medium confidence with only 1 year of data', () => {
      const result = selectValuationMethod(
        makeProfile({ yearsOfFinancialData: 1 })
      )
      expect(result.confidence).toBe('medium')
    })

    it('should suggest revenue as alternative', () => {
      const result = selectValuationMethod(makeProfile())
      expect(result.alternativeMethods.some(a => a.method === 'revenue')).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Industry context in explanations
  // ---------------------------------------------------------------------------
  describe('Industry context in explanations', () => {
    it('should include industry name when provided', () => {
      const result = selectValuationMethod(
        makeProfile({ industryName: 'Healthcare Services' })
      )
      expect(result.explanation).toContain('Healthcare Services')
    })

    it('should not include industry clause when not provided', () => {
      const result = selectValuationMethod(
        makeProfile({ industryName: undefined })
      )
      expect(result.explanation).not.toContain('sector')
    })
  })

  // ---------------------------------------------------------------------------
  // Priority ordering (multiple signals)
  // ---------------------------------------------------------------------------
  describe('Priority ordering of decision rules', () => {
    it('negative EBITDA takes priority over high growth', () => {
      const result = selectValuationMethod(
        makeProfile({
          ebitda: -100000,
          revenueGrowthRate: 0.50, // 50% growth but negative EBITDA
        })
      )
      // Both point to revenue, but the reason should be about EBITDA
      expect(result.primaryMethod).toBe('revenue')
      expect(result.reasons[0]).toContain('EBITDA is negative')
    })

    it('high growth takes priority over low margin', () => {
      const result = selectValuationMethod(
        makeProfile({
          revenueGrowthRate: 0.40,
          revenue: 5000000,
          ebitda: 250000, // 5% margin — would trigger hybrid
        })
      )
      expect(result.primaryMethod).toBe('revenue')
      expect(result.reasons[0]).toContain('growth rate')
    })

    it('recurring + low margin takes priority over generic low margin', () => {
      const result = selectValuationMethod(
        makeProfile({
          isRecurringRevenue: true,
          revenue: 3000000,
          ebitda: 300000, // 10% margin — would trigger hybrid normally
        })
      )
      // Recurring revenue at 10% margin (below 15% threshold) -> revenue
      expect(result.primaryMethod).toBe('revenue')
      expect(result.reasons.some(r => r.includes('recurring'))).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('Edge cases', () => {
    it('handles zero revenue and zero EBITDA', () => {
      const result = selectValuationMethod(
        makeProfile({ revenue: 0, ebitda: 0 })
      )
      expect(result.primaryMethod).toBe('revenue')
      expect(result.confidence).toBe('low')
    })

    it('handles very large numbers', () => {
      const result = selectValuationMethod(
        makeProfile({
          revenue: 1000000000, // $1B
          ebitda: 200000000,   // $200M
          yearsOfFinancialData: 10,
        })
      )
      expect(result.primaryMethod).toBe('ebitda')
    })

    it('handles null growth rate gracefully', () => {
      const result = selectValuationMethod(
        makeProfile({ revenueGrowthRate: null })
      )
      // Should not crash, should proceed to next decision
      expect(result.primaryMethod).toBe('ebitda')
    })

    it('handles zero years of financial data', () => {
      const result = selectValuationMethod(
        makeProfile({ yearsOfFinancialData: 0 })
      )
      expect(result.primaryMethod).toBe('ebitda')
      expect(result.confidence).toBe('medium')
    })
  })

  // ---------------------------------------------------------------------------
  // buildFinancialProfile helper
  // ---------------------------------------------------------------------------
  describe('buildFinancialProfile', () => {
    it('builds profile from raw data', () => {
      const profile = buildFinancialProfile(
        { annualRevenue: '5000000', annualEbitda: '750000' },
        3,
        true,
        true,
        0.12,
        'SUBSCRIPTION_SAAS',
        'Technology'
      )

      expect(profile.revenue).toBe(5000000)
      expect(profile.ebitda).toBe(750000)
      expect(profile.yearsOfFinancialData).toBe(3)
      expect(profile.hasCashFlowStatements).toBe(true)
      expect(profile.hasPositiveFreeCashFlow).toBe(true)
      expect(profile.revenueGrowthRate).toBe(0.12)
      expect(profile.isRecurringRevenue).toBe(true)
      expect(profile.industryName).toBe('Technology')
    })

    it('handles Prisma Decimal strings', () => {
      const profile = buildFinancialProfile(
        { annualRevenue: '1234567.89', annualEbitda: '-50000.00' },
        0,
        false,
        false,
        null,
        null
      )

      expect(profile.revenue).toBeCloseTo(1234567.89)
      expect(profile.ebitda).toBeCloseTo(-50000)
    })

    it('identifies RECURRING_CONTRACTS as recurring revenue', () => {
      const profile = buildFinancialProfile(
        { annualRevenue: 1000000, annualEbitda: 100000 },
        1,
        false,
        false,
        null,
        'RECURRING_CONTRACTS'
      )
      expect(profile.isRecurringRevenue).toBe(true)
    })

    it('identifies PROJECT_BASED as NOT recurring revenue', () => {
      const profile = buildFinancialProfile(
        { annualRevenue: 1000000, annualEbitda: 100000 },
        1,
        false,
        false,
        null,
        'PROJECT_BASED'
      )
      expect(profile.isRecurringRevenue).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Result shape validation
  // ---------------------------------------------------------------------------
  describe('Result shape', () => {
    it('always returns required fields', () => {
      const result = selectValuationMethod(makeProfile())

      expect(result).toHaveProperty('primaryMethod')
      expect(result).toHaveProperty('explanation')
      expect(result).toHaveProperty('methodLabel')
      expect(result).toHaveProperty('alternativeMethods')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('reasons')

      expect(typeof result.primaryMethod).toBe('string')
      expect(typeof result.explanation).toBe('string')
      expect(typeof result.methodLabel).toBe('string')
      expect(Array.isArray(result.alternativeMethods)).toBe(true)
      expect(['high', 'medium', 'low']).toContain(result.confidence)
      expect(Array.isArray(result.reasons)).toBe(true)
      expect(result.reasons.length).toBeGreaterThan(0)
    })

    it('explanation is non-empty for all paths', () => {
      const profiles: CompanyFinancialProfile[] = [
        makeProfile({ ebitda: -100000 }),                    // negative EBITDA
        makeProfile({ revenueGrowthRate: 0.50 }),            // high growth
        makeProfile({ isRecurringRevenue: true, revenue: 3000000, ebitda: 300000 }), // recurring + low margin
        makeProfile({ revenue: 5000000, ebitda: 400000 }),   // low margin
        makeProfile({                                         // DCF feasible
          yearsOfFinancialData: 5,
          hasCashFlowStatements: true,
          hasPositiveFreeCashFlow: true,
        }),
        makeProfile(),                                        // default EBITDA
      ]

      for (const p of profiles) {
        const result = selectValuationMethod(p)
        expect(result.explanation.length).toBeGreaterThan(20)
      }
    })
  })
})
