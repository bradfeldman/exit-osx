import { describe, it, expect } from 'vitest'
import {
  evaluateCadence,
  evaluateBatchCadence,
  daysBetween,
  getStartOfNextWeek,
  computeNextPromptDate,
  CADENCE_CONFIG,
  type CadenceInput,
} from '@/lib/assessment/cadence-rules'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function daysAgo(days: number, now: Date = new Date('2025-06-15T12:00:00Z')): Date {
  const d = new Date(now)
  d.setDate(d.getDate() - days)
  return d
}

const NOW = new Date('2025-06-15T12:00:00Z') // A Sunday

function makeInput(overrides: Partial<CadenceInput> = {}): CadenceInput {
  return {
    categoryId: 'FINANCIAL',
    lastAssessedAt: daysAgo(10, NOW),
    lastTaskCompletedAt: null,
    materialChangeDetected: false,
    userCadencePreference: 'monthly',
    promptsShownThisWeek: 0,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Rule 1: Manual mode — never auto-prompt
// ---------------------------------------------------------------------------

describe('Rule 1: Manual mode', () => {
  it('should never prompt when preference is manual', () => {
    const result = evaluateCadence(
      makeInput({ userCadencePreference: 'manual' }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(false)
    expect(result.matchedRule).toBe('MANUAL_MODE')
    expect(result.nextPromptDate).toBeNull()
  })

  it('should not prompt in manual mode even if material change detected', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'manual',
        materialChangeDetected: true,
      }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(false)
    expect(result.matchedRule).toBe('MANUAL_MODE')
  })

  it('should not prompt in manual mode even if stale (>90 days)', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'manual',
        lastAssessedAt: daysAgo(200, NOW),
      }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(false)
    expect(result.matchedRule).toBe('MANUAL_MODE')
  })
})

// ---------------------------------------------------------------------------
// Rule 2: Weekly prompt limit
// ---------------------------------------------------------------------------

