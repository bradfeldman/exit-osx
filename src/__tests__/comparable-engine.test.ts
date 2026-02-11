import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  findComparables,
  calculateWeightedMultiple,
  validateAndNormalizeComparables,
  formatDollarAmount,
  normalizeDecimalRate,
  normalizePositiveNumber,
  type CompanyProfile,
  type ComparableCompany,
} from '@/lib/valuation/comparable-engine'
import {
  adjustMultiples,
  calculateMultipleRange,
  calculateSpreadFactor,
  roundMultiple,
  SIZE_DISCOUNTS,
  CONCENTRATION_THRESHOLDS,
  OWNER_DEPENDENCY_MAX_DISCOUNT,
  type AdjustmentProfile,
  type AdjustmentResult,
} from '@/lib/valuation/multiple-adjustments'

// =============================================================================
// Mock AI Client
// =============================================================================
// We mock the AI module to avoid real API calls in tests.
// The mock returns a controlled response that exercises the validation logic.

vi.mock('@/lib/ai/anthropic', () => ({
  generateJSON: vi.fn(),
}))

import { generateJSON } from '@/lib/ai/anthropic'
const mockGenerateJSON = vi.mocked(generateJSON)

// =============================================================================
// Test Data Factories
// =============================================================================

function makeCompanyProfile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    name: 'Test Company Inc',
    industry: 'Enterprise Software',
    revenue: 5_000_000,
    revenueGrowthRate: 0.15,
    ebitdaMargin: 0.20,
    ...overrides,
  }
}

function makeAdjustmentProfile(overrides: Partial<AdjustmentProfile> = {}): AdjustmentProfile {
  return {
    revenue: 5_000_000,
    revenueSizeCategory: 'FROM_3M_TO_10M',
    revenueGrowthRate: 0.15,
    ebitdaMargin: 0.20,
    topCustomerConcentration: null,
    top3CustomerConcentration: null,
    transferabilityScore: null,
    revenueModel: 'TRANSACTIONAL',
    isRecurringRevenue: false,
    ...overrides,
  }
}

function makeComparable(overrides: Partial<ComparableCompany> = {}): ComparableCompany {
  return {
    name: 'Test Comp Corp',
    ticker: 'TCOR',
    rationale: 'Similar business model and end market',
    metrics: {
      revenue: 100_000_000,
      ebitdaMargin: 0.22,
      revenueGrowthRate: 0.12,
      evToEbitda: 12.0,
      evToRevenue: 2.8,
    },
    relevanceScore: 0.75,
    ...overrides,
  }
}

/** Standard AI response for the mock */
function makeAIResponse() {
  return {
    data: {
      comparables: [
        {
          name: 'Salesforce Inc',
          ticker: 'CRM',
          rationale: 'Leading enterprise SaaS platform with similar customer base',
          metrics: {
            revenue: 34000000000,
            ebitdaMargin: 0.32,
            revenueGrowthRate: 0.11,
            evToEbitda: 25.0,
            evToRevenue: 7.5,
          },
          relevanceScore: 0.65,
        },
        {
          name: 'HubSpot Inc',
          ticker: 'HUBS',
          rationale: 'SMB-focused SaaS platform, closer to target market segment',
          metrics: {
            revenue: 2200000000,
            ebitdaMargin: 0.15,
            revenueGrowthRate: 0.22,
            evToEbitda: 45.0,
            evToRevenue: 10.0,
          },
          relevanceScore: 0.55,
        },
        {
          name: 'Freshworks Inc',
          ticker: 'FRSH',
          rationale: 'Mid-market SaaS with similar feature set',
          metrics: {
            revenue: 600000000,
            ebitdaMargin: 0.05,
            revenueGrowthRate: 0.20,
            evToEbitda: null,
            evToRevenue: 5.0,
          },
          relevanceScore: 0.70,
        },
        {
          name: 'Zoho Corp',
          ticker: null,
          rationale: 'Private SMB SaaS suite, strong business model match',
          metrics: {
            revenue: 1000000000,
            ebitdaMargin: 0.25,
            revenueGrowthRate: 0.15,
            evToEbitda: 15.0,
            evToRevenue: 3.5,
          },
          relevanceScore: 0.80,
        },
      ],
      warnings: ['Public comparables are significantly larger than the subject company. Size adjustments should be applied.'],
    },
    usage: {
      inputTokens: 500,
      outputTokens: 800,
    },
  }
}

// =============================================================================
// PART 1: Comparable Engine Tests
// =============================================================================

