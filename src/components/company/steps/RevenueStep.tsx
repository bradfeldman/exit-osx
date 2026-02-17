'use client'

import { motion } from '@/lib/motion'
import type { CompanyFormData } from '../CompanySetupWizard'

interface RevenueStepProps {
  formData: CompanyFormData
  updateFormData: (updates: Partial<CompanyFormData>) => void
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export function RevenueStep({ formData, updateFormData }: RevenueStepProps) {
  return (
    <div className="space-y-8">
      {/* Header - Matching prototype */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          What&apos;s your annual revenue?
        </h2>
        <p className="text-muted-foreground mt-2">
          This anchors your valuation range.
        </p>
      </motion.div>

      {/* Main Input - Hero style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative p-6 bg-gradient-to-br from-card via-card to-muted/30 rounded-2xl border border-border/50"
      >
        {/* Decorative glow */}
        {formData.annualRevenue > 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        )}

        <div className="relative flex items-baseline gap-1 sm:gap-3">
          <span className="text-3xl sm:text-5xl font-bold text-primary/60 leading-none">$</span>
          <input
            type="text"
            inputMode="numeric"
            value={formData.annualRevenue > 0 ? formData.annualRevenue.toLocaleString() : ''}
            onChange={(e) => updateFormData({ annualRevenue: parseCurrency(e.target.value) })}
            placeholder="0"
            className="flex-1 min-w-0 text-3xl sm:text-5xl font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/20 tracking-tight leading-none"
          />
        </div>
      </motion.div>

      {/* Note - Matching prototype */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <p className="text-sm text-muted-foreground">
          Don&apos;t worry about precision. We&apos;ll refine this as we go.
        </p>
      </motion.div>
    </div>
  )
}
