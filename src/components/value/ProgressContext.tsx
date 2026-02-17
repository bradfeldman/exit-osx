'use client'

import { TrendingUp, AlertTriangle, Target } from 'lucide-react'
import { useCountUpCurrency } from '@/hooks/useCountUp'

interface ProgressContextProps {
  valueRecoveredLifetime: number
  valueAtRiskCurrent: number
  openSignalCount: number
  valueRecoveredThisMonth: number
  valueAtRiskThisMonth: number
  valueGap: number
  valueGapDelta: number | null
}

function formatCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function ProgressContext({
  valueRecoveredLifetime,
  valueAtRiskCurrent,
  openSignalCount,
  valueRecoveredThisMonth,
  valueGap,
  valueGapDelta,
}: ProgressContextProps) {
  const { value: recoveredDisplay } = useCountUpCurrency(valueRecoveredLifetime)
  const { value: atRiskDisplay } = useCountUpCurrency(valueAtRiskCurrent)
  const { value: gapDisplay } = useCountUpCurrency(valueGap)

  const monthlyRecoveredText = valueRecoveredThisMonth > 0
    ? `+${formatCompact(valueRecoveredThisMonth)}/mo`
    : 'No change this month'

  const signalText = openSignalCount === 1
    ? '1 open signal'
    : `${openSignalCount} open signals`

  const gapDeltaText = valueGapDelta !== null && valueGapDelta !== 0
    ? `${valueGapDelta < 0 ? '\u2193' : '\u2191'}${formatCompact(Math.abs(valueGapDelta))}/mo`
    : 'No change'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {/* Recovered */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Recovered</span>
        </div>
        <p className="text-2xl font-semibold text-emerald-700 tracking-tight mt-2">
          {recoveredDisplay}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {monthlyRecoveredText}
        </p>
      </div>

      {/* At Risk */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">At Risk</span>
        </div>
        <p className="text-2xl font-semibold text-amber-700 tracking-tight mt-2">
          {atRiskDisplay}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {valueAtRiskCurrent > 0 ? signalText : 'No open signals'}
        </p>
      </div>

      {/* Gap Remaining */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100">
            <Target className="h-4 w-4 text-zinc-600" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Gap Remaining</span>
        </div>
        <p className="text-2xl font-semibold text-foreground tracking-tight mt-2">
          {gapDisplay}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {valueGapDelta !== null && valueGapDelta < 0 ? (
            <span className="text-emerald-600">{gapDeltaText}</span>
          ) : (
            gapDeltaText
          )}
        </p>
      </div>
    </div>
  )
}
