/**
 * Business Classification Engine (PROD-002)
 *
 * Hybrid rules + AI system for classifying businesses from freeform descriptions.
 *
 * Architecture:
 * 1. RULES LAYER: Keyword-based pre-classification for known patterns (fast, deterministic)
 * 2. AI LAYER: Claude Haiku for nuanced classification with explanation
 * 3. FALLBACK: Keyword match if AI fails, then default to Professional Services
 *
 * The classifier returns ICB codes that match the existing industry data hierarchy,
 * ensuring compatibility with the IndustryMultiple table and valuation calculations.
 */

import { generateJSON } from '@/lib/ai/anthropic'
import {
  getFlattenedIndustryOptions,
  getFlattenedOptionBySubSector,
  type FlattenedIndustryOption,
} from '@/lib/data/industries'
import { prisma } from '@/lib/prisma'

// ─── Types ──────────────────────────────────────────────────────────────

export interface IndustryClassification {
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
  name: string
  confidence: number // 0-1 scale
}

export interface SuggestedMultipleRange {
  ebitda: { low: number; mid: number; high: number }
  revenue: { low: number; mid: number; high: number }
}

export interface ClassificationResult {
  primaryIndustry: IndustryClassification
  secondaryIndustry: IndustryClassification | null
  explanation: string
  suggestedMultipleRange: SuggestedMultipleRange
  source: 'ai' | 'keyword' | 'default'
}

// ─── Constants ──────────────────────────────────────────────────────────

const MIN_DESCRIPTION_LENGTH = 10
const MAX_DESCRIPTION_LENGTH = 1000

const DEFAULT_MULTIPLES: SuggestedMultipleRange = {
  ebitda: { low: 3.0, mid: 4.5, high: 6.0 },
  revenue: { low: 0.5, mid: 1.0, high: 1.5 },
}

// ─── Keyword Rules Engine ───────────────────────────────────────────────

interface KeywordRule {
  keywords: string[]
  /** Weight multiplier for longer keyword matches */
  icbSubSector: string
  /** Minimum keyword matches required */
  minMatches?: number
}

/**
 * Deterministic keyword rules for common business types.
 * Ordered by specificity: more specific rules first.
 * Each rule maps a set of keywords to an ICB sub-sector code.
 *
 * These serve as:
 * 1. Fast path for obvious classifications (skips AI call)
 * 2. Fallback when AI is unavailable or fails
 * 3. Validation anchor for AI responses
 */
