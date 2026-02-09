'use client'

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'
import { cn } from '@/lib/utils'

interface TimelineAnnotation {
  date: string
  label: string
  detail: string
  impact: string
  type: 'positive' | 'negative' | 'neutral'
}

interface ValueTrendPoint {
  value: number
  date: string
  dcfValue?: number | null
}

interface ValueTimelineProps {
  valueTrend: ValueTrendPoint[]
  annotations: TimelineAnnotation[]
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

function formatDate(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function _AnnotationTooltipContent({ annotation }: { annotation: TimelineAnnotation }) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
      <div className="font-semibold text-sm">{annotation.label}</div>
      <div className="text-xs text-muted-foreground mt-1">{annotation.detail}</div>
      <div className={cn(
        'text-xs font-medium mt-1',
        annotation.type === 'positive' ? 'text-emerald-600' :
        annotation.type === 'negative' ? 'text-destructive' :
        'text-muted-foreground'
      )}>
        {annotation.impact}
      </div>
    </div>
  )
}

// Custom tooltip for the chart
function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; value: number; dcfValue?: number | null } }> }) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-2">
      <div className="text-xs text-muted-foreground">{formatDate(data.date)}</div>
      <div className="text-sm font-semibold">{formatCurrency(data.value)}</div>
      {data.dcfValue != null && (
        <div className="text-xs text-muted-foreground mt-0.5">
          DCF: {formatCurrency(data.dcfValue)}
        </div>
      )}
    </div>
  )
}

export function ValueTimeline({ valueTrend, annotations }: ValueTimelineProps) {
  // Single data point state
  if (valueTrend.length <= 1) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">YOUR VALUE OVER TIME</h2>
          <p className="text-sm text-muted-foreground">
            Each milestone shows what you did and what happened.
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-center h-[120px] text-center">
            <div>
              <p className="text-sm text-muted-foreground">
                Your value journey starts here.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Complete tasks and connect financials to see your progress over time.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Build chart data
  const hasDcfData = valueTrend.some(p => p.dcfValue != null)
  const chartData = valueTrend.map(point => ({
    date: point.date,
    value: point.value,
    dcfValue: point.dcfValue ?? undefined,
    formattedDate: formatDate(point.date),
  }))

  // Map annotations to chart data points by finding closest date
  const annotationDots = annotations.map(ann => {
    const closestPoint = chartData.reduce((closest, point) => {
      const diff = Math.abs(new Date(point.date).getTime() - new Date(ann.date).getTime())
      const closestDiff = Math.abs(new Date(closest.date).getTime() - new Date(ann.date).getTime())
      return diff < closestDiff ? point : closest
    }, chartData[0])

    return {
      ...ann,
      x: closestPoint.formattedDate,
      y: closestPoint.value,
    }
  })

  const dotColors = {
    positive: '#22c55e',
    negative: '#ef4444',
    neutral: '#6b7280',
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">YOUR VALUE OVER TIME</h2>
        <p className="text-sm text-muted-foreground">
          Each milestone shows what you did and what happened.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#B87333" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#B87333" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="formattedDate"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                width={60}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#B87333"
                strokeWidth={2}
                fill="url(#valueGradient)"
              />
              {hasDcfData && (
                <Line
                  type="monotone"
                  dataKey="dcfValue"
                  stroke="#6b7280"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls
                  name="DCF Value"
                />
              )}
              {annotationDots.map((dot, i) => (
                <ReferenceDot
                  key={i}
                  x={dot.x}
                  y={dot.y}
                  r={5}
                  fill={dotColors[dot.type]}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend when DCF line is shown */}
        {hasDcfData && (
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-[#B87333]" /> EBITDA Multiple
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 border-t-[1.5px] border-dashed border-gray-500" /> DCF
            </span>
          </div>
        )}

        {/* Annotation list below chart */}
        {annotations.length > 0 && (
          <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto">
            {annotations.slice(0, 10).map((ann, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div
                  className={cn(
                    'mt-1.5 h-2 w-2 rounded-full shrink-0',
                    ann.type === 'positive' ? 'bg-emerald-500' :
                    ann.type === 'negative' ? 'bg-destructive' :
                    'bg-muted-foreground'
                  )}
                />
                <div className="min-w-0">
                  <span className="font-medium text-foreground">{ann.label}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {formatDate(ann.date)}
                  </span>
                  {ann.impact && ann.impact !== 'Baseline' && (
                    <span className={cn(
                      'ml-2 text-xs font-medium',
                      ann.type === 'positive' ? 'text-emerald-600' :
                      ann.type === 'negative' ? 'text-destructive' :
                      'text-muted-foreground'
                    )}>
                      {ann.impact}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
