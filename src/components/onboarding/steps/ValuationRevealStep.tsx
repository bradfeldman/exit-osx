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
import styles from '@/components/onboarding/onboarding.module.css'

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
        colors: ['#0071E3', '#1D1D1F', '#FFD700', '#FFFFFF']
      })
    }
  }, [revealStage])

  const roundedBRI = Math.round(briScore)

  // Filter to only show categories that have a gap (gapAmount > 0)
  const categoriesWithGap = categoryGapBreakdown.filter(c => c.gapAmount > 0)

  return (
    <div className={styles.valRevealRoot}>
      {/* Stage 1: Valuation Reveal */}
      <AnimatePresence>
        {revealStage >= 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className={styles.valRevealHero}
          >
            <div className={styles.valRevealHeroCenter}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={styles.valRevealVerifiedBadge}
              >
                <CheckCircle style={{ width: '1rem', height: '1rem' }} />
                Your Personalized Valuation
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={styles.valRevealHeroIntro}
              >
                Based on your specific risk profile,
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={styles.valRevealHeroContext}
              >
                <span className={styles.valRevealHeroCompanyName}>{companyName}</span> is currently worth
              </motion.p>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
                style={{ marginBottom: '1.5rem' }}
              >
                <span className={styles.valRevealAmount}>
                  {formatCurrency(currentValue)}
                </span>
              </motion.div>

              {/* Value gap callout */}
              {valueGap > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className={styles.valRevealGapCallout}
                >
                  <div className={styles.valRevealGapInner}>
                    <TrendingUp style={{ width: '1.25rem', height: '1.25rem', color: '#FCD34D', flexShrink: 0, marginTop: '0.125rem' }} />
                    <div>
                      <p className={styles.valRevealGapText}>
                        You could be worth{' '}
                        <span className={styles.valRevealGapPotential}>{formatCurrency(potentialValue)}</span>
                      </p>
                      <p className={styles.valRevealGapSubtext}>
                        That&apos;s{' '}
                        <span className={styles.valRevealGapSubAmount}>{formatCurrency(valueGap)}</span>{' '}
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
            className={styles.valRevealBriCard}
          >
            <div className={styles.valRevealBriInner}>
              <div>
                <h3 className={styles.valRevealBriLabel}>
                  Buyer Readiness Index
                </h3>
                <p className={styles.valRevealBriDesc}>
                  How attractive you are to buyers
                </p>
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className={styles.valRevealBriGaugeWrap}
              >
                <svg className={styles.valRevealBriGauge} viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke="rgba(0, 113, 227, 0.2)"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 42}
                    initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - roundedBRI / 100) }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  />
                </svg>
                <div className={styles.valRevealBriGaugeCenter}>
                  <span className={styles.valRevealBriScore}>
                    {roundedBRI}
                  </span>
                  <span className={styles.valRevealBriUnit}>/100</span>
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
            className={styles.valRevealBreakdownCard}
          >
            <div className={styles.valRevealBreakdownTitleRow}>
              <DollarSign style={{ width: '1.25rem', height: '1.25rem', color: 'var(--primary)' }} />
              <h3 className={styles.valRevealBreakdownTitle}>Where Your Value Gap Comes From</h3>
            </div>

            <p className={styles.valRevealBreakdownSubtext}>
              Here&apos;s how much each area is costing you:
            </p>

            <div className={styles.valRevealCategoryList}>
              {categoriesWithGap.map((item, index) => {
                const Icon = CATEGORY_ICONS[item.category] || Settings
                const isHigh = item.gapPercent >= 25
                const isMed = item.gapPercent >= 15 && item.gapPercent < 25

                return (
                  <motion.div
                    key={item.category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={styles.valRevealCategoryItem}
                  >
                    <div className={styles.valRevealCategoryRow}>
                      <div className={styles.valRevealCategoryLeft}>
                        <div className={
                          isHigh ? styles.valRevealCategoryIconWrapHigh
                          : isMed ? styles.valRevealCategoryIconWrapMed
                          : styles.valRevealCategoryIconWrapLow
                        }>
                          <Icon className={
                            isHigh ? styles.valRevealCategoryIconHigh
                            : isMed ? styles.valRevealCategoryIconMed
                            : styles.valRevealCategoryIconLow
                          } />
                        </div>
                        <div>
                          <span className={styles.valRevealCategoryName}>{item.label}</span>
                          <span className={styles.valRevealCategoryScore}>
                            Score: {item.score}/100
                          </span>
                        </div>
                      </div>
                      <div className={styles.valRevealCategoryRight}>
                        <span className={
                          isHigh ? styles.valRevealCategoryGapHigh
                          : isMed ? styles.valRevealCategoryGapMed
                          : styles.valRevealCategoryGapLow
                        }>
                          {formatCurrency(item.gapAmount)}
                        </span>
                        <span className={styles.valRevealCategoryGapPct}>
                          {item.gapPercent}% of gap
                        </span>
                      </div>
                    </div>
                    {/* Progress bar showing contribution to gap */}
                    <div className={styles.valRevealProgressTrack}>
                      <motion.div
                        className={
                          isHigh ? styles.valRevealProgressBarHigh
                          : isMed ? styles.valRevealProgressBarMed
                          : styles.valRevealProgressBarLow
                        }
                        initial={{ width: 0 }}
                        animate={{ width: `${item.gapPercent}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <div className={styles.valRevealTotalRow}>
              <span className={styles.valRevealTotalLabel}>Total Value Gap</span>
              <span className={styles.valRevealTotalAmount}>{formatCurrency(valueGap)}</span>
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
            <div className={styles.valRevealCtaSection}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className={styles.valRevealCtaTitle}>
                  Ready to Close the Gap?
                </h3>
                <p className={styles.valRevealCtaText}>
                  Your personalized action plan is ready. We&apos;ll help you tackle the biggest opportunities first.
                </p>

                <Button
                  size="lg"
                  onClick={onComplete}
                  className="w-full sm:w-auto px-8 py-6 text-lg shadow-xl shadow-primary/25 hover:shadow-2xl transition-all"
                >
                  See Your Action Plan
                  <ArrowRight style={{ marginLeft: '0.5rem', width: '1.25rem', height: '1.25rem' }} />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
