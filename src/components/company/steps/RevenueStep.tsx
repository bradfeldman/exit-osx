'use client'

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
      <div>
        <h2 className="text-lg font-semibold text-foreground">Annual Revenue</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your company&apos;s estimated annual revenue
        </p>
      </div>

      {/* Main Input */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-semibold text-muted-foreground">$</span>
          <input
            type="text"
            inputMode="numeric"
            value={formData.annualRevenue > 0 ? formData.annualRevenue.toLocaleString() : ''}
            onChange={(e) => updateFormData({ annualRevenue: parseCurrency(e.target.value) })}
            placeholder="0"
            className="flex-1 text-4xl font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/30"
          />
        </div>
        <div className="h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 rounded-full mt-2" />
      </div>

      {/* Quick Select Grid */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Select Range</p>
        <div className="grid grid-cols-3 gap-2">
          {revenueTiers.map((tier, idx) => {
            const isSelected = formData.annualRevenue >= tier.min && formData.annualRevenue < tier.max
            return (
              <button
                key={tier.label}
                type="button"
                onClick={() => handleQuickSelect(tier)}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-xl border-2 p-3 transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50'
                )}
              >
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                )}
                <span className="font-semibold text-sm text-foreground">{tier.shortLabel}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">{tier.category}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Current Tier Display */}
      {formData.annualRevenue > 0 && (
        <div className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20">
          <div className="flex items-center gap-4">
            {/* Progress visual */}
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-muted/30"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${((tierIndex + 1) / revenueTiers.length) * 176} 176`}
                  strokeLinecap="round"
                  className="text-primary"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{tierIndex + 1}</span>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Revenue Category</p>
              <p className="text-xl font-bold text-foreground">{currentTier.label}</p>
              <p className="text-sm text-primary font-medium">{currentTier.category}</p>
            </div>
          </div>
        </div>
      )}

      {/* Why it matters */}
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Why revenue size matters</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Larger companies typically command higher valuation multiples due to reduced risk
            and more established operations.
          </p>
        </div>
      </div>
    </div>
  )
}
