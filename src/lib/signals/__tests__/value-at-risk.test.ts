import { describe, it, expect } from 'vitest'
import {
  getWeightedImpact,
  getRawImpact,
  extractTopThreats,
  aggregateByCategory,
  calculateVarTrend,
  calculateValueAtRisk,
  BRI_CATEGORIES,
  BRI_CATEGORY_LABELS,
  TREND_STABILITY_THRESHOLD,
  type ValueAtRiskSignal,
} from '../value-at-risk'
import { CONFIDENCE_MULTIPLIERS } from '../confidence-scoring'
import type { ConfidenceLevel, SignalSeverity, BriCategory } from '@prisma/client'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeVarSignal(overrides: Partial<ValueAtRiskSignal> = {}): ValueAtRiskSignal {
  return {
    id: overrides.id ?? `signal-${Math.random().toString(36).slice(2, 8)}`,
    title: overrides.title ?? 'Test Signal',
    severity: overrides.severity ?? 'MEDIUM',
    confidence: overrides.confidence ?? 'CONFIDENT',
    // estimatedValueImpact and category use 'in' check because null is a valid explicit value
    estimatedValueImpact: 'estimatedValueImpact' in overrides ? overrides.estimatedValueImpact! : null,
    category: 'category' in overrides ? overrides.category! : 'FINANCIAL',
    createdAt: overrides.createdAt ?? new Date('2025-06-01'),
  }
}

// ---------------------------------------------------------------------------
// getWeightedImpact
// ---------------------------------------------------------------------------

describe('getWeightedImpact', () => {
  it('returns 0 for null estimatedValueImpact', () => {
    const signal = makeVarSignal({ estimatedValueImpact: null })
    expect(getWeightedImpact(signal)).toBe(0)
  })

  it('returns 0 for zero estimatedValueImpact', () => {
    const signal = makeVarSignal({ estimatedValueImpact: 0 })
    expect(getWeightedImpact(signal)).toBe(0)
  })

  it('applies UNCERTAIN multiplier (0.5x)', () => {
    const signal = makeVarSignal({ estimatedValueImpact: 100000, confidence: 'UNCERTAIN' })
    expect(getWeightedImpact(signal)).toBe(50000)
  })

  it('applies SOMEWHAT_CONFIDENT multiplier (0.7x)', () => {
    const signal = makeVarSignal({ estimatedValueImpact: 100000, confidence: 'SOMEWHAT_CONFIDENT' })
    expect(getWeightedImpact(signal)).toBe(70000)
  })

  it('applies CONFIDENT multiplier (0.85x)', () => {
    const signal = makeVarSignal({ estimatedValueImpact: 100000, confidence: 'CONFIDENT' })
    expect(getWeightedImpact(signal)).toBe(85000)
  })

  it('applies VERIFIED multiplier (1.0x)', () => {
    const signal = makeVarSignal({ estimatedValueImpact: 100000, confidence: 'VERIFIED' })
    expect(getWeightedImpact(signal)).toBe(100000)
  })

  it('uses absolute value for negative impacts', () => {
    const signal = makeVarSignal({ estimatedValueImpact: -75000, confidence: 'VERIFIED' })
    expect(getWeightedImpact(signal)).toBe(75000)
  })

  it('uses absolute value for negative impacts with confidence discount', () => {
    const signal = makeVarSignal({ estimatedValueImpact: -100000, confidence: 'UNCERTAIN' })
    expect(getWeightedImpact(signal)).toBe(50000)
  })

  it('applies NOT_APPLICABLE multiplier (1.0x, same as VERIFIED)', () => {
    const signal = makeVarSignal({ estimatedValueImpact: 100000, confidence: 'NOT_APPLICABLE' })
    expect(getWeightedImpact(signal)).toBe(100000)
  })
})

// ---------------------------------------------------------------------------
// getRawImpact
// ---------------------------------------------------------------------------

describe('getRawImpact', () => {
  it('returns 0 for null estimatedValueImpact', () => {
    expect(getRawImpact(makeVarSignal({ estimatedValueImpact: null }))).toBe(0)
  })

  it('returns 0 for zero estimatedValueImpact', () => {
    expect(getRawImpact(makeVarSignal({ estimatedValueImpact: 0 }))).toBe(0)
  })

  it('returns absolute value for positive impact', () => {
    expect(getRawImpact(makeVarSignal({ estimatedValueImpact: 50000 }))).toBe(50000)
  })

  it('returns absolute value for negative impact', () => {
    expect(getRawImpact(makeVarSignal({ estimatedValueImpact: -50000 }))).toBe(50000)
  })
})

