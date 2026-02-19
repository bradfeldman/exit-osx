import { describe, it, expect } from 'vitest'
import {
  recommendPlaybooks,
  type RecommendationInputs,
  type DRSCategoryInput,
  type RiskDiscountInput,
  type QualityAdjustmentInput,
} from '@/lib/playbook/playbook-recommendations'
import { playbookDefinitions } from '../../prisma/seed-data/playbook-definitions'

// =============================================================================
// Test Helpers
// =============================================================================

function makeInputs(
  overrides: Partial<RecommendationInputs> = {}
): RecommendationInputs {
  return {
    drsCategories: overrides.drsCategories ?? [
      { category: 'FINANCIAL', score: 0.7, weight: 0.25 },
      { category: 'TRANSFERABILITY', score: 0.7, weight: 0.20 },
      { category: 'OPERATIONAL', score: 0.7, weight: 0.20 },
      { category: 'MARKET', score: 0.7, weight: 0.15 },
      { category: 'LEGAL_TAX', score: 0.7, weight: 0.10 },
      { category: 'PERSONAL', score: 0.7, weight: 0.10 },
    ],
    riskDiscounts: overrides.riskDiscounts ?? [],
    qualityAdjustments: overrides.qualityAdjustments ?? [],
    companyProfile: overrides.companyProfile ?? {
      adjustedEbitda: 1_000_000,
      annualRevenue: 5_000_000,
    },
    activePlaybookSlugs: overrides.activePlaybookSlugs ?? [],
  }
}

// =============================================================================
// Trigger Weight Validation
// =============================================================================