describe('Rule 2: Weekly prompt limit', () => {
  it('should suppress when prompt limit reached', () => {
    const result = evaluateCadence(
      makeInput({ promptsShownThisWeek: 1 }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(false)
    expect(result.matchedRule).toBe('WEEKLY_LIMIT')
  })

  it('should suppress when limit exceeded', () => {
    const result = evaluateCadence(
      makeInput({ promptsShownThisWeek: 3 }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(false)
    expect(result.matchedRule).toBe('WEEKLY_LIMIT')
  })

  it('should provide a next prompt date for start of next week', () => {
    const result = evaluateCadence(
      makeInput({ promptsShownThisWeek: 1 }),
      NOW,
    )
    expect(result.nextPromptDate).not.toBeNull()
    if (result.nextPromptDate) {
      expect(result.nextPromptDate.getTime()).toBeGreaterThan(NOW.getTime())
    }
  })

  it('should suppress even with material change if limit reached', () => {
    const result = evaluateCadence(
      makeInput({
        promptsShownThisWeek: 1,
        materialChangeDetected: true,
      }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(false)
    expect(result.matchedRule).toBe('WEEKLY_LIMIT')
  })
})

// ---------------------------------------------------------------------------
// Rule 3: Material change
// ---------------------------------------------------------------------------

describe('Rule 3: Material change', () => {
  it('should prompt with high urgency when material change detected', () => {
    const result = evaluateCadence(
      makeInput({ materialChangeDetected: true }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(true)
    expect(result.urgency).toBe('high')
    expect(result.matchedRule).toBe('MATERIAL_CHANGE')
  })

  it('should include description when provided', () => {
    const result = evaluateCadence(
      makeInput({
        materialChangeDetected: true,
        materialChangeDescription: 'Revenue increased by 35%',
      }),
      NOW,
    )
    expect(result.reason).toBe('Revenue increased by 35%')
  })

  it('should use default description when none provided', () => {
    const result = evaluateCadence(
      makeInput({ materialChangeDetected: true }),
      NOW,
    )
    expect(result.reason).toContain('significant change')
  })

  it('should allow deferral', () => {
    const result = evaluateCadence(
      makeInput({ materialChangeDetected: true }),
      NOW,
    )
    expect(result.canDefer).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Rule 4: Task completed + stale assessment (>14 days)
// ---------------------------------------------------------------------------

describe('Rule 4: Task completed in category', () => {
  it('should prompt when task completed after assessment and assessment is >14 days old', () => {
    const result = evaluateCadence(
      makeInput({
        lastAssessedAt: daysAgo(20, NOW),
        lastTaskCompletedAt: daysAgo(5, NOW),
      }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(true)
    expect(result.urgency).toBe('medium')
    expect(result.matchedRule).toBe('TASK_COMPLETED')
  })

  it('should NOT prompt when task completed but assessment is recent (<14 days)', () => {
    const result = evaluateCadence(
      makeInput({
        lastAssessedAt: daysAgo(5, NOW),
        lastTaskCompletedAt: daysAgo(2, NOW),
      }),
      NOW,
    )
    // Should not match TASK_COMPLETED rule
    expect(result.matchedRule).not.toBe('TASK_COMPLETED')
  })

  it('should NOT prompt when task was completed before the last assessment', () => {
    const result = evaluateCadence(
      makeInput({
        lastAssessedAt: daysAgo(20, NOW),
        lastTaskCompletedAt: daysAgo(25, NOW),
      }),
      NOW,
    )
    expect(result.matchedRule).not.toBe('TASK_COMPLETED')
  })

  it('should NOT prompt when no task was completed', () => {
    const result = evaluateCadence(
      makeInput({
        lastAssessedAt: daysAgo(20, NOW),
        lastTaskCompletedAt: null,
      }),
      NOW,
    )
    expect(result.matchedRule).not.toBe('TASK_COMPLETED')
  })
})

// ---------------------------------------------------------------------------
// Rule 5: Stale assessment (>90 days)
// ---------------------------------------------------------------------------

describe('Rule 5: Stale assessment (>90 days)', () => {
  it('should prompt when last assessed >90 days ago', () => {
    const result = evaluateCadence(
      makeInput({ lastAssessedAt: daysAgo(95, NOW) }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(true)
    expect(result.urgency).toBe('medium')
    expect(result.matchedRule).toBe('STALE_90_DAYS')
    expect(result.reason).toContain('95 days')
  })

  it('should NOT prompt at exactly 90 days (>90 required)', () => {
    const result = evaluateCadence(
      makeInput({ lastAssessedAt: daysAgo(90, NOW) }),
      NOW,
    )
    // 90 days is not > 90, so should not trigger
    expect(result.matchedRule).not.toBe('STALE_90_DAYS')
  })

  it('should prompt when never assessed (null)', () => {
    const result = evaluateCadence(
      makeInput({ lastAssessedAt: null }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(true)
    expect(result.matchedRule).toBe('STALE_90_DAYS')
    expect(result.reason).toContain('not been assessed')
  })
})

// ---------------------------------------------------------------------------
// Rule 6: Weekly cadence
// ---------------------------------------------------------------------------

describe('Rule 6: Weekly cadence', () => {
  it('should prompt when weekly cadence and >7 days since assessment', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'weekly',
        lastAssessedAt: daysAgo(10, NOW),
      }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(true)
    expect(result.urgency).toBe('low')
    expect(result.matchedRule).toBe('WEEKLY_CADENCE')
  })

  it('should NOT prompt when weekly cadence but <7 days since assessment', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'weekly',
        lastAssessedAt: daysAgo(5, NOW),
      }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(false)
    expect(result.matchedRule).toBe('NO_PROMPT')
  })

  it('should NOT prompt when monthly cadence and >7 days (weekly rule is cadence-specific)', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'monthly',
        lastAssessedAt: daysAgo(10, NOW),
      }),
      NOW,
    )
    // Monthly cadence only triggers at >30 days
    expect(result.matchedRule).not.toBe('WEEKLY_CADENCE')
    expect(result.shouldPrompt).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Rule 7: Monthly cadence
// ---------------------------------------------------------------------------

describe('Rule 7: Monthly cadence', () => {
  it('should prompt when monthly cadence and >30 days since assessment', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'monthly',
        lastAssessedAt: daysAgo(35, NOW),
      }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(true)
    expect(result.urgency).toBe('low')
    expect(result.matchedRule).toBe('MONTHLY_CADENCE')
  })

  it('should NOT prompt when monthly cadence but <30 days since assessment', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'monthly',
        lastAssessedAt: daysAgo(25, NOW),
      }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(false)
    expect(result.matchedRule).toBe('NO_PROMPT')
  })
})

// ---------------------------------------------------------------------------
// Rule 8: No prompt
// ---------------------------------------------------------------------------

describe('Rule 8: No prompt (default)', () => {
  it('should not prompt when all conditions are satisfied', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'monthly',
        lastAssessedAt: daysAgo(10, NOW),
        promptsShownThisWeek: 0,
        materialChangeDetected: false,
        lastTaskCompletedAt: null,
      }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(false)
    expect(result.matchedRule).toBe('NO_PROMPT')
  })

  it('should provide a next prompt date based on cadence preference', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'monthly',
        lastAssessedAt: daysAgo(10, NOW),
      }),
      NOW,
    )
    expect(result.nextPromptDate).not.toBeNull()
    if (result.nextPromptDate) {
      // Should be 30 days after last assessed, which is 20 days from now
      const expectedDate = new Date(daysAgo(10, NOW))
      expectedDate.setDate(expectedDate.getDate() + 30)
      expect(result.nextPromptDate.getTime()).toBe(expectedDate.getTime())
    }
  })
})

// ---------------------------------------------------------------------------
// Rule priority: material change beats time-based rules
// ---------------------------------------------------------------------------

describe('Rule priority', () => {
  it('material change should take priority over monthly cadence', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'monthly',
        lastAssessedAt: daysAgo(35, NOW),
        materialChangeDetected: true,
      }),
      NOW,
    )
    expect(result.matchedRule).toBe('MATERIAL_CHANGE')
    expect(result.urgency).toBe('high')
  })

  it('material change should take priority over stale assessment', () => {
    const result = evaluateCadence(
      makeInput({
        lastAssessedAt: daysAgo(100, NOW),
        materialChangeDetected: true,
      }),
      NOW,
    )
    expect(result.matchedRule).toBe('MATERIAL_CHANGE')
  })

  it('task completion should take priority over monthly cadence', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'monthly',
        lastAssessedAt: daysAgo(35, NOW),
        lastTaskCompletedAt: daysAgo(5, NOW),
      }),
      NOW,
    )
    expect(result.matchedRule).toBe('TASK_COMPLETED')
  })

  it('weekly limit should take priority over material change', () => {
    const result = evaluateCadence(
      makeInput({
        promptsShownThisWeek: 1,
        materialChangeDetected: true,
      }),
      NOW,
    )
    expect(result.matchedRule).toBe('WEEKLY_LIMIT')
    expect(result.shouldPrompt).toBe(false)
  })

  it('manual mode should take priority over everything', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'manual',
        materialChangeDetected: true,
        promptsShownThisWeek: 0,
        lastAssessedAt: daysAgo(200, NOW),
        lastTaskCompletedAt: daysAgo(1, NOW),
      }),
      NOW,
    )
    expect(result.matchedRule).toBe('MANUAL_MODE')
    expect(result.shouldPrompt).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Batch evaluation
