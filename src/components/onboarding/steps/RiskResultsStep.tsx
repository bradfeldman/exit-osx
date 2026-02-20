'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { BRI_CATEGORY_LABELS } from '@/lib/constants/bri-categories'
import { formatCurrency } from '@/lib/utils/currency'
import { ValuationDisclaimer } from '@/components/ui/ValuationDisclaimer'
import styles from '@/components/onboarding/onboarding.module.css'

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

// Categories addressable without changing revenue
const ADDRESSABLE_WITHOUT_REVENUE = [
  'TRANSFERABILITY',
  'OPERATIONAL',
  'LEGAL_TAX',
  'PERSONAL',
]

export function RiskResultsStep({
  riskResults,
  onContinue,
}: RiskResultsStepProps) {
  const [showContent, setShowContent] = useState(false)
  const [showRisks, setShowRisks] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => setShowContent(true), 300)
    const timer2 = setTimeout(() => setShowRisks(true), 800)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const sortedRisks = Object.entries(riskResults.valueGapByCategory)
    .filter(([, gap]) => gap > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)

  const addressableGap = Object.entries(riskResults.valueGapByCategory)
    .filter(([category]) => ADDRESSABLE_WITHOUT_REVENUE.includes(category))
    .reduce((sum, [, gap]) => sum + gap, 0)

  const addressablePercent = riskResults.valueGap > 0
    ? Math.round((addressableGap / riskResults.valueGap) * 100)
    : 0

  const progressPercent = riskResults.potentialValue > 0
    ? (riskResults.currentValue / riskResults.potentialValue) * 100
    : 0

  const maxGap = Math.max(...Object.values(riskResults.valueGapByCategory))

  return (
    <div className={styles.riskResultsContainer}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.riskResultsCard}
      >
        {/* BRI Score */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showContent ? 1 : 0 }}
          className={styles.riskResultsBriSection}
        >
          <p className={styles.riskResultsBriLabel}>
            Buyer Readiness Index
          </p>
          <div className={styles.riskResultsBriScoreRow}>
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className={styles.riskResultsBriScore}
            >
              {riskResults.briScore}
            </motion.span>
            <span className={styles.riskResultsBriMax}>/ 100</span>
          </div>
        </motion.div>

        {/* Value Gap Amount */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 10 }}
          transition={{ delay: 0.4 }}
          className={styles.riskResultsGapSection}
        >
          <p className={styles.riskResultsGapAmount}>
            {formatCurrency(riskResults.valueGap)}
          </p>
          <p className={styles.riskResultsGapLabel}>Estimated value gap</p>
        </motion.div>

        {/* Current Company Value */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 10 }}
          transition={{ delay: 0.5 }}
          className={styles.riskResultsCurrentSection}
        >
          <p className={styles.riskResultsCurrentLabel}>Your company value today</p>
          <p className={styles.riskResultsCurrentValue}>
            {formatCurrency(riskResults.currentValue)}
          </p>
        </motion.div>

        {/* Gap Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showContent ? 1 : 0 }}
          transition={{ delay: 0.6 }}
          className={styles.riskResultsGapBar}
        >
          <div className={styles.riskResultsGapBarLabels}>
            <span>Current Value</span>
            <span>Potential Value</span>
          </div>
          <div className={styles.riskResultsGapBarTrack}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ delay: 0.8, duration: 1 }}
              className={styles.riskResultsGapBarFill}
            />
          </div>
          <div className={styles.riskResultsGapBarValues}>
            <span>{formatCurrency(riskResults.currentValue)}</span>
            <span>{formatCurrency(riskResults.potentialValue)}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showContent ? 1 : 0 }}
          transition={{ delay: 0.7 }}
          className={styles.riskResultsDisclaimerWrap}
        >
          <ValuationDisclaimer className="text-center" />
        </motion.div>

        {/* Risk Breakdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showRisks ? 1 : 0 }}
          transition={{ delay: 0.2 }}
          className={styles.riskResultsBreakdown}
        >
          <h3 className={styles.riskResultsBreakdownTitle}>Where the gap comes from</h3>
          <div className={styles.riskResultsBreakdownList}>
            {sortedRisks.map(([category, gap], index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: showRisks ? 1 : 0, x: showRisks ? 0 : -20 }}
                transition={{ delay: 0.1 * index }}
                className={styles.riskResultsBreakdownItem}
              >
                <div className={styles.riskResultsBreakdownItemContent}>
                  <p className={styles.riskResultsBreakdownItemLabel}>
                    {BRI_CATEGORY_LABELS[category as keyof typeof BRI_CATEGORY_LABELS] || category}
                  </p>
                  <div className={styles.riskResultsBreakdownItemTrack}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(gap / maxGap) * 100}%` }}
                      transition={{ delay: 0.3 + 0.1 * index, duration: 0.5 }}
                      className={styles.riskResultsBreakdownItemFill}
                    />
                  </div>
                </div>
                <span className={styles.riskResultsBreakdownItemValue}>
                  {formatCurrency(gap)}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Insight Callout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showRisks ? 1 : 0, y: showRisks ? 0 : 10 }}
          transition={{ delay: 0.8 }}
          className={styles.riskResultsInsight}
        >
          <p className={styles.riskResultsInsightMain}>
            <span className={styles.riskResultsInsightPercent}>{addressablePercent}%</span>{' '}
            of this gap is addressable without changing revenue.
          </p>
          <p className={styles.riskResultsInsightSub}>
            Based on how buyers typically discount similar risk profiles in comparable transactions.
          </p>
        </motion.div>

        {/* CTA Button */}
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
