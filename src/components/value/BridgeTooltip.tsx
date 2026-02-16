'use client'

import { formatCurrency } from '@/lib/utils/currency'

interface BridgeTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: {
      category: string
      label: string
      score: number
      dollarImpact: number
      buyerExplanation: string
    }
  }>
}

export function BridgeTooltip({ active, payload }: BridgeTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  const isCoreStructure = data.category === 'CORE_STRUCTURE'

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 max-w-[280px]">
      <div className="font-semibold text-foreground text-sm">
        {data.label}{isCoreStructure ? ` — Core Score: ${data.score}%` : `: ${data.score}/100`}
      </div>
      <div className={`font-bold text-sm mt-1 ${data.dollarImpact === 0 ? 'text-emerald-600' : 'text-primary'}`}>
        {data.dollarImpact === 0 ? 'No discount — strong here' : `Costing you ~${formatCurrency(data.dollarImpact)}`}
      </div>
      {data.buyerExplanation && (
        <div className="text-muted-foreground text-xs mt-1 italic">
          &ldquo;{data.buyerExplanation}&rdquo;
        </div>
      )}
      {isCoreStructure && (
        <div className="text-muted-foreground text-[11px] mt-1.5 border-t border-border pt-1.5">
          Improve by changing revenue model, reducing owner involvement, or improving margins.
        </div>
      )}
    </div>
  )
}
