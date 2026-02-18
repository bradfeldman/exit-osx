import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { applyRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'
import { generateTasksForCompany } from '@/lib/playbook/generate-tasks'
import { generateAITasksForCompany } from '@/lib/dossier/ai-tasks'
import { getIndustryMultiples, estimateEbitdaFromRevenue } from '@/lib/valuation/industry-multiples'
import { getMarketSalary } from '@/lib/valuation/recalculate-snapshot'
import { triggerDossierUpdate } from '@/lib/dossier/build-dossier'
import { clearOnboardingAlert } from '@/lib/alerts'
import { trackProductEvent } from '@/lib/analytics/track-product-event'
import {
  ALPHA,
  calculateCoreScore,
  calculateValuation,
  type CoreFactors,
} from '@/lib/valuation/calculate-valuation'
import {
  type ScoringResponse,
  deduplicateResponses,
  calculateCategoryScores,
  calculateWeightedBriScore,
  getCategoryScore as getCatScore,
} from '@/lib/valuation/bri-scoring'

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
    console.error('Error fetching global BRI weights:', error instanceof Error ? error.message : String(error))
  }

  // 3. Fall back to defaults
  const { DEFAULT_CATEGORY_WEIGHTS } = await import('@/lib/valuation/bri-scoring')
  return DEFAULT_CATEGORY_WEIGHTS
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SEC-034: Rate limit AI endpoints
  const rl = await applyRateLimit(request, RATE_LIMIT_CONFIGS.AI)
  if (!rl.success) return createRateLimitResponse(rl)

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
            workspace: {
              include: {
                members: {
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

    if (assessment.company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the database user ID for tracking who completed the assessment
    const dbUserId = assessment.company.workspace.members[0].user.id

    if (assessment.completedAt) {
      return NextResponse.json(
        { error: 'Assessment already completed' },
        { status: 400 }
      )
    }

    // Check if all questions are answered
    // PROD-014: Count BOTH seed questions (companyId=null) AND AI questions (companyId=companyId)
    const totalQuestions = await prisma.question.count({
      where: {
        isActive: true,
        OR: [
          { companyId: assessment.companyId },
          { companyId: null },
        ],
      },
    })
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

    // PROD-013 FIX: Gather the latest response per question across ALL assessments
    // for this company, not just the responses on this single assessment.
    // This prevents re-assessing one category from zeroing out others
    // when responses are spread across multiple assessment records.
    const allResponses = await prisma.assessmentResponse.findMany({
      where: {
        assessment: { companyId: assessment.companyId },
      },
      include: {
        question: true,
        selectedOption: true,
        effectiveOption: true, // For Answer Upgrade System
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Convert to ScoringResponse format for pure scoring functions
    const scoringResponses: ScoringResponse[] = allResponses.map(r => {
      const optionToUse = r.effectiveOption || r.selectedOption
      return {
        questionId: r.questionId,
        briCategory: r.question.briCategory,
        maxImpactPoints: Number(r.question.maxImpactPoints),
        scoreValue: optionToUse ? Number(optionToUse.scoreValue) : null,
        hasOption: !!optionToUse,
        updatedAt: r.updatedAt,
      }
    })

    // Deduplicate to latest response per question, then calculate category scores
    const dedupedResponses = deduplicateResponses(scoringResponses)
    const categoryScores = calculateCategoryScores(dedupedResponses)

    // Fetch BRI weights (company-specific > global > defaults)
    const categoryWeights = await getBriWeightsForCompany(assessment.company.briWeights)

    // Calculate weighted BRI score using shared utility
    const briScore = calculateWeightedBriScore(categoryScores, categoryWeights)

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
    const revenueSizeCategory = assessment.company.coreFactors?.revenueSizeCategory ?? null
    const marketSalaryBenchmark = getMarketSalary(revenueSizeCategory)
    const marketSalary = Math.min(ownerComp, marketSalaryBenchmark)
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

    // Helper to get category score (uses imported utility)
    const getCategoryScore = (cat: string) => getCatScore(categoryScores, cat)

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

    // Clear onboarding assessment notification (non-blocking)
    clearOnboardingAlert(dbUserId, 'ONBOARDING_ASSESSMENT').catch(() => {})

    // Track assessment_completed product event
    trackProductEvent({
      userId: dbUserId,
      eventName: 'assessment_completed',
      eventCategory: 'assessment',
      metadata: { assessmentId, companyId: assessment.companyId, briScore: Math.round(briScore * 100) },
      page: '/dashboard/diagnosis',
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
    console.error('Error completing assessment:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to complete assessment' },
      { status: 500 }
    )
  }
}
