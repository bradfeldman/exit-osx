import { describe, it, expect } from 'vitest'
import {
  aggregateNotes,
  hasQualitativeContent,
  type AssessmentNoteInput,
  type TaskCompletionNoteInput,
  type CheckInDetailInput,
} from '../aggregate-notes'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeAssessmentNote(overrides: Partial<AssessmentNoteInput> = {}): AssessmentNoteInput {
  return {
    questionId: overrides.questionId ?? `q-${Math.random().toString(36).slice(2, 8)}`,
    questionText: overrides.questionText ?? 'Test question',
    briCategory: overrides.briCategory ?? 'FINANCIAL',
    note: overrides.note ?? 'This is a note',
    updatedAt: overrides.updatedAt ?? new Date('2025-06-01'),
  }
}

function makeTaskNote(overrides: Partial<TaskCompletionNoteInput> = {}): TaskCompletionNoteInput {
  return {
    id: overrides.id ?? `t-${Math.random().toString(36).slice(2, 8)}`,
    title: overrides.title ?? 'Test task',
    briCategory: overrides.briCategory ?? 'OPERATIONAL',
    completionNotes: overrides.completionNotes ?? 'Completed successfully',
    completedAt: overrides.completedAt ?? new Date('2025-06-05'),
  }
}

function makeCheckIn(overrides: Partial<CheckInDetailInput> = {}): CheckInDetailInput {
  return {
    weekOf: overrides.weekOf ?? new Date('2025-06-02'),
    teamChanges: 'teamChanges' in overrides ? overrides.teamChanges! : null,
    teamChangesNote: 'teamChangesNote' in overrides ? overrides.teamChangesNote! : null,
    customerChanges: 'customerChanges' in overrides ? overrides.customerChanges! : null,
    customerChangesNote: 'customerChangesNote' in overrides ? overrides.customerChangesNote! : null,
    confidenceRating: 'confidenceRating' in overrides ? overrides.confidenceRating! : null,
    additionalNotes: 'additionalNotes' in overrides ? overrides.additionalNotes! : null,
    completedAt: overrides.completedAt ?? new Date('2025-06-03'),
  }
}

// ---------------------------------------------------------------------------
// aggregateNotes
// ---------------------------------------------------------------------------

