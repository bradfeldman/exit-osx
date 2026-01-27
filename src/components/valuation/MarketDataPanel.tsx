'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatPercent } from '@/lib/valuation/dcf-calculator'
import { Pencil, X } from 'lucide-react'

interface MarketDataPanelProps {
  industryBetaLow?: number
  industryBetaHigh?: number
  industryGrowthLow?: number
  industryGrowthHigh?: number
  ebitdaMultipleLow?: number
  ebitdaMultipleHigh?: number
  industrySource?: string
  // Override props
  ebitdaMultipleLowOverride?: number | null
  ebitdaMultipleHighOverride?: number | null
  onMultipleOverrideChange?: (low: number | null, high: number | null) => void
}

// Market data as of January 2026
const MARKET_DATA = {
  riskFreeRate: 0.0425, // 10-Year Treasury ~4.24-4.26%
  riskFreeRateRange: { low: 0.0424, high: 0.0426 },
  marketRiskPremium: { low: 0.043, high: 0.06 }, // 4.3% - 6.0%
  sizeRiskPremiumByRevenue: [
    { tier: 'Under $5M', premium: 0.06 },
    { tier: '$5M - $25M', premium: 0.04 },
    { tier: '$25M - $100M', premium: 0.025 },
    { tier: '$100M - $500M', premium: 0.015 },
    { tier: 'Over $500M', premium: 0.0 },
  ],
  lastUpdated: new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }),
}

export function MarketDataPanel({
  industryBetaLow = 0.8,
  industryBetaHigh = 1.2,
  industryGrowthLow = 0.02,
  industryGrowthHigh = 0.05,
  ebitdaMultipleLow = 4.0,
  ebitdaMultipleHigh = 8.0,
  industrySource = 'Default industry benchmarks',
  ebitdaMultipleLowOverride,
  ebitdaMultipleHighOverride,
  onMultipleOverrideChange,
}: MarketDataPanelProps) {
  const [showMultipleDialog, setShowMultipleDialog] = useState(false)
  const [lowInput, setLowInput] = useState('')
  const [highInput, setHighInput] = useState('')
  const [error, setError] = useState('')

  // Determine which values to display
  const hasOverride = ebitdaMultipleLowOverride != null && ebitdaMultipleHighOverride != null
  const displayLow = hasOverride ? ebitdaMultipleLowOverride : ebitdaMultipleLow
  const displayHigh = hasOverride ? ebitdaMultipleHighOverride : ebitdaMultipleHigh

  const handleOpenDialog = () => {
    // Pre-fill with current override or empty
    setLowInput(ebitdaMultipleLowOverride?.toString() || '')
    setHighInput(ebitdaMultipleHighOverride?.toString() || '')
    setError('')
    setShowMultipleDialog(true)
  }

  const handleSave = () => {
    const low = lowInput ? parseFloat(lowInput) : null
    const high = highInput ? parseFloat(highInput) : null

    // Validation
    if ((low !== null && isNaN(low)) || (high !== null && isNaN(high))) {
      setError('Please enter valid numbers')
      return
    }

    if (low !== null && high !== null && high <= low) {
      setError('High multiple must be greater than low multiple')
      return
    }

    if ((low !== null && low <= 0) || (high !== null && high <= 0)) {
      setError('Multiples must be greater than 0')
      return
    }

    // If one is set, both must be set
    if ((low !== null && high === null) || (low === null && high !== null)) {
      setError('Please enter both low and high values, or clear both to use defaults')
      return
    }

    onMultipleOverrideChange?.(low, high)
    setShowMultipleDialog(false)
  }

  const handleClear = () => {
    setLowInput('')
    setHighInput('')
    setError('')
    onMultipleOverrideChange?.(null, null)
    setShowMultipleDialog(false)
  }

  return (
    <div className="space-y-4">
      {/* Market Data Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-900 flex items-center justify-between">
            <span>Market Data</span>
            <span className="text-xs font-normal text-gray-500">WSJ / Federal Reserve</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Risk-Free Rate */}
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600">Risk-Free Rate (10Y Treasury)</span>
              <span className="text-sm font-medium text-gray-900">
                {formatPercent(MARKET_DATA.riskFreeRate)}
              </span>
            </div>

            {/* Market Risk Premium */}
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600">Market Risk Premium</span>
              <span className="text-sm font-medium text-gray-900">
                {formatPercent(MARKET_DATA.marketRiskPremium.low)} -{' '}
                {formatPercent(MARKET_DATA.marketRiskPremium.high)}
              </span>
            </div>

            {/* Size Risk Premium */}
            <div className="py-1">
              <span className="text-sm text-gray-600 block mb-2">Size Risk Premium (by Revenue)</span>
              <div className="space-y-1 pl-2">
                {MARKET_DATA.sizeRiskPremiumByRevenue.map((tier) => (
                  <div key={tier.tier} className="flex justify-between text-xs">
                    <span className="text-gray-500">{tier.tier}</span>
                    <span className="font-medium text-gray-700">{formatPercent(tier.premium)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">Last updated: {MARKET_DATA.lastUpdated}</span>
          </div>
        </CardContent>
      </Card>

      {/* Industry Data Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-900 flex items-center justify-between">
            <span>Industry Benchmarks</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Industry Beta */}
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600">Industry Beta</span>
              <span className="text-sm font-medium text-gray-900">
                {industryBetaLow.toFixed(2)} - {industryBetaHigh.toFixed(2)}
              </span>
            </div>

            {/* Industry Growth */}
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600">Typical Growth Rates</span>
              <span className="text-sm font-medium text-gray-900">
                {formatPercent(industryGrowthLow)} - {formatPercent(industryGrowthHigh)}
              </span>
            </div>

            {/* EBITDA Multiples */}
            <div className="flex justify-between items-center py-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-600">EBITDA Multiples</span>
                {onMultipleOverrideChange && (
                  <button
                    onClick={handleOpenDialog}
                    className="text-xs text-primary hover:text-primary/80 hover:underline"
                  >
                    {hasOverride ? (
                      <span className="flex items-center gap-0.5">
                        <Pencil className="h-3 w-3" />
                        Edit
                      </span>
                    ) : (
                      'Change'
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {hasOverride && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    Custom
                  </span>
                )}
                <span className="text-sm font-medium text-gray-900">
                  {displayLow.toFixed(1)}x - {displayHigh.toFixed(1)}x
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              Source: {hasOverride ? 'Custom override' : industrySource}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* EBITDA Multiple Override Dialog */}
      <Dialog open={showMultipleDialog} onOpenChange={setShowMultipleDialog}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Custom EBITDA Multiple Range</DialogTitle>
            <DialogDescription>
              Override the industry default multiples ({ebitdaMultipleLow.toFixed(1)}x - {ebitdaMultipleHigh.toFixed(1)}x) with custom values.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="low-multiple">Low Multiple</Label>
                <div className="relative">
                  <Input
                    id="low-multiple"
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder={ebitdaMultipleLow.toFixed(1)}
                    value={lowInput}
                    onChange={(e) => {
                      setLowInput(e.target.value)
                      setError('')
                    }}
                    className="pr-6"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">x</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="high-multiple">High Multiple</Label>
                <div className="relative">
                  <Input
                    id="high-multiple"
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder={ebitdaMultipleHigh.toFixed(1)}
                    value={highInput}
                    onChange={(e) => {
                      setHighInput(e.target.value)
                      setError('')
                    }}
                    className="pr-6"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">x</span>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <p className="text-xs text-muted-foreground">
              Leave both fields empty to use industry defaults.
            </p>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            {hasOverride && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Override
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setShowMultipleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
