import { prisma } from '@/lib/prisma'
import type { ValuationSection } from '../types'

export async function buildValuationSection(companyId: string): Promise<ValuationSection> {
  // Get latest snapshot
  const latestSnapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  })

  // Get last 5 snapshots for trend
  const recentSnapshots = await prisma.valuationSnapshot.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      createdAt: true,
      briScore: true,
      currentValue: true,
    },
  })

  const trend = recentSnapshots
    .reverse()
    .map(s => ({
      date: s.createdAt.toISOString(),
      briScore: Number(s.briScore),
      currentValue: Number(s.currentValue),
    }))

  if (!latestSnapshot) {
    return {
      currentValue: null,
      potentialValue: null,
      valueGap: null,
      briScore: null,
      finalMultiple: null,
      trend,
    }
  }

  return {
    currentValue: Number(latestSnapshot.currentValue),
    potentialValue: Number(latestSnapshot.potentialValue),
    valueGap: Number(latestSnapshot.valueGap),
    briScore: Number(latestSnapshot.briScore),
    finalMultiple: Number(latestSnapshot.finalMultiple),
    trend,
  }
}
