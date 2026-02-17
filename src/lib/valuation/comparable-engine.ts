// Comparable Company Engine
// PROD-004: Investment-banker-grade comparable company identification
// using AI (claude-sonnet) to find 3-5 closest public comparable companies,
// then computing relevance-weighted multiple ranges.
//
// This module is the first step in the comparables pipeline:
//   1. findComparables() - Identify comparable companies via AI
//   2. adjustMultiples() - Apply company-specific adjustments (multiple-adjustments.ts)
//   3. calculateMultipleRange() - Produce final multiple ranges with audit trail

import { generateJSON } from '@/lib/ai/anthropic'

// =============================================================================
// Types
// =============================================================================

/**
 * Input profile used to identify comparable companies.
 * All monetary values are in USD. Growth rates and margins are decimals (e.g., 0.15 = 15%).
 */
export interface CompanyProfile {
  /** Company name (used for context, not matching) */
  name: string
  /** Industry classification (ICB sub-sector or free text) */
  industry: string
  /** Full industry path for more context (e.g., "Technology / Software / Enterprise SaaS") */
  industryPath?: string
  /** Annual revenue in USD */
  revenue: number
  /** Revenue size category (e.g., 'FROM_1M_TO_3M') */
  revenueSizeCategory?: string
  /** YoY revenue growth rate as decimal (e.g., 0.15 = 15%). null if unknown. */
  revenueGrowthRate: number | null
  /** EBITDA margin as decimal (e.g., 0.20 = 20%). null if not meaningful (negative EBITDA). */
  ebitdaMargin: number | null
  /** Revenue model type */
  revenueModel?: string
  /** Whether revenue is primarily recurring */
  isRecurringRevenue?: boolean
  /** Customer concentration description (e.g., "Top 3 customers = 60% of revenue") */
  customerConcentration?: string
  /** Geographic focus (e.g., "US domestic", "North America", "Global") */
  geography?: string
  /** Free-text business description for AI context */
  businessDescription?: string
}

/**
 * A single comparable company returned by the AI engine.
 */
export interface ComparableCompany {
  /** Company name */
  name: string
  /** Stock ticker if publicly traded, null for private comps */
  ticker: string | null
  /** Plain-English explanation of why this company is comparable */
  rationale: string
  /** Key financial metrics */
  metrics: ComparableMetrics
  /** Relevance score from 0 to 1, where 1 = perfect match */
  relevanceScore: number
}

/**
 * Financial metrics for a comparable company.
 * All monetary values are in USD millions for readability.
 * Rates and margins are decimals (e.g., 0.15 = 15%).
 */
export interface ComparableMetrics {
  /** Annual revenue in USD (full dollar amount, not millions) */
  revenue: number | null
  /** EBITDA margin as decimal */
  ebitdaMargin: number | null
  /** YoY revenue growth rate as decimal */
  revenueGrowthRate: number | null
  /** EV/EBITDA trading multiple */
  evToEbitda: number | null
  /** EV/Revenue trading multiple */
  evToRevenue: number | null
}

/**
 * Complete result from the comparable engine, including AI-identified companies
 * and relevance-weighted base multiples.
 */
export interface ComparableResult {
  /** List of comparable companies, ordered by relevance (highest first) */
  comparables: ComparableCompany[]
  /** Relevance-weighted median EV/EBITDA from comparables (null if insufficient data) */
  weightedEbitdaMultiple: number | null
  /** Relevance-weighted median EV/Revenue from comparables (null if insufficient data) */
  weightedRevenueMultiple: number | null
  /** AI usage metadata */
  aiUsage: {
    inputTokens: number
    outputTokens: number
    model: string
  }
  /** Timestamp of when the analysis was performed */
  analyzedAt: string
  /** Any warnings or caveats from the analysis */
  warnings: string[]
}

// =============================================================================
// AI Prompt Construction
// =============================================================================

/**
 * System prompt that sets up the AI as an investment banking analyst.
 * This is critical for quality -- the AI needs to behave like a professional
 * who understands M&A valuation, not a general assistant.
 */
