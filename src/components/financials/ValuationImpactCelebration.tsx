'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { TrendingUp, Sparkles, ArrowRight, X } from 'lucide-react'

interface ValuationImpactCelebrationProps {
  previousValue: number | null
  newValue: number
  isFirstFinancials: boolean
  onDismiss: () => void
}

interface ConfettiParticle {
  id: number
  x: number
  y: number
  rotation: number
  duration: number
  delay: number
  color: string
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`
  }
  return `$${value.toLocaleString()}`
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function ValuationImpactCelebration({
  previousValue,
  newValue,
  isFirstFinancials,
  onDismiss,
}: ValuationImpactCelebrationProps) {
  const router = useRouter()
  // Start with confetti showing, then hide after 3 seconds
  const [showConfetti, setShowConfetti] = useState(true)

  const change = previousValue ? newValue - previousValue : newValue
  const isIncrease = change > 0
  const percentChange = previousValue && previousValue > 0
    ? ((newValue - previousValue) / previousValue) * 100
    : null

  // Pre-generate confetti particles with deterministic values for SSR compatibility
  const confettiParticles: ConfettiParticle[] = (() => {
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6']
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: (i * 17 + 13) % 100,
      y: -20,
      rotation: ((i * 37) % 720) - 360,
      duration: 2 + ((i * 7) % 20) / 10,
      delay: (i % 10) / 20,
      color: colors[i % colors.length],
    }))
  })()

  useEffect(() => {
    // Hide confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleContinue = () => {
    onDismiss()
    router.push('/dashboard/value-builder')
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        {/* Confetti particles */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {confettiParticles.map((particle) => (
              <motion.div
                key={particle.id}
                initial={{
                  left: `${particle.x}%`,
                  top: -20,
                  rotate: 0,
                  scale: 1,
                }}
                animate={{
                  top: '110%',
                  rotate: particle.rotation,
                  scale: 0,
                }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  ease: 'easeOut',
                }}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: particle.color,
                }}
              />
            ))}
          </div>
        )}

        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center"
        >
          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', damping: 10 }}
            className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center"
          >
            {isFirstFinancials ? (
              <Sparkles className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            )}
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-foreground mb-2"
          >
            {isFirstFinancials
              ? 'Your Valuation is Live!'
              : isIncrease
              ? 'Valuation Increased!'
              : 'Valuation Updated'}
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mb-6"
          >
            {isFirstFinancials
              ? 'Your financials are now powering a more accurate valuation.'
              : 'Your financial data has been updated.'}
          </motion.p>

          {/* Value display */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-muted/50 rounded-xl p-6 mb-6"
          >
            {isFirstFinancials ? (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Market Value</p>
                <p className="text-4xl font-bold text-foreground">{formatCurrencyFull(newValue)}</p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">Before</p>
                  <p className="text-xl font-semibold text-muted-foreground line-through">
                    {formatCurrency(previousValue || 0)}
                  </p>
                </div>
                <div className="text-2xl text-muted-foreground">
                  <ArrowRight className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground mb-0.5">After</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(newValue)}</p>
                </div>
              </div>
            )}

            {/* Change indicator */}
            {!isFirstFinancials && change !== 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                  isIncrease
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                <TrendingUp
                  className={`w-4 h-4 ${!isIncrease ? 'rotate-180' : ''}`}
                />
                <span className="font-semibold">
                  {isIncrease ? '+' : ''}{formatCurrency(change)}
                  {percentChange && ` (${isIncrease ? '+' : ''}${percentChange.toFixed(1)}%)`}
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button size="lg" className="w-full" onClick={handleContinue}>
              Continue to Value Builder
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
