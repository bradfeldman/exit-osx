import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id: companyId, reportId } = await params

  const permResult = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(permResult)) return permResult.error

  try {
    const report = await prisma.driftReport.findFirst({
      where: { id: reportId, companyId },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json({
      report: {
        id: report.id,
        periodStart: report.periodStart.toISOString(),
        periodEnd: report.periodEnd.toISOString(),
        briScoreStart: Number(report.briScoreStart),
        briScoreEnd: Number(report.briScoreEnd),
        valuationStart: Number(report.valuationStart),
        valuationEnd: Number(report.valuationEnd),
        signalsCount: report.signalsCount,
        tasksCompletedCount: report.tasksCompletedCount,
        tasksAddedCount: report.tasksAddedCount,
        driftCategories: report.driftCategories,
        topSignals: report.topSignals,
        summary: report.summary,
        emailSentAt: report.emailSentAt?.toISOString() || null,
        viewedAt: report.viewedAt?.toISOString() || null,
        createdAt: report.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[DriftReport] Error fetching report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drift report' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id: companyId, reportId } = await params

  const permResult = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(permResult)) return permResult.error

  try {
    const report = await prisma.driftReport.update({
      where: { id: reportId },
      data: { viewedAt: new Date() },
    })

    return NextResponse.json({
      report: {
        id: report.id,
        viewedAt: report.viewedAt?.toISOString() || null,
      },
    })
  } catch (error) {
    console.error('[DriftReport] Error marking report viewed:', error)
    return NextResponse.json(
      { error: 'Failed to update drift report' },
      { status: 500 }
    )
  }
}
