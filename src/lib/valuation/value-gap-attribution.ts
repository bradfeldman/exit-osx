// Value Gap Attribution
// Single source of truth for distributing the total value gap across BRI categories.
//
// PROD-016: Created to fix category value gap reconciliation.
// The sum of individual category dollar impacts must exactly equal the total value gap.
//
// Approach: Proportional attribution with rounding correction.
// Each category's share is proportional to its weighted gap:
//   rawGap_i = (1 - categoryScore_i) * categoryWeight_i
//   dollarImpact_i = (rawGap_i / totalRawGap) * totalValueGap
//
// Rounding correction: After rounding each category to the nearest dollar,
// any rounding residual is added to the largest category to ensure exact reconciliation.

export interface CategoryGapInput {
  /** Category key (e.g., 'FINANCIAL', 'TRANSFERABILITY') */
  category: string
  /** Category BRI score, 0-1 scale */
  score: number
  /** Category weight from BRI weights */
  weight: number
}

export interface CategoryGapResult {
  category: string
  score: number
  weight: number
  /** Raw (unscaled) gap contribution: (1 - score) * weight */
  rawGap: number
  /** Dollar impact attributed to this category (rounded to nearest dollar) */
  dollarImpact: number
}

/**
 * Distribute the total value gap across BRI categories using proportional attribution.
 *
 * The formula:
 *   rawGap_i = (1 - score_i) * weight_i
 *   dollarImpact_i = round((rawGap_i / sum(rawGaps)) * totalValueGap)
 *
 * After rounding, any residual (totalValueGap - sum(dollarImpacts)) is added to
 * the category with the largest dollar impact to ensure exact reconciliation.
 *
 * Categories with rawGap = 0 (perfect score) get $0 impact.
 * If totalRawGap = 0 (all categories perfect), all impacts are $0.
 *
 * @param categories - Array of category scores and weights (typically 5, excluding PERSONAL)
 * @param totalValueGap - The total value gap to distribute (from valuation snapshot)
 * @returns Array of CategoryGapResult, sorted by dollarImpact descending
 */
export function calculateCategoryValueGaps(
  categories: CategoryGapInput[],
  totalValueGap: number
): CategoryGapResult[] {
  if (totalValueGap <= 0 || categories.length === 0) {
    return categories.map(c => ({
      category: c.category,
      score: c.score,
      weight: c.weight,
      rawGap: (1 - c.score) * c.weight,
      dollarImpact: 0,
    }))
  }

  // Step 1: Calculate raw gaps
  const withGaps = categories.map(c => ({
    category: c.category,
    score: c.score,
    weight: c.weight,
    rawGap: (1 - c.score) * c.weight,
  }))

  const totalRawGap = withGaps.reduce((sum, c) => sum + c.rawGap, 0)

  if (totalRawGap <= 0) {
    // All categories at perfect score -- no gap to distribute
    return withGaps.map(c => ({ ...c, dollarImpact: 0 }))
  }

  // Step 2: Calculate proportional dollar impacts (rounded)
  const results: CategoryGapResult[] = withGaps.map(c => ({
    ...c,
    dollarImpact: Math.round((c.rawGap / totalRawGap) * totalValueGap),
  }))

  // Step 3: Rounding correction -- ensure sum equals totalValueGap exactly
  const currentSum = results.reduce((sum, c) => sum + c.dollarImpact, 0)
  const residual = Math.round(totalValueGap) - currentSum

  if (residual !== 0) {
    // Find the category with the largest dollar impact and adjust it
    let maxIdx = 0
    let maxImpact = 0
    for (let i = 0; i < results.length; i++) {
      if (results[i].dollarImpact > maxImpact) {
        maxImpact = results[i].dollarImpact
        maxIdx = i
      }
    }
    results[maxIdx].dollarImpact += residual
  }

  // Step 4: Sort by dollar impact descending
  results.sort((a, b) => b.dollarImpact - a.dollarImpact)

  return results
}
