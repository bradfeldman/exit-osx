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

// Default category weights for BRI calculation
const DEFAULT_CATEGORY_WEIGHTS: Record<string, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

// ALPHA imported from @/lib/valuation/calculate-valuation

interface CategoryScore {
  category: string
  totalPoints: number
  earnedPoints: number
  score: number
}

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
    console.error('Error fetching global BRI weights:', error)
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
        organizations: {
          include: {
            organization: {
              include: { companies: { where: { id: assessment.companyId } } }
            }
          }
        }
      }
    })

    const hasAccess = dbUser?.organizations.some(
      org => org.organization.companies.length > 0
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

    // Get initial assessment responses
    const initialAssessment = await prisma.assessment.findFirst({
      where: {
        companyId: company.id,
        completedAt: { not: null }
      },
      include: {
        responses: {
          include: {
            question: true,
            selectedOption: true,
          }
        }
      },
      orderBy: { completedAt: 'desc' }
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

    // Build a map of question -> best response
    // Project assessment responses override initial assessment responses
    // More recent project assessments override older ones
    const responseMap = new Map<string, {
      category: string
      maxPoints: number
      scoreValue: number
      earnedPoints: number
    }>()

    // First, add initial assessment responses
    if (initialAssessment) {
      for (const response of initialAssessment.responses) {
        // Skip NOT_APPLICABLE responses (they don't have a selected option)
        if (!response.selectedOption) continue

        const maxPoints = Number(response.question.maxImpactPoints)
        const scoreValue = Number(response.selectedOption.scoreValue)
        responseMap.set(response.questionId, {
          category: response.question.briCategory,
          maxPoints,
          scoreValue,
          earnedPoints: maxPoints * scoreValue,
        })
      }
    }

    // Then, overlay project assessment responses (they use effectiveOptionId for task-upgraded answers)
    for (const pa of allProjectAssessments) {
      for (const response of pa.responses) {
        // Use effectiveOptionId if available (task completion may have upgraded the answer)
        const effectiveOption = response.effectiveOptionId
          ? await prisma.projectQuestionOption.findUnique({ where: { id: response.effectiveOptionId } })
          : response.selectedOption

        if (effectiveOption) {
          const scoreValue = Number(effectiveOption.scoreValue)
          // Project questions don't have maxImpactPoints, use 1.0 as weight
          const maxPoints = 1.0
          responseMap.set(response.questionId, {
            category: response.question.briCategory,
            maxPoints,
            scoreValue,
            earnedPoints: maxPoints * scoreValue,
          })
        }
      }
    }

    // ========================================
    // Step 2: Calculate category scores
    // ========================================

    const scoresByCategory: Record<string, { total: number; earned: number }> = {}

    for (const [, data] of responseMap) {
      if (!scoresByCategory[data.category]) {
        scoresByCategory[data.category] = { total: 0, earned: 0 }
      }
      scoresByCategory[data.category].total += data.maxPoints
      scoresByCategory[data.category].earned += data.earnedPoints
    }

    const categoryScores: CategoryScore[] = []
    for (const [category, scores] of Object.entries(scoresByCategory)) {
      categoryScores.push({
        category,
        totalPoints: scores.total,
        earnedPoints: scores.earned,
        score: scores.total > 0 ? scores.earned / scores.total : 0,
      })
    }

    // ========================================
    // Step 3: Calculate BRI Score
    // ========================================

    const categoryWeights = await getBriWeightsForCompany(company.briWeights)

    let briScore = 0
    for (const cs of categoryScores) {
      const weight = categoryWeights[cs.category] || 0
      briScore += cs.score * weight
    }

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

    // Helper to get category score
    const getCategoryScore = (cat: string) => {
      const cs = categoryScores.find(c => c.category === cat)
      return cs ? cs.score : 0
    }

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
    console.error('Error completing project assessment:', error)
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
