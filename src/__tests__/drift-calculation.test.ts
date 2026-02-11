import { describe, it, expect } from 'vitest'
import {
  calculateDrift,
  calculateCategoryChanges,
  calculateWeightedDriftScore,
  determineDriftDirection,
  generateRecommendedActions,
  calculateTaskCompletionRate,
  getDriftSignalSeverity,
  SIGNAL_THRESHOLDS,
  type SnapshotData,
  type DriftCalculationInputs,
  type CategoryChange,
  type SignalsSummary,
} from '@/lib/drift/calculate-drift'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const STABLE_SNAPSHOT: SnapshotData = {
  briScore: 0.65,
  currentValue: 750000,
  briFinancial: 0.70,
  briTransferability: 0.60,
  briOperational: 0.65,
  briMarket: 0.55,
  briLegalTax: 0.75,
  briPersonal: 0.68,
}

const IMPROVED_SNAPSHOT: SnapshotData = {
  briScore: 0.75,
  currentValue: 850000,
  briFinancial: 0.80,
  briTransferability: 0.70,
  briOperational: 0.75,
  briMarket: 0.65,
  briLegalTax: 0.80,
  briPersonal: 0.72,
}

const DECLINED_SNAPSHOT: SnapshotData = {
  briScore: 0.50,
  currentValue: 600000,
  briFinancial: 0.55,
  briTransferability: 0.45,
  briOperational: 0.50,
  briMarket: 0.40,
  briLegalTax: 0.60,
  briPersonal: 0.55,
}

const SEVERELY_DECLINED_SNAPSHOT: SnapshotData = {
  briScore: 0.53,
  currentValue: 580000,
  briFinancial: 0.50,
  briTransferability: 0.42,
  briOperational: 0.48,
  briMarket: 0.38,
  briLegalTax: 0.58,
  briPersonal: 0.50,
}

const EMPTY_SIGNALS: SignalsSummary = { high: 0, critical: 0, total: 0 }

const SAMPLE_PENDING_TASKS: DriftCalculationInputs['topPendingTasks'] = [
  { id: 'task-1', title: 'Document key-man insurance policy', briCategory: 'TRANSFERABILITY', normalizedValue: 15000 },
  { id: 'task-2', title: 'Create SOP for client handoff', briCategory: 'OPERATIONAL', normalizedValue: 12000 },
  { id: 'task-3', title: 'Update financial projections', briCategory: 'FINANCIAL', normalizedValue: 10000 },
]

