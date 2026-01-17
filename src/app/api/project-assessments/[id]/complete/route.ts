/**
 * Complete Project Assessment API
 *
 * POST /api/project-assessments/[id]/complete
 * - Validates all questions are answered
 * - Refines BRI score with new responses
 * - Generates action plan (tasks) based on responses
 * - Returns score impact summary and feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateActionPlanFromResponses } from '@/lib/project-assessments/action-plan-generator'

interface RouteParams {
  params: Promise<{ id: string }>
}

// BRI category weights (default)
const DEFAULT_BRI_WEIGHTS: Record<string, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

/**
 * POST /api/project-assessments/[id]/complete
 * Complete the assessment, refine BRI, and generate action plan
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: assessmentId } = await params

  // Get assessment with all related data
  const assessment = await prisma.projectAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      company: {
        include: {
          organization: {
            include: {
              users: { where: { user: { authId: user.id } } }
            }
          }
        }
      },
      questions: true,
      responses: {
        include: {
          question: true,
          selectedOption: true,
        }
      }
    }
  })

  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  if (assessment.company.organization.users.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (assessment.status === 'COMPLETED') {
    return NextResponse.json(
      { error: 'Assessment is already completed' },
      { status: 400 }
    )
  }

  // Validate all questions are answered or skipped
  const skippedCount = assessment.questions.filter(q => q.skipped).length
  const answeredOrSkippedCount = assessment.responses.length + skippedCount
  if (answeredOrSkippedCount < assessment.questions.length) {
    const unansweredCount = assessment.questions.length - answeredOrSkippedCount
    return NextResponse.json({
      error: `${unansweredCount} question(s) not yet answered`,
      answered: assessment.responses.length,
      skipped: skippedCount,
      total: assessment.questions.length,
    }, { status: 400 })
  }

  // Get the BRI score before this assessment
  const briScoreBefore = assessment.briScoreBefore
    ? Number(assessment.briScoreBefore)
    : null

  // Calculate refined BRI score
  const refinedBri = await calculateRefinedBri(assessment.companyId, assessment.responses)

  // Update the assessment as completed
  const completedAssessment = await prisma.projectAssessment.update({
    where: { id: assessmentId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      briScoreAfter: refinedBri.overallBri,
      scoreImpact: briScoreBefore !== null
        ? refinedBri.overallBri - briScoreBefore
        : null,
      actionPlanGenerated: true,
    }
  })

  // Generate action plan (tasks) based on responses
  const actionPlan = await generateActionPlanFromResponses(
    assessment.companyId,
    assessment.responses
  )

  // Create new valuation snapshot with refined BRI
  const latestSnapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId: assessment.companyId },
    orderBy: { createdAt: 'desc' },
  })

  if (latestSnapshot) {
    // Calculate new valuation with refined BRI
    const newSnapshot = await createRefinedSnapshot(
      assessment.companyId,
      latestSnapshot,
      refinedBri,
      `Project Assessment #${assessment.assessmentNumber} completed`
    )
  }

  // Build score impact summary
  const scoreImpactSummary = buildScoreImpactSummary(assessment.responses, briScoreBefore, refinedBri)

  // Count completed assessments for milestone
  const completedCount = await prisma.projectAssessment.count({
    where: {
      companyId: assessment.companyId,
      status: 'COMPLETED',
    }
  })

  // Determine if there were new learnings (meaningful score changes)
  const hasScoreImpact = briScoreBefore !== null &&
    Math.abs(refinedBri.overallBri - briScoreBefore) >= 0.005
  const hasNewLearnings = scoreImpactSummary.keyFindings.length > 0 &&
    (hasScoreImpact || scoreImpactSummary.categoryChanges.length > 0)

  // Build milestone message
  const milestoneMessage = buildMilestoneMessage(completedCount)

  return NextResponse.json({
    assessment: completedAssessment,
    briRefinement: {
      before: briScoreBefore,
      after: refinedBri.overallBri,
      impact: briScoreBefore !== null
        ? refinedBri.overallBri - briScoreBefore
        : null,
      categoryScores: refinedBri.categoryScores,
    },
    actionPlan: {
      tasksCreated: actionPlan.tasksCreated,
      totalEstimatedHours: actionPlan.totalEstimatedHours,
      estimatedValueImpact: actionPlan.estimatedValueImpact,
      topTasks: actionPlan.topTasks,
    },
    scoreImpactSummary,
    milestone: {
      completedCount,
      message: milestoneMessage,
      isNewLearning: hasNewLearnings,
    },
    message: 'Assessment completed successfully',
  })
}

/**
 * Calculate refined BRI incorporating Project Assessment responses
 */
