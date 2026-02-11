/**
 * Value-at-Risk Aggregation Module (PROD-022)
 *
 * Pure functions for computing value-at-risk from signals. No database calls,
 * no side effects. All data is passed in and results returned, making everything
 * fully testable without mocking.
 *
 * Three concerns:
 *
 * 1. **Aggregation**: Sum confidence-weighted value impacts across active signals,
 *    both in total and per BRI category.
 *
 * 2. **Top Threats**: Extract the N highest-impact signals for prominent display.
 *
 * 3. **Trend**: Compare current value-at-risk to a historical baseline to determine
 *    whether risk is increasing, decreasing, or stable.
 *
 * Design notes:
 * - All dollar amounts are confidence-weighted using applyConfidenceWeight().
 * - Signals with null estimatedValueImpact are counted but contribute $0 to risk.
 * - Only OPEN signals contribute to active value-at-risk. Other statuses are excluded.
 * - Category breakdown uses the signal's BriCategory field. Signals with null category
 *   are aggregated into an "uncategorized" bucket.
 */

import type { BriCategory, ConfidenceLevel, SignalSeverity } from '@prisma/client'
import { applyConfidenceWeight } from './confidence-scoring'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All BRI categories in canonical order */
export const BRI_CATEGORIES: BriCategory[] = [
  'FINANCIAL',
  'TRANSFERABILITY',
  'OPERATIONAL',
  'MARKET',
  'LEGAL_TAX',
  'PERSONAL',
]

