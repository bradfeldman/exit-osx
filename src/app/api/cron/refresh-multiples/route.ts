import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronAuth } from '@/lib/security/cron-auth'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'

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

/**
 * Calculate percentage change between old and new multiple ranges
 * Returns the maximum change among all four multiple values
 */
function calculateMultipleChange(
  oldEbitdaLow: number,
  oldEbitdaHigh: number,
  oldRevenueLow: number,
  oldRevenueHigh: number,
  newEbitdaLow: number,
  newEbitdaHigh: number,
  newRevenueLow: number,
  newRevenueHigh: number
): number {
  const changes = [
    Math.abs((newEbitdaLow - oldEbitdaLow) / oldEbitdaLow),
    Math.abs((newEbitdaHigh - oldEbitdaHigh) / oldEbitdaHigh),
    Math.abs((newRevenueLow - oldRevenueLow) / oldRevenueLow),
    Math.abs((newRevenueHigh - oldRevenueHigh) / oldRevenueHigh),
  ]
  return Math.max(...changes) * 100
}

/**
 * Monthly Cron Job: Refresh Industry Multiples
 *
 * Scheduled to run on the 1st of each month (alongside drift reports).
 *
 * Current implementation:
 * - Checks for multiple changes in the last 30 days
 * - Recalculates valuations for affected companies
 * - Creates signals for significant changes (>10%)
 * - Logs all changes for audit trail
 *
 * Future enhancement: When external data source is available,
 * this endpoint will automatically fetch and update multiples.
 */
