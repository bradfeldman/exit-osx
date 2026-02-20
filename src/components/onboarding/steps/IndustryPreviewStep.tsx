'use client'

import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { ValuationDisclaimer } from '@/components/ui/ValuationDisclaimer'
import styles from '@/components/onboarding/onboarding.module.css'

interface IndustryPreviewStepProps {
  companyName: string
  industryName: string
  valuationLow: number
  valuationHigh: number
  potentialGap: number
  onContinue: () => void
  onBack?: () => void
  multipleSource?: string | null
}

export function IndustryPreviewStep({
  industryName,
  valuationLow,
  valuationHigh,
  onContinue,
  onBack,
  multipleSource,
}: IndustryPreviewStepProps) {
  return (
    <div className={styles.indPreviewContainer}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.indPreviewCard}
      >
        {/* Valuation Reveal */}
        <div className={styles.indPreviewRevealSection}>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={styles.indPreviewIndustryLabel}
          >
            Based on {industryName}
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={styles.indPreviewHeading}
          >
            Your estimated valuation range
          </motion.h2>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
            className={styles.indPreviewValuationRange}
          >
            <span className={styles.indPreviewValuationAmount}>
              {formatCurrency(valuationLow)}
            </span>
            <span className={styles.indPreviewValuationSep}>to</span>
            <span className={styles.indPreviewValuationAmount}>
              {formatCurrency(valuationHigh)}
            </span>
          </motion.div>

          {/* Valuation bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className={styles.indPreviewValuationBar}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.8, duration: 1 }}
              className={styles.indPreviewValuationBarFill}
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className={styles.indPreviewDisclaimerWrap}
        >
          <ValuationDisclaimer className="text-center mb-6" />
        </motion.div>

        {/* Context box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className={styles.indPreviewContextBox}
        >
          <p className={styles.indPreviewContextMain}>
            This range reflects what buyers typically pay for businesses like yours—before diligence.
          </p>
          <p className={styles.indPreviewContextSub}>
            The spread isn&apos;t about revenue. It&apos;s about how much risk a buyer perceives. Let&apos;s find out where you fall.
          </p>
        </motion.div>

        {/* CTA text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className={styles.indPreviewCtaText}
        >
          Let&apos;s find out where you fall in that range.
        </motion.p>

        {/* Data source */}
        {multipleSource && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className={styles.indPreviewSource}
          >
            Source: {multipleSource}
          </motion.p>
        )}

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className={styles.indPreviewNavRow}
        >
          <Button
            variant="ghost"
            onClick={() => onBack?.()}
          >
            Back
          </Button>
          <Button onClick={onContinue}>
            Start Buyer Assessment
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
