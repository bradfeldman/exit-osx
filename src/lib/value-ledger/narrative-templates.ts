import type { LedgerEventType, BriCategory } from '@prisma/client'

const BRI_CATEGORY_DISPLAY: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operational',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal',
}

function formatDollars(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount.toFixed(0)}`
}

interface NarrativeParams {
  eventType: LedgerEventType
  title?: string
  category?: BriCategory | null
  deltaValueRecovered?: number
  deltaValueAtRisk?: number
  briScoreBefore?: number | null
  briScoreAfter?: number | null
  daysSinceUpdate?: number
  description?: string
}

export function generateNarrative(params: NarrativeParams): string {
  const {
    eventType,
    title,
    category,
    deltaValueRecovered = 0,
    deltaValueAtRisk = 0,
    briScoreBefore,
    briScoreAfter,
    daysSinceUpdate,
    description,
  } = params

  const catLabel = category ? BRI_CATEGORY_DISPLAY[category] ?? category : ''

  switch (eventType) {
    case 'TASK_COMPLETED':
      if (deltaValueRecovered > 0) {
        return `Completed '${title}' — recovered ~${formatDollars(deltaValueRecovered)} in buyer-perceived value`
      }
      return `Completed '${title}' in ${catLabel}`

    case 'DRIFT_DETECTED':
      return `${catLabel} data is ${daysSinceUpdate ?? '?'} days stale — ~${formatDollars(deltaValueAtRisk)} at risk`

    case 'SIGNAL_CONFIRMED':
      if (deltaValueRecovered > 0) {
        return `Confirmed: ${description ?? title} — recovered ~${formatDollars(deltaValueRecovered)}`
      }
      if (deltaValueAtRisk > 0) {
        return `Confirmed: ${description ?? title} — ~${formatDollars(deltaValueAtRisk)} at risk`
      }
      return `Confirmed: ${description ?? title}`

    case 'ASSESSMENT_COMPLETED':
      if (briScoreBefore != null && briScoreAfter != null) {
        const before = (Number(briScoreBefore) * 100).toFixed(1)
        const after = (Number(briScoreAfter) * 100).toFixed(1)
        return `Assessment updated — BRI moved from ${before} to ${after}`
      }
      return 'Assessment updated'

    case 'REGRESSION_DETECTED':
      return `Regression detected in ${catLabel} — ~${formatDollars(deltaValueAtRisk)} at risk`

    case 'BENCHMARK_SHIFT':
      return `Industry benchmark shift detected — ${description ?? 'valuation recalculated'}`

    case 'NEW_DATA_CONNECTED':
      return `New data connected: ${description ?? title} — improving valuation accuracy`

    case 'SNAPSHOT_CREATED':
      return `Valuation snapshot created — ${description ?? 'progress captured'}`

    default:
      return description ?? title ?? 'Value ledger event recorded'
  }
}
