/**
 * Drift Report Orchestrator
 *
 * Fetches data, runs the pure drift calculation, persists the DriftReport
 * record, and fires side effects (Signal, ValueLedgerEntry, email).
 *
 * This is the main entry point called by:
 * - The monthly cron job (for all companies)
 * - On-demand report generation (for a single company)
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  calculateDrift,
  getDriftSignalSeverity,
  type SnapshotData,
  type DriftResult,
} from './calculate-drift'
import { createSignalWithLedgerEntry } from '@/lib/signals/create-signal'

// ---------------------------------------------------------------------------
// Data fetching helpers
// ---------------------------------------------------------------------------

/**
 * Convert a ValuationSnapshot record to the pure SnapshotData type
 * expected by the calculation engine.
 */
function toSnapshotData(snapshot: {
  briScore: Prisma.Decimal
  currentValue: Prisma.Decimal
  briFinancial: Prisma.Decimal
  briTransferability: Prisma.Decimal
  briOperational: Prisma.Decimal
  briMarket: Prisma.Decimal
  briLegalTax: Prisma.Decimal
  briPersonal: Prisma.Decimal
}): SnapshotData {
  return {
    briScore: Number(snapshot.briScore),
    currentValue: Number(snapshot.currentValue),
    briFinancial: Number(snapshot.briFinancial),
    briTransferability: Number(snapshot.briTransferability),
    briOperational: Number(snapshot.briOperational),
    briMarket: Number(snapshot.briMarket),
    briLegalTax: Number(snapshot.briLegalTax),
    briPersonal: Number(snapshot.briPersonal),
  }
}

/**
 * Fetch the snapshot closest to (but not after) a given date.
 */
