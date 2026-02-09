import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTasksForCompany } from '@/lib/playbook/generate-tasks'
import { generateAITasksForCompany } from '@/lib/dossier/ai-tasks'
import { getIndustryMultiples, estimateEbitdaFromRevenue } from '@/lib/valuation/industry-multiples'
import { triggerDossierUpdate } from '@/lib/dossier/build-dossier'

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

// Alpha constant for non-linear discount calculation
// Controls buyer skepticism curve - higher = more skeptical
// Recommended range: 1.3 - 1.6, default 1.4
const ALPHA = 1.4

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

    // Step 1: Core Score positions within industry range
    // BaseMultiple = L + (CS / 100) × (H − L)
    // coreScore is 0-1, so we use it directly
    const baseMultiple = industryMultipleLow + coreScore * (industryMultipleHigh - industryMultipleLow)

    // Step 2: Non-linear discount based on BRI
    // DiscountFraction = (1 − BRI)^α where α = 1.4
    // briScore is 0-1
    const discountFraction = Math.pow(1 - briScore, ALPHA)

    // Step 3: Final multiple with floor guarantee
    // FinalMultiple = L + (BaseMultiple − L) × (1 − DiscountFraction)
    // This guarantees FinalMultiple ≥ L (industry floor)
    const finalMultiple = industryMultipleLow + (baseMultiple - industryMultipleLow) * (1 - discountFraction)

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
