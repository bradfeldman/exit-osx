import { NextResponse } from 'next/server'
import {
  calculateValuation,
  calculateCoreScore,
  type CoreFactors,
} from '@/lib/valuation/calculate-valuation'
import { getIndustryMultiples, estimateEbitdaFromRevenue } from '@/lib/valuation/industry-multiples'
import { getOrResearchMultiples } from '@/lib/valuation/multiple-freshness'
import { getMarketSalary } from '@/lib/valuation/recalculate-snapshot'
import {
  applyRateLimit,
  RATE_LIMIT_CONFIGS,
  createRateLimitResponse,
} from '@/lib/security/rate-limit'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const schema = z.object({
  annualRevenue: z.coerce.number().finite().positive('annualRevenue is required and must be positive'),
  coreFactors: z.object({
    revenueModel: z.string().max(100),
    laborIntensity: z.string().max(100),
    assetIntensity: z.string().max(100),
    ownerInvolvement: z.string().max(100),
    grossMarginProxy: z.string().max(100),
  }),
  buyerScan: z.object({
    briScore: z.coerce.number().finite().min(0).max(100),
    riskCount: z.coerce.number().int().min(0).max(100),
    answers: z.record(z.string(), z.union([z.boolean(), z.enum(['yes', 'mostly', 'not_yet', 'no'])])),
  }),
  classification: z.object({
    primaryIndustry: z.object({
      icbSubSector: z.string().max(200),
      icbSector: z.string().max(200),
      icbSuperSector: z.string().max(200),
      icbIndustry: z.string().max(200),
    }).optional(),
  }).optional().nullable(),
})

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

  const validation = await validateRequestBody(request, schema)
  if (!validation.success) return validation.error
  const { annualRevenue, coreFactors, buyerScan, classification } = validation.data

  try {
    // Calculate Core Score
    const coreScore = calculateCoreScore(coreFactors as CoreFactors)

    // BRI score from quick scan (0-100 scale from client, convert to 0-1)
    const briScore = Math.max(0, Math.min(100, buyerScan.briScore)) / 100

    // Get industry multiples (with on-demand AI research if stale)
    const primary = classification?.primaryIndustry
    const icbSubSector = primary?.icbSubSector || 'PROFESSIONAL_SERVICES'
    let multiples
    try {
      multiples = await getOrResearchMultiples(icbSubSector)
    } catch {
      // Fall back to cascading lookup if research fails
      multiples = await getIndustryMultiples(
        icbSubSector,
        primary?.icbSector,
        primary?.icbSuperSector,
        primary?.icbIndustry
      )
    }

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

    // Determine confidence level from multiples source
    const confidenceLevel = multiples.isDefault
      ? 'low'
      : multiples.source?.includes('high confidence')
        ? 'high'
        : multiples.source?.includes('low confidence')
          ? 'low'
          : 'medium'

    return NextResponse.json({
      briScore: buyerScan.briScore,
      currentValue: Math.round(valuation.currentValue),
      potentialValue: Math.round(valuation.potentialValue),
      valueGap: Math.round(valuation.valueGap),
      baseMultiple: valuation.baseMultiple,
      finalMultiple: valuation.finalMultiple,
      categoryBreakdown,
      topTasks,
      confidenceLevel,
      // SECURITY: Internal calculation details removed from public response (SEC-052)
      // The save endpoint recalculates server-side — no need to expose algorithm internals
    })
  } catch (err) {
    console.error('[/api/assess/calculate] Error:', err instanceof Error ? err.message : 'Calculation failed')
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

// Convert any answer to a 0-1 score, handling both legacy boolean and 4-option values
function answerToScore(answer: boolean | string, inverted: boolean): number {
  // Legacy boolean support
  if (typeof answer === 'boolean') {
    const base = answer ? 1.0 : 0.0
    return inverted ? 1.0 - base : base
  }
  // 4-option scale
  const scores: Record<string, number> = { yes: 1.0, mostly: 0.7, not_yet: 0.3, no: 0.0 }
  const base = scores[answer] ?? 0.0
  return inverted ? 1.0 - base : base
}

function buildCategoryBreakdown(answers: Record<string, boolean | string>): Record<string, number> {
  const catScores: Record<string, { score: number; total: number }> = {}

  for (const q of SCAN_QUESTIONS) {
    const answer = answers[q.id]
    if (answer === undefined) continue

    if (!catScores[q.category]) catScores[q.category] = { score: 0, total: 0 }
    catScores[q.category].total++
    catScores[q.category].score += answerToScore(answer, !q.riskOnNo)
  }

  const result: Record<string, number> = {}
  for (const [cat, scores] of Object.entries(catScores)) {
    result[cat] = scores.total > 0 ? scores.score / scores.total : 0.5
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

// Category weights reflect how much each risk area typically affects deal value
// Higher weight = bigger impact on what a buyer will actually pay
const CATEGORY_IMPACT_WEIGHTS: Record<string, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.25,
  OPERATIONAL: 0.15,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

function generateTopTasks(
  answers: Record<string, boolean | string>,
  valueGap: number
): Array<{ title: string; category: string; estimatedImpact: number }> {
  const risks: Array<{ id: string; title: string; category: string; weight: number }> = []

  for (const q of SCAN_QUESTIONS) {
    const answer = answers[q.id]
    if (answer === undefined) continue
    // A "risk" is anything scoring below 0.7 (i.e., not_yet, no, or boolean false)
    const score = answerToScore(answer, !q.riskOnNo)
    if (score < 0.7 && TASK_SUGGESTIONS[q.id]) {
      risks.push({
        id: q.id,
        ...TASK_SUGGESTIONS[q.id],
        weight: CATEGORY_IMPACT_WEIGHTS[q.category] || 0.10,
      })
    }
  }

  // Sort by weight (highest-impact categories first)
  risks.sort((a, b) => b.weight - a.weight)

  // Distribute value gap proportionally by category weight
  const totalWeight = risks.reduce((sum, r) => sum + r.weight, 0)

  return risks.slice(0, 3).map(r => ({
    title: r.title,
    category: r.category,
    estimatedImpact: totalWeight > 0 ? Math.round((r.weight / totalWeight) * valueGap) : 0,
  }))
}