// ---------------------------------------------------------------------------

describe('Batch cadence evaluation', () => {
  it('should evaluate all categories', () => {
    const result = evaluateBatchCadence(
      {
        categories: [
          makeInput({ categoryId: 'FINANCIAL', lastAssessedAt: daysAgo(10, NOW) }),
          makeInput({ categoryId: 'OPERATIONAL', lastAssessedAt: daysAgo(35, NOW) }),
        ],
      },
      NOW,
    )
    expect(result.results.size).toBe(2)
    expect(result.results.has('FINANCIAL')).toBe(true)
    expect(result.results.has('OPERATIONAL')).toBe(true)
  })

  it('should only show the highest-urgency prompt', () => {
    const result = evaluateBatchCadence(
      {
        categories: [
          makeInput({
            categoryId: 'FINANCIAL',
            materialChangeDetected: true,
            lastAssessedAt: daysAgo(10, NOW),
          }),
          makeInput({
            categoryId: 'OPERATIONAL',
            lastAssessedAt: daysAgo(100, NOW),
          }),
        ],
      },
      NOW,
    )
    expect(result.promptCount).toBe(1)
    expect(result.topPrompt?.categoryId).toBe('FINANCIAL')
    expect(result.topPrompt?.result.urgency).toBe('high')
    // OPERATIONAL should be suppressed
    const opResult = result.results.get('OPERATIONAL')
    expect(opResult?.shouldPrompt).toBe(false)
    expect(opResult?.matchedRule).toBe('WEEKLY_LIMIT')
  })

  it('should return no prompts when none qualify', () => {
    const result = evaluateBatchCadence(
      {
        categories: [
          makeInput({
            categoryId: 'FINANCIAL',
            lastAssessedAt: daysAgo(5, NOW),
          }),
          makeInput({
            categoryId: 'OPERATIONAL',
            lastAssessedAt: daysAgo(5, NOW),
          }),
        ],
      },
      NOW,
    )
    expect(result.promptCount).toBe(0)
    expect(result.topPrompt).toBeNull()
  })

  it('should return no prompts for empty categories array', () => {
    const result = evaluateBatchCadence({ categories: [] }, NOW)
    expect(result.promptCount).toBe(0)
    expect(result.topPrompt).toBeNull()
    expect(result.results.size).toBe(0)
  })

  it('should pick higher urgency when multiple categories prompt', () => {
    const result = evaluateBatchCadence(
      {
        categories: [
          makeInput({
            categoryId: 'FINANCIAL',
            lastAssessedAt: daysAgo(100, NOW),
            // medium urgency (stale)
          }),
          makeInput({
            categoryId: 'OPERATIONAL',
            materialChangeDetected: true,
            lastAssessedAt: daysAgo(10, NOW),
            // high urgency (material change)
          }),
        ],
      },
      NOW,
    )
    expect(result.topPrompt?.categoryId).toBe('OPERATIONAL')
  })
})

