// Value Gap Attribution V2
// Distributes value gap into actionable categories.
//
// V2 replaces proportional BRI attribution with a dual-layer approach:
// 1. Three-component decomposition (addressable / structural / aspirational)
// 2. BRI category breakdown within addressable gap for task prioritization
//
// V1 functions kept for backwards compatibility during migration.

import type { RiskDiscount } from './risk-discounts'
import { isAddressableDiscount } from './risk-discounts'

// ─── V2 Types ────────────────────────────────────────────────────────────────

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
 * V2: Distribute the ADDRESSABLE portion of the value gap across BRI categories.
 *
 * Unlike V1 which distributed the TOTAL value gap, V2 only distributes
 * the addressable gap — the portion that can be reduced by completing tasks.
 *
 * Structural and aspirational gaps are shown separately in the UI.
 *
 * @param categories - Array of category scores and weights
 * @param addressableGap - The addressable portion of the value gap (from value-gap-v2.ts)
 * @returns Array of CategoryGapResult, sorted by dollarImpact descending
 */
export function calculateCategoryValueGaps(
  categories: CategoryGapInput[],
  addressableGap: number
): CategoryGapResult[] {
  if (addressableGap <= 0 || categories.length === 0) {
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
    return withGaps.map(c => ({ ...c, dollarImpact: 0 }))
  }

  // Step 2: Proportional dollar impacts (rounded)
  const results: CategoryGapResult[] = withGaps.map(c => ({
    ...c,
    dollarImpact: Math.round((c.rawGap / totalRawGap) * addressableGap),
  }))

  // Step 3: Rounding correction
  const currentSum = results.reduce((sum, c) => sum + c.dollarImpact, 0)
  const residual = Math.round(addressableGap) - currentSum

  if (residual !== 0) {
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

/**
 * V2: Build a full gap attribution summary combining three-component
 * decomposition with BRI category breakdown.
 */
export interface GapAttributionSummary {
  /** Addressable gap (reducible by task completion) */
  addressableGap: number
  /** Structural gap (DLOM, size — cannot be reduced) */
  structuralGap: number
  /** Aspirational gap (quality improvement to industry ceiling) */
  aspirationalGap: number
  /** Total gap across all components */
  totalGap: number
  /** Per-category breakdown within addressable gap */
  categoryBreakdown: CategoryGapResult[]
}

export function buildGapAttributionSummary(
  addressableGap: number,
  structuralGap: number,
  aspirationalGap: number,
  categories: CategoryGapInput[]
): GapAttributionSummary {
  const categoryBreakdown = calculateCategoryValueGaps(categories, addressableGap)

  return {
    addressableGap,
    structuralGap,
    aspirationalGap,
    totalGap: addressableGap + structuralGap + aspirationalGap,
    categoryBreakdown,
  }
}
