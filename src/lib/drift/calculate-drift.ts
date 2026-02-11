/**
 * Pure Drift Calculation Engine
 *
 * Compares two points in time to determine how a company's buyer-readiness
 * has changed. All functions in this module are pure -- they take data in
 * and return results out, with no side effects or database calls. This
 * makes them fully testable without mocking.
 *
 * The drift engine answers: "How has your buyer-readiness changed since
 * last month?" by examining BRI scores, valuation, category-level changes,
 * document staleness, signal activity, and task completion rate.
 */

import type { BriCategory } from '@prisma/client'
import { DEFAULT_BRI_WEIGHTS } from '@/lib/bri-weights'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Snapshot data extracted from a ValuationSnapshot record */
export interface SnapshotData {
  briScore: number
  currentValue: number
  briFinancial: number
  briTransferability: number
  briOperational: number
  briMarket: number
  briLegalTax: number
  briPersonal: number
}

/** Per-category drift breakdown */
export interface CategoryChange {
  category: BriCategory
  label: string
  previousScore: number
  currentScore: number
  delta: number
  direction: 'improving' | 'stable' | 'declining'
  /** BRI weight for this category (used in overall drift weighting) */
  weight: number
}

/** Summary of signals detected during the drift period */
export interface SignalsSummary {
  high: number
  critical: number
  total: number
}

/** A recommended action derived from drift analysis */
export interface RecommendedAction {
  taskId?: string
  description: string
  impact: string
  category?: BriCategory
}

/** The overall drift direction based on weighted analysis */
export type DriftDirection = 'IMPROVING' | 'STABLE' | 'DECLINING'

/** Complete drift calculation result */
export interface DriftResult {
  briScoreChange: number
  valuationChange: number
  categoryChanges: CategoryChange[]
  staleDocumentCount: number
  signalsSummary: SignalsSummary
  taskCompletionRate: number
  overallDriftDirection: DriftDirection
  recommendedActions: RecommendedAction[]
  /** Weighted drift score: positive = improving, negative = declining */
  weightedDriftScore: number
}

