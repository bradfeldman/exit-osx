'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
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

const revenueTiers = [
  { min: 0, max: 500000, label: 'Under $500K', shortLabel: '<$500K', category: 'Early stage' },
  { min: 500000, max: 1000000, label: '$500K - $1M', shortLabel: '$500K-1M', category: 'Small business' },
  { min: 1000000, max: 3000000, label: '$1M - $3M', shortLabel: '$1M-3M', category: 'Established' },
  { min: 3000000, max: 10000000, label: '$3M - $10M', shortLabel: '$3M-10M', category: 'Lower middle market' },
  { min: 10000000, max: 25000000, label: '$10M - $25M', shortLabel: '$10M-25M', category: 'Middle market' },
  { min: 25000000, max: Infinity, label: 'Over $25M', shortLabel: '>$25M', category: 'Upper middle market' },
]

function getCurrentTier(revenue: number) {
  return revenueTiers.find(tier => revenue >= tier.min && revenue < tier.max) || revenueTiers[0]
}

function getTierIndex(revenue: number) {
  return revenueTiers.findIndex(tier => revenue >= tier.min && revenue < tier.max)
}

export function RevenueStep({ formData, updateFormData }: RevenueStepProps) {
  const currentTier = getCurrentTier(formData.annualRevenue)
  const tierIndex = getTierIndex(formData.annualRevenue)

  const handleQuickSelect = (tier: typeof revenueTiers[0]) => {
    // Set to the middle of the range for display
    const midpoint = tier.max === Infinity
      ? tier.min + 5000000
      : Math.round((tier.min + tier.max) / 2)
    updateFormData({ annualRevenue: midpoint })
  }

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
        <div className="relative h-1.5 bg-muted rounded-full mt-4 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-amber-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: formData.annualRevenue > 0 ? `${Math.min(((tierIndex + 1) / revenueTiers.length) * 100, 100)}%` : '0%' }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Quick Select Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-3"
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Select Range</p>
        <div className="grid grid-cols-3 gap-3">
          {revenueTiers.map((tier, idx) => {
            const isSelected = formData.annualRevenue >= tier.min && formData.annualRevenue < tier.max
            return (
              <motion.button
                key={tier.label}
                type="button"
                onClick={() => handleQuickSelect(tier)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 + idx * 0.05 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-gradient-to-br from-primary/15 to-primary/5 shadow-lg shadow-primary/20'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5 hover:shadow-md'
                )}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-primary to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-primary/40"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </motion.div>
                )}
                <span className={cn(
                  "font-bold text-sm",
                  isSelected ? "text-primary" : "text-foreground"
                )}>{tier.shortLabel}</span>
                <span className="text-[11px] text-muted-foreground mt-1">{tier.category}</span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Current Tier Display */}
      {formData.annualRevenue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative overflow-hidden p-6 bg-gradient-to-br from-primary/15 via-primary/10 to-amber-500/5 rounded-2xl border border-primary/30 shadow-lg shadow-primary/10"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex items-center gap-5">
            {/* Progress visual */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted/20"
                />
                <motion.circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="url(#progressGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 214" }}
                  animate={{ strokeDasharray: `${((tierIndex + 1) / revenueTiers.length) * 214} 214` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#B87333" />
                    <stop offset="100%" stopColor="#D4A574" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="text-2xl font-bold text-primary"
                >
                  {tierIndex + 1}
                </motion.span>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-xs text-primary font-semibold uppercase tracking-wider">Revenue Category</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{currentTier.label}</p>
              <p className="text-sm text-muted-foreground mt-1">{currentTier.category}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Why it matters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
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
