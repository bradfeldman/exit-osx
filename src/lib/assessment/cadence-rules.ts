/**
 * Assessment Cadence Rules Engine (PROD-017)
 *
 * Pure functions that determine whether a re-assessment prompt should be shown.
 * Prevents assessment fatigue by enforcing cadence rules in priority order.
 *
 * Rules (evaluated in priority order):
 * 1. Manual mode → never auto-prompt
 * 2. Already prompted this week → suppress (max 1 prompt/week)
 * 3. Material change detected → prompt with HIGH urgency
 * 4. Task completed in category + last assessed >14 days → MEDIUM urgency
 * 5. Last assessed >90 days → MEDIUM urgency ("it's been a while")
 * 6. Weekly cadence + last assessed >7 days → LOW urgency
 * 7. Monthly cadence + last assessed >30 days → LOW urgency
 * 8. Otherwise → don't prompt
 *
 * Design: No DB calls. All state passed in as inputs. Fully testable.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CadencePreference = 'weekly' | 'monthly' | 'manual'
export type CadenceUrgency = 'low' | 'medium' | 'high'

export interface CadenceInput {
  categoryId: string
  lastAssessedAt: Date | null
  lastTaskCompletedAt: Date | null
  materialChangeDetected: boolean
  materialChangeDescription?: string
  userCadencePreference: CadencePreference
  promptsShownThisWeek: number
}

export interface CadenceResult {
  shouldPrompt: boolean
  reason: string
  urgency: CadenceUrgency
  canDefer: boolean
  /** If not prompting, when is the next expected prompt date? */
  nextPromptDate: Date | null
  /** Which rule matched (for tracing/debugging) */
  matchedRule: CadenceRuleId
}

export type CadenceRuleId =
  | 'MANUAL_MODE'
  | 'WEEKLY_LIMIT'
  | 'MATERIAL_CHANGE'
  | 'TASK_COMPLETED'
  | 'STALE_90_DAYS'
  | 'WEEKLY_CADENCE'
  | 'MONTHLY_CADENCE'
  | 'NO_PROMPT'

// ---------------------------------------------------------------------------
// Configuration constants (exported for testing)
// ---------------------------------------------------------------------------

export const CADENCE_CONFIG = {
  /** Maximum assessment prompts shown per week across all categories */
  MAX_PROMPTS_PER_WEEK: 1,
  /** Days after task completion before suggesting re-assessment */
  TASK_COMPLETION_REASSESS_DAYS: 14,
  /** Days without assessment before "stale" warning fires */
  STALE_THRESHOLD_DAYS: 90,
  /** Weekly cadence interval in days */
  WEEKLY_INTERVAL_DAYS: 7,
  /** Monthly cadence interval in days */
  MONTHLY_INTERVAL_DAYS: 30,
} as const

// ---------------------------------------------------------------------------
// Core evaluation function
// ---------------------------------------------------------------------------

/**
 * Evaluate cadence rules for a single category.
 * Returns whether to prompt and why.
 */
export function evaluateCadence(input: CadenceInput, now: Date = new Date()): CadenceResult {
  const {
    lastAssessedAt,
    lastTaskCompletedAt,
    materialChangeDetected,
    materialChangeDescription,
    userCadencePreference,
    promptsShownThisWeek,
  } = input

  const daysSinceAssessed = lastAssessedAt
    ? daysBetween(lastAssessedAt, now)
    : Infinity

  // Rule 1: Manual mode — never auto-prompt
  if (userCadencePreference === 'manual') {
    return {
      shouldPrompt: false,
      reason: 'Assessment cadence set to manual — re-assess whenever you choose',
      urgency: 'low',
      canDefer: true,
      nextPromptDate: null,
      matchedRule: 'MANUAL_MODE',
    }
  }

  // Rule 2: Weekly prompt limit — max 1 prompt per week
  if (promptsShownThisWeek >= CADENCE_CONFIG.MAX_PROMPTS_PER_WEEK) {
    const nextPromptDate = getStartOfNextWeek(now)
    return {
      shouldPrompt: false,
      reason: 'Already shown a prompt this week — next prompt available next week',
      urgency: 'low',
      canDefer: true,
      nextPromptDate,
      matchedRule: 'WEEKLY_LIMIT',
    }
  }

  // Rule 3: Material change — prompt immediately with high urgency
  if (materialChangeDetected) {
    const description = materialChangeDescription || 'A significant change was detected'
    return {
      shouldPrompt: true,
      reason: description,
      urgency: 'high',
      canDefer: true,
      nextPromptDate: null,
      matchedRule: 'MATERIAL_CHANGE',
    }
  }

  // Rule 4: Task completed + stale assessment (>14 days)
  if (
    lastTaskCompletedAt &&
    lastAssessedAt &&
    lastTaskCompletedAt > lastAssessedAt &&
    daysSinceAssessed > CADENCE_CONFIG.TASK_COMPLETION_REASSESS_DAYS
  ) {
    return {
      shouldPrompt: true,
      reason: 'A task was completed in this category — time to re-assess and capture the improvement',
      urgency: 'medium',
      canDefer: true,
      nextPromptDate: null,
      matchedRule: 'TASK_COMPLETED',
    }
  }

  // Rule 5: Stale (>90 days without assessment)
  if (daysSinceAssessed > CADENCE_CONFIG.STALE_THRESHOLD_DAYS) {
    const daysText = daysSinceAssessed === Infinity
      ? 'This category has not been assessed yet'
      : `It's been ${Math.floor(daysSinceAssessed)} days since your last assessment`
    return {
      shouldPrompt: true,
      reason: daysText,
      urgency: 'medium',
      canDefer: true,
      nextPromptDate: null,
      matchedRule: 'STALE_90_DAYS',
    }
  }

  // Rule 6: Weekly cadence — prompt after 7 days
  if (
    userCadencePreference === 'weekly' &&
    daysSinceAssessed > CADENCE_CONFIG.WEEKLY_INTERVAL_DAYS
  ) {
    return {
      shouldPrompt: true,
      reason: 'Weekly check-in: review and update your scores',
      urgency: 'low',
      canDefer: true,
      nextPromptDate: null,
      matchedRule: 'WEEKLY_CADENCE',
    }
  }

  // Rule 7: Monthly cadence — prompt after 30 days
  if (
    userCadencePreference === 'monthly' &&
    daysSinceAssessed > CADENCE_CONFIG.MONTHLY_INTERVAL_DAYS
  ) {
    return {
      shouldPrompt: true,
      reason: 'Monthly review: check if your scores still reflect reality',
      urgency: 'low',
      canDefer: true,
      nextPromptDate: null,
      matchedRule: 'MONTHLY_CADENCE',
    }
  }

  // Rule 8: No prompt needed
  const nextPromptDate = computeNextPromptDate(
    lastAssessedAt,
    userCadencePreference,
    now,
  )
  return {
    shouldPrompt: false,
    reason: 'No re-assessment needed at this time',
    urgency: 'low',
    canDefer: true,
    nextPromptDate,
    matchedRule: 'NO_PROMPT',
  }
}