export const KEYWORD_RULES: KeywordRule[] = [
  // Technology - Software
  { keywords: ['saas', 'software as a service', 'cloud software', 'subscription software'], icbSubSector: 'ENTERPRISE_SOFTWARE' },
  { keywords: ['enterprise software', 'business software', 'erp', 'crm software'], icbSubSector: 'ENTERPRISE_SOFTWARE' },
  { keywords: ['mobile app', 'consumer app', 'social media', 'gaming app'], icbSubSector: 'CONSUMER_SOFTWARE' },
  { keywords: ['it consulting', 'it services', 'technology consulting', 'managed service provider', 'msp'], icbSubSector: 'IT_CONSULTING' },
  { keywords: ['data processing', 'data center', 'outsourced services', 'bpo'], icbSubSector: 'DATA_PROCESSING' },

  // Healthcare
  { keywords: ['dental', 'dentist', 'orthodont', 'mouthguard', 'bruxing', 'oral health'], icbSubSector: 'MEDICAL_SUPPLIES_SUB' },
  { keywords: ['medical device', 'medical equipment', 'surgical equipment', 'diagnostic equipment'], icbSubSector: 'MEDICAL_EQUIPMENT_SUB' },
  { keywords: ['medical supplies', 'medical disposable', 'lab supplies'], icbSubSector: 'MEDICAL_SUPPLIES_SUB' },
  { keywords: ['hospital', 'clinic', 'medical practice', 'physician practice', 'urgent care', 'healthcare facility'], icbSubSector: 'HEALTHCARE_FACILITIES' },
  { keywords: ['healthcare management', 'healthcare consulting', 'health plan'], icbSubSector: 'HEALTHCARE_MANAGEMENT' },
  { keywords: ['pharmaceutical', 'pharma', 'drug manufacture'], icbSubSector: 'PHARMA_SUB' },
  { keywords: ['biotech', 'biotechnology', 'gene therapy', 'biologic'], icbSubSector: 'BIOTECH_SUB' },

  // Consumer Discretionary
  { keywords: ['restaurant', 'dining', 'food service', 'cafe', 'bistro', 'catering'], icbSubSector: 'RESTAURANTS' },
  { keywords: ['hotel', 'resort', 'motel', 'lodging', 'hospitality', 'inn'], icbSubSector: 'HOTELS_MOTELS' },
  { keywords: ['advertising', 'ad agency', 'media buying'], icbSubSector: 'ADVERTISING' },
  { keywords: ['marketing', 'pr agency', 'public relations', 'digital marketing', 'seo agency'], icbSubSector: 'MARKETING_PR' },
  { keywords: ['auto repair', 'auto service', 'car repair', 'mechanic', 'body shop', 'collision repair'], icbSubSector: 'AUTO_SERVICE' },
  { keywords: ['auto parts', 'car parts', 'automotive parts'], icbSubSector: 'AUTO_PARTS_SUB' },
  { keywords: ['e-commerce', 'ecommerce', 'online store', 'online retail'], icbSubSector: 'SPECIALTY_STORES' },
  { keywords: ['retail store', 'shop', 'specialty retail', 'brick and mortar'], icbSubSector: 'SPECIALTY_STORES' },
  { keywords: ['home improvement', 'hardware store', 'home depot'], icbSubSector: 'HOME_IMPROVEMENT' },

  // Industrials
  { keywords: ['construction', 'contractor', 'general contractor', 'building', 'renovation'], icbSubSector: 'CONSTRUCTION_SERVICES' },
  { keywords: ['manufacture', 'manufacturing', 'factory', 'production line', 'fabricat'], icbSubSector: 'INDUSTRIAL_MACHINERY' },
  { keywords: ['staffing', 'recruiting', 'employment agency', 'hr services', 'temp agency', 'headhunter'], icbSubSector: 'STAFFING' },
  { keywords: ['professional services', 'consulting firm', 'business consulting', 'management consulting'], icbSubSector: 'PROFESSIONAL_SERVICES' },
  { keywords: ['accounting', 'bookkeeping', 'tax preparation', 'cpa firm', 'audit firm'], icbSubSector: 'PROFESSIONAL_SERVICES' },
  { keywords: ['security services', 'alarm system', 'security guard', 'surveillance'], icbSubSector: 'SECURITY_ALARM' },
  { keywords: ['janitorial', 'cleaning service', 'facility management', 'waste management', 'environmental service'], icbSubSector: 'ENVIRONMENTAL_SERVICES' },
  { keywords: ['printing', 'print shop', 'commercial printing', 'signage'], icbSubSector: 'COMMERCIAL_PRINTING' },
  { keywords: ['trucking', 'freight', 'shipping', 'logistics', 'delivery service', 'courier'], icbSubSector: 'TRUCKING' },

  // Financial Services
  { keywords: ['insurance agency', 'insurance broker', 'insurance agent'], icbSubSector: 'PROPERTY_CASUALTY' },
  { keywords: ['real estate', 'realtor', 'real estate broker', 'property broker'], icbSubSector: 'REAL_ESTATE_BROKERAGE' },
  { keywords: ['property management', 'property manager', 'landlord services'], icbSubSector: 'PROPERTY_MANAGEMENT' },
  { keywords: ['financial advisor', 'wealth management', 'investment advisor', 'asset management'], icbSubSector: 'ASSET_MANAGEMENT' },

  // Food & Beverage
  { keywords: ['brewery', 'brewer', 'craft beer', 'microbrewery'], icbSubSector: 'BREWERS' },
  { keywords: ['distillery', 'winery', 'vineyard', 'wine maker'], icbSubSector: 'DISTILLERS_VINTNERS' },
  { keywords: ['food production', 'food manufacturer', 'packaged food', 'snack'], icbSubSector: 'PACKAGED_FOODS' },

  // Energy
  { keywords: ['solar', 'wind energy', 'renewable energy', 'clean energy'], icbSubSector: 'RENEWABLE_ENERGY' },
  { keywords: ['oil', 'gas', 'petroleum', 'drilling'], icbSubSector: 'OIL_GAS_EXPLORATION' },
]

/**
 * Score a business description against keyword rules.
 * Returns matches sorted by relevance score (highest first).
 *
 * Scoring logic:
 * - Each keyword match adds points equal to the keyword length (longer = more specific)
 * - Multiple keyword matches from the same rule compound the score
 */
