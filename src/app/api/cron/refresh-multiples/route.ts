import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronAuth } from '@/lib/security/cron-auth'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'
import { researchMultiples } from '@/lib/valuation/multiple-research-engine'
import { createSignal } from '@/lib/signals/create-signal'

export const dynamic = 'force-dynamic'

interface MultipleChange {
  icbSubSector: string
  oldMultiples: {
    ebitdaLow: number
    ebitdaHigh: number
    revenueLow: number
    revenueHigh: number
  }
  newMultiples: {
    ebitdaLow: number
    ebitdaHigh: number
    revenueLow: number
    revenueHigh: number
  }
  percentChange: number
}

function calculateMultipleChange(
  oldEbitdaLow: number, oldEbitdaHigh: number,
  oldRevenueLow: number, oldRevenueHigh: number,
  newEbitdaLow: number, newEbitdaHigh: number,
  newRevenueLow: number, newRevenueHigh: number
): number {
  const changes = [
    oldEbitdaLow > 0 ? Math.abs((newEbitdaLow - oldEbitdaLow) / oldEbitdaLow) : 0,
    oldEbitdaHigh > 0 ? Math.abs((newEbitdaHigh - oldEbitdaHigh) / oldEbitdaHigh) : 0,
    oldRevenueLow > 0 ? Math.abs((newRevenueLow - oldRevenueLow) / oldRevenueLow) : 0,
    oldRevenueHigh > 0 ? Math.abs((newRevenueHigh - oldRevenueHigh) / oldRevenueHigh) : 0,
  ]
  return Math.max(...changes) * 100
}

const BATCH_SIZE = 10
const MAX_RUNTIME_MS = 50_000 // Leave 10s buffer for Vercel's 60s timeout

