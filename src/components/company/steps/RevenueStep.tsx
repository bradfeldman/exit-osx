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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold font-display bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
          Annual Revenue
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Enter your company&apos;s estimated annual revenue
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

        <div className="relative flex items-baseline gap-3">
          <span className="text-4xl sm:text-5xl font-bold text-primary/60">$</span>
          <input
            type="text"
            inputMode="numeric"
            value={formData.annualRevenue > 0 ? formData.annualRevenue.toLocaleString() : ''}
            onChange={(e) => updateFormData({ annualRevenue: parseCurrency(e.target.value) })}
            placeholder="0"
            className="flex-1 text-4xl sm:text-5xl font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/20 tracking-tight"
          />
        </div>
      </motion.div>

      {/* Why it matters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex items-start gap-4 p-5 bg-gradient-to-r from-muted/80 to-muted/40 rounded-2xl border border-border/50"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Why revenue size matters</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Larger companies typically command higher valuation multiples due to reduced risk
            and more established operations.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
