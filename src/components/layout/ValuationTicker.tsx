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

  if (currentValue === null) return null

  const delta = previousValue !== null ? currentValue - previousValue : null
  const pctChange = previousValue !== null && previousValue > 0
    ? ((currentValue - previousValue) / previousValue) * 100
    : null

  const isUp = delta !== null && delta > 0
  const isDown = delta !== null && delta < 0

  return (
    <div className="hidden lg:flex flex-col items-end justify-center min-w-0">
      {/* Current value — stock ticker style */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentValue}
          initial={{ opacity: 0.6 }}
          animate={{
            opacity: 1,
            filter: isUp
              ? ['brightness(1)', 'brightness(1.15)', 'brightness(1)']
              : undefined,
          }}
          transition={{
            opacity: { duration: 0.3 },
            filter: { duration: 2, ease: 'easeOut' },
          }}
          className="text-lg font-bold tabular-nums text-foreground tracking-tight"
        >
          {isClient ? <AnimatedValue value={currentValue} /> : formatCurrency(currentValue)}
        </motion.div>
      </AnimatePresence>

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
