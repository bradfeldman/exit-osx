'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface BriWeights {
  FINANCIAL: number
  TRANSFERABILITY: number
  OPERATIONAL: number
  MARKET: number
  LEGAL_TAX: number
  PERSONAL: number
}

const DEFAULT_WEIGHTS: BriWeights = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

const CATEGORY_LABELS: Record<keyof BriWeights, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operational',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal/Tax',
  PERSONAL: 'Personal',
}

const CATEGORY_DESCRIPTIONS: Record<keyof BriWeights, string> = {
  FINANCIAL: 'Revenue quality, profitability trends, financial documentation',
  TRANSFERABILITY: 'Owner dependency, key person risk, process documentation',
  OPERATIONAL: 'Systems, technology, scalability, team structure',
  MARKET: 'Competitive position, customer concentration, growth potential',
  LEGAL_TAX: 'Legal compliance, tax structure, IP protection',
  PERSONAL: 'Owner readiness, timeline flexibility, transition planning',
}

export default function BriWeightingPage() {
  const [weights, setWeights] = useState<BriWeights>(DEFAULT_WEIGHTS)
  const [isDefault, setIsDefault] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadWeights()
  }, [])

  async function loadWeights() {
    try {
      const response = await fetch('/api/settings/bri-weights')
      if (response.ok) {
        const data = await response.json()
        setWeights(data.weights)
        setIsDefault(data.isDefault)
      }
    } catch (_err) {
      // Failed to load weights
    } finally {
      setLoading(false)
    }
  }

  function handleWeightChange(category: keyof BriWeights, value: string) {
    const intValue = Math.round(parseFloat(value))
    const numValue = intValue / 100
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
      setWeights(prev => ({ ...prev, [category]: numValue }))
      setError(null)
      setSuccess(null)
    }
  }

  function getTotalPercent(): number {
    // Sum as percentages to avoid floating point issues
    return Object.values(weights).reduce((sum, w) => sum + Math.round(w * 100), 0)
  }

  function isValidTotal(): boolean {
    return getTotalPercent() === 100
  }

  async function handleSave() {
    if (!isValidTotal()) {
      setError('Weights must sum to exactly 100%')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Convert to clean decimal values (e.g., 25% -> 0.25)
      const cleanWeights: BriWeights = {} as BriWeights
      for (const [key, value] of Object.entries(weights)) {
        cleanWeights[key as keyof BriWeights] = Math.round(value * 100) / 100
      }

      const response = await fetch('/api/settings/bri-weights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights: cleanWeights }),
      })

      if (response.ok) {
        const data = await response.json()
        setWeights(data.weights)
        setIsDefault(data.isDefault)
        const count = data.companiesRecalculated || 0
        setSuccess(`Weights saved. ${count} company snapshot${count !== 1 ? 's' : ''} updated.`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save weights')
      }
    } catch (_err) {
      setError('Failed to save weights')
    } finally {
      setSaving(false)
    }
  }

  async function handleRestoreDefaults() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/settings/bri-weights', {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        setWeights(data.weights)
        setIsDefault(data.isDefault)
        const count = data.companiesRecalculated || 0
        setSuccess(`Defaults restored. ${count} company snapshot${count !== 1 ? 's' : ''} updated.`)
      } else {
        setError('Failed to restore defaults')
      }
    } catch (_err) {
      setError('Failed to restore defaults')
    } finally {
      setSaving(false)
    }
  }

  const totalPercent = getTotalPercent()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">BRI Category Weighting (Defaults)</h1>
        <p className="text-gray-600">
          Set the default weights used when companies don&apos;t have custom weights configured
        </p>
      </div>


      {/* Formula Display */}
      <Card>
        <CardHeader>
          <CardTitle>BRI Calculation Formula</CardTitle>
          <CardDescription>
            The Buyer Readiness Index is a weighted average of six category scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 rounded-lg border font-mono text-sm">
            <p className="text-gray-600 mb-2">{'// Weighted BRI Calculation'}</p>
            <p>BRI = (Financial × <span className="text-blue-600">{(weights.FINANCIAL * 100).toFixed(0)}%</span>)</p>
            <p className="ml-6">+ (Transferability × <span className="text-blue-600">{(weights.TRANSFERABILITY * 100).toFixed(0)}%</span>)</p>
            <p className="ml-6">+ (Operational × <span className="text-blue-600">{(weights.OPERATIONAL * 100).toFixed(0)}%</span>)</p>
            <p className="ml-6">+ (Market × <span className="text-blue-600">{(weights.MARKET * 100).toFixed(0)}%</span>)</p>
            <p className="ml-6">+ (Legal/Tax × <span className="text-blue-600">{(weights.LEGAL_TAX * 100).toFixed(0)}%</span>)</p>
            <p className="ml-6">+ (Personal × <span className="text-blue-600">{(weights.PERSONAL * 100).toFixed(0)}%</span>)</p>
          </div>
        </CardContent>
      </Card>

      {/* Weights Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Category Weights</CardTitle>
          <CardDescription>
            Adjust the weight for each category. All weights must sum to exactly 100%.
            {isDefault && <span className="ml-2 text-green-600 font-medium">(Using defaults)</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Weight Inputs */}
          <div className="space-y-4">
            {(Object.keys(weights) as Array<keyof BriWeights>).map((category) => (
              <div key={category} className="flex items-center gap-4">
                <div className="w-40">
                  <p className="font-medium text-gray-900">{CATEGORY_LABELS[category]}</p>
                  <p className="text-xs text-gray-500">{CATEGORY_DESCRIPTIONS[category]}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(weights[category] * 100)}
                      onChange={(e) => handleWeightChange(category, e.target.value)}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#B87333]"
                    />
                    <div className="w-20">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={Math.round(weights[category] * 100)}
                        onChange={(e) => handleWeightChange(category, e.target.value)}
                        className="w-full px-2 py-1 text-right border rounded text-sm"
                      />
                    </div>
                    <span className="text-gray-500 text-sm w-4">%</span>
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className="text-xs text-gray-400">
                    Default: {(DEFAULT_WEIGHTS[category] * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className={`text-xl font-bold ${isValidTotal() ? 'text-green-600' : 'text-red-600'}`}>
                {totalPercent}%
              </span>
            </div>
            {!isValidTotal() && (
              <p className="text-sm text-red-600 mt-1">
                Weights must sum to exactly 100%. Currently {totalPercent}% ({totalPercent > 100 ? 'over' : 'under'} by {Math.abs(totalPercent - 100)}%)
              </p>
            )}
          </div>

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
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleRestoreDefaults}
              disabled={saving || isDefault}
            >
              Restore Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !isValidTotal()}
              className="bg-[#B87333] hover:bg-[#9A5F2A]"
            >
              {saving ? 'Saving...' : 'Save Weights'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Impact Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Weight Impact</CardTitle>
          <CardDescription>
            How weights affect the BRI score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>Higher weight</strong> means that category has more influence on the final BRI score.
              A company with a low score in a heavily-weighted category will see a larger impact on their overall BRI.
            </p>
            <p>
              <strong>Default weights</strong> reflect typical buyer priorities in M&A transactions:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Financial (25%) - Most buyers prioritize proven financial performance</li>
              <li>Transferability (20%) - Critical for ensuring business continuity post-sale</li>
              <li>Operational (20%) - Systems and processes that enable scalability</li>
              <li>Market (15%) - Competitive positioning and growth potential</li>
              <li>Legal/Tax (10%) - Compliance and structural considerations</li>
              <li>Personal (10%) - Owner readiness affects deal timeline</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
