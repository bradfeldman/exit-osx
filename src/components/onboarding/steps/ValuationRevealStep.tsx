'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Target,
  DollarSign,
  Award,
} from 'lucide-react'

interface ValuationRevealStepProps {
  companyName: string
  briScore: number
  currentValue: number
  potentialValue: number
  valueGap: number
  topRisks: Array<{ category: string; score: number; label: string }>
  tasksCreated: number
  topTask: { id: string; title: string; description: string; category: string; estimatedValue: number } | null
  onComplete: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial Health',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`
  }
  return `$${value.toLocaleString()}`
}

export function ValuationRevealStep({
  companyName,
  briScore,
  currentValue,
  potentialValue,
  valueGap,
  topRisks,
  tasksCreated,
  topTask,
  onComplete,
}: ValuationRevealStepProps) {
  const [revealStage, setRevealStage] = useState(0)

  // Progress through reveal stages
  useEffect(() => {
    const timers = [
      setTimeout(() => setRevealStage(1), 500),   // Show valuation
      setTimeout(() => setRevealStage(2), 2500),  // Show BRI
      setTimeout(() => setRevealStage(3), 4000),  // Show risks
      setTimeout(() => setRevealStage(4), 5500),  // Show action plan
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

  // briScore is already an integer percentage (0-100) from the API
  const roundedBRI = Math.round(briScore)

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
                {/* Score circle */}
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

      {/* Stage 3: Top Risks */}
      <AnimatePresence>
        {revealStage >= 3 && topRisks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card rounded-2xl border border-border p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-foreground">Your Top Risk Areas</h3>
            </div>

            <div className="space-y-3">
              {topRisks.map((risk, index) => (
                <motion.div
                  key={risk.category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-foreground">{risk.label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          risk.score >= 70 ? 'bg-emerald-500' :
                          risk.score >= 50 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${risk.score}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                      />
                    </div>
                    <span className={`text-sm font-medium w-8 ${
                      risk.score >= 70 ? 'text-emerald-600' :
                      risk.score >= 50 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {risk.score}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Lower scores indicate areas where buyers would see risk — and discount your value.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 4: #1 Priority Task */}
      <AnimatePresence>
        {revealStage >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {topTask ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="bg-gradient-to-br from-primary/5 via-card to-card rounded-2xl border-2 border-primary/20 p-6 mb-4"
              >
                {/* Priority badge */}
                <div className="flex items-center gap-2 mb-4">
                  <motion.div
                    className="flex items-center gap-2 px-3 py-1 bg-primary rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.3 }}
                  >
                    <Target className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-bold text-white uppercase tracking-wide">
                      Your #1 Priority
                    </span>
                  </motion.div>
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
                    {CATEGORY_LABELS[topTask.category] || topTask.category}
                  </span>
                </div>

                {/* Task title */}
                <h3 className="text-lg font-bold text-foreground font-display mb-2">
                  {topTask.title}
                </h3>

                {/* Task description */}
                {topTask.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {topTask.description}
                  </p>
                )}

                {/* Value impact */}
                {topTask.estimatedValue > 0 && (
                  <motion.div
                    className="flex items-center gap-2 mb-5 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300">
                      Completing this could add{' '}
                      <span className="font-bold">{formatCurrency(topTask.estimatedValue)}</span>{' '}
                      to your valuation
                    </span>
                  </motion.div>
                )}

                {/* Start button */}
                <Button
                  size="lg"
                  onClick={onComplete}
                  className="w-full py-6 text-lg shadow-xl shadow-primary/25 hover:shadow-2xl transition-all"
                >
                  Start This Task
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            ) : (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {tasksCreated} personalized actions ready
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-xl font-bold text-foreground font-display mb-2">
                    Ready to Close the Gap?
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    We&apos;ve built a prioritized action plan to address your biggest risks.
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
            )}

            {/* See all tasks link */}
            {topTask && tasksCreated > 1 && (
              <motion.div
                className="text-center mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  onClick={onComplete}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  or see all {tasksCreated} tasks →
                </button>
              </motion.div>
            )}

            {/* Social Proof - Why this matters */}
            <motion.div
              className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800/30"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    <span className="font-semibold">Buyers pay premium valuations</span> for businesses that clear their readiness bar on day one.
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    Exit Planning Institute, 2025
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