const COMPARABLE_SYSTEM_PROMPT = `You are a senior investment banking analyst specializing in middle-market M&A valuation. Your task is to identify the most relevant comparable public companies for a private company being valued.

CRITICAL RULES:
1. Select 3-5 comparable companies that a sophisticated buyer or investment banker would consider relevant.
2. Prioritize companies that match on: (a) business model, (b) end market, (c) revenue scale, (d) growth profile, (e) margin structure.
3. For SMBs (revenue < $25M), look for the closest public comparables even if they are larger -- buyers use these as anchors and then apply size discounts.
4. Include at least one "closest match" and at least one "aspirational" comp (what the company could trade like at scale).
5. All financial metrics must be your best estimate of current/recent values. If you are uncertain about a specific metric, use null rather than guessing.
6. Relevance scores should reflect how closely the comparable matches the subject company:
   - 0.8-1.0: Very close match (same business model, similar size, same end market)
   - 0.6-0.8: Good match (similar business model, different size or geography)
   - 0.4-0.6: Moderate match (related industry, different business model or scale)
   - 0.2-0.4: Weak match (broad industry similarity only)
7. EV/EBITDA multiples for SMBs typically range 3x-8x. Public company multiples are often higher (8x-15x+) and need size adjustment (handled separately).
8. EV/Revenue multiples depend heavily on growth and margins. SaaS companies trade at 3x-15x+ revenue; traditional businesses at 0.5x-2x.

RESPONSE FORMAT: Return a JSON object with this exact structure:
{
  "comparables": [
    {
      "name": "Company Name",
      "ticker": "TICK",
      "rationale": "Why this company is comparable...",
      "metrics": {
        "revenue": 50000000,
        "ebitdaMargin": 0.22,
        "revenueGrowthRate": 0.15,
        "evToEbitda": 12.5,
        "evToRevenue": 2.8
      },
      "relevanceScore": 0.75
    }
  ],
  "warnings": ["Any caveats about the comparables selection"]
}`

/**
 * Build the user prompt that describes the target company.
 * Provides all available context to the AI for the best comparable selection.
 */
function buildComparablePrompt(profile: CompanyProfile): string {
  const parts: string[] = [
    `Identify 3-5 comparable public companies for the following private company:`,
    ``,
    `Company: ${profile.name}`,
    `Industry: ${profile.industry}`,
  ]

  if (profile.industryPath) {
    parts.push(`Industry Path: ${profile.industryPath}`)
  }

  parts.push(`Annual Revenue: $${formatDollarAmount(profile.revenue)}`)

  if (profile.revenueGrowthRate !== null) {
    parts.push(`Revenue Growth Rate: ${(profile.revenueGrowthRate * 100).toFixed(1)}% YoY`)
  }

  if (profile.ebitdaMargin !== null) {
    parts.push(`EBITDA Margin: ${(profile.ebitdaMargin * 100).toFixed(1)}%`)
  } else {
    parts.push(`EBITDA Margin: Negative or not available`)
  }

  if (profile.revenueModel) {
    const modelLabels: Record<string, string> = {
      PROJECT_BASED: 'Project-based',
      TRANSACTIONAL: 'Transactional',
      RECURRING_CONTRACTS: 'Recurring contracts',
      SUBSCRIPTION_SAAS: 'SaaS / Subscription',
    }
    parts.push(`Revenue Model: ${modelLabels[profile.revenueModel] || profile.revenueModel}`)
  }

  if (profile.isRecurringRevenue !== undefined) {
    parts.push(`Recurring Revenue: ${profile.isRecurringRevenue ? 'Yes' : 'No'}`)
  }

  if (profile.customerConcentration) {
    parts.push(`Customer Concentration: ${profile.customerConcentration}`)
  }

  if (profile.geography) {
    parts.push(`Geography: ${profile.geography}`)
  }

  if (profile.businessDescription) {
    parts.push(``)
    parts.push(`Business Description: ${profile.businessDescription}`)
  }

  parts.push(``)
  parts.push(`Remember: Return 3-5 comparables as JSON. Use null for any metrics you are not confident about. The subject company is a private SMB -- public comparables will be larger, which is expected. Focus on business model and end-market similarity.`)

  return parts.join('\n')
}

