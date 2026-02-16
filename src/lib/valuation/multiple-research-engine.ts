/**
 * AI-Powered Multiple Research Engine
 *
 * Uses Claude Sonnet to research industry valuation multiples grounded in
 * public company data and established M&A benchmarks for SMBs.
 *
 * Design principles:
 * - Multiples must be bounded by sanity checks (no hallucinated 50x EBITDA)
 * - All research is logged to AIGenerationLog for full audit trail
 * - Source citations are required — each multiple must be grounded in evidence
 * - SMB discount methodology is explicitly encoded in the prompt
 */

import { generateJSON } from '@/lib/ai/anthropic'
import { prisma } from '@/lib/prisma'

// ─── Types ──────────────────────────────────────────────────────────────

export interface PublicComparable {
  name: string
  ticker: string
  evToEbitda: number | null
  evToRevenue: number | null
  revenue: number | null
  ebitdaMargin: number | null
  whyRelevant: string
}

export interface MultipleResearchResult {
  icbSubSector: string
  gicsSubIndustry: string | null
  // Researched multiples (SMB-adjusted)
  revenueMultipleLow: number
  revenueMultipleHigh: number
  ebitdaMultipleLow: number
  ebitdaMultipleHigh: number
  ebitdaMarginLow: number
  ebitdaMarginHigh: number
  // Evidence chain
  publicComparables: PublicComparable[]
  // Methodology notes
  methodology: string
  confidenceLevel: 'high' | 'medium' | 'low'
  warnings: string[]
  // Source tracking
  researchedAt: string
}

// ─── Sanity Bounds ──────────────────────────────────────────────────────

const BOUNDS = {
  ebitdaMultiple: { min: 1.5, max: 15.0 },
  revenueMultiple: { min: 0.1, max: 8.0 },
  ebitdaMargin: { min: 0.02, max: 0.50 },
}

function clampMultiple(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value * 100) / 100))
}

function validateResearchResult(result: AIResearchResponse): { valid: boolean; warnings: string[] } {
  const warnings: string[] = []

  if (result.ebitdaMultipleLow > result.ebitdaMultipleHigh) {
    warnings.push('EBITDA multiple low > high — swapped')
  }
  if (result.revenueMultipleLow > result.revenueMultipleHigh) {
    warnings.push('Revenue multiple low > high — swapped')
  }
  if (result.ebitdaMarginLow > result.ebitdaMarginHigh) {
    warnings.push('EBITDA margin low > high — swapped')
  }

  // Check bounds
  if (result.ebitdaMultipleLow < BOUNDS.ebitdaMultiple.min || result.ebitdaMultipleHigh > BOUNDS.ebitdaMultiple.max) {
    warnings.push(`EBITDA multiples outside bounds (${BOUNDS.ebitdaMultiple.min}-${BOUNDS.ebitdaMultiple.max}x) — clamped`)
  }
  if (result.revenueMultipleLow < BOUNDS.revenueMultiple.min || result.revenueMultipleHigh > BOUNDS.revenueMultiple.max) {
    warnings.push(`Revenue multiples outside bounds (${BOUNDS.revenueMultiple.min}-${BOUNDS.revenueMultiple.max}x) — clamped`)
  }

  return { valid: warnings.length === 0, warnings }
}

// ─── AI Research Prompt ─────────────────────────────────────────────────

interface AIResearchResponse {
  revenueMultipleLow: number
  revenueMultipleHigh: number
  ebitdaMultipleLow: number
  ebitdaMultipleHigh: number
  ebitdaMarginLow: number
  ebitdaMarginHigh: number
  publicComparables: Array<{
    name: string
    ticker: string
    evToEbitda: number | null
    evToRevenue: number | null
    revenue: number | null
    ebitdaMargin: number | null
    whyRelevant: string
  }>
  methodology: string
  confidenceLevel: 'high' | 'medium' | 'low'
}

const RESEARCH_SYSTEM_PROMPT = `You are a business valuation analyst specializing in SMB (small and medium business) M&A. Your job is to research and provide defensible industry valuation multiples for a specific industry sub-sector.

METHODOLOGY:
1. Identify 5-8 publicly traded companies in the sub-sector as reference points. These must be REAL companies with REAL tickers.
2. Reference their typical EV/EBITDA and EV/Revenue multiples. If you are uncertain about a specific metric, use null.
3. Apply SMB discount methodology: Public company multiples typically range 8x-15x EBITDA. SMBs in the same industry typically trade at 3x-7x EBITDA due to size risk, key-person risk, lower growth, and liquidity discount.
4. Cross-reference with typical private transaction ranges (lower middle market: 3x-6x EBITDA for most industries).
5. Provide bounded output: revenue and EBITDA multiple ranges for SMBs, plus EBITDA margin ranges.

CRITICAL RULES:
- SMB EBITDA multiples must be between 1.5x and 15x. Most industries will be 3x-7x.
- SMB Revenue multiples must be between 0.1x and 8x. Most industries will be 0.3x-3x.
- EBITDA margins must be between 2% and 50% (0.02-0.50 as decimals).
- If you are uncertain about a specific metric for a company, say so (use null) rather than guessing.
- It is better to return fewer high-confidence data points than many uncertain ones.
- Always explain your SMB discount rationale — why these public companies' multiples were adjusted to these SMB ranges.
- Return ONLY valid JSON. No markdown code blocks.`