// ---------------------------------------------------------------------------
// extractTopThreats
// ---------------------------------------------------------------------------

describe('extractTopThreats', () => {
  it('returns empty array for empty input', () => {
    expect(extractTopThreats([])).toEqual([])
  })

  it('returns empty array when all signals have null impact', () => {
    const signals = [
      makeVarSignal({ estimatedValueImpact: null }),
      makeVarSignal({ estimatedValueImpact: null }),
    ]
    expect(extractTopThreats(signals)).toEqual([])
  })

  it('returns empty array when all signals have zero impact', () => {
    const signals = [
      makeVarSignal({ estimatedValueImpact: 0 }),
    ]
    expect(extractTopThreats(signals)).toEqual([])
  })

  it('returns up to 3 threats by default', () => {
    const signals = [
      makeVarSignal({ id: 'a', estimatedValueImpact: 10000 }),
      makeVarSignal({ id: 'b', estimatedValueImpact: 20000 }),
      makeVarSignal({ id: 'c', estimatedValueImpact: 30000 }),
      makeVarSignal({ id: 'd', estimatedValueImpact: 40000 }),
    ]
    const threats = extractTopThreats(signals)
    expect(threats.length).toBe(3)
  })

  it('sorts threats by weighted impact descending', () => {
    const signals = [
      makeVarSignal({ id: 'low', estimatedValueImpact: 10000, confidence: 'VERIFIED' }),
      makeVarSignal({ id: 'high', estimatedValueImpact: 100000, confidence: 'VERIFIED' }),
      makeVarSignal({ id: 'mid', estimatedValueImpact: 50000, confidence: 'VERIFIED' }),
    ]
    const threats = extractTopThreats(signals)
    expect(threats[0].signalId).toBe('high')
    expect(threats[1].signalId).toBe('mid')
    expect(threats[2].signalId).toBe('low')
  })

  it('ranks by WEIGHTED impact, not raw impact (confidence matters)', () => {
    const signals = [
      makeVarSignal({ id: 'big-uncertain', estimatedValueImpact: 200000, confidence: 'UNCERTAIN' }), // 100000 weighted
      makeVarSignal({ id: 'small-verified', estimatedValueImpact: 120000, confidence: 'VERIFIED' }), // 120000 weighted
    ]
    const threats = extractTopThreats(signals)
    expect(threats[0].signalId).toBe('small-verified')
    expect(threats[1].signalId).toBe('big-uncertain')
  })

  it('includes correct fields in each threat entry', () => {
    const signal = makeVarSignal({
      id: 'test-id',
      title: 'Financial Risk',
      severity: 'HIGH',
      confidence: 'CONFIDENT',
      estimatedValueImpact: 100000,
      category: 'FINANCIAL',
    })
    const threats = extractTopThreats([signal])
    expect(threats[0]).toEqual({
      signalId: 'test-id',
      title: 'Financial Risk',
      severity: 'HIGH',
      confidence: 'CONFIDENT',
      rawImpact: 100000,
      weightedImpact: 85000,
      category: 'FINANCIAL',
      categoryLabel: 'Financial Health',
    })
  })

  it('sets categoryLabel to null for uncategorized signals', () => {
    const signal = makeVarSignal({
      estimatedValueImpact: 50000,
      category: null,
    })
    const threats = extractTopThreats([signal])
    expect(threats[0].categoryLabel).toBeNull()
  })

  it('respects custom limit parameter', () => {
    const signals = Array.from({ length: 10 }, (_, i) =>
      makeVarSignal({ id: `s-${i}`, estimatedValueImpact: (i + 1) * 10000 })
    )
    const threats = extractTopThreats(signals, 5)
    expect(threats.length).toBe(5)
  })

  it('returns fewer than limit when fewer qualifying signals exist', () => {
    const signals = [
      makeVarSignal({ estimatedValueImpact: 50000 }),
      makeVarSignal({ estimatedValueImpact: null }),
    ]
    const threats = extractTopThreats(signals, 3)
    expect(threats.length).toBe(1)
  })

  it('excludes zero-impact signals from threats', () => {
    const signals = [
      makeVarSignal({ id: 'zero', estimatedValueImpact: 0 }),
      makeVarSignal({ id: 'nonzero', estimatedValueImpact: 10000 }),
    ]
    const threats = extractTopThreats(signals)
    expect(threats.length).toBe(1)
    expect(threats[0].signalId).toBe('nonzero')
  })
})

