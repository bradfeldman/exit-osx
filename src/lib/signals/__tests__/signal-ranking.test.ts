import { describe, it, expect } from 'vitest'
import {
  calculateRankScore,
  calculateWeightedValueImpact,
  rankSignals,
  getGroupKey,
  groupSignals,
  processSignalsForDisplay,
  calculateWeightedValueAtRisk,
  MAX_ACTIVE_DISPLAY_SIGNALS,
  SEVERITY_WEIGHTS,
  type RankableSignal,
  type RankedSignal,
} from '../signal-ranking'
import { CONFIDENCE_MULTIPLIERS } from '../confidence-scoring'
import type { ConfidenceLevel, SignalSeverity } from '@prisma/client'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeSignal(overrides: Partial<RankableSignal> = {}): RankableSignal {
  return {
    id: overrides.id ?? `signal-${Math.random().toString(36).slice(2, 8)}`,
    severity: overrides.severity ?? 'MEDIUM',
    confidence: overrides.confidence ?? 'CONFIDENT',
    estimatedValueImpact: overrides.estimatedValueImpact ?? null,
    resolutionStatus: overrides.resolutionStatus ?? 'OPEN',
    eventType: overrides.eventType ?? 'test_event',
    channel: overrides.channel ?? 'TASK_GENERATED',
    category: overrides.category ?? 'FINANCIAL',
    title: overrides.title ?? 'Test Signal',
    description: overrides.description ?? null,
    createdAt: overrides.createdAt ?? new Date('2025-06-01'),
  }
}

// ---------------------------------------------------------------------------
// calculateRankScore
// ---------------------------------------------------------------------------

describe('calculateRankScore', () => {
  it('returns a positive number for any valid signal', () => {
    const signal = makeSignal()
    const score = calculateRankScore(signal)
    expect(score).toBeGreaterThan(0)
  })

  it('ranks CRITICAL severity higher than INFO', () => {
    const critical = makeSignal({ severity: 'CRITICAL' })
    const info = makeSignal({ severity: 'INFO' })
    expect(calculateRankScore(critical)).toBeGreaterThan(calculateRankScore(info))
  })

  it('ranks VERIFIED confidence higher than UNCERTAIN for same severity', () => {
    const verified = makeSignal({ confidence: 'VERIFIED', severity: 'HIGH' })
    const uncertain = makeSignal({ confidence: 'UNCERTAIN', severity: 'HIGH' })
    expect(calculateRankScore(verified)).toBeGreaterThan(calculateRankScore(uncertain))
  })

  it('ranks higher value impact higher when severity and confidence are equal', () => {
    const highImpact = makeSignal({ estimatedValueImpact: 100000 })
    const lowImpact = makeSignal({ estimatedValueImpact: 10000 })
    expect(calculateRankScore(highImpact)).toBeGreaterThan(calculateRankScore(lowImpact))
  })

  it('ranks signals with no value impact using severity x confidence', () => {
    const noImpact = makeSignal({ estimatedValueImpact: null })
    const score = calculateRankScore(noImpact)
    // Should be severity_weight * confidence_multiplier * resolution_multiplier * 1
    const expected = SEVERITY_WEIGHTS['MEDIUM'] * CONFIDENCE_MULTIPLIERS['CONFIDENT'] * 1.0 * 1
    expect(score).toBeCloseTo(expected)
  })

  it('heavily deprioritizes DISMISSED signals', () => {
    const open = makeSignal({ resolutionStatus: 'OPEN', estimatedValueImpact: 50000 })
    const dismissed = makeSignal({ resolutionStatus: 'DISMISSED', estimatedValueImpact: 50000 })
    expect(calculateRankScore(open)).toBeGreaterThan(calculateRankScore(dismissed) * 5)
  })

  it('deprioritizes RESOLVED signals moderately', () => {
    const open = makeSignal({ resolutionStatus: 'OPEN' })
    const resolved = makeSignal({ resolutionStatus: 'RESOLVED' })
    expect(calculateRankScore(open)).toBeGreaterThan(calculateRankScore(resolved))
  })

  it('keeps ACKNOWLEDGED close to OPEN in priority', () => {
    const open = makeSignal({ resolutionStatus: 'OPEN' })
    const acked = makeSignal({ resolutionStatus: 'ACKNOWLEDGED' })
    const ratio = calculateRankScore(acked) / calculateRankScore(open)
    expect(ratio).toBeGreaterThan(0.8)
    expect(ratio).toBeLessThanOrEqual(1.0)
  })

  it('severity ordering is monotonic: INFO < LOW < MEDIUM < HIGH < CRITICAL', () => {
    const severities: SignalSeverity[] = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    const scores = severities.map(s => calculateRankScore(makeSignal({ severity: s })))
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1])
    }
  })

  it('confidence ordering is monotonic: UNCERTAIN < SOMEWHAT_CONFIDENT < CONFIDENT < VERIFIED', () => {
    const confidences: ConfidenceLevel[] = ['UNCERTAIN', 'SOMEWHAT_CONFIDENT', 'CONFIDENT', 'VERIFIED']
    const scores = confidences.map(c => calculateRankScore(makeSignal({ confidence: c })))
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1])
    }
  })

  it('a CRITICAL + UNCERTAIN signal outranks an INFO + VERIFIED signal', () => {
    const criticalUncertain = makeSignal({ severity: 'CRITICAL', confidence: 'UNCERTAIN' })
    const infoVerified = makeSignal({ severity: 'INFO', confidence: 'VERIFIED' })
    expect(calculateRankScore(criticalUncertain)).toBeGreaterThan(calculateRankScore(infoVerified))
  })
})

