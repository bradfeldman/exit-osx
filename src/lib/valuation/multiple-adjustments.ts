// Multiple Adjustment Engine
// PROD-004: Applies company-specific adjustments to comparable-derived multiples.
//
// In M&A practice, raw comparable multiples are rarely applied directly.
// Investment bankers adjust for differences between the subject company
// and its comparables. This module implements those adjustments with
// full audit trail.
//
// The adjustments are applied multiplicatively:
//   adjustedMultiple = baseMultiple * (1 + sumOfAdjustments)
//
// For example, if adjustments total -25%, a 10x base multiple becomes 7.5x.
//
// Each adjustment is independently toggleable for sensitivity analysis.

// =============================================================================
// Types
// =============================================================================

/**
 * A single named adjustment to the base multiple.
 * Each adjustment is a percentage impact that can be positive (premium) or negative (discount).
 */
export interface MultipleAdjustment {
  /** Unique identifier for this adjustment factor */
  factor: string
  /** Human-readable name */
  name: string
  /** Percentage impact as decimal (e.g., -0.15 = -15% discount, 0.10 = +10% premium) */
  impact: number
  /** Plain-English explanation of why this adjustment applies and its magnitude */
  explanation: string
  /** Whether this adjustment is currently enabled (for sensitivity toggles) */
  enabled: boolean
  /** Category grouping for display */
  category: 'size' | 'growth' | 'profitability' | 'risk' | 'quality'
}

/**
 * Complete set of adjustments applied to base multiples.
 */
export interface AdjustmentResult {
  /** Individual adjustments applied */
  adjustments: MultipleAdjustment[]
  /** Sum of all enabled adjustment impacts */
  totalAdjustment: number
  /** The multiplier applied to base multiples: (1 + totalAdjustment) */
  adjustmentMultiplier: number
}

/**
 * Multiple range output with low/mid/high values.
 */
export interface MultipleRange {
  low: number
  mid: number
  high: number
}

/**
 * Complete output from the multiple range calculation.
 * Contains the final ranges plus the full audit trail.
 */
export interface MultipleRangeResult {
  /** EBITDA multiple range after adjustments (null if no EBITDA data available) */
  ebitdaMultipleRange: MultipleRange | null
  /** Revenue multiple range after adjustments (null if no revenue data available) */
  revenueMultipleRange: MultipleRange | null
  /** Adjustments applied */
  adjustments: AdjustmentResult
  /** Source data used for the calculation */
  sources: {
    /** Number of comparables used */
    comparableCount: number
    /** Weighted average EBITDA multiple from comparables (pre-adjustment) */
    baseEbitdaMultiple: number | null
    /** Weighted average Revenue multiple from comparables (pre-adjustment) */
    baseRevenueMultiple: number | null
    /** Spread factor used for range width (based on comparable dispersion) */
    spreadFactor: number
  }
}

/**
 * Company profile used for adjustment calculations.
 * This is the subject company being valued (not the comparables).
 */
export interface AdjustmentProfile {
  /** Annual revenue in USD */
  revenue: number
  /** Revenue size category (Prisma enum value) */
  revenueSizeCategory?: string
  /** YoY revenue growth rate as decimal (e.g., 0.15 = 15%). null if unknown. */
  revenueGrowthRate: number | null
  /** EBITDA margin as decimal (e.g., 0.20 = 20%). null if negative EBITDA. */
  ebitdaMargin: number | null
  /** Customer concentration: percentage of revenue from top customer (0-1). null if unknown. */
  topCustomerConcentration: number | null
  /** Customer concentration: percentage of revenue from top 3 customers (0-1). null if unknown. */
  top3CustomerConcentration: number | null
  /** BRI Transferability score (0-1). Used as proxy for owner dependency. null if no assessment. */
  transferabilityScore: number | null
  /** Revenue model type */
  revenueModel?: string
  /** Whether revenue is primarily recurring */
  isRecurringRevenue?: boolean
}

// =============================================================================
// Adjustment Constants
// =============================================================================
// Every constant is named and documented with its source and rationale.
// These represent typical SMB M&A practice based on:
// - Pepperdine Private Capital Markets Report
// - BVR (Business Valuation Resources) studies
// - DealStats database empirical data
// - Professional experience in middle-market M&A

