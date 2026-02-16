import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// BRI score threshold for "Exit-Ready" status
const EXIT_READY_BRI_THRESHOLD = 80

// All 6 BRI categories that must be assessed for "full assessment"
const ALL_BRI_CATEGORIES = [
  'FINANCIAL',
  'TRANSFERABILITY',
  'OPERATIONAL',
  'MARKET',
  'LEGAL_TAX',
  'PERSONAL',
] as const

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
    // Resolve internal user ID from Supabase auth ID
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { id: true },
    })

    // Fetch all progression-related data in parallel
    const [
      snapshots,
      completedTaskCount,
      financialPeriodCount,
      financialEvidenceCount,
      personalFinancialsExists,
      assessedCategories,
      evidenceCounts,
      dataRoom,
    ] = await Promise.all([
      // Get latest 2 valuation snapshots (for current + previous value comparison)
      prisma.valuationSnapshot.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: {
          id: true,
          briScore: true,
          currentValue: true,
          createdAt: true,
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

      // Also check for uploaded financial evidence documents (P&L, tax docs)
      prisma.dataRoomDocument.count({
        where: {
          companyId,
          category: { in: ['FINANCIAL', 'TAX'] },
          fileUrl: { not: null },
        },
      }),

      // Check for personal financials (user-scoped)
      dbUser
        ? prisma.personalFinancials.findUnique({
            where: { userId: dbUser.id },
            select: { id: true },
          })
        : Promise.resolve(null),

      // Get distinct BRI categories that have at least one assessment response
      // This tells us which of the 6 categories have been assessed
      prisma.assessmentResponse.findMany({
        where: {
          assessment: { companyId },
        },
        select: {
          question: {
            select: {
              briCategory: true,
            },
          },
        },
        distinct: ['questionId'],
      }),

      // Count evidence documents by category for evidence percentage
      prisma.dataRoomDocument.groupBy({
        by: ['category'],
        where: {
          companyId,
          fileUrl: { not: null },
        },
        _count: true,
      }),

      // Check if deal room has been initialized
      prisma.dataRoom.findFirst({
        where: { companyId },
        select: { id: true },
      }),
    ])

    // Extract latest and previous snapshots from array
    const latestSnapshot = snapshots[0] ?? null
    const previousSnapshot = snapshots[1] ?? null

    // Check for DCF valuation data
    const hasDcfValuation = latestSnapshot !== null

    // Determine if user has personal financials (user-scoped)
    const hasPersonalFinancials = personalFinancialsExists !== null

    // Business financials unlocked if structured data OR uploaded evidence exists
    const hasBusinessFinancials = financialPeriodCount > 0 || financialEvidenceCount > 0

    // Determine assessed categories from assessment responses
    const assessedCategorySet = new Set<string>()
    for (const response of assessedCategories) {
      if (response.question?.briCategory) {
        assessedCategorySet.add(response.question.briCategory)
      }
    }
    // Count as assessed if formal assessment responses exist OR onboarding
    // created a valuation snapshot (onboarding risk assessment is client-side
    // and doesn't create AssessmentResponse records)
    const hasAssessment = assessedCategorySet.size > 0 || latestSnapshot !== null
    const hasFullAssessment = ALL_BRI_CATEGORIES.every(cat => assessedCategorySet.has(cat))
    const assessedCategoryCount = assessedCategorySet.size

    // Calculate evidence percentage
    // Simple approach: count total uploaded evidence docs vs a reasonable baseline
    // Using the same logic as evidence score calculator -- total docs uploaded / total expected
    const totalEvidenceUploaded = evidenceCounts.reduce((sum, group) => sum + group._count, 0)
    // We track evidence percentage as a proportion of uploaded vs what we generally expect
    // A rough expected baseline is ~20 docs across all categories
    const EXPECTED_EVIDENCE_BASELINE = 20
    const evidencePercentage = Math.min(
      Math.round((totalEvidenceUploaded / EXPECTED_EVIDENCE_BASELINE) * 100),
      100
    )

    // Deal room initialized
    const hasDealRoom = dataRoom !== null

    // Determine if Exit-Ready (BRI score above threshold)
    const briScore = latestSnapshot?.briScore ? Number(latestSnapshot.briScore) : null
    const isExitReady = briScore !== null && briScore >= EXIT_READY_BRI_THRESHOLD

    // Valuation data for header ticker
    const currentValue = latestSnapshot ? Number(latestSnapshot.currentValue) : null
    const previousValue = previousSnapshot ? Number(previousSnapshot.currentValue) : null

    return NextResponse.json({
      // Milestones
      hasAssessment,
      hasFullAssessment,
      hasBusinessFinancials,
      hasDcfValuation,
      hasPersonalFinancials,
      hasDealRoom,
      isExitReady,
      briScore,
      completedTaskCount,
      assessedCategoryCount,
      assessedCategories: Array.from(assessedCategorySet),
      evidencePercentage,
      // Valuation summary (for header ticker)
      currentValue,
      previousValue,
    })
  } catch (error) {
    console.error('Error fetching progression data:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch progression data' },
      { status: 500 }
    )
  }
}
