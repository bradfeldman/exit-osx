'use client'

import { useEffect, useState } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CoreFactors {
  revenueSizeCategory: string
  revenueModel: string
  grossMarginProxy: string
  laborIntensity: string
  assetIntensity: string
  ownerInvolvement: string
}

const FACTOR_OPTIONS = {
  revenueSizeCategory: {
    label: 'Annual Revenue',
    description: 'What is your annual revenue range?',
    options: [
      { value: 'UNDER_500K', label: 'Under $500K' },
      { value: 'FROM_500K_TO_1M', label: '$500K - $1M' },
      { value: 'FROM_1M_TO_3M', label: '$1M - $3M' },
      { value: 'FROM_3M_TO_10M', label: '$3M - $10M' },
      { value: 'FROM_10M_TO_25M', label: '$10M - $25M' },
      { value: 'OVER_25M', label: 'Over $25M' },
    ],
  },
  revenueModel: {
    label: 'Revenue Model',
    description: 'How does your business generate revenue?',
    options: [
      { value: 'PROJECT_BASED', label: 'Project-Based' },
      { value: 'TRANSACTIONAL', label: 'Transactional' },
      { value: 'RECURRING_CONTRACTS', label: 'Recurring Contracts' },
      { value: 'SUBSCRIPTION_SAAS', label: 'Subscription/SaaS' },
    ],
  },
  grossMarginProxy: {
    label: 'Gross Margin',
    description: 'What is your typical gross margin?',
    options: [
      { value: 'LOW', label: 'Low (< 30%)' },
      { value: 'MODERATE', label: 'Moderate (30-50%)' },
      { value: 'GOOD', label: 'Good (50-70%)' },
      { value: 'EXCELLENT', label: 'Excellent (> 70%)' },
    ],
  },
  laborIntensity: {
    label: 'Labor Intensity',
    description: 'How labor-intensive is your business?',
    options: [
      { value: 'LOW', label: 'Low - Highly automated' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'HIGH', label: 'High' },
      { value: 'VERY_HIGH', label: 'Very High - People-dependent' },
    ],
  },
  assetIntensity: {
    label: 'Asset Intensity',
    description: 'How asset-intensive is your business?',
    options: [
      { value: 'ASSET_LIGHT', label: 'Asset Light' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'ASSET_HEAVY', label: 'Asset Heavy' },
    ],
  },
  ownerInvolvement: {
    label: 'Owner Involvement',
    description: 'How involved is the owner in daily operations?',
    options: [
      { value: 'MINIMAL', label: 'Minimal - Business runs independently' },
      { value: 'LOW', label: 'Low' },
      { value: 'MODERATE', label: 'Moderate' },
      { value: 'HIGH', label: 'High' },
      { value: 'CRITICAL', label: 'Critical - Owner is essential' },
    ],
  },
}

const FACTOR_SCORES: Record<string, Record<string, number>> = {
  revenueSizeCategory: {
    UNDER_500K: 20,
    FROM_500K_TO_1M: 40,
    FROM_1M_TO_3M: 60,
    FROM_3M_TO_10M: 80,
    FROM_10M_TO_25M: 90,
    OVER_25M: 100,
  },
  revenueModel: {
    PROJECT_BASED: 25,
    TRANSACTIONAL: 50,
    RECURRING_CONTRACTS: 75,
    SUBSCRIPTION_SAAS: 100,
  },
  grossMarginProxy: {
    LOW: 25,
    MODERATE: 50,
    GOOD: 75,
    EXCELLENT: 100,
  },
  laborIntensity: {
    VERY_HIGH: 25,
    HIGH: 50,
    MODERATE: 75,
    LOW: 100,
  },
  assetIntensity: {
    ASSET_HEAVY: 33,
    MODERATE: 67,
    ASSET_LIGHT: 100,
  },
  ownerInvolvement: {
    CRITICAL: 0,
    HIGH: 25,
    MODERATE: 50,
    LOW: 75,
    MINIMAL: 100,
  },
}

