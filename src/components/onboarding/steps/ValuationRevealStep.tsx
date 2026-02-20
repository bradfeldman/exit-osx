'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  ArrowRight,
  TrendingUp,
  CheckCircle,
  DollarSign,
  Users,
  Settings,
  Target,
  Scale,
  User,
} from 'lucide-react'

interface CategoryGapItem {
  category: string
  label: string
  score: number
  gapAmount: number
  gapPercent: number
}

interface ValuationRevealStepProps {
  companyName: string
  briScore: number
  currentValue: number
  potentialValue: number
  valueGap: number
  categoryGapBreakdown: CategoryGapItem[]
  onComplete: () => void
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  FINANCIAL: DollarSign,
  TRANSFERABILITY: Users,
  OPERATIONAL: Settings,
  MARKET: Target,
  LEGAL_TAX: Scale,
  PERSONAL: User,
}

export function ValuationRevealStep({
  companyName,
  briScore,
  currentValue,
  potentialValue,
  valueGap,
  categoryGapBreakdown,
  onComplete,
}: ValuationRevealStepProps) {
  const [revealStage, setRevealStage] = useState(0)

  // Progress through reveal stages
  useEffect(() => {
    const timers = [
      setTimeout(() => setRevealStage(1), 500),   // Show valuation
      setTimeout(() => setRevealStage(2), 2500),  // Show BRI
      setTimeout(() => setRevealStage(3), 4000),  // Show gap breakdown
      setTimeout(() => setRevealStage(4), 5500),  // Show CTA
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  // Fire confetti when valuation reveals
  useEffect(() => {
    if (revealStage === 1 && typeof window !== 'undefined') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#B87333', '#3D3D3D', '#FFD700', '#FFFFFF']
      })
    }
  }, [revealStage])

  const roundedBRI = Math.round(briScore)

  // Filter to only show categories that have a gap (gapAmount > 0)
  const categoriesWithGap = categoryGapBreakdown.filter(c => c.gapAmount > 0)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Stage 1: Valuation Reveal */}
      <AnimatePresence>
        {revealStage >= 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-2xl mb-6"
          >
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full text-sm text-emerald-300 mb-4"
              >
                <CheckCircle className="w-4 h-4" />
                Your Personalized Valuation
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-white/70 mb-2"
              >
                Based on your specific risk profile,
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/80 mb-6"
              >
                <span className="text-white font-medium">{companyName}</span> is currently worth
              </motion.p>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
                className="mb-6"
              >
                <span className="text-5xl md:text-6xl font-bold font-display text-white">
                  {formatCurrency(currentValue)}
                </span>
              </motion.div>

              {/* Value gap callout */}
              {valueGap > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4 text-left"
                >
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-100 font-medium">
                        You could be worth{' '}
                        <span className="text-amber-300 font-bold">{formatCurrency(potentialValue)}</span>
                      </p>
                      <p className="text-amber-200/70 text-sm mt-1">
                        That&apos;s{' '}
                        <span className="text-amber-100 font-semibold">{formatCurrency(valueGap)}</span>{' '}
                        you&apos;re leaving on the table.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 2: BRI Score */}
      <AnimatePresence>
        {revealStage >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card rounded-2xl border border-border p-6 mb-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Buyer Readiness Index
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  How attractive you are to buyers
                </p>
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="relative"
              >
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="rgba(184, 115, 51, 0.2)"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="#B87333"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - roundedBRI / 100) }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-foreground font-display">
                      {roundedBRI}
                    </span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 3: Value Gap Breakdown by Category */}
      <AnimatePresence>
        {revealStage >= 3 && categoriesWithGap.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card rounded-2xl border border-border p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Where Your Value Gap Comes From</h3>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Here&apos;s how much each area is costing you:
            </p>

            <div className="space-y-4">
              {categoriesWithGap.map((item, index) => {
                const Icon = CATEGORY_ICONS[item.category] || Settings
                return (
                  <motion.div
                    key={item.category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          item.gapPercent >= 25 ? 'bg-red-100 dark:bg-red-900/30' :
                          item.gapPercent >= 15 ? 'bg-amber-100 dark:bg-amber-900/30' :
                          'bg-emerald-100 dark:bg-emerald-900/30'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            item.gapPercent >= 25 ? 'text-red-600 dark:text-red-400' :
                            item.gapPercent >= 15 ? 'text-amber-600 dark:text-amber-400' :
                            'text-emerald-600 dark:text-emerald-400'
                          }`} />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">{item.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            Score: {item.score}/100
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold ${
                          item.gapPercent >= 25 ? 'text-red-600 dark:text-red-400' :
                          item.gapPercent >= 15 ? 'text-amber-600 dark:text-amber-400' :
                          'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {formatCurrency(item.gapAmount)}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          {item.gapPercent}% of gap
                        </span>
                      </div>
                    </div>
                    {/* Progress bar showing contribution to gap */}
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          item.gapPercent >= 25 ? 'bg-red-500' :
                          item.gapPercent >= 15 ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.gapPercent}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Value Gap</span>
                <span className="text-xl font-bold text-foreground">{formatCurrency(valueGap)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 4: CTA */}
      <AnimatePresence>
        {revealStage >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-xl font-bold text-foreground font-display mb-2">
                  Ready to Close the Gap?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Your personalized action plan is ready. We&apos;ll help you tackle the biggest opportunities first.
                </p>

                <Button
                  size="lg"
                  onClick={onComplete}
                  className="w-full sm:w-auto px-8 py-6 text-lg shadow-xl shadow-primary/25 hover:shadow-2xl transition-all"
                >
                  See Your Action Plan
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
