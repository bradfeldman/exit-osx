/**
 * Pure aggregation functions for NA (Not Applicable) flags.
 *
 * NA flags are critical intelligence: they tell us what the company has
 * explicitly said doesn't apply to them. This prevents AI from asking
 * redundant questions or generating irrelevant tasks in those areas.
 *
 * Sources:
 * - AssessmentResponse with confidenceLevel = NOT_APPLICABLE
 * - Task with status = NOT_APPLICABLE
 */

import type { NAFlagsSection } from './types'

// ─── Input types (decoupled from Prisma) ───────────────────────────────

export interface NAAssessmentResponse {
  questionId: string
  questionText: string
  briCategory: string
  updatedAt: Date | string
}

export interface NATask {
  id: string
  title: string
  briCategory: string
}

export interface CategoryQuestionCount {
  category: string
  totalQuestions: number
  naCount: number
}

// ─── Pure aggregation ──────────────────────────────────────────────────

/**
 * Build the NA flags section from raw data.
 *
 * @param naResponses - Assessment responses flagged as NOT_APPLICABLE
 * @param naTasks - Tasks with status NOT_APPLICABLE
 * @param categoryBreakdown - Per-category count of total vs. NA questions
 */
export function aggregateNAFlags(
  naResponses: NAAssessmentResponse[],
  naTasks: NATask[],
  categoryBreakdown: CategoryQuestionCount[]
): NAFlagsSection {
  const assessmentNAFlags = naResponses.map((r) => ({
    questionId: r.questionId,
    questionText: r.questionText,
    briCategory: r.briCategory,
    flaggedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  }))

  const taskNAFlags = naTasks.map((t) => ({
    taskId: t.id,
    taskTitle: t.title,
    briCategory: t.briCategory,
  }))

  // Categories where >50% of questions are NA
  const heavilyNACategories = categoryBreakdown
    .filter((c) => c.totalQuestions > 0 && c.naCount / c.totalQuestions > 0.5)
    .map((c) => c.category)

  const totalNACount = assessmentNAFlags.length + taskNAFlags.length

  return {
    assessmentNAFlags,
    taskNAFlags,
    heavilyNACategories,
    totalNACount,
  }
}

/**
 * Compute the per-category breakdown of NA vs. total question counts.
 *
 * @param allCategories - The 6 BRI categories
 * @param responsesWithNA - All assessment responses (both NA and non-NA) grouped by category
 */
export function computeCategoryBreakdown(
  allCategories: string[],
  responsesWithNA: Array<{ briCategory: string; isNA: boolean }>
): CategoryQuestionCount[] {
  const totals = new Map<string, { total: number; na: number }>()

  for (const cat of allCategories) {
    totals.set(cat, { total: 0, na: 0 })
  }

  for (const r of responsesWithNA) {
    const entry = totals.get(r.briCategory)
    if (entry) {
      entry.total++
      if (r.isNA) entry.na++
    }
  }

  return allCategories.map((cat) => {
    const entry = totals.get(cat) ?? { total: 0, na: 0 }
    return {
      category: cat,
      totalQuestions: entry.total,
      naCount: entry.na,
    }
  })
}
