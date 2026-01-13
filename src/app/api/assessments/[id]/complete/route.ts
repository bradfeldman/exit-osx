import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTasksForCompany } from '@/lib/playbook/generate-tasks'

// Category weights for BRI calculation
const CATEGORY_WEIGHTS: Record<string, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

// Alpha constant for discount calculation (default 0.40)
const ALPHA = 0.40

interface CategoryScore {
  category: string
  totalPoints: number
  earnedPoints: number
  score: number // 0 to 1
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: assessmentId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get assessment with all responses
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        company: {
          include: {
            organization: {
              include: {
                users: {
                  where: { user: { authId: user.id } },
                },
              },
            },
            coreFactors: true,
            ebitdaAdjustments: true,
          },
        },
        responses: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    if (assessment.company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (assessment.completedAt) {
      return NextResponse.json(
        { error: 'Assessment already completed' },
        { status: 400 }
      )
    }

    // Check if all questions are answered
    const totalQuestions = await prisma.question.count({ where: { isActive: true } })
    if (assessment.responses.length < totalQuestions) {
      return NextResponse.json(
        {
          error: 'Assessment incomplete',
          answered: assessment.responses.length,
          total: totalQuestions,
        },
        { status: 400 }
      )
    }

    // Calculate category scores
    const categoryScores: CategoryScore[] = []
    const scoresByCategory: Record<string, { total: number; earned: number }> = {}

    for (const response of assessment.responses) {
      const category = response.question.briCategory
      const maxPoints = Number(response.question.maxImpactPoints)
      const scoreValue = Number(response.selectedOption.scoreValue)
      const earnedPoints = maxPoints * scoreValue

      if (!scoresByCategory[category]) {
        scoresByCategory[category] = { total: 0, earned: 0 }
      }
      scoresByCategory[category].total += maxPoints
      scoresByCategory[category].earned += earnedPoints
    }

    for (const [category, scores] of Object.entries(scoresByCategory)) {
      categoryScores.push({
        category,
        totalPoints: scores.total,
        earnedPoints: scores.earned,
        score: scores.total > 0 ? scores.earned / scores.total : 0,
      })
    }

    // Calculate weighted BRI score
    let briScore = 0
    for (const cs of categoryScores) {
      const weight = CATEGORY_WEIGHTS[cs.category] || 0
      briScore += cs.score * weight
    }

    // Calculate Core Score from company factors
    const coreFactors = assessment.company.coreFactors
    let coreScore = 0.5 // Default if no core factors

    if (coreFactors) {
      // Simple scoring based on core factors
      const factorScores: Record<string, Record<string, number>> = {
        revenueSizeCategory: {
          UNDER_500K: 0.2,
          FROM_500K_TO_1M: 0.4,
          FROM_1M_TO_3M: 0.6,
          FROM_3M_TO_10M: 0.8,
          FROM_10M_TO_25M: 0.9,
          OVER_25M: 1.0,
        },
        revenueModel: {
          PROJECT_BASED: 0.25,
          TRANSACTIONAL: 0.5,
          RECURRING_CONTRACTS: 0.75,
          SUBSCRIPTION_SAAS: 1.0,
        },
        grossMarginProxy: {
          LOW: 0.25,
          MODERATE: 0.5,
          GOOD: 0.75,
          EXCELLENT: 1.0,
        },
        laborIntensity: {
          VERY_HIGH: 0.25,
          HIGH: 0.5,
          MODERATE: 0.75,
          LOW: 1.0,
        },
        assetIntensity: {
          ASSET_HEAVY: 0.33,
          MODERATE: 0.67,
          ASSET_LIGHT: 1.0,
        },
        ownerInvolvement: {
          CRITICAL: 0.0,
          HIGH: 0.25,
          MODERATE: 0.5,
          LOW: 0.75,
          MINIMAL: 1.0,
        },
      }

      const scores = [
        factorScores.revenueSizeCategory[coreFactors.revenueSizeCategory] || 0.5,
        factorScores.revenueModel[coreFactors.revenueModel] || 0.5,
        factorScores.grossMarginProxy[coreFactors.grossMarginProxy] || 0.5,
        factorScores.laborIntensity[coreFactors.laborIntensity] || 0.5,
        factorScores.assetIntensity[coreFactors.assetIntensity] || 0.5,
        factorScores.ownerInvolvement[coreFactors.ownerInvolvement] || 0.5,
      ]

      coreScore = scores.reduce((a, b) => a + b, 0) / scores.length
    }

    // Calculate adjusted EBITDA
    const baseEbitda = Number(assessment.company.annualEbitda)
    const ownerComp = Number(assessment.company.ownerCompensation)
    const addBacks = assessment.company.ebitdaAdjustments
      .filter(a => a.type === 'ADD_BACK')
      .reduce((sum, a) => sum + Number(a.amount), 0)
    const deductions = assessment.company.ebitdaAdjustments
      .filter(a => a.type === 'DEDUCTION')
      .reduce((sum, a) => sum + Number(a.amount), 0)

    // Add owner compensation as an add-back (normalized)
    const marketSalary = Math.min(ownerComp, 150000) // Cap market salary assumption
    const excessComp = Math.max(0, ownerComp - marketSalary)

    const adjustedEbitda = baseEbitda + addBacks + excessComp - deductions

    // Get industry multiples (using defaults if not found)
    const industryMultipleLow = 3.0
    const industryMultipleHigh = 6.0
    const baseMultiple = (industryMultipleLow + industryMultipleHigh) / 2

    // Calculate discount fraction: α × (1 - BRI)
    const discountFraction = ALPHA * (1 - briScore)

    // Calculate final multiple: Base × (1 - discount)
    const finalMultiple = baseMultiple * (1 - discountFraction)

    // Calculate valuations
    const currentValue = adjustedEbitda * finalMultiple
    const potentialValue = adjustedEbitda * baseMultiple
    const valueGap = potentialValue - currentValue

    // Get category-specific scores
    const getCategoryScore = (cat: string) => {
      const cs = categoryScores.find(c => c.category === cat)
      return cs ? cs.score : 0
    }

    // Create valuation snapshot
    const snapshot = await prisma.valuationSnapshot.create({
      data: {
        companyId: assessment.companyId,
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
        coreScore,
        briScore,
        briFinancial: getCategoryScore('FINANCIAL'),
        briTransferability: getCategoryScore('TRANSFERABILITY'),
        briOperational: getCategoryScore('OPERATIONAL'),
        briMarket: getCategoryScore('MARKET'),
        briLegalTax: getCategoryScore('LEGAL_TAX'),
        briPersonal: getCategoryScore('PERSONAL'),
        baseMultiple,
        discountFraction,
        finalMultiple,
        currentValue,
        potentialValue,
        valueGap,
        alphaConstant: ALPHA,
        snapshotReason: 'Assessment completed',
      },
    })

    // Generate playbook tasks based on assessment responses
    const taskResult = await generateTasksForCompany(
      assessment.companyId,
      assessment.responses,
      snapshot
    )

    // Mark assessment as completed
    const completedAssessment = await prisma.assessment.update({
      where: { id: assessmentId },
      data: { completedAt: new Date() },
    })

    return NextResponse.json({
      assessment: completedAssessment,
      snapshot,
      categoryScores,
      tasksGenerated: taskResult.created,
      summary: {
        briScore: Math.round(briScore * 100),
        coreScore: Math.round(coreScore * 100),
        currentValue: Math.round(currentValue),
        potentialValue: Math.round(potentialValue),
        valueGap: Math.round(valueGap),
        finalMultiple: finalMultiple.toFixed(2),
      },
    })
  } catch (error) {
    console.error('Error completing assessment:', error)
    return NextResponse.json(
      { error: 'Failed to complete assessment' },
      { status: 500 }
    )
  }
}
