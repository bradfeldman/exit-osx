// EBITDA Bridge AI Analysis
// Generates AI-powered suggestions for EBITDA adjustments, categorizes existing ones,
// and provides buyer-perspective narrative for the EBITDA bridge waterfall.

import { generateJSON } from '@/lib/ai/anthropic'
import { prisma } from '@/lib/prisma'
import { getIndustryMultiples } from '@/lib/valuation/industry-multiples'
import {
  MARKET_SALARY_BY_REVENUE,
  getMarketSalary,
} from '@/lib/valuation/recalculate-snapshot'

// ─── Types ──────────────────────────────────────────────────────────────

export interface BridgeAnalysis {
  suggestedAdjustments: SuggestedAdjustment[]
  existingReview: AdjustmentReview[]
  marginBenchmark: {
    industryLow: number | null
    industryHigh: number | null
    companyReported: number
    companyAdjusted: number
  }
  buyerNarrative: string
}

export interface SuggestedAdjustment {
  description: string
  estimatedAmount: number | null
  type: 'ADD_BACK' | 'DEDUCTION'
  category: string
  confidence: number
  explanation: string
  buyerPerspective: string
}

export interface AdjustmentReview {
  adjustmentId: string
  suggestedCategory: string
  buyerRiskFlag: string | null
}

// ─── Valid Categories ───────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'OWNER_COMPENSATION',
  'PERSONAL_EXPENSES',
  'ONE_TIME_CHARGES',
  'RELATED_PARTY',
  'NON_OPERATING',
  'DISCRETIONARY',
  'OTHER',
] as const

// ─── System Prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an M&A advisor analyzing EBITDA adjustments for a business sale.
Your job is to help a business owner build a defensible EBITDA bridge — the path from reported EBITDA to adjusted (normalized) EBITDA.

RULES:
- Only suggest adjustments that are common and defensible in M&A transactions
- When you lack line-item detail to estimate a dollar amount, set estimatedAmount to null
- Categories must be one of: OWNER_COMPENSATION, PERSONAL_EXPENSES, ONE_TIME_CHARGES, RELATED_PARTY, NON_OPERATING, DISCRETIONARY, OTHER
- Confidence scoring: 0.9+ for standard items (e.g., owner comp above market), 0.5-0.8 for contextual items, <0.5 for speculative
- Buyer risk flags should be specific (e.g., "Buyers will request lease comps to verify")
- Buyer narrative should read like a Quality of Earnings report summary (2-3 sentences)
- Do NOT fabricate specific dollar amounts when you lack detail — use null
- For existing adjustment review, suggest a category and flag any that a buyer would question

INPUT: You receive top-level financials only (no general ledger detail). You CAN categorize existing adjustments and suggest common adjustment types. You CANNOT fabricate specific dollar amounts without supporting data.

