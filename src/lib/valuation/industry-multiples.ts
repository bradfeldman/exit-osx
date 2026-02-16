// Industry Multiples Lookup Utility
// Provides cascading lookup for EBITDA/revenue multiples by ICB classification

import { prisma } from '@/lib/prisma'

export interface MultipleResult {
  ebitdaMultipleLow: number
  ebitdaMultipleHigh: number
  revenueMultipleLow: number
  revenueMultipleHigh: number
  ebitdaMarginLow?: number
  ebitdaMarginHigh?: number
  source: string | null
  isDefault: boolean
  matchLevel: 'subsector' | 'sector' | 'supersector' | 'industry' | 'default'
}

const DEFAULT_MULTIPLES: MultipleResult = {
  ebitdaMultipleLow: 3.0,
  ebitdaMultipleHigh: 6.0,
  revenueMultipleLow: 0.5,
  revenueMultipleHigh: 1.5,
  source: 'Default SMB multiple range',
  isDefault: true,
  matchLevel: 'default',
}

/**
 * Get industry multiples with cascading fallback
 * Tries to match at the most specific level (subsector) first,
 * then falls back to sector, supersector, industry, and finally default values
 */
export async function getIndustryMultiples(
  icbSubSector: string,
  icbSector?: string,
  icbSuperSector?: string,
  icbIndustry?: string
): Promise<MultipleResult> {
  // Try exact subsector match first (most specific)
  let multiple = await prisma.industryMultiple.findFirst({
    where: { icbSubSector },
    orderBy: { effectiveDate: 'desc' },
  })

  if (multiple) {
    return {
      ebitdaMultipleLow: Number(multiple.ebitdaMultipleLow),
      ebitdaMultipleHigh: Number(multiple.ebitdaMultipleHigh),
      revenueMultipleLow: Number(multiple.revenueMultipleLow),
      revenueMultipleHigh: Number(multiple.revenueMultipleHigh),
      ...(multiple.ebitdaMarginLow != null && { ebitdaMarginLow: Number(multiple.ebitdaMarginLow) }),
      ...(multiple.ebitdaMarginHigh != null && { ebitdaMarginHigh: Number(multiple.ebitdaMarginHigh) }),
      source: multiple.source,
      isDefault: false,
      matchLevel: 'subsector',
    }
  }

  // Fall back to sector level
  if (icbSector) {
    multiple = await prisma.industryMultiple.findFirst({
      where: { icbSector },
      orderBy: { effectiveDate: 'desc' },
    })

    if (multiple) {
      return {
        ebitdaMultipleLow: Number(multiple.ebitdaMultipleLow),
        ebitdaMultipleHigh: Number(multiple.ebitdaMultipleHigh),
        revenueMultipleLow: Number(multiple.revenueMultipleLow),
        revenueMultipleHigh: Number(multiple.revenueMultipleHigh),
        ...(multiple.ebitdaMarginLow != null && { ebitdaMarginLow: Number(multiple.ebitdaMarginLow) }),
        ...(multiple.ebitdaMarginHigh != null && { ebitdaMarginHigh: Number(multiple.ebitdaMarginHigh) }),
        source: multiple.source,
        isDefault: false,
        matchLevel: 'sector',
      }
    }
  }

  // Fall back to supersector level
  if (icbSuperSector) {
    multiple = await prisma.industryMultiple.findFirst({
      where: { icbSuperSector },
      orderBy: { effectiveDate: 'desc' },
    })

    if (multiple) {
      return {
        ebitdaMultipleLow: Number(multiple.ebitdaMultipleLow),
        ebitdaMultipleHigh: Number(multiple.ebitdaMultipleHigh),
        revenueMultipleLow: Number(multiple.revenueMultipleLow),
        revenueMultipleHigh: Number(multiple.revenueMultipleHigh),
        ...(multiple.ebitdaMarginLow != null && { ebitdaMarginLow: Number(multiple.ebitdaMarginLow) }),
        ...(multiple.ebitdaMarginHigh != null && { ebitdaMarginHigh: Number(multiple.ebitdaMarginHigh) }),
        source: multiple.source,
        isDefault: false,
        matchLevel: 'supersector',
      }
    }
  }

  // Fall back to industry level
  if (icbIndustry) {
    multiple = await prisma.industryMultiple.findFirst({
      where: { icbIndustry },
      orderBy: { effectiveDate: 'desc' },
    })

    if (multiple) {
      return {
        ebitdaMultipleLow: Number(multiple.ebitdaMultipleLow),
        ebitdaMultipleHigh: Number(multiple.ebitdaMultipleHigh),
        revenueMultipleLow: Number(multiple.revenueMultipleLow),
        revenueMultipleHigh: Number(multiple.revenueMultipleHigh),
        ...(multiple.ebitdaMarginLow != null && { ebitdaMarginLow: Number(multiple.ebitdaMarginLow) }),
        ...(multiple.ebitdaMarginHigh != null && { ebitdaMarginHigh: Number(multiple.ebitdaMarginHigh) }),
        source: multiple.source,
        isDefault: false,
        matchLevel: 'industry',
      }
    }
  }

  // Return default multiples if no match found
  return DEFAULT_MULTIPLES
}

