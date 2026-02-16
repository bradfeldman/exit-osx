'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  TrendingUp,
  Shield,
  Clock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import type { PFSWizardData, BusinessInfo } from '../PFSWizardTypes'
import { calculateWizardTotals, formatCurrency } from '../pfs-wizard-utils'

interface RevealStepProps {
  data: PFSWizardData
  businessInfo: BusinessInfo | null
  onSave: () => Promise<void>
  onViewPFS: () => void
  saving: boolean
  saveError: string | null
}

// Animated counter that rolls from 0 to target value
function AnimatedCounter({
  target,
  duration = 1500,
  delay = 0,
  prefix = '$',
}: {
  target: number
  duration?: number
  delay?: number
  prefix?: string
}) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      const startTime = performance.now()
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Cubic ease-out for deceleration
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate)
        }
      }
      frameRef.current = requestAnimationFrame(animate)
    }, delay)

    return () => {
      clearTimeout(timeout)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, duration, delay])

  const isNegative = target < 0
  const absValue = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absValue)

  return (
    <span>
      {isNegative && '-'}{prefix}{formatted}
    </span>
  )
}

// Pre-generate confetti particle randomness outside render
const CONFETTI_COLORS = ['#B87333', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6']
const CONFETTI_PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  angle: (i * 12) + (((i * 7 + 3) % 10)),
  velocity: 300 + ((i * 13 + 5) % 200),
  size: 6 + ((i * 3 + 1) % 6),
  rotation: (i * 37) % 360,
}))

// CSS-based confetti burst
function ConfettiBurst() {
  const particles = CONFETTI_PARTICLES

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180
        const x = Math.cos(rad) * p.velocity
        const y = Math.sin(rad) * p.velocity - 200 // Bias upward

        return (
          <motion.div
            key={p.id}
            initial={{
              opacity: 1,
              x: '50vw',
              y: '40vh',
              rotate: 0,
              scale: 1,
            }}
            animate={{
              opacity: [1, 1, 0],
              x: `calc(50vw + ${x}px)`,
              y: `calc(40vh + ${y + 400}px)`,
              rotate: p.rotation + 720,
              scale: [1, 1.2, 0.5],
            }}
            transition={{
              duration: 2,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              borderRadius: 2,
            }}
          />
        )
      })}
    </div>
  )
}