// ---------------------------------------------------------------------------
// Helper function tests
// ---------------------------------------------------------------------------

describe('daysBetween', () => {
  it('should calculate correct days between dates', () => {
    const d1 = new Date('2025-01-01T00:00:00Z')
    const d2 = new Date('2025-01-11T00:00:00Z')
    expect(daysBetween(d1, d2)).toBe(10)
  })

  it('should return 0 for same date', () => {
    const d = new Date('2025-01-01T00:00:00Z')
    expect(daysBetween(d, d)).toBe(0)
  })

  it('should return fractional days', () => {
    const d1 = new Date('2025-01-01T00:00:00Z')
    const d2 = new Date('2025-01-01T12:00:00Z')
    expect(daysBetween(d1, d2)).toBe(0.5)
  })

  it('should return negative for reversed dates', () => {
    const d1 = new Date('2025-01-11T00:00:00Z')
    const d2 = new Date('2025-01-01T00:00:00Z')
    expect(daysBetween(d1, d2)).toBe(-10)
  })
})

describe('getStartOfNextWeek', () => {
  it('should return Monday after a Sunday', () => {
    const sunday = new Date('2025-06-15T12:00:00') // Sunday
    const nextMonday = getStartOfNextWeek(sunday)
    expect(nextMonday.getDay()).toBe(1) // Monday
    expect(nextMonday.getHours()).toBe(0)
    expect(nextMonday.getMinutes()).toBe(0)
    expect(nextMonday.getDate()).toBe(16) // June 16
  })

  it('should return next Monday from a Wednesday', () => {
    const wednesday = new Date('2025-06-11T15:30:00') // Wednesday
    const nextMonday = getStartOfNextWeek(wednesday)
    expect(nextMonday.getDay()).toBe(1)
    expect(nextMonday.getDate()).toBe(16) // June 16
  })

  it('should return next Monday from a Monday', () => {
    const monday = new Date('2025-06-09T10:00:00') // Monday
    const nextMonday = getStartOfNextWeek(monday)
    expect(nextMonday.getDay()).toBe(1)
    expect(nextMonday.getDate()).toBe(16) // Next Monday
  })
})