async function calculateRefinedBri(
  companyId: string,
  projectResponses: Array<{
    question: { briCategory: string }
    selectedOption: { scoreValue: unknown }
  }>
): Promise<{
  overallBri: number
  categoryScores: Record<string, number>
}> {
  // Get existing Initial BRI Assessment responses
  const initialAssessment = await prisma.assessment.findFirst({
    where: {
      companyId,
      assessmentType: 'INITIAL',
      completedAt: { not: null }
    },
    include: {
      responses: {
        include: {
          question: { select: { briCategory: true, maxImpactPoints: true } },
          effectiveOption: { select: { scoreValue: true } },
          selectedOption: { select: { scoreValue: true } },
        }
      }
    },
    orderBy: { completedAt: 'desc' }
  })

  // Initialize category scores from initial assessment
  const categoryScores: Record<string, { earned: number; max: number }> = {
    FINANCIAL: { earned: 0, max: 0 },
    TRANSFERABILITY: { earned: 0, max: 0 },
    OPERATIONAL: { earned: 0, max: 0 },
    MARKET: { earned: 0, max: 0 },
    LEGAL_TAX: { earned: 0, max: 0 },
    PERSONAL: { earned: 0, max: 0 },
  }

  // Add Initial BRI scores
  if (initialAssessment) {
    for (const response of initialAssessment.responses) {
      const category = response.question.briCategory
      const maxPoints = Number(response.question.maxImpactPoints)
      const score = response.effectiveOption
        ? Number(response.effectiveOption.scoreValue)
        : Number(response.selectedOption.scoreValue)

      categoryScores[category].earned += score * maxPoints
      categoryScores[category].max += maxPoints
    }
  }

  // Add Project Assessment responses (with a weight factor)
  // Project responses contribute additional detail to the category scores
  const projectWeight = 0.5 // Project responses have 50% weight relative to initial
  const projectMaxPerQuestion = 10 // Assume max 10 points per project question

  for (const response of projectResponses) {
    const category = response.question.briCategory
    const score = Number(response.selectedOption.scoreValue)

    categoryScores[category].earned += score * projectMaxPerQuestion * projectWeight
    categoryScores[category].max += projectMaxPerQuestion * projectWeight
  }

  // Calculate category percentages
  const categoryPercentages: Record<string, number> = {}
  for (const [category, scores] of Object.entries(categoryScores)) {
    categoryPercentages[category] = scores.max > 0
      ? scores.earned / scores.max
      : 0.5 // Default if no data
  }

  // Get company-specific weights or use defaults
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { briWeights: true }
  })

  const weights = (company?.briWeights as Record<string, number>) || DEFAULT_BRI_WEIGHTS

  // Calculate weighted BRI
  let overallBri = 0
  for (const [category, score] of Object.entries(categoryPercentages)) {
    const weight = weights[category] || 0
    overallBri += score * weight
  }

  return {
    overallBri,
    categoryScores: categoryPercentages,
  }
}

/**
 * Create a new valuation snapshot with refined BRI
 */
