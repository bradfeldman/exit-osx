'use client'

import dynamic from 'next/dynamic'

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

// Dynamically import TrendInsights to defer recharts loading
const TrendInsights = dynamic(
  () => import('./TrendInsights').then((mod) => ({ default: mod.TrendInsights })),
  {
    loading: () => (
      <div className="py-4 border-t border-gray-100">
        <div className="animate-pulse flex items-center gap-2 py-2">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="w-32 h-4 bg-gray-200 rounded" />
        </div>
      </div>
    ),
    ssr: false,
  }
)

export function TrendInsightsDynamic(props: TrendInsightsProps) {
  return <TrendInsights {...props} />
}
