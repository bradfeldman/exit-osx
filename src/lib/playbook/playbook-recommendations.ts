// Playbook Recommendation Engine
// Pure function that scores and ranks 14 pre-built playbooks based on
// DRS category scores, RSS risk discounts, and BQS quality adjustments.
// No database access — all inputs are passed in, all outputs are returned.

import {
  playbookDefinitions,
  type PlaybookDefinition,
  type ScoringTrigger,
} from '../../../prisma/seed-data/playbook-definitions'

// =============================================================================
// Input Types
// =============================================================================

export interface DRSCategoryInput {
  category: string // e.g. 'FINANCIAL', 'TRANSFERABILITY', etc.
  score: number // 0-1
  weight: number
}

export interface RiskDiscountInput {
  name: string // e.g. 'Key-Person Risk', 'Customer Concentration (Single)'
  rate: number // 0-1 (e.g. 0.15 = 15% discount)
  explanation: string
}

export interface QualityAdjustmentInput {
  factor: string // e.g. 'owner_dependency', 'customer_concentration_single'
  name: string
  impact: number // decimal (-0.15 = -15%, 0.10 = +10%)
  category: string
}

export interface CompanyProfile {
  adjustedEbitda: number
  annualRevenue: number
}

export interface RecommendationInputs {
  drsCategories: DRSCategoryInput[]
  riskDiscounts: RiskDiscountInput[]
  qualityAdjustments: QualityAdjustmentInput[]
  companyProfile: CompanyProfile
  activePlaybookSlugs: string[]
}

// =============================================================================
// Output Types
// =============================================================================

export interface SignalContribution {
  source: string
  signal: string
  weight: number
  rawStrength: number
  contribution: number
}

export interface PlaybookRecommendation {
  playbook: PlaybookDefinition
  relevanceScore: number // 0-1
  estimatedImpactLow: number
  estimatedImpactHigh: number
  signalBreakdown: SignalContribution[]
  isRecommended: boolean
}

export interface RecommendationResult {
  recommendations: PlaybookRecommendation[]
  totalAddressableImpact: { low: number; high: number }
  topCategory: string
}

// =============================================================================
// Constants
// =============================================================================

// Maximum expected RSS rate for normalization (~25%)
const RSS_MAX_RATE = 0.25

// Maximum expected BQS negative impact for normalization (~35%)
const BQS_MAX_IMPACT = 0.35

// Deprioritization multiplier for active playbooks
const ACTIVE_DEPRIORITIZATION = 0.5

// Number of playbooks marked as recommended
const TOP_N = 3

// =============================================================================
// Engine
// =============================================================================

/**
 * Build signal strength maps from the three score engines.
 *
 * DRS: category → (1 - score) — lower score = higher gap = stronger signal
 * RSS: discount name → rate / RSS_MAX_RATE — normalized to 0-1
 * BQS: factor → |impact| / BQS_MAX_IMPACT — only negative impacts (problems)
 */
function buildSignalMaps(inputs: RecommendationInputs): {
  drs: Map<string, number>
  rss: Map<string, number>
  bqs: Map<string, number>
} {
  const drs = new Map<string, number>()
  for (const cat of inputs.drsCategories) {
    drs.set(cat.category, Math.max(0, Math.min(1, 1 - cat.score)))
  }

  const rss = new Map<string, number>()
  for (const discount of inputs.riskDiscounts) {
    const normalized = Math.min(1, discount.rate / RSS_MAX_RATE)
    rss.set(discount.name, normalized)
  }

  const bqs = new Map<string, number>()
  for (const adj of inputs.qualityAdjustments) {
    if (adj.impact < 0) {
      const normalized = Math.min(1, Math.abs(adj.impact) / BQS_MAX_IMPACT)
      bqs.set(adj.factor, normalized)
    }
  }

  return { drs, rss, bqs }
}

/**
 * Look up signal strength from the appropriate map.
 * RSS trigger matching uses prefix match to handle variants like
 * "Customer Concentration (Single)" matching trigger "Customer Concentration".
 */