async function createRefinedSnapshot(
  companyId: string,
  previousSnapshot: {
    adjustedEbitda: unknown
    industryMultipleLow: unknown
    industryMultipleHigh: unknown
    coreScore: unknown
    alphaConstant: unknown
  },
  refinedBri: { overallBri: number; categoryScores: Record<string, number> },
  reason: string
) {
  const adjustedEbitda = Number(previousSnapshot.adjustedEbitda)
  const industryMultipleLow = Number(previousSnapshot.industryMultipleLow)
  const industryMultipleHigh = Number(previousSnapshot.industryMultipleHigh)
  const coreScore = Number(previousSnapshot.coreScore)
  const alpha = Number(previousSnapshot.alphaConstant) || 1.4

  // Calculate new valuation with refined BRI
  const range = industryMultipleHigh - industryMultipleLow
  const baseMultiple = industryMultipleLow + (coreScore * range)
  const discountFraction = Math.pow(1 - refinedBri.overallBri, alpha)
  const finalMultiple = Math.max(
    industryMultipleLow,
    industryMultipleLow + (baseMultiple - industryMultipleLow) * (1 - discountFraction)
  )

  const currentValue = adjustedEbitda * finalMultiple
  const potentialValue = adjustedEbitda * baseMultiple
  const valueGap = potentialValue - currentValue

  const snapshot = await prisma.valuationSnapshot.create({
    data: {
      companyId,
      adjustedEbitda,
      industryMultipleLow,
      industryMultipleHigh,
      coreScore,
      briScore: refinedBri.overallBri,
      briFinancial: refinedBri.categoryScores.FINANCIAL || 0,
      briTransferability: refinedBri.categoryScores.TRANSFERABILITY || 0,
      briOperational: refinedBri.categoryScores.OPERATIONAL || 0,
      briMarket: refinedBri.categoryScores.MARKET || 0,
      briLegalTax: refinedBri.categoryScores.LEGAL_TAX || 0,
      briPersonal: refinedBri.categoryScores.PERSONAL || 0,
      baseMultiple,
      discountFraction,
      finalMultiple,
      currentValue,
      potentialValue,
      valueGap,
      alphaConstant: alpha,
      snapshotReason: reason,
    }
  })

  return snapshot
}

/**
 * Build a summary of score impacts for user feedback
 */
