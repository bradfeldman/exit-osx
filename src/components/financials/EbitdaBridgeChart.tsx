'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/currency'

export interface WaterfallItem {
  label: string
  base: number
  value: number
  total: number
  fill: string
}

interface EbitdaBridgeChartProps {
  items: WaterfallItem[]
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WaterfallItem }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md">
      <p className="text-sm font-medium text-foreground">{item.label}</p>
      <p className="text-sm text-muted-foreground">
        {item.value >= 0 ? '+' : ''}{formatCurrency(item.value)}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Running total: {formatCurrency(item.total)}
      </p>
    </div>
  )
}

export function EbitdaBridgeChart({ items }: EbitdaBridgeChartProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-center">
        <div>
          <p className="text-sm text-muted-foreground">
            No EBITDA data available yet.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Enter financial data in the P&L tab to see the bridge chart.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={items}
          margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
        >
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <ReferenceLine y={0} stroke="var(--color-border)" />
          {/* Invisible base bar for floating effect */}
          <Bar dataKey="base" stackId="stack" fill="transparent" isAnimationActive={false} />
          {/* Visible value bar */}
          <Bar
            dataKey="value"
            stackId="stack"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={800}
            animationBegin={200}
          >
            {items.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Build waterfall data from EBITDA + adjustments
export function buildWaterfallData(
  reportedEbitda: number,
  ownerCompAdjustment: number,
  adjustments: Array<{ description: string; amount: number; type: string }>
): WaterfallItem[] {
  const items: WaterfallItem[] = []
  let runningTotal = reportedEbitda

  // 1. Reported EBITDA (total bar from zero)
  items.push({
    label: 'Reported EBITDA',
    base: 0,
    value: reportedEbitda,
    total: reportedEbitda,
    fill: 'var(--primary)', // blue
  })

  // 2. Owner Comp Adjustment (if positive)
  if (ownerCompAdjustment > 0) {
    items.push({
      label: 'Owner Comp',
      base: runningTotal,
      value: ownerCompAdjustment,
      total: runningTotal + ownerCompAdjustment,
      fill: 'var(--green)', // green
    })
    runningTotal += ownerCompAdjustment
  }

  // 3. Each adjustment
  for (const adj of adjustments) {
    const amount = adj.type === 'ADD_BACK' ? Math.abs(adj.amount) : -Math.abs(adj.amount)
    const isPositive = amount >= 0

    // Truncate long descriptions
    const label = adj.description.length > 20
      ? adj.description.slice(0, 18) + '...'
      : adj.description

    items.push({
      label,
      base: isPositive ? runningTotal : runningTotal + amount,
      value: Math.abs(amount),
      total: runningTotal + amount,
      fill: isPositive ? 'var(--green)' : 'var(--red)', // green / red
    })
    runningTotal += amount
  }

  // 4. Adjusted EBITDA (total bar from zero)
  items.push({
    label: 'Adjusted EBITDA',
    base: 0,
    value: runningTotal,
    total: runningTotal,
    fill: 'var(--primary)', // blue
  })

  return items
}
