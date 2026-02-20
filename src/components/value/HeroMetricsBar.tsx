'use client'

import { useSyncExternalStore } from 'react'
import { motion } from '@/lib/motion'
import { useCountUpCurrency, useCountUpScore } from '@/hooks/useCountUp'
import { formatCurrency } from '@/lib/utils/currency'
import { ValuationDisclaimer, ValuationInfoTip } from '@/components/ui/ValuationDisclaimer'

const emptySubscribe = () => () => {}
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

function AnimatedCurrency({ value, delay = 0 }: { value: number; delay?: number }) {
  const { value: displayValue } = useCountUpCurrency(value, { delay, duration: 1800 })
  return <>{displayValue}</>
}

interface DCFValuation {
  enterpriseValue: number
  equityValue: number | null
  wacc: number | null
  impliedMultiple: number | null
  source: 'auto' | 'manual'
  multipleBasedValue: number
  divergenceRatio: number | null
  confidenceSignal: 'high' | 'moderate' | 'low'
}

interface BridgeCategory {
  category: string
  label: string
  score: number
  dollarImpact: number
  weight: number
  buyerExplanation: string
}

interface HeroMetricsBarProps {
  currentValue: number
  potentialValue: number
  valueGap: number
  valueGapDelta: number | null
  briScore?: number | null
  isEstimated?: boolean
  hasAssessment?: boolean
  isEbitdaFromFinancials?: boolean
  dcfValuation?: DCFValuation | null
  // V2 fields
  drsScore?: number | null
  evRange?: { low: number; mid: number; high: number } | null
  // New: for 2-col layout
  bridgeCategories?: BridgeCategory[]
  valueTrend?: Array<{ value: number; date: string; dcfValue?: number | null }>
  finalMultiple?: number
  adjustedEbitda?: number
}

