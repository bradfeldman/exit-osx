import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// BRI score threshold for "Exit-Ready" status
const EXIT_READY_BRI_THRESHOLD = 80

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('companyId')

  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
  }

  try {
    // Fetch all progression-related data in parallel
    const [
      latestSnapshot,
      completedTaskCount,
      financialPeriodCount,
      personalFinancialsExists,
    ] = await Promise.all([
      // Get latest valuation snapshot (indicates assessment complete)
      prisma.valuationSnapshot.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          briScore: true,
        },
      }),

      // Count completed tasks
      prisma.task.count({
        where: {
          companyId,
          status: 'COMPLETED',
        },
      }),

      // Check for business financials (any financial period with income statement)
      prisma.financialPeriod.count({
        where: {
          companyId,
          incomeStatement: {
            isNot: null,
          },
        },
      }),

      // Check for personal financials (linked through company's organization)
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          organization: {
            select: {
              personalFinancials: {
                select: { id: true },
              },
            },
          },
        },
      }),
    ])

    // Check for DCF valuation data
    // DCF is considered complete if there's a valuation with adjustedEbitda and reasonable multiples
    const hasDcfValuation = latestSnapshot !== null

    // Determine if user has personal financials
    const hasPersonalFinancials = personalFinancialsExists?.organization?.personalFinancials !== null

    // Debug logging for progression unlock issues
    console.log(`[PROGRESSION] Company ${companyId}: hasBusinessFinancials=${financialPeriodCount > 0}, hasDcfValuation=${hasDcfValuation}, hasPersonalFinancials=${hasPersonalFinancials}, personalFinancialsData=`, JSON.stringify(personalFinancialsExists))

    // Determine if Exit-Ready (BRI score above threshold)
    const briScore = latestSnapshot?.briScore ? Number(latestSnapshot.briScore) : null
    const isExitReady = briScore !== null && briScore >= EXIT_READY_BRI_THRESHOLD

    return NextResponse.json({
      hasAssessment: latestSnapshot !== null,
      completedTaskCount,
      hasBusinessFinancials: financialPeriodCount > 0,
      hasDcfValuation,
      hasPersonalFinancials,
      isExitReady,
      briScore,
    })
  } catch (error) {
    console.error('Error fetching progression data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progression data' },
      { status: 500 }
    )
  }
}
