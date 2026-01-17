'use client'

import { useEffect, useState } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
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

export default function CompanyBriWeightsPage() {
  const { selectedCompanyId, selectedCompany, isLoading: companyLoading } = useCompany()
  const [weights, setWeights] = useState<BriWeights>(DEFAULT_WEIGHTS)
  const [defaultWeights, setDefaultWeights] = useState<BriWeights>(DEFAULT_WEIGHTS)
  const [isDefault, setIsDefault] = useState(true)
  const [isGlobal, setIsGlobal] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (selectedCompanyId) {
      loadWeights()
    }
  }, [selectedCompanyId])

  async function loadWeights() {
    if (!selectedCompanyId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/bri-weights`)
      if (response.ok) {
        const data = await response.json()
        setWeights(data.weights)
        setDefaultWeights(data.defaultWeights || DEFAULT_WEIGHTS)
        setIsDefault(data.isDefault)
        setIsGlobal(data.isGlobal)
      }
    } catch (err) {
      console.error('Failed to load weights:', err)
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
    return Object.values(weights).reduce((sum, w) => sum + Math.round(w * 100), 0)
  }

  function isValidTotal(): boolean {
    return getTotalPercent() === 100
  }

  async function handleSave() {
    if (!selectedCompanyId) return
    if (!isValidTotal()) {
      setError('Weights must sum to exactly 100%')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const cleanWeights: BriWeights = {} as BriWeights
      for (const [key, value] of Object.entries(weights)) {
        cleanWeights[key as keyof BriWeights] = Math.round(value * 100) / 100
      }

      const response = await fetch(`/api/companies/${selectedCompanyId}/bri-weights`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights: cleanWeights }),
      })

      if (response.ok) {
        const data = await response.json()
        setWeights(data.weights)
        setIsDefault(data.isDefault)
        setIsGlobal(data.isGlobal)
        setSuccess('Weights saved successfully. A new valuation snapshot has been created.')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save weights')
      }
    } catch (err) {
      setError('Failed to save weights')
    } finally {
      setSaving(false)
    }
  }

  async function handleRevertToGlobal() {
    if (!selectedCompanyId) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/bri-weights`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        setWeights(data.weights)
        setIsDefault(data.isDefault)
        setIsGlobal(data.isGlobal)
        setSuccess('Reverted to global defaults. A new valuation snapshot has been created.')
      } else {
        setError('Failed to revert to defaults')
      }
    } catch (err) {
      setError('Failed to revert to defaults')
    } finally {
      setSaving(false)
    }
  }

  const totalPercent = getTotalPercent()

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">BRI Category Weights</h1>
        <p className="text-gray-600">
          Customize {selectedCompany?.name}&apos;s BRI category weights below or restore to default weights
        </p>
      </div>


      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Weight Source</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {isGlobal ? (
              <>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Using Global {isDefault ? 'Defaults' : 'Custom Weights'}
                </span>
                <span className="text-sm text-gray-500">
                  This company inherits weights from the system defaults
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Company-Specific Weights
                </span>
                <span className="text-sm text-gray-500">
                  This company has custom weight settings
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BRI Formula Display */}
      <Card>
        <CardHeader>
          <CardTitle>BRI Calculation Formula</CardTitle>
          <CardDescription>
            The Buyer Readiness Index is a weighted average of six category scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 rounded-lg border font-mono text-sm">
            <p className="text-gray-600 mb-2">// Weighted BRI Calculation</p>
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
                    Default: {(defaultWeights[category] * 100).toFixed(0)}%
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
              onClick={handleRevertToGlobal}
              disabled={saving || isGlobal}
            >
              Revert to Global Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !isValidTotal()}
              className="bg-[#B87333] hover:bg-[#9A5F2A]"
            >
              {saving ? 'Saving...' : 'Save Custom Weights'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Impact Note */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Saving custom weights will immediately create a new valuation snapshot
          for this company using the updated BRI calculation. The dashboard will reflect the new values.
        </p>
      </div>
    </div>
  )
}
