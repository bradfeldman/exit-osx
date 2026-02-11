/**
 * Pure aggregation functions for notes and qualitative data.
 *
 * Qualitative context supplements the quantitative scores. Assessment notes
 * explain WHY a score is what it is. Task completion notes capture what was
 * actually done. Weekly check-in details reveal operational shifts.
 *
 * Sources:
 * - AssessmentResponse.notes
 * - Task.completionNotes
 * - WeeklyCheckIn (team changes, customer changes, confidence, notes)
 */

import type { NotesSection } from './types'

// ─── Input types (decoupled from Prisma) ───────────────────────────────

export interface AssessmentNoteInput {
  questionId: string
  questionText: string
  briCategory: string
  note: string
  updatedAt: Date | string
}

export interface TaskCompletionNoteInput {
  id: string
  title: string
  briCategory: string
  completionNotes: string
  completedAt: Date | string
}

export interface CheckInDetailInput {
  weekOf: Date | string
  teamChanges: boolean | null
  teamChangesNote: string | null
  customerChanges: boolean | null
  customerChangesNote: string | null
  confidenceRating: number | null
  additionalNotes: string | null
  completedAt: Date | string
}

// ─── Configuration ─────────────────────────────────────────────────────

/** Max assessment notes to include */
const ASSESSMENT_NOTES_LIMIT = 30

/** Max task completion notes to include */
const TASK_NOTES_LIMIT = 20

/** Max check-in detail entries to include (most recent) */
const CHECKIN_DETAIL_LIMIT = 12

// ─── Pure aggregation ──────────────────────────────────────────────────

/**
 * Build the notes section from raw data.
 *
 * @param assessmentNotes - Notes from assessment responses (non-empty only)
 * @param taskNotes - Completion notes from completed tasks (non-empty only)
 * @param checkIns - Completed weekly check-ins with detail fields
 */
export function aggregateNotes(
  assessmentNotes: AssessmentNoteInput[],
  taskNotes: TaskCompletionNoteInput[],
  checkIns: CheckInDetailInput[]
): NotesSection {
  const formattedAssessmentNotes = assessmentNotes
    .slice(0, ASSESSMENT_NOTES_LIMIT)
    .map((n) => ({
      questionId: n.questionId,
      questionText: n.questionText,
      briCategory: n.briCategory,
      note: n.note,
      updatedAt: n.updatedAt instanceof Date ? n.updatedAt.toISOString() : n.updatedAt,
    }))

  const formattedTaskNotes = taskNotes
    .slice(0, TASK_NOTES_LIMIT)
    .map((n) => ({
      taskId: n.id,
      taskTitle: n.title,
      briCategory: n.briCategory,
      completionNotes: n.completionNotes,
      completedAt: n.completedAt instanceof Date ? n.completedAt.toISOString() : n.completedAt,
    }))

  const formattedCheckIns = checkIns
    .slice(0, CHECKIN_DETAIL_LIMIT)
    .map((c) => ({
      weekOf: c.weekOf instanceof Date ? c.weekOf.toISOString() : c.weekOf,
      teamChanges: c.teamChanges,
      teamChangesNote: c.teamChangesNote,
      customerChanges: c.customerChanges,
      customerChangesNote: c.customerChangesNote,
      confidenceRating: c.confidenceRating,
      additionalNotes: c.additionalNotes,
      completedAt: c.completedAt instanceof Date ? c.completedAt.toISOString() : c.completedAt,
    }))

  const totalNotesCount =
    formattedAssessmentNotes.length +
    formattedTaskNotes.length +
    formattedCheckIns.filter(hasQualitativeContent).length

  return {
    assessmentNotes: formattedAssessmentNotes,
    taskCompletionNotes: formattedTaskNotes,
    checkInDetails: formattedCheckIns,
    totalNotesCount,
  }
}

/**
 * Check if a check-in entry has any qualitative content worth counting.
 */
export function hasQualitativeContent(checkIn: {
  teamChangesNote: string | null
  customerChangesNote: string | null
  additionalNotes: string | null
}): boolean {
  return (
    (checkIn.teamChangesNote != null && checkIn.teamChangesNote.trim().length > 0) ||
    (checkIn.customerChangesNote != null && checkIn.customerChangesNote.trim().length > 0) ||
    (checkIn.additionalNotes != null && checkIn.additionalNotes.trim().length > 0)
  )
}
