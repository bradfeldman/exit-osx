/**
 * Multiple Freshness Check + On-Demand Research
 *
 * Single entry point for getting fresh industry multiples.
 * Checks the IndustryMultiple table for recent data (within 30 days).
 * If stale or missing, triggers AI research and stores results.
 */

import { prisma } from '@/lib/prisma'
import { researchMultiples } from './multiple-research-engine'
import type { MultipleResult } from './industry-multiples'

const FRESHNESS_DAYS = 30

/**
 * Check if multiples for a sub-sector are fresh (researched within 30 days).
 * Returns the existing multiples if fresh, or null if stale/missing.
 */
export async function checkMultipleFreshness(icbSubSector: string): Promise<MultipleResult | null> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - FRESHNESS_DAYS)

  const multiple = await prisma.industryMultiple.findFirst({
    where: { icbSubSector },
    orderBy: { effectiveDate: 'desc' },
  })

  if (!multiple) return null

  // Check if it was researched recently
  if (multiple.lastResearchedAt && multiple.lastResearchedAt >= cutoff) {
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

  // Data exists but is stale (no lastResearchedAt or older than threshold)
  return null
}

/**
 * Get fresh multiples — from DB if recent, or via AI research if stale.
 * Updates the IndustryMultiple table with new research results.
 *
 * This is the single entry point used by both onboarding and the cron.
 */
export async function getOrResearchMultiples(
  icbSubSector: string,
  gicsSubIndustry?: string
): Promise<MultipleResult> {
  // Check if we have fresh data
  const fresh = await checkMultipleFreshness(icbSubSector)
  if (fresh) return fresh

  // Research new multiples
  try {
    const research = await researchMultiples(icbSubSector, gicsSubIndustry)

    // Compare against existing data to detect large changes
    const existing = await prisma.industryMultiple.findFirst({
      where: { icbSubSector },
      orderBy: { effectiveDate: 'desc' },
    })

    let significantChange = false
    if (existing) {
      const oldEbitdaMid = (Number(existing.ebitdaMultipleLow) + Number(existing.ebitdaMultipleHigh)) / 2
      const newEbitdaMid = (research.ebitdaMultipleLow + research.ebitdaMultipleHigh) / 2
      const pctChange = oldEbitdaMid > 0 ? Math.abs((newEbitdaMid - oldEbitdaMid) / oldEbitdaMid) : 1
      significantChange = pctChange > 0.5 // Flag if >50% different from existing
    }

    if (significantChange) {
      console.warn(
        `[MultipleFreshness] Research result for ${icbSubSector} differs >50% from existing. ` +
        `Old: ${existing ? `${Number(existing.ebitdaMultipleLow)}-${Number(existing.ebitdaMultipleHigh)}x` : 'none'}. ` +
        `New: ${research.ebitdaMultipleLow}-${research.ebitdaMultipleHigh}x. Using research result but flagging.`
      )
    }

    // Insert new IndustryMultiple row
    const now = new Date()
    await prisma.industryMultiple.create({
      data: {
        icbIndustry: '', // Will be populated from lookup or left empty
        icbSuperSector: '',
        icbSector: '',
        icbSubSector,
        revenueMultipleLow: research.revenueMultipleLow,
        revenueMultipleHigh: research.revenueMultipleHigh,
        ebitdaMultipleLow: research.ebitdaMultipleLow,
        ebitdaMultipleHigh: research.ebitdaMultipleHigh,
        ebitdaMarginLow: research.ebitdaMarginLow,
        ebitdaMarginHigh: research.ebitdaMarginHigh,
        effectiveDate: now,
        source: `AI research (${research.confidenceLevel} confidence)`,
        gicsSubIndustry: research.gicsSubIndustry,
        lastResearchedAt: now,
        researchSources: research.publicComparables.map(c => ({
          name: c.name,
          ticker: c.ticker,
          whyRelevant: c.whyRelevant,
        })),
      },
    })

    return {
      ebitdaMultipleLow: research.ebitdaMultipleLow,
      ebitdaMultipleHigh: research.ebitdaMultipleHigh,
      revenueMultipleLow: research.revenueMultipleLow,
      revenueMultipleHigh: research.revenueMultipleHigh,
      ebitdaMarginLow: research.ebitdaMarginLow,
      ebitdaMarginHigh: research.ebitdaMarginHigh,
      source: `AI research (${research.confidenceLevel} confidence)`,
      isDefault: false,
      matchLevel: 'subsector',
    }
  } catch (err) {
    console.error(`[MultipleFreshness] Research failed for ${icbSubSector}:`, err instanceof Error ? err.message : String(err))

    // Fall back to existing data even if stale
    const fallback = await prisma.industryMultiple.findFirst({
      where: { icbSubSector },
      orderBy: { effectiveDate: 'desc' },
    })

    if (fallback) {
      return {
        ebitdaMultipleLow: Number(fallback.ebitdaMultipleLow),
        ebitdaMultipleHigh: Number(fallback.ebitdaMultipleHigh),
        revenueMultipleLow: Number(fallback.revenueMultipleLow),
        revenueMultipleHigh: Number(fallback.revenueMultipleHigh),
        ...(fallback.ebitdaMarginLow != null && { ebitdaMarginLow: Number(fallback.ebitdaMarginLow) }),
        ...(fallback.ebitdaMarginHigh != null && { ebitdaMarginHigh: Number(fallback.ebitdaMarginHigh) }),
        source: fallback.source,
        isDefault: false,
        matchLevel: 'subsector',
      }
    }

    // Absolute fallback — default SMB multiples
    return {
      ebitdaMultipleLow: 3.0,
      ebitdaMultipleHigh: 6.0,
      revenueMultipleLow: 0.5,
      revenueMultipleHigh: 1.5,
      source: 'Default SMB multiple range',
      isDefault: true,
      matchLevel: 'default',
    }
  }
}
