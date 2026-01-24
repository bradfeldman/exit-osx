// Industry Multiples Lookup Utility
// Provides cascading lookup for EBITDA/revenue multiples by ICB classification

import { prisma } from '@/lib/prisma'

export interface MultipleResult {
  ebitdaMultipleLow: number
  ebitdaMultipleHigh: number
  revenueMultipleLow: number
  revenueMultipleHigh: number
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
  return Math.round(blendedEstimate / 100000) * 100000
}