// =============================================================================
// Core Engine
// =============================================================================

/**
 * Find comparable public companies using AI analysis.
 *
 * Uses claude-sonnet for quality -- comparable selection is a judgment-heavy task
 * where model quality directly impacts the defensibility of the valuation.
 *
 * @param profile - The subject company's profile
 * @returns ComparableResult with companies, weighted multiples, and audit trail
 *
 * @throws Error if the AI call fails or returns unparseable results
 */
export async function findComparables(profile: CompanyProfile): Promise<ComparableResult> {
  // Validate inputs
  if (!profile.name || profile.name.trim() === '') {
    throw new Error('Company name is required for comparable analysis')
  }
  if (!profile.industry || profile.industry.trim() === '') {
    throw new Error('Industry classification is required for comparable analysis')
  }
  if (profile.revenue < 0) {
    throw new Error('Revenue cannot be negative')
  }

  const prompt = buildComparablePrompt(profile)

  const { data, usage } = await generateJSON<AIComparableResponse>(
    prompt,
    COMPARABLE_SYSTEM_PROMPT,
    {
      model: 'claude-sonnet',
      maxTokens: 4096,
      temperature: 0.3, // Lower temperature for more consistent, factual responses
    }
  )

  // Validate and normalize the AI response
  const comparables = validateAndNormalizeComparables(data.comparables || [])
  const warnings = [...(data.warnings || [])]

  if (comparables.length === 0) {
    warnings.push('AI did not return any valid comparables. Multiple ranges may be unreliable.')
  }

  // Calculate relevance-weighted multiples
  const weightedEbitdaMultiple = calculateWeightedMultiple(
    comparables,
    (c) => c.metrics.evToEbitda
  )
  const weightedRevenueMultiple = calculateWeightedMultiple(
    comparables,
    (c) => c.metrics.evToRevenue
  )

  if (weightedEbitdaMultiple === null && weightedRevenueMultiple === null) {
    warnings.push('Insufficient comparable data to compute weighted multiples.')
  }

  return {
    comparables,
    weightedEbitdaMultiple,
    weightedRevenueMultiple,
    aiUsage: {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      model: 'claude-sonnet',
    },
    analyzedAt: new Date().toISOString(),
    warnings,
  }
}

// =============================================================================
// Weighted Multiple Calculation
// =============================================================================

/**
 * Calculate relevance-weighted average multiple from comparable companies.
 *
 * Uses weighted average (not median) because:
 * 1. Sample size is small (3-5 comps), so median loses too much information
 * 2. Relevance scores already encode the "quality" of each data point
 * 3. This matches how investment bankers typically weight their comp sets
 *
 * @param comparables - List of comparable companies
 * @param extractor - Function to extract the specific multiple from a comparable
 * @returns Weighted average multiple, or null if insufficient data
 */