Respond with a JSON object matching this structure exactly:
{
  "suggestedAdjustments": [{ "description": string, "estimatedAmount": number|null, "type": "ADD_BACK"|"DEDUCTION", "category": string, "confidence": number, "explanation": string, "buyerPerspective": string }],
  "existingReview": [{ "adjustmentId": string, "suggestedCategory": string, "buyerRiskFlag": string|null }],
  "marginBenchmark": { "industryLow": number|null, "industryHigh": number|null, "companyReported": number, "companyAdjusted": number },
  "buyerNarrative": string
}`

// ─── Context Builder ────────────────────────────────────────────────────

interface BridgeContext {
  companyName: string
  industry: string
  icbSubSector: string
  businessDescription: string | null
  revenue: number
  ebitda: number
  ownerCompensation: number
  revenueSizeCategory: string | null
  marketSalary: number
  periods: Array<{
    fiscalYear: number
    revenue: number
    ebitda: number
    margin: number
  }>
  incomeStatement: {
    grossRevenue: number
    cogs: number
    operatingExpenses: number
    grossProfit: number
    ebitda: number
    depreciation: number | null
    amortization: number | null
    interestExpense: number | null
    taxExpense: number | null
  } | null
  existingAdjustments: Array<{
    id: string
    description: string
    amount: number
    type: string
    category: string | null
  }>
  industryMargins: {
    ebitdaMarginLow: number | null
    ebitdaMarginHigh: number | null
  }
}

async function buildBridgeContext(companyId: string): Promise<BridgeContext> {
  // Fetch company with core factors
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    include: {
      coreFactors: true,
    },
  })

  const revenueSizeCategory = company.coreFactors?.revenueSizeCategory ?? null
  const marketSalary = getMarketSalary(revenueSizeCategory)

  // Fetch periods with income statements (most recent first)
  const periods = await prisma.financialPeriod.findMany({
    where: {
      companyId,
      periodType: 'ANNUAL',
    },
    include: {
      incomeStatement: true,
    },
    orderBy: { fiscalYear: 'desc' },
    take: 4,
  })

  const periodSummaries = periods.map((p) => ({
    fiscalYear: p.fiscalYear,
    revenue: p.incomeStatement ? Number(p.incomeStatement.grossRevenue) : 0,
    ebitda: p.incomeStatement ? Number(p.incomeStatement.ebitda) : 0,
    margin: p.incomeStatement
      ? Number(p.incomeStatement.ebitdaMarginPct) * 100
      : 0,
  }))

  // Latest income statement
  const latestIS = periods[0]?.incomeStatement ?? null
  const incomeStatement = latestIS
    ? {
        grossRevenue: Number(latestIS.grossRevenue),
        cogs: Number(latestIS.cogs),
        operatingExpenses: Number(latestIS.operatingExpenses),
        grossProfit: Number(latestIS.grossProfit),
        ebitda: Number(latestIS.ebitda),
        depreciation: latestIS.depreciation ? Number(latestIS.depreciation) : null,
        amortization: latestIS.amortization ? Number(latestIS.amortization) : null,
        interestExpense: latestIS.interestExpense ? Number(latestIS.interestExpense) : null,
        taxExpense: latestIS.taxExpense ? Number(latestIS.taxExpense) : null,
      }
    : null

  // Existing adjustments
  const adjustments = await prisma.ebitdaAdjustment.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  })

  const existingAdjustments = adjustments.map((a) => ({
    id: a.id,
    description: a.description,
    amount: Number(a.amount),
    type: a.type,
    category: a.category,
  }))

  // Industry margin benchmarks
  const multiples = await getIndustryMultiples(
    company.icbSubSector,
    company.icbSector,
    company.icbSuperSector,
    company.icbIndustry
  )

  return {
    companyName: company.name,
    industry: company.icbSubSector,
    icbSubSector: company.icbSubSector,
    businessDescription: company.businessDescription,
    revenue: Number(company.annualRevenue),
    ebitda: Number(company.annualEbitda),
    ownerCompensation: Number(company.ownerCompensation),
    revenueSizeCategory,
    marketSalary,
    periods: periodSummaries,
    incomeStatement,
    existingAdjustments,
    industryMargins: {
      ebitdaMarginLow: multiples.ebitdaMarginLow ?? null,
      ebitdaMarginHigh: multiples.ebitdaMarginHigh ?? null,
    },
  }
}

// ─── Prompt Builder ─────────────────────────────────────────────────────

function buildPrompt(ctx: BridgeContext): string {
  const parts: string[] = []

  parts.push(`## Company Profile`)
  parts.push(`- Name: ${ctx.companyName}`)
  parts.push(`- Industry: ${ctx.industry}`)
  if (ctx.businessDescription) {
    parts.push(`- Description: ${ctx.businessDescription}`)
  }
  parts.push(`- Annual Revenue: $${ctx.revenue.toLocaleString()}`)
  parts.push(`- Reported EBITDA: $${ctx.ebitda.toLocaleString()}`)
  parts.push(`- Owner Compensation: $${ctx.ownerCompensation.toLocaleString()}`)
  parts.push(`- Market Salary Benchmark: $${ctx.marketSalary.toLocaleString()}`)

  const ownerCompDelta = ctx.ownerCompensation - ctx.marketSalary
  if (ownerCompDelta > 0) {
    parts.push(`- Owner Comp Above Market: $${ownerCompDelta.toLocaleString()} (this is already a standard add-back)`)
  }

  if (ctx.incomeStatement) {
    const is = ctx.incomeStatement
    parts.push(`\n## Latest Income Statement`)
    parts.push(`- Revenue: $${is.grossRevenue.toLocaleString()}`)
    parts.push(`- COGS: $${is.cogs.toLocaleString()}`)
    parts.push(`- Gross Profit: $${is.grossProfit.toLocaleString()}`)
    parts.push(`- Operating Expenses: $${is.operatingExpenses.toLocaleString()}`)
    parts.push(`- EBITDA: $${is.ebitda.toLocaleString()}`)
    if (is.depreciation !== null) parts.push(`- D&A: $${((is.depreciation ?? 0) + (is.amortization ?? 0)).toLocaleString()}`)
    if (is.interestExpense !== null) parts.push(`- Interest: $${is.interestExpense.toLocaleString()}`)
    if (is.taxExpense !== null) parts.push(`- Taxes: $${is.taxExpense.toLocaleString()}`)
  }

  if (ctx.periods.length > 0) {
    parts.push(`\n## Historical Performance`)
    for (const p of ctx.periods) {
      parts.push(`- FY${p.fiscalYear}: Revenue $${p.revenue.toLocaleString()}, EBITDA $${p.ebitda.toLocaleString()}, Margin ${p.margin.toFixed(1)}%`)
    }
  }

  if (ctx.existingAdjustments.length > 0) {
    parts.push(`\n## Existing Adjustments (user-entered)`)
    for (const a of ctx.existingAdjustments) {
      parts.push(`- [${a.id}] ${a.type}: "${a.description}" — $${a.amount.toLocaleString()}${a.category ? ` (Category: ${a.category})` : ''}`)
    }
  } else {
    parts.push(`\n## Existing Adjustments: None entered yet`)
  }

  parts.push(`\n## Industry Benchmarks`)
  if (ctx.industryMargins.ebitdaMarginLow !== null && ctx.industryMargins.ebitdaMarginHigh !== null) {
    parts.push(`- Industry EBITDA Margin Range: ${(ctx.industryMargins.ebitdaMarginLow * 100).toFixed(1)}% - ${(ctx.industryMargins.ebitdaMarginHigh * 100).toFixed(1)}%`)
  } else {
    parts.push(`- Industry margins: Not available for this sector`)
  }

  const reportedMargin = ctx.revenue > 0 ? (ctx.ebitda / ctx.revenue) * 100 : 0
  parts.push(`- Company Reported EBITDA Margin: ${reportedMargin.toFixed(1)}%`)

  parts.push(`\n## Market Salary Reference`)
  for (const [category, salary] of Object.entries(MARKET_SALARY_BY_REVENUE)) {
    parts.push(`- ${category}: $${salary.toLocaleString()}`)
  }

  parts.push(`\nAnalyze this company's EBITDA adjustments. Suggest any common M&A add-backs or deductions the owner may be missing, review the existing adjustments for category and buyer risk, and provide a buyer-perspective narrative summary.`)

  return parts.join('\n')
}

