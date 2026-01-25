'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface BRIWeights {
  FINANCIAL: number
  TRANSFERABILITY: number
  OPERATIONAL: number
  MARKET: number
  LEGAL_TAX: number
  PERSONAL: number
}

const DEFAULT_WEIGHTS: BRIWeights = {
  FINANCIAL: 25,
  TRANSFERABILITY: 20,
  OPERATIONAL: 20,
  MARKET: 15,
  LEGAL_TAX: 10,
  PERSONAL: 10,
}

const CATEGORY_LABELS: Record<keyof BRIWeights, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operational',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal',
}

const CATEGORY_DESCRIPTIONS: Record<keyof BRIWeights, string> = {
  FINANCIAL: 'Revenue stability, profitability, cash flow quality',
  TRANSFERABILITY: 'Owner dependence, management depth, key person risk',
  OPERATIONAL: 'Systems, processes, documentation quality',
  MARKET: 'Competitive position, customer concentration, market trends',
  LEGAL_TAX: 'Compliance, contracts, tax structure',
  PERSONAL: 'Owner readiness, transition planning, deal expectations',
}

export default function AdminBRIWeightingPage() {
  const [weights, setWeights] = useState<BRIWeights>(DEFAULT_WEIGHTS)
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
        if (data.weights) {
          // API returns decimals (0.25), convert to integers (25) for display
          const displayWeights: BRIWeights = {
            FINANCIAL: Math.round(data.weights.FINANCIAL * 100),
            TRANSFERABILITY: Math.round(data.weights.TRANSFERABILITY * 100),
            OPERATIONAL: Math.round(data.weights.OPERATIONAL * 100),
            MARKET: Math.round(data.weights.MARKET * 100),
            LEGAL_TAX: Math.round(data.weights.LEGAL_TAX * 100),
            PERSONAL: Math.round(data.weights.PERSONAL * 100),
          }
          setWeights(displayWeights)
        }
      }
    } catch (err) {
      console.error('Failed to load weights:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(category: keyof BRIWeights, value: string) {
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setWeights(prev => ({ ...prev, [category]: numValue }))
      setError(null)
      setSuccess(null)
    }
  }

  function getTotalWeight(): number {
    return Object.values(weights).reduce((sum, w) => sum + w, 0)
  }

  function isValid(): boolean {
    return getTotalWeight() === 100
  }

  async function handleSave() {
    if (!isValid()) {
      setError('Weights must sum to 100%')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Convert integers (25) to decimals (0.25) for API
      const apiWeights = {
        FINANCIAL: weights.FINANCIAL / 100,
        TRANSFERABILITY: weights.TRANSFERABILITY / 100,
        OPERATIONAL: weights.OPERATIONAL / 100,
        MARKET: weights.MARKET / 100,
        LEGAL_TAX: weights.LEGAL_TAX / 100,
        PERSONAL: weights.PERSONAL / 100,
      }

      const response = await fetch('/api/settings/bri-weights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights: apiWeights }),
      })

      if (response.ok) {
        setSuccess('Global BRI weights updated successfully')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save weights')
      }
    } catch {
      setError('Failed to save weights')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setWeights(DEFAULT_WEIGHTS)
    setError(null)
    setSuccess(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const totalWeight = getTotalWeight()
  const isValidTotal = totalWeight === 100

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Global BRI Weighting</h1>
        <p className="text-muted-foreground">
          Configure the default weights for Buyer Readiness Index categories
        </p>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> These are the system-wide default weights. Individual companies
          can override these with custom weights if needed.
        </p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Category Weights</CardTitle>
          <CardDescription>
            Adjust the percentage weight for each BRI category. Total must equal 100%.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(Object.keys(weights) as Array<keyof BRIWeights>).map((category) => (
              <div key={category} className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-5">
                  <p className="font-medium">{CATEGORY_LABELS[category]}</p>
                  <p className="text-sm text-muted-foreground">{CATEGORY_DESCRIPTIONS[category]}</p>
                </div>
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={weights[category]}
                      onChange={(e) => handleChange(category, e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={weights[category]}
                      onChange={(e) => handleChange(category, e.target.value)}
                      className="w-16 px-2 py-1 text-center border rounded"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${weights[category]}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Total</p>
                </div>
                <div className={`text-xl font-bold ${isValidTotal ? 'text-green-600' : 'text-red-600'}`}>
                  {totalWeight}%
                  {!isValidTotal && (
                    <span className="text-sm font-normal ml-2">
                      ({totalWeight > 100 ? '+' : ''}{totalWeight - 100}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button onClick={handleSave} disabled={saving || !isValidTotal}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Understanding BRI Weights</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            The Buyer Readiness Index (BRI) is a weighted score that reflects how prepared
            a company is for acquisition from a buyer&apos;s perspective.
          </p>
          <p>
            <strong>Weight Distribution:</strong> The default weights (25-20-20-15-10-10)
            reflect typical buyer priorities, with Financial factors carrying the most weight.
          </p>
          <p>
            <strong>Impact:</strong> Adjusting weights will affect how the BRI score is
            calculated for all companies, which in turn affects valuation discounts.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