describe('computeNextPromptDate', () => {
  it('should return null for manual preference', () => {
    expect(computeNextPromptDate(daysAgo(10, NOW), 'manual', NOW)).toBeNull()
  })

  it('should return now when never assessed', () => {
    const result = computeNextPromptDate(null, 'monthly', NOW)
    expect(result?.getTime()).toBe(NOW.getTime())
  })

  it('should return date 7 days after last assessment for weekly', () => {
    const lastAssessed = daysAgo(3, NOW)
    const result = computeNextPromptDate(lastAssessed, 'weekly', NOW)
    const expected = new Date(lastAssessed)
    expected.setDate(expected.getDate() + 7)
    expect(result?.getTime()).toBe(expected.getTime())
  })

  it('should return date 30 days after last assessment for monthly', () => {
    const lastAssessed = daysAgo(10, NOW)
    const result = computeNextPromptDate(lastAssessed, 'monthly', NOW)
    const expected = new Date(lastAssessed)
    expected.setDate(expected.getDate() + 30)
    expect(result?.getTime()).toBe(expected.getTime())
  })

  it('should return now when computed date is in the past', () => {
    const lastAssessed = daysAgo(40, NOW)
    const result = computeNextPromptDate(lastAssessed, 'monthly', NOW)
    // 40 days ago + 30 = 10 days ago, which is past → return now
    expect(result?.getTime()).toBe(NOW.getTime())
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('should handle assessed yesterday (1 day ago)', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'weekly',
        lastAssessedAt: daysAgo(1, NOW),
      }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(false)
    expect(result.matchedRule).toBe('NO_PROMPT')
  })

  it('should handle assessed just now (0 days ago)', () => {
    const result = evaluateCadence(
      makeInput({
        userCadencePreference: 'weekly',
        lastAssessedAt: NOW,
      }),
      NOW,
    )
    expect(result.shouldPrompt).toBe(false)
    expect(result.matchedRule).toBe('NO_PROMPT')
  })

  it('should handle future lastAssessedAt gracefully', () => {
    const futureDate = new Date(NOW)
    futureDate.setDate(futureDate.getDate() + 5)
    const result = evaluateCadence(
      makeInput({
        lastAssessedAt: futureDate,
      }),
      NOW,
    )
    // daysSinceAssessed would be negative → should not trigger any time-based rules
    expect(result.shouldPrompt).toBe(false)
    expect(result.matchedRule).toBe('NO_PROMPT')
  })

  it('should handle task completed same day as assessment', () => {
    const assessDate = daysAgo(20, NOW)
    const result = evaluateCadence(
      makeInput({
        lastAssessedAt: assessDate,
        lastTaskCompletedAt: assessDate,
      }),
      NOW,
    )
    // Task completed at same time as assessment → not "after"
    expect(result.matchedRule).not.toBe('TASK_COMPLETED')
  })

  it('should handle all categories unassessed', () => {
    const result = evaluateBatchCadence(
      {
        categories: [
          makeInput({ categoryId: 'FINANCIAL', lastAssessedAt: null }),
          makeInput({ categoryId: 'OPERATIONAL', lastAssessedAt: null }),
          makeInput({ categoryId: 'MARKET', lastAssessedAt: null }),
        ],
      },
      NOW,
    )
    // All should trigger STALE_90_DAYS but only top one shows
    expect(result.promptCount).toBe(1)
    expect(result.topPrompt).not.toBeNull()
    expect(result.topPrompt?.result.matchedRule).toBe('STALE_90_DAYS')
  })
})

// ---------------------------------------------------------------------------
// Configuration validation
// ---------------------------------------------------------------------------

describe('Configuration constants', () => {
  it('should have sensible values', () => {
    expect(CADENCE_CONFIG.MAX_PROMPTS_PER_WEEK).toBeGreaterThan(0)
    expect(CADENCE_CONFIG.TASK_COMPLETION_REASSESS_DAYS).toBeGreaterThan(0)
    expect(CADENCE_CONFIG.STALE_THRESHOLD_DAYS).toBeGreaterThan(CADENCE_CONFIG.MONTHLY_INTERVAL_DAYS)
    expect(CADENCE_CONFIG.MONTHLY_INTERVAL_DAYS).toBeGreaterThan(CADENCE_CONFIG.WEEKLY_INTERVAL_DAYS)
    expect(CADENCE_CONFIG.WEEKLY_INTERVAL_DAYS).toBeGreaterThan(0)
  })
})
