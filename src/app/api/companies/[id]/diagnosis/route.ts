import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getRiskDriverName } from '@/lib/constants/risk-driver-names'
import {
  BRI_CATEGORY_LABELS,
  type BRICategory,
} from '@/lib/constants/bri-categories'
import { calculateCategoryValueGaps } from '@/lib/valuation/value-gap-attribution'
import { DEFAULT_BRI_WEIGHTS } from '@/lib/bri-weights'
import { gatherTaskPersonalizationContext } from '@/lib/tasks/personalization-context'

// BRI weights from shared source (PROD-010 audit: previously hardcoded, now imported for consistency)
const BRI_WEIGHTS: Record<string, number> = DEFAULT_BRI_WEIGHTS

// Buyer explanations for bridge categories (same as dashboard route)
const BUYER_EXPLANATIONS: Record<string, string> = {
  FINANCIAL: 'Buyers pay less when financial records lack depth or consistency.',
  TRANSFERABILITY: "Buyers discount businesses that can't run without the owner.",
  OPERATIONAL: 'Buyers see risk in businesses without documented, repeatable processes.',
  MARKET: 'Buyers pay premiums for defensible market positions and diverse revenue.',
  LEGAL_TAX: 'Buyers walk away from unresolved legal exposure and compliance gaps.',
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
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
    // Fetch all active questions with options
    const allQuestions = await prisma.question.findMany({
      where: { isActive: true },
      include: {
        options: { orderBy: { displayOrder: 'asc' } },
      },
      orderBy: [{ briCategory: 'asc' }, { displayOrder: 'asc' }],
    })

    // PROD-014: Include BOTH seed questions and AI questions for this company.
    // Seed questions are foundational; AI questions are adaptive follow-ups.
    // Both are shown, with seed questions ordered first within each category.
    const questions = allQuestions.filter(q =>
      q.companyId === companyId || q.companyId === null
    )

    // Fetch the latest assessment for this company (for assessmentId reference)
    const latestAssessment = await prisma.assessment.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        completedAt: true,
        updatedAt: true,
      },
    })

    // PROD-013 FIX: Gather the latest response per question across ALL assessments
    // for this company. This ensures re-assessing one category doesn't lose
    // other categories' responses when they live on a different assessment.
    const allResponses = await prisma.assessmentResponse.findMany({
      where: {
        assessment: { companyId },
      },
      include: {
        question: true,
        selectedOption: true,
        effectiveOption: true,
      },
      orderBy: { updatedAt: 'desc' },
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

    // Fetch personalization context for financial enrichment
    const personalizationCtx = await gatherTaskPersonalizationContext(companyId)

    // Build response map — deduplicate to latest response per question
    // Since allResponses is ordered by updatedAt desc, first occurrence wins
    const responseMap = new Map<string, typeof allResponses[number]>()
    for (const r of allResponses) {
      if (!responseMap.has(r.questionId)) {
        responseMap.set(r.questionId, r)
      }
    }

    // Group questions by category
    const questionsByCategory = new Map<string, typeof questions>()
    for (const q of questions) {
      const existing = questionsByCategory.get(q.briCategory) ?? []
      existing.push(q)
      questionsByCategory.set(q.briCategory, existing)
    }

    // Calculate bridge dollar impacts per category using shared utility (PROD-016 fix)
    // This ensures category gaps sum exactly to total value gap (rounding-corrected)
    const valueGap = latestSnapshot ? Number(latestSnapshot.valueGap) : 0
    const categoryDollarImpacts = new Map<string, number>()

    if (latestSnapshot && valueGap > 0) {
      const categoryInputs = [
        { category: 'FINANCIAL', score: Number(latestSnapshot.briFinancial), weight: BRI_WEIGHTS['FINANCIAL'] || 0 },
        { category: 'TRANSFERABILITY', score: Number(latestSnapshot.briTransferability), weight: BRI_WEIGHTS['TRANSFERABILITY'] || 0 },
        { category: 'OPERATIONAL', score: Number(latestSnapshot.briOperational), weight: BRI_WEIGHTS['OPERATIONAL'] || 0 },
        { category: 'MARKET', score: Number(latestSnapshot.briMarket), weight: BRI_WEIGHTS['MARKET'] || 0 },
        { category: 'LEGAL_TAX', score: Number(latestSnapshot.briLegalTax), weight: BRI_WEIGHTS['LEGAL_TAX'] || 0 },
      ]

      const gaps = calculateCategoryValueGaps(categoryInputs, valueGap)
      for (const g of gaps) {
        categoryDollarImpacts.set(g.category, g.dollarImpact)
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
      isAssessed: boolean
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
      financialContext: {
        tier: string
        metric: { label: string; value: string; source: string } | null
        benchmark: { range: string; source: string } | null
        dollarContext: string | null
      } | null
    }

    const categories: CategoryData[] = []
    let lowestConfidenceDots = 5
    let lowestConfidenceCategory = ''

    for (const catKey of categoryKeys) {
      const catQuestions = questionsByCategory.get(catKey) ?? []
      const totalQuestions = catQuestions.length

      // Count answered questions and find latest response date
      // PROD-014: Now that both seed and AI questions are in the questions list,
      // we iterate over all of them directly — no fallback needed.
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
          // This is an AI (adaptive) question that hasn't been answered yet
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

      // PROD-014: A category is "assessed" if the user has answered at least one
      // question in it. Categories with 0 responses show "Not Assessed" instead
      // of a fake default score (previously defaulted to 70).
      const isAssessed = questionsAnswered > 0

      const catDollarImpact = catKey === 'PERSONAL' ? null : (categoryDollarImpacts.get(catKey) ?? 0)

      // Build financial context for this category
      let catFinancialContext: CategoryData['financialContext'] = null
      if (personalizationCtx && personalizationCtx.tier !== 'LOW') {
        catFinancialContext = {
          tier: personalizationCtx.tier,
          metric: catKey === 'FINANCIAL' && personalizationCtx.financials ? {
            label: 'EBITDA Margin',
            value: `${((personalizationCtx.financials.ebitdaMarginPct ?? 0)).toFixed(1)}%`,
            source: personalizationCtx.financials.source,
          } : null,
          benchmark: personalizationCtx.benchmarks ? {
            range: `${personalizationCtx.benchmarks.ebitdaMarginLow.toFixed(1)}–${personalizationCtx.benchmarks.ebitdaMarginHigh.toFixed(1)}%`,
            source: `${personalizationCtx.company.subSector} sector data`,
          } : null,
          dollarContext: catDollarImpact && catDollarImpact > 0 ? `Closing this gap could recover ~${formatCurrency(catDollarImpact)}` : null,
        }
      }

      categories.push({
        category: catKey,
        label: BRI_CATEGORY_LABELS[catKey as BRICategory] || catKey,
        score: Math.round(scoreDecimal * 100),
        scoreDecimal,
        dollarImpact: catDollarImpact,
        weight: BRI_WEIGHTS[catKey] || 0,
        isAssessed,
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
        financialContext: catFinancialContext,
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
      financialContext: {
        ebitda: number
        source: string
        benchmarkMultiple: string | null
      } | null
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
        financialContext: personalizationCtx?.financials ? {
          ebitda: personalizationCtx.financials.ebitda,
          source: personalizationCtx.financials.source,
          benchmarkMultiple: personalizationCtx.benchmarks
            ? `${personalizationCtx.benchmarks.ebitdaMultipleLow}x–${personalizationCtx.benchmarks.ebitdaMultipleHigh}x`
            : null,
        } : null,
      })
    }

    // Sort risk drivers by dollar impact descending
    riskDrivers.sort((a, b) => b.dollarImpact - a.dollarImpact)

    // PROD-014: Build question counts — with both seed and AI questions now included
    // in catQuestions, no fallback logic is needed.
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
    const hasResponses = allResponses.length > 0

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
    console.error('Error fetching diagnosis data:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch diagnosis data' },
      { status: 500 }
    )
  }
}