// ---------------------------------------------------------------------------
// Batch evaluation — evaluate all categories and respect global weekly limit
// ---------------------------------------------------------------------------

export interface BatchCadenceInput {
  categories: CadenceInput[]
}

export interface BatchCadenceResult {
  results: Map<string, CadenceResult>
  /** How many categories are prompting */
  promptCount: number
  /** The single highest-urgency prompt (if any) to show */
  topPrompt: { categoryId: string; result: CadenceResult } | null
}

/**
 * Evaluate cadence for multiple categories.
 * Enforces global weekly limit: even if multiple categories qualify,
 * only the highest-urgency one prompts.
 */
export function evaluateBatchCadence(
  input: BatchCadenceInput,
  now: Date = new Date(),
): BatchCadenceResult {
  const results = new Map<string, CadenceResult>()
  const prompting: Array<{ categoryId: string; result: CadenceResult }> = []

  for (const categoryInput of input.categories) {
    const result = evaluateCadence(categoryInput, now)
    results.set(categoryInput.categoryId, result)

    if (result.shouldPrompt) {
      prompting.push({ categoryId: categoryInput.categoryId, result })
    }
  }

  // Sort by urgency (high > medium > low), then by staleness
  const urgencyOrder: Record<CadenceUrgency, number> = { high: 3, medium: 2, low: 1 }
  prompting.sort((a, b) => urgencyOrder[b.result.urgency] - urgencyOrder[a.result.urgency])

  // Only the top prompt is shown (weekly limit of 1)
  const topPrompt = prompting.length > 0 ? prompting[0] : null

  // Suppress non-top prompts from actually showing
  if (topPrompt && prompting.length > 1) {
    for (let i = 1; i < prompting.length; i++) {
      const suppressed = prompting[i]
      results.set(suppressed.categoryId, {
        ...suppressed.result,
        shouldPrompt: false,
        reason: `Suppressed: showing prompt for ${topPrompt.categoryId} instead`,
        matchedRule: 'WEEKLY_LIMIT',
      })
    }
  }

  return {
    results,
    promptCount: topPrompt ? 1 : 0,
    topPrompt,
  }
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Calculate days between two dates (fractional).
 * Returns a positive number if `from` is before `to`.
 */
export function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
}

/**
 * Get the start of the next ISO week (Monday 00:00:00).
 */
export function getStartOfNextWeek(now: Date): Date {
  const result = new Date(now)
  const dayOfWeek = result.getDay()
  // Days until next Monday: if Sunday (0) => 1, Mon (1) => 7, Tue (2) => 6, etc.
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  result.setDate(result.getDate() + daysUntilMonday)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Compute when the next cadence-based prompt would fire.
 * Used to display "Next re-assessment suggested: [date]" in the UI.
 */
export function computeNextPromptDate(
  lastAssessedAt: Date | null,
  preference: CadencePreference,
  now: Date = new Date(),
): Date | null {
  if (preference === 'manual') return null
  if (!lastAssessedAt) return now // Never assessed — now is the time

  const intervalDays =
    preference === 'weekly'
      ? CADENCE_CONFIG.WEEKLY_INTERVAL_DAYS
      : CADENCE_CONFIG.MONTHLY_INTERVAL_DAYS

  const nextDate = new Date(lastAssessedAt)
  nextDate.setDate(nextDate.getDate() + intervalDays)

  // If the computed next date is in the past, return now
  return nextDate <= now ? now : nextDate
}