export async function GET(request: Request) {
  // SECURITY: Verify cron authentication (fails closed)
  const authError = verifyCronAuth(request)
  if (authError) return authError

  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    console.log(`[RefreshMultiples] Starting monthly multiple refresh check`)

    // Find all multiples updated in the last 30 days
    const recentMultiples = await prisma.industryMultiple.findMany({
      where: {
        effectiveDate: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: { effectiveDate: 'desc' },
    })

    if (recentMultiples.length === 0) {
      console.log(`[RefreshMultiples] No multiple updates in the last 30 days`)
      return NextResponse.json({
        success: true,
        message: 'No multiple updates to process',
        multiplesUpdated: 0,
        companiesRecalculated: 0,
        signalsCreated: 0,
      })
    }

    console.log(`[RefreshMultiples] Found ${recentMultiples.length} multiple updates`)

    // Group by icbSubSector to find the most recent update per subsector
    const subsectorMap = new Map<string, typeof recentMultiples[0]>()
    for (const multiple of recentMultiples) {
      const existing = subsectorMap.get(multiple.icbSubSector)
      if (!existing || multiple.effectiveDate > existing.effectiveDate) {
        subsectorMap.set(multiple.icbSubSector, multiple)
      }
    }

    // For each updated subsector, find the previous multiple and check for significant changes
    const significantChanges: MultipleChange[] = []
    const subsectorsToRecalculate: string[] = []

    for (const [subsector, newMultiple] of Array.from(subsectorMap.entries())) {
      // Find the previous multiple (second most recent)
      const previousMultiple = await prisma.industryMultiple.findFirst({
        where: {
          icbSubSector: subsector,
          effectiveDate: {
            lt: newMultiple.effectiveDate,
          },
        },
        orderBy: { effectiveDate: 'desc' },
      })

      if (!previousMultiple) {
        // New industry multiple (no previous data)
        console.log(`[RefreshMultiples] New multiple for ${subsector}`)
        subsectorsToRecalculate.push(subsector)
        continue
      }

      // Calculate change percentage
      const percentChange = calculateMultipleChange(
        Number(previousMultiple.ebitdaMultipleLow),
        Number(previousMultiple.ebitdaMultipleHigh),
        Number(previousMultiple.revenueMultipleLow),
        Number(previousMultiple.revenueMultipleHigh),
        Number(newMultiple.ebitdaMultipleLow),
        Number(newMultiple.ebitdaMultipleHigh),
        Number(newMultiple.revenueMultipleLow),
        Number(newMultiple.revenueMultipleHigh)
      )

      if (percentChange > 10) {
        significantChanges.push({
          icbSubSector: subsector,
          oldMultiples: {
            ebitdaLow: Number(previousMultiple.ebitdaMultipleLow),
            ebitdaHigh: Number(previousMultiple.ebitdaMultipleHigh),
            revenueLow: Number(previousMultiple.revenueMultipleLow),
            revenueHigh: Number(previousMultiple.revenueMultipleHigh),
          },
          newMultiples: {
            ebitdaLow: Number(newMultiple.ebitdaMultipleLow),
            ebitdaHigh: Number(newMultiple.ebitdaMultipleHigh),
            revenueLow: Number(newMultiple.revenueMultipleLow),
            revenueHigh: Number(newMultiple.revenueMultipleHigh),
          },
          percentChange,
        })
        console.log(`[RefreshMultiples] Significant change detected for ${subsector}: ${percentChange.toFixed(1)}%`)
      }

      // Recalculate for all changes, not just significant ones
      subsectorsToRecalculate.push(subsector)
    }

    // Find all companies using these subsectors
    const affectedCompanies = await prisma.company.findMany({
      where: {
        icbSubSector: {
          in: subsectorsToRecalculate,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        icbSubSector: true,
      },
    })

    console.log(`[RefreshMultiples] Found ${affectedCompanies.length} companies to recalculate`)

    // Recalculate snapshots for affected companies
    let recalculated = 0
    let failed = 0
    const recalculationErrors: Array<{ companyId: string; error: string }> = []

    for (const company of affectedCompanies) {
      try {
        const result = await recalculateSnapshotForCompany(
          company.id,
          'Monthly industry multiple refresh',
          undefined // System-triggered, no user ID
        )

        if (result.success) {
          recalculated++
        } else {
          failed++
          recalculationErrors.push({
            companyId: company.id,
            error: result.error || 'Unknown error',
          })
        }
      } catch (error) {
        failed++
        recalculationErrors.push({
          companyId: company.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Create signals for companies with significant multiple changes
    let signalsCreated = 0
    if (significantChanges.length > 0) {
      for (const change of significantChanges) {
        // Find companies in this subsector
        const companiesInSubsector = affectedCompanies.filter(
          c => c.icbSubSector === change.icbSubSector
        )

        for (const company of companiesInSubsector) {
          try {
            // Determine if multiples went up or down
            const direction = change.newMultiples.ebitdaHigh > change.oldMultiples.ebitdaHigh
              ? 'increased'
              : 'decreased'

            const severity = change.percentChange > 20 ? 'HIGH' : 'MEDIUM'

            await prisma.signal.create({
              data: {
                companyId: company.id,
                channel: 'EXTERNAL',
                category: 'MARKET',
                eventType: 'MARKET_MULTIPLE_CHANGE',
                severity,
                confidence: 'VERIFIED',
                title: `Industry multiples ${direction} by ${change.percentChange.toFixed(0)}%`,
                description: `Your industry's valuation multiples have ${direction} significantly. EBITDA multiples changed from ${change.oldMultiples.ebitdaLow}-${change.oldMultiples.ebitdaHigh}x to ${change.newMultiples.ebitdaLow}-${change.newMultiples.ebitdaHigh}x. Your valuation has been automatically recalculated.`,
                rawData: {
                  subsector: change.icbSubSector,
                  oldMultiples: change.oldMultiples,
                  newMultiples: change.newMultiples,
                  percentChange: change.percentChange,
                },
                sourceType: 'INDUSTRY_MULTIPLE_REFRESH',
                sourceId: change.icbSubSector,
              },
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
    }

    // Log summary
    console.log(
      `[RefreshMultiples] Complete: ${recentMultiples.length} multiples checked, ` +
      `${affectedCompanies.length} companies found, ${recalculated} recalculated, ` +
      `${failed} failed, ${signalsCreated} signals created`
    )

    if (recalculationErrors.length > 0) {
      console.error(`[RefreshMultiples] Recalculation errors:`, recalculationErrors)
    }

    return NextResponse.json({
      success: true,
      multiplesUpdated: recentMultiples.length,
      companiesRecalculated: recalculated,
      companiesFailed: failed,
      signalsCreated,
      significantChanges: significantChanges.length,
      errors: recalculationErrors.length > 0 ? recalculationErrors : undefined,
    })
  } catch (error) {
    console.error('[RefreshMultiples] Cron error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      {
        // SECURITY FIX (PROD-060): Removed error.message from response
        error: 'Failed to run multiple refresh cron',
      },
      { status: 500 }
    )
  }
}
