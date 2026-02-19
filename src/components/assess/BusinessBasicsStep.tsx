'use client'

import { useState, useRef } from 'react'
import { ArrowRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BusinessBasicsData {
  companyName: string
  businessDescription: string
  revenueBand: string
}

const REVENUE_BANDS = [
  { value: 'UNDER_1M', label: 'Under $1M' },
  { value: '1M_3M', label: '$1M – $3M' },
  { value: '3M_5M', label: '$3M – $5M' },
  { value: '5M_10M', label: '$5M – $10M' },
  { value: '10M_25M', label: '$10M – $25M' },
  { value: '25M_50M', label: '$25M – $50M' },
  { value: '50M_PLUS', label: '$50M+' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BusinessBasicsStepProps {
  initialData: BusinessBasicsData | null
  onComplete: (data: BusinessBasicsData) => void
}

export function BusinessBasicsStep({ initialData, onComplete }: BusinessBasicsStepProps) {
  const [companyName, setCompanyName] = useState(initialData?.companyName || '')
  const [businessDescription, setBusinessDescription] = useState(initialData?.businessDescription || '')
  const [revenueBand, setRevenueBand] = useState(initialData?.revenueBand || '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const descRef = useRef<HTMLTextAreaElement>(null)

  const charCount = businessDescription.length
  const isValid = companyName.trim().length >= 2 && businessDescription.trim().length >= 20 && !!revenueBand

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!companyName.trim() || companyName.trim().length < 2) {
      newErrors.companyName = 'Please enter your business name'
    }
    if (!businessDescription.trim() || businessDescription.trim().length < 20) {
      newErrors.businessDescription = 'Please describe your business (at least 20 characters)'
    }
    if (!revenueBand) {
      newErrors.revenueBand = 'Please select a revenue range'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!validate()) return
    onComplete({ companyName, businessDescription, revenueBand })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* Eyebrow */}
      <div
        className="text-[11px] font-semibold uppercase tracking-[0.8px]"
        style={{ color: 'var(--primary)' }}
      >
        Step 1 of 5
      </div>

      {/* Headline */}
      <div>
        <h2
          className="text-[28px] font-bold"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}
        >
          Tell us about your business
        </h2>
        <p
          className="mt-1 text-[15px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Takes about a minute. Everything stays private.
        </p>
      </div>

      {/* Business name */}
      <div className="space-y-1.5">
        <label
          htmlFor="companyName"
          className="text-[13px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Business name
        </label>
        <input
          id="companyName"
          type="text"
          value={companyName}
          onChange={(e) => { setCompanyName(e.target.value); setErrors(prev => ({ ...prev, companyName: '' })) }}
          placeholder="e.g. Reynolds HVAC Services"
          autoComplete="organization"
          autoFocus
          className="w-full h-12 px-3 text-[15px] rounded-lg outline-none transition-colors"
          style={{
            background: 'var(--surface)',
            border: `1px solid ${submitted && errors.companyName ? 'var(--red)' : 'var(--border)'}`,
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
          onBlur={(e) => { if (!errors.companyName) e.target.style.borderColor = 'var(--border)' }}
        />
        {submitted && errors.companyName && (
          <p className="text-sm" style={{ color: 'var(--red)' }}>{errors.companyName}</p>
        )}
      </div>

      {/* Business description */}
      <div className="space-y-1.5">
        <label
          htmlFor="description"
          className="text-[13px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          What does your business do?
        </label>
        <textarea
          ref={descRef}
          id="description"
          value={businessDescription}
          onChange={(e) => {
            if (e.target.value.length <= 300) {
              setBusinessDescription(e.target.value)
              setErrors(prev => ({ ...prev, businessDescription: '' }))
            }
          }}
          placeholder="e.g. Commercial and residential HVAC installation, maintenance, and repair serving the greater Dallas area"
          rows={3}
          className="w-full px-3 py-2.5 text-[15px] rounded-lg outline-none resize-none transition-colors"
          style={{
            background: 'var(--surface)',
            border: `1px solid ${submitted && errors.businessDescription ? 'var(--red)' : 'var(--border)'}`,
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
          onBlur={(e) => { if (!errors.businessDescription) e.target.style.borderColor = 'var(--border)' }}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            One or two sentences. We use this to classify your industry.
          </p>
          {charCount >= 250 && (
            <span
              className="text-xs font-medium tabular-nums"
              style={{ color: charCount >= 300 ? 'var(--red)' : 'var(--text-tertiary)' }}
            >
              {charCount}/300
            </span>
          )}
        </div>
        {submitted && errors.businessDescription && (
          <p className="text-sm" style={{ color: 'var(--red)' }}>{errors.businessDescription}</p>
        )}
      </div>

      {/* Revenue band selector */}
      <div className="space-y-1.5">
        <label
          className="text-[13px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Approximate annual revenue
        </label>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          role="radiogroup"
          aria-label="Annual revenue range"
        >
          {REVENUE_BANDS.map((band) => {
            const selected = revenueBand === band.value
            return (
              <button
                key={band.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => { setRevenueBand(band.value); setErrors(prev => ({ ...prev, revenueBand: '' })) }}
                className="h-12 px-4 rounded-lg text-sm font-semibold text-left transition-all"
                style={{
                  background: selected ? 'var(--accent-light)' : 'var(--surface)',
                  border: selected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  color: selected ? 'var(--primary)' : 'var(--text-primary)',
                  borderLeft: selected ? '3px solid var(--primary)' : undefined,
                }}
              >
                {band.label}
              </button>
            )
          })}
        </div>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Used for industry benchmarking. Not shared.
        </p>
        {submitted && errors.revenueBand && (
          <p className="text-sm" style={{ color: 'var(--red)' }}>{errors.revenueBand}</p>
        )}
      </div>

      {/* Continue button */}
      <button
        type="submit"
        disabled={!isValid}
        className="w-full h-12 rounded-lg text-base font-medium transition-all flex items-center justify-center gap-2"
        style={{
          background: isValid ? 'var(--primary)' : 'var(--border)',
          color: isValid ? 'var(--primary-foreground)' : 'var(--text-tertiary)',
          cursor: isValid ? 'pointer' : 'not-allowed',
        }}
      >
        Continue
        <ArrowRight className="w-5 h-5" />
      </button>
    </form>
  )
}
