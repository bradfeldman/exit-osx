'use client'

import { motion } from '@/lib/motion'
import { CheckCircle2, DollarSign, Users, Calendar, TrendingUp } from 'lucide-react'

interface FinancialQuickScanStepProps {
  annualRevenue: number
  ebitdaEstimate: number
  employeeCount: number
  yearsInBusiness: number
  updateState: (updates: {
    annualRevenue?: number
    ebitdaEstimate?: number
    employeeCount?: number
    yearsInBusiness?: number
  }) => void
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export function FinancialQuickScanStep({
  annualRevenue,
  ebitdaEstimate,
  employeeCount,
  yearsInBusiness,
  updateState,
}: FinancialQuickScanStepProps) {
  const isComplete = annualRevenue > 0

  return (
    <div className="space-y-8">
      {/* Revenue Input - Hero Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative p-6 bg-gradient-to-br from-card via-card to-muted/30 rounded-2xl border border-border/50"
      >
        {/* Decorative glow */}
        {annualRevenue > 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        )}

        <div className="relative">
          <label htmlFor="annual-revenue" className="block text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Annual Revenue
          </label>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl sm:text-5xl font-bold text-primary/60">$</span>
            <input
              id="annual-revenue"
              type="text"
              inputMode="numeric"
              value={annualRevenue > 0 ? annualRevenue.toLocaleString() : ''}
              onChange={(e) => updateState({ annualRevenue: parseCurrency(e.target.value) })}
              placeholder="0"
              className="flex-1 text-4xl sm:text-5xl font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/20 tracking-tight"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            This anchors your valuation range. Don&apos;t worry about precision.
          </p>
        </div>
      </motion.div>

      {/* Optional Quick Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        <p className="text-sm font-semibold text-foreground">
          Optional: Help us refine your estimate
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* EBITDA Estimate */}
          <div className="space-y-2">
            <label htmlFor="ebitda-estimate" className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Estimated Profit (EBITDA)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                id="ebitda-estimate"
                type="text"
                inputMode="numeric"
                value={ebitdaEstimate > 0 ? ebitdaEstimate.toLocaleString() : ''}
                onChange={(e) => updateState({ ebitdaEstimate: parseCurrency(e.target.value) })}
                placeholder="Optional"
                className="w-full pl-7 pr-3 py-2.5 text-sm bg-card border border-border rounded-lg focus:border-primary focus:ring-0 outline-none transition-all placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          {/* Employee Count */}
          <div className="space-y-2">
            <label htmlFor="employee-count" className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Number of Employees
            </label>
            <input
              id="employee-count"
              type="number"
              inputMode="numeric"
              min="0"
              value={employeeCount || ''}
              onChange={(e) => updateState({ employeeCount: parseInt(e.target.value, 10) || 0 })}
              placeholder="Optional"
              className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg focus:border-primary focus:ring-0 outline-none transition-all placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Years in Business */}
          <div className="space-y-2">
            <label htmlFor="years-in-business" className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Years in Business
            </label>
            <input
              id="years-in-business"
              type="number"
              inputMode="numeric"
              min="0"
              value={yearsInBusiness || ''}
              onChange={(e) => updateState({ yearsInBusiness: parseInt(e.target.value, 10) || 0 })}
              placeholder="Optional"
              className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg focus:border-primary focus:ring-0 outline-none transition-all placeholder:text-muted-foreground/40"
            />
          </div>
        </div>
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex items-start gap-4 p-5 bg-gradient-to-r from-muted/80 to-muted/40 rounded-2xl border border-border/50"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            How we use this data
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Annual revenue is the primary input for valuation. Optional fields help refine estimates but aren&apos;t required—we&apos;ll use industry averages where needed.
          </p>
        </div>
      </motion.div>

      {/* Completion Indicator */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-center"
        >
          <CheckCircle2 className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">
            Ready to assess buyer readiness
          </p>
        </motion.div>
      )}
    </div>
  )
}
