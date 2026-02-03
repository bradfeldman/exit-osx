'use client'

import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface CelebrationStepProps {
  recoveredValue: number
  onContinue: () => void
  onLater: () => void
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`
  }
  return `$${value.toFixed(0)}`
}

export function CelebrationStep({
  recoveredValue,
  onContinue,
  onLater,
}: CelebrationStepProps) {
  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card rounded-2xl border border-border p-8 shadow-lg text-center"
      >
        {/* Celebration Icon - Matching prototype */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30"
        >
          <Check className="w-10 h-10 text-white" strokeWidth={3} />
        </motion.div>

        {/* Headline - Matching prototype */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-foreground mb-2"
        >
          Buyer concern removed
        </motion.h2>

        {/* Value recovered - Matching prototype */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-muted-foreground"
        >
          You just recovered{' '}
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {formatCurrency(recoveredValue)}
          </span>{' '}
          in potential value.
        </motion.p>

        {/* Divider and momentum section - Matching prototype */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 pt-6 border-t border-border"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Keep the momentum going?
          </p>
          <div className="flex items-center justify-center gap-3">
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