async function getSnapshotNearDate(companyId: string, date: Date) {
  return prisma.valuationSnapshot.findFirst({
    where: { companyId, createdAt: { lte: date } },
    orderBy: { createdAt: 'desc' },
  })
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export interface GenerateDriftReportOptions {
  /** Skip writing the DriftReport record (dry run) */
  dryRun?: boolean
}

export interface GeneratedDriftReport {
  id: string
  companyId: string
  driftResult: DriftResult
  briScoreStart: number
  briScoreEnd: number
  valuationStart: number
  valuationEnd: number
  signalCreated: boolean
  signalSeverity: 'HIGH' | 'CRITICAL' | null
}

/**
 * Generate a complete drift report for a company.
 *
 * Steps:
 * 1. Fetch snapshots for period start and end
 * 2. Fetch signal, task, and document staleness metrics
 * 3. Run pure drift calculation
 * 4. Persist DriftReport record
 * 5. Create Signal if significant drift detected
 * 6. Create ValueLedgerEntry for the drift event
 *
 * @param companyId - Company to analyze
 * @param periodStart - Start of the analysis period
 * @param periodEnd - End of the analysis period
 * @param options - Optional configuration
 * @returns The generated drift report data
 */
export async function generateDriftReport(
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
  options: GenerateDriftReportOptions = {}
): Promise<GeneratedDriftReport> {
  // -----------------------------------------------------------------------
  // 1. Fetch snapshots
  // -----------------------------------------------------------------------
  const [startSnapshotRaw, endSnapshotRaw] = await Promise.all([
    getSnapshotNearDate(companyId, periodStart),
    getSnapshotNearDate(companyId, periodEnd),
  ])

  const previousSnapshot = startSnapshotRaw ? toSnapshotData(startSnapshotRaw) : null
  const currentSnapshot = endSnapshotRaw ? toSnapshotData(endSnapshotRaw) : null

  // -----------------------------------------------------------------------
  // 2. Fetch period metrics in parallel
  // -----------------------------------------------------------------------
  const [
    signalsResult,
    tasksCompletedCount,
    tasksPendingAtStart,
    staleDocumentCount,
    topPendingTasks,
    topSignalsRaw,
    tasksAddedCount,
  ] = await Promise.all([
    // Signal counts grouped by severity
    prisma.signal.groupBy({
      by: ['severity'],
      where: {
        companyId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      _count: true,
    }),
    // Tasks completed during the period
    prisma.task.count({
      where: {
        companyId,
        status: 'COMPLETED',
        completedAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    // Tasks that were pending or in-progress at period start
    // (Approximation: tasks created before period start that are still not completed,
    //  or were completed during this period)
    prisma.task.count({
      where: {
        companyId,
        createdAt: { lte: periodStart },
        OR: [
          { status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] } },
          {
            status: 'COMPLETED',
            completedAt: { gte: periodStart },
          },
        ],
      },
    }),
    // Stale documents (NEEDS_UPDATE or OVERDUE)
    prisma.dataRoomDocument.count({
      where: {
        companyId,
        status: { in: ['NEEDS_UPDATE', 'OVERDUE'] },
      },
    }),
    // Top pending tasks sorted by value (for recommendations)
    prisma.task.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      orderBy: { normalizedValue: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        briCategory: true,
        normalizedValue: true,
      },
    }),
    // Top signals for the report (most recent 5)
    prisma.signal.findMany({
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
    }),
    // Tasks added during the period
    prisma.task.count({
      where: {
        companyId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
  ])

  // Aggregate signal counts
  const signalsSummary = {
    high: signalsResult.find(s => s.severity === 'HIGH')?._count ?? 0,
    critical: signalsResult.find(s => s.severity === 'CRITICAL')?._count ?? 0,
    total: signalsResult.reduce((sum, s) => sum + s._count, 0),
  }

  // Convert Prisma Decimal to number for pending tasks
  const pendingTasksForCalc = topPendingTasks.map(t => ({
    ...t,
    normalizedValue: Number(t.normalizedValue),
  }))

  // -----------------------------------------------------------------------
  // 3. Run pure drift calculation
  // -----------------------------------------------------------------------
  const driftResult = calculateDrift({
    currentSnapshot,
    previousSnapshot,
    staleDocumentCount,
    signalsSummary,
    tasksCompletedCount,
    tasksPendingAtStart,
    topPendingTasks: pendingTasksForCalc,
  })

  // -----------------------------------------------------------------------
  // 4. Build narrative summary (rule-based, no AI)
  // -----------------------------------------------------------------------
  const summary = buildNarrativeSummary(
    driftResult,
    periodStart,
    tasksCompletedCount,
    signalsSummary.total
  )

  // Extract scores for persistence
  const briScoreStart = previousSnapshot?.briScore ?? 0
  const briScoreEnd = currentSnapshot?.briScore ?? 0
  const valuationStart = previousSnapshot?.currentValue ?? 0
  const valuationEnd = currentSnapshot?.currentValue ?? 0

  // Build the top signals JSON for storage
  const topSignals = topSignalsRaw.map(s => ({
    title: s.title,
    severity: s.severity,
    category: s.category,
    createdAt: s.createdAt.toISOString(),
  }))

  // Build drift categories JSON for storage (compatible with existing schema)
  const driftCategories = driftResult.categoryChanges.map(c => ({
    category: c.category,
    label: c.label,
    scoreBefore: Math.round(c.previousScore * 100),
    scoreAfter: Math.round(c.currentScore * 100),
    direction: c.direction === 'improving' ? 'up' : c.direction === 'declining' ? 'down' : 'flat',
  }))

  // -----------------------------------------------------------------------
  // 5. Persist DriftReport
  // -----------------------------------------------------------------------
  let reportId = 'dry-run'

  if (!options.dryRun) {
    const report = await prisma.driftReport.create({
      data: {
        companyId,
        periodStart,
        periodEnd,
        briScoreStart,
        briScoreEnd,
        valuationStart,
        valuationEnd,
        signalsCount: signalsSummary.total,
        tasksCompletedCount,
        tasksAddedCount,
        driftCategories: driftCategories as unknown as Prisma.InputJsonValue,
        topSignals: topSignals as unknown as Prisma.InputJsonValue,
        summary,
      },
    })
    reportId = report.id
  }

  // -----------------------------------------------------------------------
  // 6. Create Signal and ValueLedgerEntry if significant drift
  // -----------------------------------------------------------------------
  const signalSeverity = getDriftSignalSeverity(driftResult.briScoreChange)
  let signalCreated = false

  if (signalSeverity && !options.dryRun) {
    const dropPoints = Math.abs(Math.round(driftResult.briScoreChange * 100))
    const decliningCategories = driftResult.categoryChanges
      .filter(c => c.direction === 'declining')
      .map(c => c.label)

    const description = decliningCategories.length > 0
      ? `BRI dropped ${dropPoints} points. Declining areas: ${decliningCategories.join(', ')}.`
      : `BRI dropped ${dropPoints} points over the past month.`

    await createSignalWithLedgerEntry({
      companyId,
      channel: 'TIME_DECAY',
      eventType: 'monthly_drift_decline',
      severity: signalSeverity,
      confidence: 'CONFIDENT',
      title: `Monthly BRI declined ${dropPoints} points`,
      description,
      rawData: {
        briScoreStart,
        briScoreEnd,
        briScoreChange: driftResult.briScoreChange,
        valuationChange: driftResult.valuationChange,
        driftDirection: driftResult.overallDriftDirection,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        reportId,
      },
      sourceType: 'drift_report',
      sourceId: reportId,
      estimatedValueImpact: driftResult.valuationChange < 0
        ? Math.abs(driftResult.valuationChange)
        : null,
      estimatedBriImpact: driftResult.briScoreChange,
      ledgerEventType: 'DRIFT_DETECTED',
      deltaValueAtRisk: driftResult.valuationChange < 0
        ? Math.abs(driftResult.valuationChange)
        : 0,
      narrativeSummary: `Monthly drift detected: BRI ${driftResult.overallDriftDirection === 'DECLINING' ? 'declined' : 'changed'} by ${dropPoints} points`,
    })

    signalCreated = true
  }

  return {
    id: reportId,
    companyId,
    driftResult,
    briScoreStart,
    briScoreEnd,
    valuationStart,
    valuationEnd,
    signalCreated,
    signalSeverity,
  }
}

// ---------------------------------------------------------------------------
// Narrative generation (template-driven, no AI)
// ---------------------------------------------------------------------------

/**
 * Build a human-readable narrative summary of the drift period.
 * This is template-driven with no AI -- deterministic and fast.
 */
function buildNarrativeSummary(
  drift: DriftResult,
  periodStart: Date,
  tasksCompletedCount: number,
  totalSignals: number
): string {
  const monthName = periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const briChangePoints = Math.abs(Math.round(drift.briScoreChange * 100))
  const valuationChangeFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(drift.valuationChange))

  const briVerb = drift.briScoreChange >= 0 ? 'improved' : 'declined'
  const valVerb = drift.valuationChange >= 0 ? 'grew' : 'decreased'

  let summary = `In ${monthName}, your Buyer Readiness Score ${briVerb} by ${briChangePoints} points`
  summary += ` and your estimated valuation ${valVerb} by ${valuationChangeFormatted}.`

  if (tasksCompletedCount > 0) {
    summary += ` You completed ${tasksCompletedCount} task${tasksCompletedCount !== 1 ? 's' : ''}.`
  }

  const improving = drift.categoryChanges.filter(c => c.direction === 'improving')
  const declining = drift.categoryChanges.filter(c => c.direction === 'declining')

  if (improving.length > 0) {
    summary += ` Strongest improvements in ${improving.map(c => c.label).join(', ')}.`
  }

  if (declining.length > 0) {
    summary += ` Areas needing attention: ${declining.map(c => c.label).join(', ')}.`
  }

  if (totalSignals > 0) {
    summary += ` ${totalSignals} new signal${totalSignals !== 1 ? 's' : ''} detected.`
  }

  return summary
}
