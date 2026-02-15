'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Edit2, Loader2 } from 'lucide-react'
import type { BusinessBasicsData } from './BusinessBasicsStep'
import type { BusinessProfileData } from './BusinessProfileStep'
import type { BuyerScanData } from './BuyerScanStep'
import type { AssessStep } from './AssessmentFlow'

const PROFILE_LABELS: Record<string, Record<string, string>> = {
  revenueModel: {
    PROJECT_BASED: 'Project-based',
    TRANSACTIONAL: 'Transactional',
    RECURRING_CONTRACTS: 'Recurring contracts',
    SUBSCRIPTION_SAAS: 'Subscription / SaaS',
  },
  laborIntensity: {
    VERY_HIGH: 'Very people-dependent',
    HIGH: 'Mostly people-dependent',
    MODERATE: 'Balanced',
    LOW: 'Systems-driven',
  },
  assetIntensity: {
    ASSET_HEAVY: 'Asset-heavy',
    MODERATE: 'Moderate',
    ASSET_LIGHT: 'Asset-light',
  },
  ownerInvolvement: {
    CRITICAL: 'Business depends on me',
    HIGH: 'Heavily involved',
    MODERATE: 'Moderately involved',
    LOW: 'Mostly delegated',
    MINIMAL: 'Rarely needed',
  },
  grossMarginProxy: {
    LOW: 'Thin margins',
    MODERATE: 'Moderate margins',
    GOOD: 'Good margins',
    EXCELLENT: 'Excellent margins',
  },
}

interface ReviewStepProps {
  basics: BusinessBasicsData
  profile: BusinessProfileData
  scan: BuyerScanData
  onConfirm: () => void
  onEdit: (step: AssessStep) => void
  isCalculating: boolean
  onBack: () => void
}

export function ReviewStep({ basics, profile, scan, onConfirm, onEdit, isCalculating, onBack }: ReviewStepProps) {
  const risksFound = scan.riskCount
  const answeredYes = Object.values(scan.answers).filter(v => v === true).length

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          Everything look right?
        </h2>
        <p className="text-muted-foreground mt-2">
          Review your answers before we calculate your results.
        </p>
      </div>

      {/* Business Basics */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Business Basics</h3>
          <button
            type="button"
            onClick={() => onEdit('basics')}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Company</dt>
            <dd className="font-medium text-foreground">{basics.companyName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Revenue</dt>
            <dd className="font-medium text-foreground">${basics.annualRevenue.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-1">Description</dt>
            <dd className="text-foreground text-xs leading-relaxed">{basics.businessDescription}</dd>
          </div>
        </dl>
      </div>

      {/* Business Profile */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Business Profile</h3>
          <button
            type="button"
            onClick={() => onEdit('profile')}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          {Object.entries(profile).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <dt className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
              <dd className="font-medium text-foreground">{PROFILE_LABELS[key]?.[value] || value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Buyer Scan Summary */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Buyer Confidence Scan</h3>
          <button
            type="button"
            onClick={() => onEdit('scan')}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Yes answers: </span>
            <span className="font-medium text-foreground">{answeredYes} of 8</span>
          </div>
          <div>
            <span className="text-muted-foreground">Risks found: </span>
            <span className="font-medium text-foreground">{risksFound}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="ghost" size="lg" onClick={onBack} disabled={isCalculating}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <Button
          size="lg"
          className="flex-1 h-12 text-base font-medium"
          onClick={onConfirm}
          disabled={isCalculating}
        >
          {isCalculating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              Calculate My Results
              <ArrowRight className="ml-2 w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