export default function CompanyAssessmentPage() {
  const { selectedCompanyId, selectedCompany, isLoading: companyLoading } = useCompany()
  const [factors, setFactors] = useState<CoreFactors | null>(null)
  const [originalFactors, setOriginalFactors] = useState<CoreFactors | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (selectedCompanyId) {
      loadCoreFactors()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId])

  async function loadCoreFactors() {
    if (!selectedCompanyId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/core-factors`)
      if (response.ok) {
        const data = await response.json()
        if (data.coreFactors) {
          setFactors(data.coreFactors)
          setOriginalFactors(data.coreFactors)
        } else {
          // Initialize with empty values if no core factors exist
          const emptyFactors: CoreFactors = {
            revenueSizeCategory: '',
            revenueModel: '',
            grossMarginProxy: '',
            laborIntensity: '',
            assetIntensity: '',
            ownerInvolvement: '',
          }
          setFactors(emptyFactors)
          setOriginalFactors(emptyFactors)
        }
      }
    } catch (_err) {
      setError('Failed to load company data')
    } finally {
      setLoading(false)
    }
  }

  function handleFactorChange(factor: keyof CoreFactors, value: string) {
    if (factors) {
      setFactors({ ...factors, [factor]: value })
      setError(null)
      setSuccess(null)
    }
  }

  function calculateCoreScore(): number {
    if (!factors) return 0

    const scores = Object.entries(factors).map(([key, value]) => {
      const scoreMap = FACTOR_SCORES[key]
      return scoreMap?.[value] || 50
    })

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  function hasChanges(): boolean {
    if (!factors || !originalFactors) return false
    return JSON.stringify(factors) !== JSON.stringify(originalFactors)
  }

  function isComplete(): boolean {
    if (!factors) return false
    return Object.values(factors).every(v => v !== '')
  }

  async function handleSave() {
    if (!selectedCompanyId || !factors) return

    if (!isComplete()) {
      setError('Please answer all questions before saving')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/core-factors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(factors),
      })

      if (response.ok) {
        const data = await response.json()
        setOriginalFactors(factors)
        setSuccess(data.snapshotUpdated
          ? 'Core factors saved and valuation snapshot updated.'
          : 'Core factors saved.')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save core factors')
      }
    } catch (_err) {
      setError('Failed to save core factors')
    } finally {
      setSaving(false)
    }
  }

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!selectedCompanyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No company selected</p>
      </div>
    )
  }

  const coreScore = calculateCoreScore()

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Assessment</h1>
        <p className="text-gray-600">
          Update {selectedCompany?.name}&apos;s core business attributes to recalculate the Core Score
        </p>
      </div>

      {/* Current Core Score */}
      <Card>
        <CardHeader>
          <CardTitle>Core Score Preview</CardTitle>
          <CardDescription>
            Based on your current selections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-[#B87333]">{coreScore}%</div>
            <div className="text-sm text-gray-500">
              The Core Score positions your company within the industry multiple range.
              A higher score means your business fundamentals support a higher valuation multiple.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Factor Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Business Fundamentals</CardTitle>
          <CardDescription>
            Answer each question about your business characteristics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {(Object.keys(FACTOR_OPTIONS) as Array<keyof typeof FACTOR_OPTIONS>).map((factorKey) => {
            const config = FACTOR_OPTIONS[factorKey]
            const currentValue = factors?.[factorKey] || ''

            return (
              <div key={factorKey} className="space-y-3">
                <div>
                  <h3 className="font-medium text-gray-900">{config.label}</h3>
                  <p className="text-sm text-gray-500">{config.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {config.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleFactorChange(factorKey, option.value)}
                      className={`p-3 text-left rounded-lg border transition-colors ${
                        currentValue === option.value
                          ? 'border-[#B87333] bg-orange-50 text-gray-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              {hasChanges() ? 'You have unsaved changes' : 'No changes'}
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges() || !isComplete()}
              className="bg-[#B87333] hover:bg-[#9A5F2A]"
            >
              {saving ? 'Saving...' : 'Save & Update Valuation'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
