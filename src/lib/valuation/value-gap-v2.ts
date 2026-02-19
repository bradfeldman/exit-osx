// Value Gap V2 — Addressable / Structural / Aspirational Decomposition
// Replaces V1 proportional BRI attribution with economically meaningful gap components.

import type { RiskDiscount } from './risk-discounts'
import { isAddressableDiscount } from './risk-discounts'

export interface ValueGapV2Result {
  /** Gap from reducible risk discounts (key-person, concentration, docs, legal) */
  addressableGap: number
  /** Gap from structural discounts (DLOM, size discount) */
  structuralGap: number
  /** Gap from quality-adjusted multiple to industry high */
  aspirationalGap: number
  /** Total gap = addressable + structural + aspirational */
  totalGap: number
}

export interface ValueGapV2Inputs {
  /** Adjusted EBITDA */
  adjustedEbitda: number
  /** Industry median multiple */
  industryMedianMultiple: number
  /** Industry high multiple (ceiling) */
  industryMultipleHigh: number
  /** Quality-adjusted multiple (after BQS adjustments, before risk discounts) */
  qualityAdjustedMultiple: number
  /** Risk-adjusted multiple (after risk discounts) */
  riskAdjustedMultiple: number
  /** Individual risk discounts with rates and names */
  riskDiscounts: RiskDiscount[]
  /** The size discount from multiple-adjustments (structural, not in risk discounts) */
  sizeDiscountRate: number
}

/**
 * Decompose the total value gap into three components.
 *
 * ADDRESSABLE GAP: Sum of value lost to reducible risk discounts.
 *   For each addressable discount: gap_i = evBeforeDiscount_i - evAfterDiscount_i
 *   Simplification: evMid_if_no_addressable_risks - evMid_current
 *
 * STRUCTURAL GAP: Value lost to DLOM + size discount.
 *   These can't be reduced without changing the company's fundamental nature.
 *
 * ASPIRATIONAL GAP: Difference from quality-adjusted multiple to industry high.
 *   This represents the upside if the company improved its quality metrics.
 */
export function calculateValueGapV2(inputs: ValueGapV2Inputs): ValueGapV2Result {
  const {
    adjustedEbitda,
    industryMultipleHigh,
    qualityAdjustedMultiple,
    riskAdjustedMultiple,
    riskDiscounts,
    sizeDiscountRate,
  } = inputs

  if (adjustedEbitda <= 0) {
    return { addressableGap: 0, structuralGap: 0, aspirationalGap: 0, totalGap: 0 }
  }

  // Current EV
  const evCurrent = adjustedEbitda * riskAdjustedMultiple

  // EV at industry ceiling (no discounts, maximum quality)
  const evCeiling = adjustedEbitda * industryMultipleHigh

  // Split risk discounts into addressable and structural
  const addressableDiscounts = riskDiscounts.filter(d => isAddressableDiscount(d.name))
  const structuralDiscounts = riskDiscounts.filter(d => !isAddressableDiscount(d.name))

  // Calculate what the multiple would be without addressable discounts
  const addressableMultiplier = addressableDiscounts.reduce((p, d) => p * (1 - d.rate), 1)
  const structuralMultiplier = structuralDiscounts.reduce((p, d) => p * (1 - d.rate), 1)

  // EV if all addressable risks were eliminated (structural risks remain)
  const multipleWithoutAddressable = qualityAdjustedMultiple * structuralMultiplier
  const evWithoutAddressable = adjustedEbitda * multipleWithoutAddressable

  // Addressable gap: difference between EV without addressable risks and current EV
  const addressableGap = Math.max(0, evWithoutAddressable - evCurrent)

  // Structural gap: DLOM + size discount effect
  // This is the gap between "fully addressed" EV and "quality-adjusted pre-risk" EV
  const evPreRisk = adjustedEbitda * qualityAdjustedMultiple
  const structuralGap = Math.max(0, evPreRisk - evWithoutAddressable)

  // Aspirational gap: difference from quality-adjusted multiple to industry high
  // Account for size discount as structural too
  const sizeMultiplier = 1 - Math.abs(sizeDiscountRate)
  const evAtIndustryHigh = adjustedEbitda * industryMultipleHigh * sizeMultiplier
  const aspirationalGap = Math.max(0, evAtIndustryHigh - evPreRisk)

  // Total gap — may not exactly equal evCeiling - evCurrent due to multiplicative interactions,
  // but the three components sum to a meaningful decomposition
  const totalGap = addressableGap + structuralGap + aspirationalGap

  return {
    addressableGap: Math.round(addressableGap),
    structuralGap: Math.round(structuralGap),
    aspirationalGap: Math.round(aspirationalGap),
    totalGap: Math.round(totalGap),
  }
}
