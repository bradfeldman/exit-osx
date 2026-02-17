'use client'

import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'

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
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card rounded-2xl border border-border p-8 shadow-lg"
      >
        {/* Valuation Reveal - Matching prototype */}
        <div className="text-center mb-8">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-muted-foreground mb-2"
          >
            Based on {industryName}
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-semibold text-foreground mb-6"
          >
            Your estimated valuation range
          </motion.h2>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
            className="flex items-baseline justify-center gap-4 mb-4"
          >
            <span className="text-4xl md:text-5xl font-bold text-foreground">
              {formatCurrency(valuationLow)}
            </span>
            <span className="text-xl text-muted-foreground">to</span>
            <span className="text-4xl md:text-5xl font-bold text-foreground">
              {formatCurrency(valuationHigh)}
            </span>
          </motion.div>

          {/* Valuation bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="h-3 bg-muted rounded-full overflow-hidden mb-6"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.8, duration: 1 }}
              className="h-full bg-gradient-to-r from-muted-foreground/50 to-primary rounded-full"
            />
          </motion.div>
        </div>

        {/* Context box - Matching prototype with amber left border */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="bg-muted/50 border-l-4 border-amber-500 rounded-r-lg p-4 mb-6"
        >
          <p className="text-foreground font-medium text-sm mb-2">
            This range reflects what buyers typically pay for businesses like yours—before diligence.
          </p>
          <p className="text-muted-foreground text-sm">
            The spread isn&apos;t about revenue. It&apos;s about how much risk a buyer perceives. Let&apos;s find out where you fall.
          </p>
        </motion.div>

        {/* CTA text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center text-muted-foreground mb-6"
        >
          Let&apos;s find out where you fall in that range.
        </motion.p>

        {/* Data source */}
        {multipleSource && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="text-center text-[10px] text-muted-foreground/60 mb-4"
          >
            Source: {multipleSource}
          </motion.p>
        )}

        {/* Navigation - Matching prototype */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="flex items-center justify-between"
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