/**
 * Size discount tiers for SMB companies.
 * Smaller companies trade at significant discounts to larger peers because of:
 * - Less diversified revenue streams
 * - Thinner management teams
 * - Higher key-person risk
 * - Less institutional infrastructure
 *
 * Source: Pepperdine Private Capital Markets Report, DealStats database
 */
const SIZE_DISCOUNTS: Record<string, number> = {
  UNDER_500K: -0.35,       // -35%: Micro businesses, high owner dependency
  FROM_500K_TO_1M: -0.25,  // -25%: Very small, limited infrastructure
  FROM_1M_TO_3M: -0.18,    // -18%: Small but viable
  FROM_3M_TO_10M: -0.10,   // -10%: Lower middle market
  FROM_10M_TO_25M: -0.05,  // -5%: Middle market
  OVER_25M: 0.0,           // 0%: No size discount (baseline for public comps)
}

/**
 * Growth premium/discount based on revenue growth rate.
 * Higher growth companies command premium multiples because buyers are
 * paying for future earnings power, not just current earnings.
 *
 * Tiers are based on typical SMB growth rate distributions.
 */
const GROWTH_TIERS = [
  { minGrowth: 0.30, impact: 0.20, label: 'High growth (30%+)' },
  { minGrowth: 0.20, impact: 0.12, label: 'Strong growth (20-30%)' },
  { minGrowth: 0.10, impact: 0.05, label: 'Moderate growth (10-20%)' },
  { minGrowth: 0.0, impact: 0.0, label: 'Stable (0-10%)' },
  { minGrowth: -0.10, impact: -0.10, label: 'Declining (-10% to 0%)' },
  { minGrowth: -Infinity, impact: -0.20, label: 'Rapid decline (below -10%)' },
] as const

/**
 * EBITDA margin premium/discount tiers.
 * Higher margins indicate pricing power, operational efficiency, and
 * scalability -- all of which buyers pay premiums for.
 */
const MARGIN_TIERS = [
  { minMargin: 0.30, impact: 0.15, label: 'Premium margins (30%+)' },
  { minMargin: 0.20, impact: 0.08, label: 'Strong margins (20-30%)' },
  { minMargin: 0.15, impact: 0.0, label: 'Average margins (15-20%)' },
  { minMargin: 0.10, impact: -0.08, label: 'Below-average margins (10-15%)' },
  { minMargin: 0.0, impact: -0.15, label: 'Thin margins (0-10%)' },
  { minMargin: -Infinity, impact: -0.25, label: 'Negative margins' },
] as const

/**
 * Customer concentration discount.
 * High customer concentration is one of the most significant risk factors
 * in SMB M&A. Buyers fear losing a key customer post-acquisition.
 *
 * Thresholds based on M&A practice:
 * - Top customer > 30% of revenue: significant risk
 * - Top 3 customers > 60% of revenue: concentrated
 */
const CONCENTRATION_THRESHOLDS = {
  singleCustomerHigh: { threshold: 0.30, impact: -0.20 },
  singleCustomerModerate: { threshold: 0.20, impact: -0.10 },
  top3High: { threshold: 0.60, impact: -0.15 },
  top3Moderate: { threshold: 0.40, impact: -0.08 },
} as const

/**
 * Owner dependency discount based on BRI Transferability score.
 * Low transferability means the business is heavily dependent on the owner,
 * which is a significant discount factor for buyers.
 *
 * The BRI Transferability score (0-1) directly measures this:
 * - 0.0 = Owner is critical to operations (maximum discount)
 * - 1.0 = Business runs independently (no discount)
 */
const OWNER_DEPENDENCY_MAX_DISCOUNT = -0.25 // Maximum 25% discount for full owner dependency

/**
 * Recurring revenue premium.
 * Subscription and recurring contract businesses command premium multiples
 * because of revenue predictability and lower customer acquisition costs.
 *
 * SaaS/subscription commands a higher premium than recurring contracts
 * because of even greater predictability and scalability.
 */
const RECURRING_REVENUE_PREMIUMS: Record<string, number> = {
  SUBSCRIPTION_SAAS: 0.25,       // +25% for SaaS
  RECURRING_CONTRACTS: 0.12,     // +12% for recurring contracts
  TRANSACTIONAL: 0.0,            // Baseline
  PROJECT_BASED: -0.05,          // -5% for project-based (lumpy revenue)
}

// =============================================================================
// Core Adjustment Engine
// =============================================================================

