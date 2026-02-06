import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const permResult = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(permResult)) return permResult.error

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 24)

  try {
    const reports = await prisma.driftReport.findMany({
      where: { companyId },
      orderBy: { periodEnd: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      reports: reports.map(r => ({
        id: r.id,
        periodStart: r.periodStart.toISOString(),
        periodEnd: r.periodEnd.toISOString(),
        briScoreStart: Number(r.briScoreStart),
        briScoreEnd: Number(r.briScoreEnd),
        valuationStart: Number(r.valuationStart),
        valuationEnd: Number(r.valuationEnd),
        signalsCount: r.signalsCount,
        tasksCompletedCount: r.tasksCompletedCount,
        tasksAddedCount: r.tasksAddedCount,
        driftCategories: r.driftCategories,
        topSignals: r.topSignals,
        summary: r.summary,
        emailSentAt: r.emailSentAt?.toISOString() || null,
        viewedAt: r.viewedAt?.toISOString() || null,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[DriftReport] Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drift reports' },
      { status: 500 }
    )
  }
}