describe('PROD-004: Comparable Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // findComparables()
  // ---------------------------------------------------------------------------
  describe('findComparables()', () => {
    it('should call AI with correct model and return structured result', async () => {
      mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())

      const result = await findComparables(makeCompanyProfile())

      // Verify AI was called with correct parameters
      expect(mockGenerateJSON).toHaveBeenCalledOnce()
      const [prompt, systemPrompt, options] = mockGenerateJSON.mock.calls[0]
      expect(options).toMatchObject({
        model: 'claude-sonnet',
        temperature: 0.3,
      })
      expect(prompt).toContain('Test Company Inc')
      expect(prompt).toContain('Enterprise Software')
      expect(systemPrompt).toContain('investment banking')

      // Verify result structure
      expect(result.comparables).toHaveLength(4)
      expect(result.analyzedAt).toBeDefined()
      expect(result.aiUsage.model).toBe('claude-sonnet')
      expect(result.aiUsage.inputTokens).toBe(500)
      expect(result.aiUsage.outputTokens).toBe(800)
    })

    it('should sort comparables by relevance score (highest first)', async () => {
      mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())

      const result = await findComparables(makeCompanyProfile())

      const scores = result.comparables.map((c) => c.relevanceScore)
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
      }
    })

    it('should calculate weighted multiples from comparables', async () => {
      mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())

      const result = await findComparables(makeCompanyProfile())

      // Should have weighted EBITDA multiple (3 of 4 comps have evToEbitda)
      expect(result.weightedEbitdaMultiple).not.toBeNull()
      expect(result.weightedEbitdaMultiple).toBeGreaterThan(0)

      // Should have weighted Revenue multiple (all 4 have evToRevenue)
      expect(result.weightedRevenueMultiple).not.toBeNull()
      expect(result.weightedRevenueMultiple).toBeGreaterThan(0)
    })

    it('should include warnings from AI response', async () => {
      mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())

      const result = await findComparables(makeCompanyProfile())
      expect(result.warnings).toContain(
        'Public comparables are significantly larger than the subject company. Size adjustments should be applied.'
      )
    })

    it('should include all profile fields in the prompt', async () => {
      mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())

      await findComparables(
        makeCompanyProfile({
          name: 'Acme Software',
          industry: 'Cloud Computing',
          industryPath: 'Technology / Cloud / Infrastructure',
          revenue: 3_000_000,
          revenueGrowthRate: 0.25,
          ebitdaMargin: 0.18,
          revenueModel: 'SUBSCRIPTION_SAAS',
          isRecurringRevenue: true,
          customerConcentration: 'Top 3 customers = 40% of revenue',
          geography: 'US domestic',
          businessDescription: 'Cloud infrastructure management platform',
        })
      )

      const prompt = mockGenerateJSON.mock.calls[0][0] as string
      expect(prompt).toContain('Acme Software')
      expect(prompt).toContain('Cloud Computing')
      expect(prompt).toContain('Technology / Cloud / Infrastructure')
      expect(prompt).toContain('$3.0M')
      expect(prompt).toContain('25.0%')
      expect(prompt).toContain('18.0%')
      expect(prompt).toContain('SaaS / Subscription')
      expect(prompt).toContain('Recurring Revenue: Yes')
      expect(prompt).toContain('Top 3 customers = 40% of revenue')
      expect(prompt).toContain('US domestic')
      expect(prompt).toContain('Cloud infrastructure management platform')
    })

    it('should handle null EBITDA margin in prompt', async () => {
      mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())

      await findComparables(makeCompanyProfile({ ebitdaMargin: null }))

      const prompt = mockGenerateJSON.mock.calls[0][0] as string
      expect(prompt).toContain('Negative or not available')
    })

    it('should throw on empty company name', async () => {
      await expect(
        findComparables(makeCompanyProfile({ name: '' }))
      ).rejects.toThrow('Company name is required')
    })

    it('should throw on empty industry', async () => {
      await expect(
        findComparables(makeCompanyProfile({ industry: '' }))
      ).rejects.toThrow('Industry classification is required')
    })

    it('should throw on negative revenue', async () => {
      await expect(
        findComparables(makeCompanyProfile({ revenue: -100 }))
      ).rejects.toThrow('Revenue cannot be negative')
    })

    it('should handle AI returning empty comparables', async () => {
      mockGenerateJSON.mockResolvedValueOnce({
        data: { comparables: [], warnings: [] },
        usage: { inputTokens: 100, outputTokens: 50 },
      })

      const result = await findComparables(makeCompanyProfile())
      expect(result.comparables).toHaveLength(0)
      expect(result.weightedEbitdaMultiple).toBeNull()
      expect(result.weightedRevenueMultiple).toBeNull()
      expect(result.warnings).toContain(
        'AI did not return any valid comparables. Multiple ranges may be unreliable.'
      )
    })

    it('should handle AI returning no comparables field', async () => {
      mockGenerateJSON.mockResolvedValueOnce({
        data: { warnings: ['No suitable comparables found'] },
        usage: { inputTokens: 100, outputTokens: 50 },
      })

      const result = await findComparables(makeCompanyProfile())
      expect(result.comparables).toHaveLength(0)
    })
  })

  // ---------------------------------------------------------------------------
  // validateAndNormalizeComparables()
  // ---------------------------------------------------------------------------
  describe('validateAndNormalizeComparables()', () => {
    it('should accept valid comparables', () => {
      const raw = [
        {
          name: 'Valid Corp',
          ticker: 'vc',
          rationale: 'Good match',
          metrics: { evToEbitda: 10, evToRevenue: 2.5 },
          relevanceScore: 0.8,
        },
      ]
      const result = validateAndNormalizeComparables(raw)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Valid Corp')
      expect(result[0].ticker).toBe('VC') // Uppercased
      expect(result[0].relevanceScore).toBe(0.8)
    })

    it('should reject entries without a name', () => {
      const raw = [
        { name: '', metrics: { evToEbitda: 10 }, relevanceScore: 0.8 },
        { name: undefined, metrics: { evToEbitda: 10 }, relevanceScore: 0.8 },
        { metrics: { evToEbitda: 10 }, relevanceScore: 0.8 },
      ]
      const result = validateAndNormalizeComparables(raw as any)
      expect(result).toHaveLength(0)
    })

    it('should clamp relevance scores to 0-1 range', () => {
      const raw = [
        { name: 'Over', relevanceScore: 1.5, metrics: {} },
        { name: 'Under', relevanceScore: -0.5, metrics: {} },
      ]
      const result = validateAndNormalizeComparables(raw)
      expect(result[0].relevanceScore).toBe(1.0)
      expect(result[1].relevanceScore).toBe(0)
    })

    it('should default relevance score to 0.5 if missing', () => {
      const raw = [{ name: 'No Score', metrics: {} }]
      const result = validateAndNormalizeComparables(raw)
      expect(result[0].relevanceScore).toBe(0.5)
    })

    it('should reject EV/EBITDA > 100', () => {
      const raw = [
        { name: 'Extreme', metrics: { evToEbitda: 150 }, relevanceScore: 0.8 },
      ]
      const result = validateAndNormalizeComparables(raw)
      expect(result[0].metrics.evToEbitda).toBeNull()
    })

    it('should reject EV/Revenue > 50', () => {
      const raw = [
        { name: 'Extreme', metrics: { evToRevenue: 60 }, relevanceScore: 0.8 },
      ]
      const result = validateAndNormalizeComparables(raw)
      expect(result[0].metrics.evToRevenue).toBeNull()
    })

    it('should reject negative multiples', () => {
      const raw = [
        { name: 'Negative', metrics: { evToEbitda: -5, evToRevenue: -2 }, relevanceScore: 0.8 },
      ]
      const result = validateAndNormalizeComparables(raw)
      expect(result[0].metrics.evToEbitda).toBeNull()
      expect(result[0].metrics.evToRevenue).toBeNull()
    })

    it('should cap at 5 comparables', () => {
      const raw = Array.from({ length: 8 }, (_, i) => ({
        name: `Comp ${i}`,
        metrics: {},
        relevanceScore: 0.5 + i * 0.05,
      }))
      const result = validateAndNormalizeComparables(raw)
      expect(result).toHaveLength(5)
    })

    it('should sort by relevance descending', () => {
      const raw = [
        { name: 'Low', metrics: {}, relevanceScore: 0.3 },
        { name: 'High', metrics: {}, relevanceScore: 0.9 },
        { name: 'Mid', metrics: {}, relevanceScore: 0.6 },
      ]
      const result = validateAndNormalizeComparables(raw)
      expect(result[0].name).toBe('High')
      expect(result[1].name).toBe('Mid')
      expect(result[2].name).toBe('Low')
    })

    it('should handle non-array input', () => {
      expect(validateAndNormalizeComparables(undefined as unknown as [])).toHaveLength(0)
      expect(validateAndNormalizeComparables(null as unknown as [])).toHaveLength(0)
    })

    it('should auto-convert percentage-format margins to decimal', () => {
      const raw = [
        {
          name: 'Percent Corp',
          metrics: { ebitdaMargin: 22, revenueGrowthRate: 15 },
          relevanceScore: 0.8,
        },
      ]
      const result = validateAndNormalizeComparables(raw)
      expect(result[0].metrics.ebitdaMargin).toBeCloseTo(0.22)
      expect(result[0].metrics.revenueGrowthRate).toBeCloseTo(0.15)
    })

    it('should provide default rationale when missing', () => {
      const raw = [{ name: 'No Reason', metrics: {}, relevanceScore: 0.5 }]
      const result = validateAndNormalizeComparables(raw)
      expect(result[0].rationale).toBe('No rationale provided')
    })
  })

  // ---------------------------------------------------------------------------
  // calculateWeightedMultiple()
  // ---------------------------------------------------------------------------
  describe('calculateWeightedMultiple()', () => {
    it('should calculate weighted average correctly', () => {
      const comps: ComparableCompany[] = [
        makeComparable({ relevanceScore: 0.8, metrics: { ...makeComparable().metrics, evToEbitda: 10 } }),
        makeComparable({ relevanceScore: 0.6, metrics: { ...makeComparable().metrics, evToEbitda: 15 } }),
      ]

      const result = calculateWeightedMultiple(comps, (c) => c.metrics.evToEbitda)

      // Weighted avg = (10 * 0.8 + 15 * 0.6) / (0.8 + 0.6) = (8 + 9) / 1.4 = 12.14...
      expect(result).toBeCloseTo(17 / 1.4)
    })

    it('should return null for empty input', () => {
      expect(calculateWeightedMultiple([], (c) => c.metrics.evToEbitda)).toBeNull()
    })

    it('should skip comparables with null multiples', () => {
      const comps: ComparableCompany[] = [
        makeComparable({ relevanceScore: 0.8, metrics: { ...makeComparable().metrics, evToEbitda: 10 } }),
        makeComparable({ relevanceScore: 0.9, metrics: { ...makeComparable().metrics, evToEbitda: null } }),
      ]

      const result = calculateWeightedMultiple(comps, (c) => c.metrics.evToEbitda)
      expect(result).toBe(10) // Only one valid comp
    })

    it('should skip zero or negative multiples', () => {
      const comps: ComparableCompany[] = [
        makeComparable({ relevanceScore: 0.8, metrics: { ...makeComparable().metrics, evToEbitda: 0 } }),
        makeComparable({ relevanceScore: 0.9, metrics: { ...makeComparable().metrics, evToEbitda: -5 } }),
      ]

      expect(calculateWeightedMultiple(comps, (c) => c.metrics.evToEbitda)).toBeNull()
    })

    it('should work with a single valid comparable', () => {
      const comps: ComparableCompany[] = [
        makeComparable({ relevanceScore: 0.7, metrics: { ...makeComparable().metrics, evToEbitda: 8.5 } }),
      ]

      expect(calculateWeightedMultiple(comps, (c) => c.metrics.evToEbitda)).toBe(8.5)
    })

    it('should handle evToRevenue extractor', () => {
      const comps: ComparableCompany[] = [
        makeComparable({ relevanceScore: 0.8, metrics: { ...makeComparable().metrics, evToRevenue: 3 } }),
        makeComparable({ relevanceScore: 0.6, metrics: { ...makeComparable().metrics, evToRevenue: 5 } }),
      ]

      const result = calculateWeightedMultiple(comps, (c) => c.metrics.evToRevenue)
      expect(result).toBeCloseTo((3 * 0.8 + 5 * 0.6) / (0.8 + 0.6))
    })
  })

  // ---------------------------------------------------------------------------
  // Helper Functions
  // ---------------------------------------------------------------------------
  describe('formatDollarAmount()', () => {
    it('should format thousands', () => {
      expect(formatDollarAmount(500_000)).toBe('500K')
      expect(formatDollarAmount(1_500)).toBe('2K')
    })

    it('should format millions', () => {
      expect(formatDollarAmount(5_000_000)).toBe('5.0M')
      expect(formatDollarAmount(2_500_000)).toBe('2.5M')
    })

    it('should format billions', () => {
      expect(formatDollarAmount(1_500_000_000)).toBe('1.5B')
    })

    it('should format small amounts', () => {
      expect(formatDollarAmount(500)).toBe('500')
    })
  })

  describe('normalizePositiveNumber()', () => {
    it('should accept positive numbers', () => {
      expect(normalizePositiveNumber(5)).toBe(5)
      expect(normalizePositiveNumber(0.01)).toBe(0.01)
    })

    it('should reject non-numbers', () => {
      expect(normalizePositiveNumber('5')).toBeNull()
      expect(normalizePositiveNumber(null)).toBeNull()
      expect(normalizePositiveNumber(undefined)).toBeNull()
    })

    it('should reject zero and negatives', () => {
      expect(normalizePositiveNumber(0)).toBeNull()
      expect(normalizePositiveNumber(-5)).toBeNull()
    })

    it('should reject non-finite', () => {
      expect(normalizePositiveNumber(Infinity)).toBeNull()
      expect(normalizePositiveNumber(NaN)).toBeNull()
    })
  })

  describe('normalizeDecimalRate()', () => {
    it('should accept decimal rates', () => {
      expect(normalizeDecimalRate(0.15, -1, 1)).toBe(0.15)
    })

    it('should auto-convert and clamp values in percentage range', () => {
      // Value of 2 has |2| > 1 and <= 100, so it auto-converts to 0.02
      expect(normalizeDecimalRate(2, -1, 1)).toBe(0.02)
      // Value of 150 has |150| > 100, so NO auto-conversion; clamp to max
      expect(normalizeDecimalRate(150, -1, 1)).toBe(1)
      // Negative clamping
      expect(normalizeDecimalRate(-200, -1, 1)).toBe(-1)
    })

    it('should auto-convert percentage-like values', () => {
      expect(normalizeDecimalRate(25, -1, 1)).toBeCloseTo(0.25)
      expect(normalizeDecimalRate(-15, -1, 1)).toBeCloseTo(-0.15)
    })

    it('should not auto-convert values already in decimal form', () => {
      expect(normalizeDecimalRate(0.5, -1, 1)).toBe(0.5)
    })

    it('should reject non-numbers', () => {
      expect(normalizeDecimalRate('0.15' as unknown as number, -1, 1)).toBeNull()
      expect(normalizeDecimalRate(null as unknown as number, -1, 1)).toBeNull()
    })

    it('should reject non-finite', () => {
      expect(normalizeDecimalRate(Infinity, -1, 1)).toBeNull()
      expect(normalizeDecimalRate(NaN, -1, 1)).toBeNull()
    })
  })
})

