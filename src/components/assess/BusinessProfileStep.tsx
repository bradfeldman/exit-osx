'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { IndustryCombobox } from '@/components/company/IndustryCombobox'
import { ArrowRight, ArrowLeft, Building2, AlertCircle } from 'lucide-react'

export interface BusinessProfileData {
  revenueModel: string
  laborIntensity: string
  assetIntensity: string
  ownerInvolvement: string
  grossMarginProxy: string
}

interface RadioGroupOption {
  value: string
  label: string
  description: string
}

interface ProfileQuestion {
  key: keyof BusinessProfileData
  question: string
  industryQuestion?: string // version that includes "{industry}" placeholder
  options: RadioGroupOption[]
}

const PROFILE_QUESTIONS: ProfileQuestion[] = [
  {
    key: 'revenueModel',
    question: 'How does your business generate most of its revenue?',
    options: [
      { value: 'PROJECT_BASED', label: 'Project-based', description: 'One-time projects or engagements' },
      { value: 'TRANSACTIONAL', label: 'Transactional', description: 'Individual sales or transactions' },
      { value: 'RECURRING_CONTRACTS', label: 'Recurring contracts', description: 'Annual contracts or retainers' },
      { value: 'SUBSCRIPTION_SAAS', label: 'Subscription / SaaS', description: 'Monthly or annual subscriptions' },
    ],
  },
  {
    key: 'laborIntensity',
    question: 'Compared to others in your industry, how people-dependent is your business?',
    industryQuestion: 'Compared to other {industry} companies, how people-dependent is your business?',
    options: [
      { value: 'VERY_HIGH', label: 'More than most', description: 'Revenue stops without specific people' },
      { value: 'HIGH', label: 'Somewhat more', description: 'Key roles are hard to replace' },
      { value: 'MODERATE', label: 'About typical', description: 'Similar to others in our industry' },
      { value: 'LOW', label: 'Less than most', description: 'Runs more on systems and technology' },
    ],
  },
  {
    key: 'assetIntensity',
    question: 'Compared to others in your industry, how much do you rely on physical assets?',
    industryQuestion: 'Compared to other {industry} companies, how much do you rely on physical assets?',
    options: [
      { value: 'ASSET_HEAVY', label: 'More than most', description: 'Significant equipment, real estate, or inventory' },
      { value: 'MODERATE', label: 'About typical', description: 'Similar to others in our industry' },
      { value: 'ASSET_LIGHT', label: 'Less than most', description: 'Lighter on physical assets than peers' },
    ],
  },
  {
    key: 'ownerInvolvement',
    question: 'How involved are you in day-to-day operations?',
    options: [
      { value: 'CRITICAL', label: 'Business depends on me', description: 'I make most key decisions daily' },
      { value: 'HIGH', label: 'Heavily involved', description: 'I handle many things but have some help' },
      { value: 'MODERATE', label: 'Moderately involved', description: 'I oversee but a team handles execution' },
      { value: 'LOW', label: 'Mostly delegated', description: 'I focus on strategy, team runs operations' },
      { value: 'MINIMAL', label: 'Rarely needed', description: 'Business runs independently' },
    ],
  },
  {
    key: 'grossMarginProxy',
    question: 'Compared to others in your industry, how would you describe your profit margins?',
    industryQuestion: 'Compared to other {industry} companies, how would you describe your profit margins?',
    options: [
      { value: 'LOW', label: 'Below average', description: 'Lower margins than most in our industry' },
      { value: 'MODERATE', label: 'About average', description: 'In line with industry norms' },
      { value: 'GOOD', label: 'Above average', description: 'Better margins than most peers' },
      { value: 'EXCELLENT', label: 'Well above average', description: 'Significantly higher than industry norms' },
    ],
  },
]

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

export function BusinessProfileStep({ initialData, onComplete, onBack, industryName, classificationSource, classificationValue, onClassificationChange }: BusinessProfileStepProps) {
  const [answers, setAnswers] = useState<Partial<BusinessProfileData>>(initialData || {})
  const [error, setError] = useState<string | null>(null)

  const classificationFailed = classificationSource === 'default' || (!classificationSource && !industryName)
  const hasClassification = !!industryName && !classificationFailed

  const handleSelect = (key: keyof BusinessProfileData, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
    setError(null)
  }

  const handleSubmit = () => {
    // If classification failed and user hasn't selected an industry, require it
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

  const getQuestion = (q: ProfileQuestion) => {
    if (industryName && q.industryQuestion) {
      return q.industryQuestion.replace('{industry}', industryName)
    }
    return q.question
  }

  const answeredCount = PROFILE_QUESTIONS.filter(q => answers[q.key]).length

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          Tell us about your business
        </h2>
        <p className="text-muted-foreground mt-2">
          5 questions. These determine where your business sits in the valuation range.
        </p>
      </div>

      {/* Industry Classification */}
      {hasClassification ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/15">
            <Building2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <span className="text-muted-foreground">We identified your industry as </span>
              <span className="font-semibold text-foreground">{industryName}</span>
              <span className="text-muted-foreground">. You can change this if needed.</span>
            </div>
          </div>
          <IndustryCombobox
            value={classificationValue}
            onSelect={(selection) => onClassificationChange?.(selection)}
          />
        </div>
      ) : classificationFailed ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-foreground">
              Please select your industry so we can provide the most accurate valuation.
            </div>
          </div>
          <IndustryCombobox
            value={classificationValue}
            onSelect={(selection) => onClassificationChange?.(selection)}
          />
        </div>
      ) : null}

      <div className="space-y-8">
        {PROFILE_QUESTIONS.map((q, qi) => (
          <div key={q.key} className="space-y-3">
            <h3 className="font-semibold text-foreground">
              <span className="text-primary mr-2">{qi + 1}.</span>
              {getQuestion(q)}
            </h3>
            <div className="grid gap-2">
              {q.options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(q.key, opt.value)}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-all
                    ${answers[q.key] === opt.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }
                  `}
                >
                  <div className="font-medium text-sm text-foreground">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      <div className="flex gap-3">
        <Button variant="ghost" size="lg" onClick={onBack}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <Button
          size="lg"
          className="flex-1 h-12 text-base font-medium"
          onClick={handleSubmit}
        >
          Continue ({answeredCount}/{PROFILE_QUESTIONS.length})
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