/**
 * Calculate multiple adjustments for a subject company.
 *
 * Each adjustment is computed independently and can be toggled on/off
 * for sensitivity analysis. The total adjustment is the sum of all
 * enabled individual adjustments, applied multiplicatively to the base multiple.
 *
 * @param profile - The subject company's profile
 * @returns AdjustmentResult with individual adjustments and total impact
 */
export function adjustMultiples(profile: AdjustmentProfile): AdjustmentResult {
  const adjustments: MultipleAdjustment[] = []

  // --- 1. Size Discount ---
  const sizeAdjustment = calculateSizeAdjustment(profile)
  if (sizeAdjustment) adjustments.push(sizeAdjustment)

  // --- 2. Growth Premium/Discount ---
  const growthAdjustment = calculateGrowthAdjustment(profile)
  if (growthAdjustment) adjustments.push(growthAdjustment)

  // --- 3. Margin Premium/Discount ---
  const marginAdjustment = calculateMarginAdjustment(profile)
  if (marginAdjustment) adjustments.push(marginAdjustment)

  // --- 4. Customer Concentration Discount ---
  const concentrationAdjustments = calculateConcentrationAdjustments(profile)
  adjustments.push(...concentrationAdjustments)

  // --- 5. Owner Dependency Discount ---
  const ownerAdjustment = calculateOwnerDependencyAdjustment(profile)
  if (ownerAdjustment) adjustments.push(ownerAdjustment)

  // --- 6. Recurring Revenue Premium ---
  const recurringAdjustment = calculateRecurringRevenueAdjustment(profile)
  if (recurringAdjustment) adjustments.push(recurringAdjustment)

  // Calculate totals
  const totalAdjustment = adjustments
    .filter((a) => a.enabled)
    .reduce((sum, a) => sum + a.impact, 0)

  // The multiplier is (1 + totalAdjustment), floored at 0.3 to prevent
  // total adjustment from turning the multiple negative or near-zero,
  // and capped at 1.5 to prevent unrealistic valuation inflation
  const adjustmentMultiplier = Math.max(0.3, Math.min(1 + totalAdjustment, 1.5))

  return {
    adjustments,
    totalAdjustment,
    adjustmentMultiplier,
  }
}

// =============================================================================
// Individual Adjustment Calculators
// =============================================================================

function calculateSizeAdjustment(profile: AdjustmentProfile): MultipleAdjustment | null {
  const category = profile.revenueSizeCategory
  if (!category) {
    // Infer from revenue if category not provided
    return calculateSizeAdjustmentFromRevenue(profile.revenue)
  }

  const impact = SIZE_DISCOUNTS[category]
  if (impact === undefined) return null
  if (impact === 0) return null // No adjustment needed for large companies

  return {
    factor: 'size_discount',
    name: 'Size Discount',
    impact,
    explanation: `Private companies with revenue in the ${formatSizeCategory(category)} range typically trade at a ${Math.abs(impact * 100).toFixed(0)}% discount to public comparables due to less diversified revenue, thinner management, and higher key-person risk.`,
    enabled: true,
    category: 'size',
  }
}

function calculateSizeAdjustmentFromRevenue(revenue: number): MultipleAdjustment | null {
  let impact: number
  let label: string

  if (revenue < 500_000) {
    impact = SIZE_DISCOUNTS.UNDER_500K
    label = 'under $500K'
  } else if (revenue < 1_000_000) {
    impact = SIZE_DISCOUNTS.FROM_500K_TO_1M
    label = '$500K-$1M'
  } else if (revenue < 3_000_000) {
    impact = SIZE_DISCOUNTS.FROM_1M_TO_3M
    label = '$1M-$3M'
  } else if (revenue < 10_000_000) {
    impact = SIZE_DISCOUNTS.FROM_3M_TO_10M
    label = '$3M-$10M'
  } else if (revenue < 25_000_000) {
    impact = SIZE_DISCOUNTS.FROM_10M_TO_25M
    label = '$10M-$25M'
  } else {
    return null // No size discount for large companies
  }

  return {
    factor: 'size_discount',
    name: 'Size Discount',
    impact,
    explanation: `Company revenue of ${label} places it in a size category that typically trades at a ${Math.abs(impact * 100).toFixed(0)}% discount to larger public comparables.`,
    enabled: true,
    category: 'size',
  }
}