/**
 * Calculate base EBITDA multiple from low/high range
 */
export function calculateBaseMultiple(low: number, high: number): number {
  return (low + high) / 2
}

// VAL-004 FIX: Add revenue-based valuation support
export type ValuationMethod = 'ebitda' | 'revenue' | 'hybrid'

export interface RevenueValuationResult {
  currentValue: number
  potentialValue: number
  valueGap: number
  revenueMultipleLow: number
  revenueMultipleHigh: number
  baseMultiple: number
  finalMultiple: number
}

/**
 * Calculate valuation using revenue multiples
 * Particularly useful for high-growth, pre-profit companies (SaaS, tech startups)
 *
 * @param revenue Annual recurring revenue (ARR) or annual revenue
 * @param multiples Industry multiple data
 * @param coreScore Core business score (0-1)
 * @param briScore Buyer readiness index (0-1)
 * @param alpha Non-linear discount constant
 */
export function calculateRevenueBasedValuation(
  revenue: number,
  multiples: MultipleResult,
  coreScore: number,
  briScore: number,
  alpha: number = 1.4
): RevenueValuationResult {
  const { revenueMultipleLow, revenueMultipleHigh } = multiples

  // Core Score positions within industry range
  const baseMultiple = revenueMultipleLow + coreScore * (revenueMultipleHigh - revenueMultipleLow)

  // Non-linear discount based on BRI (same formula as EBITDA method)
  const discountFraction = Math.pow(1 - briScore, alpha)

  // Final multiple with floor guarantee
  const finalMultiple = revenueMultipleLow + (baseMultiple - revenueMultipleLow) * (1 - discountFraction)

  // Calculate valuations
  const currentValue = revenue * finalMultiple
  // Potential value = industry max multiple × revenue (best-case for your industry)
  const potentialValue = revenue * revenueMultipleHigh
  const valueGap = potentialValue - currentValue

  return {
    currentValue,
    potentialValue,
    valueGap,
    revenueMultipleLow,
    revenueMultipleHigh,
    baseMultiple,
    finalMultiple,
  }
}

/**
 * Determine recommended valuation method based on company characteristics
 *
 * Revenue-based valuation is recommended for:
 * - High-growth companies (>30% YoY revenue growth)
 * - Pre-profit or low-margin businesses
 * - SaaS/subscription companies
 * - Companies with negative EBITDA
 *
 * EBITDA-based valuation is recommended for:
 * - Mature, profitable companies
 * - Service businesses with stable margins
 * - Manufacturing and traditional industries
 */
export function recommendValuationMethod(
  revenue: number,
  ebitda: number,
  revenueGrowthRate?: number,
  isRecurringRevenue?: boolean
): ValuationMethod {
  // Use revenue multiple if EBITDA is negative or zero
  if (ebitda <= 0) {
    return 'revenue'
  }

  // Calculate EBITDA margin
  const ebitdaMargin = revenue > 0 ? ebitda / revenue : 0

  // High-growth companies (>30% growth) often valued on revenue
  if (revenueGrowthRate && revenueGrowthRate > 0.30) {
    return 'revenue'
  }

  // SaaS/subscription businesses often valued on ARR multiples
  if (isRecurringRevenue && ebitdaMargin < 0.15) {
    return 'revenue'
  }

  // Low-margin businesses might benefit from hybrid approach
  if (ebitdaMargin < 0.10) {
    return 'hybrid'
  }

  // Default to EBITDA for profitable, mature businesses
  return 'ebitda'
}

/**
 * Estimate EBITDA from revenue using industry multiples
 *
 * Formula from Exit_OSx_Revenue_to_EBITDA_Calculation_Spec:
 * - EBITDA_low = (Revenue × Revenue_Multiple_low) ÷ EBITDA_Multiple_high
 * - EBITDA_high = (Revenue × Revenue_Multiple_high) ÷ EBITDA_Multiple_low
 * - Estimated EBITDA = (EBITDA_low + EBITDA_high) ÷ 2
 *
 * This provides a market-anchored EBITDA estimate when actual EBITDA is not available.
 */
export function estimateEbitdaFromRevenue(
  revenue: number,
  multiples: MultipleResult
): number {
  const { revenueMultipleLow, revenueMultipleHigh, ebitdaMultipleLow, ebitdaMultipleHigh } = multiples

  // Guard against division by zero
  if (ebitdaMultipleHigh === 0 || ebitdaMultipleLow === 0) {
    return 0
  }

  // Conservative estimate (lower EBITDA)
  const ebitdaLow = (revenue * revenueMultipleLow) / ebitdaMultipleHigh

  // Optimistic estimate (higher EBITDA)
  const ebitdaHigh = (revenue * revenueMultipleHigh) / ebitdaMultipleLow

  // Blended estimate, rounded to nearest $100,000
  const blendedEstimate = (ebitdaLow + ebitdaHigh) / 2

  // Cap implied margin at 35% (95th percentile for SMBs) to prevent unrealistic estimates
  const maxEbitda = revenue * 0.35
  const cappedEstimate = Math.min(blendedEstimate, maxEbitda)

  return Math.round(cappedEstimate / 100000) * 100000
}
