import { NextResponse } from 'next/server'
import {
  calculateValuation,
  calculateCoreScore,
  type CoreFactors,
} from '@/lib/valuation/calculate-valuation'
import { getIndustryMultiples, estimateEbitdaFromRevenue } from '@/lib/valuation/industry-multiples'
import { getMarketSalary } from '@/lib/valuation/recalculate-snapshot'
import {
  applyRateLimit,
  RATE_LIMIT_CONFIGS,
  createRateLimitResponse,
} from '@/lib/security/rate-limit'

/**
 * POST /api/assess/calculate
 *
 * Public (no auth) endpoint that calculates BRI + valuation from assessment data.
 * Uses the canonical valuation engine after P0 bug fixes.
 */
export async function POST(request: Request) {
  const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.SENSITIVE)
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }

  let body: {
    annualRevenue?: number
    coreFactors?: {
      revenueModel: string
      laborIntensity: string
      assetIntensity: string
      ownerInvolvement: string
      grossMarginProxy: string
    }
    buyerScan?: {
      briScore: number
      riskCount: number
      answers: Record<string, boolean>
    }
    classification?: {
      primaryIndustry?: {
        icbSubSector: string
        icbSector: string
        icbSuperSector: string
        icbIndustry: string
      }
    } | null
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { annualRevenue, coreFactors, buyerScan, classification } = body

  if (!annualRevenue || annualRevenue <= 0) {
    return NextResponse.json({ error: 'annualRevenue is required and must be positive' }, { status: 400 })
  }
  if (!coreFactors) {
    return NextResponse.json({ error: 'coreFactors is required' }, { status: 400 })
  }
  if (!buyerScan) {
    return NextResponse.json({ error: 'buyerScan is required' }, { status: 400 })
  }

  try {
    // Calculate Core Score
    const coreScore = calculateCoreScore(coreFactors as CoreFactors)

    // BRI score from quick scan (0-100 scale from client, convert to 0-1)
    const briScore = Math.max(0, Math.min(100, buyerScan.briScore)) / 100

    // Get industry multiples
    const primary = classification?.primaryIndustry
    const multiples = await getIndustryMultiples(
      primary?.icbSubSector || 'professional-services',
      primary?.icbSector,
      primary?.icbSuperSector,
      primary?.icbIndustry
    )

    // Estimate adjusted EBITDA from revenue
    const estimatedEbitda = estimateEbitdaFromRevenue(annualRevenue, multiples)

    // Get revenue size category for market salary
    const revenueSizeCategory = getRevenueSizeCategory(annualRevenue)
    const marketSalary = getMarketSalary(revenueSizeCategory)

    // Use estimated EBITDA (no owner comp adjustment for public assessment)
    const adjustedEbitda = estimatedEbitda

    // Calculate valuation
    const valuation = calculateValuation({
      adjustedEbitda,
      industryMultipleLow: multiples.ebitdaMultipleLow,
      industryMultipleHigh: multiples.ebitdaMultipleHigh,
      coreScore,
      briScore,
    })

    // Build category breakdown from buyer scan answers
    const categoryBreakdown = buildCategoryBreakdown(buyerScan.answers)

    // Generate top 3 task suggestions based on risks
    const topTasks = generateTopTasks(buyerScan.answers, valuation.valueGap)

    return NextResponse.json({
      briScore: buyerScan.briScore,
      currentValue: Math.round(valuation.currentValue),
      potentialValue: Math.round(valuation.potentialValue),
      valueGap: Math.round(valuation.valueGap),
      baseMultiple: valuation.baseMultiple,
      finalMultiple: valuation.finalMultiple,
      categoryBreakdown,
      topTasks,
      // Extra data for save endpoint
      _internal: {
        adjustedEbitda,
        coreScore,
        briScore,
        marketSalary,
        revenueSizeCategory,
        industryMultipleLow: multiples.ebitdaMultipleLow,
        industryMultipleHigh: multiples.ebitdaMultipleHigh,
      },
    })
  } catch (err) {
    console.error('[/api/assess/calculate] Error:', err)
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 })
  }
}

