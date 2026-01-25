'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { type YearlyProjection, formatCurrency } from '@/lib/retirement/retirement-calculator'

interface ProjectionChartProps {
  projections: YearlyProjection[]
  retirementAge: number
  currentAge: number
}

// Custom tooltip component defined outside
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: YearlyProjection }>
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-sm">
        <p className="text-sm font-medium">Age {data.age}</p>
        <p className="text-sm text-gray-600">Portfolio: {formatCurrency(data.portfolioEnd)}</p>
        {data.isRetired && (
          <>
            <p className="text-sm text-gray-600">Withdrawal: {formatCurrency(data.withdrawal)}</p>
            <p className="text-sm text-gray-600">Other Income: {formatCurrency(data.otherIncome)}</p>
          </>
        )}
        <p className="text-sm text-gray-600">Growth: {formatCurrency(data.growth)}</p>
      </div>
    )
  }
  return null
}

export function ProjectionChart({ projections, retirementAge, currentAge }: ProjectionChartProps) {
  // Find the retirement index for the reference line
  const retirementIndex = retirementAge - currentAge

  // Prepare chart data
  const chartData = projections.map((p) => ({
    ...p,
    label: `${p.age}`,
  }))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-gray-900">
          Portfolio Projection Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="age"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                x={retirementAge}
                stroke="#10b981"
                strokeDasharray="5 5"
                label={{
                  value: 'Retirement',
                  position: 'top',
                  fontSize: 10,
                  fill: '#10b981',
                }}
              />
              <Area
                type="monotone"
                dataKey="portfolioEnd"
                stroke="hsl(var(--primary))"
                fill="url(#portfolioGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary rounded"></div>
            <span>Portfolio Value</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-green-500"></div>
            <span>Retirement Start</span>
          </div>
        </div>

        {/* Key milestones */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-500">Today</p>
            <p className="text-sm font-medium">
              {projections[0] ? formatCurrency(projections[0].portfolioStart) : '$0'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">At Retirement</p>
            <p className="text-sm font-medium">
              {projections[retirementIndex]
                ? formatCurrency(projections[retirementIndex].portfolioEnd)
                : '$0'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">End of Plan</p>
            <p className="text-sm font-medium">
              {projections[projections.length - 1]
                ? formatCurrency(projections[projections.length - 1].portfolioEnd)
                : '$0'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