function calculateGrowthAdjustment(profile: AdjustmentProfile): MultipleAdjustment | null {
  if (profile.revenueGrowthRate === null) return null

  const tier = GROWTH_TIERS.find((t) => profile.revenueGrowthRate! >= t.minGrowth)
  if (!tier || tier.impact === 0) return null

  const sign = tier.impact > 0 ? 'premium' : 'discount'
  return {
    factor: 'growth_adjustment',
    name: tier.impact > 0 ? 'Growth Premium' : 'Growth Discount',
    impact: tier.impact,
    explanation: `Revenue growth of ${(profile.revenueGrowthRate * 100).toFixed(1)}% (${tier.label}) warrants a ${Math.abs(tier.impact * 100).toFixed(0)}% ${sign}. ${tier.impact > 0 ? 'Buyers pay more for companies growing above market rates.' : 'Declining revenue signals risk that future earnings may erode.'}`,
    enabled: true,
    category: 'growth',
  }
}

function calculateMarginAdjustment(profile: AdjustmentProfile): MultipleAdjustment | null {
  if (profile.ebitdaMargin === null) return null

  const tier = MARGIN_TIERS.find((t) => profile.ebitdaMargin! >= t.minMargin)
  if (!tier || tier.impact === 0) return null

  const sign = tier.impact > 0 ? 'premium' : 'discount'
  return {
    factor: 'margin_adjustment',
    name: tier.impact > 0 ? 'Margin Premium' : 'Margin Discount',
    impact: tier.impact,
    explanation: `EBITDA margin of ${(profile.ebitdaMargin * 100).toFixed(1)}% (${tier.label}) warrants a ${Math.abs(tier.impact * 100).toFixed(0)}% ${sign}. ${tier.impact > 0 ? 'Higher margins indicate pricing power and operational efficiency.' : 'Lower margins reduce buyer confidence in sustainable earnings.'}`,
    enabled: true,
    category: 'profitability',
  }
}

function calculateConcentrationAdjustments(profile: AdjustmentProfile): MultipleAdjustment[] {
  const adjustments: MultipleAdjustment[] = []

  // Single customer concentration
  if (profile.topCustomerConcentration !== null) {
    if (profile.topCustomerConcentration >= CONCENTRATION_THRESHOLDS.singleCustomerHigh.threshold) {
      adjustments.push({
        factor: 'customer_concentration_single',
        name: 'Customer Concentration (Single)',
        impact: CONCENTRATION_THRESHOLDS.singleCustomerHigh.impact,
        explanation: `Top customer represents ${(profile.topCustomerConcentration * 100).toFixed(0)}% of revenue, exceeding the ${(CONCENTRATION_THRESHOLDS.singleCustomerHigh.threshold * 100).toFixed(0)}% threshold. This is a significant risk factor -- losing this customer would materially impact the business.`,
        enabled: true,
        category: 'risk',
      })
    } else if (profile.topCustomerConcentration >= CONCENTRATION_THRESHOLDS.singleCustomerModerate.threshold) {
      adjustments.push({
        factor: 'customer_concentration_single',
        name: 'Customer Concentration (Single)',
        impact: CONCENTRATION_THRESHOLDS.singleCustomerModerate.impact,
        explanation: `Top customer represents ${(profile.topCustomerConcentration * 100).toFixed(0)}% of revenue. While not critical, buyers will factor in the risk of this customer relationship.`,
        enabled: true,
        category: 'risk',
      })
    }
  }

  // Top 3 customer concentration (only if single customer adjustment wasn't already applied at high level)
  if (
    profile.top3CustomerConcentration !== null &&
    !adjustments.some((a) => a.factor === 'customer_concentration_single' && a.impact <= -0.15)
  ) {
    if (profile.top3CustomerConcentration >= CONCENTRATION_THRESHOLDS.top3High.threshold) {
      adjustments.push({
        factor: 'customer_concentration_top3',
        name: 'Customer Concentration (Top 3)',
        impact: CONCENTRATION_THRESHOLDS.top3High.impact,
        explanation: `Top 3 customers represent ${(profile.top3CustomerConcentration * 100).toFixed(0)}% of revenue. This level of concentration creates material risk exposure.`,
        enabled: true,
        category: 'risk',
      })
    } else if (profile.top3CustomerConcentration >= CONCENTRATION_THRESHOLDS.top3Moderate.threshold) {
      adjustments.push({
        factor: 'customer_concentration_top3',
        name: 'Customer Concentration (Top 3)',
        impact: CONCENTRATION_THRESHOLDS.top3Moderate.impact,
        explanation: `Top 3 customers represent ${(profile.top3CustomerConcentration * 100).toFixed(0)}% of revenue. Moderate concentration that buyers will consider.`,
        enabled: true,
        category: 'risk',
      })
    }
  }

  return adjustments
}

