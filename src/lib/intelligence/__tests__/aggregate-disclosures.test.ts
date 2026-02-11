import { describe, it, expect } from 'vitest'
import {
  aggregateDisclosures,
  computeHighChangeCategories,
  type DisclosurePromptSetInput,
  type DisclosureResponseInput,
} from '../aggregate-disclosures'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makePromptSet(overrides: Partial<DisclosurePromptSetInput> = {}): DisclosurePromptSetInput {
  return {
    completedAt: overrides.completedAt ?? null,
    skippedAt: overrides.skippedAt ?? null,
  }
}

function makeResponse(overrides: Partial<DisclosureResponseInput> = {}): DisclosureResponseInput {
  return {
    questionKey: overrides.questionKey ?? `q-${Math.random().toString(36).slice(2, 8)}`,
    questionText: overrides.questionText ?? 'Has anything changed?',
    briCategory: overrides.briCategory ?? 'FINANCIAL',
    answer: overrides.answer ?? false,
    followUpAnswer: 'followUpAnswer' in overrides ? overrides.followUpAnswer! : null,
    respondedAt: overrides.respondedAt ?? new Date('2025-06-01'),
    signalCreated: overrides.signalCreated ?? false,
  }
}

// ---------------------------------------------------------------------------
// aggregateDisclosures
// ---------------------------------------------------------------------------

describe('aggregateDisclosures', () => {
  it('returns empty sections for no input', () => {
    const result = aggregateDisclosures([], [])
    expect(result.totalCompleted).toBe(0)
    expect(result.totalSkipped).toBe(0)
    expect(result.recentResponses).toEqual([])
    expect(result.materialChanges).toEqual([])
    expect(result.highChangeCategories).toEqual([])
  })

  it('counts completed and skipped prompt sets', () => {
    const promptSets = [
      makePromptSet({ completedAt: new Date('2025-06-01') }),
      makePromptSet({ completedAt: new Date('2025-06-08') }),
      makePromptSet({ skippedAt: new Date('2025-06-15') }),
      makePromptSet({}), // neither completed nor skipped
    ]

    const result = aggregateDisclosures(promptSets, [])
    expect(result.totalCompleted).toBe(2)
    expect(result.totalSkipped).toBe(1)
  })

  it('includes recent responses with correct mapping', () => {
    const responses = [
      makeResponse({
        questionKey: 'team_change',
        questionText: 'Any key team departures?',
        briCategory: 'TRANSFERABILITY',
        answer: true,
        followUpAnswer: 'CFO resigned',
        respondedAt: new Date('2025-06-10'),
        signalCreated: true,
      }),
    ]

    const result = aggregateDisclosures([], responses)

    expect(result.recentResponses).toHaveLength(1)
    expect(result.recentResponses[0]).toEqual({
      questionKey: 'team_change',
      questionText: 'Any key team departures?',
      briCategory: 'TRANSFERABILITY',
      answer: true,
      followUpAnswer: 'CFO resigned',
      respondedAt: '2025-06-10T00:00:00.000Z',
      signalCreated: true,
    })
  })

  it('limits recent responses to 20', () => {
    const responses = Array.from({ length: 30 }, (_, i) =>
      makeResponse({ questionKey: `q-${i}` })
    )

    const result = aggregateDisclosures([], responses)
    expect(result.recentResponses).toHaveLength(20)
  })

  it('identifies material changes (signal-creating disclosures)', () => {
    const responses = [
      makeResponse({ signalCreated: true, questionText: 'Lost major customer?' }),
      makeResponse({ signalCreated: false, questionText: 'Team stable?' }),
      makeResponse({ signalCreated: true, questionText: 'New legal issue?' }),
    ]

    const result = aggregateDisclosures([], responses)
    expect(result.materialChanges).toHaveLength(2)
    expect(result.materialChanges[0].questionText).toBe('Lost major customer?')
    expect(result.materialChanges[1].questionText).toBe('New legal issue?')
  })

  it('limits material changes to 10', () => {
    const responses = Array.from({ length: 15 }, (_, i) =>
      makeResponse({ signalCreated: true, questionKey: `q-${i}` })
    )

    const result = aggregateDisclosures([], responses)
    expect(result.materialChanges).toHaveLength(10)
  })

  it('handles string dates alongside Date objects', () => {
    const responses = [
      makeResponse({ respondedAt: '2025-06-01T12:00:00.000Z' }),
    ]

    const result = aggregateDisclosures([], responses)
    expect(result.recentResponses[0].respondedAt).toBe('2025-06-01T12:00:00.000Z')
  })
})

// ---------------------------------------------------------------------------
// computeHighChangeCategories
// ---------------------------------------------------------------------------

describe('computeHighChangeCategories', () => {
  it('returns empty for no responses', () => {
    expect(computeHighChangeCategories([], 2)).toEqual([])
  })

  it('returns empty when no "yes" responses', () => {
    const responses = [
      makeResponse({ answer: false, briCategory: 'FINANCIAL' }),
      makeResponse({ answer: false, briCategory: 'OPERATIONAL' }),
    ]
    expect(computeHighChangeCategories(responses, 1)).toEqual([])
  })

  it('identifies categories meeting the threshold', () => {
    const responses = [
      makeResponse({ answer: true, briCategory: 'FINANCIAL' }),
      makeResponse({ answer: true, briCategory: 'FINANCIAL' }),
      makeResponse({ answer: true, briCategory: 'FINANCIAL' }),
      makeResponse({ answer: true, briCategory: 'OPERATIONAL' }),
      makeResponse({ answer: false, briCategory: 'MARKET' }),
    ]

    const result = computeHighChangeCategories(responses, 2)
    expect(result).toContain('FINANCIAL')
    expect(result).not.toContain('OPERATIONAL')
    expect(result).not.toContain('MARKET')
  })

  it('sorts by count descending', () => {
    const responses = [
      makeResponse({ answer: true, briCategory: 'OPERATIONAL' }),
      makeResponse({ answer: true, briCategory: 'OPERATIONAL' }),
      makeResponse({ answer: true, briCategory: 'FINANCIAL' }),
      makeResponse({ answer: true, briCategory: 'FINANCIAL' }),
      makeResponse({ answer: true, briCategory: 'FINANCIAL' }),
    ]

    const result = computeHighChangeCategories(responses, 2)
    expect(result[0]).toBe('FINANCIAL')
    expect(result[1]).toBe('OPERATIONAL')
  })

  it('respects custom threshold', () => {
    const responses = [
      makeResponse({ answer: true, briCategory: 'FINANCIAL' }),
    ]

    expect(computeHighChangeCategories(responses, 1)).toEqual(['FINANCIAL'])
    expect(computeHighChangeCategories(responses, 2)).toEqual([])
  })
})