function makeInputs(overrides: Partial<DriftCalculationInputs> = {}): DriftCalculationInputs {
  return {
    currentSnapshot: STABLE_SNAPSHOT,
    previousSnapshot: STABLE_SNAPSHOT,
    staleDocumentCount: 0,
    signalsSummary: EMPTY_SIGNALS,
    tasksCompletedCount: 0,
    tasksPendingAtStart: 0,
    topPendingTasks: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// calculateCategoryChanges
// ---------------------------------------------------------------------------

describe('calculateCategoryChanges', () => {
  it('returns 6 categories', () => {
    const changes = calculateCategoryChanges(STABLE_SNAPSHOT, STABLE_SNAPSHOT)
    expect(changes).toHaveLength(6)
  })

  it('returns correct category names', () => {
    const changes = calculateCategoryChanges(STABLE_SNAPSHOT, STABLE_SNAPSHOT)
    const categories = changes.map(c => c.category)
    expect(categories).toEqual([
      'FINANCIAL',
      'TRANSFERABILITY',
      'OPERATIONAL',
      'MARKET',
      'LEGAL_TAX',
      'PERSONAL',
    ])
  })

  it('marks all categories as stable when snapshots are identical', () => {
    const changes = calculateCategoryChanges(STABLE_SNAPSHOT, STABLE_SNAPSHOT)
    for (const change of changes) {
      expect(change.delta).toBe(0)
      expect(change.direction).toBe('stable')
    }
  })

  it('correctly identifies improving categories', () => {
    const changes = calculateCategoryChanges(IMPROVED_SNAPSHOT, STABLE_SNAPSHOT)
    // All categories improved by 0.04-0.10
    for (const change of changes) {
      expect(change.direction).toBe('improving')
      expect(change.delta).toBeGreaterThan(0)
    }
  })

  it('correctly identifies declining categories', () => {
    const changes = calculateCategoryChanges(DECLINED_SNAPSHOT, STABLE_SNAPSHOT)
    for (const change of changes) {
      expect(change.direction).toBe('declining')
      expect(change.delta).toBeLessThan(0)
    }
  })

  it('handles null current snapshot (all zeros)', () => {
    const changes = calculateCategoryChanges(null, STABLE_SNAPSHOT)
    for (const change of changes) {
      expect(change.currentScore).toBe(0)
      expect(change.previousScore).toBeGreaterThan(0)
      expect(change.direction).toBe('declining')
    }
  })

  it('handles null previous snapshot (all zeros)', () => {
    const changes = calculateCategoryChanges(STABLE_SNAPSHOT, null)
    for (const change of changes) {
      expect(change.previousScore).toBe(0)
      expect(change.currentScore).toBeGreaterThan(0)
      expect(change.direction).toBe('improving')
    }
  })

  it('handles both snapshots null', () => {
    const changes = calculateCategoryChanges(null, null)
    for (const change of changes) {
      expect(change.previousScore).toBe(0)
      expect(change.currentScore).toBe(0)
      expect(change.delta).toBe(0)
      expect(change.direction).toBe('stable')
    }
  })

  it('assigns correct BRI weights to categories', () => {
    const changes = calculateCategoryChanges(STABLE_SNAPSHOT, STABLE_SNAPSHOT)
    const weightMap = Object.fromEntries(changes.map(c => [c.category, c.weight]))
    expect(weightMap.FINANCIAL).toBe(0.25)
    expect(weightMap.TRANSFERABILITY).toBe(0.20)
    expect(weightMap.OPERATIONAL).toBe(0.20)
    expect(weightMap.MARKET).toBe(0.15)
    expect(weightMap.LEGAL_TAX).toBe(0.10)
    expect(weightMap.PERSONAL).toBe(0.10)
  })

  it('stability threshold ignores tiny changes (< 0.005)', () => {
    const slightlyChanged: SnapshotData = {
      ...STABLE_SNAPSHOT,
      briFinancial: STABLE_SNAPSHOT.briFinancial + 0.004,
      briMarket: STABLE_SNAPSHOT.briMarket - 0.003,
    }
    const changes = calculateCategoryChanges(slightlyChanged, STABLE_SNAPSHOT)
    const financial = changes.find(c => c.category === 'FINANCIAL')!
    const market = changes.find(c => c.category === 'MARKET')!
    expect(financial.direction).toBe('stable')
    expect(market.direction).toBe('stable')
  })
})

// ---------------------------------------------------------------------------
// calculateWeightedDriftScore
// ---------------------------------------------------------------------------

describe('calculateWeightedDriftScore', () => {
  it('returns 0 when nothing changed', () => {
    const changes = calculateCategoryChanges(STABLE_SNAPSHOT, STABLE_SNAPSHOT)
    const score = calculateWeightedDriftScore(changes, 0, EMPTY_SIGNALS, 0)
    expect(score).toBe(0)
  })

  it('returns positive score for improvement', () => {
    const changes = calculateCategoryChanges(IMPROVED_SNAPSHOT, STABLE_SNAPSHOT)
    const score = calculateWeightedDriftScore(changes, 0, EMPTY_SIGNALS, 0.5)
    expect(score).toBeGreaterThan(0)
  })

  it('returns negative score for decline', () => {
    const changes = calculateCategoryChanges(DECLINED_SNAPSHOT, STABLE_SNAPSHOT)
    const score = calculateWeightedDriftScore(changes, 3, { high: 2, critical: 1, total: 5 }, 0)
    expect(score).toBeLessThan(0)
  })

  it('stale documents add negative pressure', () => {
    const changes = calculateCategoryChanges(STABLE_SNAPSHOT, STABLE_SNAPSHOT)
    const scoreClean = calculateWeightedDriftScore(changes, 0, EMPTY_SIGNALS, 0)
    const scoreStale = calculateWeightedDriftScore(changes, 5, EMPTY_SIGNALS, 0)
    expect(scoreStale).toBeLessThan(scoreClean)
  })

  it('critical signals add more negative pressure than high signals', () => {
    const changes = calculateCategoryChanges(STABLE_SNAPSHOT, STABLE_SNAPSHOT)
    const scoreHigh = calculateWeightedDriftScore(changes, 0, { high: 1, critical: 0, total: 1 }, 0)
    const scoreCritical = calculateWeightedDriftScore(changes, 0, { high: 0, critical: 1, total: 1 }, 0)
    expect(scoreCritical).toBeLessThan(scoreHigh)
  })

  it('task completion adds positive pressure', () => {
    const changes = calculateCategoryChanges(STABLE_SNAPSHOT, STABLE_SNAPSHOT)
    const scoreNoTasks = calculateWeightedDriftScore(changes, 0, EMPTY_SIGNALS, 0)
    const scoreWithTasks = calculateWeightedDriftScore(changes, 0, EMPTY_SIGNALS, 0.8)
    expect(scoreWithTasks).toBeGreaterThan(scoreNoTasks)
  })
})

// ---------------------------------------------------------------------------
// determineDriftDirection
// ---------------------------------------------------------------------------

describe('determineDriftDirection', () => {
  it('returns STABLE for score near zero', () => {
    expect(determineDriftDirection(0)).toBe('STABLE')
    expect(determineDriftDirection(0.03)).toBe('STABLE')
    expect(determineDriftDirection(-0.04)).toBe('STABLE')
  })

  it('returns IMPROVING for positive score above threshold', () => {
    expect(determineDriftDirection(0.10)).toBe('IMPROVING')
    expect(determineDriftDirection(0.51)).toBe('IMPROVING')
  })

  it('returns DECLINING for negative score below threshold', () => {
    expect(determineDriftDirection(-0.10)).toBe('DECLINING')
    expect(determineDriftDirection(-0.80)).toBe('DECLINING')
  })

  it('boundary: exactly at threshold is STABLE', () => {
    expect(determineDriftDirection(0.05)).toBe('STABLE')
    expect(determineDriftDirection(-0.05)).toBe('STABLE')
  })

  it('just above threshold is IMPROVING', () => {
    expect(determineDriftDirection(0.051)).toBe('IMPROVING')
  })

  it('just below negative threshold is DECLINING', () => {
    expect(determineDriftDirection(-0.051)).toBe('DECLINING')
  })
})

// ---------------------------------------------------------------------------
// calculateTaskCompletionRate
// ---------------------------------------------------------------------------

describe('calculateTaskCompletionRate', () => {
  it('returns 0 when no tasks exist', () => {
    expect(calculateTaskCompletionRate(0, 0)).toBe(0)
  })

  it('returns 1.0 when all pending tasks were completed', () => {
    expect(calculateTaskCompletionRate(5, 0)).toBe(1.0)
  })

  it('returns 0 when no tasks were completed but some were pending', () => {
    expect(calculateTaskCompletionRate(0, 10)).toBe(0)
  })

  it('returns correct rate for partial completion', () => {
    // 3 completed, 7 still pending => 3 / (3 + 7) = 0.3
    expect(calculateTaskCompletionRate(3, 7)).toBeCloseTo(0.3)
  })

  it('handles more completed than were pending', () => {
    // 15 completed out of 20 total (15 + 5 pending) = 0.75
    // This is correct: denominator includes all completable tasks
    expect(calculateTaskCompletionRate(15, 5)).toBeCloseTo(0.75)
  })

  it('caps at 1.0 when no pending tasks remain', () => {
    // All completed, none pending => 100%
    expect(calculateTaskCompletionRate(10, 0)).toBe(1.0)
  })
})

// ---------------------------------------------------------------------------
// getDriftSignalSeverity
// ---------------------------------------------------------------------------

describe('getDriftSignalSeverity', () => {
  it('returns null for positive BRI change', () => {
    expect(getDriftSignalSeverity(0.05)).toBeNull()
    expect(getDriftSignalSeverity(0.15)).toBeNull()
  })

  it('returns null for zero change', () => {
    expect(getDriftSignalSeverity(0)).toBeNull()
  })

  it('returns null for small negative change (< 5 points)', () => {
    expect(getDriftSignalSeverity(-0.03)).toBeNull()
    expect(getDriftSignalSeverity(-0.049)).toBeNull()
  })

  it('returns HIGH for 5-10 point drop', () => {
    expect(getDriftSignalSeverity(-0.05)).toBe('HIGH')
    expect(getDriftSignalSeverity(-0.07)).toBe('HIGH')
    expect(getDriftSignalSeverity(-0.099)).toBe('HIGH')
  })

  it('returns CRITICAL for >= 10 point drop', () => {
    expect(getDriftSignalSeverity(-0.10)).toBe('CRITICAL')
    expect(getDriftSignalSeverity(-0.15)).toBe('CRITICAL')
    expect(getDriftSignalSeverity(-0.25)).toBe('CRITICAL')
  })

  it('thresholds match exported constants', () => {
    expect(SIGNAL_THRESHOLDS.HIGH_BRI_DROP).toBe(0.05)
    expect(SIGNAL_THRESHOLDS.CRITICAL_BRI_DROP).toBe(0.10)
  })
})

// ---------------------------------------------------------------------------
// generateRecommendedActions
// ---------------------------------------------------------------------------

describe('generateRecommendedActions', () => {
  it('returns empty array when nothing is declining', () => {
    const changes = calculateCategoryChanges(STABLE_SNAPSHOT, STABLE_SNAPSHOT)
    const actions = generateRecommendedActions(changes, [], 0, EMPTY_SIGNALS)
    expect(actions).toHaveLength(0)
  })

  it('generates actions for declining categories', () => {
    const changes = calculateCategoryChanges(DECLINED_SNAPSHOT, STABLE_SNAPSHOT)
    const actions = generateRecommendedActions(changes, [], 0, EMPTY_SIGNALS)
    expect(actions.length).toBeGreaterThan(0)
    // Should reference declining category labels
    const descriptions = actions.map(a => a.description)
    expect(descriptions.some(d => d.includes('decline'))).toBe(true)
  })

  it('surfaces high-value tasks in declining categories', () => {
    const changes = calculateCategoryChanges(DECLINED_SNAPSHOT, STABLE_SNAPSHOT)
    const tasks = [
      { id: 'task-1', title: 'Fix financial controls', briCategory: 'FINANCIAL' as const, normalizedValue: 20000 },
      { id: 'task-2', title: 'Document SOPs', briCategory: 'OPERATIONAL' as const, normalizedValue: 15000 },
    ]
    const actions = generateRecommendedActions(changes, tasks, 0, EMPTY_SIGNALS)
    const taskActions = actions.filter(a => a.taskId)
    expect(taskActions.length).toBeGreaterThan(0)
    expect(taskActions[0].taskId).toBe('task-1')
  })

  it('adds stale document warning when documents are stale', () => {
    const changes = calculateCategoryChanges(STABLE_SNAPSHOT, STABLE_SNAPSHOT)
    const actions = generateRecommendedActions(changes, [], 3, EMPTY_SIGNALS)
    expect(actions.some(a => a.description.includes('stale document'))).toBe(true)
  })

  it('adds critical signal warning', () => {
    const changes = calculateCategoryChanges(STABLE_SNAPSHOT, STABLE_SNAPSHOT)
    const signals: SignalsSummary = { high: 1, critical: 2, total: 3 }
    const actions = generateRecommendedActions(changes, [], 0, signals)
    expect(actions.some(a => a.description.includes('critical signal'))).toBe(true)
  })

  it('caps at 5 recommended actions', () => {
    const changes = calculateCategoryChanges(DECLINED_SNAPSHOT, STABLE_SNAPSHOT)
    const manyTasks = Array.from({ length: 10 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      briCategory: 'FINANCIAL' as const,
      normalizedValue: 10000 - i * 100,
    }))
    const signals: SignalsSummary = { high: 3, critical: 2, total: 8 }
    const actions = generateRecommendedActions(changes, manyTasks, 5, signals)
    expect(actions.length).toBeLessThanOrEqual(5)
  })
})

// ---------------------------------------------------------------------------
// calculateDrift (integration of all pure functions)
// ---------------------------------------------------------------------------

describe('calculateDrift', () => {
  describe('improving scenario', () => {
    it('detects overall improvement', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: IMPROVED_SNAPSHOT,
        previousSnapshot: STABLE_SNAPSHOT,
        tasksCompletedCount: 5,
        tasksPendingAtStart: 10,
      }))

      expect(result.briScoreChange).toBeCloseTo(0.10)
      expect(result.valuationChange).toBe(100000)
      expect(result.overallDriftDirection).toBe('IMPROVING')
      expect(result.weightedDriftScore).toBeGreaterThan(0)
    })

    it('has positive BRI change', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: IMPROVED_SNAPSHOT,
        previousSnapshot: STABLE_SNAPSHOT,
      }))
      expect(result.briScoreChange).toBeGreaterThan(0)
    })

    it('has positive valuation change', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: IMPROVED_SNAPSHOT,
        previousSnapshot: STABLE_SNAPSHOT,
      }))
      expect(result.valuationChange).toBeGreaterThan(0)
    })

    it('all categories show improvement', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: IMPROVED_SNAPSHOT,
        previousSnapshot: STABLE_SNAPSHOT,
      }))
      for (const cat of result.categoryChanges) {
        expect(cat.direction).toBe('improving')
      }
    })
  })

  describe('stable scenario', () => {
    it('detects no change', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: STABLE_SNAPSHOT,
        previousSnapshot: STABLE_SNAPSHOT,
      }))

      expect(result.briScoreChange).toBe(0)
      expect(result.valuationChange).toBe(0)
      expect(result.overallDriftDirection).toBe('STABLE')
    })

    it('all categories are stable', () => {
      const result = calculateDrift(makeInputs())
      for (const cat of result.categoryChanges) {
        expect(cat.direction).toBe('stable')
      }
    })

    it('has no recommended actions when nothing is declining', () => {
      const result = calculateDrift(makeInputs())
      expect(result.recommendedActions).toHaveLength(0)
    })
  })

  describe('declining scenario', () => {
    it('detects overall decline', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: DECLINED_SNAPSHOT,
        previousSnapshot: STABLE_SNAPSHOT,
        staleDocumentCount: 3,
        signalsSummary: { high: 2, critical: 1, total: 5 },
      }))

      expect(result.briScoreChange).toBeCloseTo(-0.15)
      expect(result.valuationChange).toBe(-150000)
      expect(result.overallDriftDirection).toBe('DECLINING')
      expect(result.weightedDriftScore).toBeLessThan(0)
    })

    it('generates recommended actions', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: DECLINED_SNAPSHOT,
        previousSnapshot: STABLE_SNAPSHOT,
        topPendingTasks: SAMPLE_PENDING_TASKS,
      }))
      expect(result.recommendedActions.length).toBeGreaterThan(0)
    })

    it('has negative BRI change', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: DECLINED_SNAPSHOT,
        previousSnapshot: STABLE_SNAPSHOT,
      }))
      expect(result.briScoreChange).toBeLessThan(0)
    })
  })

  describe('edge cases', () => {
    it('handles no previous snapshot (first month)', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: STABLE_SNAPSHOT,
        previousSnapshot: null,
      }))

      // BRI went from 0 to 0.65
      expect(result.briScoreChange).toBe(0.65)
      expect(result.overallDriftDirection).toBe('IMPROVING')
    })

    it('handles no current snapshot (data issue)', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: null,
        previousSnapshot: STABLE_SNAPSHOT,
      }))

      // BRI went from 0.65 to 0
      expect(result.briScoreChange).toBe(-0.65)
      expect(result.overallDriftDirection).toBe('DECLINING')
    })

    it('handles both snapshots null', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: null,
        previousSnapshot: null,
      }))

      expect(result.briScoreChange).toBe(0)
      expect(result.valuationChange).toBe(0)
      expect(result.overallDriftDirection).toBe('STABLE')
    })

    it('handles all-zero inputs', () => {
      const zeroSnapshot: SnapshotData = {
        briScore: 0,
        currentValue: 0,
        briFinancial: 0,
        briTransferability: 0,
        briOperational: 0,
        briMarket: 0,
        briLegalTax: 0,
        briPersonal: 0,
      }
      const result = calculateDrift(makeInputs({
        currentSnapshot: zeroSnapshot,
        previousSnapshot: zeroSnapshot,
      }))

      expect(result.briScoreChange).toBe(0)
      expect(result.overallDriftDirection).toBe('STABLE')
    })

    it('high task completion can buffer a small decline to keep it from being strongly negative', () => {
      // Small decline in BRI but strong task execution
      const slightlyDeclined: SnapshotData = {
        ...STABLE_SNAPSHOT,
        briScore: STABLE_SNAPSHOT.briScore - 0.01,
        briFinancial: STABLE_SNAPSHOT.briFinancial - 0.01,
      }
      const result = calculateDrift(makeInputs({
        currentSnapshot: slightlyDeclined,
        previousSnapshot: STABLE_SNAPSHOT,
        tasksCompletedCount: 8,
        tasksPendingAtStart: 2,
      }))

      // The strong task completion pushes the weighted score positive,
      // so the direction should NOT be DECLINING
      expect(result.overallDriftDirection).not.toBe('DECLINING')
      // The weighted score should be better than it would be without task completion
      const resultNoTasks = calculateDrift(makeInputs({
        currentSnapshot: slightlyDeclined,
        previousSnapshot: STABLE_SNAPSHOT,
      }))
      expect(result.weightedDriftScore).toBeGreaterThan(resultNoTasks.weightedDriftScore)
    })
  })

  describe('signal threshold logic', () => {
    it('5-point BRI drop triggers HIGH severity', () => {
      const dropped5: SnapshotData = {
        ...STABLE_SNAPSHOT,
        briScore: STABLE_SNAPSHOT.briScore - 0.05,
      }
      const result = calculateDrift(makeInputs({
        currentSnapshot: dropped5,
        previousSnapshot: STABLE_SNAPSHOT,
      }))

      const severity = getDriftSignalSeverity(result.briScoreChange)
      expect(severity).toBe('HIGH')
    })

    it('10+ point BRI drop triggers CRITICAL severity', () => {
      // Use -0.12 to clearly exceed the 0.10 threshold and avoid
      // IEEE 754 floating-point boundary issues at exactly 0.10
      const dropped12: SnapshotData = {
        ...STABLE_SNAPSHOT,
        briScore: STABLE_SNAPSHOT.briScore - 0.12,
      }
      const result = calculateDrift(makeInputs({
        currentSnapshot: dropped12,
        previousSnapshot: STABLE_SNAPSHOT,
      }))

      const severity = getDriftSignalSeverity(result.briScoreChange)
      expect(severity).toBe('CRITICAL')
    })

    it('4-point BRI drop does NOT trigger a signal', () => {
      const dropped4: SnapshotData = {
        ...STABLE_SNAPSHOT,
        briScore: STABLE_SNAPSHOT.briScore - 0.04,
      }
      const result = calculateDrift(makeInputs({
        currentSnapshot: dropped4,
        previousSnapshot: STABLE_SNAPSHOT,
      }))

      const severity = getDriftSignalSeverity(result.briScoreChange)
      expect(severity).toBeNull()
    })

    it('improvement never triggers a signal', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: IMPROVED_SNAPSHOT,
        previousSnapshot: STABLE_SNAPSHOT,
      }))

      const severity = getDriftSignalSeverity(result.briScoreChange)
      expect(severity).toBeNull()
    })
  })

  describe('deterministic behavior', () => {
    it('same inputs always produce same outputs', () => {
      const inputs = makeInputs({
        currentSnapshot: IMPROVED_SNAPSHOT,
        previousSnapshot: STABLE_SNAPSHOT,
        tasksCompletedCount: 3,
        tasksPendingAtStart: 7,
        staleDocumentCount: 2,
        signalsSummary: { high: 1, critical: 0, total: 3 },
        topPendingTasks: SAMPLE_PENDING_TASKS,
      })

      const result1 = calculateDrift(inputs)
      const result2 = calculateDrift(inputs)

      expect(result1.briScoreChange).toBe(result2.briScoreChange)
      expect(result1.valuationChange).toBe(result2.valuationChange)
      expect(result1.overallDriftDirection).toBe(result2.overallDriftDirection)
      expect(result1.weightedDriftScore).toBe(result2.weightedDriftScore)
      expect(result1.taskCompletionRate).toBe(result2.taskCompletionRate)
      expect(result1.categoryChanges).toEqual(result2.categoryChanges)
      expect(result1.recommendedActions).toEqual(result2.recommendedActions)
    })
  })

  describe('weighted drift score properties', () => {
    it('improvement with no stale docs and task completion produces strong positive', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: IMPROVED_SNAPSHOT,
        previousSnapshot: STABLE_SNAPSHOT,
        tasksCompletedCount: 10,
        tasksPendingAtStart: 5,
      }))
      expect(result.weightedDriftScore).toBeGreaterThan(0.2)
    })

    it('decline with stale docs and critical signals produces strong negative', () => {
      const result = calculateDrift(makeInputs({
        currentSnapshot: DECLINED_SNAPSHOT,
        previousSnapshot: STABLE_SNAPSHOT,
        staleDocumentCount: 5,
        signalsSummary: { high: 3, critical: 2, total: 8 },
        tasksCompletedCount: 0,
        tasksPendingAtStart: 15,
      }))
      expect(result.weightedDriftScore).toBeLessThan(-0.3)
    })

    it('mixed scenario (some improve, some decline) produces moderate score', () => {
      // Financial improved, but market and transferability declined
      const mixedSnapshot: SnapshotData = {
        ...STABLE_SNAPSHOT,
        briScore: 0.64, // nearly stable overall
        briFinancial: 0.80, // improved
        briTransferability: 0.50, // declined
        briMarket: 0.45, // declined
      }
      const result = calculateDrift(makeInputs({
        currentSnapshot: mixedSnapshot,
        previousSnapshot: STABLE_SNAPSHOT,
      }))
      // Score should be small magnitude since improvements and declines partially cancel
      expect(Math.abs(result.weightedDriftScore)).toBeLessThan(0.5)
    })
  })
})