function calculateOwnerDependencyAdjustment(profile: AdjustmentProfile): MultipleAdjustment | null {
  if (profile.transferabilityScore === null) return null

  // Higher transferability score = less owner dependency = less discount
  // Score of 1.0 (fully transferable) = no discount
  // Score of 0.0 (fully dependent) = maximum discount
  const impact = OWNER_DEPENDENCY_MAX_DISCOUNT * (1 - profile.transferabilityScore)

  // Only apply if the discount is meaningful (> 2%)
  if (Math.abs(impact) < 0.02) return null

  const severityLabel =
    profile.transferabilityScore < 0.3
      ? 'high'
      : profile.transferabilityScore < 0.6
        ? 'moderate'
        : 'low'

  return {
    factor: 'owner_dependency',
    name: 'Owner Dependency Discount',
    impact,
    explanation: `BRI Transferability score of ${(profile.transferabilityScore * 100).toFixed(0)}% indicates ${severityLabel} owner dependency. Buyers discount businesses that cannot run without the current owner, applying a ${Math.abs(impact * 100).toFixed(0)}% discount.`,
    enabled: true,
    category: 'risk',
  }
}

function calculateRecurringRevenueAdjustment(profile: AdjustmentProfile): MultipleAdjustment | null {
  // First check explicit revenue model
  if (profile.revenueModel) {
    const impact = RECURRING_REVENUE_PREMIUMS[profile.revenueModel]
    if (impact !== undefined && impact !== 0) {
      const modelLabel: Record<string, string> = {
        SUBSCRIPTION_SAAS: 'SaaS/subscription',
        RECURRING_CONTRACTS: 'recurring contract',
        PROJECT_BASED: 'project-based',
      }
      const sign = impact > 0 ? 'premium' : 'discount'
      return {
        factor: 'recurring_revenue',
        name: impact > 0 ? 'Recurring Revenue Premium' : 'Revenue Model Discount',
        impact,
        explanation: `${modelLabel[profile.revenueModel] || profile.revenueModel} revenue model warrants a ${Math.abs(impact * 100).toFixed(0)}% ${sign}. ${impact > 0 ? 'Predictable, recurring revenue reduces buyer risk and increases willingness to pay.' : 'Project-based revenue is less predictable, increasing buyer risk.'}`,
        enabled: true,
        category: 'quality',
      }
    }
  }

  // Fall back to isRecurringRevenue flag
  if (profile.isRecurringRevenue) {
    return {
      factor: 'recurring_revenue',
      name: 'Recurring Revenue Premium',
      impact: 0.15, // Generic recurring premium (between SaaS and contract)
      explanation: 'Recurring revenue model warrants a 15% premium. Predictable revenue reduces buyer risk and increases willingness to pay.',
      enabled: true,
      category: 'quality',
    }
  }

  return null
}

// =============================================================================
// Multiple Range Calculation
// =============================================================================

/**
 * Calculate final multiple ranges by applying adjustments to comparable-derived base multiples.
 *
 * The range is constructed as:
 *   - mid = baseMultiple * adjustmentMultiplier
 *   - low = mid * (1 - spreadFactor)
 *   - high = mid * (1 + spreadFactor)
 *
 * The spread factor is based on the dispersion of comparable multiples.
 * Wider dispersion = wider range = lower confidence.
 *
 * @param baseEbitdaMultiple - Weighted average EV/EBITDA from comparables (null if unavailable)
 * @param baseRevenueMultiple - Weighted average EV/Revenue from comparables (null if unavailable)
 * @param adjustments - Adjustments to apply
 * @param comparableCount - Number of comparables used (affects spread)
 * @param comparables - Optional: raw comparables for spread calculation
 * @returns MultipleRangeResult with ranges and full audit trail
 */
