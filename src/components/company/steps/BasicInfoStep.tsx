'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { formatIcbName } from '@/lib/utils/format-icb'
import { Button } from '@/components/ui/button'
import { IndustryListInline } from '../IndustryListInline'
import type { CompanyFormData } from '../CompanySetupWizard'
import { analytics } from '@/lib/analytics'

interface BasicInfoStepProps {
  formData: CompanyFormData
  updateFormData: (updates: Partial<CompanyFormData>) => void
  businessDescription: string
  onBusinessDescriptionChange: (description: string) => void
}

export function BasicInfoStep({ formData, updateFormData, businessDescription, onBusinessDescriptionChange }: BasicInfoStepProps) {
  const [matchingIndustry, setMatchingIndustry] = useState(false)
  const [industryMatchError, setIndustryMatchError] = useState<string | null>(null)
  const [showIndustryList, setShowIndustryList] = useState(false)
  const [industryMatchResult, setIndustryMatchResult] = useState<{
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
    subSectorLabel: string
    reasoning: string
    source: 'ai' | 'keyword' | 'default'
  } | null>(null)

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
    // Clear AI match result when manually selecting (keep description for later use)
    setIndustryMatchResult(null)
    setShowIndustryList(false)
  }

  const handleAcceptRecommendation = () => {
    if (industryMatchResult) {
      updateFormData({
        icbIndustry: industryMatchResult.icbIndustry,
        icbSuperSector: industryMatchResult.icbSuperSector,
        icbSector: industryMatchResult.icbSector,
        icbSubSector: industryMatchResult.icbSubSector,
      })
      setIndustryMatchResult(null)
      // Keep businessDescription for later use in risk-focused AI questions
    }
  }

  const handleFindIndustry = async () => {
    if (!businessDescription.trim()) return

    setMatchingIndustry(true)
    setIndustryMatchError(null)
    setIndustryMatchResult(null)

    try {
      const response = await fetch('/api/industries/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: businessDescription.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to find industry match')
      }

      const data = await response.json()
      const primary = data.primaryIndustry

      // Track industry search usage
      analytics.track('industry_search', {
        searchQuery: businessDescription.trim().substring(0, 100), // Truncate for privacy
        resultsCount: 1,
        resultClicked: primary.name,
      })

      // Store the recommendation (don't auto-apply)
      setIndustryMatchResult({
        icbIndustry: primary.icbIndustry,
        icbSuperSector: primary.icbSuperSector,
        icbSector: primary.icbSector,
        icbSubSector: primary.icbSubSector,
        subSectorLabel: primary.name,
        reasoning: data.explanation,
        source: data.source,
      })
    } catch (err) {
      setIndustryMatchError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setMatchingIndustry(false)
    }
  }

  const isNameValid = formData.name.length > 0
  const isIndustrySelected = formData.icbSubSector.length > 0

  return (
    <div className="space-y-8">
      {/* Header - Matching prototype */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          Let&apos;s look at your business through a buyer&apos;s eyes
        </h2>
        <p className="text-muted-foreground mt-2">
          This is not a survey. This is a diagnostic.
        </p>
      </motion.div>

      {/* Promise Box - Matching prototype */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="bg-muted/50 rounded-xl p-5 border border-border"
      >
        <h3 className="font-semibold text-foreground mb-3">In the next few minutes, you&apos;ll see:</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-3 text-muted-foreground">
            <span className="text-primary font-semibold">→</span>
            <span>What buyers see when they evaluate your business</span>
          </li>
          <li className="flex items-start gap-3 text-muted-foreground">
            <span className="text-primary font-semibold">→</span>
            <span>Where value is leaking today (in dollars)</span>
          </li>
          <li className="flex items-start gap-3 text-muted-foreground">
            <span className="text-primary font-semibold">→</span>
            <span>The fastest path to closing that gap</span>
          </li>
        </ul>
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
            placeholder="Enter your company name"
            className="relative w-full px-5 py-4 text-lg font-medium bg-card border-2 border-border rounded-xl focus:border-primary focus:ring-0 outline-none transition-all placeholder:text-muted-foreground/40"
          />
        </div>
      </motion.div>

      {/* Industry Classification */}
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

        {/* Show selected industry OR input form */}
        {isIndustrySelected ? (
          /* Selected Industry Display */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden p-4 bg-gradient-to-br from-primary/15 via-primary/10 to-amber-500/5 rounded-xl border border-primary/30"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{formatIcbName(formData.icbSubSector)}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span>{formatIcbName(formData.icbIndustry)}</span>
                  <span className="text-primary">→</span>
                  <span>{formatIcbName(formData.icbSuperSector)}</span>
                  <span className="text-primary">→</span>
                  <span>{formatIcbName(formData.icbSector)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  updateFormData({
                    icbIndustry: '',
                    icbSuperSector: '',
                    icbSector: '',
                    icbSubSector: '',
                  })
                  onBusinessDescriptionChange('')
                  setIndustryMatchResult(null)
                }}
                className="p-1.5 hover:bg-red-100 rounded-full transition-colors group"
                title="Remove selection"
              >
                <svg className="w-4 h-4 text-muted-foreground group-hover:text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        ) : (
          /* Business Description Input Form */
          <>
            <div className="space-y-2">
              <label htmlFor="business-description" className="text-xs text-muted-foreground">
                What does your business do?
              </label>
              <textarea
                id="business-description"
                value={businessDescription}
                onChange={(e) => onBusinessDescriptionChange(e.target.value.slice(0, 250))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && businessDescription.trim()) {
                    e.preventDefault()
                    handleFindIndustry()
                  }
                }}
                placeholder="e.g., We manufacture and sell a mouthguard to help people stop bruxing (teeth grinding)"
                rows={3}
                maxLength={250}
                className="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:ring-0 outline-none transition-all text-sm resize-none placeholder:text-muted-foreground/40"
                disabled={matchingIndustry}
              />
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setShowIndustryList(!showIndustryList)}
                  className="text-xs text-primary hover:text-primary/80 hover:underline focus:outline-none"
                >
                  {showIndustryList ? 'Hide Industry List' : 'Choose from Industry List'}
                </button>
                <span>{businessDescription.length}/250</span>
              </div>
            </div>

            {/* Inline Industry List */}
            <AnimatePresence>
              {showIndustryList && (
                <IndustryListInline
                  value={undefined}
                  onSelect={handleIndustrySelect}
                  onClose={() => setShowIndustryList(false)}
                />
              )}
            </AnimatePresence>

            {/* AI Match Error */}
            {industryMatchError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {industryMatchError}
              </div>
            )}

            {/* Loading state */}
            {matchingIndustry && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Finding classification...
              </div>
            )}

            {/* AI Match Recommendation */}
            {industryMatchResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-amber-50 border border-amber-200 rounded-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900">
                        {industryMatchResult.source === 'ai' ? 'Recommended Classification' : 'Keyword Classification'}
                      </p>
                      <p className="text-base font-bold text-amber-800 mt-1">{industryMatchResult.subSectorLabel}</p>
                      <p className="text-xs text-amber-700 mt-1">{industryMatchResult.reasoning}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleAcceptRecommendation}
                      size="sm"
                      className="bg-primary hover:bg-primary/80"
                    >
                      Accept
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIndustryMatchResult(null)
                        onBusinessDescriptionChange('')
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </motion.div>

      {/* Business Description - shown after industry is selected */}
      {isIndustrySelected && (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <label htmlFor="business-description-full" className="text-sm font-semibold text-foreground">
              Tell us more about your business
            </label>
            {businessDescription.length >= 20 && (
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
          <textarea
            id="business-description-full"
            value={businessDescription}
            onChange={(e) => onBusinessDescriptionChange(e.target.value.slice(0, 500))}
            placeholder="Describe what your business does, how many employees you have, your key services or products, and what makes your business unique..."
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:ring-0 outline-none transition-all text-sm resize-none placeholder:text-muted-foreground/40"
          />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Minimum 20 characters</span>
            <span>{businessDescription.length}/500</span>
          </div>
        </motion.div>
      )}

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: isIndustrySelected ? 0.4 : 0.3 }}
        className="flex items-start gap-4 p-5 bg-gradient-to-r from-muted/80 to-muted/40 rounded-2xl border border-border/50"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {isIndustrySelected ? 'Why description matters' : 'Why industry matters'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {isIndustrySelected
              ? 'Your business description helps us generate personalized questions and improvement recommendations tailored to your specific situation.'
              : 'Your industry classification determines the baseline valuation multiples used to estimate your company\'s market value.'}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