// =============================================================================
// PART 2: Multiple Adjustment Tests
// =============================================================================

describe('PROD-004: Multiple Adjustments', () => {

  // ---------------------------------------------------------------------------
  // Size Adjustments
  // ---------------------------------------------------------------------------
  describe('Size Discount', () => {
    it('should apply -35% for micro businesses (under $500K)', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenue: 300_000,
        revenueSizeCategory: 'UNDER_500K',
      }))
      const sizeAdj = result.adjustments.find((a) => a.factor === 'size_discount')
      expect(sizeAdj).toBeDefined()
      expect(sizeAdj!.impact).toBe(-0.35)
      expect(sizeAdj!.enabled).toBe(true)
      expect(sizeAdj!.category).toBe('size')
    })

    it('should apply -10% for lower middle market ($3M-$10M)', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueSizeCategory: 'FROM_3M_TO_10M',
      }))
      const sizeAdj = result.adjustments.find((a) => a.factor === 'size_discount')
      expect(sizeAdj).toBeDefined()
      expect(sizeAdj!.impact).toBe(-0.10)
    })

    it('should apply no size discount for large companies (over $25M)', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueSizeCategory: 'OVER_25M',
      }))
      const sizeAdj = result.adjustments.find((a) => a.factor === 'size_discount')
      expect(sizeAdj).toBeUndefined()
    })

    it('should infer size from revenue when category not provided', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenue: 2_000_000,
        revenueSizeCategory: undefined,
      }))
      const sizeAdj = result.adjustments.find((a) => a.factor === 'size_discount')
      expect(sizeAdj).toBeDefined()
      expect(sizeAdj!.impact).toBe(-0.18) // $1M-$3M tier
    })

    it('should have all size discount tiers properly defined', () => {
      expect(SIZE_DISCOUNTS.UNDER_500K).toBe(-0.35)
      expect(SIZE_DISCOUNTS.FROM_500K_TO_1M).toBe(-0.25)
      expect(SIZE_DISCOUNTS.FROM_1M_TO_3M).toBe(-0.18)
      expect(SIZE_DISCOUNTS.FROM_3M_TO_10M).toBe(-0.10)
      expect(SIZE_DISCOUNTS.FROM_10M_TO_25M).toBe(-0.05)
      expect(SIZE_DISCOUNTS.OVER_25M).toBe(0.0)
    })
  })

  // ---------------------------------------------------------------------------
  // Growth Adjustments
  // ---------------------------------------------------------------------------
  describe('Growth Adjustment', () => {
    it('should apply +20% premium for high growth (>30%)', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueGrowthRate: 0.35,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'growth_adjustment')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(0.20)
      expect(adj!.name).toContain('Premium')
    })

    it('should apply +12% premium for strong growth (20-30%)', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueGrowthRate: 0.25,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'growth_adjustment')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(0.12)
    })

    it('should apply +5% premium for moderate growth (10-20%)', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueGrowthRate: 0.15,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'growth_adjustment')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(0.05)
    })

    it('should apply no adjustment for stable growth (0-10%)', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueGrowthRate: 0.05,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'growth_adjustment')
      expect(adj).toBeUndefined() // 0 impact = not included
    })

    it('should apply -10% discount for declining revenue (-10% to 0%)', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueGrowthRate: -0.05,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'growth_adjustment')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(-0.10)
      expect(adj!.name).toContain('Discount')
    })

    it('should apply -20% discount for rapid decline (below -10%)', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueGrowthRate: -0.25,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'growth_adjustment')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(-0.20)
    })

    it('should skip growth adjustment when growth rate is null', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueGrowthRate: null,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'growth_adjustment')
      expect(adj).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Margin Adjustments
  // ---------------------------------------------------------------------------
  describe('Margin Adjustment', () => {
    it('should apply +15% premium for premium margins (30%+)', () => {
      const result = adjustMultiples(makeAdjustmentProfile({ ebitdaMargin: 0.35 }))
      const adj = result.adjustments.find((a) => a.factor === 'margin_adjustment')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(0.15)
    })

    it('should apply no adjustment for average margins (15-20%)', () => {
      const result = adjustMultiples(makeAdjustmentProfile({ ebitdaMargin: 0.17 }))
      const adj = result.adjustments.find((a) => a.factor === 'margin_adjustment')
      expect(adj).toBeUndefined() // 0 impact
    })

    it('should apply -25% discount for negative margins', () => {
      const result = adjustMultiples(makeAdjustmentProfile({ ebitdaMargin: -0.10 }))
      const adj = result.adjustments.find((a) => a.factor === 'margin_adjustment')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(-0.25)
    })

    it('should skip margin adjustment when margin is null', () => {
      const result = adjustMultiples(makeAdjustmentProfile({ ebitdaMargin: null }))
      const adj = result.adjustments.find((a) => a.factor === 'margin_adjustment')
      expect(adj).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Customer Concentration Adjustments
  // ---------------------------------------------------------------------------
  describe('Customer Concentration', () => {
    it('should apply -20% for single customer >30%', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        topCustomerConcentration: 0.45,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'customer_concentration_single')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(CONCENTRATION_THRESHOLDS.singleCustomerHigh.impact)
    })

    it('should apply -10% for single customer 20-30%', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        topCustomerConcentration: 0.25,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'customer_concentration_single')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(CONCENTRATION_THRESHOLDS.singleCustomerModerate.impact)
    })

    it('should apply -15% for top 3 customers >60%', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        top3CustomerConcentration: 0.70,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'customer_concentration_top3')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(CONCENTRATION_THRESHOLDS.top3High.impact)
    })

    it('should not stack single high + top3 high', () => {
      // When single customer is already high (>30%), don't also apply top3
      const result = adjustMultiples(makeAdjustmentProfile({
        topCustomerConcentration: 0.40,
        top3CustomerConcentration: 0.80,
      }))
      const singleAdj = result.adjustments.find((a) => a.factor === 'customer_concentration_single')
      const top3Adj = result.adjustments.find((a) => a.factor === 'customer_concentration_top3')
      expect(singleAdj).toBeDefined()
      expect(singleAdj!.impact).toBe(-0.20) // High single customer
      // Top3 should be suppressed when single is already at high level
      expect(top3Adj).toBeUndefined()
    })

    it('should apply no concentration adjustment when data is null', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        topCustomerConcentration: null,
        top3CustomerConcentration: null,
      }))
      const conc = result.adjustments.filter((a) => a.factor.startsWith('customer_concentration'))
      expect(conc).toHaveLength(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Owner Dependency Adjustments
  // ---------------------------------------------------------------------------
  describe('Owner Dependency', () => {
    it('should apply maximum discount for fully owner-dependent business', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        transferabilityScore: 0.0,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'owner_dependency')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(OWNER_DEPENDENCY_MAX_DISCOUNT) // -0.25
    })

    it('should apply no discount for fully transferable business', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        transferabilityScore: 1.0,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'owner_dependency')
      expect(adj).toBeUndefined() // 0% discount, below 2% threshold
    })

    it('should apply proportional discount for mid-range transferability', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        transferabilityScore: 0.5,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'owner_dependency')
      expect(adj).toBeDefined()
      // -0.25 * (1 - 0.5) = -0.125
      expect(adj!.impact).toBeCloseTo(-0.125)
    })

    it('should skip when transferability score is null', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        transferabilityScore: null,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'owner_dependency')
      expect(adj).toBeUndefined()
    })

    it('should use severity labels in explanation', () => {
      const lowResult = adjustMultiples(makeAdjustmentProfile({ transferabilityScore: 0.2 }))
      const lowAdj = lowResult.adjustments.find((a) => a.factor === 'owner_dependency')
      expect(lowAdj!.explanation).toContain('high')

      const midResult = adjustMultiples(makeAdjustmentProfile({ transferabilityScore: 0.45 }))
      const midAdj = midResult.adjustments.find((a) => a.factor === 'owner_dependency')
      expect(midAdj!.explanation).toContain('moderate')

      const highResult = adjustMultiples(makeAdjustmentProfile({ transferabilityScore: 0.85 }))
      const highAdj = highResult.adjustments.find((a) => a.factor === 'owner_dependency')
      expect(highAdj!.explanation).toContain('low')
    })
  })

  // ---------------------------------------------------------------------------
  // Recurring Revenue Adjustments
  // ---------------------------------------------------------------------------
  describe('Recurring Revenue Premium', () => {
    it('should apply +25% for SaaS/subscription', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueModel: 'SUBSCRIPTION_SAAS',
      }))
      const adj = result.adjustments.find((a) => a.factor === 'recurring_revenue')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(0.25)
    })

    it('should apply +12% for recurring contracts', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueModel: 'RECURRING_CONTRACTS',
      }))
      const adj = result.adjustments.find((a) => a.factor === 'recurring_revenue')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(0.12)
    })

    it('should apply -5% for project-based', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueModel: 'PROJECT_BASED',
      }))
      const adj = result.adjustments.find((a) => a.factor === 'recurring_revenue')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(-0.05)
    })

    it('should apply no adjustment for transactional', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueModel: 'TRANSACTIONAL',
      }))
      const adj = result.adjustments.find((a) => a.factor === 'recurring_revenue')
      expect(adj).toBeUndefined()
    })

    it('should fall back to isRecurringRevenue flag when no revenueModel', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueModel: undefined,
        isRecurringRevenue: true,
      }))
      const adj = result.adjustments.find((a) => a.factor === 'recurring_revenue')
      expect(adj).toBeDefined()
      expect(adj!.impact).toBe(0.15) // Generic recurring premium
    })
  })

  // ---------------------------------------------------------------------------
  // Total Adjustment Calculation
  // ---------------------------------------------------------------------------
  describe('Total Adjustment', () => {
    it('should sum all enabled adjustments', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueSizeCategory: 'FROM_1M_TO_3M', // -18%
        revenueGrowthRate: 0.35,               // +20%
        ebitdaMargin: 0.35,                    // +15%
        revenueModel: 'SUBSCRIPTION_SAAS',     // +25%
      }))

      // Total = -18% + 20% + 15% + 25% = +42%
      // But we also have growth tier +5% from the 15% baseline that matches 0.35 tier...
      // Wait, 0.35 >= 0.30, so it's the +20% tier
      // And margin 0.35 >= 0.30, so +15%
      const expected = -0.18 + 0.20 + 0.15 + 0.25
      expect(result.totalAdjustment).toBeCloseTo(expected)
      expect(result.adjustmentMultiplier).toBeCloseTo(1 + expected)
    })

    it('should floor adjustment multiplier at 0.3', () => {
      // Create a scenario with extreme discounts
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueSizeCategory: 'UNDER_500K',      // -35%
        revenueGrowthRate: -0.25,               // -20%
        ebitdaMargin: -0.10,                    // -25%
        topCustomerConcentration: 0.50,          // -20%
        transferabilityScore: 0.0,               // -25%
        revenueModel: 'PROJECT_BASED',           // -5%
      }))

      // Total = -35% -20% -25% -20% -25% -5% = -130%
      // Multiplier would be 1 + (-1.30) = -0.30, but floored at 0.3
      expect(result.adjustmentMultiplier).toBe(0.3)
    })

    it('should produce correct multiplier for positive adjustments', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueSizeCategory: 'OVER_25M',         // no adjustment
        revenueGrowthRate: 0.35,                 // +20%
        ebitdaMargin: 0.35,                      // +15%
        revenueModel: 'SUBSCRIPTION_SAAS',       // +25%
        transferabilityScore: 1.0,               // no adjustment (below threshold)
        topCustomerConcentration: 0.05,           // no adjustment (below threshold)
        top3CustomerConcentration: 0.15,          // no adjustment (below threshold)
      }))

      // Only growth, margin, and recurring apply
      const expected = 0.20 + 0.15 + 0.25
      expect(result.totalAdjustment).toBeCloseTo(expected)
      expect(result.adjustmentMultiplier).toBeCloseTo(1 + expected)
    })

    it('should have all adjustments enabled by default', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueSizeCategory: 'FROM_1M_TO_3M',
        revenueGrowthRate: 0.25,
        ebitdaMargin: 0.25,
        transferabilityScore: 0.5,
        revenueModel: 'SUBSCRIPTION_SAAS',
      }))

      for (const adj of result.adjustments) {
        expect(adj.enabled).toBe(true)
      }
    })

    it('should have explanations for all adjustments', () => {
      const result = adjustMultiples(makeAdjustmentProfile({
        revenueSizeCategory: 'FROM_1M_TO_3M',
        revenueGrowthRate: 0.25,
        ebitdaMargin: 0.25,
        transferabilityScore: 0.5,
        revenueModel: 'SUBSCRIPTION_SAAS',
      }))

      for (const adj of result.adjustments) {
        expect(adj.explanation).toBeTruthy()
        expect(adj.explanation.length).toBeGreaterThan(10)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Multiple Range Calculation
  // ---------------------------------------------------------------------------
  describe('calculateMultipleRange()', () => {
    const baseAdj: AdjustmentResult = {
      adjustments: [],
      totalAdjustment: -0.15,
      adjustmentMultiplier: 0.85,
    }

    it('should produce EBITDA range when base EBITDA multiple is provided', () => {
      const result = calculateMultipleRange(12.0, null, baseAdj, 4)

      expect(result.ebitdaMultipleRange).not.toBeNull()
      expect(result.revenueMultipleRange).toBeNull()

      // Mid = 12.0 * 0.85 = 10.2
      expect(result.ebitdaMultipleRange!.mid).toBeCloseTo(10.2, 0)
      expect(result.ebitdaMultipleRange!.low).toBeLessThan(result.ebitdaMultipleRange!.mid)
      expect(result.ebitdaMultipleRange!.high).toBeGreaterThan(result.ebitdaMultipleRange!.mid)
    })

    it('should produce Revenue range when base Revenue multiple is provided', () => {
      const result = calculateMultipleRange(null, 5.0, baseAdj, 4)

      expect(result.ebitdaMultipleRange).toBeNull()
      expect(result.revenueMultipleRange).not.toBeNull()

      // Mid = 5.0 * 0.85 = 4.25
      expect(result.revenueMultipleRange!.mid).toBeCloseTo(4.25, 0)
    })

    it('should produce both ranges when both multiples provided', () => {
      const result = calculateMultipleRange(10.0, 3.0, baseAdj, 4)

      expect(result.ebitdaMultipleRange).not.toBeNull()
      expect(result.revenueMultipleRange).not.toBeNull()
    })

    it('should produce null ranges when no base multiples provided', () => {
      const result = calculateMultipleRange(null, null, baseAdj, 0)

      expect(result.ebitdaMultipleRange).toBeNull()
      expect(result.revenueMultipleRange).toBeNull()
    })

    it('should include source data in the result', () => {
      const result = calculateMultipleRange(10.0, 3.0, baseAdj, 4)

      expect(result.sources.comparableCount).toBe(4)
      expect(result.sources.baseEbitdaMultiple).toBe(10.0)
      expect(result.sources.baseRevenueMultiple).toBe(3.0)
      expect(result.sources.spreadFactor).toBeGreaterThan(0)
    })

    it('should enforce minimum floor on ranges', () => {
      // With extreme negative adjustment, ranges should not go below floor
      const extremeAdj: AdjustmentResult = {
        adjustments: [],
        totalAdjustment: -0.70,
        adjustmentMultiplier: 0.3,
      }

      const result = calculateMultipleRange(2.0, 0.5, extremeAdj, 1)

      // EBITDA floor is 0.5, Revenue floor is 0.1
      expect(result.ebitdaMultipleRange!.low).toBeGreaterThanOrEqual(0.5)
      expect(result.revenueMultipleRange!.low).toBeGreaterThanOrEqual(0.1)
    })

    it('should have low < mid < high ordering', () => {
      const result = calculateMultipleRange(10.0, 3.0, baseAdj, 3)

      expect(result.ebitdaMultipleRange!.low).toBeLessThanOrEqual(result.ebitdaMultipleRange!.mid)
      expect(result.ebitdaMultipleRange!.mid).toBeLessThanOrEqual(result.ebitdaMultipleRange!.high)
      expect(result.revenueMultipleRange!.low).toBeLessThanOrEqual(result.revenueMultipleRange!.mid)
      expect(result.revenueMultipleRange!.mid).toBeLessThanOrEqual(result.revenueMultipleRange!.high)
    })
  })

  // ---------------------------------------------------------------------------
  // Spread Factor
  // ---------------------------------------------------------------------------
  describe('calculateSpreadFactor()', () => {
    it('should return 0.15 for 5+ comparables', () => {
      expect(calculateSpreadFactor(5)).toBe(0.15)
      expect(calculateSpreadFactor(8)).toBe(0.15)
    })

    it('should return 0.25 for 3-4 comparables', () => {
      expect(calculateSpreadFactor(3)).toBe(0.25)
      expect(calculateSpreadFactor(4)).toBe(0.25)
    })

    it('should return 0.35 for 1-2 comparables', () => {
      expect(calculateSpreadFactor(1)).toBe(0.35)
      expect(calculateSpreadFactor(2)).toBe(0.35)
    })

    it('should return 0.40 for 0 comparables', () => {
      expect(calculateSpreadFactor(0)).toBe(0.40)
    })

    it('should widen spread for high dispersion', () => {
      const highDispersion = [
        { metrics: { evToEbitda: 5, evToRevenue: null } },
        { metrics: { evToEbitda: 20, evToRevenue: null } },
      ]
      const spread = calculateSpreadFactor(2, highDispersion)
      expect(spread).toBeGreaterThan(0.35) // Base for 2 comps is 0.35
    })

    it('should not widen spread for low dispersion', () => {
      const lowDispersion = [
        { metrics: { evToEbitda: 10, evToRevenue: null } },
        { metrics: { evToEbitda: 11, evToRevenue: null } },
      ]
      const spread = calculateSpreadFactor(2, lowDispersion)
      expect(spread).toBe(0.35) // Base for 2 comps, no widening
    })

    it('should cap spread at 0.50', () => {
      const extremeDispersion = [
        { metrics: { evToEbitda: 2, evToRevenue: null } },
        { metrics: { evToEbitda: 50, evToRevenue: null } },
      ]
      const spread = calculateSpreadFactor(1, extremeDispersion)
      expect(spread).toBeLessThanOrEqual(0.50)
    })
  })

  // ---------------------------------------------------------------------------
  // Round Multiple
  // ---------------------------------------------------------------------------
  describe('roundMultiple()', () => {
    it('should round to 1 decimal place', () => {
      expect(roundMultiple(10.123)).toBe(10.1)
      expect(roundMultiple(10.15)).toBe(10.2) // Banker rounding may vary, but Math.round gives 10.2
      expect(roundMultiple(10.0)).toBe(10.0)
    })
  })

  // ---------------------------------------------------------------------------
  // Integration: Full Pipeline
  // ---------------------------------------------------------------------------
  describe('Full Pipeline Integration', () => {
    it('should produce defensible results for a typical SMB SaaS company', () => {
      const profile = makeAdjustmentProfile({
        revenue: 3_000_000,
        revenueSizeCategory: 'FROM_1M_TO_3M',
        revenueGrowthRate: 0.25,
        ebitdaMargin: 0.22,
        topCustomerConcentration: 0.15,
        transferabilityScore: 0.65,
        revenueModel: 'SUBSCRIPTION_SAAS',
      })

      const adjustments = adjustMultiples(profile)

      // Should have: size discount, growth premium, margin premium, owner dependency, SaaS premium
      const factors = adjustments.adjustments.map((a) => a.factor)
      expect(factors).toContain('size_discount')
      expect(factors).toContain('growth_adjustment')
      expect(factors).toContain('margin_adjustment')
      expect(factors).toContain('owner_dependency')
      expect(factors).toContain('recurring_revenue')

      // Net adjustment should be positive for a growing SaaS company
      // Size: -18%, Growth: +12%, Margin: +8%, Owner: ~-9%, SaaS: +25% = ~+18%
      expect(adjustments.adjustmentMultiplier).toBeGreaterThan(1.0)

      // Apply to typical public SaaS comps (EV/EBITDA ~15x, EV/Rev ~5x)
      const rangeResult = calculateMultipleRange(15.0, 5.0, adjustments, 4)

      // EBITDA range should be reasonable for a $3M SMB SaaS
      expect(rangeResult.ebitdaMultipleRange).not.toBeNull()
      expect(rangeResult.ebitdaMultipleRange!.low).toBeGreaterThanOrEqual(3)
      expect(rangeResult.ebitdaMultipleRange!.high).toBeLessThanOrEqual(30)

      // Revenue range should be reasonable
      expect(rangeResult.revenueMultipleRange).not.toBeNull()
      expect(rangeResult.revenueMultipleRange!.low).toBeGreaterThanOrEqual(1)
      expect(rangeResult.revenueMultipleRange!.high).toBeLessThanOrEqual(15)
    })

    it('should produce conservative results for a traditional services company', () => {
      const profile = makeAdjustmentProfile({
        revenue: 1_500_000,
        revenueSizeCategory: 'FROM_1M_TO_3M',
        revenueGrowthRate: 0.03,
        ebitdaMargin: 0.12,
        topCustomerConcentration: 0.35,
        transferabilityScore: 0.30,
        revenueModel: 'PROJECT_BASED',
      })

      const adjustments = adjustMultiples(profile)

      // Net adjustment should be significantly negative
      // Size: -18%, Growth: 0%, Margin: -8%, Single Customer: -20%, Owner: -17.5%, Project: -5%
      expect(adjustments.adjustmentMultiplier).toBeLessThan(1.0)

      // Apply to typical service company comps (EV/EBITDA ~8x)
      const rangeResult = calculateMultipleRange(8.0, 1.5, adjustments, 3)

      expect(rangeResult.ebitdaMultipleRange).not.toBeNull()
      // Adjusted multiple should be significantly below 8x
      expect(rangeResult.ebitdaMultipleRange!.mid).toBeLessThan(8.0)
      // But still positive and reasonable for an SMB
      expect(rangeResult.ebitdaMultipleRange!.low).toBeGreaterThan(0.5)
    })

    it('should produce audit trail with all adjustment explanations', () => {
      const profile = makeAdjustmentProfile({
        revenueSizeCategory: 'FROM_3M_TO_10M',
        revenueGrowthRate: 0.20,
        ebitdaMargin: 0.25,
        transferabilityScore: 0.6,
        revenueModel: 'RECURRING_CONTRACTS',
      })

      const adjustments = adjustMultiples(profile)
      const rangeResult = calculateMultipleRange(12.0, 4.0, adjustments, 4)

      // Every adjustment should have an explanation
      for (const adj of rangeResult.adjustments.adjustments) {
        expect(adj.explanation.length).toBeGreaterThan(20)
        expect(adj.factor).toBeTruthy()
        expect(adj.name).toBeTruthy()
        expect(typeof adj.impact).toBe('number')
        expect(typeof adj.enabled).toBe('boolean')
        expect(['size', 'growth', 'profitability', 'risk', 'quality']).toContain(adj.category)
      }

      // Sources should be fully populated
      expect(rangeResult.sources.comparableCount).toBe(4)
      expect(rangeResult.sources.baseEbitdaMultiple).toBe(12.0)
      expect(rangeResult.sources.baseRevenueMultiple).toBe(4.0)
      expect(rangeResult.sources.spreadFactor).toBeGreaterThan(0)
    })
  })
})