// Concentration color helper
function getConcentrationColor(pct: number): { text: string; bg: string; label: string } {
  if (pct < 50) return { text: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Diversified' }
  if (pct < 80) return { text: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Concentrated' }
  return { text: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Highly Concentrated' }
}

export function RevealStep({
  data,
  businessInfo,
  onSave,
  onViewPFS,
  saving,
  saveError,
}: RevealStepProps) {
  const [phase, setPhase] = useState<'loading' | 'reveal' | 'insights'>('loading')
  const [showConfetti, setShowConfetti] = useState(false)
  const hasSavedRef = useRef(false)

  const totals = calculateWizardTotals(data, businessInfo)

  // Auto-save on mount
  useEffect(() => {
    if (!hasSavedRef.current) {
      hasSavedRef.current = true
      onSave()
    }
  }, [onSave])

  // Animation timeline
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    // T=1500ms: Show the reveal
    timers.push(setTimeout(() => setPhase('reveal'), 1500))

    // T=3500ms: Show insight cards
    timers.push(setTimeout(() => setPhase('insights'), 3500))

    // T=2500ms: Confetti if net worth > $500K
    if (totals.netWorth > 500000) {
      timers.push(setTimeout(() => setShowConfetti(true), 2500))
    }

    return () => timers.forEach(clearTimeout)
  }, [totals.netWorth])

  // Build insight cards
  const insightCards = useCallback(() => {
    const cards: Array<{
      icon: typeof TrendingUp
      title: string
      value: string
      detail: string
      color: string
    }> = []

    // Card 1: Business Concentration (only if business info exists)
    if (businessInfo && totals.businessValue > 0) {
      const conc = getConcentrationColor(totals.businessConcentration)
      cards.push({
        icon: Shield,
        title: 'Business Concentration',
        value: `${Math.round(totals.businessConcentration)}% of your net worth`,
        detail: totals.businessConcentration > 50
          ? 'The average diversified investor has less than 5% in any single asset.'
          : 'You have good diversification beyond your business.',
        color: conc.text,
      })
    }

    // Card 2: After-Tax Preview (only if business value exists)
    if (businessInfo && totals.businessValue > 0) {
      cards.push({
        icon: TrendingUp,
        title: 'After-Tax Preview',
        value: `${formatCurrency(totals.businessValue)} becomes ~${formatCurrency(totals.afterTaxBusinessValue)}`,
        detail: 'Estimated after 25% capital gains tax. Your actual rate depends on structure, state, and timing.',
        color: 'text-blue-600',
      })
    }

    // Card 3: Retirement Funds (always show)
    if (totals.totalRetirement > 0) {
      const retirementYears = data.currentAge
        ? Math.round(totals.totalRetirement / 80000) // Rough $80K/year spending
        : null
      cards.push({
        icon: Clock,
        title: 'Retirement Savings',
        value: formatCurrency(totals.totalRetirement),
        detail: retirementYears
          ? `Your retirement savings alone could fund roughly ${retirementYears} year${retirementYears !== 1 ? 's' : ''} of a moderate lifestyle.`
          : 'Complete your retirement profile for personalized projections.',
        color: totals.totalRetirement > 200000 ? 'text-green-600' : 'text-amber-600',
      })
    }

    // If no cards yet, show a general one
    if (cards.length === 0) {
      cards.push({
        icon: TrendingUp,
        title: 'Your Starting Point',
        value: formatCurrency(totals.netWorth),
        detail: 'Complete your business assessment to see how your business contributes to your total picture.',
        color: 'text-primary',
      })
    }

    return cards
  }, [totals, businessInfo, data.currentAge])

  return (
    <div className="space-y-6">
      {showConfetti && <ConfettiBurst />}

      <AnimatePresence mode="wait">
        {/* Phase 1: Loading */}
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            </motion.div>
            <p className="text-muted-foreground font-medium">
              Calculating your financial picture
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ...
              </motion.span>
            </p>
          </motion.div>
        )}

        {/* Phase 2: Net Worth Reveal */}
        {(phase === 'reveal' || phase === 'insights') && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.5,
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
          >
            {/* Net Worth Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 p-8 text-center mb-6">
              {/* Decorative glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />

              <div className="relative">
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2"
                >
                  Your Net Worth
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className={`text-5xl sm:text-6xl font-bold font-display ${
                    totals.netWorth >= 0 ? 'text-white' : 'text-red-400'
                  }`}
                >
                  <AnimatedCounter
                    target={totals.netWorth}
                    duration={1500}
                    delay={500}
                  />
                </motion.div>

                {businessInfo && totals.businessValue > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="text-sm text-gray-400 mt-3"
                  >
                    Including {formatCurrency(totals.businessValue)} in{' '}
                    {businessInfo.companyName}
                  </motion.p>
                )}

                {totals.netWorth < 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="text-sm text-gray-400 mt-2"
                  >
                    Many successful founders carry strategic debt while building value.
                  </motion.p>
                )}
              </div>
            </div>

            {/* Breakdown mini-bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8 }}
              className="grid grid-cols-3 gap-3 mb-6"
            >
              <div className="text-center p-3 rounded-xl bg-card border border-border">
                <p className="text-xs text-muted-foreground mb-1">Personal Assets</p>
                <p className="text-sm font-semibold text-green-600">
                  {formatCurrency(totals.totalPersonalAssets)}
                </p>
              </div>
              {businessInfo && totals.businessValue > 0 && (
                <div className="text-center p-3 rounded-xl bg-card border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Business Value</p>
                  <p className="text-sm font-semibold text-primary">
                    {formatCurrency(totals.businessValue)}
                  </p>
                </div>
              )}
              <div className="text-center p-3 rounded-xl bg-card border border-border">
                <p className="text-xs text-muted-foreground mb-1">Liabilities</p>
                <p className="text-sm font-semibold text-red-500">
                  {totals.totalLiabilities > 0
                    ? `(${formatCurrency(totals.totalLiabilities)})`
                    : formatCurrency(0)}
                </p>
              </div>
            </motion.div>

            {/* Phase 3: Insight Cards */}
            <AnimatePresence>
              {phase === 'insights' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3 mb-8"
                >
                  {insightCards().map((card, index) => {
                    const Icon = card.icon
                    return (
                      <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.3 }}
                        className="p-4 rounded-xl border border-border bg-card"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {card.title}
                            </p>
                            <p className={`text-sm font-semibold ${card.color} mt-0.5`}>
                              {card.value}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {card.detail}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error state */}
            {saveError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{saveError}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSave}
                    disabled={saving}
                    className="ml-auto text-destructive hover:text-destructive"
                  >
                    {saving ? 'Retrying...' : 'Retry'}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* CTAs */}
            {phase === 'insights' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="space-y-3"
              >
                <Button
                  onClick={onViewPFS}
                  disabled={saving}
                  className="w-full py-6 text-base"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      View Your Full Financial Statement
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
