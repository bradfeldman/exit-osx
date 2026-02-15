import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSignalWithLedgerEntry } from '@/lib/signals/create-signal'
import { getDefaultConfidenceForChannel } from '@/lib/signals/confidence-scoring'
import { generateNarrative } from '@/lib/value-ledger/narrative-templates'
import { verifyCronAuth } from '@/lib/security/cron-auth'
import type { TimeDecayData } from '@/lib/signals/types'

const STALENESS_THRESHOLD_DAYS = 180 // 6 months

export async function GET(request: Request) {
  // SECURITY FIX (PROD-060): Uses verifyCronAuth which fails closed when CRON_SECRET is not set.
  const authError = verifyCronAuth(request)
  if (authError) return authError

  try {
    const now = new Date()
    const threshold = new Date()
    threshold.setDate(threshold.getDate() - STALENESS_THRESHOLD_DAYS)

    // Find companies with no financial data newer than 6 months
    const companies = await prisma.company.findMany({
      where: {
        deletedAt: null,
        financialPeriods: {
          every: {
            endDate: { lt: threshold },
          },
        },
      },
      select: {
        id: true,
        name: true,
        financialPeriods: {
          orderBy: { endDate: 'desc' },
          take: 1,
          select: { id: true, endDate: true },
        },
      },
    })

    // Filter to those that actually have at least one financial period
    const staleCompanies = companies.filter((c) => c.financialPeriods.length > 0)

    let signalsCreated = 0

    for (const company of staleCompanies) {
      // Check for existing unresolved staleness signal
      const existingSignal = await prisma.signal.findFirst({
        where: {
          companyId: company.id,
          eventType: 'financial_staleness',
          resolutionStatus: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
        },
      })

      if (existingSignal) continue

      const latestPeriod = company.financialPeriods[0]
      const daysSinceUpdate = Math.floor(
        (now.getTime() - latestPeriod.endDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      const rawData: TimeDecayData = {
        entityType: 'financial_period',
        entityId: latestPeriod.id,
        entityName: `Financial data for ${company.name}`,
        lastUpdated: latestPeriod.endDate.toISOString(),
        daysSinceUpdate,
        thresholdDays: STALENESS_THRESHOLD_DAYS,
      }

      // Escalate severity: > 1 year is CRITICAL, > 6 months is HIGH
      const severity = daysSinceUpdate > 365 ? 'CRITICAL' as const : 'HIGH' as const

      await createSignalWithLedgerEntry({
        companyId: company.id,
        channel: 'TIME_DECAY',
        category: 'FINANCIAL',
        eventType: 'financial_staleness',
        severity,
        confidence: getDefaultConfidenceForChannel('TIME_DECAY'),
        title: daysSinceUpdate > 365
          ? 'Financial data is more than 1 year old'
          : 'Financial data is more than 6 months old',
        description: `Last financial period ended ${daysSinceUpdate} days ago. Buyers expect current financials.`,
        rawData: rawData as unknown as Record<string, unknown>,
        sourceType: 'financial_period',
        sourceId: latestPeriod.id,
        ledgerEventType: 'DRIFT_DETECTED',
        narrativeSummary: generateNarrative({
          eventType: 'DRIFT_DETECTED',
          category: 'FINANCIAL',
          daysSinceUpdate,
        }),
      })

      signalsCreated++
    }

    return NextResponse.json({
      message: `Checked ${staleCompanies.length} companies, created ${signalsCreated} signals`,
      companiesChecked: staleCompanies.length,
      signalsCreated,
    })
  } catch (error) {
    console.error('[Cron] Error detecting financial staleness:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to process financial staleness' },
      { status: 500 }
    )
  }
}