// ---------------------------------------------------------------------------
// aggregateByCategory
// ---------------------------------------------------------------------------

describe('aggregateByCategory', () => {
  it('returns all 6 BRI categories even with empty input', () => {
    const result = aggregateByCategory([])
    expect(result.length).toBe(6)
    for (const cat of BRI_CATEGORIES) {
      const entry = result.find(r => r.category === cat)
      expect(entry).toBeDefined()
      expect(entry!.signalCount).toBe(0)
      expect(entry!.rawValueAtRisk).toBe(0)
      expect(entry!.weightedValueAtRisk).toBe(0)
    }
  })

  it('correctly aggregates signals into their categories', () => {
    const signals = [
      makeVarSignal({ category: 'FINANCIAL', estimatedValueImpact: 50000, confidence: 'VERIFIED' }),
      makeVarSignal({ category: 'FINANCIAL', estimatedValueImpact: 30000, confidence: 'VERIFIED' }),
      makeVarSignal({ category: 'OPERATIONAL', estimatedValueImpact: 20000, confidence: 'VERIFIED' }),
    ]
    const result = aggregateByCategory(signals)

    const financial = result.find(r => r.category === 'FINANCIAL')!
    expect(financial.signalCount).toBe(2)
    expect(financial.rawValueAtRisk).toBe(80000)
    expect(financial.weightedValueAtRisk).toBe(80000)

    const operational = result.find(r => r.category === 'OPERATIONAL')!
    expect(operational.signalCount).toBe(1)
    expect(operational.rawValueAtRisk).toBe(20000)
    expect(operational.weightedValueAtRisk).toBe(20000)

    const market = result.find(r => r.category === 'MARKET')!
    expect(market.signalCount).toBe(0)
    expect(market.rawValueAtRisk).toBe(0)
  })

  it('applies confidence weighting per signal within categories', () => {
    const signals = [
      makeVarSignal({ category: 'MARKET', estimatedValueImpact: 100000, confidence: 'UNCERTAIN' }),
      makeVarSignal({ category: 'MARKET', estimatedValueImpact: 100000, confidence: 'VERIFIED' }),
    ]
    const result = aggregateByCategory(signals)
    const market = result.find(r => r.category === 'MARKET')!
    expect(market.rawValueAtRisk).toBe(200000)
    expect(market.weightedValueAtRisk).toBe(150000) // 50000 + 100000
  })

  it('skips signals with null category in per-category breakdown', () => {
    const signals = [
      makeVarSignal({ category: null, estimatedValueImpact: 100000, confidence: 'VERIFIED' }),
      makeVarSignal({ category: 'FINANCIAL', estimatedValueImpact: 50000, confidence: 'VERIFIED' }),
    ]
    const result = aggregateByCategory(signals)
    const total = result.reduce((sum, r) => sum + r.signalCount, 0)
    expect(total).toBe(1) // Only the FINANCIAL signal is counted
  })

  it('includes correct labels for each category', () => {
    const result = aggregateByCategory([])
    for (const entry of result) {
      expect(entry.label).toBe(BRI_CATEGORY_LABELS[entry.category])
    }
  })

  it('handles signals with null estimatedValueImpact (counted but $0 risk)', () => {
    const signals = [
      makeVarSignal({ category: 'LEGAL_TAX', estimatedValueImpact: null }),
      makeVarSignal({ category: 'LEGAL_TAX', estimatedValueImpact: 25000, confidence: 'VERIFIED' }),
    ]
    const result = aggregateByCategory(signals)
    const legalTax = result.find(r => r.category === 'LEGAL_TAX')!
    expect(legalTax.signalCount).toBe(2)
    expect(legalTax.rawValueAtRisk).toBe(25000)
    expect(legalTax.weightedValueAtRisk).toBe(25000)
  })
})

// ---------------------------------------------------------------------------
// calculateVarTrend
// ---------------------------------------------------------------------------

