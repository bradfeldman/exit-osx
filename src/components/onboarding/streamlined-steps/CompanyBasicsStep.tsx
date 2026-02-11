'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Sparkles, CheckCircle2, Building2 } from 'lucide-react'
import { formatIcbName } from '@/lib/utils/format-icb'
import { IndustryListInline } from '@/components/company/IndustryListInline'

interface CompanyBasicsStepProps {
  companyName: string
  businessDescription: string
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
  updateState: (updates: {
    companyName?: string
    businessDescription?: string
    icbIndustry?: string
    icbSuperSector?: string
    icbSector?: string
    icbSubSector?: string
  }) => void
}

export function CompanyBasicsStep({
  companyName,
  businessDescription,
  icbIndustry,
  icbSuperSector,
  icbSector,
  icbSubSector,
  updateState,
}: CompanyBasicsStepProps) {
  const [isMatchingIndustry, setIsMatchingIndustry] = useState(false)
  const [showIndustryList, setShowIndustryList] = useState(false)
  const [industryRecommendation, setIndustryRecommendation] = useState<{
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
    subSectorLabel: string
    reasoning: string
  } | null>(null)

  // Auto-trigger industry classification when description reaches 30 chars
  useEffect(() => {
    if (businessDescription.length >= 30 && !icbSubSector && !isMatchingIndustry && !industryRecommendation) {
      const timeoutId = setTimeout(() => {
        handleAutoClassify()
      }, 1000) // Debounce 1 second after user stops typing

      return () => clearTimeout(timeoutId)
    }
  }, [businessDescription, icbSubSector, isMatchingIndustry, industryRecommendation])

  const handleAutoClassify = async () => {
    if (!businessDescription.trim() || businessDescription.length < 20) return

    setIsMatchingIndustry(true)
    setIndustryRecommendation(null)

    try {
      const response = await fetch('/api/industries/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: businessDescription.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to classify industry')
      }

      const data = await response.json()
      const match = data.match

      setIndustryRecommendation({
        icbIndustry: match.icbIndustry,
        icbSuperSector: match.icbSuperSector,
        icbSector: match.icbSector,
        icbSubSector: match.icbSubSector,
        subSectorLabel: match.subSectorLabel,
        reasoning: match.reasoning,
      })
    } catch (err) {
      console.error('[ONBOARDING] Industry classification error:', err)
    } finally {
      setIsMatchingIndustry(false)
    }
  }

  const handleAcceptRecommendation = () => {
    if (industryRecommendation) {
      updateState({
        icbIndustry: industryRecommendation.icbIndustry,
        icbSuperSector: industryRecommendation.icbSuperSector,
        icbSector: industryRecommendation.icbSector,
        icbSubSector: industryRecommendation.icbSubSector,
      })
      setIndustryRecommendation(null)
    }
  }

  const handleIndustrySelect = (selection: {
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
  }) => {
    updateState(selection)
    setShowIndustryList(false)
    setIndustryRecommendation(null)
  }

  const handleEditIndustry = () => {
    updateState({
      icbIndustry: '',
      icbSuperSector: '',
      icbSector: '',
      icbSubSector: '',
    })
    setIndustryRecommendation(null)
  }

  const isComplete = !!(companyName && businessDescription.length >= 20 && icbSubSector)

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          Let&apos;s start with the basics
        </h2>
        <p className="text-muted-foreground mt-2">
          Tell us about your business so we can provide accurate valuation estimates.
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
          <label htmlFor="company-name" className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Company Name
          </label>
          {companyName && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </motion.div>
          )}
        </div>
        <div className="relative group">
          <input
            id="company-name"
            type="text"
            value={companyName}
            onChange={(e) => updateState({ companyName: e.target.value })}
            placeholder="Enter your company name"
            className="w-full px-5 py-4 text-lg font-medium bg-card border-2 border-border rounded-xl focus:border-primary focus:ring-0 outline-none transition-all placeholder:text-muted-foreground/40"
          />
        </div>
      </motion.div>

      {/* Business Description */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center justify-between">
          <label htmlFor="business-description" className="text-sm font-semibold text-foreground">
            What does your business do?
          </label>
          {businessDescription.length >= 20 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </motion.div>
          )}
        </div>
        <textarea
          id="business-description"
          value={businessDescription}
          onChange={(e) => updateState({ businessDescription: e.target.value.slice(0, 500) })}
          placeholder="e.g., We manufacture and sell custom mouthguards that help people stop teeth grinding. We have 5 employees and serve both consumers and dental practices."
          rows={4}
          maxLength={500}
          className="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:ring-0 outline-none transition-all text-sm resize-none placeholder:text-muted-foreground/40"
        />
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Minimum 20 characters for industry classification</span>
          <span className={businessDescription.length < 20 ? 'text-amber-600' : ''}>
            {businessDescription.length}/500
          </span>
        </div>

        {/* Auto-classification loading */}
        {isMatchingIndustry && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
          >
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Analyzing your business description...
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Industry Classification Result */}
      {icbSubSector && !industryRecommendation ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden p-4 bg-gradient-to-br from-primary/15 via-primary/10 to-amber-500/5 rounded-xl border border-primary/30"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground truncate">{formatIcbName(icbSubSector)}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span>{formatIcbName(icbIndustry)}</span>
                <span className="text-primary">→</span>
                <span>{formatIcbName(icbSuperSector)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleEditIndustry}
              className="text-xs text-primary hover:text-primary/80 hover:underline focus:outline-none"
            >
              Change
            </button>
          </div>
        </motion.div>
      ) : industryRecommendation ? (
        /* AI Recommendation */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30 rounded-xl"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Recommended Classification
                </p>
                <p className="text-base font-bold text-amber-800 dark:text-amber-300 mt-1">
                  {industryRecommendation.subSectorLabel}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  {industryRecommendation.reasoning}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleAcceptRecommendation}
                size="sm"
                className="bg-[#B87333] hover:bg-[#9A5F2A]"
              >
                Accept
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowIndustryList(true)}
              >
                Choose Different
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}

      {/* Manual Industry Selection */}
      {!icbSubSector && !industryRecommendation && !isMatchingIndustry && businessDescription.length >= 20 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <button
            type="button"
            onClick={() => setShowIndustryList(true)}
            className="text-sm text-primary hover:text-primary/80 hover:underline focus:outline-none"
          >
            Or choose your industry manually
          </button>
        </motion.div>
      )}

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
          <h3 className="text-sm font-semibold text-foreground">
            Why we need this information
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Your industry classification determines the baseline valuation multiples. Your description helps us tailor recommendations to your specific business model.
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
            Ready to continue
          </p>
        </motion.div>
      )}
    </div>
  )
}
