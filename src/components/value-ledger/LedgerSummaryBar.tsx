'use client'

import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { useCountUpCurrency } from '@/hooks/useCountUp'

interface LedgerSummaryBarProps {
  totalRecovered: number
  totalAtRisk: number
  entryCount: number
}

export function LedgerSummaryBar({ totalRecovered, totalAtRisk, entryCount }: LedgerSummaryBarProps) {
  const { value: recoveredDisplay } = useCountUpCurrency(totalRecovered)
  const { value: atRiskDisplay } = useCountUpCurrency(totalAtRisk)

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-xl bg-green-light/50 border border-green-light p-4">
        <div className="flex items-center gap-2 text-green-dark mb-1">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Recovered</span>
        </div>
        <p className="text-xl font-semibold text-green-dark tabular-nums">
          {recoveredDisplay}
        </p>
      </div>
      <div className="rounded-xl bg-orange-light/50 border border-orange-light p-4">
        <div className="flex items-center gap-2 text-orange-dark mb-1">
          <TrendingDown className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">At Risk</span>
        </div>
        <p className="text-xl font-semibold text-orange-dark tabular-nums">
          {atRiskDisplay}
        </p>
      </div>
      <div className="rounded-xl bg-muted border border-border p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Activity className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Events</span>
        </div>
        <p className="text-xl font-semibold text-foreground tabular-nums">
          {entryCount}
        </p>
      </div>
    </div>
  )
}
