/**
 * Pure aggregation functions for disclosure responses.
 *
 * Disclosures capture periodic self-reported changes — team changes,
 * customer losses, legal issues, etc. They are a rich signal of what's
 * actually happening in the business between assessments.
 *
 * Sources:
 * - DisclosurePromptSet (completion/skip tracking)
 * - DisclosureResponse (individual answers with follow-ups)
 */

import type { DisclosuresSection } from './types'

// ─── Input types (decoupled from Prisma) ───────────────────────────────

export interface DisclosurePromptSetInput {
  completedAt: Date | string | null
  skippedAt: Date | string | null
}

export interface DisclosureResponseInput {
  questionKey: string
  questionText: string
  briCategory: string
  answer: boolean
  followUpAnswer: string | null
  respondedAt: Date | string
  signalCreated: boolean
}

// ─── Configuration ─────────────────────────────────────────────────────

/** Number of recent responses to include in the profile */
const RECENT_RESPONSE_LIMIT = 20

/** Minimum "yes" disclosures to qualify a category as high-change */
const HIGH_CHANGE_THRESHOLD = 2

// ─── Pure aggregation ──────────────────────────────────────────────────

/**
 * Build the disclosures section from raw data.
 *
 * @param promptSets - All disclosure prompt sets for the company
 * @param responses - All disclosure responses, sorted by respondedAt desc
 */
export function aggregateDisclosures(
  promptSets: DisclosurePromptSetInput[],
  responses: DisclosureResponseInput[]
): DisclosuresSection {
  const totalCompleted = promptSets.filter((ps) => ps.completedAt !== null).length
  const totalSkipped = promptSets.filter((ps) => ps.skippedAt !== null).length

  // Most recent responses (already sorted desc by caller)
  const recentResponses = responses.slice(0, RECENT_RESPONSE_LIMIT).map((r) => ({
    questionKey: r.questionKey,
    questionText: r.questionText,
    briCategory: r.briCategory,
    answer: r.answer,
    followUpAnswer: r.followUpAnswer,
    respondedAt: r.respondedAt instanceof Date ? r.respondedAt.toISOString() : r.respondedAt,
    signalCreated: r.signalCreated,
  }))

  // Disclosures that triggered signal creation = material changes
  const materialChanges = responses
    .filter((r) => r.signalCreated)
    .slice(0, 10)
    .map((r) => ({
      questionText: r.questionText,
      briCategory: r.briCategory,
      followUpAnswer: r.followUpAnswer,
      respondedAt: r.respondedAt instanceof Date ? r.respondedAt.toISOString() : r.respondedAt,
    }))

  // Categories with the most "yes" (change-affirmative) disclosures
  const highChangeCategories = computeHighChangeCategories(responses, HIGH_CHANGE_THRESHOLD)

  return {
    totalCompleted,
    totalSkipped,
    recentResponses,
    materialChanges,
    highChangeCategories,
  }
}

/**
 * Identify categories where the company has reported the most changes.
 *
 * @param responses - All disclosure responses
 * @param threshold - Minimum "yes" count to qualify
 */
export function computeHighChangeCategories(
  responses: DisclosureResponseInput[],
  threshold: number
): string[] {
  const yesCounts = new Map<string, number>()

  for (const r of responses) {
    if (r.answer) {
      yesCounts.set(r.briCategory, (yesCounts.get(r.briCategory) ?? 0) + 1)
    }
  }

  return Array.from(yesCounts.entries())
    .filter(([, count]) => count >= threshold)
    .sort(([, a], [, b]) => b - a)
    .map(([cat]) => cat)
}
