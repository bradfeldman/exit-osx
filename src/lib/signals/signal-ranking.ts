/**
 * Signal Ranking, Grouping & Fatigue Prevention (PROD-021)
 *
 * This module is **pure** -- no database calls, no side effects. All functions
 * take data in and return results out, making them fully testable without mocking.
 *
 * Three concerns:
 *
 * 1. **Ranking**: Signals are ranked by a composite score of severity, confidence,
 *    and absolute value impact. This determines display priority.
 *
 * 2. **Grouping**: Related signals (same eventType or same category+channel) are
 *    collapsed into a single display entry to prevent fatigue. The group's rank
 *    is driven by its highest-ranked member.
 *
 * 3. **Display limits**: Only the top N groups (default 3) are shown prominently.
 *    The rest are accessible but not surface-level.
 *
 * Design notes:
 * - Severity is mapped to a numeric weight (INFO=1..CRITICAL=5) so it can be
 *   multiplied with the confidence multiplier and value impact.
 * - Signals with no estimatedValueImpact are still rankable via severity x confidence.
 * - Dismissed signals are included in grouping but deprioritized.
 */

import type { ConfidenceLevel, SignalSeverity, BriCategory, SignalResolutionStatus } from '@prisma/client'
import { CONFIDENCE_MULTIPLIERS, applyConfidenceWeight } from './confidence-scoring'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of signal groups shown prominently on the dashboard */
export const MAX_ACTIVE_DISPLAY_SIGNALS = 3

/** Severity numeric weights for ranking (higher = more important) */
export const SEVERITY_WEIGHTS: Record<SignalSeverity, number> = {
  INFO: 1,
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
  CRITICAL: 5,
}

/**
 * Resolution status multipliers for ranking.
 * OPEN signals are most prominent; DISMISSED signals are heavily deprioritized.
 */
