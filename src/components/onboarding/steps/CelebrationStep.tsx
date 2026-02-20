'use client'

import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { Check } from 'lucide-react'
import styles from '@/components/onboarding/onboarding.module.css'

interface CelebrationStepProps {
  recoveredValue: number
  onContinue: () => void
  onLater: () => void
}

export function CelebrationStep({
  recoveredValue,
  onContinue,
  onLater,
}: CelebrationStepProps) {
  return (
    <div className={styles.celebrateRoot}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.celebrateCard}
      >
        {/* Celebration Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className={styles.celebrateIconWrap}
        >
          <Check className={styles.celebrateIcon} strokeWidth={3} />
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={styles.celebrateTitle}
        >
          Buyer concern removed
        </motion.h2>

        {/* Value recovered */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className={styles.celebrateValueText}
        >
          You just recovered{' '}
          <span className={styles.celebrateValueAmount}>
            {formatCurrency(recoveredValue)}
          </span>{' '}
          in potential value.
        </motion.p>

        {/* Divider and momentum section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className={styles.celebrateDivider}
        >
          <p className={styles.celebrateMomentumLabel}>
            Keep the momentum going?
          </p>
          <div className={styles.celebrateActions}>
            <Button onClick={onContinue}>
              Yes, show me what&apos;s next
            </Button>
            <Button variant="secondary" onClick={onLater}>
              I&apos;ll come back later
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