describe('Playbook definitions', () => {
  it('should have trigger weights summing to 1.0 for every playbook', () => {
    for (const playbook of playbookDefinitions) {
      const weightSum = playbook.triggers.reduce((sum, t) => sum + t.weight, 0)
      expect(weightSum).toBeCloseTo(1.0, 5, `${playbook.slug} triggers sum to ${weightSum}`)
    }
  })

  it('should have 44 playbooks defined', () => {
    expect(playbookDefinitions).toHaveLength(44)
  })

  it('should have unique slugs', () => {
    const slugs = playbookDefinitions.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('should have unique display orders', () => {
    const orders = playbookDefinitions.map((p) => p.displayOrder)
    expect(new Set(orders).size).toBe(orders.length)
  })
})

// =============================================================================
// Recommendation Engine
// =============================================================================

describe('recommendPlaybooks', () => {
  it('should return all 44 playbooks ranked', () => {
    const result = recommendPlaybooks(makeInputs())
    expect(result.recommendations).toHaveLength(44)
  })

  it('should mark exactly 3 as recommended when none are active', () => {
    const result = recommendPlaybooks(makeInputs())
    const recommended = result.recommendations.filter((r) => r.isRecommended)
    expect(recommended).toHaveLength(3)
  })

  it('should rank owner dependency playbooks highest when owner dependence signals are strong', () => {
    const inputs = makeInputs({
      drsCategories: [
        { category: 'FINANCIAL', score: 0.9, weight: 0.25 },
        { category: 'TRANSFERABILITY', score: 0.1, weight: 0.20 }, // very low = big gap
        { category: 'OPERATIONAL', score: 0.9, weight: 0.20 },
        { category: 'MARKET', score: 0.9, weight: 0.15 },
        { category: 'LEGAL_TAX', score: 0.9, weight: 0.10 },
        { category: 'PERSONAL', score: 0.9, weight: 0.10 },
      ],
      riskDiscounts: [
        { name: 'Key-Person Risk', rate: 0.25, explanation: 'Owner is critical' },
      ],
      qualityAdjustments: [
        { factor: 'owner_dependency', name: 'Owner Dependency', impact: -0.25, category: 'risk' },
      ],
    })

    const result = recommendPlaybooks(inputs)
    const top3Slugs = result.recommendations
      .filter((r) => r.isRecommended)
      .map((r) => r.playbook.slug)

    // All three owner-dependence playbooks should be in top 3
    expect(top3Slugs).toContain('owner-dependency-reduction')
    expect(top3Slugs).toContain('management-team-bench-strength')
    expect(top3Slugs).toContain('key-employee-retention')
  })

  it('should rank customer risk playbooks highest when customer concentration signals are strong', () => {
    const inputs = makeInputs({
      drsCategories: [
        { category: 'FINANCIAL', score: 0.9, weight: 0.25 },
        { category: 'TRANSFERABILITY', score: 0.9, weight: 0.20 },
        { category: 'OPERATIONAL', score: 0.9, weight: 0.20 },
        { category: 'MARKET', score: 0.9, weight: 0.15 },
        { category: 'LEGAL_TAX', score: 0.9, weight: 0.10 },
        { category: 'PERSONAL', score: 0.9, weight: 0.10 },
      ],
      riskDiscounts: [
        { name: 'Customer Concentration (Single)', rate: 0.15, explanation: 'High single customer' },
        { name: 'Customer Concentration (Top 3)', rate: 0.10, explanation: 'Top 3 concentrated' },
      ],
      qualityAdjustments: [
        { factor: 'customer_concentration_single', name: 'Customer Concentration', impact: -0.15, category: 'risk' },
        { factor: 'customer_concentration_top3', name: 'Customer Concentration Top 3', impact: -0.10, category: 'risk' },
      ],
    })

    const result = recommendPlaybooks(inputs)
    const top3Slugs = result.recommendations
      .filter((r) => r.isRecommended)
      .map((r) => r.playbook.slug)

    expect(top3Slugs).toContain('customer-concentration-de-risking')
  })

  it('should produce low relevance scores when no weaknesses exist', () => {
    const inputs = makeInputs({
      drsCategories: [
        { category: 'FINANCIAL', score: 1.0, weight: 0.25 },
        { category: 'TRANSFERABILITY', score: 1.0, weight: 0.20 },
        { category: 'OPERATIONAL', score: 1.0, weight: 0.20 },
        { category: 'MARKET', score: 1.0, weight: 0.15 },
        { category: 'LEGAL_TAX', score: 1.0, weight: 0.10 },
        { category: 'PERSONAL', score: 1.0, weight: 0.10 },
      ],
      riskDiscounts: [],
      qualityAdjustments: [],
    })

    const result = recommendPlaybooks(inputs)

    // All relevance scores should be 0 (perfect scores, no gaps)
    for (const rec of result.recommendations) {
      expect(rec.relevanceScore).toBe(0)
    }
  })

  it('should scale impact by EBITDA — 2x EBITDA = 2x impact', () => {
    const base = makeInputs({
      companyProfile: { adjustedEbitda: 1_000_000, annualRevenue: 5_000_000 },
    })
    const doubled = makeInputs({
      companyProfile: { adjustedEbitda: 2_000_000, annualRevenue: 10_000_000 },
    })

    const baseResult = recommendPlaybooks(base)
    const doubledResult = recommendPlaybooks(doubled)

    // Same playbook, same position — impact should be 2x
    for (let i = 0; i < baseResult.recommendations.length; i++) {
      const baseRec = baseResult.recommendations[i]
      const dblRec = doubledResult.recommendations[i]
      expect(dblRec.estimatedImpactLow).toBe(baseRec.estimatedImpactLow * 2)
      expect(dblRec.estimatedImpactHigh).toBe(baseRec.estimatedImpactHigh * 2)
    }
  })

  it('should deprioritize active playbooks out of top 3', () => {
    const inputs = makeInputs({
      drsCategories: [
        { category: 'FINANCIAL', score: 0.9, weight: 0.25 },
        { category: 'TRANSFERABILITY', score: 0.1, weight: 0.20 },
        { category: 'OPERATIONAL', score: 0.9, weight: 0.20 },
        { category: 'MARKET', score: 0.9, weight: 0.15 },
        { category: 'LEGAL_TAX', score: 0.9, weight: 0.10 },
        { category: 'PERSONAL', score: 0.9, weight: 0.10 },
      ],
      riskDiscounts: [
        { name: 'Key-Person Risk', rate: 0.25, explanation: 'Owner critical' },
      ],
      qualityAdjustments: [
        { factor: 'owner_dependency', name: 'Owner Dependency', impact: -0.25, category: 'risk' },
      ],
      // Mark the top playbook as active
      activePlaybookSlugs: ['owner-dependency-reduction'],
    })

    const result = recommendPlaybooks(inputs)
    const recommended = result.recommendations.filter((r) => r.isRecommended)
    const recommendedSlugs = recommended.map((r) => r.playbook.slug)

    // Active playbook should NOT be marked as recommended
    expect(recommendedSlugs).not.toContain('owner-dependency-reduction')
    // Should still have 3 recommendations
    expect(recommended).toHaveLength(3)
  })

  it('should handle all zeros/nulls gracefully', () => {
    const inputs = makeInputs({
      drsCategories: [],
      riskDiscounts: [],
      qualityAdjustments: [],
      companyProfile: { adjustedEbitda: 0, annualRevenue: 0 },
    })

    const result = recommendPlaybooks(inputs)

    // Should still return all 44 playbooks
    expect(result.recommendations).toHaveLength(44)

    // All relevance scores should be 0
    for (const rec of result.recommendations) {
      expect(rec.relevanceScore).toBe(0)
    }

    // Impact should be 0 (EBITDA is 0)
    for (const rec of result.recommendations) {
      expect(rec.estimatedImpactLow).toBe(0)
      expect(rec.estimatedImpactHigh).toBe(0)
    }
  })

  it('should handle negative EBITDA without crashing', () => {
    const inputs = makeInputs({
      companyProfile: { adjustedEbitda: -500_000, annualRevenue: 2_000_000 },
    })

    const result = recommendPlaybooks(inputs)

    // Should still return results, all impacts zero-floored
    expect(result.recommendations).toHaveLength(44)
    for (const rec of result.recommendations) {
      expect(rec.estimatedImpactLow).toBeGreaterThanOrEqual(0)
      expect(rec.estimatedImpactHigh).toBeGreaterThanOrEqual(0)
    }
  })

  it('should return a valid topCategory', () => {
    const inputs = makeInputs({
      drsCategories: [
        { category: 'FINANCIAL', score: 0.1, weight: 0.25 },
        { category: 'TRANSFERABILITY', score: 0.9, weight: 0.20 },
        { category: 'OPERATIONAL', score: 0.9, weight: 0.20 },
        { category: 'MARKET', score: 0.9, weight: 0.15 },
        { category: 'LEGAL_TAX', score: 0.9, weight: 0.10 },
        { category: 'PERSONAL', score: 0.9, weight: 0.10 },
      ],
      riskDiscounts: [
        { name: 'Documentation Quality', rate: 0.15, explanation: 'Poor docs' },
      ],
    })

    const result = recommendPlaybooks(inputs)
    expect(result.topCategory).toBeTruthy()
    // topCategory should be one of the defined categories
    const validCategories = [
      'PERSONAL',
      'FINANCIAL',
      'OPERATIONAL',
      'LEGAL',
      'MARKET_GROWTH',
      'DEAL_PREP',
    ]
    expect(validCategories).toContain(result.topCategory)
  })

  it('should calculate totalAddressableImpact from recommended playbooks only', () => {
    const inputs = makeInputs({
      companyProfile: { adjustedEbitda: 1_000_000, annualRevenue: 5_000_000 },
    })

    const result = recommendPlaybooks(inputs)
    const recommended = result.recommendations.filter((r) => r.isRecommended)

    const expectedLow = recommended.reduce(
      (sum, r) => sum + r.estimatedImpactLow,
      0
    )
    const expectedHigh = recommended.reduce(
      (sum, r) => sum + r.estimatedImpactHigh,
      0
    )

    expect(result.totalAddressableImpact.low).toBe(expectedLow)
    expect(result.totalAddressableImpact.high).toBe(expectedHigh)
  })

  it('should include signal breakdown for each recommendation', () => {
    const inputs = makeInputs({
      riskDiscounts: [
        { name: 'Key-Person Risk', rate: 0.20, explanation: 'High owner involvement' },
      ],
    })

    const result = recommendPlaybooks(inputs)

    // Every recommendation should have a signal breakdown
    for (const rec of result.recommendations) {
      expect(rec.signalBreakdown.length).toBeGreaterThan(0)
      // Each breakdown entry should have required fields
      for (const signal of rec.signalBreakdown) {
        expect(signal.source).toBeTruthy()
        expect(signal.signal).toBeTruthy()
        expect(typeof signal.weight).toBe('number')
        expect(typeof signal.rawStrength).toBe('number')
        expect(typeof signal.contribution).toBe('number')
      }
    }
  })

  it('should handle RSS prefix matching for Customer Concentration variants', () => {
    const inputs = makeInputs({
      riskDiscounts: [
        { name: 'Customer Concentration (Single)', rate: 0.15, explanation: 'High single customer' },
      ],
    })

    const result = recommendPlaybooks(inputs)
    const deRisk = result.recommendations.find(
      (r) => r.playbook.slug === 'customer-concentration-de-risking'
    )

    // The "Customer Concentration" trigger should match "Customer Concentration (Single)"
    expect(deRisk).toBeDefined()
    const rssSignal = deRisk!.signalBreakdown.find(
      (s) => s.source === 'RSS'
    )
    expect(rssSignal).toBeDefined()
    expect(rssSignal!.rawStrength).toBeGreaterThan(0)
  })

  it('should handle BQS prefix matching for customer_concentration variants', () => {
    const inputs = makeInputs({
      qualityAdjustments: [
        { factor: 'customer_concentration_single', name: 'Customer Concentration', impact: -0.15, category: 'risk' },
      ],
    })

    const result = recommendPlaybooks(inputs)
    const deRisk = result.recommendations.find(
      (r) => r.playbook.slug === 'customer-concentration-de-risking'
    )

    expect(deRisk).toBeDefined()
    const bqsSignal = deRisk!.signalBreakdown.find(
      (s) => s.source === 'BQS'
    )
    expect(bqsSignal).toBeDefined()
    expect(bqsSignal!.rawStrength).toBeGreaterThan(0)
  })

  it('should ignore positive BQS adjustments (premiums are not problems)', () => {
    const inputs = makeInputs({
      qualityAdjustments: [
        { factor: 'recurring_revenue', name: 'Recurring Revenue', impact: 0.25, category: 'quality' },
      ],
    })

    const result = recommendPlaybooks(inputs)
    // Playbooks triggered by recurring_revenue BQS should have 0 BQS signal
    const revenueQuality = result.recommendations.find(
      (r) => r.playbook.slug === 'revenue-quality-analysis'
    )
    expect(revenueQuality).toBeDefined()
    const bqsSignal = revenueQuality!.signalBreakdown.find(
      (s) => s.source === 'BQS' && s.signal === 'recurring_revenue'
    )
    expect(bqsSignal).toBeDefined()
    expect(bqsSignal!.rawStrength).toBe(0) // positive impact → not a problem
  })
})
