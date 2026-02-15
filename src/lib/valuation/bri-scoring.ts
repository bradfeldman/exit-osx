// BRI Category Scoring
// Pure functions for calculating BRI category scores from assessment responses.
// Extracted from recalculate-snapshot.ts for testability and reuse.

// Default category weights for BRI calculation
export const DEFAULT_CATEGORY_WEIGHTS: Record<string, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

export const BRI_CATEGORIES = [
  'FINANCIAL',
  'TRANSFERABILITY',
  'OPERATIONAL',
  'MARKET',
  'LEGAL_TAX',
  'PERSONAL',
] as const

export type BriCategoryKey = (typeof BRI_CATEGORIES)[number]

/**
 * A simplified assessment response shape for scoring purposes.
 * Decoupled from Prisma types to allow pure-function testing.
 */
export interface ScoringResponse {
  questionId: string
  briCategory: string
  maxImpactPoints: number
  /** Score value of the option to use (effective or selected), 0-1 */
  scoreValue: number | null
  /** Whether this response has a usable option */
  hasOption: boolean
  updatedAt: Date
}

export interface CategoryScore {
  category: string
  totalPoints: number
  earnedPoints: number
  score: number // 0 to 1
}

/**
 * Deduplicate responses to keep only the latest per questionId.
 * Responses MUST be pre-sorted by updatedAt desc for this to work correctly.
 */
export function deduplicateResponses(
  responses: ScoringResponse[]
): Map<string, ScoringResponse> {
  const latest = new Map<string, ScoringResponse>()
  for (const response of responses) {
    if (!latest.has(response.questionId)) {
      latest.set(response.questionId, response)
    }
  }
  return latest
}

/**
 * Calculate per-category BRI scores from a set of deduplicated responses.
 * Returns an array of CategoryScore objects, one per category that has responses.
 * Categories with no responses are NOT included (their weight falls out of the BRI sum).
 */
export function calculateCategoryScores(
  responses: Map<string, ScoringResponse>
): CategoryScore[] {
  const scoresByCategory: Record<string, { total: number; earned: number }> = {}

  for (const response of responses.values()) {
    if (!response.hasOption || response.scoreValue === null) continue

    const category = response.briCategory
    const maxPoints = response.maxImpactPoints
    const earnedPoints = maxPoints * response.scoreValue

    if (!scoresByCategory[category]) {
      scoresByCategory[category] = { total: 0, earned: 0 }
    }
    scoresByCategory[category].total += maxPoints
    scoresByCategory[category].earned += earnedPoints
  }

  const categoryScores: CategoryScore[] = []
  for (const [category, scores] of Object.entries(scoresByCategory)) {
    categoryScores.push({
      category,
      totalPoints: scores.total,
      earnedPoints: scores.earned,
      score: scores.total > 0 ? scores.earned / scores.total : 0,
    })
  }

  return categoryScores
}

/**
 * Calculate the weighted BRI score from category scores and weights.
 * Categories not present in categoryScores contribute 0 to the weighted sum.
 */
export function calculateWeightedBriScore(
  categoryScores: CategoryScore[],
  categoryWeights: Record<string, number> = DEFAULT_CATEGORY_WEIGHTS
): number {
  // Normalize weights to sum to 1.0 to prevent NaN from Math.pow in valuation
  const weightSum = Object.values(categoryWeights).reduce((sum, w) => sum + w, 0)
  const normalizedWeights = weightSum > 0 && Math.abs(weightSum - 1.0) > 0.001
    ? Object.fromEntries(Object.entries(categoryWeights).map(([k, v]) => [k, v / weightSum]))
    : categoryWeights

  let briScore = 0
  for (const cs of categoryScores) {
    const weight = normalizedWeights[cs.category] || 0
    briScore += cs.score * weight
  }
  // Clamp to [0, 1] to ensure valid input for downstream calculations
  return Math.max(0, Math.min(1, briScore))
}

/**
 * Get the score for a specific category from the scores array.
 * Returns 0 if the category has no responses.
 */
export function getCategoryScore(
  categoryScores: CategoryScore[],
  category: string
): number {
  const cs = categoryScores.find(c => c.category === category)
  return cs ? cs.score : 0
}