function getRevenueSizeCategory(revenue: number): string {
  if (revenue < 500000) return 'UNDER_500K'
  if (revenue < 1000000) return 'FROM_500K_TO_1M'
  if (revenue < 3000000) return 'FROM_1M_TO_3M'
  if (revenue < 10000000) return 'FROM_3M_TO_10M'
  if (revenue < 25000000) return 'FROM_10M_TO_25M'
  return 'OVER_25M'
}

// Quick scan question metadata for category mapping
const SCAN_QUESTIONS = [
  { id: 'financial-1', category: 'FINANCIAL', riskOnNo: true },
  { id: 'financial-2', category: 'FINANCIAL', riskOnNo: false },
  { id: 'transferability-1', category: 'TRANSFERABILITY', riskOnNo: true },
  { id: 'transferability-2', category: 'TRANSFERABILITY', riskOnNo: true },
  { id: 'operational-1', category: 'OPERATIONAL', riskOnNo: true },
  { id: 'legal-1', category: 'LEGAL_TAX', riskOnNo: true },
  { id: 'market-1', category: 'MARKET', riskOnNo: true },
  { id: 'personal-1', category: 'PERSONAL', riskOnNo: true },
]

function buildCategoryBreakdown(answers: Record<string, boolean>): Record<string, number> {
  const catScores: Record<string, { good: number; total: number }> = {}

  for (const q of SCAN_QUESTIONS) {
    const answer = answers[q.id]
    if (answer === undefined) continue

    if (!catScores[q.category]) catScores[q.category] = { good: 0, total: 0 }
    catScores[q.category].total++

    const isRisk = q.riskOnNo ? answer !== true : answer === true
    if (!isRisk) catScores[q.category].good++
  }

  const result: Record<string, number> = {}
  for (const [cat, scores] of Object.entries(catScores)) {
    result[cat] = scores.total > 0 ? scores.good / scores.total : 0.5
  }
  return result
}

const TASK_SUGGESTIONS: Record<string, { title: string; category: string }> = {
  'financial-1': { title: 'Get third-party financial verification (CPA review or audit)', category: 'FINANCIAL' },
  'financial-2': { title: 'Diversify revenue to reduce customer concentration below 10%', category: 'FINANCIAL' },
  'transferability-1': { title: 'Test business continuity: take 30+ days away from operations', category: 'TRANSFERABILITY' },
  'transferability-2': { title: 'Identify and develop a successor who could step in within 90 days', category: 'TRANSFERABILITY' },
  'operational-1': { title: 'Document core operations so new hires can learn independently', category: 'OPERATIONAL' },
  'legal-1': { title: 'Formalize all key customer and vendor relationships with signed contracts', category: 'LEGAL_TAX' },
  'market-1': { title: 'Increase recurring or contracted revenue to over 50% of total', category: 'MARKET' },
  'personal-1': { title: 'Develop a personal exit readiness plan with a 6-month timeline', category: 'PERSONAL' },
}

function generateTopTasks(
  answers: Record<string, boolean>,
  valueGap: number
): Array<{ title: string; category: string; estimatedImpact: number }> {
  const risks: Array<{ id: string; title: string; category: string }> = []

  for (const q of SCAN_QUESTIONS) {
    const answer = answers[q.id]
    const isRisk = q.riskOnNo ? answer !== true : answer === true
    if (isRisk && TASK_SUGGESTIONS[q.id]) {
      risks.push({ id: q.id, ...TASK_SUGGESTIONS[q.id] })
    }
  }

  // Distribute value gap across risks
  const impactPerTask = risks.length > 0 ? valueGap / risks.length : 0

  return risks.slice(0, 3).map(r => ({
    title: r.title,
    category: r.category,
    estimatedImpact: Math.round(impactPerTask),
  }))
}
