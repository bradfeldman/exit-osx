import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTasksForCompany } from '@/lib/playbook/generate-tasks'
import { generateAITasksForCompany } from '@/lib/dossier/ai-tasks'
import { getIndustryMultiples, estimateEbitdaFromRevenue } from '@/lib/valuation/industry-multiples'
import { triggerDossierUpdate } from '@/lib/dossier/build-dossier'
import {
  ALPHA,
  calculateCoreScore,
  calculateValuation,
  type CoreFactors,
} from '@/lib/valuation/calculate-valuation'

// Default category weights for BRI calculation (used if no custom weights set)
const DEFAULT_CATEGORY_WEIGHTS: Record<string, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

/**
 * Fetch BRI weights for a company
 * Priority: Company-specific > Global custom > Default
 */
async function getBriWeightsForCompany(companyBriWeights: unknown): Promise<Record<string, number>> {
  // 1. If company has custom weights, use them
  if (companyBriWeights && typeof companyBriWeights === 'object') {
    return companyBriWeights as Record<string, number>
  }

  // 2. Check for global custom weights
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'bri_category_weights' },
    })
    if (setting?.value) {
      return setting.value as Record<string, number>
    }
  } catch (error) {
    console.error('Error fetching global BRI weights:', error)
  }

  // 3. Fall back to defaults
  return DEFAULT_CATEGORY_WEIGHTS
}

// ALPHA imported from @/lib/valuation/calculate-valuation

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
    // Get assessment with all responses and user ID
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        company: {
          include: {
            organization: {
              include: {
                users: {
                  where: { user: { authId: user.id } },
                  include: {
                    user: { select: { id: true } }
                  }
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

    // Get the database user ID for tracking who completed the assessment
    const dbUserId = assessment.company.organization.users[0].user.id

    if (assessment.completedAt) {
      return NextResponse.json(
        { error: 'Assessment already completed' },
        { status: 400 }
      )
    }

    // Check if all questions are answered
    // Count questions — prefer company-specific AI questions, fall back to global
    const aiQuestionCount = await prisma.question.count({
      where: { companyId: assessment.companyId, isActive: true },
    })
    const totalQuestions = aiQuestionCount > 0
      ? aiQuestionCount
      : await prisma.question.count({ where: { isActive: true, companyId: null } })
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
    // Skip NOT_APPLICABLE responses - they don't count toward score
    const categoryScores: CategoryScore[] = []
    const scoresByCategory: Record<string, { total: number; earned: number }> = {}

    for (const response of assessment.responses) {
      // Skip NOT_APPLICABLE responses - question doesn't apply to this business
      if (response.confidenceLevel === 'NOT_APPLICABLE' || !response.selectedOption) {
        continue
      }

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

    // Fetch BRI weights (company-specific > global > defaults)
    const categoryWeights = await getBriWeightsForCompany(assessment.company.briWeights)

    // Calculate weighted BRI score
    let briScore = 0
    for (const cs of categoryScores) {
      const weight = categoryWeights[cs.category] || 0
      briScore += cs.score * weight
    }

    // Calculate Core Score from company factors
    const coreFactors = assessment.company.coreFactors
    // Use shared utility for Core Score (5 factors, NOT 6 - revenueSizeCategory excluded)
    const coreScore = calculateCoreScore(coreFactors as CoreFactors | null)

    // Get industry multiples (needed for both EBITDA estimation and valuation)
    const multiples = await getIndustryMultiples(
      assessment.company.icbSubSector,
      assessment.company.icbSector,
      assessment.company.icbSuperSector,
      assessment.company.icbIndustry
    )
    const industryMultipleLow = multiples.ebitdaMultipleLow
    const industryMultipleHigh = multiples.ebitdaMultipleHigh

    // Calculate adjusted EBITDA
    // If actual EBITDA exists, use it with adjustments
    // Otherwise, estimate EBITDA from revenue using industry multiples
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

    let adjustedEbitda: number
    if (baseEbitda > 0) {
      // Actual EBITDA provided - use adjusted calculation
      adjustedEbitda = baseEbitda + addBacks + excessComp - deductions
    } else {
      // No EBITDA provided - estimate from revenue using industry multiples
      const revenue = Number(assessment.company.annualRevenue)
      const estimatedEbitda = estimateEbitdaFromRevenue(revenue, multiples)
      // Still apply add-backs and owner comp adjustments to estimated base
      adjustedEbitda = estimatedEbitda + addBacks + excessComp - deductions
    }

    // Use shared utility for consistent valuation calculation
    const valuation = calculateValuation({
      adjustedEbitda,
      industryMultipleLow,
      industryMultipleHigh,
      coreScore,
      briScore,
    })
    const { baseMultiple, discountFraction, finalMultiple, currentValue, potentialValue, valueGap } = valuation

    // Get category-specific scores
    const getCategoryScore = (cat: string) => {
      const cs = categoryScores.find(c => c.category === cat)
      return cs ? cs.score : 0
    }

    // Create valuation snapshot
    const snapshot = await prisma.valuationSnapshot.create({
      data: {
        companyId: assessment.companyId,
        createdByUserId: dbUserId,
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
    // Filter out NOT_APPLICABLE responses (they don't have options to upgrade)
    const applicableResponses = assessment.responses.filter(
      r => r.confidenceLevel !== 'NOT_APPLICABLE' && r.selectedOption !== null && r.selectedOptionId !== null
    ) as Array<typeof assessment.responses[number] & { selectedOptionId: string; selectedOption: NonNullable<typeof assessment.responses[number]['selectedOption']> }>

    // Check if this company has AI-generated questions (dossier path)
    const hasAIQuestions = await prisma.question.count({
      where: { companyId: assessment.companyId, isActive: true },
    })

    let taskResult: { created: number; skipped: number }
    if (hasAIQuestions > 0) {
      // AI path: generate contextual tasks using dossier
      try {
        taskResult = await generateAITasksForCompany(
          assessment.companyId,
          applicableResponses,
          snapshot
        )
      } catch (aiError) {
        console.error('[Assessment] AI task generation failed, falling back to templates:', aiError)
        taskResult = await generateTasksForCompany(
          assessment.companyId,
          applicableResponses,
          snapshot
        )
      }
    } else {
      // Legacy path: use template-based task generation
      taskResult = await generateTasksForCompany(
        assessment.companyId,
        applicableResponses,
        snapshot
      )
    }

    // Mark assessment as completed
    const completedAssessment = await prisma.assessment.update({
      where: { id: assessmentId },
      data: { completedAt: new Date() },
    })

    // Update company dossier (non-blocking)
    triggerDossierUpdate(assessment.companyId, 'assessment_completed', assessmentId)

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
