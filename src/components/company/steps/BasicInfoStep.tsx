'use client'

import { motion } from 'framer-motion'
import { IndustryCombobox } from '../IndustryCombobox'
import { IndustryFinderDialog } from '../IndustryFinderDialog'
import type { CompanyFormData } from '../CompanySetupWizard'

interface BasicInfoStepProps {
  formData: CompanyFormData
  updateFormData: (updates: Partial<CompanyFormData>) => void
}

export function BasicInfoStep({ formData, updateFormData }: BasicInfoStepProps) {
  const handleIndustrySelect = (selection: {
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
  }) => {
    updateFormData({
      icbIndustry: selection.icbIndustry,
      icbSuperSector: selection.icbSuperSector,
      icbSector: selection.icbSector,
      icbSubSector: selection.icbSubSector,
    })
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Focus and open the industry combobox
      const industryTrigger = document.getElementById('industry-combobox-trigger')
      if (industryTrigger) {
        industryTrigger.click()
      }
    }
  }

  const isNameValid = formData.name.length > 0
  const isIndustrySelected = formData.icbSubSector.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold font-display bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
          Company Information
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Let&apos;s start with the basics about your business
        </p>
      </motion.div>

      {/* Company Name */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <label htmlFor="name" className="text-sm font-semibold text-foreground">
            Company Name
          </label>
          {isNameValid && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="w-6 h-6 bg-gradient-to-br from-primary to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-primary/30"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </motion.div>
          )}
        </div>
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-amber-500/50 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-all duration-300" />
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            onKeyDown={handleNameKeyDown}
            placeholder="Enter your company name"
            className="relative w-full px-5 py-4 text-lg font-medium bg-card border-2 border-border rounded-xl focus:border-primary focus:ring-0 outline-none transition-all placeholder:text-muted-foreground/40"
          />
        </div>
      </motion.div>

      {/* Industry Selection */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">
            Industry Classification
          </label>
          {isIndustrySelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="w-6 h-6 bg-gradient-to-br from-primary to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-primary/30"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </motion.div>
          )}
        </div>
        <div className="flex items-center justify-between -mt-1">
          <p className="text-xs text-muted-foreground">
            Search by typing any part of the industry name
          </p>
          <IndustryFinderDialog onSelect={handleIndustrySelect} />
        </div>
        <IndustryCombobox
          triggerId="industry-combobox-trigger"
          value={
            formData.icbSubSector
              ? {
                  icbIndustry: formData.icbIndustry,
                  icbSuperSector: formData.icbSuperSector,
                  icbSector: formData.icbSector,
                  icbSubSector: formData.icbSubSector,
                }
              : undefined
          }
          onSelect={handleIndustrySelect}
        />
      </motion.div>

      {/* Industry Selection Preview */}
      {isIndustrySelected && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative overflow-hidden p-5 bg-gradient-to-br from-primary/15 via-primary/10 to-amber-500/5 rounded-2xl border border-primary/30 shadow-lg shadow-primary/10"
        >
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-semibold uppercase tracking-wider">Selected Industry</p>
              <p className="font-bold text-lg text-foreground truncate mt-0.5">{formData.icbSubSector}</p>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <span>{formData.icbIndustry}</span>
                <span className="text-primary">→</span>
                <span>{formData.icbSuperSector}</span>
                <span className="text-primary">→</span>
                <span>{formData.icbSector}</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex items-start gap-4 p-5 bg-gradient-to-r from-muted/80 to-muted/40 rounded-2xl border border-border/50"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Why industry matters</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Your industry classification determines the baseline valuation multiples
            used to estimate your company&apos;s market value.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
