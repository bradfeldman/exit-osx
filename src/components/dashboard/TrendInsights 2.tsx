'use client'

import { useState } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface ValueTrendPoint {
  value: number
  date: string
}

interface BriTrend {
  direction: 'up' | 'down'
  change: number
}

interface TrendInsightsProps {
  valueTrend: ValueTrendPoint[]
  briTrend: BriTrend | null
  exitWindow: string | null
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

export function TrendInsights({ valueTrend, briTrend, exitWindow }: TrendInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate value change
  const valueChange = valueTrend.length >= 2
    ? valueTrend[valueTrend.length - 1].value - valueTrend[0].value
    : 0

  // Determine trend direction for sparkline color
  const isValueUp = valueChange >= 0

  // Minimum data points for sparkline
  const hasEnoughData = valueTrend.length >= 2

  return (
    <div className="py-4 border-t border-gray-100">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2 text-left group"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide group-hover:text-gray-700">
            Trends & Insights
          </span>
        </div>
        {!isExpanded && hasEnoughData && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {briTrend && (
              <span className={briTrend.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                BRI {briTrend.direction === 'up' ? '+' : ''}{briTrend.change}
              </span>
            )}
            {exitWindow && (
              <span>{exitWindow}</span>
            )}
          </div>
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="mt-4 grid grid-cols-3 gap-6">
          {/* Value Trend Sparkline */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Value Trend
            </p>
            {hasEnoughData ? (
              <>
                <div className="h-12 mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={valueTrend}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={isValueUp ? '#16a34a' : '#dc2626'}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className={`text-sm font-semibold ${isValueUp ? 'text-green-600' : 'text-red-600'}`}>
                  {isValueUp ? '+' : ''}{formatCurrency(valueChange)}
                </p>
                <p className="text-xs text-muted-foreground">
                  over {valueTrend.length} snapshots
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete more assessments to see trends
              </p>
            )}
          </div>

          {/* BRI Trend */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Buyer Readiness Index Trend
            </p>
            {briTrend ? (
              <div className="flex items-center gap-2">
                <svg
                  className={`w-8 h-8 ${briTrend.direction === 'up' ? 'text-green-500' : 'text-red-500'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={briTrend.direction === 'up' ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'}
                  />
                </svg>
                <div>
                  <p className={`text-lg font-semibold ${briTrend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {briTrend.direction === 'up' ? '+' : ''}{briTrend.change}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {briTrend.direction === 'up' ? 'Improving' : 'Declining'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not enough data yet
              </p>
            )}
          </div>

          {/* Exit Window */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Exit Readiness
            </p>
            {exitWindow ? (
              <div>
                <p className="text-lg font-semibold text-[#3D3D3D]">
                  {exitWindow}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  to full readiness
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete an assessment first
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
