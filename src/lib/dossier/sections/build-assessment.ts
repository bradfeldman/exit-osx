import { prisma } from '@/lib/prisma'
import type { AssessmentSection } from '../types'

export async function buildAssessmentSection(companyId: string): Promise<AssessmentSection> {
  // Get the latest completed assessment
  const assessment = await prisma.assessment.findFirst({
    where: { companyId, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    include: {
      responses: {
        include: {
          question: true,
          selectedOption: true,
          effectiveOption: true,
        },
      },
    },
  })

  // Count total active questions (global + company-specific)
  const totalQuestionsAvailable = await prisma.question.count({
    where: {
      isActive: true,
      OR: [{ companyId: null }, { companyId }],
    },
  })

  if (!assessment) {
    return {
      hasCompletedAssessment: false,
      lastAssessmentDate: null,
      categoryScores: {},
      weakestCategories: [],
      weakestDrivers: [],
      unansweredCategories: [],
      totalQuestionsAnswered: 0,
      totalQuestionsAvailable,
    }
  }

  // Calculate category scores from responses
  const categoryTotals: Record<string, { earned: number; total: number }> = {}
  const allCategories = ['FINANCIAL', 'TRANSFERABILITY', 'OPERATIONAL', 'MARKET', 'LEGAL_TAX', 'PERSONAL']

  for (const response of assessment.responses) {
    if (response.confidenceLevel === 'NOT_APPLICABLE' || !response.selectedOption) continue

    const category = response.question.briCategory
    const maxPoints = Number(response.question.maxImpactPoints)
    const effectiveOption = response.effectiveOption || response.selectedOption
    const scoreValue = Number(effectiveOption.scoreValue)

    if (!categoryTotals[category]) {
      categoryTotals[category] = { earned: 0, total: 0 }
    }
    categoryTotals[category].earned += maxPoints * scoreValue
    categoryTotals[category].total += maxPoints
  }

  const categoryScores: Record<string, number> = {}
  for (const [cat, totals] of Object.entries(categoryTotals)) {
    categoryScores[cat] = totals.total > 0 ? totals.earned / totals.total : 0
  }

  // Find weakest categories (sorted ascending by score)
  const sortedCategories = Object.entries(categoryScores)
    .sort(([, a], [, b]) => a - b)
  const weakestCategories = sortedCategories.slice(0, 3).map(([cat]) => cat)

  // Find weakest individual drivers (lowest-scoring questions)
  const weakestDrivers = assessment.responses
    .filter(r => r.selectedOption && r.confidenceLevel !== 'NOT_APPLICABLE')
    .map(r => {
      const effectiveOption = r.effectiveOption || r.selectedOption!
      return {
        questionId: r.questionId,
        questionText: r.question.questionText,
        category: r.question.briCategory,
        scoreValue: Number(effectiveOption.scoreValue),
        riskDriverName: r.question.riskDriverName,
      }
    })
    .sort((a, b) => a.scoreValue - b.scoreValue)
    .slice(0, 10)

  // Find unanswered categories
  const answeredCategories = new Set(Object.keys(categoryTotals))
  const unansweredCategories = allCategories.filter(c => !answeredCategories.has(c))

  return {
    hasCompletedAssessment: true,
    lastAssessmentDate: assessment.completedAt!.toISOString(),
    categoryScores,
    weakestCategories,
    weakestDrivers,
    unansweredCategories,
    totalQuestionsAnswered: assessment.responses.filter(
      r => r.selectedOption && r.confidenceLevel !== 'NOT_APPLICABLE'
    ).length,
    totalQuestionsAvailable,
  }
}
