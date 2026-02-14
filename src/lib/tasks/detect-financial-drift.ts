// Financial Drift Detection — Pure Utility
// Compares a task's stored financial snapshot against current financials
// to detect material changes that warrant re-enrichment.

export interface DriftItem {
  metric: string       // e.g. "Revenue", "EBITDA Margin"
  oldValue: string     // formatted, e.g. "$2.0M"
  newValue: string     // formatted, e.g. "$2.5M"
  direction: 'up' | 'down'
  pctChange: number    // absolute percentage change
}

export interface FinancialDriftResult {
  hasDrift: boolean
  items: DriftItem[]
  enrichedAt: string | null
}

// Thresholds — material change only
const REVENUE_THRESHOLD = 0.05    // 5% change
const EBITDA_THRESHOLD = 0.10     // 10% change
const MARGIN_THRESHOLD = 2        // 2 percentage points

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

function formatMargin(value: number): string {
  return `${value.toFixed(1)}%`
}

function pctChange(oldVal: number, newVal: number): number {
  if (oldVal === 0) return newVal === 0 ? 0 : 100
  return Math.abs((newVal - oldVal) / oldVal) * 100
}

export function detectFinancialDrift(
  snapshot: { revenue: number; ebitda: number; ebitdaMarginPct: number; enrichedAt: string } | undefined,
  current: { revenue: number; ebitda: number; ebitdaMarginPct: number } | null
): FinancialDriftResult {
  if (!snapshot || !current) {
    return { hasDrift: false, items: [], enrichedAt: null }
  }

  const items: DriftItem[] = []

  // Revenue drift
  const revChange = pctChange(snapshot.revenue, current.revenue)
  if (revChange >= REVENUE_THRESHOLD * 100) {
    items.push({
      metric: 'Revenue',
      oldValue: formatCurrency(snapshot.revenue),
      newValue: formatCurrency(current.revenue),
      direction: current.revenue > snapshot.revenue ? 'up' : 'down',
      pctChange: revChange,
    })
  }

  // EBITDA drift
  const ebitdaChange = pctChange(snapshot.ebitda, current.ebitda)
  if (ebitdaChange >= EBITDA_THRESHOLD * 100) {
    items.push({
      metric: 'EBITDA',
      oldValue: formatCurrency(snapshot.ebitda),
      newValue: formatCurrency(current.ebitda),
      direction: current.ebitda > snapshot.ebitda ? 'up' : 'down',
      pctChange: ebitdaChange,
    })
  }

  // Margin drift (absolute percentage point difference)
  const marginDiff = Math.abs(current.ebitdaMarginPct - snapshot.ebitdaMarginPct)
  if (marginDiff >= MARGIN_THRESHOLD) {
    items.push({
      metric: 'EBITDA Margin',
      oldValue: formatMargin(snapshot.ebitdaMarginPct),
      newValue: formatMargin(current.ebitdaMarginPct),
      direction: current.ebitdaMarginPct > snapshot.ebitdaMarginPct ? 'up' : 'down',
      pctChange: marginDiff,
    })
  }

  return {
    hasDrift: items.length > 0,
    items,
    enrichedAt: snapshot.enrichedAt,
  }
}
