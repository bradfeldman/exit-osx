/**
 * Project Assessment Complete API
 *
 * POST /api/project-assessments/[id]/complete - Complete an assessment
 *
 * This recalculates the BRI score incorporating all assessment responses
 * (both initial and project assessments) and creates a new valuation snapshot.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getIndustryMultiples, estimateEbitdaFromRevenue } from '@/lib/valuation/industry-multiples'
import { generateTasksFromProjectAssessment } from '@/lib/playbook/generate-tasks'
import { updateActionPlan } from '@/lib/tasks/action-plan'
import {
  ALPHA,
  calculateCoreScore,
  calculateValuation,
  type CoreFactors,
} from '@/lib/valuation/calculate-valuation'
import {
  DEFAULT_CATEGORY_WEIGHTS,
  type ScoringResponse,
  deduplicateResponses,
  calculateCategoryScores,
  calculateWeightedBriScore,
  getCategoryScore as getCatScore,
} from '@/lib/valuation/bri-scoring'

/**
 * Fetch BRI weights for a company
 */
async function getBriWeightsForCompany(companyBriWeights: unknown): Promise<Record<string, number>> {
  if (companyBriWeights && typeof companyBriWeights === 'object') {
    return companyBriWeights as Record<string, number>
  }

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

  return DEFAULT_CATEGORY_WEIGHTS
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: assessmentId } = await params

  try {
    // Get the project assessment
    const assessment = await prisma.projectAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          where: { skipped: false },
          include: {
            question: {
              include: { options: true }
            }
          }
        },
        responses: {
          include: {
            selectedOption: true,
            question: true,
          }
        },
        company: {
          include: {
            coreFactors: true,
            ebitdaAdjustments: true,
          }
        },
      }
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    if (assessment.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Assessment is already completed' },
        { status: 400 }
      )
    }

    // Verify user has access
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        workspaces: {
          include: {
            workspace: {
              include: { companies: { where: { id: assessment.companyId } } }
            }
          }
        }
      }
    })

    const hasAccess = dbUser?.workspaces.some(
      ws => ws.workspace.companies.length > 0
    )

    if (!hasAccess || !dbUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const company = assessment.company

    // Get the latest valuation snapshot for comparison
    const previousSnapshot = await prisma.valuationSnapshot.findFirst({
      where: { companyId: company.id },
      orderBy: { createdAt: 'desc' },
    })

    // ========================================
    // Step 1: Gather ALL responses for BRI calculation
    // ========================================

    // PROD-013 FIX: Gather the latest response per question across ALL initial
    // assessments for this company (not just the single latest completed one).
    // This prevents re-assessing one category from zeroing out others.
    const allInitialResponses = await prisma.assessmentResponse.findMany({
      where: {
        assessment: { companyId: company.id },
      },
      include: {
        question: true,
        selectedOption: true,
        effectiveOption: true, // For Answer Upgrade System
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Get all completed project assessment responses (including this one)
    const allProjectAssessments = await prisma.projectAssessment.findMany({
      where: {
        companyId: company.id,
        OR: [
          { status: 'COMPLETED' },
          { id: assessmentId } // Include current one being completed
        ]
      },
      include: {
        responses: {
          include: {
            question: true,
            selectedOption: true,
          }
        }
      }
    })

    // Build initial assessment scoring responses using shared types
    // Pre-sorted by updatedAt desc from the query
    const initialScoringResponses: ScoringResponse[] = allInitialResponses.map(r => {
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

    // Build project assessment scoring responses
    // Project assessment responses override initial assessment responses
    const projectScoringResponses: ScoringResponse[] = []
    for (const pa of allProjectAssessments) {
      for (const response of pa.responses) {
        // Use effectiveOptionId if available (task completion may have upgraded the answer)
        const effectiveOption = response.effectiveOptionId
          ? await prisma.projectQuestionOption.findUnique({ where: { id: response.effectiveOptionId } })
          : response.selectedOption

        projectScoringResponses.push({
          questionId: response.questionId,
          briCategory: response.question.briCategory,
          // Project questions don't have maxImpactPoints, use 1.0 as weight
          maxImpactPoints: 1.0,
          scoreValue: effectiveOption ? Number(effectiveOption.scoreValue) : null,
          hasOption: !!effectiveOption,
          // Use a future date to ensure project responses override initial ones
          updatedAt: response.updatedAt ?? new Date(),
        })
      }
    }

    // Combine: project responses first (they override), then initial responses
    // deduplicateResponses keeps the first occurrence per questionId
    const allScoringResponses = [...projectScoringResponses, ...initialScoringResponses]
    const dedupedResponses = deduplicateResponses(allScoringResponses)

    // ========================================
    // Step 2: Calculate category scores
    // ========================================

    const categoryScores = calculateCategoryScores(dedupedResponses)

    // ========================================
    // Step 3: Calculate BRI Score
    // ========================================

    const categoryWeights = await getBriWeightsForCompany(company.briWeights)

    const briScore = calculateWeightedBriScore(categoryScores, categoryWeights)

    // ========================================
    // Step 4: Calculate Core Score
    // ========================================

    // Use shared utility for Core Score (5 factors, NOT 6 - revenueSizeCategory excluded)
    const coreFactors = company.coreFactors
    const coreScore = calculateCoreScore(coreFactors as CoreFactors | null)

    // ========================================
    // Step 5: Calculate Valuation
    // ========================================

    const multiples = await getIndustryMultiples(
      company.icbSubSector,
      company.icbSector,
      company.icbSuperSector,
      company.icbIndustry
    )
    const industryMultipleLow = multiples.ebitdaMultipleLow
    const industryMultipleHigh = multiples.ebitdaMultipleHigh

    // Calculate adjusted EBITDA
    const baseEbitda = Number(company.annualEbitda)
    const ownerComp = Number(company.ownerCompensation)
    const addBacks = company.ebitdaAdjustments
      .filter(a => a.type === 'ADD_BACK')
      .reduce((sum, a) => sum + Number(a.amount), 0)
    const deductions = company.ebitdaAdjustments
      .filter(a => a.type === 'DEDUCTION')
      .reduce((sum, a) => sum + Number(a.amount), 0)

    const marketSalary = Math.min(ownerComp, 150000)
    const excessComp = Math.max(0, ownerComp - marketSalary)

    let adjustedEbitda: number
    if (baseEbitda > 0) {
      adjustedEbitda = baseEbitda + addBacks + excessComp - deductions
    } else {
      const revenue = Number(company.annualRevenue)
      const estimatedEbitda = estimateEbitdaFromRevenue(revenue, multiples)
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

    // ========================================
    // Step 6: Create new valuation snapshot
    // ========================================

    const snapshot = await prisma.valuationSnapshot.create({
      data: {
        companyId: company.id,
        createdByUserId: dbUser.id,
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
        snapshotReason: `10-Minute Assessment #${assessment.assessmentNumber} completed`,
      },
    })

    // ========================================
    // Step 7: Generate tasks for low-scoring responses
    // ========================================

    const keyFindingsSet = new Set<string>()

    for (const response of assessment.responses) {
      const score = Number(response.actualScore)

      if (score < 0.5) {
        const categoryName = formatCategoryName(response.question.briCategory)
        keyFindingsSet.add(`${categoryName}: ${response.question.subCategory} needs attention`)
      }
    }

    const keyFindings = Array.from(keyFindingsSet)

    // Generate tasks from assessment responses and add to queue
    const taskResult = await generateTasksFromProjectAssessment(company.id, assessmentId)
    const tasksCreated = taskResult.created

    // Update action plan to potentially add new tasks from queue
    const actionPlanResult = await updateActionPlan(company.id)

    // ========================================
    // Step 8: Update assessment status
    // ========================================

    const previousBriScore = previousSnapshot ? Number(previousSnapshot.briScore) : null
    const briImpact = previousBriScore !== null ? briScore - previousBriScore : null

    await prisma.projectAssessment.update({
      where: { id: assessmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        briScoreBefore: previousBriScore,
        briScoreAfter: briScore,
        scoreImpact: briImpact,
        actionPlanGenerated: tasksCreated > 0,
      }
    })

    // Count completed assessments
    const completedCount = await prisma.projectAssessment.count({
      where: {
        companyId: company.id,
        status: 'COMPLETED',
      }
    })

    // ========================================
    // Return results
    // ========================================

    return NextResponse.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        briScore: Math.round(briScore * 100),
        coreScore: Math.round(coreScore * 100),
        currentValue: Math.round(currentValue),
        potentialValue: Math.round(potentialValue),
        valueGap: Math.round(valueGap),
        finalMultiple: finalMultiple.toFixed(2),
      },
      briRefinement: {
        before: previousBriScore !== null ? Math.round(previousBriScore * 100) : null,
        after: Math.round(briScore * 100),
        impact: briImpact !== null ? Math.round(briImpact * 100) : null,
      },
      categoryScores: categoryScores.map(cs => ({
        category: cs.category,
        score: Math.round(cs.score * 100),
        label: formatCategoryName(cs.category),
      })),
      actionPlan: {
        tasksCreated,
        tasksAddedToActionPlan: actionPlanResult.added,
        totalInActionPlan: actionPlanResult.total,
        totalEstimatedHours: tasksCreated * 4,
        estimatedValueImpact: tasksCreated * 10000,
      },
      scoreImpactSummary: {
        overallChange: briImpact !== null && briImpact > 0 ? 'improved' : 'aligned',
        keyFindings: keyFindings.slice(0, 3),
      },
      milestone: {
        completedCount,
        message: completedCount === 1
          ? 'First 10-Minute Assessment completed!'
          : `${completedCount} assessments completed`,
        isNewLearning: keyFindings.length > 0,
      }
    })
  } catch (error) {
    console.error('Error completing project assessment:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to complete assessment' },
      { status: 500 }
    )
  }
}

function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    FINANCIAL: 'Financial',
    TRANSFERABILITY: 'Transferability',
    OPERATIONAL: 'Operational',
    MARKET: 'Market',
    LEGAL_TAX: 'Legal & Tax',
    PERSONAL: 'Personal Readiness',
  }
  return names[category] || category
}