/** Labels for BRI categories */
export const BRI_CATEGORY_LABELS: Record<BriCategory, string> = {
  FINANCIAL: 'Financial Health',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

/** Threshold (as a ratio) for determining trend stability */
export const TREND_STABILITY_THRESHOLD = 0.05

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal signal shape needed for value-at-risk aggregation */
export interface ValueAtRiskSignal {
  id: string
  title: string
  severity: SignalSeverity
  confidence: ConfidenceLevel
  estimatedValueImpact: number | null
  category: BriCategory | null
  createdAt: Date | string
}

/** A single threat entry for top-threats display */
export interface ThreatEntry {
  signalId: string
  title: string
  severity: SignalSeverity
  confidence: ConfidenceLevel
  rawImpact: number
  weightedImpact: number
  category: BriCategory | null
  categoryLabel: string | null
}

/** Per-category value-at-risk breakdown */
export interface CategoryRisk {
  category: BriCategory
  label: string
  /** Number of OPEN signals in this category */
  signalCount: number
  /** Sum of raw (unweighted) impacts in this category */
  rawValueAtRisk: number
  /** Sum of confidence-weighted impacts in this category */
  weightedValueAtRisk: number
}

/** Trend direction for value-at-risk over time */
export type VarTrend = 'increasing' | 'stable' | 'decreasing'

/** Trend metadata */
export interface VarTrendResult {
  direction: VarTrend
  /** Absolute change in confidence-weighted VaR (current - previous) */
  absoluteChange: number
  /** Percentage change relative to previous (null if no previous baseline) */
  percentageChange: number | null
}

/** Complete value-at-risk aggregation result */
export interface ValueAtRiskResult {
  /** Sum of confidence-weighted impacts across all active signals */
  totalValueAtRisk: number
  /** Sum of raw (unweighted) impacts across all active signals */
  rawValueAtRisk: number
  /** Number of active signals contributing to risk */
  signalCount: number
  /** Top N highest-impact signals (weighted), sorted by weightedImpact descending */
  topThreats: ThreatEntry[]
  /** Breakdown of value-at-risk per BRI category */
  byCategory: CategoryRisk[]
  /** Trend information (null if no historical baseline available) */
  trend: VarTrendResult | null
}

// ---------------------------------------------------------------------------
// Core Aggregation
// ---------------------------------------------------------------------------

/**
 * Calculate the confidence-weighted value impact for a single signal.
 * Returns 0 for signals with null estimatedValueImpact.
 * Uses absolute value because value-at-risk is always positive (representing loss potential).
 */
export function getWeightedImpact(signal: ValueAtRiskSignal): number {
  if (signal.estimatedValueImpact == null) return 0
  return Math.abs(applyConfidenceWeight(signal.estimatedValueImpact, signal.confidence))
}

/**
 * Get the raw (unweighted) absolute impact for a signal.
 * Returns 0 for signals with null estimatedValueImpact.
 */
export function getRawImpact(signal: ValueAtRiskSignal): number {
  if (signal.estimatedValueImpact == null) return 0
  return Math.abs(signal.estimatedValueImpact)
}

/**
 * Extract the top N threats from a list of signals, sorted by weighted impact descending.
 * Only includes signals that have a non-null, non-zero estimatedValueImpact.
 *
 * @param signals - Active signals to rank
 * @param limit - Maximum number of threats to return (default: 3)
 * @returns Top threats sorted by weighted impact descending
 */
export function extractTopThreats(
  signals: ValueAtRiskSignal[],
  limit: number = 3
): ThreatEntry[] {
  return signals
    .filter(s => s.estimatedValueImpact != null && s.estimatedValueImpact !== 0)
    .map(s => ({
      signalId: s.id,
      title: s.title,
      severity: s.severity,
      confidence: s.confidence,
      rawImpact: getRawImpact(s),
      weightedImpact: getWeightedImpact(s),
      category: s.category,
      categoryLabel: s.category ? BRI_CATEGORY_LABELS[s.category] : null,
    }))
    .sort((a, b) => b.weightedImpact - a.weightedImpact)
    .slice(0, limit)
}

/**
 * Aggregate value-at-risk per BRI category.
 *
 * Returns an entry for every BRI category, even if no signals exist for that category.
 * Categories with no signals will have signalCount=0 and $0 risk.
 *
 * @param signals - Active signals to aggregate
 * @returns Category risk breakdown for all 6 BRI categories
 */
export function aggregateByCategory(signals: ValueAtRiskSignal[]): CategoryRisk[] {
  // Initialize all categories with zero values
  const categoryMap = new Map<BriCategory, { signalCount: number; rawVaR: number; weightedVaR: number }>()
  for (const cat of BRI_CATEGORIES) {
    categoryMap.set(cat, { signalCount: 0, rawVaR: 0, weightedVaR: 0 })
  }

  // Accumulate signal impacts into their categories
  for (const signal of signals) {
    if (signal.category == null) continue // Skip uncategorized signals in per-category breakdown
    const bucket = categoryMap.get(signal.category)
    if (!bucket) continue // Safety check for unknown categories
    bucket.signalCount += 1
    bucket.rawVaR += getRawImpact(signal)
    bucket.weightedVaR += getWeightedImpact(signal)
  }

  return BRI_CATEGORIES.map(cat => {
    const bucket = categoryMap.get(cat)!
    return {
      category: cat,
      label: BRI_CATEGORY_LABELS[cat],
      signalCount: bucket.signalCount,
      rawValueAtRisk: bucket.rawVaR,
      weightedValueAtRisk: bucket.weightedVaR,
    }
  })
}

/**
 * Calculate the trend of value-at-risk by comparing current VaR to a historical baseline.
 *
 * Trend logic:
 * - If current > previous by more than TREND_STABILITY_THRESHOLD (5%), trend is "increasing" (risk growing)
 * - If current < previous by more than TREND_STABILITY_THRESHOLD (5%), trend is "decreasing" (risk shrinking)
 * - Otherwise, "stable"
 *
 * @param currentWeightedVaR - Current total confidence-weighted VaR
 * @param previousWeightedVaR - Previous total confidence-weighted VaR (null if no history)
 * @returns Trend result, or null if no historical baseline
 */
export function calculateVarTrend(
  currentWeightedVaR: number,
  previousWeightedVaR: number | null
): VarTrendResult | null {
  if (previousWeightedVaR == null) return null

  const absoluteChange = currentWeightedVaR - previousWeightedVaR
  const percentageChange = previousWeightedVaR > 0
    ? absoluteChange / previousWeightedVaR
    : (currentWeightedVaR > 0 ? 1 : 0)

  let direction: VarTrend = 'stable'
  if (percentageChange > TREND_STABILITY_THRESHOLD) {
    direction = 'increasing'
  } else if (percentageChange < -TREND_STABILITY_THRESHOLD) {
    direction = 'decreasing'
  }

  return {
    direction,
    absoluteChange,
    percentageChange,
  }
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

/**
 * Execute the full value-at-risk aggregation pipeline.
 *
 * This is the main entry point. It:
 * 1. Calculates total raw and confidence-weighted VaR
 * 2. Extracts top N threats (default 3)
 * 3. Aggregates risk per BRI category
 * 4. Calculates trend if historical baseline is provided
 *
 * All signals passed in should already be filtered to OPEN status.
 * The function does not filter by resolution status -- that is the caller's responsibility.
 *
 * @param signals - OPEN signals to aggregate
 * @param previousWeightedVaR - Previous period's weighted VaR for trend calculation (null if unavailable)
 * @param topThreatsLimit - Maximum number of top threats to return (default: 3)
 * @returns Complete value-at-risk aggregation result
 */
export function calculateValueAtRisk(
  signals: ValueAtRiskSignal[],
  previousWeightedVaR: number | null = null,
  topThreatsLimit: number = 3
): ValueAtRiskResult {
  // Total aggregation
  let totalWeighted = 0
  let totalRaw = 0
  for (const signal of signals) {
    totalWeighted += getWeightedImpact(signal)
    totalRaw += getRawImpact(signal)
  }

  // Top threats
  const topThreats = extractTopThreats(signals, topThreatsLimit)

  // Per-category breakdown
  const byCategory = aggregateByCategory(signals)

  // Trend
  const trend = calculateVarTrend(totalWeighted, previousWeightedVaR)

  return {
    totalValueAtRisk: totalWeighted,
    rawValueAtRisk: totalRaw,
    signalCount: signals.length,
    topThreats,
    byCategory,
    trend,
  }
}
