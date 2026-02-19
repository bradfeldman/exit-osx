// Deal Readiness Score (DRS) — V2
// Extracted from BRI scoring. DRS measures documentation, DD prep, and evidence completeness.
// DRS does NOT affect enterprise value — it affects deal speed, structure, and certainty.

import type { CategoryScore } from './bri-scoring'

/**
 * V2 DRS category weights.
 * Redistributed from V1: PERSONAL weight (+5% to FINANCIAL, +5% to TRANSFERABILITY)
 * because personal readiness doesn't affect deal readiness.
 */
export const DRS_CATEGORY_WEIGHTS: Record<string, number> = {
  FINANCIAL: 0.30,        // +5% from PERSONAL (was 0.25)
  TRANSFERABILITY: 0.25,  // +5% from PERSONAL (was 0.20)
  OPERATIONAL: 0.20,      // unchanged
  MARKET: 0.15,           // unchanged
  LEGAL_TAX: 0.10,        // unchanged
  // PERSONAL: excluded from DRS — personal readiness is not a deal metric
}

export interface DealReadinessResult {
  /** Overall DRS score 0-1 */
  score: number
  /** Per-category breakdown */
  categoryContributions: Array<{
    category: string
    score: number
    weight: number
    contribution: number
  }>
  /** Tier label for display (no dollar amounts) */
  tier: 'High' | 'Medium' | 'Low'
}

/**
 * Calculate Deal Readiness Score from BRI category scores.
 * Uses V2 weights (excludes PERSONAL, redistributes to FINANCIAL + TRANSFERABILITY).
 */
export function calculateDealReadinessScore(
  categoryScores: CategoryScore[],
  weights: Record<string, number> = DRS_CATEGORY_WEIGHTS
): DealReadinessResult {
  // Normalize weights to sum to 1.0
  const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0)
  const normalizedWeights = weightSum > 0 && Math.abs(weightSum - 1.0) > 0.001
    ? Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, v / weightSum]))
    : weights

  const categoryContributions: DealReadinessResult['categoryContributions'] = []
  let totalScore = 0

  for (const cs of categoryScores) {
    const weight = normalizedWeights[cs.category] || 0
    if (weight === 0) continue // skip PERSONAL and any unweighted categories

    const contribution = cs.score * weight
    totalScore += contribution

    categoryContributions.push({
      category: cs.category,
      score: cs.score,
      weight,
      contribution,
    })
  }

  const score = Math.max(0, Math.min(1, totalScore))

  return {
    score,
    categoryContributions,
    tier: score >= 0.7 ? 'High' : score >= 0.4 ? 'Medium' : 'Low',
  }
}

/**
 * Get the readiness impact label for an evidence task.
 * Evidence tasks show tier labels, not dollar amounts.
 */
export function getReadinessImpactLabel(taskBriCategory: string, currentDrs: number): string {
  const weight = DRS_CATEGORY_WEIGHTS[taskBriCategory] || 0
  if (weight >= 0.25) return 'High readiness impact'
  if (weight >= 0.15) return 'Medium readiness impact'
  return 'Low readiness impact'
}