export function calculateWeightedMultiple(
  comparables: ComparableCompany[],
  extractor: (c: ComparableCompany) => number | null
): number | null {
  // Filter to comparables that have the requested multiple
  const validComps = comparables.filter((c) => {
    const value = extractor(c)
    return value !== null && value > 0 && isFinite(value)
  })

  if (validComps.length === 0) return null

  // Require at least 2 data points for a meaningful weighted average
  if (validComps.length < 2) {
    // With only 1 comp, return it but flag that it's a single data point
    const single = extractor(validComps[0])
    return single
  }

  let weightedSum = 0
  let totalWeight = 0

  for (const comp of validComps) {
    const value = extractor(comp)!
    const weight = comp.relevanceScore
    weightedSum += value * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return null

  return weightedSum / totalWeight
}

// =============================================================================
// Validation & Normalization
// =============================================================================

/** Raw AI response shape (before validation) */
interface AIComparableResponse {
  comparables?: Array<{
    name?: string
    ticker?: string | null
    rationale?: string
    metrics?: {
      revenue?: number | null
      ebitdaMargin?: number | null
      revenueGrowthRate?: number | null
      evToEbitda?: number | null
      evToRevenue?: number | null
    }
    relevanceScore?: number
  }>
  warnings?: string[]
}

/**
 * Validate and normalize comparable companies from AI response.
 * Rejects invalid entries, clamps scores to valid ranges, and sorts by relevance.
 *
 * This is a critical trust boundary -- AI responses can contain:
 * - Missing fields (handled with defaults/nulls)
 * - Out-of-range values (clamped)
 * - Completely invalid entries (rejected)
 */
export function validateAndNormalizeComparables(
  raw: AIComparableResponse['comparables']
): ComparableCompany[] {
  if (!Array.isArray(raw)) return []

  const validated: ComparableCompany[] = []

  for (const entry of raw) {
    // Reject entries without a name (minimum viable comparable)
    if (!entry?.name || typeof entry.name !== 'string' || entry.name.trim() === '') {
      continue
    }

    // Normalize relevance score to 0-1 range
    let relevanceScore = typeof entry.relevanceScore === 'number' ? entry.relevanceScore : 0.5
    relevanceScore = Math.max(0, Math.min(1, relevanceScore))

    // Normalize metrics
    const rawMetrics = entry.metrics || {}
    const metrics: ComparableMetrics = {
      revenue: normalizePositiveNumber(rawMetrics.revenue),
      ebitdaMargin: normalizeDecimalRate(rawMetrics.ebitdaMargin, -1, 1), // Can be negative
      revenueGrowthRate: normalizeDecimalRate(rawMetrics.revenueGrowthRate, -1, 5), // -100% to 500%
      evToEbitda: normalizePositiveNumber(rawMetrics.evToEbitda),
      evToRevenue: normalizePositiveNumber(rawMetrics.evToRevenue),
    }

    // Sanity-check multiples: reject obviously wrong values
    if (metrics.evToEbitda !== null && metrics.evToEbitda > 100) {
      // EV/EBITDA > 100x is almost certainly an error
      metrics.evToEbitda = null
    }
    if (metrics.evToRevenue !== null && metrics.evToRevenue > 50) {
      // EV/Revenue > 50x is almost certainly an error
      metrics.evToRevenue = null
    }

    validated.push({
      name: entry.name.trim(),
      ticker: typeof entry.ticker === 'string' ? entry.ticker.trim().toUpperCase() : null,
      rationale: typeof entry.rationale === 'string' ? entry.rationale.trim() : 'No rationale provided',
      metrics,
      relevanceScore,
    })
  }

  // Sort by relevance score (highest first)
  validated.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Cap at 5 comparables (the prompt asks for 3-5, but enforce an upper bound)
  return validated.slice(0, 5)
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize a value that should be a positive number.
 * Returns null if the value is not a valid positive finite number.
 */
function normalizePositiveNumber(value: unknown): number | null {
  if (typeof value !== 'number') return null
  if (!isFinite(value)) return null
  if (value <= 0) return null
  return value
}

/**
 * Normalize a decimal rate (e.g., margin, growth rate).
 * Returns null if invalid. Clamps to [min, max].
 *
 * AI sometimes returns percentages (e.g., 22 instead of 0.22).
 * Only auto-corrects when the value is outside the valid range AND
 * dividing by 100 would bring it into range. This avoids destroying
 * legitimate high values (e.g., 1.5 = 150% growth).
 */
function normalizeDecimalRate(
  value: unknown,
  min: number,
  max: number
): number | null {
  if (typeof value !== 'number') return null
  if (!isFinite(value)) return null

  let normalized = value

  // Only auto-correct if value is outside valid range and looks like a percentage
  if ((normalized > max || normalized < min) && Math.abs(normalized) <= 100) {
    const asDecimal = normalized / 100
    if (asDecimal >= min && asDecimal <= max) {
      normalized = asDecimal
    }
  }

  return Math.max(min, Math.min(max, normalized))
}

/**
 * Format a dollar amount for display in prompts.
 * Examples: 500000 -> "500K", 2500000 -> "2.5M", 150000000 -> "150M"
 */
function formatDollarAmount(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B`
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`
  }
  return amount.toFixed(0)
}

// Export for testing
export { formatDollarAmount, normalizeDecimalRate, normalizePositiveNumber }
