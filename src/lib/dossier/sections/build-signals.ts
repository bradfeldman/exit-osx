import { prisma } from '@/lib/prisma'
import type { SignalsSection } from '../types'

export async function buildSignalsSection(companyId: string): Promise<SignalsSection> {
  // Open signals
  const openSignals = await prisma.signal.findMany({
    where: {
      companyId,
      resolutionStatus: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: 15,
    select: {
      id: true,
      title: true,
      severity: true,
      category: true,
      description: true,
    },
  })

  // Severity summary of all open signals
  const allOpenSignals = await prisma.signal.groupBy({
    by: ['severity'],
    where: {
      companyId,
      resolutionStatus: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
    },
    _count: true,
  })

  const severitySummary: Record<string, number> = {}
  for (const group of allOpenSignals) {
    severitySummary[group.severity] = group._count
  }

  // Recent value movements (from value ledger, last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const recentLedgerEntries = await prisma.valueLedgerEntry.findMany({
    where: {
      companyId,
      createdAt: { gte: ninetyDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      createdAt: true,
      deltaValueRecovered: true,
      deltaValueAtRisk: true,
      eventType: true,
      narrativeSummary: true,
    },
  })

  const recentValueMovements = recentLedgerEntries.map(e => ({
    date: e.createdAt.toISOString(),
    deltaValue: Number(e.deltaValueRecovered) - Number(e.deltaValueAtRisk),
    eventType: e.eventType,
    narrativeSummary: e.narrativeSummary,
  }))

  return {
    openSignalsCount: Object.values(severitySummary).reduce((a, b) => a + b, 0),
    severitySummary,
    recentValueMovements,
    topOpenSignals: openSignals.map(s => ({
      id: s.id,
      title: s.title,
      severity: s.severity,
      category: s.category,
      description: s.description,
    })),
  }
}
