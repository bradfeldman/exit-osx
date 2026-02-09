import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getRiskDriverName } from '@/lib/constants/risk-driver-names'
import {
  BRI_CATEGORY_LABELS,
  type BRICategory,
} from '@/lib/constants/bri-categories'

// BRI weights matching the assessment system
const BRI_WEIGHTS: Record<string, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

// Buyer explanations for bridge categories (same as dashboard route)
const BUYER_EXPLANATIONS: Record<string, string> = {
  FINANCIAL: 'Buyers pay less when financial records lack depth or consistency.',
  TRANSFERABILITY: "Buyers discount businesses that can't run without the owner.",
  OPERATIONAL: 'Buyers see risk in businesses without documented, repeatable processes.',
  MARKET: 'Buyers pay premiums for defensible market positions and diverse revenue.',
  LEGAL_TAX: 'Buyers walk away from unresolved legal exposure and compliance gaps.',
}

function calculateConfidence(
  questionsAnswered: number,
  totalQuestions: number,
  daysSinceLastUpdate: number | null,
): { dots: number; label: string } {
  const coverage = totalQuestions > 0 ? questionsAnswered / totalQuestions : 0

  let baseDots: number
  if (coverage === 0) baseDots = 0
  else if (coverage < 0.4) baseDots = 1
  else if (coverage < 0.7) baseDots = 2
  else if (coverage < 1.0) baseDots = 3
  else baseDots = 4

  const decayPenalty = daysSinceLastUpdate !== null && daysSinceLastUpdate > 90 ? 1 : 0
  const finalDots = Math.max(0, baseDots - decayPenalty)

  const labels = ['Not assessed', 'Limited', 'Partial', 'Good', 'Strong']
  return { dots: finalDots, label: labels[finalDots] }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    // Fetch all active questions with options (original query)
    const allQuestions = await prisma.question.findMany({
      where: { isActive: true },
      include: {
        options: { orderBy: { displayOrder: 'asc' } },
      },
      orderBy: [{ briCategory: 'asc' }, { displayOrder: 'asc' }],
    })

    // Scope to this company: seed questions (no companyId) + AI questions for THIS company only
    const companyAiCategories = new Set(
      allQuestions.filter(q => q.companyId === companyId).map(q => q.briCategory)
    )
    // If AI questions exist for a category, prefer them over seed questions for that category
    const questions = companyAiCategories.size > 0
      ? allQuestions.filter(q =>
          q.companyId === companyId ||
          (q.companyId === null && !companyAiCategories.has(q.briCategory))
        )
      : allQuestions.filter(q => q.companyId === null)

    // Fetch the latest completed assessment for this company
    const latestAssessment = await prisma.assessment.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
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

    // Fetch latest valuation snapshot for dollar impacts
    const latestSnapshot = await prisma.valuationSnapshot.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch linked tasks for risk drivers
    const tasks = await prisma.task.findMany({
      where: { companyId },
      select: {
        id: true,
        title: true,
        status: true,
        linkedQuestionId: true,
      },
    })
    const tasksByQuestion = new Map(
      tasks.filter(t => t.linkedQuestionId).map(t => [t.linkedQuestionId!, t])
    )

    // Build response map
    const responseMap = new Map(
      (latestAssessment?.responses ?? []).map(r => [r.questionId, r])
    )

    // Group questions by category
    const questionsByCategory = new Map<string, typeof questions>()
    for (const q of questions) {
      const existing = questionsByCategory.get(q.briCategory) ?? []
      existing.push(q)
      questionsByCategory.set(q.briCategory, existing)
    }

    // Calculate bridge dollar impacts per category
    const valueGap = latestSnapshot ? Number(latestSnapshot.valueGap) : 0
    const categoryDollarImpacts = new Map<string, number>()

    if (latestSnapshot && valueGap > 0) {
      const snapshotCategories = [
        { key: 'FINANCIAL', score: Number(latestSnapshot.briFinancial) },
        { key: 'TRANSFERABILITY', score: Number(latestSnapshot.briTransferability) },
        { key: 'OPERATIONAL', score: Number(latestSnapshot.briOperational) },
        { key: 'MARKET', score: Number(latestSnapshot.briMarket) },
        { key: 'LEGAL_TAX', score: Number(latestSnapshot.briLegalTax) },
      ]

      const rawGaps = snapshotCategories.map(c => ({
        key: c.key,
        rawGap: (1 - c.score) * (BRI_WEIGHTS[c.key] || 0),
      }))
      const totalRawGap = rawGaps.reduce((sum, c) => sum + c.rawGap, 0)

      for (const c of rawGaps) {
        categoryDollarImpacts.set(
          c.key,
          totalRawGap > 0 ? Math.round((c.rawGap / totalRawGap) * valueGap) : 0
        )
      }
    }

    // Build category data
    const categoryKeys = ['FINANCIAL', 'TRANSFERABILITY', 'OPERATIONAL', 'MARKET', 'LEGAL_TAX', 'PERSONAL']

    type CategoryData = {
      category: string
      label: string
      score: number
      scoreDecimal: number
      dollarImpact: number | null
      weight: number
      confidence: {
        dots: number
        label: string
        questionsAnswered: number
        questionsTotal: number
        lastUpdated: string | null
        daysSinceUpdate: number | null
        isStale: boolean
        hasUnansweredAiQuestions: boolean
      }
      isLowestConfidence: boolean
    }

    const categories: CategoryData[] = []
    let lowestConfidenceDots = 5
    let lowestConfidenceCategory = ''

    for (const catKey of categoryKeys) {
      const catQuestions = questionsByCategory.get(catKey) ?? []
      const totalQuestions = catQuestions.length

      // Count answered questions and find latest response date
      let questionsAnswered = 0
      let latestResponseDate: Date | null = null
      let hasUnansweredAiQuestions = false

      for (const q of catQuestions) {
        const response = responseMap.get(q.id)
        if (response && response.selectedOptionId) {
          questionsAnswered++
          if (!latestResponseDate || response.updatedAt > latestResponseDate) {
            latestResponseDate = response.updatedAt
          }
        } else if (q.companyId) {
          hasUnansweredAiQuestions = true
        }
      }

      const daysSinceUpdate = latestResponseDate
        ? Math.floor((Date.now() - latestResponseDate.getTime()) / (1000 * 60 * 60 * 24))
        : null

      const confidence = calculateConfidence(questionsAnswered, totalQuestions, daysSinceUpdate)

      // Get category score from snapshot
      let scoreDecimal = 0
      if (latestSnapshot) {
        const scoreFields: Record<string, string> = {
          FINANCIAL: 'briFinancial',
          TRANSFERABILITY: 'briTransferability',
          OPERATIONAL: 'briOperational',
          MARKET: 'briMarket',
          LEGAL_TAX: 'briLegalTax',
          PERSONAL: 'briPersonal',
        }
        const field = scoreFields[catKey]
        if (field && field in latestSnapshot) {
          scoreDecimal = Number((latestSnapshot as Record<string, unknown>)[field])
        }
      }

      if (confidence.dots < lowestConfidenceDots) {
        lowestConfidenceDots = confidence.dots
        lowestConfidenceCategory = catKey
      }

      categories.push({
        category: catKey,
        label: BRI_CATEGORY_LABELS[catKey as BRICategory] || catKey,
        score: Math.round(scoreDecimal * 100),
        scoreDecimal,
        dollarImpact: catKey === 'PERSONAL' ? null : (categoryDollarImpacts.get(catKey) ?? 0),
        weight: BRI_WEIGHTS[catKey] || 0,
        confidence: {
          dots: confidence.dots,
          label: confidence.label,
          questionsAnswered,
          questionsTotal: totalQuestions,
          lastUpdated: latestResponseDate?.toISOString() ?? null,
          daysSinceUpdate,
          isStale: daysSinceUpdate !== null && daysSinceUpdate > 90,
          hasUnansweredAiQuestions,
        },
        isLowestConfidence: false, // Set below
      })
    }

    // Mark lowest confidence
    for (const cat of categories) {
      cat.isLowestConfidence = cat.category === lowestConfidenceCategory
    }

    // Build risk drivers — questions where score < 1.0
    const riskDrivers: Array<{
      id: string
      name: string
      category: string
      categoryLabel: string
      dollarImpact: number
      currentScore: number
      optionPosition: number
      totalOptions: number
      questionText: string
      buyerLogic: string | null
      hasLinkedTask: boolean
      linkedTaskId: string | null
      linkedTaskTitle: string | null
      linkedTaskStatus: string | null
    }> = []

    for (const q of questions) {
      const response = responseMap.get(q.id)
      if (!response || !response.selectedOption) continue
      if (response.confidenceLevel === 'NOT_APPLICABLE') continue

      const effectiveOption = response.effectiveOption || response.selectedOption
      const scoreValue = Number(effectiveOption.scoreValue)
      if (scoreValue >= 1.0) continue

      const maxPoints = Number(q.maxImpactPoints)
      const pointsLost = maxPoints * (1 - scoreValue)

      // Get category total points lost for proportional distribution
      const catQuestions = questionsByCategory.get(q.briCategory) ?? []
      let categoryTotalPointsLost = 0
      for (const cq of catQuestions) {
        const cr = responseMap.get(cq.id)
        if (!cr || !cr.selectedOption || cr.confidenceLevel === 'NOT_APPLICABLE') continue
        const eo = cr.effectiveOption || cr.selectedOption
        categoryTotalPointsLost += Number(cq.maxImpactPoints) * (1 - Number(eo.scoreValue))
      }

      const categoryDollar = categoryDollarImpacts.get(q.briCategory) ?? 0
      const dollarImpact = categoryTotalPointsLost > 0
        ? Math.round((pointsLost / categoryTotalPointsLost) * categoryDollar)
        : 0

      // Find option position (1-based, where 1 is worst)
      const sortedOptions = q.options.sort((a, b) => Number(a.scoreValue) - Number(b.scoreValue))
      const optionPosition = sortedOptions.findIndex(o => o.id === effectiveOption.id) + 1

      const linkedTask = tasksByQuestion.get(q.id)

      riskDrivers.push({
        id: q.id,
        name: getRiskDriverName(q.questionText, q.riskDriverName),
        category: q.briCategory,
        categoryLabel: BRI_CATEGORY_LABELS[q.briCategory as BRICategory] || q.briCategory,
        dollarImpact,
        currentScore: scoreValue,
        optionPosition,
        totalOptions: q.options.length,
        questionText: q.questionText,
        buyerLogic: q.buyerLogic || BUYER_EXPLANATIONS[q.briCategory] || null,
        hasLinkedTask: !!linkedTask,
        linkedTaskId: linkedTask?.id ?? null,
        linkedTaskTitle: linkedTask?.title ?? null,
        linkedTaskStatus: linkedTask?.status ?? null,
      })
    }

    // Sort risk drivers by dollar impact descending
    riskDrivers.sort((a, b) => b.dollarImpact - a.dollarImpact)

    // Build question counts
    const questionCounts: Record<string, { total: number; answered: number; unanswered: number }> = {}
    for (const catKey of categoryKeys) {
      const catQuestions = questionsByCategory.get(catKey) ?? []
      let answered = 0
      for (const q of catQuestions) {
        if (responseMap.get(q.id)?.selectedOptionId) answered++
      }
      questionCounts[catKey] = {
        total: catQuestions.length,
        answered,
        unanswered: catQuestions.length - answered,
      }
    }

    const briScore = latestSnapshot ? Math.round(Number(latestSnapshot.briScore) * 100) : null
    const briScoreDecimal = latestSnapshot ? Number(latestSnapshot.briScore) : 0

    // hasAssessment is true if we have any responses (not just if formally completed)
    const hasResponses = (latestAssessment?.responses?.length ?? 0) > 0

    return NextResponse.json({
      briScore,
      briScoreDecimal,
      isEstimated: !latestAssessment?.completedAt,
      categories,
      riskDrivers,
      assessmentId: latestAssessment?.id ?? null,
      hasAssessment: hasResponses,
      lastAssessmentDate: latestAssessment?.completedAt?.toISOString() ?? latestAssessment?.updatedAt?.toISOString() ?? null,
      questionCounts,
    })
  } catch (error) {
    console.error('Error fetching diagnosis data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch diagnosis data', debug: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