export function scoreKeywordMatches(
  description: string
): Array<{ icbSubSector: string; score: number }> {
  const descLower = description.toLowerCase()
  const results: Array<{ icbSubSector: string; score: number }> = []

  for (const rule of KEYWORD_RULES) {
    let score = 0
    let matchCount = 0

    for (const keyword of rule.keywords) {
      if (descLower.includes(keyword)) {
        score += keyword.length
        matchCount++
      }
    }

    const minMatches = rule.minMatches ?? 1
    if (matchCount >= minMatches && score > 0) {
      results.push({ icbSubSector: rule.icbSubSector, score })
    }
  }

  // Sort by score descending, deduplicate by icbSubSector (keep highest)
  results.sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  return results.filter((r) => {
    if (seen.has(r.icbSubSector)) return false
    seen.add(r.icbSubSector)
    return true
  })
}

/**
 * Rules-only classification: keyword matching without AI.
 * Used as fast path and fallback.
 */
export function classifyByKeywords(
  description: string
): { primary: FlattenedIndustryOption | null; secondary: FlattenedIndustryOption | null } {
  const matches = scoreKeywordMatches(description)

  const primary = matches.length > 0
    ? getFlattenedOptionBySubSector(matches[0].icbSubSector) ?? null
    : null

  const secondary = matches.length > 1
    ? getFlattenedOptionBySubSector(matches[1].icbSubSector) ?? null
    : null

  return { primary, secondary }
}

// ─── AI Classification ──────────────────────────────────────────────────

interface AIClassificationResponse {
  primarySubSector: string
  primaryConfidence: number
  secondarySubSector: string | null
  secondaryConfidence: number | null
  explanation: string
}

/**
 * Build a compact industry reference for the AI prompt.
 * Groups sub-sectors by their parent industry for context.
 */
function buildIndustryReference(): string {
  const allIndustries = getFlattenedIndustryOptions()
  const byIndustry = new Map<string, string[]>()

  for (const ind of allIndustries) {
    const existing = byIndustry.get(ind.industryLabel) || []
    existing.push(`${ind.subSectorLabel} [${ind.icbSubSector}]`)
    byIndustry.set(ind.industryLabel, existing)
  }

  let result = ''
  for (const [industry, subSectors] of byIndustry) {
    result += `\n${industry}:\n`
    for (const sub of subSectors) {
      result += `  - ${sub}\n`
    }
  }
  return result
}

const SYSTEM_PROMPT = `You are an industry classification expert for business valuation purposes. You classify SMB (small and medium business) descriptions into the ICB (Industry Classification Benchmark) taxonomy.

Your job:
1. Read the business description carefully
2. Select the BEST matching sub-sector from the provided industry list
3. Optionally select a secondary sub-sector if the business spans multiple industries
4. Provide a brief explanation of why these classifications were chosen
5. Assign confidence scores (0.0 to 1.0) based on how well the description matches

Guidelines:
- Choose the most SPECIFIC sub-sector that fits. If a dental supply company, pick MEDICAL_SUPPLIES_SUB, not HEALTHCARE_FACILITIES.
- Confidence should reflect match quality: 0.9+ for clear fits, 0.6-0.8 for reasonable matches, below 0.6 for uncertain.
- Only include a secondary classification if the business genuinely spans two industries.
- Keep the explanation under 100 words, focused on WHY these classifications fit.
- Return ONLY valid JSON. No markdown code blocks, no extra text.`

/**
 * Classify a business description using Claude Haiku.
 *
 * Returns structured classification with confidence scores and explanation.
 * Validates AI output against the actual industry hierarchy to prevent hallucinated codes.
 */
async function classifyWithAI(
  description: string
): Promise<{
  result: AIClassificationResponse
  usage: { inputTokens: number; outputTokens: number }
}> {
  const industryList = buildIndustryReference()

  const prompt = `Classify this business into the ICB industry taxonomy. Use ONLY sub-sector codes from the list below.

BUSINESS DESCRIPTION:
"${description}"

AVAILABLE SUB-SECTORS:
${industryList}

Return ONLY this JSON structure:
{
  "primarySubSector": "EXACT_CODE_FROM_LIST",
  "primaryConfidence": 0.85,
  "secondarySubSector": null,
  "secondaryConfidence": null,
  "explanation": "Brief explanation of why these classifications fit."
}`

  const { data, usage } = await generateJSON<AIClassificationResponse>(prompt, SYSTEM_PROMPT, {
    model: 'claude-haiku',
    temperature: 0.3,
    maxTokens: 512,
  })

  return { result: data, usage }
}