/** Inputs needed for the drift calculation */
export interface DriftCalculationInputs {
  currentSnapshot: SnapshotData | null
  previousSnapshot: SnapshotData | null
  staleDocumentCount: number
  signalsSummary: SignalsSummary
  tasksCompletedCount: number
  tasksPendingAtStart: number
  /** Top declining tasks to generate recommendations from */
  topPendingTasks: Array<{
    id: string
    title: string
    briCategory: BriCategory
    normalizedValue: number
  }>
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_META: Array<{ key: keyof SnapshotData; category: BriCategory; label: string }> = [
  { key: 'briFinancial', category: 'FINANCIAL', label: 'Financial Health' },
  { key: 'briTransferability', category: 'TRANSFERABILITY', label: 'Transferability' },
  { key: 'briOperational', category: 'OPERATIONAL', label: 'Operations' },
  { key: 'briMarket', category: 'MARKET', label: 'Market Position' },
  { key: 'briLegalTax', category: 'LEGAL_TAX', label: 'Legal & Tax' },
  { key: 'briPersonal', category: 'PERSONAL', label: 'Personal Readiness' },
]

/**
 * Thresholds for determining direction at category and overall level.
 * A change smaller than the threshold in either direction is "stable".
 * Values are on the 0-1 BRI scale (0.005 = 0.5 percentage points).
 */
const STABILITY_THRESHOLD = 0.005

/**
 * Thresholds for signal severity in determining drift direction.
 * BRI change (0-1 scale) needed to trigger HIGH or CRITICAL signal.
 * - >0.05 drop (5 pts) = HIGH severity signal
 * - >0.10 drop (10 pts) = CRITICAL severity signal
 */
export const SIGNAL_THRESHOLDS = {
  HIGH_BRI_DROP: 0.05,
  CRITICAL_BRI_DROP: 0.10,
}

// ---------------------------------------------------------------------------
// Core Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the direction of a numeric change given a stability threshold.
 */
function getDirection(delta: number, threshold: number = STABILITY_THRESHOLD): 'improving' | 'stable' | 'declining' {
  if (delta > threshold) return 'improving'
  if (delta < -threshold) return 'declining'
  return 'stable'
}

/**
 * Build per-category change analysis from two snapshots.
 */
export function calculateCategoryChanges(
  current: SnapshotData | null,
  previous: SnapshotData | null
): CategoryChange[] {
  return CATEGORY_META.map(({ key, category, label }) => {
    const currentScore = current ? current[key] as number : 0
    const previousScore = previous ? previous[key] as number : 0
    const delta = currentScore - previousScore
    const weight = DEFAULT_BRI_WEIGHTS[category] ?? 0

    return {
      category,
      label,
      previousScore,
      currentScore,
      delta,
      direction: getDirection(delta),
      weight,
    }
  })
}

/**
 * Calculate a weighted drift score that factors in:
 * - BRI score change (weighted by category importance)
 * - Document staleness (negative pressure)
 * - Signal activity (negative pressure from high/critical signals)
 * - Task completion (positive pressure)
 *
 * Returns a score where positive = improving, negative = declining.
 * The magnitude is on a roughly -1 to +1 scale but can exceed that
 * in extreme cases.
 */
export function calculateWeightedDriftScore(
  categoryChanges: CategoryChange[],
  staleDocumentCount: number,
  signalsSummary: SignalsSummary,
  taskCompletionRate: number
): number {
  // Factor 1: Weighted BRI category change (primary signal, weight 0.60)
  const weightedBriChange = categoryChanges.reduce(
    (sum, c) => sum + c.delta * c.weight,
    0
  )
  // Normalize to roughly -1..+1 range (a 0.10 swing in weighted BRI is significant)
  const briFactor = weightedBriChange / 0.10

  // Factor 2: Document staleness penalty (weight 0.15)
  // Each stale doc applies a small negative pressure
  const stalenessPenalty = Math.min(staleDocumentCount * 0.1, 1.0)

  // Factor 3: Signal severity pressure (weight 0.10)
  // Critical and high signals are negative pressure
  const signalPressure = Math.min(
    (signalsSummary.critical * 0.3 + signalsSummary.high * 0.15),
    1.0
  )

  // Factor 4: Task completion rate boost (weight 0.15)
  // Higher completion rate = positive pressure
  const taskBoost = taskCompletionRate

  return (
    briFactor * 0.60 +
    (-stalenessPenalty) * 0.15 +
    (-signalPressure) * 0.10 +
    taskBoost * 0.15
  )
}

/**
 * Determine overall drift direction from the weighted score.
 * Uses a threshold band around zero for "STABLE".
 */
export function determineDriftDirection(weightedScore: number): DriftDirection {
  if (weightedScore > 0.05) return 'IMPROVING'
  if (weightedScore < -0.05) return 'DECLINING'
  return 'STABLE'
}

/**
 * Generate recommended actions based on the biggest declines.
 * Prioritizes categories that declined the most and have pending high-value tasks.
 */
export function generateRecommendedActions(
  categoryChanges: CategoryChange[],
  topPendingTasks: DriftCalculationInputs['topPendingTasks'],
  staleDocumentCount: number,
  signalsSummary: SignalsSummary
): RecommendedAction[] {
  const actions: RecommendedAction[] = []

  // 1. Address categories that declined (sorted by magnitude of decline)
  const decliningCategories = categoryChanges
    .filter(c => c.direction === 'declining')
    .sort((a, b) => a.delta - b.delta) // most negative first

  for (const cat of decliningCategories.slice(0, 2)) {
    const pts = Math.abs(Math.round(cat.delta * 100))
    actions.push({
      description: `Address ${cat.label} decline (-${pts} points this period)`,
      impact: `${cat.label} dropped from ${Math.round(cat.previousScore * 100)} to ${Math.round(cat.currentScore * 100)}`,
      category: cat.category,
    })
  }

  // 2. Surface highest-value pending tasks in declining categories
  const decliningCategorySet = new Set(decliningCategories.map(c => c.category))
  const relevantTasks = topPendingTasks
    .filter(t => decliningCategorySet.has(t.briCategory))
    .sort((a, b) => b.normalizedValue - a.normalizedValue)
    .slice(0, 3)

  for (const task of relevantTasks) {
    actions.push({
      taskId: task.id,
      description: task.title,
      impact: `High-value task in ${CATEGORY_META.find(c => c.category === task.briCategory)?.label ?? task.briCategory}`,
      category: task.briCategory,
    })
  }

  // 3. Document staleness warning
  if (staleDocumentCount > 0) {
    actions.push({
      description: `Update ${staleDocumentCount} stale document${staleDocumentCount !== 1 ? 's' : ''} in your evidence room`,
      impact: 'Stale documents reduce buyer confidence and evidence score',
    })
  }

  // 4. Critical signal warning
  if (signalsSummary.critical > 0) {
    actions.push({
      description: `Review ${signalsSummary.critical} critical signal${signalsSummary.critical !== 1 ? 's' : ''} requiring immediate attention`,
      impact: 'Critical signals can significantly impact buyer readiness',
    })
  }

  // Cap at 5 recommended actions to keep the report focused
  return actions.slice(0, 5)
}

/**
 * Calculate task completion rate for the period.
 *
 * Rate = tasks completed / (tasks completed + tasks that were pending at period start)
 * This measures "what fraction of the work that could have been done was actually done."
 *
 * Returns 0 if there were no completable tasks (avoids division by zero).
 * Returns 1.0 if all tasks from the period start were completed.
 */
export function calculateTaskCompletionRate(
  tasksCompleted: number,
  tasksPendingAtStart: number
): number {
  const total = tasksCompleted + tasksPendingAtStart
  if (total === 0) return 0
  return Math.min(tasksCompleted / total, 1.0)
}

/**
 * Determine signal severity for creating a drift-related signal.
 * Returns null if the BRI change does not warrant a signal.
 */
export function getDriftSignalSeverity(
  briScoreChange: number
): 'HIGH' | 'CRITICAL' | null {
  // Only negative changes (declines) trigger signals
  if (briScoreChange >= 0) return null

  const drop = Math.abs(briScoreChange)
  if (drop >= SIGNAL_THRESHOLDS.CRITICAL_BRI_DROP) return 'CRITICAL'
  if (drop >= SIGNAL_THRESHOLDS.HIGH_BRI_DROP) return 'HIGH'
  return null
}

// ---------------------------------------------------------------------------
// Main Calculation
// ---------------------------------------------------------------------------

/**
 * Execute the complete drift calculation.
 *
 * This is a pure function: no database access, no side effects.
 * All data is passed in via DriftCalculationInputs.
 *
 * @param inputs - Pre-fetched data for the drift period
 * @returns Complete drift analysis result
 */
export function calculateDrift(inputs: DriftCalculationInputs): DriftResult {
  const {
    currentSnapshot,
    previousSnapshot,
    staleDocumentCount,
    signalsSummary,
    tasksCompletedCount,
    tasksPendingAtStart,
    topPendingTasks,
  } = inputs

  // BRI and valuation deltas
  const currentBri = currentSnapshot?.briScore ?? 0
  const previousBri = previousSnapshot?.briScore ?? 0
  const briScoreChange = currentBri - previousBri

  const currentValue = currentSnapshot?.currentValue ?? 0
  const previousValue = previousSnapshot?.currentValue ?? 0
  const valuationChange = currentValue - previousValue

  // Per-category analysis
  const categoryChanges = calculateCategoryChanges(currentSnapshot, previousSnapshot)

  // Task completion rate
  const taskCompletionRate = calculateTaskCompletionRate(
    tasksCompletedCount,
    tasksPendingAtStart
  )

  // Weighted drift score
  const weightedDriftScore = calculateWeightedDriftScore(
    categoryChanges,
    staleDocumentCount,
    signalsSummary,
    taskCompletionRate
  )

  // Overall direction
  const overallDriftDirection = determineDriftDirection(weightedDriftScore)

  // Recommended actions
  const recommendedActions = generateRecommendedActions(
    categoryChanges,
    topPendingTasks,
    staleDocumentCount,
    signalsSummary
  )

  return {
    briScoreChange,
    valuationChange,
    categoryChanges,
    staleDocumentCount,
    signalsSummary,
    taskCompletionRate,
    overallDriftDirection,
    recommendedActions,
    weightedDriftScore,
  }
}
