'use client'

import { useState } from 'react'
import { IndustryCombobox } from '@/components/company/IndustryCombobox'
import { ArrowRight, Building2, AlertCircle, Check } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BusinessProfileData {
  revenueModel: string
  laborIntensity: string
  assetIntensity: string
  ownerInvolvement: string
  grossMarginProxy: string
}

interface ProfileOption {
  value: string
  label: string
  helper: string
}

interface ProfileQuestion {
  key: keyof BusinessProfileData
  question: string
  options: ProfileOption[]
}

// ---------------------------------------------------------------------------
// V2 Questions — simplified per UX spec
// ---------------------------------------------------------------------------

const PROFILE_QUESTIONS: ProfileQuestion[] = [
  {
    key: 'revenueModel',
    question: 'How do customers pay you?',
    options: [
      { value: 'SUBSCRIPTION_SAAS', label: 'Recurring contracts or subscriptions', helper: 'Monthly/annual retainers, SaaS, maintenance contracts' },
      { value: 'PROJECT_BASED', label: 'Project-based or one-time sales', helper: 'Custom projects, product sales, event-based' },
      { value: 'HYBRID', label: 'A mix of both', helper: 'Some recurring, some project work' },
    ],
  },
  {
    key: 'ownerInvolvement',
    question: 'How involved are you in daily operations?',
    options: [
      { value: 'MINIMAL', label: 'My team runs it. I focus on strategy.', helper: 'Could step away for a month' },
      { value: 'MODERATE', label: 'I make key decisions but have a capable team.', helper: 'Involved weekly, but not daily' },
      { value: 'CRITICAL', label: 'The business depends on me day-to-day.', helper: 'Would struggle without you present' },
    ],
  },
  {
    key: 'grossMarginProxy',
    question: 'What are your approximate gross margins?',
    options: [
      { value: 'EXCELLENT', label: 'Above 60%', helper: 'Software, consulting, professional services' },
      { value: 'MODERATE', label: '30% – 60%', helper: 'Most service businesses, light manufacturing' },
      { value: 'LOW', label: 'Below 30%', helper: 'Heavy manufacturing, commodity, distribution' },
    ],
  },
  {
    key: 'laborIntensity',
    question: 'What kind of workforce does your business rely on?',
    options: [
      { value: 'LOW', label: 'Knowledge workers or automated systems', helper: 'Software, finance, consulting' },
      { value: 'MODERATE', label: 'Mix of skilled and support staff', helper: 'Most service businesses' },
      { value: 'VERY_HIGH', label: 'Physical labor or on-site presence required', helper: 'Construction, manufacturing, healthcare' },
    ],
  },
  {
    key: 'assetIntensity',
    question: 'What does the business primarily own?',
    options: [
      { value: 'ASSET_LIGHT', label: 'Digital or intellectual property', helper: 'Software, brands, patents, processes' },
      { value: 'ASSET_HEAVY', label: 'Physical assets', helper: 'Equipment, real estate, inventory, vehicles' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ClassificationValue {
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
}

interface BusinessProfileStepProps {
  initialData: BusinessProfileData | null
  onComplete: (data: BusinessProfileData) => void
  onBack: () => void
  industryName?: string | null
  classificationSource?: 'ai' | 'keyword' | 'default'
  classificationValue?: ClassificationValue
  onClassificationChange?: (value: ClassificationValue) => void
}

export function BusinessProfileStep({
  initialData, onComplete, onBack,
  industryName, classificationSource, classificationValue, onClassificationChange,
}: BusinessProfileStepProps) {
  const [answers, setAnswers] = useState<Partial<BusinessProfileData>>(initialData || {})
  const [error, setError] = useState<string | null>(null)

  const classificationFailed = classificationSource === 'default' || (!classificationSource && !industryName)
  const hasClassification = !!industryName && !classificationFailed

  const answeredCount = PROFILE_QUESTIONS.filter(q => answers[q.key]).length
  const allAnswered = answeredCount === PROFILE_QUESTIONS.length

  const handleSelect = (key: keyof BusinessProfileData, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
    setError(null)
  }

  const handleSubmit = () => {
    if (classificationFailed && !classificationValue?.icbSubSector) {
      setError('Please select your industry above so we can provide the most accurate valuation.')
      return
    }
    const missing = PROFILE_QUESTIONS.filter(q => !answers[q.key])
    if (missing.length > 0) {
      setError(`Please answer all questions (${missing.length} remaining)`)
      return
    }
    onComplete(answers as BusinessProfileData)
  }

  return (
    <div className="space-y-7">
      {/* Eyebrow */}
      <div
        className="text-[11px] font-semibold uppercase tracking-[0.8px]"
        style={{ color: 'var(--primary)' }}
      >
        Step 2 of 5
      </div>

      {/* Headline */}
      <div>
        <h2
          className="text-[28px] font-bold"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}
        >
          How does your business operate?
        </h2>
        <p
          className="mt-1 text-[15px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          These shape your valuation model. Pick the closest match.
        </p>
      </div>

      {/* Industry Classification */}
      {hasClassification ? (
        <div
          className="flex items-start gap-3 p-4 rounded-xl"
          style={{ background: 'var(--accent-light)', border: '1px solid var(--primary)', borderColor: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}
        >
          <Building2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
          <div className="flex-1">
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              We identified your industry as{' '}
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{industryName}</span>
            </div>
            <IndustryCombobox
              value={classificationValue}
              onSelect={(selection) => onClassificationChange?.(selection)}
            />
          </div>
        </div>
      ) : classificationFailed ? (
        <div className="space-y-3">
          <div
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: 'var(--orange-light)', border: '1px solid var(--orange)' }}
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--orange)' }} />
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
              Please select your industry so we can provide the most accurate valuation.
            </div>
          </div>
          <IndustryCombobox
            value={classificationValue}
            onSelect={(selection) => onClassificationChange?.(selection)}
          />
        </div>
      ) : null}

      {/* Questions */}
      <div className="space-y-7">
        {PROFILE_QUESTIONS.map((q) => (
          <div key={q.key} className="space-y-3">
            <label
              className="text-[14px] font-semibold block"
              style={{ color: 'var(--text-primary)' }}
            >
              {q.question}
            </label>
            <div
              className={`grid gap-2 ${q.options.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}
              role="radiogroup"
              aria-label={q.question}
            >
              {q.options.map((opt) => {
                const selected = answers[q.key] === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleSelect(q.key, opt.value)}
                    className="relative text-left p-4 rounded-xl transition-all min-h-[64px]"
                    style={{
                      background: selected ? 'var(--accent-light)' : 'var(--surface)',
                      border: selected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    }}
                  >
                    {selected && (
                      <div
                        className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--primary)' }}
                      >
                        <Check className="w-3 h-3" style={{ color: 'white' }} />
                      </div>
                    )}
                    <div
                      className="text-sm font-semibold pr-6"
                      style={{ color: selected ? 'var(--primary)' : 'var(--text-primary)' }}
                    >
                      {opt.label}
                    </div>
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {opt.helper}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-center" style={{ color: 'var(--red)' }}>{error}</p>
      )}

      {/* Continue button */}
      <button
        type="button"
        disabled={!allAnswered}
        onClick={handleSubmit}
        className="w-full h-12 rounded-lg text-base font-medium transition-all flex items-center justify-center gap-2"
        style={{
          background: allAnswered ? 'var(--primary)' : 'var(--border)',
          color: allAnswered ? 'var(--primary-foreground)' : 'var(--text-tertiary)',
          cursor: allAnswered ? 'pointer' : 'not-allowed',
        }}
      >
        Continue ({answeredCount}/{PROFILE_QUESTIONS.length})
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  )
}