function buildScoreImpactSummary(
  responses: Array<{
    question: { briCategory: string; questionText?: string }
    selectedOption: { scoreValue: unknown }
    scoreImpact?: unknown
  }>,
  briScoreBefore: number | null,
  refinedBri: { overallBri: number; categoryScores: Record<string, number> }
): {
  overallChange: string
  categoryChanges: Array<{ category: string; message: string }>
  keyFindings: string[]
} {
  const keyFindings: string[] = []
  const categoryChanges: Array<{ category: string; message: string }> = []

  // Group responses by category
  const categoryResponses: Record<string, Array<{ score: number; impact: number | null; questionText: string }>> = {}
  for (const response of responses) {
    const category = response.question.briCategory
    if (!categoryResponses[category]) {
      categoryResponses[category] = []
    }
    categoryResponses[category].push({
      score: Number(response.selectedOption.scoreValue),
      impact: response.scoreImpact ? Number(response.scoreImpact) : null,
      questionText: response.question.questionText || '',
    })
  }

  // Analyze each category and collect insights
  const categoryStats: Array<{ category: string; avgScore: number; avgImpact: number; count: number }> = []

  for (const [category, catResponses] of Object.entries(categoryResponses)) {
    const avgScore = catResponses.reduce((sum, r) => sum + r.score, 0) / catResponses.length
    const impactResponses = catResponses.filter(r => r.impact !== null)
    const avgImpact = impactResponses.length > 0
      ? impactResponses.reduce((sum, r) => sum + r.impact!, 0) / impactResponses.length
      : 0

    categoryStats.push({ category, avgScore, avgImpact, count: catResponses.length })

    if (avgImpact > 0.05) {
      categoryChanges.push({
        category,
        message: `${formatCategoryName(category)}: Better than expected (+${(avgImpact * 100).toFixed(0)}%)`
      })
    } else if (avgImpact < -0.05) {
      categoryChanges.push({
        category,
        message: `${formatCategoryName(category)}: Risk area identified (${(avgImpact * 100).toFixed(0)}%)`
      })
    }
  }

  // Generate meaningful key findings as full sentences
  // Sort by score to find strongest and weakest
  const sortedByScore = [...categoryStats].sort((a, b) => b.avgScore - a.avgScore)

  // Strongest area (if score is good)
  if (sortedByScore.length > 0 && sortedByScore[0].avgScore >= 0.7) {
    const cat = formatCategoryName(sortedByScore[0].category)
    keyFindings.push(`Your ${cat.toLowerCase()} practices are strong, scoring ${Math.round(sortedByScore[0].avgScore * 100)}% in this assessment.`)
  }

  // Areas needing attention (low scores)
  const lowScoreCategories = categoryStats.filter(c => c.avgScore < 0.5)
  if (lowScoreCategories.length > 0) {
    const lowest = lowScoreCategories.sort((a, b) => a.avgScore - b.avgScore)[0]
    const cat = formatCategoryName(lowest.category)
    keyFindings.push(`Your responses indicate ${cat.toLowerCase()} may need attention. We've identified opportunities for improvement.`)
  }

  // Better than expected areas
  const betterThanExpected = categoryStats.filter(c => c.avgImpact > 0.05)
  if (betterThanExpected.length > 0) {
    const best = betterThanExpected.sort((a, b) => b.avgImpact - a.avgImpact)[0]
    const cat = formatCategoryName(best.category)
    keyFindings.push(`Your ${cat.toLowerCase()} answers show stronger performance than our initial assessment indicated.`)
  }

  // Worse than expected areas (risks identified)
  const risksIdentified = categoryStats.filter(c => c.avgImpact < -0.05)
  if (risksIdentified.length > 0) {
    const worst = risksIdentified.sort((a, b) => a.avgImpact - b.avgImpact)[0]
    const cat = formatCategoryName(worst.category)
    keyFindings.push(`We uncovered some ${cat.toLowerCase()} areas that weren't fully captured in earlier assessments. New improvement tasks have been added.`)
  }

  // Fallback message if no specific findings
  if (keyFindings.length === 0) {
    keyFindings.push(`Your responses have helped us better understand your business across ${Object.keys(categoryResponses).length} key areas.`)
  }

  // Overall change message
  let overallChange: string
  if (briScoreBefore === null) {
    overallChange = `Your refined BRI score is ${(refinedBri.overallBri * 100).toFixed(0)}%`
  } else {
    const change = refinedBri.overallBri - briScoreBefore
    const beforePct = (briScoreBefore * 100).toFixed(0)
    const afterPct = (refinedBri.overallBri * 100).toFixed(0)
    // Use >= 0.005 threshold (rounds to 1% or more change)
    if (change >= 0.005) {
      overallChange = `Your BRI score improved from ${beforePct}% to ${afterPct}% (+${(change * 100).toFixed(0)}%)`
    } else if (change <= -0.005) {
      overallChange = `Your BRI score adjusted from ${beforePct}% to ${afterPct}% (${(change * 100).toFixed(0)}%). The detailed assessment revealed areas that need attention.`
    } else {
      overallChange = `Your BRI score confirmed at ${afterPct}%`
    }
  }

  return {
    overallChange,
    categoryChanges,
    keyFindings,
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

/**
 * Build a celebratory milestone message based on completion count
 */
function buildMilestoneMessage(completedCount: number): string {
  // Special milestone messages
  if (completedCount === 1) {
    return "You've completed your first assessment!"
  }
  if (completedCount === 5) {
    return "5 assessments complete - you're building momentum!"
  }
  if (completedCount === 10) {
    return "10 assessments done - double digits!"
  }
  if (completedCount === 25) {
    return "25 assessments - a quarter century of insights!"
  }
  if (completedCount === 50) {
    return "50 assessments - halfway to a hundred!"
  }
  if (completedCount === 100) {
    return "100 assessments - centurion status achieved!"
  }
  if (completedCount % 10 === 0) {
    return `${completedCount} assessments complete - keep the momentum going!`
  }

  // Default message with count
  return `Assessment #${completedCount} complete`
}