// ─── Multiple Range Lookup ──────────────────────────────────────────────

/**
 * Look up suggested multiple ranges from the IndustryMultiple table.
 * Falls back to default ranges if no data is available.
 */
async function lookupMultipleRange(icbSubSector: string): Promise<SuggestedMultipleRange> {
  try {
    const multiple = await prisma.industryMultiple.findFirst({
      where: { icbSubSector },
      orderBy: { effectiveDate: 'desc' },
    })

    if (multiple) {
      const ebitdaLow = Number(multiple.ebitdaMultipleLow)
      const ebitdaHigh = Number(multiple.ebitdaMultipleHigh)
      const revenueLow = Number(multiple.revenueMultipleLow)
      const revenueHigh = Number(multiple.revenueMultipleHigh)

      return {
        ebitda: {
          low: ebitdaLow,
          mid: Math.round(((ebitdaLow + ebitdaHigh) / 2) * 100) / 100,
          high: ebitdaHigh,
        },
        revenue: {
          low: revenueLow,
          mid: Math.round(((revenueLow + revenueHigh) / 2) * 100) / 100,
          high: revenueHigh,
        },
      }
    }
  } catch (err) {
    console.error('[BusinessClassifier] Failed to look up multiples:', err)
  }

  return DEFAULT_MULTIPLES
}

// ─── Main Classification Function ───────────────────────────────────────

/**
 * Classify a business from a freeform description.
 *
 * Decision flow:
 * 1. Validate input
 * 2. Try AI classification (Claude Haiku)
 * 3. Validate AI output against known industry codes
 * 4. If AI fails, fall back to keyword matching
 * 5. If keywords fail, default to Professional Services
 * 6. Look up multiple ranges from database
 * 7. Log the AI call to AIGenerationLog
 *
 * @param description - Freeform business description (10-1000 chars)
 * @param companyId - Optional company ID for logging
 * @returns Structured classification result with confidence scores
 */
