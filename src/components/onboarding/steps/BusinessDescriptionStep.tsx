'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Building2, Lightbulb, Search, Check, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IndustryListInline } from '@/components/company/IndustryListInline'
import { formatIcbName } from '@/lib/utils/format-icb'
import type { ClassificationResult } from '@/lib/ai/business-classifier'

// ─── Types ──────────────────────────────────────────────────────────────

export interface IndustrySelection {
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
}

interface BusinessDescriptionStepProps {
  companyName: string
  businessDescription: string
  onDescriptionChange: (description: string) => void
  /** Called when the user confirms an industry classification */
  onIndustryConfirmed: (selection: IndustrySelection) => void
  /** Current industry selection (if any) */
  currentIndustry?: IndustrySelection | null
}

// ─── Examples ───────────────────────────────────────────────────────────

const EXAMPLES = [
  'We manufacture custom dental mouthguards for patients who grind their teeth. 12 employees, selling through dental offices nationwide.',
  'IT managed services provider for small businesses. 8-person team handling cloud migrations, cybersecurity, and helpdesk support.',
  'Family-owned Italian restaurant, 15 years in business. 20 employees, full bar, we do catering on weekends.',
  'Commercial general contractor specializing in tenant improvements and office build-outs. $5M annual revenue, 25 employees.',
  'Digital marketing agency focused on e-commerce brands. 6 person team, $1.2M ARR from retainer clients.',
]

// ─── Component ──────────────────────────────────────────────────────────

