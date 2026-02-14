'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
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
            <Input
              id="baseFCF"
              type="number"
              step={10000}
              value={baseFCF}
              onChange={(e) => onBaseFCFChange(parseFloat(e.target.value) || 0)}
              className="flex-1"
            />
          </div>
          {fcfIsEstimated && (
            <p className="text-xs text-amber-600 mt-1">
              Estimated from EBITDA × 70%. Edit to refine based on actual cash flows.
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
                  <Input
                    id={year}
                    type="number"
                    step={0.1}
                    value={((growthRates[year] || 0) * 100).toFixed(1)}
                    onChange={(e) => onGrowthRateChange(year, parseFloat(e.target.value) / 100 || 0)}
                    className="text-sm h-8 text-center min-w-0"
                  />
                  <span className="text-xs text-gray-400 text-center">%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Individual Sliders */}
          <div className="space-y-3 pt-2">
            {YEARS.map((year, index) => (
              <div key={`slider-${year}`} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-12">Y{index + 1}</span>
                <Slider
                  value={growthRates[year] || 0}
                  onValueChange={(v) => onGrowthRateChange(year, v)}
                  min={-0.1}
                  max={0.2}
                  step={0.005}
                  className="flex-1"
                />
                <span className="text-xs text-gray-600 w-12 text-right">
                  {formatPercent(growthRates[year] || 0, 1)}
                </span>
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