/**
 * Research industry multiples for a given ICB sub-sector using Claude Sonnet.
 *
 * Returns researched multiples with full citation chain and methodology notes.
 * Results are bounded by sanity checks and logged to AIGenerationLog.
 */
export async function researchMultiples(
  icbSubSector: string,
  gicsSubIndustry?: string
): Promise<MultipleResearchResult> {
  const startTime = Date.now()

  const gicsContext = gicsSubIndustry
    ? `\nGICS Sub-Industry: ${gicsSubIndustry}`
    : ''

  const prompt = `Research current SMB valuation multiples for this industry:

ICB Sub-Sector: ${icbSubSector}${gicsContext}

Provide:
1. 5-8 publicly traded comparable companies with their multiples
2. SMB-adjusted EBITDA and Revenue multiple ranges
3. Typical EBITDA margin range for this industry
4. Your methodology and confidence level

Return ONLY this JSON structure:
{
  "revenueMultipleLow": 0.5,
  "revenueMultipleHigh": 1.5,
  "ebitdaMultipleLow": 3.0,
  "ebitdaMultipleHigh": 6.0,
  "ebitdaMarginLow": 0.08,
  "ebitdaMarginHigh": 0.18,
  "publicComparables": [
    {
      "name": "Company Name",
      "ticker": "TICK",
      "evToEbitda": 12.5,
      "evToRevenue": 2.1,
      "revenue": 5000000000,
      "ebitdaMargin": 0.16,
      "whyRelevant": "Leading company in this sub-sector..."
    }
  ],
  "methodology": "Brief explanation of how you derived SMB multiples from public company data...",
  "confidenceLevel": "high"
}`

  const { data: aiResult, usage } = await generateJSON<AIResearchResponse>(prompt, RESEARCH_SYSTEM_PROMPT, {
    model: 'claude-sonnet',
    temperature: 0.2,
    maxTokens: 4096,
  })

  // Validate and clamp
  const { warnings } = validateResearchResult(aiResult)

  // Ensure low <= high (swap if needed)
  let ebitdaLow = aiResult.ebitdaMultipleLow
  let ebitdaHigh = aiResult.ebitdaMultipleHigh
  if (ebitdaLow > ebitdaHigh) [ebitdaLow, ebitdaHigh] = [ebitdaHigh, ebitdaLow]

  let revenueLow = aiResult.revenueMultipleLow
  let revenueHigh = aiResult.revenueMultipleHigh
  if (revenueLow > revenueHigh) [revenueLow, revenueHigh] = [revenueHigh, revenueLow]

  let marginLow = aiResult.ebitdaMarginLow
  let marginHigh = aiResult.ebitdaMarginHigh
  if (marginLow > marginHigh) [marginLow, marginHigh] = [marginHigh, marginLow]

  const result: MultipleResearchResult = {
    icbSubSector,
    gicsSubIndustry: gicsSubIndustry ?? null,
    revenueMultipleLow: clampMultiple(revenueLow, BOUNDS.revenueMultiple.min, BOUNDS.revenueMultiple.max),
    revenueMultipleHigh: clampMultiple(revenueHigh, BOUNDS.revenueMultiple.min, BOUNDS.revenueMultiple.max),
    ebitdaMultipleLow: clampMultiple(ebitdaLow, BOUNDS.ebitdaMultiple.min, BOUNDS.ebitdaMultiple.max),
    ebitdaMultipleHigh: clampMultiple(ebitdaHigh, BOUNDS.ebitdaMultiple.min, BOUNDS.ebitdaMultiple.max),
    ebitdaMarginLow: clampMultiple(marginLow, BOUNDS.ebitdaMargin.min, BOUNDS.ebitdaMargin.max),
    ebitdaMarginHigh: clampMultiple(marginHigh, BOUNDS.ebitdaMargin.min, BOUNDS.ebitdaMargin.max),
    publicComparables: (aiResult.publicComparables || [])
      .filter(c => c.name && c.ticker)
      .slice(0, 8),
    methodology: aiResult.methodology || '',
    confidenceLevel: aiResult.confidenceLevel || 'medium',
    warnings,
    researchedAt: new Date().toISOString(),
  }

  // Log to AIGenerationLog
  try {
    await prisma.aIGenerationLog.create({
      data: {
        generationType: 'multiple_research',
        inputData: { icbSubSector, gicsSubIndustry },
        outputData: JSON.parse(JSON.stringify(result)),
        modelUsed: 'claude-sonnet-4-20250514',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs: Date.now() - startTime,
        errorMessage: warnings.length > 0 ? warnings.join('; ') : null,
      },
    })
  } catch (err) {
    console.error('[MultipleResearch] Failed to log research:', err)
  }

  return result
}
