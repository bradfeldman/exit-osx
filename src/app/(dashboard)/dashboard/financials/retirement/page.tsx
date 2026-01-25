'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MarketDataPanel,
  TimelinePanel,
  SpendingPanel,
  GrowthPanel,
  ResultsPanel,
  ProjectionChart,
  MonteCarloPanel,
  SensitivityTable,
} from '@/components/retirement'
import {
  type TaxTreatment,
  type RetirementAsset,
  type RetirementAssumptions,
  DEFAULT_ASSUMPTIONS,
  TAX_TREATMENTS,
  US_STATE_TAX_RATES,
  calculateRetirementProjections,
  formatCurrency,
  formatInputValue,
  parseInputValue,
} from '@/lib/retirement/retirement-calculator'

type CalculatorMode = 'easy' | 'pro'

export default function RetirementCalculatorPage() {
  const [mode, setMode] = useState<CalculatorMode>('easy')
  const [assets, setAssets] = useState<RetirementAsset[]>([])
  const [assumptions, setAssumptions] = useState<RetirementAssumptions>(DEFAULT_ASSUMPTIONS)
  const [showAdvancedTax, setShowAdvancedTax] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load saved assumptions and mode on mount
  useEffect(() => {
    const savedAssumptions = localStorage.getItem('retirement_assumptions')
    if (savedAssumptions) {
      try {
        const parsed = JSON.parse(savedAssumptions)
        setAssumptions({ ...DEFAULT_ASSUMPTIONS, ...parsed })
      } catch {
        // Use defaults if parse fails
      }
    }
    const savedMode = localStorage.getItem('retirement_calculator_mode') as CalculatorMode | null
    if (savedMode === 'easy' || savedMode === 'pro') {
      setMode(savedMode)
    }
  }, [])

  // Save data when it changes
  useEffect(() => {
    localStorage.setItem('retirement_assets', JSON.stringify(assets))
    localStorage.setItem('retirement_assumptions', JSON.stringify(assumptions))
  }, [assets, assumptions])

  // Save mode preference
  useEffect(() => {
    localStorage.setItem('retirement_calculator_mode', mode)
  }, [mode])

  const importFromPFS = useCallback(async () => {
    try {
      // Load business assets from API
      const response = await fetch('/api/companies')
      let businessAssets: RetirementAsset[] = []

      if (response.ok) {
        const data = await response.json()
        const savedOwnership = localStorage.getItem('pfs_businessOwnership')
        const ownership = savedOwnership ? JSON.parse(savedOwnership) : {}

        businessAssets = await Promise.all(
          (
            data.companies || []
          ).map(
            async (company: {
              id: string
              name: string
              valuationSnapshots?: { currentValue: string | number }[]
            }) => {
              let marketValue = 0

              try {
                const dashboardRes = await fetch(`/api/companies/${company.id}/dashboard`)
                if (dashboardRes.ok) {
                  const dashboardData = await dashboardRes.json()
                  marketValue = dashboardData.tier1?.currentValue || 0
                }
              } catch {
                marketValue = company.valuationSnapshots?.[0]?.currentValue
                  ? Number(company.valuationSnapshots[0].currentValue)
                  : 0
              }

              const ownershipPercent = ownership[company.id] ?? 100
              return {
                id: `business-${company.id}`,
                name: company.name,
                category: 'Business Interest',
                currentValue: marketValue * (ownershipPercent / 100),
                taxTreatment: 'capital_gains' as TaxTreatment,
                costBasis: 0,
              }
            }
          )
        )
      }

      // Load personal assets from localStorage
      const savedPersonalAssets = localStorage.getItem('pfs_personalAssets')
      let personalAssets: RetirementAsset[] = []

      if (savedPersonalAssets) {
        const pfsAssets = JSON.parse(savedPersonalAssets)
        personalAssets = pfsAssets.map(
          (asset: { id: string; category: string; description: string; value: number }) => {
            let taxTreatment: TaxTreatment = 'already_taxed'
            if (asset.category === 'Retirement Accounts') {
              taxTreatment = 'tax_deferred'
            } else if (asset.category === 'Investment Accounts') {
              taxTreatment = 'capital_gains'
            } else if (asset.category === 'Real Estate') {
              taxTreatment = 'capital_gains'
            }

            return {
              id: asset.id,
              name: asset.description || asset.category,
              category: asset.category,
              currentValue: asset.value,
              taxTreatment,
              costBasis: asset.category === 'Real Estate' ? asset.value * 0.5 : 0,
            }
          }
        )
      }

      // Load liabilities
      const savedLiabilities = localStorage.getItem('pfs_personalLiabilities')
      let totalLiabilities = 0
      if (savedLiabilities) {
        const liabilities = JSON.parse(savedLiabilities)
        totalLiabilities = liabilities.reduce(
          (sum: number, l: { amount: number }) => sum + l.amount,
          0
        )
      }

      const allAssets = [...businessAssets, ...personalAssets]

      if (totalLiabilities > 0) {
        allAssets.push({
          id: 'liabilities-offset',
          name: 'Less: Outstanding Liabilities',
          category: 'Liabilities',
          currentValue: -totalLiabilities,
          taxTreatment: 'already_taxed',
        })
      }

      setAssets(allAssets)
    } catch (error) {
      console.error('Failed to import PFS data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    importFromPFS()
  }, [importFromPFS])

  function updateAsset(
    id: string,
    field: keyof RetirementAsset,
    value: string | number | TaxTreatment
  ) {
    setAssets((prev) => prev.map((asset) => (asset.id === id ? { ...asset, [field]: value } : asset)))
  }

  function addManualAsset() {
    setAssets((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        name: '',
        category: 'Other',
        currentValue: 0,
        taxTreatment: 'already_taxed',
      },
    ])
  }

  function removeAsset(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id))
  }

  function updateAssumption<K extends keyof RetirementAssumptions>(
    key: K,
    value: RetirementAssumptions[K]
  ) {
    setAssumptions((prev) => ({ ...prev, [key]: value }))
  }

  function handleStateChange(stateCode: string) {
    const stateData = US_STATE_TAX_RATES.find((s) => s.code === stateCode)
    if (stateData) {
      setAssumptions((prev) => ({
        ...prev,
        stateCode,
        stateTaxRate: stateData.rate,
      }))
    }
  }

  // Calculate projections
  const projections = calculateRetirementProjections(assets, assumptions)
  const isOnTrack = projections.surplusOrShortfall >= 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retirement Calculator</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'easy'
              ? 'Simple retirement planning - answer a few questions to see if you\'re on track'
              : 'Advanced retirement planning with Monte Carlo simulation'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('easy')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'easy'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Easy
            </button>
            <button
              onClick={() => setMode('pro')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'pro'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pro
            </button>
          </div>
          <Link href="/dashboard/financials/personal">
            <Button variant="outline" size="sm">
              View PFS
            </Button>
          </Link>
        </div>
      </div>

      {/* Layout - Different for Easy vs Pro mode */}
      {mode === 'easy' ? (
        /* Easy Mode: Two Column Layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Simple Inputs */}
          <div className="space-y-4">
            <TimelinePanel assumptions={assumptions} onAssumptionChange={updateAssumption} />

            <SpendingPanel
              assumptions={assumptions}
              onAssumptionChange={updateAssumption}
              spendingAtRetirement={projections.spendingAtRetirement}
              annualOtherIncome={projections.annualOtherIncome}
              simplified
            />

            <GrowthPanel assumptions={assumptions} onAssumptionChange={updateAssumption} simplified />
          </div>

          {/* Right Column: Results */}
          <div className="space-y-4">
            <ResultsPanel projections={projections} isOnTrack={isOnTrack} />

            <ProjectionChart
              projections={projections.portfolioByYear}
              retirementAge={assumptions.retirementAge}
              currentAge={assumptions.currentAge}
            />

            {/* Prompt to switch to Pro mode */}
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Want more control?</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Pro mode includes Monte Carlo simulation, sensitivity analysis, and tax settings
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setMode('pro')}>
                    Switch to Pro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Pro Mode: Three Column Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Market Data */}
          <div className="lg:col-span-3 space-y-4">
            <MarketDataPanel />
          </div>

          {/* Center Column: Inputs */}
          <div className="lg:col-span-5 space-y-4">
            <TimelinePanel assumptions={assumptions} onAssumptionChange={updateAssumption} />

            <SpendingPanel
              assumptions={assumptions}
              onAssumptionChange={updateAssumption}
              spendingAtRetirement={projections.spendingAtRetirement}
              annualOtherIncome={projections.annualOtherIncome}
            />

            <GrowthPanel assumptions={assumptions} onAssumptionChange={updateAssumption} />

            {/* Tax Settings Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-gray-900">Tax Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">State / Location</label>
                    <select
                      value={assumptions.stateCode}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {US_STATE_TAX_RATES.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.name}{' '}
                          {state.rate > 0
                            ? `(${(state.rate * 100).toFixed(1)}%)`
                            : '(No state tax)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Local Tax Rate</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={(assumptions.localTaxRate * 100).toFixed(1)}
                        onChange={(e) =>
                          updateAssumption('localTaxRate', Number(e.target.value) / 100)
                        }
                        className="w-full pr-7 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Combined income tax rate:{' '}
                  <span className="font-medium">
                    {(
                      (assumptions.federalTaxRate +
                        assumptions.stateTaxRate +
                        assumptions.localTaxRate) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </p>

                <button
                  onClick={() => setShowAdvancedTax(!showAdvancedTax)}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showAdvancedTax ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  Override Tax Rates
                </button>

                {showAdvancedTax && (
                  <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Federal Rate</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          value={(assumptions.federalTaxRate * 100).toFixed(0)}
                          onChange={(e) =>
                            updateAssumption('federalTaxRate', Number(e.target.value) / 100)
                          }
                          className="w-full pr-6 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                        />
                        <span className="absolute right-2 top-1.5 text-gray-500 text-xs">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">State Rate</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={(assumptions.stateTaxRate * 100).toFixed(1)}
                          onChange={(e) =>
                            updateAssumption('stateTaxRate', Number(e.target.value) / 100)
                          }
                          className="w-full pr-6 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                        />
                        <span className="absolute right-2 top-1.5 text-gray-500 text-xs">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Cap Gains Rate</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          value={(assumptions.capitalGainsTaxRate * 100).toFixed(0)}
                          onChange={(e) =>
                            updateAssumption('capitalGainsTaxRate', Number(e.target.value) / 100)
                          }
                          className="w-full pr-6 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                        />
                        <span className="absolute right-2 top-1.5 text-gray-500 text-xs">%</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-4 space-y-4">
            <ResultsPanel projections={projections} isOnTrack={isOnTrack} />

            <ProjectionChart
              projections={projections.portfolioByYear}
              retirementAge={assumptions.retirementAge}
              currentAge={assumptions.currentAge}
            />

            <SensitivityTable assets={assets} assumptions={assumptions} />

            <MonteCarloPanel assets={assets} assumptions={assumptions} />
          </div>
        </div>
      )}

      {/* Assets Section - Full Width */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Assets</CardTitle>
            <CardDescription>
              {mode === 'easy'
                ? 'Your assets imported from your Personal Financial Statement'
                : 'Review your assets and set the appropriate tax treatment for each'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={importFromPFS} variant="outline" size="sm">
              Refresh from PFS
            </Button>
            {mode === 'pro' && (
              <Button onClick={addManualAsset} variant="outline" size="sm">
                + Add Asset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {mode === 'easy' ? (
            /* Easy Mode: Simplified Asset Table */
            <div className="space-y-3">
              {/* Simple Header */}
              <div className="grid grid-cols-12 gap-3 text-sm font-medium text-gray-500 border-b pb-2">
                <div className="col-span-5">Asset</div>
                <div className="col-span-3 text-right">Value</div>
                <div className="col-span-4 text-right">After-Tax Value</div>
              </div>

              {assets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No assets found.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Add assets in your{' '}
                    <Link href="/dashboard/financials/personal" className="text-primary hover:underline">
                      Personal Financial Statement
                    </Link>{' '}
                    and they will appear here.
                  </p>
                </div>
              ) : (
                assets.map((asset) => {
                  const afterTaxValue = (() => {
                    const { currentValue, taxTreatment, costBasis = 0 } = asset
                    const totalIncomeTaxRate =
                      assumptions.federalTaxRate +
                      assumptions.stateTaxRate +
                      assumptions.localTaxRate

                    switch (taxTreatment) {
                      case 'tax_free':
                        return currentValue
                      case 'tax_deferred':
                        return currentValue * (1 - totalIncomeTaxRate)
                      case 'capital_gains':
                        const gain = currentValue - costBasis
                        const tax = gain > 0 ? gain * assumptions.capitalGainsTaxRate : 0
                        return currentValue - tax
                      default:
                        return currentValue
                    }
                  })()

                  return (
                    <div
                      key={asset.id}
                      className="grid grid-cols-12 gap-3 items-center py-2 border-b border-gray-100"
                    >
                      <div className="col-span-5">
                        <span className="text-sm text-gray-900">{asset.name || asset.category}</span>
                        <span className="text-xs text-gray-400 block">{asset.category}</span>
                      </div>
                      <div className="col-span-3 text-right text-sm">
                        {formatCurrency(asset.currentValue)}
                      </div>
                      <div className="col-span-4 text-right text-sm font-medium text-green-600">
                        {formatCurrency(Math.round(afterTaxValue))}
                      </div>
                    </div>
                  )
                })
              )}

              {/* Totals */}
              {assets.length > 0 && (
                <div className="grid grid-cols-12 gap-3 pt-3 font-medium">
                  <div className="col-span-5 text-gray-700">Total</div>
                  <div className="col-span-3 text-right">
                    {formatCurrency(assets.reduce((sum, a) => sum + a.currentValue, 0))}
                  </div>
                  <div className="col-span-4 text-right text-green-600">
                    {formatCurrency(projections.totalAfterTaxToday)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Pro Mode: Full Asset Table */
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 text-sm font-medium text-gray-500 border-b pb-2">
                <div className="col-span-3">Asset</div>
                <div className="col-span-2 text-right">Value</div>
                <div className="col-span-2">Tax Treatment</div>
                <div className="col-span-2 text-right">Cost Basis</div>
                <div className="col-span-2 text-right">After-Tax</div>
                <div className="col-span-1"></div>
              </div>

              {assets.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No assets added yet.</p>
              ) : (
                assets.map((asset) => {
                  const afterTaxValue = (() => {
                    const { currentValue, taxTreatment, costBasis = 0 } = asset
                    const totalIncomeTaxRate =
                      assumptions.federalTaxRate +
                      assumptions.stateTaxRate +
                      assumptions.localTaxRate

                    switch (taxTreatment) {
                      case 'tax_free':
                        return currentValue
                      case 'tax_deferred':
                        return currentValue * (1 - totalIncomeTaxRate)
                      case 'capital_gains':
                        const gain = currentValue - costBasis
                        const tax = gain > 0 ? gain * assumptions.capitalGainsTaxRate : 0
                        return currentValue - tax
                      default:
                        return currentValue
                    }
                  })()
                  const showCostBasis = asset.taxTreatment === 'capital_gains'

                  return (
                    <div
                      key={asset.id}
                      className="grid grid-cols-12 gap-3 items-start py-2 border-b border-gray-100"
                    >
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={asset.name}
                          onChange={(e) => updateAsset(asset.id, 'name', e.target.value)}
                          placeholder="Asset name"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-xs text-gray-400 block mt-0.5">{asset.category}</span>
                      </div>
                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                            $
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatInputValue(asset.currentValue)}
                            onChange={(e) =>
                              updateAsset(asset.id, 'currentValue', parseInputValue(e.target.value))
                            }
                            className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <select
                          value={asset.taxTreatment}
                          onChange={(e) =>
                            updateAsset(asset.id, 'taxTreatment', e.target.value as TaxTreatment)
                          }
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {TAX_TREATMENTS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        {showCostBasis ? (
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                              $
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatInputValue(asset.costBasis || 0)}
                              onChange={(e) =>
                                updateAsset(asset.id, 'costBasis', parseInputValue(e.target.value))
                              }
                              placeholder="0"
                              className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm pt-1.5 block">N/A</span>
                        )}
                      </div>
                      <div className="col-span-2 text-right font-medium pt-1.5">
                        {formatCurrency(Math.round(afterTaxValue))}
                      </div>
                      <div className="col-span-1 text-center pt-1">
                        <button
                          onClick={() => removeAsset(asset.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })
              )}

              {/* Totals */}
              {assets.length > 0 && (
                <div className="grid grid-cols-12 gap-3 pt-3 font-medium">
                  <div className="col-span-3 text-gray-700">Total</div>
                  <div className="col-span-2 text-right">
                    {formatCurrency(assets.reduce((sum, a) => sum + a.currentValue, 0))}
                  </div>
                  <div className="col-span-4"></div>
                  <div className="col-span-2 text-right text-green-600">
                    {formatCurrency(projections.totalAfterTaxToday)}
                  </div>
                  <div className="col-span-1"></div>
                </div>
              )}
            </div>
          )}

          {/* Tax Treatment Legend - Pro mode only */}
          {mode === 'pro' && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-gray-500 mb-2">Tax Treatment Guide:</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                {TAX_TREATMENTS.map((t) => (
                  <div key={t.value}>
                    <span className="font-medium">{t.label}:</span> {t.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 border-t pt-4">
        This calculator provides estimates for planning purposes only and should not be considered
        financial advice. Actual results will vary based on market conditions, tax law changes, and
        personal circumstances. Consult a qualified financial advisor for personalized guidance.
      </p>
    </div>
  )
}
