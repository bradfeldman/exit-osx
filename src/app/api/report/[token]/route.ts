import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyReportToken } from '@/lib/report-token'

/**
 * Public API endpoint — no auth required.
 * Serves exit readiness report data for a valid share token.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const companyId = verifyReportToken(token)
  if (!companyId) {
    return NextResponse.json({ error: 'Invalid or expired report link' }, { status: 403 })
  }

  try {
    // Fetch company + latest valuation snapshot + latest assessment data
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, icbIndustry: true },
    })

    if (!company) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Latest valuation snapshot for BRI scores and valuation
    const snapshot = await prisma.valuationSnapshot.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    })

    // Get top tasks (highest priority, incomplete)
    const topTasks = await prisma.task.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      orderBy: [
        { priorityRank: 'asc' },
        { createdAt: 'asc' },
      ],
      take: 5,
      select: {
        title: true,
        description: true,
        briCategory: true,
        normalizedValue: true,
      },
    })

    // Build category scores from snapshot
    const categoryScores = snapshot ? [
      { category: 'Financial', score: Math.round(Number(snapshot.briFinancial) * 100) },
      { category: 'Transferability', score: Math.round(Number(snapshot.briTransferability) * 100) },
      { category: 'Operational', score: Math.round(Number(snapshot.briOperational) * 100) },
      { category: 'Market', score: Math.round(Number(snapshot.briMarket) * 100) },
      { category: 'Legal & Tax', score: Math.round(Number(snapshot.briLegalTax) * 100) },
      { category: 'Personal', score: Math.round(Number(snapshot.briPersonal) * 100) },
    ].sort((a, b) => a.score - b.score) : []

    // Use stored valuation values (preferred) with recalculation fallback
    const briScore = snapshot ? Math.round(Number(snapshot.briScore) * 100) : 0

    let currentValue = 0
    let potentialValue = 0
    let valueGap = 0

    if (snapshot?.currentValue && Number(snapshot.currentValue) > 0) {
      // Use directly stored values from the assessment
      currentValue = Number(snapshot.currentValue)
      potentialValue = Number(snapshot.potentialValue)
      valueGap = Number(snapshot.valueGap)
    } else if (snapshot) {
      // Fallback: recalculate from EBITDA and multiples
      const ebitda = Number(snapshot.adjustedEbitda)
      const midMultiple = (Number(snapshot.industryMultipleLow) + Number(snapshot.industryMultipleHigh)) / 2
      const coreScore = Number(snapshot.coreScore)
      currentValue = ebitda * midMultiple * coreScore
      potentialValue = ebitda * midMultiple
      valueGap = potentialValue - currentValue
    }

    return NextResponse.json({
      companyName: company.name,
      industry: company.icbIndustry || null,
      briScore,
      currentValue,
      potentialValue,
      valueGap,
      categoryScores,
      topTasks: topTasks.map(t => ({
        title: t.title,
        description: t.description,
        category: t.briCategory,
        estimatedValue: t.normalizedValue ? Number(t.normalizedValue) : 0,
      })),
      generatedAt: snapshot?.createdAt || new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Report API] Error fetching report data:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 })
  }
}
