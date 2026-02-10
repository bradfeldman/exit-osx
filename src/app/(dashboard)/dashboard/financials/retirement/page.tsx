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
  SensitivityTable,
} from '@/components/retirement'
import {
  type TaxTreatment,
  type RetirementAsset,
  type RetirementAssumptions,
  DEFAULT_ASSUMPTIONS,
  TAX_TREATMENTS,
  US_STATE_TAX_RATES,
  MARKET_BENCHMARKS,
  calculateRetirementProjections,
  formatCurrency,
  formatInputValue,
  parseInputValue,
  getLifeExpectancy,
} from '@/lib/retirement/retirement-calculator'

type CalculatorMode = 'easy' | 'pro'

export default function RetirementCalculatorPage() {
  const [mode, setMode] = useState<CalculatorMode>('easy')
  const [assets, setAssets] = useState<RetirementAsset[]>([])
  const [manualAssets, setManualAssets] = useState<RetirementAsset[]>([]) // Manually added for modeling
  const [excludedAssetIds, setExcludedAssetIds] = useState<string[]>([]) // PFS assets excluded from calc
  const [assetOverrides, setAssetOverrides] = useState<Record<string, Partial<RetirementAsset>>>({}) // Overrides for PFS assets
  const [assumptions, setAssumptions] = useState<RetirementAssumptions>(DEFAULT_ASSUMPTIONS)
  const [showAdvancedTax, setShowAdvancedTax] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load saved assumptions, mode, and manual adjustments on mount
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
    // Load manual modeling adjustments
    const savedManualAssets = localStorage.getItem('retirement_manual_assets')
    if (savedManualAssets) {
      try {
        setManualAssets(JSON.parse(savedManualAssets))
      } catch {
        // Ignore parse errors
      }
    }
    const savedExcluded = localStorage.getItem('retirement_excluded_assets')
    if (savedExcluded) {
      try {
        setExcludedAssetIds(JSON.parse(savedExcluded))
      } catch {
        // Ignore parse errors
      }
    }
    const savedOverrides = localStorage.getItem('retirement_asset_overrides')
    if (savedOverrides) {
      try {
        setAssetOverrides(JSON.parse(savedOverrides))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Save assumptions when they change
  useEffect(() => {
    localStorage.setItem('retirement_assumptions', JSON.stringify(assumptions))
  }, [assumptions])

  // Save manual modeling adjustments when they change (but not during initial load)
  useEffect(() => {
    // Don't save during initial load - would overwrite saved data with empty state
    if (isLoading) return
    localStorage.setItem('retirement_manual_assets', JSON.stringify(manualAssets))
    localStorage.setItem('retirement_excluded_assets', JSON.stringify(excludedAssetIds))
    localStorage.setItem('retirement_asset_overrides', JSON.stringify(assetOverrides))
  }, [manualAssets, excludedAssetIds, assetOverrides, isLoading])

  // Save mode preference
  useEffect(() => {
    localStorage.setItem('retirement_calculator_mode', mode)
  }, [mode])

  // Auto-derive life expectancy and inflation when entering Easy mode
  useEffect(() => {
    if (mode === 'easy') {
      setAssumptions(prev => ({
        ...prev,
        lifeExpectancy: getLifeExpectancy(prev.currentAge),
        inflationRate: MARKET_BENCHMARKS.inflationRate.current,
      }))
    }
  }, [mode])

  // Auto-derive life expectancy when current age changes in Easy mode
  useEffect(() => {
    if (mode === 'easy') {
      setAssumptions(prev => ({
        ...prev,
        lifeExpectancy: getLifeExpectancy(prev.currentAge),
      }))
    }
  }, [assumptions.currentAge, mode])

  const importFromPFS = useCallback(async () => {
    try {
      // Load companies first
      const response = await fetch('/api/companies')
      let businessAssets: RetirementAsset[] = []
      let companies: { id: string; name: string; valuationSnapshots?: { currentValue: string | number }[] }[] = []

      // Fetch PFS data early so ownership is available for business asset calculation
      let pfsData: { personalFinancials?: { personalAssets?: { id: string; category: string; description: string; value: number }[]; personalLiabilities?: { amount: number }[]; businessOwnership?: Record<string, number>; currentAge?: number; retirementAge?: number } } | null = null
      let personalAssets: RetirementAsset[] = []
      let totalLiabilities = 0

      if (response.ok) {
        const data = await response.json()
        companies = data.companies || []

        // Fetch PFS data before building business assets (need ownership %)
        const firstCompanyId = companies[0]?.id
        if (firstCompanyId) {
          try {
            const pfsResponse = await fetch(`/api/companies/${firstCompanyId}/personal-financials`)
            if (pfsResponse.ok) {
              pfsData = await pfsResponse.json()
            }
          } catch (error) {
            console.error('Failed to load personal financials from API:', error)
          }
        }

        // Resolve ownership: DB first, localStorage fallback
        let ownership: Record<string, number> = {}
        if (pfsData?.personalFinancials?.businessOwnership && Object.keys(pfsData.personalFinancials.businessOwnership).length > 0) {
          ownership = pfsData.personalFinancials.businessOwnership
        } else {
          const savedOwnership = localStorage.getItem('pfs_businessOwnership')
          if (savedOwnership) {
            try { ownership = JSON.parse(savedOwnership) } catch { /* ignore */ }
          }
        }

        businessAssets = await Promise.all(
          companies.map(
            async (company) => {
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

        // Process personal assets and liabilities from PFS data
        if (pfsData?.personalFinancials) {
          const pfsAssets = pfsData.personalFinancials.personalAssets || []
          personalAssets = pfsAssets.map(
            (asset) => {
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

          const pfsLiabilities = pfsData.personalFinancials.personalLiabilities || []
          totalLiabilities = pfsLiabilities.reduce(
            (sum: number, l: { amount: number }) => sum + l.amount,
            0
          )
        }

        // Always sync age and retirement age from PFS (source of truth)
        if (pfsData?.personalFinancials) {
          const pfsAge = pfsData.personalFinancials.currentAge
          const pfsRetAge = pfsData.personalFinancials.retirementAge
          if (pfsAge) {
            setAssumptions(prev => ({
              ...prev,
              currentAge: pfsAge,
              lifeExpectancy: getLifeExpectancy(pfsAge),
            }))
          }
          if (pfsRetAge) setAssumptions(prev => ({ ...prev, retirementAge: pfsRetAge }))
        }
      }

      const pfsAssets = [...businessAssets, ...personalAssets]

      if (totalLiabilities > 0) {
        pfsAssets.push({
          id: 'liabilities-offset',
          name: 'Less: Outstanding Liabilities',
          category: 'Liabilities',
          currentValue: -totalLiabilities,
          taxTreatment: 'already_taxed',
        })
      }

      // Load saved manual adjustments from localStorage
      let savedManual: RetirementAsset[] = []
      let savedExcluded: string[] = []
      let savedOverrides: Record<string, Partial<RetirementAsset>> = {}
      try {
        const manualStr = localStorage.getItem('retirement_manual_assets')
        const excludedStr = localStorage.getItem('retirement_excluded_assets')
        const overridesStr = localStorage.getItem('retirement_asset_overrides')
        if (manualStr) savedManual = JSON.parse(manualStr)
        if (excludedStr) savedExcluded = JSON.parse(excludedStr)
        if (overridesStr) savedOverrides = JSON.parse(overridesStr)
      } catch {
        // Ignore parse errors
      }

      // Auto-exclude Real Estate (primary residence) for first-time users
      if (savedExcluded.length === 0 && savedManual.length === 0 && Object.keys(savedOverrides).length === 0) {
        const realEstateIds = pfsAssets
          .filter(a => a.category === 'Real Estate')
          .map(a => a.id)
        savedExcluded = [...savedExcluded, ...realEstateIds]
      }

      // Filter out excluded PFS assets, apply overrides, then add manual assets
      const filteredPfsAssets = pfsAssets
        .filter(a => !savedExcluded.includes(a.id))
        .map(a => savedOverrides[a.id] ? { ...a, ...savedOverrides[a.id] } : a)
      const allAssets = [...filteredPfsAssets, ...savedManual]

      setAssets(allAssets)
      setManualAssets(savedManual)
      setExcludedAssetIds(savedExcluded)
      setAssetOverrides(savedOverrides)
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
    // If it's a manual asset, also update manualAssets state
    if (id.startsWith('manual-')) {
      setManualAssets((prev) => prev.map((asset) => (asset.id === id ? { ...asset, [field]: value } : asset)))
    } else {
      // It's a PFS asset - save the override
      setAssetOverrides((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), [field]: value }
      }))
    }
  }

  function addManualAsset() {
    const newAsset: RetirementAsset = {
      id: `manual-${Date.now()}`,
      name: '',
      category: 'Modeling Adjustment',
      currentValue: 0,
      taxTreatment: 'already_taxed',
    }
    setAssets((prev) => [...prev, newAsset])
    setManualAssets((prev) => [...prev, newAsset])
  }

  function removeAsset(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id))
    if (id.startsWith('manual-')) {
      // Remove from manual assets
      setManualAssets((prev) => prev.filter((a) => a.id !== id))
    } else {
      // It's a PFS asset - add to excluded list
      setExcludedAssetIds((prev) => [...prev, id])
    }
  }

  function restoreExcludedAsset(id: string) {
    setExcludedAssetIds((prev) => prev.filter((i) => i !== id))
    // Re-import to restore the asset
    importFromPFS()
  }

  function clearAllAdjustments() {
    setManualAssets([])
    setExcludedAssetIds([])
    setAssetOverrides({})
    localStorage.removeItem('retirement_manual_assets')
    localStorage.removeItem('retirement_excluded_assets')
    localStorage.removeItem('retirement_asset_overrides')
    importFromPFS()
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
      {/* Header - Emotionally Connected */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
              Personal Planning
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">
            Can I Retire If I Sell?
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-lg">
            {mode === 'easy'
              ? 'See if your exit proceeds plus existing assets will fund your retirement lifestyle.'
              : 'Model different scenarios to find your target exit value.'}
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
            <TimelinePanel assumptions={assumptions} onAssumptionChange={updateAssumption} simplified />

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
                      Pro mode includes sensitivity analysis and tax settings
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
                : 'Assets from your PFS plus any modeling adjustments'}
            </CardDescription>
          </div>
          {mode === 'pro' && (
            <div className="flex items-center gap-2">
              {(manualAssets.length > 0 || excludedAssetIds.length > 0 || Object.keys(assetOverrides).length > 0) && (
                <Button onClick={clearAllAdjustments} variant="ghost" size="sm" className="text-gray-500">
                  Reset to PFS Values
                </Button>
              )}
              <Button onClick={addManualAsset} variant="outline" size="sm">
                + Add for Modeling
              </Button>
            </div>
          )}
        </CardHeader>
        {mode === 'pro' && (manualAssets.length > 0 || excludedAssetIds.length > 0 || Object.keys(assetOverrides).length > 0) && (
          <div className="px-6 pb-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="text-blue-800">
                <span className="font-medium">Modeling Mode:</span> You have customizations for scenario planning
                {manualAssets.length > 0 && ` (${manualAssets.length} added)`}
                {excludedAssetIds.length > 0 && ` (${excludedAssetIds.length} excluded)`}
                {Object.keys(assetOverrides).length > 0 && ` (${Object.keys(assetOverrides).length} modified)`}.
                These changes are saved locally for this calculator only.{' '}
                <Link href="/dashboard/financials/personal" className="text-primary hover:underline font-medium">
                  Edit your actual PFS →
                </Link>
              </p>
            </div>
          </div>
        )}
        <CardContent>
          {mode === 'easy' ? (
            /* Easy Mode: Simplified Asset Table */
            <div className="space-y-3">
              {/* Simple Header */}
              <div className="grid grid-cols-12 gap-3 text-sm font-medium text-gray-500 border-b pb-2">
                <div className="col-span-5">Asset</div>
                <div className="col-span-3 text-right">Value</div>
                <div className="col-span-4 text-right flex items-center justify-end gap-1">
                  After-Tax Value
                  <div className="group relative">
                    <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute right-0 top-6 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <p className="font-medium mb-2">Estimated value after taxes:</p>
                      <ul className="space-y-1 text-gray-300">
                        <li><span className="text-white">Retirement accounts:</span> Taxed at {((assumptions.federalTaxRate + assumptions.stateTaxRate + assumptions.localTaxRate) * 100).toFixed(0)}% income rate</li>
                        <li><span className="text-white">Investments & Real Estate:</span> {(assumptions.capitalGainsTaxRate * 100).toFixed(0)}% capital gains rate</li>
                        <li><span className="text-white">Cash & other:</span> Already taxed (no deduction)</li>
                      </ul>
                      <button
                        onClick={() => setMode('pro')}
                        className="mt-2 text-primary-foreground bg-primary/80 hover:bg-primary px-2 py-1 rounded text-xs w-full"
                      >
                        Switch to Pro to adjust rates
                      </button>
                    </div>
                  </div>
                </div>
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
                <>
                  <div className="grid grid-cols-12 gap-3 pt-3 font-medium">
                    <div className="col-span-5 text-gray-700">Total</div>
                    <div className="col-span-3 text-right">
                      {formatCurrency(assets.reduce((sum, a) => sum + a.currentValue, 0))}
                    </div>
                    <div className="col-span-4 text-right text-green-600">
                      {formatCurrency(projections.totalAfterTaxToday)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 pt-3 border-t mt-3">
                    After-tax values use default rates ({((assumptions.federalTaxRate + assumptions.stateTaxRate + assumptions.localTaxRate) * 100).toFixed(0)}% income, {(assumptions.capitalGainsTaxRate * 100).toFixed(0)}% cap gains).{' '}
                    <button onClick={() => setMode('pro')} className="text-primary hover:underline">
                      Switch to Pro mode
                    </button>{' '}
                    to customize tax rates and cost basis.
                  </p>
                </>
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

                  const isManualAsset = asset.id.startsWith('manual-')
                  const hasOverrides = !isManualAsset && assetOverrides[asset.id] !== undefined

                  return (
                    <div
                      key={asset.id}
                      className={`grid grid-cols-12 gap-3 items-start py-2 border-b border-gray-100 ${isManualAsset ? 'bg-blue-50/50' : hasOverrides ? 'bg-amber-50/50' : ''}`}
                    >
                      <div className="col-span-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={asset.name}
                            onChange={(e) => updateAsset(asset.id, 'name', e.target.value)}
                            placeholder="Asset name"
                            className={`w-full px-2 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary ${isManualAsset ? 'border-blue-300 bg-white' : hasOverrides ? 'border-amber-300 bg-white' : 'border-gray-300'}`}
                          />
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-gray-400">{asset.category}</span>
                          {isManualAsset && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Added</span>
                          )}
                          {hasOverrides && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Modified</span>
                          )}
                        </div>
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
                          title={isManualAsset ? 'Delete this modeling asset' : 'Exclude from calculation (can restore later)'}
                        >
                          {isManualAsset ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
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
            <div className="mt-4 pt-4 border-t space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Tax Treatment Guide:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  {TAX_TREATMENTS.map((t) => (
                    <div key={t.value}>
                      <span className="font-medium">{t.label}:</span> {t.description}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  <span className="font-medium">About Modeling Adjustments:</span> Assets marked with{' '}
                  <span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-xs">Modeling</span>{' '}
                  are for scenario planning only and are saved locally to this calculator.
                  To permanently add or change assets, update your{' '}
                  <Link href="/dashboard/financials/personal" className="text-primary hover:underline font-medium">
                    Personal Financial Statement
                  </Link>.
                </p>
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
