'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, TrendingUp, Target } from 'lucide-react'
import { useCountUpCurrency, useCountUpScore } from '@/hooks/useCountUp'

interface ReadinessSummaryStepProps {
  companyName: string
  briScore: number
  currentValue: number
  potentialValue: number
  valueGap: number
  categoryScores: Record<string, number>
  topTasks: Array<{ id: string; title: string }>
  onComplete: () => void
}

export function ReadinessSummaryStep({
  companyName,
  briScore,
  currentValue,
  potentialValue,
  valueGap,
  categoryScores,
  topTasks,
  onComplete,
}: ReadinessSummaryStepProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Animate reveal
  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(true), 600)
    return () => clearTimeout(timer)
  }, [])

  // Animated counters
  const { value: animatedBRI } = useCountUpScore(briScore, { duration: 2000 })
  const { value: animatedCurrent } = useCountUpCurrency(currentValue, { duration: 2000 })
  const { value: animatedPotential } = useCountUpCurrency(potentialValue, { duration: 2000 })
  const { value: animatedGap } = useCountUpCurrency(valueGap, { duration: 2000 })

  // Progress percentage
  const progressPercent = potentialValue > 0
    ? (currentValue / potentialValue) * 100
    : 0

  // Top 3 risk categories
  const topRisks = Object.entries(categoryScores)
    .filter(([cat]) => cat !== 'PERSONAL')
    .map(([cat, score]) => ({
      category: cat,
      score: score as number,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)

  const CATEGORY_LABELS: Record<string, string> = {
    FINANCIAL: 'Financial Health',
    TRANSFERABILITY: 'Founder Dependency',
    OPERATIONAL: 'Operational Systems',
    MARKET: 'Market Position',
    LEGAL_TAX: 'Legal & Compliance',
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl sm:text-4xl font-bold font-display text-foreground mb-2">
          Your Exit Readiness Report
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s what buyers will see when they evaluate {companyName}
        </p>
      </motion.div>

      {/* BRI Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-card via-card to-primary/5 rounded-2xl border-2 border-border p-8 shadow-xl"
      >
        <div className="text-center mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Buyer Readiness Score
          </p>
          <div className="flex items-baseline justify-center gap-1">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="text-6xl font-bold text-foreground"
            >
              {animatedBRI}
            </motion.span>
            <span className="text-2xl text-muted-foreground">/ 100</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {briScore >= 75 ? 'Excellent' : briScore >= 60 ? 'Strong' : briScore >= 40 ? 'Developing' : 'Critical'}
          </p>
        </div>

        {/* Valuation Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-border">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Current Value</p>
            <p className="text-xl font-bold text-foreground">{animatedCurrent}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Potential Value</p>
            <p className="text-xl font-bold text-foreground">{animatedPotential}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Value Gap</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-500">{animatedGap}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <span>Current</span>
            <span>Potential</span>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ delay: 0.8, duration: 1.5 }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-blue-400 rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* Key Findings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showDetails ? 1 : 0, y: showDetails ? 0 : 20 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Top Areas for Improvement
        </h3>

        {topRisks.map((risk, index) => (
          <motion.div
            key={risk.category}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: showDetails ? 1 : 0, x: showDetails ? 0 : -20 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            className="flex items-center justify-between p-4 bg-card rounded-xl border border-border"
          >
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {CATEGORY_LABELS[risk.category] || risk.category}
              </p>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${risk.score}%` }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.8 }}
                  className={`h-full rounded-full ${
                    risk.score >= 75
                      ? 'bg-green-500'
                      : risk.score >= 60
                        ? 'bg-blue-500'
                        : risk.score >= 40
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                  }`}
                />
              </div>
            </div>
            <span className="ml-4 text-lg font-bold text-foreground">
              {risk.score}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* Next Steps */}
      {topTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showDetails ? 1 : 0, y: showDetails ? 0 : 20 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-xl p-6 border border-amber-200 dark:border-amber-800/30"
        >
          <div className="flex items-start gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                Your Personalized Action Plan
              </h3>
              <p className="text-sm text-muted-foreground">
                We&apos;ve generated {topTasks.length} high-impact tasks to close your value gap. Start with:
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {topTasks.slice(0, 3).map((task, index) => (
              <div
                key={task.id}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <span>{task.title}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showDetails ? 1 : 0, y: showDetails ? 0 : 20 }}
        transition={{ delay: 1 }}
        className="space-y-4"
      >
        <Button
          onClick={onComplete}
          size="lg"
          className="w-full gap-2 text-lg py-6"
        >
          Start Improving My Business
          <ArrowRight className="w-5 h-5" />
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Your complete report and action plan are waiting in your dashboard
        </p>
      </motion.div>
    </div>
  )
}