describe('aggregateNotes', () => {
  it('returns empty sections for no input', () => {
    const result = aggregateNotes([], [], [])
    expect(result.assessmentNotes).toEqual([])
    expect(result.taskCompletionNotes).toEqual([])
    expect(result.checkInDetails).toEqual([])
    expect(result.totalNotesCount).toBe(0)
  })

  it('maps assessment notes correctly', () => {
    const notes = [
      makeAssessmentNote({
        questionId: 'q1',
        questionText: 'Revenue concentration?',
        briCategory: 'FINANCIAL',
        note: 'Top 3 clients are 80% of revenue',
        updatedAt: new Date('2025-06-15'),
      }),
    ]

    const result = aggregateNotes(notes, [], [])

    expect(result.assessmentNotes).toHaveLength(1)
    expect(result.assessmentNotes[0]).toEqual({
      questionId: 'q1',
      questionText: 'Revenue concentration?',
      briCategory: 'FINANCIAL',
      note: 'Top 3 clients are 80% of revenue',
      updatedAt: '2025-06-15T00:00:00.000Z',
    })
  })

  it('maps task completion notes correctly', () => {
    const notes = [
      makeTaskNote({
        id: 't1',
        title: 'Document SOPs',
        briCategory: 'TRANSFERABILITY',
        completionNotes: 'Documented 12 key processes',
        completedAt: new Date('2025-06-20'),
      }),
    ]

    const result = aggregateNotes([], notes, [])

    expect(result.taskCompletionNotes).toHaveLength(1)
    expect(result.taskCompletionNotes[0]).toEqual({
      taskId: 't1',
      taskTitle: 'Document SOPs',
      briCategory: 'TRANSFERABILITY',
      completionNotes: 'Documented 12 key processes',
      completedAt: '2025-06-20T00:00:00.000Z',
    })
  })

  it('maps check-in details correctly', () => {
    const checkIns = [
      makeCheckIn({
        weekOf: new Date('2025-06-02'),
        teamChanges: true,
        teamChangesNote: 'Hired new ops manager',
        customerChanges: false,
        customerChangesNote: null,
        confidenceRating: 8,
        additionalNotes: 'Good week overall',
        completedAt: new Date('2025-06-03'),
      }),
    ]

    const result = aggregateNotes([], [], checkIns)

    expect(result.checkInDetails).toHaveLength(1)
    expect(result.checkInDetails[0]).toEqual({
      weekOf: '2025-06-02T00:00:00.000Z',
      teamChanges: true,
      teamChangesNote: 'Hired new ops manager',
      customerChanges: false,
      customerChangesNote: null,
      confidenceRating: 8,
      additionalNotes: 'Good week overall',
      completedAt: '2025-06-03T00:00:00.000Z',
    })
  })

  it('limits assessment notes to 30', () => {
    const notes = Array.from({ length: 35 }, (_, i) =>
      makeAssessmentNote({ questionId: `q-${i}` })
    )

    const result = aggregateNotes(notes, [], [])
    expect(result.assessmentNotes).toHaveLength(30)
  })

  it('limits task notes to 20', () => {
    const notes = Array.from({ length: 25 }, (_, i) =>
      makeTaskNote({ id: `t-${i}` })
    )

    const result = aggregateNotes([], notes, [])
    expect(result.taskCompletionNotes).toHaveLength(20)
  })

  it('limits check-in details to 12', () => {
    const checkIns = Array.from({ length: 15 }, (_, i) =>
      makeCheckIn({ weekOf: new Date(`2025-06-${String(i + 1).padStart(2, '0')}`) })
    )

    const result = aggregateNotes([], [], checkIns)
    expect(result.checkInDetails).toHaveLength(12)
  })

  it('counts total notes correctly including check-ins with qualitative content', () => {
    const assessmentNotes = [makeAssessmentNote(), makeAssessmentNote()]
    const taskNotes = [makeTaskNote()]
    const checkIns = [
      makeCheckIn({ additionalNotes: 'Some content' }),     // has qualitative
      makeCheckIn({ teamChangesNote: null, customerChangesNote: null, additionalNotes: null }), // no qualitative
    ]

    const result = aggregateNotes(assessmentNotes, taskNotes, checkIns)

    // 2 assessment + 1 task + 1 check-in with content = 4
    expect(result.totalNotesCount).toBe(4)
  })

  it('handles string dates alongside Date objects', () => {
    const notes = [makeAssessmentNote({ updatedAt: '2025-06-01T12:00:00.000Z' })]

    const result = aggregateNotes(notes, [], [])
    expect(result.assessmentNotes[0].updatedAt).toBe('2025-06-01T12:00:00.000Z')
  })
})

// ---------------------------------------------------------------------------
// hasQualitativeContent
// ---------------------------------------------------------------------------

describe('hasQualitativeContent', () => {
  it('returns false for all-null fields', () => {
    expect(hasQualitativeContent({
      teamChangesNote: null,
      customerChangesNote: null,
      additionalNotes: null,
    })).toBe(false)
  })

  it('returns false for all-empty-string fields', () => {
    expect(hasQualitativeContent({
      teamChangesNote: '',
      customerChangesNote: '',
      additionalNotes: '',
    })).toBe(false)
  })

  it('returns false for whitespace-only fields', () => {
    expect(hasQualitativeContent({
      teamChangesNote: '   ',
      customerChangesNote: '\n\t',
      additionalNotes: '  ',
    })).toBe(false)
  })

  it('returns true for teamChangesNote with content', () => {
    expect(hasQualitativeContent({
      teamChangesNote: 'Manager left',
      customerChangesNote: null,
      additionalNotes: null,
    })).toBe(true)
  })

  it('returns true for customerChangesNote with content', () => {
    expect(hasQualitativeContent({
      teamChangesNote: null,
      customerChangesNote: 'Lost a client',
      additionalNotes: null,
    })).toBe(true)
  })

  it('returns true for additionalNotes with content', () => {
    expect(hasQualitativeContent({
      teamChangesNote: null,
      customerChangesNote: null,
      additionalNotes: 'Good progress this week',
    })).toBe(true)
  })
})
