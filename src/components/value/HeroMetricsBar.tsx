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
    if (valueGapDelta === null) {
      return { text: 'First month', className: 'text-muted-foreground' }
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* BRI Score */}
      <motion.div
        className="min-w-0 bg-card border border-border rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-sm font-medium text-muted-foreground">Buyer Readiness Score</p>
        <p className={`text-3xl font-bold mt-1 truncate ${getBriColor()}`}>
          {briPercent != null
            ? isClient ? animatedBri : `${briPercent}`
            : '—'}
        </p>
        {briPercent != null ? (
          <p className="text-xs text-muted-foreground mt-2">Buyer Readiness Index</p>
        ) : (
          <Badge variant="secondary" className="mt-2">Not assessed</Badge>
        )}
      </motion.div>

      {/* Current Value */}
      <motion.div
        className="min-w-0 bg-card border border-border rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
      >
        <p className="text-sm font-medium text-muted-foreground">Current Value</p>
        <p className="text-3xl font-bold text-foreground mt-1 truncate">
          {isClient ? <AnimatedCurrency value={currentValue} delay={200} /> : formatCurrency(currentValue)}
        </p>
        {!hasAssessment && (
          <Badge variant="secondary" className="mt-2">Industry Preview</Badge>
        )}
        {hasAssessment && isEbitdaFromFinancials && (
          <Badge variant="secondary" className="mt-2">Based on your financials</Badge>
        )}
      </motion.div>

      {/* Potential Value */}
      <motion.div
        className="min-w-0 bg-card border border-border rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <p className="text-sm font-medium text-muted-foreground">Potential Value</p>
        <p className="text-3xl font-bold text-foreground mt-1 truncate">
          {isClient ? <AnimatedCurrency value={potentialValue} delay={300} /> : formatCurrency(potentialValue)}
        </p>
        <p className="text-xs text-muted-foreground mt-2">If all gaps closed</p>
      </motion.div>

      {/* Value Gap + Delta */}
      <motion.div
        className="min-w-0 bg-card border border-border rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <p className="text-sm font-medium text-muted-foreground">Value Gap</p>
        <p className="text-3xl font-bold text-primary mt-1 truncate">
          {isClient ? <AnimatedCurrency value={valueGap} delay={400} /> : formatCurrency(valueGap)}
        </p>
        <motion.p
          className={`text-sm font-medium mt-1 ${delta.className}`}
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
