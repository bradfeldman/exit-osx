'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Building2, Lightbulb, Search, Check, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IndustryListInline } from '@/components/company/IndustryListInline'
import { formatIcbName } from '@/lib/utils/format-icb'
import type { ClassificationResult } from '@/lib/ai/business-classifier'
import styles from '@/components/onboarding/onboarding.module.css'

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

  const confidenceClass = (confidence: number): string => {
    if (confidence >= 0.85) return styles.bizDescConfidenceHigh
    if (confidence >= 0.6) return styles.bizDescConfidenceMed
    return styles.bizDescConfidenceLow
  }

  const canClassify = businessDescription.trim().length >= 10 && !isClassifying

  return (
    <div className={styles.bizDescContainer}>
      {/* Header */}
      <div className={styles.bizDescHeader}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={styles.bizDescIconWrap}
        >
          <Building2 className={styles.bizDescIcon} />
        </motion.div>
        <h2 className={styles.bizDescTitle}>
          Tell us about {companyName || 'your business'}
        </h2>
        <p className={styles.bizDescSubtitle}>
          Describe what your business does. We will use AI to find the right industry classification
          for accurate valuation.
        </p>
      </div>

      {/* Business Description Input */}
      <motion.div
        className={styles.bizDescFieldGroup}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <label htmlFor="business-description" className={styles.bizDescLabel}>
          What does your business do?
        </label>
        <div className={styles.bizDescTextareaWrap}>
          <textarea
            id="business-description"
            value={businessDescription}
            onChange={(e) => {
              onDescriptionChange(e.target.value.slice(0, 500))
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
            className={styles.bizDescTextarea}
            disabled={isClassifying}
          />
          <div className={styles.bizDescCharCount}>
            {businessDescription.length}/500
          </div>
        </div>

        {/* Action row */}
        <div className={styles.bizDescActionRow}>
          <div className={styles.bizDescActionLeft}>
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
                    className={styles.bizDescSpinnerRing}
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
              className={styles.bizDescExamplesToggle}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              {showExamples ? 'Hide examples' : 'Examples'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowIndustryList(!showIndustryList)}
            className={styles.bizDescBrowseBtn}
          >
            <ChevronDown className={`${styles.bizDescChevron}${showIndustryList ? ` ${styles.bizDescChevronOpen}` : ''}`} />
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
            className={styles.bizDescExamples}
          >
            <p className={styles.bizDescExamplesLabel}>
              Example descriptions:
            </p>
            <div className={styles.bizDescExampleList}>
              {EXAMPLES.map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onDescriptionChange(example)
                    setClassificationResult(null)
                  }}
                  className={styles.bizDescExampleBtn}
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
          className={styles.bizDescError}
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
            className={styles.bizDescFieldGroup}
          >
            {/* Primary classification */}
            <div className={styles.bizDescResultPrimary}>
              <div className={styles.bizDescResultHeader}>
                <div className={styles.bizDescResultMeta}>
                  <div className={styles.bizDescResultBadgeRow}>
                    <span className={styles.bizDescResultLabel}>
                      Recommended Classification
                    </span>
                    {classificationResult.source === 'ai' && (
                      <span className={styles.bizDescAiBadge}>
                        AI
                      </span>
                    )}
                  </div>
                  <p className={styles.bizDescResultName}>
                    {classificationResult.primaryIndustry.name}
                  </p>
                  <p className={confidenceClass(classificationResult.primaryIndustry.confidence)}>
                    {confidenceLabel(classificationResult.primaryIndustry.confidence)}
                    {' -- '}
                    {Math.round(classificationResult.primaryIndustry.confidence * 100)}%
                  </p>
                </div>
                <div className={styles.bizDescResultActions}>
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
              <p className={styles.bizDescResultExplanation}>
                {classificationResult.explanation}
              </p>

              {/* Multiple range hint */}
              {classificationResult.suggestedMultipleRange && (
                <div className={styles.bizDescMultipleHint}>
                  <span>
                    EBITDA Multiple:{' '}
                    <span className={styles.bizDescMultipleValue}>
                      {classificationResult.suggestedMultipleRange.ebitda.low}x -{' '}
                      {classificationResult.suggestedMultipleRange.ebitda.high}x
                    </span>
                  </span>
                  <span>
                    Revenue Multiple:{' '}
                    <span className={styles.bizDescMultipleValue}>
                      {classificationResult.suggestedMultipleRange.revenue.low}x -{' '}
                      {classificationResult.suggestedMultipleRange.revenue.high}x
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Secondary classification (optional) */}
            {classificationResult.secondaryIndustry && (
              <div className={styles.bizDescResultSecondary}>
                <div className={styles.bizDescResultSecondaryInner}>
                  <div className={styles.bizDescResultSecondaryMeta}>
                    <span className={styles.bizDescResultSecondaryHint}>Also considered:</span>
                    <p className={styles.bizDescResultSecondaryName}>
                      {classificationResult.secondaryIndustry.name}
                    </p>
                    <p className={confidenceClass(classificationResult.secondaryIndustry.confidence)}>
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
          className={styles.bizDescConfirmedIndustry}
        >
          <div className={styles.bizDescConfirmedInner}>
            <div className={styles.bizDescConfirmedIconWrap}>
              <Check className="w-5 h-5 text-white" />
            </div>
            <div className={styles.bizDescConfirmedContent}>
              <p className={styles.bizDescConfirmedName}>
                {formatIcbName(currentIndustry.icbSubSector)}
              </p>
              <p className={styles.bizDescConfirmedPath}>
                <span>{formatIcbName(currentIndustry.icbIndustry)}</span>
                <span className={styles.bizDescConfirmedPathArrow}>&gt;</span>
                <span>{formatIcbName(currentIndustry.icbSuperSector)}</span>
                <span className={styles.bizDescConfirmedPathArrow}>&gt;</span>
                <span>{formatIcbName(currentIndustry.icbSector)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearIndustry}
              className={styles.bizDescClearBtn}
              title="Change industry"
            >
              <X className={styles.bizDescClearIcon} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className={styles.bizDescInfoBox}
      >
        <div className={styles.bizDescInfoIconWrap}>
          <svg
            className={styles.bizDescInfoIcon}
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
          <h3 className={styles.bizDescInfoTitle}>Why industry matters</h3>
          <p className={styles.bizDescInfoBody}>
            Your industry classification determines the valuation multiples used to estimate your
            company&apos;s market value. A more accurate classification means a more accurate
            valuation.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
