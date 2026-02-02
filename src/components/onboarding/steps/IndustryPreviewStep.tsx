'use client'

import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowRight, TrendingUp, Users, TrendingDown } from 'lucide-react'

interface IndustryPreviewStepProps {
  companyName: string
  industryName: string
  valuationLow: number
  valuationHigh: number
  potentialGap: number
  onContinue: () => void
  onSkip: () => void
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toLocaleString()}`
}

export function IndustryPreviewStep({
  companyName,
  industryName,
  valuationLow,
  valuationHigh,
  potentialGap,
  onContinue,
  onSkip,
}: IndustryPreviewStepProps) {
  return (
    <div className="max-w-xl mx-auto">
      {/* Main valuation card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-2xl mb-6"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-sm text-white/80 mb-4"
          >
            <TrendingUp className="w-4 h-4" />
            Industry Preview
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-white/70 mb-2"
          >
            Businesses like <span className="text-white font-medium">{companyName}</span> in
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-white/60 text-sm mb-6"
          >
            {industryName}
          </motion.p>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
            className="mb-2"
          >
            <span className="text-5xl md:text-6xl font-bold font-display">
              {formatCurrency(valuationLow)} - {formatCurrency(valuationHigh)}
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-white/60 text-sm"
          >
            Typical selling range for similar businesses
          </motion.p>
        </div>

        {/* Warning banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-100 font-medium text-sm">
                But most owners leave 30-50% on the table
              </p>
              <p className="text-amber-200/70 text-sm mt-1">
                Hidden risks that buyers see — but sellers don&apos;t — often cost{' '}
                <span className="text-amber-100 font-semibold">{formatCurrency(potentialGap)}+</span> in lost value.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Market Reality - Social Proof */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="bg-card rounded-2xl border border-border p-5 mb-6"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground mb-1">
              The harsh reality
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">80% of businesses that go to market fail to sell.</span>{' '}
              Not because they lack value—but because owners discover critical gaps too late.
            </p>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Source: Exit Planning Institute, 2025
            </p>
          </div>
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
        className="text-center"
      >
        <p className="text-muted-foreground mb-6">
          Let&apos;s find <span className="text-foreground font-medium">your</span> specific risks in about 5 minutes.
        </p>

        <Button
          size="lg"
          onClick={onContinue}
          className="w-full sm:w-auto px-8 py-6 text-lg shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all"
        >
          Discover What You&apos;re Leaving Behind
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>

        <button
          onClick={onSkip}
          className="block mx-auto mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </motion.div>
    </div>
  )
}