export function BusinessDescriptionStep({
  companyName,
  businessDescription,
  onDescriptionChange,
  onIndustryConfirmed,
  currentIndustry,
}: BusinessDescriptionStepProps) {
  const [isClassifying, setIsClassifying] = useState(false)
  const [classificationError, setClassificationError] = useState<string | null>(null)
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null)
  const [showExamples, setShowExamples] = useState(false)
  const [showIndustryList, setShowIndustryList] = useState(false)

  const isIndustrySelected = !!(
    currentIndustry?.icbIndustry &&
    currentIndustry?.icbSubSector
  )

  // ── AI Classification ──────────────────────────────────────────────

  const handleClassify = useCallback(async () => {
    if (!businessDescription.trim() || businessDescription.trim().length < 10) return

    setIsClassifying(true)
    setClassificationError(null)
    setClassificationResult(null)

    try {
      const response = await fetch('/api/industries/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: businessDescription.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Classification failed')
      }

      const result: ClassificationResult = await response.json()
      setClassificationResult(result)
    } catch (err) {
      setClassificationError(
        err instanceof Error ? err.message : 'Failed to analyze business description'
      )
    } finally {
      setIsClassifying(false)
    }
  }, [businessDescription])

  // ── Accept AI recommendation ───────────────────────────────────────

  const handleAcceptPrimary = useCallback(() => {
    if (!classificationResult) return

    const { primaryIndustry } = classificationResult
    onIndustryConfirmed({
      icbIndustry: primaryIndustry.icbIndustry,
      icbSuperSector: primaryIndustry.icbSuperSector,
      icbSector: primaryIndustry.icbSector,
      icbSubSector: primaryIndustry.icbSubSector,
    })
    setClassificationResult(null)
  }, [classificationResult, onIndustryConfirmed])

  const handleAcceptSecondary = useCallback(() => {
    if (!classificationResult?.secondaryIndustry) return

    const { secondaryIndustry } = classificationResult
    onIndustryConfirmed({
      icbIndustry: secondaryIndustry.icbIndustry,
      icbSuperSector: secondaryIndustry.icbSuperSector,
      icbSector: secondaryIndustry.icbSector,
      icbSubSector: secondaryIndustry.icbSubSector,
    })
    setClassificationResult(null)
  }, [classificationResult, onIndustryConfirmed])

  // ── Manual selection from industry list ─────────────────────────────

  const handleManualSelect = useCallback(
    (selection: IndustrySelection) => {
      onIndustryConfirmed(selection)
      setClassificationResult(null)
      setShowIndustryList(false)
    },
    [onIndustryConfirmed]
  )

  // ── Clear selection ────────────────────────────────────────────────

  const handleClearIndustry = useCallback(() => {
    onIndustryConfirmed({
      icbIndustry: '',
      icbSuperSector: '',
      icbSector: '',
      icbSubSector: '',
    })
    setClassificationResult(null)
  }, [onIndustryConfirmed])

  // ── Confidence display ─────────────────────────────────────────────

  const confidenceLabel = (confidence: number): string => {
    if (confidence >= 0.85) return 'High confidence'
    if (confidence >= 0.6) return 'Medium confidence'
    return 'Low confidence'
  }

  const confidenceColor = (confidence: number): string => {
    if (confidence >= 0.85) return 'text-emerald-600'
    if (confidence >= 0.6) return 'text-amber-600'
    return 'text-red-500'
  }

  const canClassify = businessDescription.trim().length >= 10 && !isClassifying

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
        >
          <Building2 className="w-7 h-7 text-primary" />
        </motion.div>
        <h2 className="text-xl font-bold text-foreground font-display">
          Tell us about {companyName || 'your business'}
        </h2>
        <p className="text-muted-foreground mt-2">
          Describe what your business does. We will use AI to find the right industry classification
          for accurate valuation.
        </p>
      </div>

      {/* Business Description Input */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <label htmlFor="business-description" className="text-sm font-semibold text-foreground">
          What does your business do?
        </label>
        <div className="relative">
          <textarea
            id="business-description"
            value={businessDescription}
            onChange={(e) => {
              onDescriptionChange(e.target.value.slice(0, 500))
              // Clear previous classification when description changes
              if (classificationResult) {
                setClassificationResult(null)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && canClassify) {
                e.preventDefault()
                handleClassify()
              }
            }}
            placeholder="e.g., We manufacture and sell custom dental mouthguards to help people stop grinding their teeth. We have 12 employees and sell through dental offices nationwide."
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-primary focus:ring-0 outline-none transition-all text-sm resize-none placeholder:text-muted-foreground/40"
            disabled={isClassifying}
          />
          <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
            {businessDescription.length}/500
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={handleClassify}
              disabled={!canClassify}
              className="gap-2"
            >
              {isClassifying ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Find My Industry
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={() => setShowExamples(!showExamples)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              {showExamples ? 'Hide examples' : 'Examples'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowIndustryList(!showIndustryList)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showIndustryList ? 'rotate-180' : ''}`} />
            Browse industries
          </button>
        </div>
      </motion.div>

      {/* Examples */}
      <AnimatePresence>
        {showExamples && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Example descriptions:
            </p>
            <div className="space-y-2">
              {EXAMPLES.map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onDescriptionChange(example)
                    setClassificationResult(null)
                  }}
                  className="w-full text-left p-3 bg-muted/50 hover:bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  &ldquo;{example}&rdquo;
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Industry List */}
      <AnimatePresence>
        {showIndustryList && (
          <IndustryListInline
            value={currentIndustry?.icbSubSector ? currentIndustry : undefined}
            onSelect={handleManualSelect}
            onClose={() => setShowIndustryList(false)}
          />
        )}
      </AnimatePresence>

      {/* Classification Error */}
      {classificationError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive"
        >
          {classificationError}
        </motion.div>
      )}

      {/* AI Classification Result */}
      <AnimatePresence>
        {classificationResult && !isIndustrySelected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Primary classification */}
            <div className="p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-amber-500/5 rounded-xl border border-primary/20">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-primary uppercase tracking-wide">
                      Recommended Classification
                    </span>
                    {classificationResult.source === 'ai' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                        AI
                      </span>
                    )}
                  </div>
                  <p className="text-base font-bold text-foreground">
                    {classificationResult.primaryIndustry.name}
                  </p>
                  <p className={`text-xs mt-0.5 ${confidenceColor(classificationResult.primaryIndustry.confidence)}`}>
                    {confidenceLabel(classificationResult.primaryIndustry.confidence)}
                    {' -- '}
                    {Math.round(classificationResult.primaryIndustry.confidence * 100)}%
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAcceptPrimary}
                    className="gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setClassificationResult(null)}
                    className="text-muted-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Explanation */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {classificationResult.explanation}
              </p>

              {/* Multiple range hint */}
              {classificationResult.suggestedMultipleRange && (
                <div className="mt-3 pt-3 border-t border-border/50 flex gap-4 text-xs text-muted-foreground">
                  <span>
                    EBITDA Multiple:{' '}
                    <span className="font-medium text-foreground">
                      {classificationResult.suggestedMultipleRange.ebitda.low}x -{' '}
                      {classificationResult.suggestedMultipleRange.ebitda.high}x
                    </span>
                  </span>
                  <span>
                    Revenue Multiple:{' '}
                    <span className="font-medium text-foreground">
                      {classificationResult.suggestedMultipleRange.revenue.low}x -{' '}
                      {classificationResult.suggestedMultipleRange.revenue.high}x
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Secondary classification (optional) */}
            {classificationResult.secondaryIndustry && (
              <div className="p-3 bg-muted/50 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">Also considered:</span>
                    <p className="text-sm font-medium text-foreground">
                      {classificationResult.secondaryIndustry.name}
                    </p>
                    <p className={`text-xs ${confidenceColor(classificationResult.secondaryIndustry.confidence)}`}>
                      {Math.round(classificationResult.secondaryIndustry.confidence * 100)}% confidence
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAcceptSecondary}
                    className="gap-1.5 text-xs"
                  >
                    Use this instead
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmed Industry Display */}
      {isIndustrySelected && currentIndustry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-br from-primary/15 via-primary/10 to-amber-500/5 rounded-xl border border-primary/30"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground truncate">
                {formatIcbName(currentIndustry.icbSubSector)}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span>{formatIcbName(currentIndustry.icbIndustry)}</span>
                <span className="text-primary">&gt;</span>
                <span>{formatIcbName(currentIndustry.icbSuperSector)}</span>
                <span className="text-primary">&gt;</span>
                <span>{formatIcbName(currentIndustry.icbSector)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearIndustry}
              className="p-1.5 hover:bg-red-100 rounded-full transition-colors group flex-shrink-0"
              title="Change industry"
            >
              <X className="w-4 h-4 text-muted-foreground group-hover:text-red-600" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl border border-border/50"
      >
        <div className="w-8 h-8 bg-muted-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Why industry matters</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Your industry classification determines the valuation multiples used to estimate your
            company&apos;s market value. A more accurate classification means a more accurate
            valuation.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
