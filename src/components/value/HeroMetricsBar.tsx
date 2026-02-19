'use client'

import { useSyncExternalStore } from 'react'
import { motion } from '@/lib/motion'
import { useCountUpCurrency, useCountUpScore } from '@/hooks/useCountUp'
import { Badge } from '@/components/ui/badge'
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
}

export function HeroMetricsBar({
  currentValue,
  potentialValue,
  valueGap,
  valueGapDelta,
  briScore,
  isEstimated: _isEstimated = false,
  hasAssessment = false,
  isEbitdaFromFinancials = false,
  dcfValuation: _dcfValuation,
  drsScore,
  evRange,
}: HeroMetricsBarProps) {
  const isClient = useIsClient()

  const getDeltaDisplay = () => {
    // When BRI is near-perfect (>=95), the remaining gap is structural (market/multiple-based)
    if (briScore != null && briScore >= 95 && valueGap > 0) {
      return { text: 'Readiness maximized — remaining gap is market-based', className: 'text-emerald-600' }
    }
    if (valueGapDelta === null) {
      return { text: 'As of today', className: 'text-muted-foreground' }
    }
    if (valueGapDelta === 0) {
      return { text: 'No change this month', className: 'text-muted-foreground' }
    }
    if (valueGapDelta < 0) {
      // Gap shrinking = good
      return {
        text: `↓ ${formatCurrency(Math.abs(valueGapDelta))} this month`,
        className: 'text-emerald-600',
      }
    }
    // Gap growing = bad
    return {
      text: `↑ ${formatCurrency(valueGapDelta)} this month`,
      className: 'text-destructive',
    }
  }

  const delta = getDeltaDisplay()

  // V2: Show DRS (Deal Readiness Score) when available, fall back to BRI
  const readinessScore = drsScore ?? briScore
  const readinessPercent = readinessScore != null ? Math.round(readinessScore) : null
  const { value: animatedReadiness } = useCountUpScore(readinessPercent ?? 0, { delay: 500, duration: 1800 })
  const readinessLabel = drsScore != null ? 'Deal Readiness' : 'Buyer Readiness Index'

  const getReadinessColor = () => {
    if (readinessPercent == null) return 'text-muted-foreground'
    if (readinessPercent >= 75) return 'text-emerald-600'
    if (readinessPercent >= 50) return 'text-foreground'
    return 'text-amber-600'
  }

  // V2: Use evRange when available, otherwise fall back to DCF blend / estimate
  const hasEvRange = evRange != null
  const hasDcfRange = !hasEvRange && _dcfValuation !== null && _dcfValuation !== undefined

  // Compute displayed current value and range
  let displayCurrentValue: number
  let rangeLow: number
  let rangeHigh: number

  if (hasEvRange) {
    // V2 path: use evRange from valuation engine
    displayCurrentValue = evRange.mid
    rangeLow = evRange.low
    rangeHigh = evRange.high
  } else if (hasDcfRange) {
    // Legacy DCF blend
    displayCurrentValue = Math.round((currentValue + _dcfValuation!.enterpriseValue) / 2)
    rangeLow = Math.min(currentValue, _dcfValuation!.enterpriseValue)
    rangeHigh = Math.max(currentValue, _dcfValuation!.enterpriseValue)
  } else {
    displayCurrentValue = currentValue
    rangeLow = Math.round(currentValue * 0.95)
    rangeHigh = Math.round(currentValue * 1.05)
  }

  const showRange = hasEvRange || hasDcfRange

  const getValueSubtitle = () => {
    if (hasEvRange) {
      return formatCurrency(rangeLow) + ' \u2013 ' + formatCurrency(rangeHigh)
    }
    if (hasDcfRange) {
      return 'Based on two valuation methods'
    }
    if (_isEstimated && !isEbitdaFromFinancials) {
      return 'Connect QuickBooks to narrow your valuation range'
    }
    return formatCurrency(rangeLow) + ' \u2013 ' + formatCurrency(rangeHigh)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {/* Readiness Score (V2: DRS, fallback: BRI) */}
      <motion.div
        className="min-w-0 bg-card border border-border rounded-xl p-4 sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">{readinessLabel}</p>
        <p className={`text-2xl sm:text-3xl font-bold mt-1 truncate ${getReadinessColor()}`}>
          {readinessPercent != null
            ? isClient ? animatedReadiness : `${readinessPercent}`
            : '\u2014'}
        </p>
        {readinessPercent != null ? (
          <p className="text-xs text-muted-foreground mt-2">Score 0 &ndash; 100</p>
        ) : (
          <Badge variant="secondary" className="mt-2">Not assessed</Badge>
        )}
      </motion.div>

      {/* Current Value */}
      <motion.div
        className="min-w-0 bg-card border border-border rounded-xl p-4 sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
      >
        <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center">{hasEvRange ? 'Enterprise Value' : 'Current Value'}<ValuationInfoTip /></p>
        {showRange ? (
          /* Range display: V2 evRange or DCF blend */
          <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1 truncate">
            {isClient ? (
              <><AnimatedCurrency value={rangeLow} delay={200} />{' \u2013 '}<AnimatedCurrency value={rangeHigh} delay={200} /></>
            ) : (
              <>{formatCurrency(rangeLow)} &ndash; {formatCurrency(rangeHigh)}</>
            )}
          </p>
        ) : (
          /* Single value */
          <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1 truncate">
            {isClient ? <AnimatedCurrency value={displayCurrentValue} delay={200} /> : formatCurrency(displayCurrentValue)}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {getValueSubtitle()}
        </p>
      </motion.div>

      {/* Potential Value */}
      <motion.div
        className="min-w-0 bg-card border border-border rounded-xl p-4 sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Target Value</p>
        <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1 truncate">
          {isClient ? <AnimatedCurrency value={potentialValue} delay={300} /> : formatCurrency(potentialValue)}
        </p>
        <p className="text-xs text-muted-foreground mt-2">If all gaps closed</p>
      </motion.div>

      {/* Value Gap + Delta */}
      <motion.div
        className="min-w-0 bg-card border border-border rounded-xl p-4 sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Value Gap</p>
        <p className="text-2xl sm:text-3xl font-bold text-primary mt-1 truncate">
          {isClient ? <AnimatedCurrency value={valueGap} delay={400} /> : formatCurrency(valueGap)}
        </p>
        <motion.p
          className={`text-xs sm:text-sm font-medium mt-1 ${delta.className}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.4 }}
        >
          {delta.text}
        </motion.p>
      </motion.div>
      <ValuationDisclaimer className="mt-3 text-center" />
    </div>
  )
}