export function HeroMetricsBar({
  currentValue,
  valueGapDelta,
  briScore,
  isEstimated: _isEstimated = false,
  isEbitdaFromFinancials = false,
  dcfValuation: _dcfValuation,
  drsScore,
  evRange,
  bridgeCategories = [],
  valueTrend = [],
  finalMultiple,
  adjustedEbitda,
}: HeroMetricsBarProps) {
  const isClient = useIsClient()

  // V2: Show DRS (Deal Readiness Score) when available, fall back to BRI
  const readinessScore = drsScore ?? briScore
  const readinessPercent = readinessScore != null ? Math.round(readinessScore) : null
  const { value: animatedReadiness } = useCountUpScore(readinessPercent ?? 0, { delay: 500, duration: 1800 })

  // V2: Use evRange when available, otherwise fall back to DCF blend / estimate
  const hasEvRange = evRange != null
  const hasDcfRange = !hasEvRange && _dcfValuation !== null && _dcfValuation !== undefined

  let displayCurrentValue: number
  let rangeLow: number
  let rangeHigh: number

  if (hasEvRange) {
    displayCurrentValue = evRange.mid
    rangeLow = evRange.low
    rangeHigh = evRange.high
  } else if (hasDcfRange) {
    displayCurrentValue = Math.round((currentValue + _dcfValuation!.enterpriseValue) / 2)
    rangeLow = Math.min(currentValue, _dcfValuation!.enterpriseValue)
    rangeHigh = Math.max(currentValue, _dcfValuation!.enterpriseValue)
  } else {
    displayCurrentValue = currentValue
    rangeLow = Math.round(currentValue * 0.95)
    rangeHigh = Math.round(currentValue * 1.05)
  }

  // Change indicator
  const changeDisplay = (() => {
    if (valueGapDelta === null) return null
    if (valueGapDelta === 0) return null
    if (valueGapDelta < 0) {
      // Gap shrinking = good = value going up
      return { text: `+${formatCurrency(Math.abs(valueGapDelta))} this month`, positive: true }
    }
    return { text: `-${formatCurrency(valueGapDelta)} this month`, positive: false }
  })()

  // Method note
  const methodNote = (() => {
    if (hasEvRange) {
      return `${formatCurrency(rangeLow)} \u2013 ${formatCurrency(rangeHigh)}`
    }
    if (hasDcfRange) return 'Based on two valuation methods'
    if (_isEstimated && !isEbitdaFromFinancials) return 'Connect QuickBooks to narrow your range'
    if (finalMultiple && adjustedEbitda) {
      return `Based on Industry Multiples \u00b7 ${finalMultiple.toFixed(1)}x Adjusted EBITDA`
    }
    return `${formatCurrency(rangeLow)} \u2013 ${formatCurrency(rangeHigh)}`
  })()

  // Sparkline bars from valueTrend
  const sparkBars = (() => {
    if (valueTrend.length < 2) return []
    const recent = valueTrend.slice(-12)
    const max = Math.max(...recent.map(p => p.value))
    const min = Math.min(...recent.map(p => p.value))
    const range = max - min || 1
    return recent.map(p => Math.max(10, Math.round(((p.value - min) / range) * 100)))
  })()

  const trendStartLabel = valueTrend.length >= 2
    ? new Date(valueTrend[Math.max(0, valueTrend.length - 12)].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null
  const trendEndLabel = valueTrend.length >= 2
    ? new Date(valueTrend[valueTrend.length - 1].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  // BRI category bars (filter out structural/aspirational)
  const briCategories = bridgeCategories.filter(c =>
    !['STRUCTURAL', 'CORE_STRUCTURE', 'ASPIRATIONAL'].includes(c.category)
  )

  // BRI circle gauge
  const circumference = 2 * Math.PI * 40 // r=40
  const dashOffset = readinessPercent != null
    ? circumference - (circumference * readinessPercent / 100)
    : circumference

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#34C759' // green
    if (score >= 50) return '#FF9500' // orange
    return '#FF3B30' // red
  }

  const getCircleStroke = () => {
    if (readinessPercent == null) return '#E5E7EB'
    if (readinessPercent >= 75) return '#34C759'
    if (readinessPercent >= 50) return '#0071E3'
    return '#FF9500'
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Card: Valuation */}
        <motion.div
          role="link"
          tabIndex={0}
          aria-label="Estimated Business Value — click to view valuation details"
          className="bg-card border border-border rounded-2xl p-6 sm:p-7 flex flex-col cursor-pointer hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => window.location.href = '/dashboard/valuation'}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.href = '/dashboard/valuation' } }}
        >
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center">
            Estimated Business Value
            <ValuationInfoTip />
          </p>
          <p className="text-[44px] font-extrabold tracking-tight text-foreground leading-none">
            {isClient ? <AnimatedCurrency value={displayCurrentValue} delay={200} /> : formatCurrency(displayCurrentValue)}
          </p>

          {changeDisplay && (
            <motion.div
              className={`inline-flex items-center gap-1 mt-2 text-sm font-semibold ${changeDisplay.positive ? 'text-emerald-600' : 'text-destructive'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              {changeDisplay.positive ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                  <polyline points="17 18 23 18 23 12" />
                </svg>
              )}
              {changeDisplay.text}
            </motion.div>
          )}

          {/* Method note */}
          <div className="inline-flex items-center gap-1 bg-muted/50 rounded-md px-2.5 py-1 text-xs text-muted-foreground font-medium mt-2 w-fit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {methodNote}
          </div>

          {/* Sparkline bars */}
          {sparkBars.length > 0 && (
            <>
              <div className="flex items-end gap-1 h-12 mt-3">
                {sparkBars.map((height, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t min-h-[8px] transition-all ${
                      i === sparkBars.length - 1
                        ? 'bg-[#0071E3]'
                        : 'bg-[#0071E3]/15'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground/60 mt-1">
                <span>{trendStartLabel}</span>
                <span>{trendEndLabel}</span>
              </div>
            </>
          )}
        </motion.div>

        {/* Right Card: BRI */}
        <motion.div
          role="link"
          tabIndex={0}
          aria-label="Business Readiness Index — click to view diagnosis"
          className="bg-card border border-border rounded-2xl p-6 sm:p-7 flex flex-col cursor-pointer hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          onClick={() => window.location.href = '/dashboard/diagnosis'}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.href = '/dashboard/diagnosis' } }}
        >
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Business Readiness Index
          </p>

          <div className="flex items-center gap-6 mb-4">
            {/* Circle gauge */}
            <div className="relative w-[100px] h-[100px] shrink-0">
              <svg viewBox="0 0 100 100" className="w-[100px] h-[100px] -rotate-90">
                <circle
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-border"
                />
                <circle
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke={getCircleStroke()}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[28px] font-extrabold tracking-tight leading-none">
                  {readinessPercent != null
                    ? isClient ? animatedReadiness : readinessPercent
                    : '\u2014'}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">of 100</span>
              </div>
            </div>

            {/* Category breakdown bars */}
            {briCategories.length > 0 && (
              <div className="flex-1 flex flex-col gap-1.5">
                {briCategories.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-2.5 text-[13px]">
                    <span className="flex-1 text-muted-foreground font-medium truncate">{cat.label}</span>
                    <span className="font-bold min-w-[28px] text-right" style={{ color: getScoreColor(cat.score) }}>
                      {cat.score}
                    </span>
                    <div className="w-[60px] h-[5px] bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${cat.score}%`,
                          backgroundColor: getScoreColor(cat.score),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No assessment state */}
            {briCategories.length === 0 && readinessPercent == null && (
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Complete your assessment to see readiness scores.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
      <ValuationDisclaimer className="mt-3 text-center" />
    </div>
  )
}
