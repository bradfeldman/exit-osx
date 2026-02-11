import { describe, it, expect } from 'vitest'
import {
  aggregateNAFlags,
  computeCategoryBreakdown,
  type NAAssessmentResponse,
  type NATask,
  type CategoryQuestionCount,
} from '../aggregate-na-flags'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeNAResponse(overrides: Partial<NAAssessmentResponse> = {}): NAAssessmentResponse {
  return {
    questionId: overrides.questionId ?? `q-${Math.random().toString(36).slice(2, 8)}`,
    questionText: overrides.questionText ?? 'Test question',
    briCategory: overrides.briCategory ?? 'FINANCIAL',
    updatedAt: overrides.updatedAt ?? new Date('2025-06-01'),
  }
}

function makeNATask(overrides: Partial<NATask> = {}): NATask {
  return {
    id: overrides.id ?? `t-${Math.random().toString(36).slice(2, 8)}`,
    title: overrides.title ?? 'Test task',
    briCategory: overrides.briCategory ?? 'FINANCIAL',
  }
}

const ALL_CATEGORIES = ['FINANCIAL', 'TRANSFERABILITY', 'OPERATIONAL', 'MARKET', 'LEGAL_TAX', 'PERSONAL']

// ---------------------------------------------------------------------------
// aggregateNAFlags
// ---------------------------------------------------------------------------

describe('aggregateNAFlags', () => {
  it('returns empty sections for no input', () => {
    const result = aggregateNAFlags([], [], [])
    expect(result.assessmentNAFlags).toEqual([])
    expect(result.taskNAFlags).toEqual([])
    expect(result.heavilyNACategories).toEqual([])
    expect(result.totalNACount).toBe(0)
  })

  it('maps assessment NA responses correctly', () => {
    const responses = [
      makeNAResponse({ questionId: 'q1', questionText: 'Do you have IP?', briCategory: 'LEGAL_TAX', updatedAt: new Date('2025-06-15') }),
      makeNAResponse({ questionId: 'q2', questionText: 'Annual recurring revenue?', briCategory: 'FINANCIAL', updatedAt: new Date('2025-06-10') }),
    ]

    const result = aggregateNAFlags(responses, [], [])

    expect(result.assessmentNAFlags).toHaveLength(2)
    expect(result.assessmentNAFlags[0]).toEqual({
      questionId: 'q1',
      questionText: 'Do you have IP?',
      briCategory: 'LEGAL_TAX',
      flaggedAt: '2025-06-15T00:00:00.000Z',
    })
    expect(result.assessmentNAFlags[1].briCategory).toBe('FINANCIAL')
    expect(result.totalNACount).toBe(2)
  })

  it('maps task NA flags correctly', () => {
    const tasks = [
      makeNATask({ id: 't1', title: 'Review patent portfolio', briCategory: 'LEGAL_TAX' }),
    ]

    const result = aggregateNAFlags([], tasks, [])

    expect(result.taskNAFlags).toHaveLength(1)
    expect(result.taskNAFlags[0]).toEqual({
      taskId: 't1',
      taskTitle: 'Review patent portfolio',
      briCategory: 'LEGAL_TAX',
    })
    expect(result.totalNACount).toBe(1)
  })

  it('combines assessment and task NA flags in total count', () => {
    const responses = [makeNAResponse(), makeNAResponse()]
    const tasks = [makeNATask()]

    const result = aggregateNAFlags(responses, tasks, [])
    expect(result.totalNACount).toBe(3)
  })

  it('identifies heavily NA categories (>50% threshold)', () => {
    const breakdown: CategoryQuestionCount[] = [
      { category: 'FINANCIAL', totalQuestions: 10, naCount: 6 },      // 60% NA
      { category: 'TRANSFERABILITY', totalQuestions: 8, naCount: 2 },  // 25% NA
      { category: 'OPERATIONAL', totalQuestions: 6, naCount: 0 },      // 0%
      { category: 'MARKET', totalQuestions: 4, naCount: 4 },           // 100% NA
      { category: 'LEGAL_TAX', totalQuestions: 0, naCount: 0 },        // 0/0
      { category: 'PERSONAL', totalQuestions: 3, naCount: 1 },         // 33% NA
    ]

    const result = aggregateNAFlags([], [], breakdown)

    expect(result.heavilyNACategories).toContain('FINANCIAL')
    expect(result.heavilyNACategories).toContain('MARKET')
    expect(result.heavilyNACategories).not.toContain('TRANSFERABILITY')
    expect(result.heavilyNACategories).not.toContain('PERSONAL')
    expect(result.heavilyNACategories).not.toContain('LEGAL_TAX')
  })

  it('handles categories with zero total questions gracefully', () => {
    const breakdown: CategoryQuestionCount[] = [
      { category: 'FINANCIAL', totalQuestions: 0, naCount: 0 },
    ]

    const result = aggregateNAFlags([], [], breakdown)
    expect(result.heavilyNACategories).toEqual([])
  })

  it('handles string dates alongside Date objects', () => {
    const responses = [
      makeNAResponse({ updatedAt: '2025-06-01T00:00:00.000Z' }),
    ]

    const result = aggregateNAFlags(responses, [], [])
    expect(result.assessmentNAFlags[0].flaggedAt).toBe('2025-06-01T00:00:00.000Z')
  })
})

// ---------------------------------------------------------------------------
// computeCategoryBreakdown
// ---------------------------------------------------------------------------

describe('computeCategoryBreakdown', () => {
  it('returns all categories even with no responses', () => {
    const result = computeCategoryBreakdown(ALL_CATEGORIES, [])
    expect(result).toHaveLength(6)
    for (const entry of result) {
      expect(entry.totalQuestions).toBe(0)
      expect(entry.naCount).toBe(0)
    }
  })

  it('correctly counts total and NA per category', () => {
    const responses = [
      { briCategory: 'FINANCIAL', isNA: false },
      { briCategory: 'FINANCIAL', isNA: false },
      { briCategory: 'FINANCIAL', isNA: true },
      { briCategory: 'OPERATIONAL', isNA: true },
      { briCategory: 'OPERATIONAL', isNA: true },
    ]

    const result = computeCategoryBreakdown(ALL_CATEGORIES, responses)

    const financial = result.find((r) => r.category === 'FINANCIAL')!
    expect(financial.totalQuestions).toBe(3)
    expect(financial.naCount).toBe(1)

    const operational = result.find((r) => r.category === 'OPERATIONAL')!
    expect(operational.totalQuestions).toBe(2)
    expect(operational.naCount).toBe(2)

    const market = result.find((r) => r.category === 'MARKET')!
    expect(market.totalQuestions).toBe(0)
    expect(market.naCount).toBe(0)
  })

  it('ignores responses for unknown categories', () => {
    const responses = [
      { briCategory: 'UNKNOWN_CATEGORY', isNA: true },
      { briCategory: 'FINANCIAL', isNA: false },
    ]

    const result = computeCategoryBreakdown(ALL_CATEGORIES, responses)
    const financial = result.find((r) => r.category === 'FINANCIAL')!
    expect(financial.totalQuestions).toBe(1)
    expect(financial.naCount).toBe(0)

    // UNKNOWN_CATEGORY is not in the output
    expect(result.find((r) => r.category === 'UNKNOWN_CATEGORY')).toBeUndefined()
  })

  it('preserves category order from input', () => {
    const categories = ['PERSONAL', 'FINANCIAL', 'MARKET']
    const result = computeCategoryBreakdown(categories, [])
    expect(result.map((r) => r.category)).toEqual(['PERSONAL', 'FINANCIAL', 'MARKET'])
  })
})
