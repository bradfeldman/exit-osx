'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

interface BenchmarkComparisonProps {
  industryName: string
  industryMultipleLow: number
  industryMultipleHigh: number
  currentMultiple: number
  hasAssessment: boolean
  isFreeUser?: boolean
  onUpgrade?: () => void
  adjustedEbitda?: number
  isEbitdaFromFinancials?: boolean
  ebitdaSource?: string
}

export function BenchmarkComparison({
  industryName,
  industryMultipleLow,
  industryMultipleHigh,
  currentMultiple,
  hasAssessment,
  isFreeUser = false,
  onUpgrade,
  adjustedEbitda,
  isEbitdaFromFinancials = false,
  ebitdaSource,
}: BenchmarkComparisonProps) {
  const { percentile, quartile, message } = useMemo(() => {
    const range = industryMultipleHigh - industryMultipleLow
    if (range <= 0) {
      return { percentile: 50, quartile: 'middle' as const, message: '' }
    }

    const pct = Math.min(100, Math.max(0, ((currentMultiple - industryMultipleLow) / range) * 100))

    let q: 'bottom' | 'middle' | 'top'
    let msg: string
    if (pct <= 25) {
      q = 'bottom'
      msg = `You're in the bottom quartile.`
    } else if (pct >= 75) {
      q = 'top'
      msg = `You're in the top quartile — outperforming most peers in your industry.`
    } else {
      q = 'middle'
      msg = `You're in the middle range.`
    }

    return { percentile: pct, quartile: q, message: msg }
  }, [currentMultiple, industryMultipleLow, industryMultipleHigh])

  if (!hasAssessment) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Lock className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {isFreeUser
              ? 'Upgrade to see industry benchmarks'
              : 'Complete your assessment to see industry benchmarks'}
          </p>
          <p className="text-xs text-muted-foreground/60 mb-3">
            Compare your EBITDA multiple against industry peers
          </p>
          {isFreeUser && onUpgrade && (
            <Button size="sm" variant="outline" onClick={onUpgrade}>
              See Where You Rank
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">
          Industry Benchmark
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your EBITDA multiple vs. {industryName}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gauge Bar */}
        <div className="space-y-2">
          <div className="relative h-3 rounded-full overflow-hidden bg-zinc-100">
            {/* Bottom quartile zone */}
            <div
              className="absolute inset-y-0 left-0 bg-amber-200/70"
              style={{ width: '25%' }}
            />
            {/* Middle zone */}
            <div
              className="absolute inset-y-0 bg-zinc-200/70"
              style={{ left: '25%', width: '50%' }}
            />
            {/* Top quartile zone */}
            <div
              className="absolute inset-y-0 bg-emerald-200/70"
              style={{ left: '75%', width: '25%' }}
            />
            {/* Current position marker - positioned proportionally between min and max */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full border-2 border-white shadow-md z-10"
              style={{
                left: `${Math.min(100, Math.max(0, percentile))}%`,
                backgroundColor: quartile === 'top' ? '#059669' : quartile === 'bottom' ? '#d97706' : '#71717a',
              }}
            />
          </div>

          {/* Labels */}
          <div className="relative text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Min: {industryMultipleLow.toFixed(1)}x</span>
              <span>Max: {industryMultipleHigh.toFixed(1)}x</span>
            </div>
            {/* Current position label - aligned with bead marker */}
            <div
              className="absolute -top-0.5 -translate-x-1/2 font-medium text-foreground whitespace-nowrap"
              style={{
                left: `${Math.min(100, Math.max(0, percentile))}%`,
              }}
            >
              You: {currentMultiple.toFixed(1)}x
            </div>
          </div>
        </div>

        {/* Contextual message */}
        <p className="text-xs text-muted-foreground">{message}</p>

        {/* EBITDA basis */}
        {adjustedEbitda != null && adjustedEbitda > 0 && (
          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            {isEbitdaFromFinancials
              ? `Based on ${ebitdaSource === 'trailing12' ? 'Trailing 12-Month' : 'most recent year'} EBITDA of ${formatCurrency(adjustedEbitda)}`
              : `Est. EBITDA of ${formatCurrency(adjustedEbitda)} based on industry assumptions`}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