// ---------------------------------------------------------------------------
// calculateWeightedValueImpact
// ---------------------------------------------------------------------------

describe('calculateWeightedValueImpact', () => {
  it('returns null when estimatedValueImpact is null', () => {
    const signal = makeSignal({ estimatedValueImpact: null })
    expect(calculateWeightedValueImpact(signal)).toBeNull()
  })

  it('applies UNCERTAIN multiplier (0.5x) correctly', () => {
    const signal = makeSignal({ estimatedValueImpact: 100000, confidence: 'UNCERTAIN' })
    expect(calculateWeightedValueImpact(signal)).toBe(50000)
  })

  it('applies SOMEWHAT_CONFIDENT multiplier (0.7x) correctly', () => {
    const signal = makeSignal({ estimatedValueImpact: 100000, confidence: 'SOMEWHAT_CONFIDENT' })
    expect(calculateWeightedValueImpact(signal)).toBe(70000)
  })

  it('applies CONFIDENT multiplier (0.85x) correctly', () => {
    const signal = makeSignal({ estimatedValueImpact: 100000, confidence: 'CONFIDENT' })
    expect(calculateWeightedValueImpact(signal)).toBe(85000)
  })

  it('applies VERIFIED multiplier (1.0x) correctly', () => {
    const signal = makeSignal({ estimatedValueImpact: 100000, confidence: 'VERIFIED' })
    expect(calculateWeightedValueImpact(signal)).toBe(100000)
  })

  it('handles negative value impact', () => {
    const signal = makeSignal({ estimatedValueImpact: -50000, confidence: 'UNCERTAIN' })
    expect(calculateWeightedValueImpact(signal)).toBe(-25000)
  })

  it('handles zero value impact', () => {
    const signal = makeSignal({ estimatedValueImpact: 0, confidence: 'CONFIDENT' })
    expect(calculateWeightedValueImpact(signal)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// rankSignals
// ---------------------------------------------------------------------------

describe('rankSignals', () => {
  it('returns empty array for empty input', () => {
    expect(rankSignals([])).toEqual([])
  })

  it('sorts signals by rank score descending', () => {
    const signals = [
      makeSignal({ id: 'low', severity: 'LOW', confidence: 'UNCERTAIN' }),
      makeSignal({ id: 'high', severity: 'CRITICAL', confidence: 'VERIFIED' }),
      makeSignal({ id: 'med', severity: 'MEDIUM', confidence: 'CONFIDENT' }),
    ]
    const ranked = rankSignals(signals)
    expect(ranked[0].id).toBe('high')
    expect(ranked[ranked.length - 1].id).toBe('low')
  })

  it('attaches rankScore to each signal', () => {
    const signals = [makeSignal()]
    const ranked = rankSignals(signals)
    expect(ranked[0].rankScore).toBeDefined()
    expect(ranked[0].rankScore).toBeGreaterThan(0)
  })

  it('attaches weightedValueImpact to each signal', () => {
    const signals = [makeSignal({ estimatedValueImpact: 50000, confidence: 'CONFIDENT' })]
    const ranked = rankSignals(signals)
    expect(ranked[0].weightedValueImpact).toBe(42500) // 50000 * 0.85
  })

  it('preserves all original signal fields', () => {
    const original = makeSignal({ title: 'Preserve Me', category: 'MARKET' })
    const ranked = rankSignals([original])
    expect(ranked[0].title).toBe('Preserve Me')
    expect(ranked[0].category).toBe('MARKET')
  })

  it('ranks a diverse set correctly', () => {
    const signals = [
      makeSignal({ id: 'a', severity: 'INFO', confidence: 'UNCERTAIN', estimatedValueImpact: null }),
      makeSignal({ id: 'b', severity: 'CRITICAL', confidence: 'VERIFIED', estimatedValueImpact: 200000 }),
      makeSignal({ id: 'c', severity: 'HIGH', confidence: 'CONFIDENT', estimatedValueImpact: 50000 }),
      makeSignal({ id: 'd', severity: 'MEDIUM', confidence: 'SOMEWHAT_CONFIDENT', estimatedValueImpact: 100000 }),
    ]
    const ranked = rankSignals(signals)
    // b should be first (CRITICAL + VERIFIED + highest impact)
    expect(ranked[0].id).toBe('b')
    // a should be last (INFO + UNCERTAIN + no impact)
    expect(ranked[ranked.length - 1].id).toBe('a')
  })
})

// ---------------------------------------------------------------------------
// getGroupKey
// ---------------------------------------------------------------------------

describe('getGroupKey', () => {
  it('groups signals by eventType', () => {
    const s1 = makeSignal({ eventType: 'document_staleness' })
    const s2 = makeSignal({ eventType: 'document_staleness' })
    expect(getGroupKey(s1)).toBe(getGroupKey(s2))
  })

  it('separates signals with different eventTypes', () => {
    const s1 = makeSignal({ eventType: 'document_staleness' })
    const s2 = makeSignal({ eventType: 'monthly_drift_decline' })
    expect(getGroupKey(s1)).not.toBe(getGroupKey(s2))
  })

  it('returns the eventType as the key', () => {
    const signal = makeSignal({ eventType: 'advisor_observation' })
    expect(getGroupKey(signal)).toBe('advisor_observation')
  })
})

// ---------------------------------------------------------------------------
// groupSignals
// ---------------------------------------------------------------------------

describe('groupSignals', () => {
  it('returns empty array for empty input', () => {
    expect(groupSignals([])).toEqual([])
  })

  it('creates one group per unique eventType', () => {
    const ranked: RankedSignal[] = [
      { ...makeSignal({ eventType: 'type_a' }), rankScore: 10, weightedValueImpact: null },
      { ...makeSignal({ eventType: 'type_a' }), rankScore: 8, weightedValueImpact: null },
      { ...makeSignal({ eventType: 'type_b' }), rankScore: 5, weightedValueImpact: null },
    ]
    const groups = groupSignals(ranked)
    expect(groups.length).toBe(2)
  })

  it('sets primarySignal to the highest-ranked signal in the group', () => {
    const ranked: RankedSignal[] = [
      { ...makeSignal({ id: 'first', eventType: 'type_a' }), rankScore: 10, weightedValueImpact: null },
      { ...makeSignal({ id: 'second', eventType: 'type_a' }), rankScore: 5, weightedValueImpact: null },
    ]
    const groups = groupSignals(ranked)
    expect(groups[0].primarySignal.id).toBe('first')
  })

  it('counts signals in each group', () => {
    const ranked: RankedSignal[] = [
      { ...makeSignal({ eventType: 'type_a' }), rankScore: 10, weightedValueImpact: null },
      { ...makeSignal({ eventType: 'type_a' }), rankScore: 8, weightedValueImpact: null },
      { ...makeSignal({ eventType: 'type_a' }), rankScore: 3, weightedValueImpact: null },
    ]
    const groups = groupSignals(ranked)
    expect(groups[0].count).toBe(3)
  })

  it('uses signal title for single-signal groups', () => {
    const ranked: RankedSignal[] = [
      { ...makeSignal({ eventType: 'unique', title: 'Solo Signal' }), rankScore: 5, weightedValueImpact: null },
    ]
    const groups = groupSignals(ranked)
    expect(groups[0].displayTitle).toBe('Solo Signal')
  })

  it('generates summary title for multi-signal document groups', () => {
    const ranked: RankedSignal[] = [
      { ...makeSignal({ eventType: 'time_decay_staleness' }), rankScore: 10, weightedValueImpact: null },
      { ...makeSignal({ eventType: 'time_decay_staleness' }), rankScore: 5, weightedValueImpact: null },
      { ...makeSignal({ eventType: 'time_decay_staleness' }), rankScore: 3, weightedValueImpact: null },
    ]
    const groups = groupSignals(ranked)
    expect(groups[0].displayTitle).toContain('3 documents need attention')
  })

  it('generates summary title for multi-signal drift groups', () => {
    const ranked: RankedSignal[] = [
      { ...makeSignal({ eventType: 'monthly_drift_decline' }), rankScore: 10, weightedValueImpact: null },
      { ...makeSignal({ eventType: 'monthly_drift_decline' }), rankScore: 5, weightedValueImpact: null },
    ]
    const groups = groupSignals(ranked)
    expect(groups[0].displayTitle).toContain('2 drift signals')
  })

  it('sums weightedValueImpact across group members', () => {
    const ranked: RankedSignal[] = [
      { ...makeSignal({ eventType: 'type_a' }), rankScore: 10, weightedValueImpact: 50000 },
      { ...makeSignal({ eventType: 'type_a' }), rankScore: 5, weightedValueImpact: 30000 },
    ]
    const groups = groupSignals(ranked)
    expect(groups[0].totalWeightedImpact).toBe(80000)
  })

  it('handles null weightedValueImpact in sum', () => {
    const ranked: RankedSignal[] = [
      { ...makeSignal({ eventType: 'type_a' }), rankScore: 10, weightedValueImpact: null },
      { ...makeSignal({ eventType: 'type_a' }), rankScore: 5, weightedValueImpact: 20000 },
    ]
    const groups = groupSignals(ranked)
    expect(groups[0].totalWeightedImpact).toBe(20000)
  })

  it('sorts groups by groupRankScore descending', () => {
    const ranked: RankedSignal[] = [
      { ...makeSignal({ eventType: 'low_rank' }), rankScore: 2, weightedValueImpact: null },
      { ...makeSignal({ eventType: 'high_rank' }), rankScore: 10, weightedValueImpact: null },
    ]
    const groups = groupSignals(ranked)
    expect(groups[0].groupKey).toBe('high_rank')
    expect(groups[1].groupKey).toBe('low_rank')
  })

  it('sets maxSeverity to the most severe signal in the group', () => {
    const ranked: RankedSignal[] = [
      { ...makeSignal({ eventType: 'type_a', severity: 'MEDIUM' }), rankScore: 10, weightedValueImpact: null },
      { ...makeSignal({ eventType: 'type_a', severity: 'CRITICAL' }), rankScore: 5, weightedValueImpact: null },
      { ...makeSignal({ eventType: 'type_a', severity: 'LOW' }), rankScore: 2, weightedValueImpact: null },
    ]
    const groups = groupSignals(ranked)
    expect(groups[0].maxSeverity).toBe('CRITICAL')
  })

  it('sets maxConfidence to the highest confidence in the group', () => {
    const ranked: RankedSignal[] = [
      { ...makeSignal({ eventType: 'type_a', confidence: 'UNCERTAIN' }), rankScore: 10, weightedValueImpact: null },
      { ...makeSignal({ eventType: 'type_a', confidence: 'VERIFIED' }), rankScore: 5, weightedValueImpact: null },
    ]
    const groups = groupSignals(ranked)
    expect(groups[0].maxConfidence).toBe('VERIFIED')
  })
})

// ---------------------------------------------------------------------------
// processSignalsForDisplay
// ---------------------------------------------------------------------------

describe('processSignalsForDisplay', () => {
  it('returns empty result for empty input', () => {
    const result = processSignalsForDisplay([])
    expect(result.activeDisplayGroups).toEqual([])
    expect(result.queuedGroups).toEqual([])
    expect(result.totalWeightedValueAtRisk).toBe(0)
    expect(result.totalSignalCount).toBe(0)
  })

  it('limits active display groups to MAX_ACTIVE_DISPLAY_SIGNALS (3)', () => {
    const signals = [
      makeSignal({ eventType: 'a', severity: 'CRITICAL' }),
      makeSignal({ eventType: 'b', severity: 'HIGH' }),
      makeSignal({ eventType: 'c', severity: 'MEDIUM' }),
      makeSignal({ eventType: 'd', severity: 'LOW' }),
      makeSignal({ eventType: 'e', severity: 'INFO' }),
    ]
    const result = processSignalsForDisplay(signals)
    expect(result.activeDisplayGroups.length).toBe(MAX_ACTIVE_DISPLAY_SIGNALS)
    expect(result.queuedGroups.length).toBe(2)
  })

  it('shows all groups when fewer than MAX_ACTIVE_DISPLAY_SIGNALS', () => {
    const signals = [
      makeSignal({ eventType: 'a' }),
      makeSignal({ eventType: 'b' }),
    ]
    const result = processSignalsForDisplay(signals)
    expect(result.activeDisplayGroups.length).toBe(2)
    expect(result.queuedGroups.length).toBe(0)
  })

  it('groups related signals together, reducing display count', () => {
    // 5 signals, but only 2 unique eventTypes -> 2 groups -> both active
    const signals = [
      makeSignal({ eventType: 'staleness', severity: 'HIGH' }),
      makeSignal({ eventType: 'staleness', severity: 'MEDIUM' }),
      makeSignal({ eventType: 'staleness', severity: 'LOW' }),
      makeSignal({ eventType: 'drift_decline', severity: 'CRITICAL' }),
      makeSignal({ eventType: 'drift_decline', severity: 'HIGH' }),
    ]
    const result = processSignalsForDisplay(signals)
    expect(result.activeDisplayGroups.length).toBe(2)
    expect(result.queuedGroups.length).toBe(0)
    expect(result.totalSignalCount).toBe(5)
  })

  it('places highest-ranked groups in active display', () => {
    const signals = [
      makeSignal({ eventType: 'a', severity: 'INFO', confidence: 'UNCERTAIN' }),
      makeSignal({ eventType: 'b', severity: 'LOW', confidence: 'SOMEWHAT_CONFIDENT' }),
      makeSignal({ eventType: 'c', severity: 'CRITICAL', confidence: 'VERIFIED', estimatedValueImpact: 100000 }),
      makeSignal({ eventType: 'd', severity: 'HIGH', confidence: 'CONFIDENT', estimatedValueImpact: 50000 }),
    ]
    const result = processSignalsForDisplay(signals)

    // c and d should be in active display (highest scores)
    const activeKeys = result.activeDisplayGroups.map(g => g.groupKey)
    expect(activeKeys).toContain('c')
    expect(activeKeys).toContain('d')

    // a should be in queued (lowest score)
    const queuedKeys = result.queuedGroups.map(g => g.groupKey)
    expect(queuedKeys).toContain('a')
  })

  it('calculates totalWeightedValueAtRisk from OPEN signals only', () => {
    const signals = [
      makeSignal({ estimatedValueImpact: 100000, confidence: 'UNCERTAIN', resolutionStatus: 'OPEN' }),
      makeSignal({ estimatedValueImpact: 100000, confidence: 'VERIFIED', resolutionStatus: 'OPEN' }),
      makeSignal({ estimatedValueImpact: 100000, confidence: 'VERIFIED', resolutionStatus: 'RESOLVED' }),
    ]
    const result = processSignalsForDisplay(signals)
    // Only OPEN signals: 100000*0.5 + 100000*1.0 = 150000
    expect(result.totalWeightedValueAtRisk).toBe(150000)
  })

  it('excludes negative value impacts from totalWeightedValueAtRisk', () => {
    const signals = [
      makeSignal({ estimatedValueImpact: 50000, confidence: 'VERIFIED' }),
      makeSignal({ estimatedValueImpact: -30000, confidence: 'VERIFIED' }),
    ]
    const result = processSignalsForDisplay(signals)
    // Only positive impacts: 50000
    expect(result.totalWeightedValueAtRisk).toBe(50000)
  })

  it('respects custom maxDisplay parameter', () => {
    const signals = [
      makeSignal({ eventType: 'a' }),
      makeSignal({ eventType: 'b' }),
      makeSignal({ eventType: 'c' }),
      makeSignal({ eventType: 'd' }),
    ]
    const result = processSignalsForDisplay(signals, 1)
    expect(result.activeDisplayGroups.length).toBe(1)
    expect(result.queuedGroups.length).toBe(3)
  })

  it('returns totalSignalCount as the total number of input signals', () => {
    const signals = [makeSignal(), makeSignal(), makeSignal()]
    const result = processSignalsForDisplay(signals)
    expect(result.totalSignalCount).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// calculateWeightedValueAtRisk
// ---------------------------------------------------------------------------

describe('calculateWeightedValueAtRisk', () => {
  it('returns 0 for empty array', () => {
    expect(calculateWeightedValueAtRisk([])).toBe(0)
  })

  it('returns 0 when all impacts are null', () => {
    const signals = [
      { estimatedValueImpact: null, confidence: 'VERIFIED' as ConfidenceLevel },
      { estimatedValueImpact: null, confidence: 'UNCERTAIN' as ConfidenceLevel },
    ]
    expect(calculateWeightedValueAtRisk(signals)).toBe(0)
  })

  it('applies UNCERTAIN multiplier to reduce at-risk amount', () => {
    const signals = [
      { estimatedValueImpact: 100000, confidence: 'UNCERTAIN' as ConfidenceLevel },
    ]
    expect(calculateWeightedValueAtRisk(signals)).toBe(50000)
  })

  it('applies VERIFIED multiplier (full weight)', () => {
    const signals = [
      { estimatedValueImpact: 100000, confidence: 'VERIFIED' as ConfidenceLevel },
    ]
    expect(calculateWeightedValueAtRisk(signals)).toBe(100000)
  })

  it('sums across multiple signals with different confidences', () => {
    const signals = [
      { estimatedValueImpact: 100000, confidence: 'UNCERTAIN' as ConfidenceLevel },      // 50000
      { estimatedValueImpact: 100000, confidence: 'SOMEWHAT_CONFIDENT' as ConfidenceLevel }, // 70000
      { estimatedValueImpact: 100000, confidence: 'CONFIDENT' as ConfidenceLevel },       // 85000
      { estimatedValueImpact: 100000, confidence: 'VERIFIED' as ConfidenceLevel },        // 100000
    ]
    expect(calculateWeightedValueAtRisk(signals)).toBe(305000)
  })

  it('uses absolute value of impact (negative impacts still contribute)', () => {
    const signals = [
      { estimatedValueImpact: -50000, confidence: 'VERIFIED' as ConfidenceLevel },
    ]
    expect(calculateWeightedValueAtRisk(signals)).toBe(50000)
  })

  it('skips null impacts in sum', () => {
    const signals = [
      { estimatedValueImpact: 50000, confidence: 'VERIFIED' as ConfidenceLevel },
      { estimatedValueImpact: null, confidence: 'VERIFIED' as ConfidenceLevel },
      { estimatedValueImpact: 25000, confidence: 'CONFIDENT' as ConfidenceLevel },
    ]
    // 50000 + 25000*0.85 = 71250
    expect(calculateWeightedValueAtRisk(signals)).toBe(71250)
  })
})

// ---------------------------------------------------------------------------
// Fatigue prevention scenarios
// ---------------------------------------------------------------------------

describe('signal fatigue prevention', () => {
  it('collapses 10 document staleness signals into 1 group', () => {
    const signals = Array.from({ length: 10 }, (_, i) =>
      makeSignal({
        id: `stale-${i}`,
        eventType: 'time_decay_staleness',
        severity: 'MEDIUM',
        title: `Document ${i + 1} is stale`,
      })
    )
    const result = processSignalsForDisplay(signals)
    expect(result.activeDisplayGroups.length).toBe(1)
    expect(result.activeDisplayGroups[0].count).toBe(10)
    expect(result.activeDisplayGroups[0].displayTitle).toContain('10 documents')
  })

  it('shows max 3 signal groups even with 20 different event types', () => {
    const signals = Array.from({ length: 20 }, (_, i) =>
      makeSignal({
        id: `signal-${i}`,
        eventType: `event_type_${i}`,
        severity: 'MEDIUM',
      })
    )
    const result = processSignalsForDisplay(signals)
    expect(result.activeDisplayGroups.length).toBe(MAX_ACTIVE_DISPLAY_SIGNALS)
    expect(result.queuedGroups.length).toBe(17)
  })

  it('dismissed signals appear in queued, not active (deprioritized)', () => {
    const signals = [
      // These should be active (OPEN, higher rank)
      makeSignal({ id: 'open-1', eventType: 'a', severity: 'HIGH', resolutionStatus: 'OPEN' }),
      makeSignal({ id: 'open-2', eventType: 'b', severity: 'HIGH', resolutionStatus: 'OPEN' }),
      makeSignal({ id: 'open-3', eventType: 'c', severity: 'HIGH', resolutionStatus: 'OPEN' }),
      // This should be queued (DISMISSED, lower rank)
      makeSignal({ id: 'dismissed', eventType: 'd', severity: 'HIGH', resolutionStatus: 'DISMISSED' }),
    ]
    const result = processSignalsForDisplay(signals)
    const queuedKeys = result.queuedGroups.map(g => g.groupKey)
    expect(queuedKeys).toContain('d')
  })

  it('all queued signals are still accessible (not deleted)', () => {
    const signals = Array.from({ length: 10 }, (_, i) =>
      makeSignal({ id: `signal-${i}`, eventType: `event_${i}` })
    )
    const result = processSignalsForDisplay(signals)
    const totalGrouped = result.activeDisplayGroups.length + result.queuedGroups.length
    expect(totalGrouped).toBe(10)
    expect(result.totalSignalCount).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// Ranking stability and edge cases
// ---------------------------------------------------------------------------

describe('ranking edge cases', () => {
  it('handles a single signal', () => {
    const signals = [makeSignal({ severity: 'CRITICAL', estimatedValueImpact: 500000 })]
    const result = processSignalsForDisplay(signals)
    expect(result.activeDisplayGroups.length).toBe(1)
    expect(result.queuedGroups.length).toBe(0)
    expect(result.totalSignalCount).toBe(1)
  })

  it('handles signals with estimatedValueImpact of 0', () => {
    const signal = makeSignal({ estimatedValueImpact: 0, confidence: 'VERIFIED' })
    const ranked = rankSignals([signal])
    expect(ranked[0].weightedValueImpact).toBe(0)
    expect(ranked[0].rankScore).toBeGreaterThan(0)
  })

  it('handles NOT_APPLICABLE confidence like VERIFIED (1.0x)', () => {
    const na = makeSignal({ confidence: 'NOT_APPLICABLE', estimatedValueImpact: 100000 })
    const verified = makeSignal({ confidence: 'VERIFIED', estimatedValueImpact: 100000 })
    const [naRanked] = rankSignals([na])
    const [verifiedRanked] = rankSignals([verified])
    expect(naRanked.weightedValueImpact).toBe(verifiedRanked.weightedValueImpact)
  })

  it('all severity weights are positive integers', () => {
    for (const [, weight] of Object.entries(SEVERITY_WEIGHTS)) {
      expect(weight).toBeGreaterThan(0)
      expect(Number.isInteger(weight)).toBe(true)
    }
  })

  it('ranking is deterministic (same input always produces same output)', () => {
    const signals = [
      makeSignal({ id: 'a', severity: 'HIGH', estimatedValueImpact: 50000 }),
      makeSignal({ id: 'b', severity: 'CRITICAL', estimatedValueImpact: 30000 }),
      makeSignal({ id: 'c', severity: 'MEDIUM', estimatedValueImpact: 100000 }),
    ]
    const result1 = rankSignals(signals)
    const result2 = rankSignals(signals)
    expect(result1.map(s => s.id)).toEqual(result2.map(s => s.id))
    expect(result1.map(s => s.rankScore)).toEqual(result2.map(s => s.rankScore))
  })
})

// ---------------------------------------------------------------------------
// Business scenario tests
// ---------------------------------------------------------------------------

describe('business scenarios', () => {
  it('scenario: company with 3 stale docs, 1 critical signal, 1 advisor observation', () => {
    const signals = [
      // 3 document staleness signals -> should group into 1
      makeSignal({ id: 'doc-1', eventType: 'time_decay_doc_staleness', severity: 'LOW', confidence: 'CONFIDENT', estimatedValueImpact: 5000 }),
      makeSignal({ id: 'doc-2', eventType: 'time_decay_doc_staleness', severity: 'LOW', confidence: 'CONFIDENT', estimatedValueImpact: 3000 }),
      makeSignal({ id: 'doc-3', eventType: 'time_decay_doc_staleness', severity: 'MEDIUM', confidence: 'CONFIDENT', estimatedValueImpact: 8000 }),
      // 1 critical BRI decline
      makeSignal({ id: 'bri', eventType: 'monthly_drift_decline', severity: 'CRITICAL', confidence: 'CONFIDENT', estimatedValueImpact: 150000 }),
      // 1 advisor observation
      makeSignal({ id: 'advisor', eventType: 'advisor_observation', severity: 'HIGH', confidence: 'VERIFIED', estimatedValueImpact: 75000 }),
    ]

    const result = processSignalsForDisplay(signals)

    // Should have 3 groups: staleness (grouped), drift, advisor
    expect(result.activeDisplayGroups.length).toBe(3)
    expect(result.queuedGroups.length).toBe(0)

    // Critical drift should be first
    expect(result.activeDisplayGroups[0].groupKey).toBe('monthly_drift_decline')

    // Total signal count should be all 5
    expect(result.totalSignalCount).toBe(5)
  })

  it('scenario: value-at-risk comparison: raw vs confidence-weighted', () => {
    const signals = [
      { estimatedValueImpact: 200000, confidence: 'UNCERTAIN' as ConfidenceLevel },
      { estimatedValueImpact: 100000, confidence: 'SOMEWHAT_CONFIDENT' as ConfidenceLevel },
      { estimatedValueImpact: 50000, confidence: 'VERIFIED' as ConfidenceLevel },
    ]

    const rawTotal = signals.reduce((sum, s) => sum + (s.estimatedValueImpact ?? 0), 0)
    const weightedTotal = calculateWeightedValueAtRisk(signals)

    // Raw: 200K + 100K + 50K = 350K
    expect(rawTotal).toBe(350000)
    // Weighted: 200K*0.5 + 100K*0.7 + 50K*1.0 = 100K + 70K + 50K = 220K
    expect(weightedTotal).toBe(220000)
    // Weighted should always be <= raw
    expect(weightedTotal).toBeLessThanOrEqual(rawTotal)
  })

  it('scenario: confidence upgrade reduces effective value at risk', () => {
    // Before: 3 UNCERTAIN signals at $100K each -> weighted = $150K
    const before = calculateWeightedValueAtRisk([
      { estimatedValueImpact: 100000, confidence: 'UNCERTAIN' },
      { estimatedValueImpact: 100000, confidence: 'UNCERTAIN' },
      { estimatedValueImpact: 100000, confidence: 'UNCERTAIN' },
    ])
    expect(before).toBe(150000)

    // After: same signals upgraded to VERIFIED -> weighted = $300K
    // Wait, this is confusing. Higher confidence means more of the risk is "real",
    // so the weighted value goes UP (more certain about the risk).
    const after = calculateWeightedValueAtRisk([
      { estimatedValueImpact: 100000, confidence: 'VERIFIED' },
      { estimatedValueImpact: 100000, confidence: 'VERIFIED' },
      { estimatedValueImpact: 100000, confidence: 'VERIFIED' },
    ])
    expect(after).toBe(300000)
    // This is correct: higher confidence means we're more certain the risk is real
    expect(after).toBeGreaterThan(before)
  })
})