function lookupSignal(
  trigger: ScoringTrigger,
  maps: { drs: Map<string, number>; rss: Map<string, number>; bqs: Map<string, number> }
): number {
  const { source, signal } = trigger

  if (source === 'DRS') {
    return maps.drs.get(signal) ?? 0
  }

  if (source === 'RSS') {
    // Prefix match: "Customer Concentration" matches "Customer Concentration (Single)"
    for (const [key, value] of maps.rss) {
      if (key.startsWith(signal)) {
        return value
      }
    }
    // Also try exact match
    return maps.rss.get(signal) ?? 0
  }

  if (source === 'BQS') {
    // BQS uses factor names which may have _single/_top3 suffixes
    // Try exact match first, then prefix match
    const exact = maps.bqs.get(signal)
    if (exact !== undefined) return exact

    // Prefix match: "customer_concentration" matches "customer_concentration_single"
    for (const [key, value] of maps.bqs) {
      if (key.startsWith(signal)) {
        return value
      }
    }
    return 0
  }

  return 0
}

/**
 * Score a single playbook against the signal maps.
 * Returns relevance score (0-1) and the signal breakdown.
 */
function scorePlaybook(
  playbook: PlaybookDefinition,
  maps: { drs: Map<string, number>; rss: Map<string, number>; bqs: Map<string, number> }
): { relevanceScore: number; signalBreakdown: SignalContribution[] } {
  const signalBreakdown: SignalContribution[] = []
  let relevanceScore = 0

  for (const trigger of playbook.triggers) {
    const rawStrength = lookupSignal(trigger, maps)
    const contribution = rawStrength * trigger.weight
    relevanceScore += contribution

    signalBreakdown.push({
      source: trigger.source,
      signal: trigger.signal,
      weight: trigger.weight,
      rawStrength,
      contribution,
    })
  }

  // Clamp to 0-1
  relevanceScore = Math.max(0, Math.min(1, relevanceScore))

  return { relevanceScore, signalBreakdown }
}

/**
 * Personalize impact range based on company EBITDA.
 * Base values are normalized to $1M EBITDA — scale linearly.
 */
function personalizeImpact(
  playbook: PlaybookDefinition,
  adjustedEbitda: number
): { low: number; high: number } {
  const scaleFactor = Math.max(0, adjustedEbitda) / 1_000_000
  return {
    low: Math.round(playbook.impactBaseLow * scaleFactor),
    high: Math.round(playbook.impactBaseHigh * scaleFactor),
  }
}

/**
 * Main recommendation engine.
 * Pure function — no database access, no side effects.
 */
export function recommendPlaybooks(
  inputs: RecommendationInputs
): RecommendationResult {
  // Step 1: Build signal maps
  const maps = buildSignalMaps(inputs)
  const activeSet = new Set(inputs.activePlaybookSlugs)

  // Step 2: Score each playbook
  const scored: PlaybookRecommendation[] = playbookDefinitions.map(
    (playbook) => {
      const { relevanceScore, signalBreakdown } = scorePlaybook(playbook, maps)
      const impact = personalizeImpact(
        playbook,
        inputs.companyProfile.adjustedEbitda
      )

      return {
        playbook,
        relevanceScore,
        estimatedImpactLow: impact.low,
        estimatedImpactHigh: impact.high,
        signalBreakdown,
        isRecommended: false, // set below
      }
    }
  )

  // Step 3: Sort by relevance (descending), deprioritize active playbooks
  scored.sort((a, b) => {
    const aScore = activeSet.has(a.playbook.slug)
      ? a.relevanceScore * ACTIVE_DEPRIORITIZATION
      : a.relevanceScore
    const bScore = activeSet.has(b.playbook.slug)
      ? b.relevanceScore * ACTIVE_DEPRIORITIZATION
      : b.relevanceScore
    return bScore - aScore
  })

  // Step 4: Mark top N as recommended
  let recommendedCount = 0
  for (const rec of scored) {
    if (recommendedCount < TOP_N && !activeSet.has(rec.playbook.slug)) {
      rec.isRecommended = true
      recommendedCount++
    }
  }

  // Calculate total addressable impact (sum of recommended playbooks)
  const recommended = scored.filter((r) => r.isRecommended)
  const totalAddressableImpact = {
    low: recommended.reduce((sum, r) => sum + r.estimatedImpactLow, 0),
    high: recommended.reduce((sum, r) => sum + r.estimatedImpactHigh, 0),
  }

  // Determine top category (category with highest total relevance)
  const categoryScores = new Map<string, number>()
  for (const rec of scored) {
    const current = categoryScores.get(rec.playbook.category) ?? 0
    categoryScores.set(rec.playbook.category, current + rec.relevanceScore)
  }
  let topCategory = ''
  let topCategoryScore = -1
  for (const [cat, score] of categoryScores) {
    if (score > topCategoryScore) {
      topCategory = cat
      topCategoryScore = score
    }
  }

  return {
    recommendations: scored,
    totalAddressableImpact,
    topCategory,
  }
}
