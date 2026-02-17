'use client'

import { useSyncExternalStore } from 'react'
import { motion } from '@/lib/motion'
import { useCountUpCurrency, useCountUpScore } from '@/hooks/useCountUp'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'

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

  const briPercent = briScore != null ? Math.round(briScore) : null
  const { value: animatedBri } = useCountUpScore(briPercent ?? 0, { delay: 500, duration: 1800 })

  const getBriColor = () => {
    if (briPercent == null) return 'text-muted-foreground'
    if (briPercent >= 75) return 'text-emerald-600'
    if (briPercent >= 50) return 'text-foreground'
    return 'text-amber-600'
  }

  // Compute blended current value: midpoint of EBITDA-multiple value and DCF value (if available)
  const blendedCurrentValue = _dcfValuation
    ? Math.round((currentValue + _dcfValuation.enterpriseValue) / 2)
    : currentValue

  // When DCF data is available, show a real range between the two methodologies
  const hasDcfRange = _dcfValuation !== null && _dcfValuation !== undefined
  const rangeLow = hasDcfRange
    ? Math.min(currentValue, _dcfValuation.enterpriseValue)
    : Math.round(blendedCurrentValue * 0.95)
  const rangeHigh = hasDcfRange
    ? Math.max(currentValue, _dcfValuation.enterpriseValue)
    : Math.round(blendedCurrentValue * 1.05)

  // Determine the subtitle note for the Current Value card
  const getValueSubtitle = () => {
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
      {/* BRI Score */}
      <motion.div
        className="min-w-0 bg-card border border-border rounded-xl p-4 sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Buyer Readiness Index</p>
        <p className={`text-2xl sm:text-3xl font-bold mt-1 truncate ${getBriColor()}`}>
          {briPercent != null
            ? isClient ? animatedBri : `${briPercent}`
            : '\u2014'}
        </p>
        {briPercent != null ? (
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
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Current Value</p>
        {hasDcfRange ? (
          /* Range display when both EBITDA-multiple and DCF are available */
          <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1 truncate">
            {isClient ? (
              <><AnimatedCurrency value={rangeLow} delay={200} />{' \u2013 '}<AnimatedCurrency value={rangeHigh} delay={200} /></>
            ) : (
              <>{formatCurrency(rangeLow)} &ndash; {formatCurrency(rangeHigh)}</>
            )}
          </p>
        ) : (
          /* Single blended value when only one methodology */
          <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1 truncate">
            {isClient ? <AnimatedCurrency value={blendedCurrentValue} delay={200} /> : formatCurrency(blendedCurrentValue)}
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
    </div>
  )
}
