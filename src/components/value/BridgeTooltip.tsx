'use client'

interface BridgeTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: {
      label: string
      score: number
      dollarImpact: number
      buyerExplanation: string
    }
  }>
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

export function BridgeTooltip({ active, payload }: BridgeTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 max-w-[260px]">
      <div className="font-semibold text-foreground text-sm">
        {data.label}: {data.score}/100
      </div>
      <div className="text-primary font-bold text-sm mt-1">
        Costing you ~{formatCurrency(data.dollarImpact)}
      </div>
      <div className="text-muted-foreground text-xs mt-1 italic">
        &ldquo;{data.buyerExplanation}&rdquo;
      </div>
    </div>
  )
}