describe('calculateVarTrend', () => {
  it('returns null when previous baseline is null', () => {
    expect(calculateVarTrend(100000, null)).toBeNull()
  })

  it('returns "increasing" when VaR grew by more than 5%', () => {
    const result = calculateVarTrend(110000, 100000)
    expect(result).not.toBeNull()
    expect(result!.direction).toBe('increasing')
    expect(result!.absoluteChange).toBe(10000)
    expect(result!.percentageChange).toBeCloseTo(0.1)
  })

  it('returns "decreasing" when VaR dropped by more than 5%', () => {
    const result = calculateVarTrend(90000, 100000)
    expect(result).not.toBeNull()
    expect(result!.direction).toBe('decreasing')
    expect(result!.absoluteChange).toBe(-10000)
    expect(result!.percentageChange).toBeCloseTo(-0.1)
  })

  it('returns "stable" when change is within 5% threshold', () => {
    const result = calculateVarTrend(103000, 100000)
    expect(result).not.toBeNull()
    expect(result!.direction).toBe('stable')
    expect(result!.absoluteChange).toBe(3000)
    expect(result!.percentageChange).toBeCloseTo(0.03)
  })

  it('returns "stable" when both current and previous are 0', () => {
    const result = calculateVarTrend(0, 0)
    expect(result).not.toBeNull()
    expect(result!.direction).toBe('stable')
    expect(result!.percentageChange).toBe(0)
  })

  it('returns "increasing" when going from 0 to any positive value', () => {
    const result = calculateVarTrend(50000, 0)
    expect(result).not.toBeNull()
    expect(result!.direction).toBe('increasing')
    expect(result!.percentageChange).toBe(1)
  })

  it('returns "decreasing" when going from positive to 0', () => {
    const result = calculateVarTrend(0, 100000)
    expect(result).not.toBeNull()
    expect(result!.direction).toBe('decreasing')
    expect(result!.absoluteChange).toBe(-100000)
    expect(result!.percentageChange).toBe(-1)
  })

  it('exactly at threshold boundary (5%) is stable', () => {
    // 5% of 100000 = 5000 -> percentage = 0.05, which is NOT > 0.05, so stable
    const result = calculateVarTrend(105000, 100000)
    expect(result!.direction).toBe('stable')
  })

  it('just over threshold boundary is increasing', () => {
    const result = calculateVarTrend(105001, 100000)
    expect(result!.direction).toBe('increasing')
  })
})

// ---------------------------------------------------------------------------
// calculateValueAtRisk (full pipeline)
// ---------------------------------------------------------------------------

