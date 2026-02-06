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
      <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-4">
        <div className="flex items-center gap-2 text-emerald-600 mb-1">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Recovered</span>
        </div>
        <p className="text-xl font-semibold text-emerald-700 tabular-nums">
          {recoveredDisplay}
        </p>
      </div>
      <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-4">
        <div className="flex items-center gap-2 text-amber-600 mb-1">
          <TrendingDown className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">At Risk</span>
        </div>
        <p className="text-xl font-semibold text-amber-700 tabular-nums">
          {atRiskDisplay}
        </p>
      </div>
      <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4">
        <div className="flex items-center gap-2 text-zinc-500 mb-1">
          <Activity className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Events</span>
        </div>
        <p className="text-xl font-semibold text-zinc-800 tabular-nums">
          {entryCount}
        </p>
      </div>
    </div>
  )
}
