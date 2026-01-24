'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ChartDataPoint {
  date: string
  dateFormatted: string
  currentValue: number
  potentialValue: number
  valueGap: number
  briScore: number
  multiple: number
  reason: string | null
}

interface Summary {
  valueChange: number
  valueChangePercent: number
  briChange: number
  gapClosed: number
}

interface ValueHistoryChartProps {
  companyId: string
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

function formatTooltipCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function ValueHistoryChart({ companyId }: ValueHistoryChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<'value' | 'bri' | 'gap'>('value')

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/companies/${companyId}/valuation-history?limit=12`)
        if (response.ok) {
          const result = await response.json()
          setData(result.chartData)
          setSummary(result.summary)
        }
      } catch (error) {
        console.error('Failed to fetch history:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [companyId])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[350px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    )
  }

  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Value History</CardTitle>
          <CardDescription>Complete more assessments to see your value trend over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">Not enough data yet</p>
              <p className="text-sm">Complete at least 2 assessments to see trends</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderChart = () => {
    switch (metric) {
      case 'value':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dateFormatted"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              width={70}
            />
            <Tooltip
              formatter={(value) => [
                formatTooltipCurrency(Number(value)),
                undefined
              ]}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="potentialValue"
              name="Potential Value"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="currentValue"
              name="Current Value"
              stroke="#B87333"
              fill="#B87333"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        )

      case 'bri':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dateFormatted"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              width={50}
            />
            <Tooltip
              formatter={(value) => [`${value}%`]}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="briScore"
              name="BRI Score"
              stroke="#B87333"
              strokeWidth={3}
              dot={{ r: 5, fill: '#B87333' }}
              activeDot={{ r: 7, fill: '#B87333' }}
            />
          </LineChart>
        )

      case 'gap':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dateFormatted"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              width={70}
            />
            <Tooltip
              formatter={(value) => [formatTooltipCurrency(Number(value)), 'Value Gap']}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="valueGap"
              name="Value Gap"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Value History</CardTitle>
          <CardDescription>Track your progress over time</CardDescription>
        </div>
        <Select value={metric} onValueChange={(v) => setMetric(v as 'value' | 'bri' | 'gap')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="value">Valuation</SelectItem>
            <SelectItem value="bri">BRI Score</SelectItem>
            <SelectItem value="gap">Value Gap</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {summary && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Value Change</p>
              <p className={`text-lg font-semibold ${summary.valueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.valueChange >= 0 ? '+' : ''}{formatCurrency(summary.valueChange)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">BRI Change</p>
              <p className={`text-lg font-semibold ${summary.briChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.briChange >= 0 ? '+' : ''}{summary.briChange} pts
              </p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Gap Closed</p>
              <p className={`text-lg font-semibold ${summary.gapClosed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.gapClosed)}
              </p>
            </div>
          </div>
        )}
        <ResponsiveContainer width="100%" height={280}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