const RESOLUTION_STATUS_MULTIPLIERS: Record<SignalResolutionStatus, number> = {
  OPEN: 1.0,
  ACKNOWLEDGED: 0.9,
  IN_PROGRESS: 0.8,
  RESOLVED: 0.3,
  DISMISSED: 0.1,
  EXPIRED: 0.05,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal signal shape needed for ranking. Matches Prisma Signal fields. */
export interface RankableSignal {
  id: string
  severity: SignalSeverity
  confidence: ConfidenceLevel
  estimatedValueImpact: number | null
  resolutionStatus: SignalResolutionStatus
  eventType: string
  channel: string
  category: BriCategory | null
  title: string
  description?: string | null
  createdAt: Date | string
}

/** A signal with its computed ranking score */
export interface RankedSignal extends RankableSignal {
  /** Composite ranking score. Higher = more important. */
  rankScore: number
  /** Confidence-weighted value impact (null if no raw impact) */
  weightedValueImpact: number | null
}

/** A group of related signals collapsed for display */
export interface SignalGroup {
  /** Unique key for this group */
  groupKey: string
  /** Human-readable title for the group (may be overridden) */
  displayTitle: string
  /** The highest-ranked signal in this group (drives the group's rank) */
  primarySignal: RankedSignal
  /** All signals in this group, ordered by rank */
  signals: RankedSignal[]
  /** Number of signals in this group */
  count: number
  /** Group-level ranking score (from primarySignal) */
  groupRankScore: number
  /** Sum of confidence-weighted value impacts across all signals in group */
  totalWeightedImpact: number
  /** Most severe severity across group members */
  maxSeverity: SignalSeverity
  /** Highest confidence across group members */
  maxConfidence: ConfidenceLevel
}

/** Result of the full ranking + grouping + display-limit pipeline */
export interface SignalRankingResult {
  /** Top groups for prominent display (max MAX_ACTIVE_DISPLAY_SIGNALS) */
  activeDisplayGroups: SignalGroup[]
  /** Remaining groups, accessible but not prominently shown */
  queuedGroups: SignalGroup[]
  /** Total confidence-weighted value at risk across all OPEN signals */
  totalWeightedValueAtRisk: number
  /** Count of all signals processed */
  totalSignalCount: number
}

// ---------------------------------------------------------------------------
// Core Ranking
// ---------------------------------------------------------------------------

/**
 * Calculate a composite ranking score for a single signal.
 *
 * Formula: severity_weight * confidence_multiplier * resolution_multiplier * max(1, abs(weightedValueImpact) / 10000)
 *
 * The value impact term is normalized by $10K so it contributes proportionally
 * without completely dominating severity/confidence. A signal with no value
 * impact uses 1.0 as the value term (effectively: severity * confidence).
 *
 * @param signal - Signal to score
 * @returns Composite ranking score (higher = more important)
 */
export function calculateRankScore(signal: RankableSignal): number {
  const severityWeight = SEVERITY_WEIGHTS[signal.severity]
  const confidenceMultiplier = CONFIDENCE_MULTIPLIERS[signal.confidence] ?? 0.5
  const resolutionMultiplier = RESOLUTION_STATUS_MULTIPLIERS[signal.resolutionStatus] ?? 1.0

  // Value impact factor: normalized so $100K = 10x, $10K = 1x, $0 = 1x
  const rawImpact = signal.estimatedValueImpact != null ? Math.abs(signal.estimatedValueImpact) : 0
  const weightedImpact = rawImpact > 0
    ? Math.abs(applyConfidenceWeight(rawImpact, signal.confidence))
    : 0
  const valueFactor = Math.max(1, weightedImpact / 10000)

  return severityWeight * confidenceMultiplier * resolutionMultiplier * valueFactor
}

/**
 * Calculate the confidence-weighted value impact for a signal.
 * Returns null if the signal has no estimated value impact.
 */
export function calculateWeightedValueImpact(signal: RankableSignal): number | null {
  if (signal.estimatedValueImpact == null) return null
  return applyConfidenceWeight(signal.estimatedValueImpact, signal.confidence)
}

/**
 * Rank an array of signals by composite score (descending).
 *
 * @param signals - Signals to rank
 * @returns Signals with rankScore and weightedValueImpact attached, sorted descending
 */
export function rankSignals(signals: RankableSignal[]): RankedSignal[] {
  return signals
    .map(signal => ({
      ...signal,
      rankScore: calculateRankScore(signal),
      weightedValueImpact: calculateWeightedValueImpact(signal),
    }))
    .sort((a, b) => b.rankScore - a.rankScore)
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/**
 * Determine the grouping key for a signal.
 *
 * Signals are grouped if they share the same eventType. This catches:
 * - Multiple document staleness signals ("time_decay" events)
 * - Multiple drift decline signals ("monthly_drift_decline")
 * - Multiple external signals of the same type
 *
 * Signals with unique event types are placed in their own group.
 *
 * @param signal - Signal to derive group key from
 * @returns Group key string
 */
export function getGroupKey(signal: RankableSignal): string {
  // Primary grouping: by eventType (most semantically meaningful)
  return signal.eventType
}

/**
 * Build a display title for a signal group.
 *
 * For single-signal groups: use the signal's own title.
 * For multi-signal groups: generate a summary title.
 */
function buildGroupTitle(signals: RankedSignal[]): string {
  if (signals.length === 1) return signals[0].title

  // Use the primary signal's title as the base
  const primary = signals[0]

  // Common grouping patterns
  if (primary.eventType.includes('document') || primary.eventType.includes('staleness') || primary.eventType.includes('time_decay')) {
    return `${signals.length} documents need attention`
  }

  if (primary.eventType.includes('drift')) {
    return `${signals.length} drift signals detected`
  }

  if (primary.eventType.includes('disclosure')) {
    return `${signals.length} disclosure findings`
  }

  if (primary.eventType.includes('external')) {
    return `${signals.length} external signals`
  }

  // Default: use primary title with count
  return `${primary.title} (+${signals.length - 1} related)`
}

/**
 * Find the most severe severity in a collection of signals.
 */
function maxSeverity(signals: RankedSignal[]): SignalSeverity {
  const severityOrder: SignalSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
  for (const sev of severityOrder) {
    if (signals.some(s => s.severity === sev)) return sev
  }
  return 'INFO'
}

/**
 * Find the highest confidence level in a collection of signals.
 */
function maxConfidence(signals: RankedSignal[]): ConfidenceLevel {
  const confidenceOrder: ConfidenceLevel[] = ['VERIFIED', 'CONFIDENT', 'SOMEWHAT_CONFIDENT', 'UNCERTAIN', 'NOT_APPLICABLE']
  for (const conf of confidenceOrder) {
    if (signals.some(s => s.confidence === conf)) return conf
  }
  return 'UNCERTAIN'
}

/**
 * Group ranked signals by their event type and build group metadata.
 *
 * @param rankedSignals - Already-ranked signals (descending by score)
 * @returns Signal groups, sorted by the primary signal's rank score
 */
export function groupSignals(rankedSignals: RankedSignal[]): SignalGroup[] {
  const groupMap = new Map<string, RankedSignal[]>()

  for (const signal of rankedSignals) {
    const key = getGroupKey(signal)
    const existing = groupMap.get(key) ?? []
    existing.push(signal)
    groupMap.set(key, existing)
  }

  const groups: SignalGroup[] = []

  for (const [groupKey, signals] of groupMap) {
    // Signals are already sorted by rank within each group
    // because they come from the rankSignals() output
    const primarySignal = signals[0]
    const totalWeightedImpact = signals.reduce(
      (sum, s) => sum + (s.weightedValueImpact ?? 0),
      0
    )

    groups.push({
      groupKey,
      displayTitle: buildGroupTitle(signals),
      primarySignal,
      signals,
      count: signals.length,
      groupRankScore: primarySignal.rankScore,
      totalWeightedImpact,
      maxSeverity: maxSeverity(signals),
      maxConfidence: maxConfidence(signals),
    })
  }

  // Sort groups by their primary signal's rank score (descending)
  return groups.sort((a, b) => b.groupRankScore - a.groupRankScore)
}

// ---------------------------------------------------------------------------
// Full Pipeline
// ---------------------------------------------------------------------------

/**
 * Execute the complete signal ranking, grouping, and display-limit pipeline.
 *
 * This is the main entry point. It:
 * 1. Ranks all signals by composite score
 * 2. Groups related signals to prevent fatigue
 * 3. Splits groups into active display (top N) and queued
 * 4. Calculates aggregate confidence-weighted value at risk
 *
 * @param signals - Raw signals to process
 * @param maxDisplay - Maximum groups to show prominently (default: 3)
 * @returns Complete ranking result with active/queued split
 */
export function processSignalsForDisplay(
  signals: RankableSignal[],
  maxDisplay: number = MAX_ACTIVE_DISPLAY_SIGNALS
): SignalRankingResult {
  if (signals.length === 0) {
    return {
      activeDisplayGroups: [],
      queuedGroups: [],
      totalWeightedValueAtRisk: 0,
      totalSignalCount: 0,
    }
  }

  // Step 1: Rank all signals
  const ranked = rankSignals(signals)

  // Step 2: Group related signals
  const groups = groupSignals(ranked)

  // Step 3: Split into active display and queued
  const activeDisplayGroups = groups.slice(0, maxDisplay)
  const queuedGroups = groups.slice(maxDisplay)

  // Step 4: Calculate total weighted value at risk from OPEN signals only
  const totalWeightedValueAtRisk = ranked
    .filter(s => s.resolutionStatus === 'OPEN')
    .reduce((sum, s) => {
      if (s.weightedValueImpact != null && s.weightedValueImpact > 0) {
        return sum + s.weightedValueImpact
      }
      return sum
    }, 0)

  return {
    activeDisplayGroups,
    queuedGroups,
    totalWeightedValueAtRisk,
    totalSignalCount: signals.length,
  }
}

// ---------------------------------------------------------------------------
// Confidence-Weighted Aggregation (for dashboard / drift)
// ---------------------------------------------------------------------------

/**
 * Calculate total confidence-weighted value at risk from a set of signals.
 *
 * This replaces naive `SUM(estimatedValueImpact)` with confidence-adjusted sums.
 * Used by the dashboard API and drift report to provide a more accurate
 * risk picture.
 *
 * @param signals - Signals to aggregate (typically OPEN signals)
 * @returns Total confidence-weighted value at risk
 */
export function calculateWeightedValueAtRisk(
  signals: Array<{ estimatedValueImpact: number | null; confidence: ConfidenceLevel }>
): number {
  return signals.reduce((sum, signal) => {
    if (signal.estimatedValueImpact == null) return sum
    const rawImpact = Math.abs(signal.estimatedValueImpact)
    const weighted = applyConfidenceWeight(rawImpact, signal.confidence)
    return sum + weighted
  }, 0)
}
