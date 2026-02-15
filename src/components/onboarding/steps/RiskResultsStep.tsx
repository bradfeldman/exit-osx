'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { BRI_CATEGORY_LABELS } from '@/lib/constants/bri-categories'
import { formatCurrency } from '@/lib/utils/currency'

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

// Categories that can be addressed without changing revenue
// (vs FINANCIAL and MARKET which typically require revenue/growth changes)
const ADDRESSABLE_WITHOUT_REVENUE = [
  'TRANSFERABILITY', // Transferability - process/documentation
  'OPERATIONAL',     // Operations - systems/processes
  'LEGAL_TAX',       // Legal & Tax - compliance/structure
  'PERSONAL',        // Personal Readiness - planning/preparation
]

export function RiskResultsStep({
  riskResults,
  onContinue,
}: RiskResultsStepProps) {
  const [showContent, setShowContent] = useState(false)
  const [showRisks, setShowRisks] = useState(false)

  // Animate reveal
  useEffect(() => {
    const timer1 = setTimeout(() => setShowContent(true), 300)
    const timer2 = setTimeout(() => setShowRisks(true), 800)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  // Sort risks by value gap (highest first), only show ones with gap > 0
  const sortedRisks = Object.entries(riskResults.valueGapByCategory)
    .filter(([, gap]) => gap > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4) // Show top 4 risks

  // Calculate percentage of gap that's addressable without revenue changes
  const addressableGap = Object.entries(riskResults.valueGapByCategory)
    .filter(([category]) => ADDRESSABLE_WITHOUT_REVENUE.includes(category))
    .reduce((sum, [, gap]) => sum + gap, 0)

  const addressablePercent = riskResults.valueGap > 0
    ? Math.round((addressableGap / riskResults.valueGap) * 100)
    : 0

  // Calculate progress percentage
  const progressPercent = riskResults.potentialValue > 0
    ? (riskResults.currentValue / riskResults.potentialValue) * 100
    : 0

  // Max gap for bar width calculation
  const maxGap = Math.max(...Object.values(riskResults.valueGapByCategory))

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card rounded-2xl border border-border p-8 shadow-lg"
      >
        {/* BRI Score - Matching prototype */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showContent ? 1 : 0 }}
          className="text-center mb-6"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Buyer Readiness Score
          </p>
          <div className="flex items-baseline justify-center gap-1">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-6xl font-bold text-foreground"
            >
              {riskResults.briScore}
            </motion.span>
            <span className="text-2xl text-muted-foreground">/ 100</span>
          </div>
        </motion.div>

        {/* Value Gap Amount - Matching prototype */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 10 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-6"
        >
          <p className="text-4xl font-bold text-red-600 dark:text-red-500 mb-1">
            {formatCurrency(riskResults.valueGap)}
          </p>
          <p className="text-muted-foreground">Estimated value gap</p>
        </motion.div>

        {/* Current Company Value - Clear label */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 10 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-4"
        >
          <p className="text-sm text-muted-foreground mb-1">Your company value today</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(riskResults.currentValue)}
          </p>
        </motion.div>

        {/* Gap Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showContent ? 1 : 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <span>Current Value</span>
            <span>Potential Value</span>
          </div>
          <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ delay: 0.8, duration: 1 }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-blue-400 rounded-lg"
            />
          </div>
          <div className="flex justify-between text-sm font-semibold text-foreground mt-2">
            <span>{formatCurrency(riskResults.currentValue)}</span>
            <span>{formatCurrency(riskResults.potentialValue)}</span>
          </div>
        </motion.div>

        {/* Risk Breakdown - Matching prototype */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showRisks ? 1 : 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h3 className="font-semibold text-foreground mb-4">Where the gap comes from</h3>
          <div className="space-y-4">
            {sortedRisks.map(([category, gap], index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: showRisks ? 1 : 0, x: showRisks ? 0 : -20 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-4"
              >
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    {BRI_CATEGORY_LABELS[category as keyof typeof BRI_CATEGORY_LABELS] || category}
                  </p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(gap / maxGap) * 100}%` }}
                      transition={{ delay: 0.3 + 0.1 * index, duration: 0.5 }}
                      className="h-full bg-red-500 rounded-full"
                    />
                  </div>
                </div>
                <span className="font-semibold text-foreground min-w-[80px] text-right">
                  {formatCurrency(gap)}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Insight Callout - Matching prototype */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showRisks ? 1 : 0, y: showRisks ? 0 : 10 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-xl p-4 mb-6"
        >
          <p className="text-foreground font-medium">
            <span className="font-bold">{addressablePercent}%</span> of this gap is addressable without changing revenue.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Based on how buyers typically discount similar risk profiles in comparable transactions.
          </p>
        </motion.div>

        {/* CTA Button - Matching prototype */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showRisks ? 1 : 0, y: showRisks ? 0 : 20 }}
          transition={{ delay: 1 }}
        >
          <Button onClick={onContinue} className="w-full gap-2" size="lg">
            Show Me How to Close It
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
