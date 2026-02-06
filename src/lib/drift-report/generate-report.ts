import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface DriftCategory {
  category: string
  label: string
  scoreBefore: number
  scoreAfter: number
  direction: 'up' | 'down' | 'flat'
}

interface TopSignal {
  title: string
  severity: string
  category: string | null
  createdAt: string
}

const BRI_CATEGORIES = [
  { key: 'briFinancial', category: 'FINANCIAL', label: 'Financial Health' },
  { key: 'briTransferability', category: 'TRANSFERABILITY', label: 'Transferability' },
  { key: 'briOperational', category: 'OPERATIONAL', label: 'Operations' },
  { key: 'briMarket', category: 'MARKET', label: 'Market Position' },
  { key: 'briLegalTax', category: 'LEGAL_TAX', label: 'Legal & Tax' },
  { key: 'briPersonal', category: 'PERSONAL', label: 'Personal Readiness' },
] as const

export async function generateDriftReport(
  companyId: string,
  periodStart: Date,
  periodEnd: Date
) {
  // Get snapshots closest to period start and end
  const [startSnapshot, endSnapshot] = await Promise.all([
    prisma.valuationSnapshot.findFirst({
      where: { companyId, createdAt: { lte: periodStart } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.valuationSnapshot.findFirst({
      where: { companyId, createdAt: { lte: periodEnd } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Count signals created in period
  const signalsCount = await prisma.signal.count({
    where: {
      companyId,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
  })

  // Count tasks completed and added in period
  const [tasksCompletedCount, tasksAddedCount] = await Promise.all([
    prisma.task.count({
      where: {
        companyId,
        status: 'COMPLETED',
        completedAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.task.count({
      where: {
        companyId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
  ])

  // Get top signals by severity
  const topSignalsRaw = await prisma.signal.findMany({
    where: {
      companyId,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      title: true,
      severity: true,
      category: true,
      createdAt: true,
    },
  })

  const topSignals: TopSignal[] = topSignalsRaw.map(s => ({
    title: s.title,
    severity: s.severity,
    category: s.category,
    createdAt: s.createdAt.toISOString(),
  }))

  // Build per-category BRI breakdown
  const briScoreStart = startSnapshot ? Number(startSnapshot.briScore) : 0
  const briScoreEnd = endSnapshot ? Number(endSnapshot.briScore) : 0
  const valuationStart = startSnapshot ? Number(startSnapshot.currentValue) : 0
  const valuationEnd = endSnapshot ? Number(endSnapshot.currentValue) : 0

  const driftCategories: DriftCategory[] = BRI_CATEGORIES.map(({ key, category, label }) => {
    const before = startSnapshot ? Number(startSnapshot[key]) : 0
    const after = endSnapshot ? Number(endSnapshot[key]) : 0
    const diff = after - before
    return {
      category,
      label,
      scoreBefore: Math.round(before * 100),
      scoreAfter: Math.round(after * 100),
      direction: diff > 0.005 ? 'up' : diff < -0.005 ? 'down' : 'flat',
    }
  })

  // Generate narrative summary
  const briChange = briScoreEnd - briScoreStart
  const briChangePercent = Math.round(briChange * 100)
  const valuationChange = valuationEnd - valuationStart
  const valuationChangeFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(valuationChange))

  const monthName = periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const improvingCategories = driftCategories.filter(c => c.direction === 'up')
  const decliningCategories = driftCategories.filter(c => c.direction === 'down')

  let summary = `In ${monthName}, your Buyer Readiness Index ${briChange >= 0 ? 'improved' : 'declined'} by ${Math.abs(briChangePercent)} points`
  summary += ` and your estimated valuation ${valuationChange >= 0 ? 'grew' : 'decreased'} by ${valuationChangeFormatted}.`

  if (tasksCompletedCount > 0) {
    summary += ` You completed ${tasksCompletedCount} task${tasksCompletedCount !== 1 ? 's' : ''}.`
  }

  if (improvingCategories.length > 0) {
    summary += ` Strongest improvements in ${improvingCategories.map(c => c.label).join(', ')}.`
  }

  if (decliningCategories.length > 0) {
    summary += ` Areas needing attention: ${decliningCategories.map(c => c.label).join(', ')}.`
  }

  if (signalsCount > 0) {
    summary += ` ${signalsCount} new signal${signalsCount !== 1 ? 's' : ''} detected.`
  }

  // Create DriftReport record
  const report = await prisma.driftReport.create({
    data: {
      companyId,
      periodStart,
      periodEnd,
      briScoreStart,
      briScoreEnd,
      valuationStart,
      valuationEnd,
      signalsCount,
      tasksCompletedCount,
      tasksAddedCount,
      driftCategories: driftCategories as unknown as Prisma.InputJsonValue,
      topSignals: topSignals as unknown as Prisma.InputJsonValue,
      summary,
    },
  })

  return report
}
