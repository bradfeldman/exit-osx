'use client'

import { Loader2, ArrowRight } from 'lucide-react'
import type { BusinessBasicsData } from './BusinessBasicsStep'
import type { BusinessProfileData } from './BusinessProfileStep'
import type { BuyerScanData } from './BuyerScanStep'
import type { AssessStep } from './AssessmentFlow'

// ---------------------------------------------------------------------------
// Label Maps
// ---------------------------------------------------------------------------

const REVENUE_BAND_LABELS: Record<string, string> = {
  UNDER_1M: 'Under $1M',
  '1M_3M': '$1M – $3M',
  '3M_5M': '$3M – $5M',
  '5M_10M': '$5M – $10M',
  '10M_25M': '$10M – $25M',
  '25M_50M': '$25M – $50M',
  '50M_PLUS': '$50M+',
}

const PROFILE_FIELD_NAMES: Record<string, string> = {
  revenueModel: 'Revenue Model',
  laborIntensity: 'People Dependency',
  assetIntensity: 'Asset Intensity',
  ownerInvolvement: 'Owner Involvement',
  grossMarginProxy: 'Profit Margins',
}

const PROFILE_LABELS: Record<string, Record<string, string>> = {
  revenueModel: {
    PROJECT_BASED: 'Project-based',
    TRANSACTIONAL: 'Transactional',
    RECURRING_CONTRACTS: 'Recurring contracts',
    SUBSCRIPTION_SAAS: 'Subscription / SaaS',
    HYBRID: 'Mix of both',
  },
  laborIntensity: {
    VERY_HIGH: 'More than most',
    HIGH: 'Somewhat more',
    MODERATE: 'About typical',
    LOW: 'Less than most',
  },
  assetIntensity: {
    ASSET_HEAVY: 'More than most',
    MODERATE: 'About typical',
    ASSET_LIGHT: 'Less than most',
  },
  ownerInvolvement: {
    CRITICAL: 'Business depends on me',
    HIGH: 'Heavily involved',
    MODERATE: 'Moderately involved',
    LOW: 'Mostly delegated',
    MINIMAL: 'Rarely needed',
  },
  grossMarginProxy: {
    LOW: 'Below average',
    MODERATE: 'About average',
    GOOD: 'Above average',
    EXCELLENT: 'Well above average',
  },
}

const SCAN_QUESTIONS_SHORT: Record<string, string> = {
  'financial-1': 'Third-party financials',
  'financial-2': 'Customer concentration',
  'transferability-1': 'Business without you',
  'transferability-2': 'Successor readiness',
  'operational-1': 'Written documentation',
  'legal-1': 'Signed contracts',
  'market-1': 'Recurring revenue',
  'personal-1': 'Exit commitment',
}

const ANSWER_COLORS: Record<string, { bg: string; text: string }> = {
  yes: { bg: 'var(--green-light)', text: 'var(--green)' },
  mostly: { bg: 'var(--accent-light)', text: 'var(--primary)' },
  not_yet: { bg: 'var(--orange-light)', text: 'var(--orange)' },
  no: { bg: 'var(--red-light)', text: 'var(--red)' },
  true: { bg: 'var(--green-light)', text: 'var(--green)' },
  false: { bg: 'var(--red-light)', text: 'var(--red)' },
}

const ANSWER_LABELS: Record<string, string> = {
  yes: 'Yes',
  mostly: 'Mostly',
  not_yet: 'Not yet',
  no: 'No',
  true: 'Yes',
  false: 'No',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ReviewStepProps {
  basics: BusinessBasicsData
  profile: BusinessProfileData
  scan: BuyerScanData
  onConfirm: () => void
  onEdit: (step: AssessStep) => void
  isCalculating: boolean
  onBack: () => void
}

export function ReviewStep({ basics, profile, scan, onConfirm, onEdit, isCalculating }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      {/* Eyebrow */}
      <div
        className="text-[11px] font-semibold uppercase tracking-[0.8px]"
        style={{ color: 'var(--primary)' }}
      >
        Step 4 of 5
      </div>

      {/* Headline */}
      <div>
        <h2
          className="text-[28px] font-bold"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}
        >
          Everything look right?
        </h2>
        <p
          className="mt-1 text-[15px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          Tap any answer to change it. Your results depend on accuracy.
        </p>
      </div>

      {/* Section 1: Your Business */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Your Business
          </h3>
          <button
            type="button"
            onClick={() => onEdit('basics')}
            className="text-sm font-medium"
            style={{ color: 'var(--primary)' }}
          >
            Change
          </button>
        </div>
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt style={{ color: 'var(--text-secondary)' }}>Business name</dt>
            <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>{basics.companyName}</dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: 'var(--text-secondary)' }}>Revenue</dt>
            <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {REVENUE_BAND_LABELS[basics.revenueBand] || basics.revenueBand}
            </dd>
          </div>
          <div>
            <dt className="mb-1" style={{ color: 'var(--text-secondary)' }}>Description</dt>
            <dd className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {basics.businessDescription}
            </dd>
          </div>
        </dl>
      </div>

      {/* Section 2: Business Profile */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Business Profile
          </h3>
          <button
            type="button"
            onClick={() => onEdit('profile')}
            className="text-sm font-medium"
            style={{ color: 'var(--primary)' }}
          >
            Change
          </button>
        </div>
        <dl className="space-y-2.5 text-sm">
          {Object.entries(profile).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <dt style={{ color: 'var(--text-secondary)' }}>{PROFILE_FIELD_NAMES[key] || key}</dt>
              <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {PROFILE_LABELS[key]?.[value] || value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Section 3: Buyer Confidence Answers */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Buyer Confidence Answers
          </h3>
          <button
            type="button"
            onClick={() => onEdit('scan')}
            className="text-sm font-medium"
            style={{ color: 'var(--primary)' }}
          >
            Change
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(scan.answers).map(([id, answer]) => {
            const answerStr = String(answer)
            const colors = ANSWER_COLORS[answerStr] || ANSWER_COLORS['no']
            const label = ANSWER_LABELS[answerStr] || answerStr
            return (
              <button
                key={id}
                type="button"
                onClick={() => onEdit('scan')}
                className="w-full flex items-center justify-between py-2 px-1 rounded-lg text-sm transition-colors hover:bg-black/[0.02]"
              >
                <span style={{ color: 'var(--text-primary)' }}>
                  {SCAN_QUESTIONS_SHORT[id] || id}
                </span>
                <span
                  className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom text */}
      <p
        className="text-center text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        All good? Let&apos;s see what your business is worth.
      </p>

      {/* See My Results button */}
      <button
        type="button"
        onClick={onConfirm}
        disabled={isCalculating}
        className="w-full h-12 rounded-lg text-base font-medium transition-all flex items-center justify-center gap-2"
        style={{
          background: 'var(--primary)',
          color: 'var(--primary-foreground)',
          opacity: isCalculating ? 0.7 : 1,
        }}
      >
        {isCalculating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Calculating...
          </>
        ) : (
          <>
            See My Results
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </div>
  )
}