/**
 * Monthly Cron Job: Refresh Industry Multiples via AI Research
 *
 * Scheduled to run on the 1st of each month.
 *
 * Flow:
 * 1. Find all distinct icbSubSector values from active companies
 * 2. For each stale sub-sector (>30 days since last research), run AI research
 * 3. Compare old vs new multiples
 * 4. Recalculate valuations for companies with >10% multiple changes
 * 5. Create signals for significant changes
 * 6. Process in batches to stay within Vercel timeout
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request)
  if (authError) return authError

  const cronStart = Date.now()

  try {
    // Find all active sub-sectors (only research what's in use)
    const activeSubSectors = await prisma.company.findMany({
      where: { deletedAt: null },
      select: { icbSubSector: true, gicsSubIndustry: true },
      distinct: ['icbSubSector'],
    })

    console.log(`[RefreshMultiples] Found ${activeSubSectors.length} active sub-sectors`)

    // Check which are stale
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const staleSubSectors: Array<{ icbSubSector: string; gicsSubIndustry: string | null }> = []

    for (const { icbSubSector, gicsSubIndustry } of activeSubSectors) {
      const latest = await prisma.industryMultiple.findFirst({
        where: { icbSubSector },
        orderBy: { effectiveDate: 'desc' },
      })

      if (!latest || !latest.lastResearchedAt || latest.lastResearchedAt < thirtyDaysAgo) {
        staleSubSectors.push({ icbSubSector, gicsSubIndustry })
      }
    }

    console.log(`[RefreshMultiples] ${staleSubSectors.length} sub-sectors need research`)

    if (staleSubSectors.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All multiples are fresh',
        researched: 0,
        companiesRecalculated: 0,
        signalsCreated: 0,
      })
    }

    // Process in batches with timeout awareness
    let researched = 0
    let researchFailed = 0
    const significantChanges: MultipleChange[] = []
    const subsectorsToRecalculate: string[] = []

    for (let i = 0; i < staleSubSectors.length; i += BATCH_SIZE) {
      // Check timeout
      if (Date.now() - cronStart > MAX_RUNTIME_MS) {
        console.log(`[RefreshMultiples] Approaching timeout, stopping after ${researched} researched`)
        break
      }

      const batch = staleSubSectors.slice(i, i + BATCH_SIZE)

      for (const { icbSubSector, gicsSubIndustry } of batch) {
        if (Date.now() - cronStart > MAX_RUNTIME_MS) break

        try {
          // Get existing multiples for comparison
          const existing = await prisma.industryMultiple.findFirst({
            where: { icbSubSector },
            orderBy: { effectiveDate: 'desc' },
          })

          // Research new multiples
          const research = await researchMultiples(icbSubSector, gicsSubIndustry ?? undefined)

          // Store new multiples
          const now = new Date()
          await prisma.industryMultiple.create({
            data: {
              icbIndustry: '',
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

          researched++
          subsectorsToRecalculate.push(icbSubSector)

          // Check for significant changes
          if (existing) {
            const percentChange = calculateMultipleChange(
              Number(existing.ebitdaMultipleLow), Number(existing.ebitdaMultipleHigh),
              Number(existing.revenueMultipleLow), Number(existing.revenueMultipleHigh),
              research.ebitdaMultipleLow, research.ebitdaMultipleHigh,
              research.revenueMultipleLow, research.revenueMultipleHigh,
            )

            if (percentChange > 10) {
              significantChanges.push({
                icbSubSector,
                oldMultiples: {
                  ebitdaLow: Number(existing.ebitdaMultipleLow),
                  ebitdaHigh: Number(existing.ebitdaMultipleHigh),
                  revenueLow: Number(existing.revenueMultipleLow),
                  revenueHigh: Number(existing.revenueMultipleHigh),
                },
                newMultiples: {
                  ebitdaLow: research.ebitdaMultipleLow,
                  ebitdaHigh: research.ebitdaMultipleHigh,
                  revenueLow: research.revenueMultipleLow,
                  revenueHigh: research.revenueMultipleHigh,
                },
                percentChange,
              })
              console.log(`[RefreshMultiples] Significant change for ${icbSubSector}: ${percentChange.toFixed(1)}%`)
            }
          }
        } catch (err) {
          researchFailed++
          console.error(`[RefreshMultiples] Research failed for ${icbSubSector}:`, err instanceof Error ? err.message : String(err))
        }
      }
    }

    // Recalculate valuations for affected companies
    const affectedCompanies = await prisma.company.findMany({
      where: {
        icbSubSector: { in: subsectorsToRecalculate },
        deletedAt: null,
      },
      select: { id: true, name: true, icbSubSector: true },
    })

    let recalculated = 0
    let recalcFailed = 0

    for (const company of affectedCompanies) {
      if (Date.now() - cronStart > MAX_RUNTIME_MS) break

      try {
        const result = await recalculateSnapshotForCompany(
          company.id,
          'Monthly industry multiple refresh (AI research)',
          undefined
        )
        if (result.success) recalculated++
        else recalcFailed++
      } catch {
        recalcFailed++
      }
    }

    // Create signals for significant changes
    let signalsCreated = 0
    for (const change of significantChanges) {
      const companiesInSubsector = affectedCompanies.filter(c => c.icbSubSector === change.icbSubSector)

      for (const company of companiesInSubsector) {
        try {
          const direction = change.newMultiples.ebitdaHigh > change.oldMultiples.ebitdaHigh ? 'increased' : 'decreased'
          const severity = change.percentChange > 20 ? 'HIGH' : 'MEDIUM'

          // Get previous and new valuations for context
          const snapshots = await prisma.valuationSnapshot.findMany({
            where: { companyId: company.id },
            orderBy: { createdAt: 'desc' },
            take: 2,
            select: { currentValue: true, createdAt: true },
          })

          const newValue = snapshots[0] ? Number(snapshots[0].currentValue) : null
          const oldValue = snapshots[1] ? Number(snapshots[1].currentValue) : null
          const valuationDelta = newValue && oldValue ? newValue - oldValue : null

          const formatCurrency = (v: number) => {
            if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
            if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}K`
            return `$${Math.round(v)}`
          }

          let description = `Your industry's valuation multiples have ${direction} significantly. EBITDA multiples changed from ${change.oldMultiples.ebitdaLow}-${change.oldMultiples.ebitdaHigh}x to ${change.newMultiples.ebitdaLow}-${change.newMultiples.ebitdaHigh}x.`
          if (valuationDelta && oldValue) {
            description += ` Your estimated value changed from ${formatCurrency(oldValue)} to ${formatCurrency(newValue!)} (${valuationDelta > 0 ? '+' : ''}${formatCurrency(valuationDelta)}).`
          }

          await createSignal({
            companyId: company.id,
            channel: 'EXTERNAL',
            category: 'MARKET',
            eventType: 'MARKET_MULTIPLE_CHANGE',
            severity,
            confidence: 'VERIFIED',
            title: `Industry multiples ${direction} by ${change.percentChange.toFixed(0)}%`,
            description,
            rawData: {
              subsector: change.icbSubSector,
              oldMultiples: change.oldMultiples,
              newMultiples: change.newMultiples,
              percentChange: change.percentChange,
              ...(oldValue && { previousValue: oldValue }),
              ...(newValue && { newValue }),
            },
            estimatedValueImpact: valuationDelta,
            sourceType: 'INDUSTRY_MULTIPLE_REFRESH',
            sourceId: change.icbSubSector,
          })
          signalsCreated++
        } catch (error) {
          console.error(
            `[RefreshMultiples] Error creating signal for company ${company.id}:`,
            error instanceof Error ? error.message : String(error)
          )
        }
      }
    }

    console.log(
      `[RefreshMultiples] Complete: ${researched} researched, ${researchFailed} failed, ` +
      `${recalculated} recalculated, ${recalcFailed} recalc failed, ${signalsCreated} signals created`
    )

    return NextResponse.json({
      success: true,
      totalSubSectors: activeSubSectors.length,
      staleSubSectors: staleSubSectors.length,
      researched,
      researchFailed,
      companiesRecalculated: recalculated,
      companiesFailed: recalcFailed,
      signalsCreated,
      significantChanges: significantChanges.length,
      runtimeMs: Date.now() - cronStart,
    })
  } catch (error) {
    console.error('[RefreshMultiples] Cron error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to run multiple refresh cron' },
      { status: 500 }
    )
  }
}
