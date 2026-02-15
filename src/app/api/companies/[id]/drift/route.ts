/**
 * GET /api/companies/[id]/drift
 *
 * Returns drift report data for a company:
 * - Latest drift report
 * - Drift history (last 6 months)
 * - Current drift direction and recommended actions
 *
 * Requires COMPANY_VIEW permission.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    // Fetch latest drift report and last 6 months of history in parallel
    const [latestReport, reportHistory] = await Promise.all([
      prisma.driftReport.findFirst({
        where: { companyId },
        orderBy: { periodEnd: 'desc' },
      }),
      prisma.driftReport.findMany({
        where: { companyId },
        orderBy: { periodEnd: 'desc' },
        take: 6,
        select: {
          id: true,
          periodStart: true,
          periodEnd: true,
          briScoreStart: true,
          briScoreEnd: true,
          valuationStart: true,
          valuationEnd: true,
          signalsCount: true,
          tasksCompletedCount: true,
          tasksAddedCount: true,
          driftCategories: true,
          topSignals: true,
          summary: true,
          viewedAt: true,
          createdAt: true,
        },
      }),
    ])

    // Mark latest report as viewed if not already
    if (latestReport && !latestReport.viewedAt) {
      await prisma.driftReport.update({
        where: { id: latestReport.id },
        data: { viewedAt: new Date() },
      })
    }

    // Convert Prisma Decimals to numbers for JSON serialization
    const serializeReport = (report: typeof latestReport) => {
      if (!report) return null
      return {
        ...report,
        briScoreStart: Number(report.briScoreStart),
        briScoreEnd: Number(report.briScoreEnd),
        valuationStart: Number(report.valuationStart),
        valuationEnd: Number(report.valuationEnd),
      }
    }

    const serializeHistoryItem = (item: (typeof reportHistory)[number]) => ({
      ...item,
      briScoreStart: Number(item.briScoreStart),
      briScoreEnd: Number(item.briScoreEnd),
      valuationStart: Number(item.valuationStart),
      valuationEnd: Number(item.valuationEnd),
    })

    return NextResponse.json({
      latest: serializeReport(latestReport),
      history: reportHistory.map(serializeHistoryItem),
    })
  } catch (error) {
    console.error('[DriftAPI] Error fetching drift reports:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch drift reports' },
      { status: 500 }
    )
  }
}
