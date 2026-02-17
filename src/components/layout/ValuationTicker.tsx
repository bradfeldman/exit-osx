'use client'

import { useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { useCountUpCurrency } from '@/hooks/useCountUp'
import { useProgression } from '@/contexts/ProgressionContext'
import { formatCurrency } from '@/lib/utils/currency'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const emptySubscribe = () => () => {}
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

function AnimatedValue({ value }: { value: number }) {
  const { value: display } = useCountUpCurrency(value, { duration: 1500, easing: 'easeOutExpo' })
  return <>{display}</>
}

export function ValuationTicker() {
  const isClient = useIsClient()
  const { progressionData } = useProgression()

  const currentValue = progressionData?.currentValue ?? null
  const previousValue = progressionData?.previousValue ?? null
  const dcfEnterpriseValue = progressionData?.dcfEnterpriseValue ?? null

  if (currentValue === null) return null

  // Determine if we can show a range (both EBITDA-multiple and DCF values available)
  const hasRange = dcfEnterpriseValue !== null && dcfEnterpriseValue > 0
  const rangeLow = hasRange ? Math.min(currentValue, dcfEnterpriseValue) : null
  const rangeHigh = hasRange ? Math.max(currentValue, dcfEnterpriseValue) : null

  const delta = previousValue !== null ? currentValue - previousValue : null
  const pctChange = previousValue !== null && previousValue > 0
    ? ((currentValue - previousValue) / previousValue) * 100
    : null

  const isUp = delta !== null && delta > 0
  const isDown = delta !== null && delta < 0

  return (
    <div className="hidden lg:flex flex-col items-end justify-center min-w-0">
      {/* Valuation display — gradient shimmer with glow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={hasRange ? `${rangeLow}-${rangeHigh}` : currentValue}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            opacity: { duration: 0.4 },
            scale: { duration: 0.5, ease: 'easeOut' },
          }}
          className="valuation-glow"
        >
          <div className="valuation-shimmer-text text-xl font-extrabold tabular-nums tracking-tight leading-tight">
            {hasRange && rangeLow !== null && rangeHigh !== null ? (
              // Range display: "$14.4M - $17.5M"
              isClient ? (
                <><AnimatedValue value={rangeLow} />{' \u2013 '}<AnimatedValue value={rangeHigh} /></>
              ) : (
                <>{formatCurrency(rangeLow)} &ndash; {formatCurrency(rangeHigh)}</>
              )
            ) : (
              // Single value display
              isClient ? <AnimatedValue value={currentValue} /> : formatCurrency(currentValue)
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase mt-0.5"
      >
        {hasRange ? 'Valuation Range' : 'Est. Valuation'}
      </motion.p>

      {/* Delta row */}
      {delta !== null && pctChange !== null && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className={`flex items-center gap-1 text-xs font-medium tabular-nums ${
            isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : 'text-muted-foreground'
          }`}
        >
          {isUp && <TrendingUp className="h-3 w-3" />}
          {isDown && <TrendingDown className="h-3 w-3" />}
          {!isUp && !isDown && <Minus className="h-3 w-3" />}
          <span>
            {isUp ? '+' : ''}{formatCurrency(Math.abs(delta))}
          </span>
          <span>
            ({isUp ? '+' : ''}{pctChange.toFixed(1)}%)
          </span>
        </motion.div>
      )}
    </div>
  )
}