// ─── Generation Function ────────────────────────────────────────────────

export async function analyzeEbitdaBridge(companyId: string): Promise<BridgeAnalysis> {
  const startTime = Date.now()

  const ctx = await buildBridgeContext(companyId)
  const prompt = buildPrompt(ctx)

  try {
    const { data, usage } = await generateJSON<BridgeAnalysis>(
      prompt,
      SYSTEM_PROMPT,
      { model: 'claude-sonnet', maxTokens: 4096, temperature: 0.3 }
    )

    const latencyMs = Date.now() - startTime

    // Validate categories in suggestions
    for (const s of data.suggestedAdjustments) {
      if (!VALID_CATEGORIES.includes(s.category as typeof VALID_CATEGORIES[number])) {
        s.category = 'OTHER'
      }
      // Clamp confidence
      s.confidence = Math.max(0, Math.min(1, s.confidence))
    }

    // Validate categories in reviews
    for (const r of data.existingReview) {
      if (!VALID_CATEGORIES.includes(r.suggestedCategory as typeof VALID_CATEGORIES[number])) {
        r.suggestedCategory = 'OTHER'
      }
    }

    // Log to AIGenerationLog
    await prisma.aIGenerationLog.create({
      data: {
        companyId,
        generationType: 'ebitda_bridge',
        inputData: { prompt: prompt.slice(0, 2000) },
        outputData: data as object,
        modelUsed: 'claude-sonnet',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs,
      },
    })

    return data
  } catch (error) {
    const latencyMs = Date.now() - startTime

    // Log error
    await prisma.aIGenerationLog.create({
      data: {
        companyId,
        generationType: 'ebitda_bridge',
        modelUsed: 'claude-sonnet',
        latencyMs,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    })

    throw error
  }
}
