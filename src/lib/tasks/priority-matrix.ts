/**
 * Task Priority Matrix Utility
 *
 * Tasks are prioritized based on a 25-level matrix combining Impact and Difficulty.
 * Higher impact + lower difficulty = higher priority (lower rank number).
 *
 * Priority principle:
 * - Tasks with higher impact and lower difficulty should be completed first.
 * - Tasks with lower impact and higher difficulty should be completed last, if at all.
 */

import { ImpactLevel, DifficultyLevel } from '@prisma/client'

// Maximum tasks visible in the action plan at any time
export const MAX_ACTION_PLAN_TASKS = 15

/**
 * Priority matrix mapping: [ImpactLevel][DifficultyLevel] = rank (1-25)
 * Lower rank = higher priority
 */
const PRIORITY_MATRIX: Record<ImpactLevel, Record<DifficultyLevel, number>> = {
  [ImpactLevel.VERY_HIGH]: {
    [DifficultyLevel.NONE]: 1,
    [DifficultyLevel.LOW]: 2,
    [DifficultyLevel.MEDIUM]: 5,
    [DifficultyLevel.HIGH]: 9,
    [DifficultyLevel.VERY_HIGH]: 15,
  },
  [ImpactLevel.HIGH]: {
    [DifficultyLevel.NONE]: 3,
    [DifficultyLevel.LOW]: 4,
    [DifficultyLevel.MEDIUM]: 7,
    [DifficultyLevel.HIGH]: 11,
    [DifficultyLevel.VERY_HIGH]: 16,
  },
  [ImpactLevel.MEDIUM]: {
    [DifficultyLevel.NONE]: 6,
    [DifficultyLevel.LOW]: 8,
    [DifficultyLevel.MEDIUM]: 10,
    [DifficultyLevel.HIGH]: 13,
    [DifficultyLevel.VERY_HIGH]: 17,
  },
  [ImpactLevel.LOW]: {
    [DifficultyLevel.NONE]: 12,
    [DifficultyLevel.LOW]: 14,
    [DifficultyLevel.MEDIUM]: 18,
    [DifficultyLevel.HIGH]: 20,
    [DifficultyLevel.VERY_HIGH]: 22,
  },
  [ImpactLevel.NONE]: {
    [DifficultyLevel.NONE]: 19,
    [DifficultyLevel.LOW]: 21,
    [DifficultyLevel.MEDIUM]: 23,
    [DifficultyLevel.HIGH]: 24,
    [DifficultyLevel.VERY_HIGH]: 25,
  },
}

/**
 * Calculate priority rank based on impact and difficulty levels
 * @returns Priority rank (1-25), where 1 is highest priority
 */
export function calculatePriorityRank(
  impact: ImpactLevel,
  difficulty: DifficultyLevel
): number {
  return PRIORITY_MATRIX[impact]?.[difficulty] ?? 25
}

/**
 * Get human-readable priority tier description
 */
export function getPriorityTier(rank: number): 'highest' | 'moderate' | 'lowest' {
  if (rank <= 10) return 'highest'
  if (rank <= 17) return 'moderate'
  return 'lowest'
}

/**
 * Get priority tier description for display
 */
export function getPriorityTierLabel(rank: number): string {
  const tier = getPriorityTier(rank)
  switch (tier) {
    case 'highest':
      return 'Do First'
    case 'moderate':
      return 'When Capacity Allows'
    case 'lowest':
      return 'Defer or Avoid'
  }
}

/**
 * Map assessment score (0-1) to impact level
 * Lower score = higher impact (more room for improvement)
 */
export function scoreToImpactLevel(score: number): ImpactLevel {
  if (score >= 0.9) return ImpactLevel.NONE      // Already excellent
  if (score >= 0.7) return ImpactLevel.LOW       // Good, minor improvements
  if (score >= 0.5) return ImpactLevel.MEDIUM    // Average, moderate improvements
  if (score >= 0.3) return ImpactLevel.HIGH      // Below average, significant improvements
  return ImpactLevel.VERY_HIGH                    // Poor, critical improvements needed
}

/**
 * Map task complexity/effort to difficulty level
 */
export function effortToDifficultyLevel(
  effortLevel: string,
  estimatedHours?: number | null
): DifficultyLevel {
  // First check estimated hours if available
  if (estimatedHours !== null && estimatedHours !== undefined) {
    if (estimatedHours <= 1) return DifficultyLevel.NONE
    if (estimatedHours <= 4) return DifficultyLevel.LOW
    if (estimatedHours <= 16) return DifficultyLevel.MEDIUM
    if (estimatedHours <= 40) return DifficultyLevel.HIGH
    return DifficultyLevel.VERY_HIGH
  }

  // Fall back to effort level mapping
  switch (effortLevel) {
    case 'MINIMAL':
      return DifficultyLevel.NONE
    case 'LOW':
      return DifficultyLevel.LOW
    case 'MODERATE':
      return DifficultyLevel.MEDIUM
    case 'HIGH':
      return DifficultyLevel.HIGH
    case 'MAJOR':
      return DifficultyLevel.VERY_HIGH
    default:
      return DifficultyLevel.MEDIUM
  }
}

/**
 * Get impact level display label
 */
export function getImpactLabel(impact: ImpactLevel): string {
  switch (impact) {
    case ImpactLevel.VERY_HIGH:
      return 'Very High'
    case ImpactLevel.HIGH:
      return 'High'
    case ImpactLevel.MEDIUM:
      return 'Medium'
    case ImpactLevel.LOW:
      return 'Low'
    case ImpactLevel.NONE:
      return 'None'
  }
}

/**
 * Get difficulty level display label
 */
export function getDifficultyLabel(difficulty: DifficultyLevel): string {
  switch (difficulty) {
    case DifficultyLevel.VERY_HIGH:
      return 'Very High'
    case DifficultyLevel.HIGH:
      return 'High'
    case DifficultyLevel.MEDIUM:
      return 'Medium'
    case DifficultyLevel.LOW:
      return 'Low'
    case DifficultyLevel.NONE:
      return 'None'
  }
}

/**
 * Sort tasks by priority rank (ascending - lower rank first)
 */
export function sortByPriority<T extends { priorityRank: number }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => a.priorityRank - b.priorityRank)
}