export function calculateMultipleRange(
  baseEbitdaMultiple: number | null,
  baseRevenueMultiple: number | null,
  adjustments: AdjustmentResult,
  comparableCount: number,
  comparables?: Array<{ metrics: { evToEbitda: number | null; evToRevenue: number | null } }>
): MultipleRangeResult {
  // Calculate spread factor based on comparable set quality
  const spreadFactor = calculateSpreadFactor(comparableCount, comparables)

  // Calculate EBITDA multiple range
  let ebitdaMultipleRange: MultipleRange | null = null
  if (baseEbitdaMultiple !== null && baseEbitdaMultiple > 0) {
    const adjustedMid = baseEbitdaMultiple * adjustments.adjustmentMultiplier
    ebitdaMultipleRange = {
      low: Math.max(0.5, roundMultiple(adjustedMid * (1 - spreadFactor))),
      mid: Math.max(0.5, roundMultiple(adjustedMid)),
      high: Math.max(0.5, roundMultiple(adjustedMid * (1 + spreadFactor))),
    }
  }

  // Calculate Revenue multiple range
  let revenueMultipleRange: MultipleRange | null = null
  if (baseRevenueMultiple !== null && baseRevenueMultiple > 0) {
    const adjustedMid = baseRevenueMultiple * adjustments.adjustmentMultiplier
    revenueMultipleRange = {
      low: Math.max(0.1, roundMultiple(adjustedMid * (1 - spreadFactor))),
      mid: Math.max(0.1, roundMultiple(adjustedMid)),
      high: Math.max(0.1, roundMultiple(adjustedMid * (1 + spreadFactor))),
    }
  }

  return {
    ebitdaMultipleRange,
    revenueMultipleRange,
    adjustments,
    sources: {
      comparableCount,
      baseEbitdaMultiple,
      baseRevenueMultiple,
      spreadFactor,
    },
  }
}

/**
 * Calculate the spread factor for the multiple range.
 *
 * Spread is wider when:
 * - Fewer comparables are available (less confidence)
 * - Comparable multiples have high dispersion (more uncertainty)
 *
 * Typical spread factors:
 * - 5 high-quality comps: ~15% spread
 * - 3 moderate comps: ~25% spread
 * - 1-2 comps: ~35% spread
 */
function calculateSpreadFactor(
  comparableCount: number,
  comparables?: Array<{ metrics: { evToEbitda: number | null; evToRevenue: number | null } }>
): number {
  // Base spread from comparable count
  let spread: number
  if (comparableCount >= 5) {
    spread = 0.15
  } else if (comparableCount >= 3) {
    spread = 0.25
  } else if (comparableCount >= 1) {
    spread = 0.35
  } else {
    spread = 0.40 // No comparables, maximum uncertainty
  }

  // Widen spread if comparable multiples have high dispersion
  if (comparables && comparables.length >= 2) {
    const ebitdaMultiples = comparables
      .map((c) => c.metrics.evToEbitda)
      .filter((m): m is number => m !== null && m > 0)

    if (ebitdaMultiples.length >= 2) {
      const max = Math.max(...ebitdaMultiples)
      const min = Math.min(...ebitdaMultiples)
      const mean = ebitdaMultiples.reduce((a, b) => a + b, 0) / ebitdaMultiples.length

      // Coefficient of variation proxy: (max - min) / mean
      const dispersion = mean > 0 ? (max - min) / mean : 0

      // If dispersion is high (>50%), widen the spread
      if (dispersion > 0.5) {
        spread += 0.05
      }
      // If dispersion is very high (>100%), widen more
      if (dispersion > 1.0) {
        spread += 0.05
      }
    }
  }

  // Cap spread at 50% to maintain meaningful ranges
  return Math.min(spread, 0.50)
}

/**
 * Round a multiple to 1 decimal place for presentation.
 * Rounding happens here (presentation layer) and not in intermediate calculations.
 */
function roundMultiple(value: number): number {
  return Math.round(value * 10) / 10
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a revenue size category for display.
 */
function formatSizeCategory(category: string): string {
  const labels: Record<string, string> = {
    UNDER_500K: 'under $500K',
    FROM_500K_TO_1M: '$500K-$1M',
    FROM_1M_TO_3M: '$1M-$3M',
    FROM_3M_TO_10M: '$3M-$10M',
    FROM_10M_TO_25M: '$10M-$25M',
    OVER_25M: 'over $25M',
  }
  return labels[category] || category
}

// Export constants for testing
export {
  SIZE_DISCOUNTS,
  GROWTH_TIERS,
  MARGIN_TIERS,
  CONCENTRATION_THRESHOLDS,
  OWNER_DEPENDENCY_MAX_DISCOUNT,
  RECURRING_REVENUE_PREMIUMS,
  calculateSpreadFactor,
  roundMultiple,
}
