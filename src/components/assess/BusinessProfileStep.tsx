'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft } from 'lucide-react'

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

const PROFILE_QUESTIONS: Array<{
  key: keyof BusinessProfileData
  question: string
  options: RadioGroupOption[]
}> = [
  {
    key: 'revenueModel',
    question: 'How does your business generate revenue?',
    options: [
      { value: 'PROJECT_BASED', label: 'Project-based', description: 'One-time projects or engagements' },
      { value: 'TRANSACTIONAL', label: 'Transactional', description: 'Individual sales or transactions' },
      { value: 'RECURRING_CONTRACTS', label: 'Recurring contracts', description: 'Annual contracts or retainers' },
      { value: 'SUBSCRIPTION_SAAS', label: 'Subscription / SaaS', description: 'Monthly or annual subscriptions' },
    ],
  },
  {
    key: 'laborIntensity',
    question: 'How dependent is your business on people to deliver?',
    options: [
      { value: 'VERY_HIGH', label: 'Very people-dependent', description: 'Revenue stops without specific people' },
      { value: 'HIGH', label: 'Mostly people-dependent', description: 'Key roles are hard to replace' },
      { value: 'MODERATE', label: 'Balanced', description: 'Mix of people and systems' },
      { value: 'LOW', label: 'Systems-driven', description: 'Runs on processes and technology' },
    ],
  },
  {
    key: 'assetIntensity',
    question: 'How asset-heavy is your business?',
    options: [
      { value: 'ASSET_HEAVY', label: 'Asset-heavy', description: 'Significant equipment, real estate, or inventory' },
      { value: 'MODERATE', label: 'Moderate', description: 'Some physical assets needed' },
      { value: 'ASSET_LIGHT', label: 'Asset-light', description: 'Primarily intellectual property or services' },
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
    question: 'How would you describe your profit margins?',
    options: [
      { value: 'LOW', label: 'Thin margins', description: 'Under 20% gross margin' },
      { value: 'MODERATE', label: 'Moderate margins', description: '20-40% gross margin' },
      { value: 'GOOD', label: 'Good margins', description: '40-60% gross margin' },
      { value: 'EXCELLENT', label: 'Excellent margins', description: 'Over 60% gross margin' },
    ],
  },
]

interface BusinessProfileStepProps {
  initialData: BusinessProfileData | null
  onComplete: (data: BusinessProfileData) => void
  onBack: () => void
}

export function BusinessProfileStep({ initialData, onComplete, onBack }: BusinessProfileStepProps) {
  const [answers, setAnswers] = useState<Partial<BusinessProfileData>>(initialData || {})
  const [error, setError] = useState<string | null>(null)

  const handleSelect = (key: keyof BusinessProfileData, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
    setError(null)
  }

  const handleSubmit = () => {
    const missing = PROFILE_QUESTIONS.filter(q => !answers[q.key])
    if (missing.length > 0) {
      setError(`Please answer all questions (${missing.length} remaining)`)
      return
    }
    onComplete(answers as BusinessProfileData)
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

      <div className="space-y-8">
        {PROFILE_QUESTIONS.map((q, qi) => (
          <div key={q.key} className="space-y-3">
            <h3 className="font-semibold text-foreground">
              <span className="text-primary mr-2">{qi + 1}.</span>
              {q.question}
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
