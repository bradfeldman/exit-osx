'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatPercent, formatCurrency } from '@/lib/valuation/dcf-calculator'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface GrowthAssumptionsProps {
  baseFCF: number
  growthRates: Record<string, number>
  onGrowthRateChange: (year: string, value: number) => void
  onBaseFCFChange: (value: number) => void
  fcfIsEstimated?: boolean
}

const YEARS = ['year1', 'year2', 'year3', 'year4', 'year5']

// Custom tooltip for chart - must be defined outside component
function FCFTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { year: string; fcf: number; growth: number } }> }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
        <p className="text-sm font-medium">{data.year}</p>
        <p className="text-sm text-gray-600">FCF: {formatCurrency(data.fcf)}</p>
        <p className="text-sm text-gray-600">Growth: {formatPercent(data.growth)}</p>
      </div>
    )
  }
  return null
}

function TextNumericInput({
  id,
  value,
  onCommit,
  multiplier = 1,
  decimals = 1,
  className,
  placeholder,
}: {
  id?: string
  value: number | null
  onCommit: (value: number | null) => void
  multiplier?: number
  decimals?: number
  className?: string
  placeholder?: string
}) {
  const [text, setText] = useState(() =>
    value === null ? '' : (value * multiplier).toFixed(decimals)
  )
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) {
      setText(value === null ? '' : (value * multiplier).toFixed(decimals))
    }
  }, [value, focused, multiplier, decimals])

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const v = e.target.value
        if (v === '' || /^-?\d*\.?\d*$/.test(v)) setText(v)
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        if (text !== '') {
          const num = parseFloat(text)
          if (!isNaN(num)) onCommit(num / multiplier)
        } else {
          onCommit(null)
        }
      }}
      placeholder={placeholder}
      className={className}
    />
  )
}

export function GrowthAssumptions({
  baseFCF,
  growthRates,
  onGrowthRateChange,
  onBaseFCFChange,
  fcfIsEstimated,
}: GrowthAssumptionsProps) {
  // Calculate projected FCF for chart
  const projectedData = YEARS.reduce(
    (acc, year, index) => {
      const prevFCF = index === 0 ? baseFCF : acc[index - 1].fcf
      const growth = growthRates[year] || 0
      const fcf = prevFCF * (1 + growth)
      acc.push({
        year: `Year ${index + 1}`,
        fcf,
        growth,
      })
      return acc
    },
    [] as { year: string; fcf: number; growth: number }[]
  )

  // Auto-fill with linear decline
  const applyLinearDecline = () => {
    const startRate = growthRates.year1 || 0.05
    const endRate = 0.02 // End at 2%
    const step = (startRate - endRate) / 4

    YEARS.forEach((year, index) => {
      onGrowthRateChange(year, startRate - step * index)
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-medium text-gray-900">Growth Assumptions</CardTitle>
          <Button variant="outline" size="sm" onClick={applyLinearDecline} className="text-xs">
            Linear Decline
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Base FCF Input */}
        <div className="space-y-2">
          <Label htmlFor="baseFCF" className="text-sm text-gray-700">
            Base Free Cash Flow (Year 0)
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">$</span>
            <TextNumericInput
              id="baseFCF"
              value={baseFCF}
              onCommit={(v) => onBaseFCFChange(v ?? 0)}
              multiplier={1}
              decimals={0}
              className="flex-1"
            />
          </div>
          {fcfIsEstimated && (
            <p className="text-xs text-amber-600 mt-1">
              Estimated from your revenue and industry benchmarks. Add detailed financials for a more accurate figure.
            </p>
          )}
        </div>

        {/* Growth Rate Inputs */}
        <div className="space-y-4">
          <Label className="text-sm text-gray-700">FCF Growth Rates</Label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {YEARS.map((year, index) => (
              <div key={year} className="space-y-2">
                <Label htmlFor={year} className="text-xs text-gray-500">
                  Year {index + 1}
                </Label>
                <div className="flex flex-col gap-2">
                  <TextNumericInput
                    id={year}
                    value={growthRates[year] || 0}
                    onCommit={(v) => onGrowthRateChange(year, v ?? 0)}
                    multiplier={100}
                    decimals={1}
                    className="text-sm h-8 text-center min-w-0"
                  />
                  <span className="text-xs text-gray-400 text-center">%</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* FCF Projection Chart */}
        <div className="pt-4">
          <Label className="text-sm text-gray-700 mb-3 block">Projected FCF Trajectory</Label>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[{ year: 'Base', fcf: baseFCF, growth: 0 }, ...projectedData]}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip content={<FCFTooltip />} />
                <Area
                  type="monotone"
                  dataKey="fcf"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
