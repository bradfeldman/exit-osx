/**
 * Confidence Scoring Module
 *
 * Maps ConfidenceLevel enum values to numeric multipliers used for
 * weighting the impact of signals on value calculations.
 *
 * Spec:
 *   UNCERTAIN       -> 0.5x
 *   SOMEWHAT_CONFIDENT (LOW)  -> 0.7x
 *   CONFIDENT (MODERATE) -> 0.85x
 *   VERIFIED (HIGH)      -> 1.0x
 *   NOT_APPLICABLE       -> 1.0x (treated as VERY_HIGH / no discount)
 *
 * These multipliers answer the question: "How much should we weight this
 * signal's estimated impact given our confidence in its accuracy?"
 */

import type { ConfidenceLevel } from '@prisma/client'

/**
 * Confidence multiplier lookup.
 * Used to discount estimated value impacts based on signal confidence.
 */
export const CONFIDENCE_MULTIPLIERS: Record<ConfidenceLevel, number> = {
  UNCERTAIN: 0.5,
  SOMEWHAT_CONFIDENT: 0.7,
  CONFIDENT: 0.85,
  VERIFIED: 1.0,
  NOT_APPLICABLE: 1.0,
}

/**
 * Apply confidence weighting to an estimated value impact.
 *
 * @param estimatedImpact - The raw estimated impact (positive or negative)
 * @param confidence - The confidence level of the signal
 * @returns The confidence-weighted impact value
 */
export function applyConfidenceWeight(
  estimatedImpact: number,
  confidence: ConfidenceLevel
): number {
  const multiplier = CONFIDENCE_MULTIPLIERS[confidence] ?? 0.5
  return estimatedImpact * multiplier
}

/**
 * Confidence upgrade path when an advisor confirms a signal.
 * Returns the new confidence level after confirmation.
 */
export const CONFIDENCE_UPGRADE_MAP: Partial<Record<ConfidenceLevel, ConfidenceLevel>> = {
  UNCERTAIN: 'CONFIDENT',
  SOMEWHAT_CONFIDENT: 'VERIFIED',
  CONFIDENT: 'VERIFIED',
}

/**
 * Confidence downgrade path when an advisor dismisses/denies a signal.
 * Returns the new confidence level after denial.
 */
export const CONFIDENCE_DOWNGRADE_MAP: Partial<Record<ConfidenceLevel, ConfidenceLevel>> = {
  VERIFIED: 'SOMEWHAT_CONFIDENT',
  CONFIDENT: 'UNCERTAIN',
  SOMEWHAT_CONFIDENT: 'UNCERTAIN',
}

/**
 * Get the upgraded confidence level after advisor confirmation.
 */
export function getUpgradedConfidence(current: ConfidenceLevel): ConfidenceLevel {
  return CONFIDENCE_UPGRADE_MAP[current] ?? current
}

/**
 * Get the downgraded confidence level after advisor denial.
 */
export function getDowngradedConfidence(current: ConfidenceLevel): ConfidenceLevel {
  return CONFIDENCE_DOWNGRADE_MAP[current] ?? current
}

/**
 * Determine the appropriate confidence level for a signal based on its channel.
 *
 * Different channels have different inherent reliability:
 * - PROMPTED_DISCLOSURE: Owner self-reported, moderate confidence
 * - TASK_GENERATED: System-verified completion, high confidence
 * - TIME_DECAY: System-calculated, high confidence (math is deterministic)
 * - EXTERNAL: Third-party data, moderate confidence until verified
 * - ADVISOR: Professional judgment, high confidence
 */
export function getDefaultConfidenceForChannel(
  channel: 'PROMPTED_DISCLOSURE' | 'TASK_GENERATED' | 'TIME_DECAY' | 'EXTERNAL' | 'ADVISOR'
): ConfidenceLevel {
  switch (channel) {
    case 'PROMPTED_DISCLOSURE':
      return 'SOMEWHAT_CONFIDENT'
    case 'TASK_GENERATED':
      return 'CONFIDENT'
    case 'TIME_DECAY':
      return 'CONFIDENT'
    case 'EXTERNAL':
      return 'SOMEWHAT_CONFIDENT'
    case 'ADVISOR':
      return 'CONFIDENT'
    default:
      return 'UNCERTAIN'
  }
}