export async function classifyBusiness(
  description: string,
  companyId?: string
): Promise<ClassificationResult> {
  // ── Input validation ───────────────────────────────────────────────
  if (!description || typeof description !== 'string') {
    throw new ClassificationError('Business description is required', 'INVALID_INPUT')
  }

  const trimmed = description.trim()
  if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
    throw new ClassificationError(
      `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`,
      'DESCRIPTION_TOO_SHORT'
    )
  }

  const sanitized = trimmed.slice(0, MAX_DESCRIPTION_LENGTH)

  // ── Try AI classification ──────────────────────────────────────────
  const startTime = Date.now()
  let aiError: string | null = null

  try {
    const { result: aiResult, usage } = await classifyWithAI(sanitized)

    // Validate primary classification against known codes
    const primaryOption = getFlattenedOptionBySubSector(aiResult.primarySubSector)
    if (!primaryOption) {
      console.warn(
        '[BusinessClassifier] AI returned unknown sub-sector:',
        aiResult.primarySubSector,
        '-- falling back to keywords'
      )
      aiError = `AI returned unknown sub-sector: ${aiResult.primarySubSector}`
      // Fall through to keyword fallback
    } else {
      // Valid AI result
      const primaryClassification = flattenedToClassification(
        primaryOption,
        clampConfidence(aiResult.primaryConfidence)
      )

      // Validate secondary (optional)
      let secondaryClassification: IndustryClassification | null = null
      if (aiResult.secondarySubSector) {
        const secondaryOption = getFlattenedOptionBySubSector(aiResult.secondarySubSector)
        if (secondaryOption) {
          secondaryClassification = flattenedToClassification(
            secondaryOption,
            clampConfidence(aiResult.secondaryConfidence ?? 0.5)
          )
        }
      }

      // Look up multiples
      const multipleRange = await lookupMultipleRange(primaryOption.icbSubSector)

      // Log to AIGenerationLog
      await logClassification({
        companyId,
        description: sanitized,
        result: {
          primary: primaryClassification,
          secondary: secondaryClassification,
          explanation: aiResult.explanation,
          source: 'ai',
        },
        usage,
        latencyMs: Date.now() - startTime,
        error: null,
      })

      return {
        primaryIndustry: primaryClassification,
        secondaryIndustry: secondaryClassification,
        explanation: aiResult.explanation || 'Classification based on business description analysis.',
        suggestedMultipleRange: multipleRange,
        source: 'ai',
      }
    }
  } catch (err) {
    aiError = err instanceof Error ? err.message : 'Unknown AI error'
    console.error('[BusinessClassifier] AI classification failed:', aiError)
  }

  // ── Keyword fallback ───────────────────────────────────────────────
  const { primary, secondary } = classifyByKeywords(sanitized)

  if (primary) {
    const primaryClassification = flattenedToClassification(primary, 0.6)
    const secondaryClassification = secondary
      ? flattenedToClassification(secondary, 0.4)
      : null

    const multipleRange = await lookupMultipleRange(primary.icbSubSector)

    // Log the fallback
    await logClassification({
      companyId,
      description: sanitized,
      result: {
        primary: primaryClassification,
        secondary: secondaryClassification,
        explanation: 'Classification based on keyword matching (AI unavailable).',
        source: 'keyword',
      },
      usage: null,
      latencyMs: Date.now() - startTime,
      error: aiError,
    })

    return {
      primaryIndustry: primaryClassification,
      secondaryIndustry: secondaryClassification,
      explanation: 'Classification based on keyword matching. You can review and adjust if needed.',
      suggestedMultipleRange: multipleRange,
      source: 'keyword',
    }
  }

  // ── Default fallback ───────────────────────────────────────────────
  const defaultOption = getFlattenedOptionBySubSector('PROFESSIONAL_SERVICES')!
  const defaultClassification = flattenedToClassification(defaultOption, 0.2)
  const multipleRange = await lookupMultipleRange('PROFESSIONAL_SERVICES')

  await logClassification({
    companyId,
    description: sanitized,
    result: {
      primary: defaultClassification,
      secondary: null,
      explanation: 'Unable to determine specific classification. Defaulted to Professional Services.',
      source: 'default',
    },
    usage: null,
    latencyMs: Date.now() - startTime,
    error: aiError || 'No keyword match found',
  })

  return {
    primaryIndustry: defaultClassification,
    secondaryIndustry: null,
    explanation:
      'We could not determine a specific industry from your description. Professional Services has been selected as a default. Please review and adjust if needed.',
    suggestedMultipleRange: multipleRange,
    source: 'default',
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function flattenedToClassification(
  option: FlattenedIndustryOption,
  confidence: number
): IndustryClassification {
  return {
    icbIndustry: option.icbIndustry,
    icbSuperSector: option.icbSuperSector,
    icbSector: option.icbSector,
    icbSubSector: option.icbSubSector,
    name: option.subSectorLabel,
    confidence,
  }
}

function clampConfidence(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) return 0.5
  return Math.max(0, Math.min(1, value))
}

async function logClassification(params: {
  companyId?: string
  description: string
  result: {
    primary: IndustryClassification
    secondary: IndustryClassification | null
    explanation: string
    source: string
  }
  usage: { inputTokens: number; outputTokens: number } | null
  latencyMs: number
  error: string | null
}): Promise<void> {
  try {
    await prisma.aIGenerationLog.create({
      data: {
        companyId: params.companyId ?? null,
        generationType: 'business_classification',
        inputData: { description: params.description },
        outputData: JSON.parse(JSON.stringify(params.result ?? {})),
        modelUsed: params.usage ? 'claude-3-5-haiku-latest' : null,
        inputTokens: params.usage?.inputTokens ?? null,
        outputTokens: params.usage?.outputTokens ?? null,
        latencyMs: params.latencyMs,
        errorMessage: params.error,
      },
    })
  } catch (err) {
    // Logging should never block the classification response
    console.error('[BusinessClassifier] Failed to log classification:', err)
  }
}

// ─── Error Type ─────────────────────────────────────────────────────────

export type ClassificationErrorCode =
  | 'INVALID_INPUT'
  | 'DESCRIPTION_TOO_SHORT'
  | 'AI_FAILURE'
  | 'UNKNOWN'

export class ClassificationError extends Error {
  public readonly code: ClassificationErrorCode

  constructor(message: string, code: ClassificationErrorCode) {
    super(message)
    this.name = 'ClassificationError'
    this.code = code
  }
}