describe('calculateValueAtRisk', () => {
  it('returns zeroed result for empty signals', () => {
    const result = calculateValueAtRisk([])
    expect(result.totalValueAtRisk).toBe(0)
    expect(result.rawValueAtRisk).toBe(0)
    expect(result.signalCount).toBe(0)
    expect(result.topThreats).toEqual([])
    expect(result.byCategory.length).toBe(6)
    expect(result.trend).toBeNull()
  })

  it('calculates totalValueAtRisk as sum of confidence-weighted impacts', () => {
    const signals = [
      makeVarSignal({ estimatedValueImpact: 100000, confidence: 'UNCERTAIN' }),       // 50000
      makeVarSignal({ estimatedValueImpact: 100000, confidence: 'SOMEWHAT_CONFIDENT' }), // 70000
      makeVarSignal({ estimatedValueImpact: 100000, confidence: 'CONFIDENT' }),        // 85000
      makeVarSignal({ estimatedValueImpact: 100000, confidence: 'VERIFIED' }),         // 100000
    ]
    const result = calculateValueAtRisk(signals)
    expect(result.totalValueAtRisk).toBe(305000)
  })

  it('calculates rawValueAtRisk as sum of absolute raw impacts', () => {
    const signals = [
      makeVarSignal({ estimatedValueImpact: 100000, confidence: 'UNCERTAIN' }),
      makeVarSignal({ estimatedValueImpact: -50000, confidence: 'VERIFIED' }),
    ]
    const result = calculateValueAtRisk(signals)
    expect(result.rawValueAtRisk).toBe(150000) // |100000| + |-50000|
  })

  it('counts all signals including those with null impact', () => {
    const signals = [
      makeVarSignal({ estimatedValueImpact: 50000 }),
      makeVarSignal({ estimatedValueImpact: null }),
      makeVarSignal({ estimatedValueImpact: null }),
    ]
    const result = calculateValueAtRisk(signals)
    expect(result.signalCount).toBe(3)
  })

  it('includes top 3 threats by default', () => {
    const signals = [
      makeVarSignal({ id: 'a', estimatedValueImpact: 10000, confidence: 'VERIFIED' }),
      makeVarSignal({ id: 'b', estimatedValueImpact: 20000, confidence: 'VERIFIED' }),
      makeVarSignal({ id: 'c', estimatedValueImpact: 30000, confidence: 'VERIFIED' }),
      makeVarSignal({ id: 'd', estimatedValueImpact: 40000, confidence: 'VERIFIED' }),
    ]
    const result = calculateValueAtRisk(signals)
    expect(result.topThreats.length).toBe(3)
    expect(result.topThreats[0].signalId).toBe('d')
    expect(result.topThreats[1].signalId).toBe('c')
    expect(result.topThreats[2].signalId).toBe('b')
  })

  it('includes per-category breakdown for all 6 categories', () => {
    const signals = [
      makeVarSignal({ category: 'FINANCIAL', estimatedValueImpact: 50000, confidence: 'VERIFIED' }),
    ]
    const result = calculateValueAtRisk(signals)
    expect(result.byCategory.length).toBe(6)

    const financial = result.byCategory.find(c => c.category === 'FINANCIAL')!
    expect(financial.weightedValueAtRisk).toBe(50000)
    expect(financial.signalCount).toBe(1)

    // Other categories should be zero
    const market = result.byCategory.find(c => c.category === 'MARKET')!
    expect(market.weightedValueAtRisk).toBe(0)
    expect(market.signalCount).toBe(0)
  })

  it('includes trend when previousWeightedVaR is provided', () => {
    const signals = [
      makeVarSignal({ estimatedValueImpact: 100000, confidence: 'VERIFIED' }),
    ]
    const result = calculateValueAtRisk(signals, 80000)
    expect(result.trend).not.toBeNull()
    expect(result.trend!.direction).toBe('increasing')
    expect(result.trend!.absoluteChange).toBe(20000)
  })

  it('returns null trend when no previousWeightedVaR', () => {
    const signals = [makeVarSignal({ estimatedValueImpact: 100000, confidence: 'VERIFIED' })]
    const result = calculateValueAtRisk(signals, null)
    expect(result.trend).toBeNull()
  })

  it('respects custom topThreatsLimit', () => {
    const signals = Array.from({ length: 10 }, (_, i) =>
      makeVarSignal({ id: `s-${i}`, estimatedValueImpact: (i + 1) * 5000 })
    )
    const result = calculateValueAtRisk(signals, null, 5)
    expect(result.topThreats.length).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Business scenario tests
// ---------------------------------------------------------------------------

describe('business scenarios', () => {
  it('scenario: company with diverse risk across categories', () => {
    const signals = [
      // Financial: 2 signals, $200K raw
      makeVarSignal({ category: 'FINANCIAL', estimatedValueImpact: 150000, confidence: 'VERIFIED', severity: 'CRITICAL', title: 'Revenue concentration risk' }),
      makeVarSignal({ category: 'FINANCIAL', estimatedValueImpact: 50000, confidence: 'CONFIDENT', severity: 'HIGH', title: 'Margin compression' }),
      // Transferability: 1 signal, $100K raw
      makeVarSignal({ category: 'TRANSFERABILITY', estimatedValueImpact: 100000, confidence: 'SOMEWHAT_CONFIDENT', severity: 'HIGH', title: 'Owner dependency' }),
      // Operational: 1 signal, $75K raw
      makeVarSignal({ category: 'OPERATIONAL', estimatedValueImpact: 75000, confidence: 'UNCERTAIN', severity: 'MEDIUM', title: 'Process gaps' }),
    ]

    const result = calculateValueAtRisk(signals, 250000)

    // Total raw: 150K + 50K + 100K + 75K = 375K
    expect(result.rawValueAtRisk).toBe(375000)

    // Total weighted: 150K*1.0 + 50K*0.85 + 100K*0.7 + 75K*0.5
    // = 150000 + 42500 + 70000 + 37500 = 300000
    expect(result.totalValueAtRisk).toBe(300000)

    expect(result.signalCount).toBe(4)

    // Top 3 threats by weighted impact
    expect(result.topThreats[0].title).toBe('Revenue concentration risk') // 150K weighted
    expect(result.topThreats[1].title).toBe('Owner dependency')           // 70K weighted
    expect(result.topThreats[2].title).toBe('Margin compression')         // 42.5K weighted

    // Category breakdown
    const financial = result.byCategory.find(c => c.category === 'FINANCIAL')!
    expect(financial.signalCount).toBe(2)
    expect(financial.rawValueAtRisk).toBe(200000)
    expect(financial.weightedValueAtRisk).toBe(192500) // 150K + 42.5K

    // Trend: 300K current vs 250K previous = +20% -> increasing
    expect(result.trend!.direction).toBe('increasing')
    expect(result.trend!.absoluteChange).toBe(50000)
  })

  it('scenario: all signals uncertain vs all verified (confidence matters)', () => {
    const baseSignals = [
      { estimatedValueImpact: 100000, category: 'FINANCIAL' as BriCategory },
      { estimatedValueImpact: 100000, category: 'OPERATIONAL' as BriCategory },
      { estimatedValueImpact: 100000, category: 'MARKET' as BriCategory },
    ]

    const uncertainSignals = baseSignals.map(s =>
      makeVarSignal({ ...s, confidence: 'UNCERTAIN' })
    )
    const verifiedSignals = baseSignals.map(s =>
      makeVarSignal({ ...s, confidence: 'VERIFIED' })
    )

    const uncertainResult = calculateValueAtRisk(uncertainSignals)
    const verifiedResult = calculateValueAtRisk(verifiedSignals)

    // Same raw total
    expect(uncertainResult.rawValueAtRisk).toBe(300000)
    expect(verifiedResult.rawValueAtRisk).toBe(300000)

    // Different weighted totals
    expect(uncertainResult.totalValueAtRisk).toBe(150000)  // 300K * 0.5
    expect(verifiedResult.totalValueAtRisk).toBe(300000)   // 300K * 1.0

    // Weighted should always be <= raw
    expect(uncertainResult.totalValueAtRisk).toBeLessThanOrEqual(uncertainResult.rawValueAtRisk)
    expect(verifiedResult.totalValueAtRisk).toBeLessThanOrEqual(verifiedResult.rawValueAtRisk)
  })

  it('scenario: risk decreasing over time (signals resolved)', () => {
    // Current: only 1 small signal
    const signals = [
      makeVarSignal({ estimatedValueImpact: 25000, confidence: 'CONFIDENT' }), // 21250 weighted
    ]
    // Previous: was 150K weighted
    const result = calculateValueAtRisk(signals, 150000)

    expect(result.totalValueAtRisk).toBe(21250)
    expect(result.trend!.direction).toBe('decreasing')
    expect(result.trend!.absoluteChange).toBeLessThan(0)
  })

  it('scenario: company with no active risks (clean bill of health)', () => {
    const result = calculateValueAtRisk([], 50000)

    expect(result.totalValueAtRisk).toBe(0)
    expect(result.rawValueAtRisk).toBe(0)
    expect(result.signalCount).toBe(0)
    expect(result.topThreats).toEqual([])
    expect(result.trend!.direction).toBe('decreasing')
    expect(result.trend!.absoluteChange).toBe(-50000)
  })

  it('scenario: uncategorized signals contribute to total but not to category breakdown', () => {
    const signals = [
      makeVarSignal({ category: null, estimatedValueImpact: 100000, confidence: 'VERIFIED' }),
      makeVarSignal({ category: 'FINANCIAL', estimatedValueImpact: 50000, confidence: 'VERIFIED' }),
    ]
    const result = calculateValueAtRisk(signals)

    // Total includes all signals
    expect(result.totalValueAtRisk).toBe(150000)
    expect(result.signalCount).toBe(2)

    // Category total only includes categorized signals
    const categoryTotal = result.byCategory.reduce((sum, c) => sum + c.weightedValueAtRisk, 0)
    expect(categoryTotal).toBe(50000)

    // Top threats includes uncategorized
    expect(result.topThreats.length).toBe(2)
  })

  it('scenario: many signals across all categories', () => {
    const categories: BriCategory[] = ['FINANCIAL', 'TRANSFERABILITY', 'OPERATIONAL', 'MARKET', 'LEGAL_TAX', 'PERSONAL']
    const signals: ValueAtRiskSignal[] = []

    for (const cat of categories) {
      for (let i = 0; i < 3; i++) {
        signals.push(makeVarSignal({
          category: cat,
          estimatedValueImpact: 10000 * (i + 1),
          confidence: 'CONFIDENT',
        }))
      }
    }

    const result = calculateValueAtRisk(signals)

    // 6 categories x 3 signals each = 18 signals
    expect(result.signalCount).toBe(18)

    // Each category: (10K + 20K + 30K) = 60K raw, 51K weighted (60K * 0.85)
    for (const cat of result.byCategory) {
      expect(cat.signalCount).toBe(3)
      expect(cat.rawValueAtRisk).toBe(60000)
      expect(cat.weightedValueAtRisk).toBe(51000) // 60000 * 0.85
    }

    // Total: 18 * (avg 20K) * 0.85 = 306K
    expect(result.totalValueAtRisk).toBe(306000) // 6 * 51000
    expect(result.rawValueAtRisk).toBe(360000)   // 6 * 60000
  })
})

// ---------------------------------------------------------------------------
// Constants validation
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('BRI_CATEGORIES contains all 6 categories', () => {
    expect(BRI_CATEGORIES).toEqual([
      'FINANCIAL',
      'TRANSFERABILITY',
      'OPERATIONAL',
      'MARKET',
      'LEGAL_TAX',
      'PERSONAL',
    ])
  })

  it('BRI_CATEGORY_LABELS has an entry for every BRI category', () => {
    for (const cat of BRI_CATEGORIES) {
      expect(BRI_CATEGORY_LABELS[cat]).toBeDefined()
      expect(typeof BRI_CATEGORY_LABELS[cat]).toBe('string')
      expect(BRI_CATEGORY_LABELS[cat].length).toBeGreaterThan(0)
    }
  })

  it('TREND_STABILITY_THRESHOLD is 5%', () => {
    expect(TREND_STABILITY_THRESHOLD).toBe(0.05)
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('handles very large dollar amounts without overflow', () => {
    const signal = makeVarSignal({ estimatedValueImpact: 1_000_000_000, confidence: 'VERIFIED' })
    const result = calculateValueAtRisk([signal])
    expect(result.totalValueAtRisk).toBe(1_000_000_000)
  })

  it('handles very small dollar amounts', () => {
    const signal = makeVarSignal({ estimatedValueImpact: 0.01, confidence: 'VERIFIED' })
    const result = calculateValueAtRisk([signal])
    expect(result.totalValueAtRisk).toBeCloseTo(0.01)
  })

  it('single signal is both the total and the only top threat', () => {
    const signal = makeVarSignal({
      id: 'only-one',
      estimatedValueImpact: 75000,
      confidence: 'CONFIDENT',
      category: 'TRANSFERABILITY',
    })
    const result = calculateValueAtRisk([signal])
    expect(result.signalCount).toBe(1)
    expect(result.topThreats.length).toBe(1)
    expect(result.topThreats[0].signalId).toBe('only-one')
    expect(result.topThreats[0].weightedImpact).toBe(result.totalValueAtRisk)
  })

  it('deterministic: same input always produces same output', () => {
    const signals = [
      makeVarSignal({ id: 'a', estimatedValueImpact: 50000, confidence: 'UNCERTAIN', category: 'FINANCIAL' }),
      makeVarSignal({ id: 'b', estimatedValueImpact: 30000, confidence: 'VERIFIED', category: 'MARKET' }),
      makeVarSignal({ id: 'c', estimatedValueImpact: 80000, confidence: 'CONFIDENT', category: 'OPERATIONAL' }),
    ]
    const result1 = calculateValueAtRisk(signals, 100000)
    const result2 = calculateValueAtRisk(signals, 100000)

    expect(result1.totalValueAtRisk).toBe(result2.totalValueAtRisk)
    expect(result1.rawValueAtRisk).toBe(result2.rawValueAtRisk)
    expect(result1.topThreats.map(t => t.signalId)).toEqual(result2.topThreats.map(t => t.signalId))
    expect(result1.trend?.direction).toBe(result2.trend?.direction)
  })
})
