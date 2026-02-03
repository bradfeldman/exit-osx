'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  Users,
  Settings,
  Target,
  Scale,
  User,
  ArrowRight,
  TrendingDown,
} from 'lucide-react'

const CATEGORY_CONFIG: Record<string, {
  label: string
  icon: React.ElementType
  description: string
}> = {
  FINANCIAL: {
    label: 'Financial Health',
    icon: DollarSign,
    description: 'Revenue consistency, margins, and financial records',
  },
  TRANSFERABILITY: {
    label: 'Transferability',
    icon: Users,
    description: 'Owner dependency and business continuity',
  },
  OPERATIONAL: {
    label: 'Operations',
    icon: Settings,
    description: 'Processes, systems, and scalability',
  },
  MARKET: {
    label: 'Market Position',
    icon: Target,
    description: 'Competitive strength and growth potential',
  },
  LEGAL_TAX: {
    label: 'Legal & Tax',
    icon: Scale,
    description: 'Compliance, contracts, and regulatory standing',
  },
  PERSONAL: {
    label: 'Personal Readiness',
    icon: User,
    description: 'Owner preparedness and transition planning',
  },
}

interface RiskResultsStepProps {
  companyName: string
  riskResults: {
    briScore: number
    categoryScores: Record<string, number>
    valueGapByCategory: Record<string, number>
    currentValue: number
    potentialValue: number
    valueGap: number
  }
  onContinue: () => void
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

function getScoreColor(score: number): string {
  if (score < 40) return 'text-red-600'
  if (score < 70) return 'text-amber-600'
  return 'text-emerald-600'
}

function getBarColor(score: number): string {
  if (score < 40) return 'bg-red-500'
  if (score < 70) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export function RiskResultsStep({
  companyName,
  riskResults,
  onContinue,
}: RiskResultsStepProps) {
  const [showCategories, setShowCategories] = useState(false)
  const [revealedCategories, setRevealedCategories] = useState<number>(0)

  // Animate the reveal
  useEffect(() => {
    const timer1 = setTimeout(() => setShowCategories(true), 500)
    return () => clearTimeout(timer1)
  }, [])

  useEffect(() => {
    if (showCategories) {
      const interval = setInterval(() => {
        setRevealedCategories(prev => {
          if (prev >= Object.keys(riskResults.categoryScores).length) {
            clearInterval(interval)
            return prev
          }
          return prev + 1
        })
      }, 200)
      return () => clearInterval(interval)
    }
  }, [showCategories, riskResults.categoryScores])

  // Sort categories by value gap (highest impact first)
  const sortedCategories = Object.entries(riskResults.categoryScores)
    .map(([category, score]) => ({
      category,
      score,
      valueGap: riskResults.valueGapByCategory[category] || 0,
      config: CATEGORY_CONFIG[category] || { label: category, icon: Settings, description: '' },
    }))
    .sort((a, b) => b.valueGap - a.valueGap)

  // Get top risk categories (score < 70)
  const highRiskCategories = sortedCategories.filter(c => c.score < 70)

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          Your Risk Profile
        </h2>
        <p className="text-muted-foreground mt-2">
          Here&apos;s what&apos;s impacting {companyName}&apos;s value
        </p>
      </motion.div>

      {/* Value Gap Summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-950/30 dark:to-amber-950/30 rounded-2xl p-6 border border-red-200/50 dark:border-red-800/30"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Value Gap</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(riskResults.valueGap)}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          This is the difference between your current value ({formatCurrency(riskResults.currentValue)})
          and your potential value ({formatCurrency(riskResults.potentialValue)}) based on your risk profile.
        </p>
      </motion.div>

      {/* Category Breakdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showCategories ? 1 : 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <h3 className="text-lg font-semibold text-foreground">Risk by Category</h3>

        <div className="space-y-3">
          {sortedCategories.map((item, index) => {
            const Icon = item.config.icon
            const isRevealed = index < revealedCategories

            return (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isRevealed ? 1 : 0, x: isRevealed ? 0 : -20 }}
                transition={{ duration: 0.3 }}
                className={`p-4 rounded-xl border ${
                  item.score < 40
                    ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/30'
                    : item.score < 70
                      ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/30'
                      : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.score < 40
                        ? 'bg-red-100 dark:bg-red-900/50'
                        : item.score < 70
                          ? 'bg-amber-100 dark:bg-amber-900/50'
                          : 'bg-emerald-100 dark:bg-emerald-900/50'
                    }`}>
                      <Icon className={`w-4 h-4 ${getScoreColor(item.score)}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.config.label}</p>
                      <p className="text-xs text-muted-foreground">{item.config.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getScoreColor(item.score)}`}>
                      {Math.round(item.score)}
                    </p>
                    {item.valueGap > 0 && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        -{formatCurrency(item.valueGap)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isRevealed ? `${item.score}%` : 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className={`h-full ${getBarColor(item.score)}`}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Call to Action */}
      {highRiskCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: revealedCategories >= sortedCategories.length ? 1 : 0, y: revealedCategories >= sortedCategories.length ? 0 : 20 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-6"
        >
          <h3 className="font-semibold text-foreground mb-2">
            {highRiskCategories.length} {highRiskCategories.length === 1 ? 'area needs' : 'areas need'} attention
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            We&apos;ll ask a few quick questions to understand how these risks specifically affect {companyName},
            then create a targeted action plan.
          </p>
          <Button onClick={onContinue} className="w-full gap-2">
            Continue to Risk Deep-Dive
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* If no high risk categories, still allow continuing */}
      {highRiskCategories.length === 0 && revealedCategories >= sortedCategories.length && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
            Great news! Your risk profile is relatively healthy.
          </p>
          <Button onClick={onContinue} className="gap-2">
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </div>
  )
}
