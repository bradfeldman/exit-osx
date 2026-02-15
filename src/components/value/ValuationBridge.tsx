'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { BridgeTooltip } from './BridgeTooltip'

const BRI_CATEGORY_COLORS: Record<string, string> = {
  FINANCIAL: '#3b82f6',
  TRANSFERABILITY: '#22c55e',
  OPERATIONAL: '#eab308',
  MARKET: '#8b5cf6',
  LEGAL_TAX: '#ef4444',
}

interface BridgeCategory {
  category: string
  label: string
  score: number
  dollarImpact: number
  weight: number
  buyerExplanation: string
}

interface ValuationBridgeProps {
  bridgeCategories: BridgeCategory[]
  hasAssessment: boolean
  onCategoryClick?: (category: string) => void
  onAssessmentStart?: () => void
}

export function ValuationBridge({
  bridgeCategories,
  hasAssessment,
  onCategoryClick,
  onAssessmentStart,
}: ValuationBridgeProps) {
  const handleBarClick = (data: BridgeCategory) => {
    onCategoryClick?.(data.category)
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">WHERE YOUR VALUE GAP IS</h2>
        <p className="text-sm text-muted-foreground">
          Each bar shows how much a buyer discounts for that category.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 relative">
        {/* Preview state overlay */}
        {!hasAssessment && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl z-10">
            <p className="text-sm text-muted-foreground mb-3 text-center max-w-xs">
              Based on industry averages. Complete your assessment for a personalized breakdown.
            </p>
            <Button onClick={onAssessmentStart}>Start Assessment →</Button>
          </div>
        )}

        <div className="h-[280px]">
          {bridgeCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bridgeCategories}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 120, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(v)}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-foreground)', fontSize: 13, fontWeight: 500 }}
                  width={110}
                />
                <Tooltip content={<BridgeTooltip />} />
                <Bar
                  dataKey="dollarImpact"
                  radius={[0, 6, 6, 0]}
                  barSize={32}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationBegin={200}
                  onClick={(_data, _index) => {
                    const entry = bridgeCategories[_index]
                    if (entry) handleBarClick(entry)
                  }}
                >
                  {bridgeCategories.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={BRI_CATEGORY_COLORS[entry.category] || '#6b7280'}
                      cursor="pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-sm text-muted-foreground">
                  No value gap data available yet.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Complete your assessment to see where your value gap is.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
