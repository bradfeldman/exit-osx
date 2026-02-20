'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
import { FeatureGate } from '@/components/subscription'
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
import { detectTaxTreatment } from '@/lib/retirement/account-type-detector'
import styles from '@/components/financials/financials-pages.module.css'

type CalculatorMode = 'easy' | 'pro'

export default function RetirementCalculatorPage() {
  const [mode, setMode] = useState<CalculatorMode>('easy')
  const [assets, setAssets] = useState<RetirementAsset[]>([])
  const [manualAssets, setManualAssets] = useState<RetirementAsset[]>([]) // Manually added for modeling
  const [excludedAssetIds, setExcludedAssetIds] = useState<string[]>([]) // PFS assets excluded from calc
  const [excludedAssetDetails, setExcludedAssetDetails] = useState<{ name: string; value: number }[]>([]) // For display
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
                // Dashboard failed — silent fallback
              }

              // Fallback to latest snapshot if dashboard didn't provide a value
              if (!marketValue && company.valuationSnapshots?.[0]?.currentValue) {
                marketValue = Number(company.valuationSnapshots[0].currentValue)
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
          // PROD-046 FIX: Use account-type detector for correct tax treatment.
          // Previously all "Retirement Accounts" were treated as tax_deferred,
          // which incorrectly taxed Roth IRA/401k withdrawals.
          // Now the detector checks account name for Roth/HSA keywords first.
          personalAssets = pfsAssets.map(
            (asset) => {
              const accountName = asset.description || asset.category
              const taxTreatment = detectTaxTreatment(accountName, asset.category)

              return {
                id: asset.id,
                name: accountName,
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
      setExcludedAssetDetails(
        pfsAssets
          .filter(a => savedExcluded.includes(a.id))
          .map(a => ({ name: a.name || a.category, value: a.currentValue }))
      )
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

  function _restoreExcludedAsset(id: string) {
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
      <div className={styles.loading}>
        <div className={styles.retirementSpinner} />
      </div>
    )
  }

  return (
    <FeatureGate feature="retirement-calculator" featureDisplayName="Retirement Calculator">
      <div className={styles.retirementWrapper}>

        {/* Header */}
        <div className={styles.retirementHeader}>
          <div className={styles.retirementHeaderLeft}>
            <span className={styles.retirementBadge}>Personal Planning</span>
            <h1 className={styles.retirementTitle}>Can I Retire If I Sell?</h1>
            <p className={styles.retirementSubtitle}>
              {mode === 'easy'
                ? 'See if your exit proceeds plus existing assets will fund your retirement lifestyle.'
                : 'Model different scenarios to find your target exit value.'}
            </p>
          </div>
          <div className={styles.retirementHeaderRight}>
            {/* Mode Toggle */}
            <div className={styles.retirementModeToggle}>
              <button
                onClick={() => setMode('easy')}
                className={`${styles.retirementModeBtn} ${mode === 'easy' ? styles.retirementModeBtnActive : ''}`}
              >
                Easy
              </button>
              <button
                onClick={() => setMode('pro')}
                className={`${styles.retirementModeBtn} ${mode === 'pro' ? styles.retirementModeBtnActive : ''}`}
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
          <div className={styles.retirementEasyGrid}>
            {/* Left Column: Simple Inputs */}
            <div className={styles.retirementEasyCol}>
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
            <div className={styles.retirementEasyCol}>
              <ResultsPanel projections={projections} isOnTrack={isOnTrack} />

              <ProjectionChart
                projections={projections.portfolioByYear}
                retirementAge={assumptions.retirementAge}
                currentAge={assumptions.currentAge}
              />

              {/* Prompt to switch to Pro mode */}
              <div className={styles.retirementPromoCard}>
                <div className={styles.retirementPromoInner}>
                  <div>
                    <p className={styles.retirementPromoTitle}>Want more control?</p>
                    <p className={styles.retirementPromoDesc}>
                      Pro mode includes sensitivity analysis and tax settings
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setMode('pro')}>
                    Switch to Pro
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Pro Mode: Three Column Layout */
          <div className={styles.retirementProGrid}>
            {/* Left Column: Market Data */}
            <div className={styles.retirementCol3}>
              <MarketDataPanel />
            </div>

            {/* Center Column: Inputs */}
            <div className={styles.retirementCol5}>
              <TimelinePanel assumptions={assumptions} onAssumptionChange={updateAssumption} />

              <SpendingPanel
                assumptions={assumptions}
                onAssumptionChange={updateAssumption}
                spendingAtRetirement={projections.spendingAtRetirement}
                annualOtherIncome={projections.annualOtherIncome}
              />

              <GrowthPanel assumptions={assumptions} onAssumptionChange={updateAssumption} />

              {/* Tax Settings Card */}
              <div className={styles.card}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Tax Settings</h3>
                </div>
                <div className={styles.retirementTaxSettingsGrid}>
                  <div>
                    <label className={styles.retirementTaxLabel}>State / Location</label>
                    <select
                      value={assumptions.stateCode}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className={styles.retirementSelect}
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
                    <label className={styles.retirementTaxLabel}>Local Tax Rate</label>
                    <div className={styles.retirementInputWrapper}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={(assumptions.localTaxRate * 100).toFixed(1)}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9.]/g, '')
                          if (v === '' || v === '.') return
                          updateAssumption('localTaxRate', Number(v) / 100)
                        }}
                        className={`${styles.retirementInput} ${styles.retirementInputWithSuffix}`}
                      />
                      <span className={styles.retirementInputSuffix}>%</span>
                    </div>
                  </div>
                </div>

                <p className={styles.retirementTaxSummary} style={{ marginTop: 12 }}>
                  Combined income tax rate:{' '}
                  <span className={styles.retirementTaxSummaryValue}>
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
                  className={styles.retirementAdvancedToggle}
                  style={{ marginTop: 12 }}
                >
                  <svg
                    className={`${styles.retirementAdvancedToggleIcon} ${showAdvancedTax ? styles.retirementAdvancedToggleIconOpen : ''}`}
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
                  <div className={styles.retirementAdvancedTaxGrid} style={{ marginTop: 12 }}>
                    <div>
                      <label className={styles.retirementTaxLabelSmall}>Federal Rate</label>
                      <div className={styles.retirementInputWrapper}>
                        <input
                          type="number"
                          step="1"
                          value={(assumptions.federalTaxRate * 100).toFixed(0)}
                          onChange={(e) =>
                            updateAssumption('federalTaxRate', Number(e.target.value) / 100)
                          }
                          className={`${styles.retirementInput} ${styles.retirementInputWithSuffix}`}
                          style={{ fontSize: 13, padding: '6px 28px 6px 8px' }}
                        />
                        <span className={styles.retirementInputSuffix} style={{ fontSize: 12 }}>%</span>
                      </div>
                    </div>
                    <div>
                      <label className={styles.retirementTaxLabelSmall}>State Rate</label>
                      <div className={styles.retirementInputWrapper}>
                        <input
                          type="number"
                          step="0.1"
                          value={(assumptions.stateTaxRate * 100).toFixed(1)}
                          onChange={(e) =>
                            updateAssumption('stateTaxRate', Number(e.target.value) / 100)
                          }
                          className={`${styles.retirementInput} ${styles.retirementInputWithSuffix}`}
                          style={{ fontSize: 13, padding: '6px 28px 6px 8px' }}
                        />
                        <span className={styles.retirementInputSuffix} style={{ fontSize: 12 }}>%</span>
                      </div>
                    </div>
                    <div>
                      <label className={styles.retirementTaxLabelSmall}>Cap Gains Rate</label>
                      <div className={styles.retirementInputWrapper}>
                        <input
                          type="number"
                          step="1"
                          value={(assumptions.capitalGainsTaxRate * 100).toFixed(0)}
                          onChange={(e) =>
                            updateAssumption('capitalGainsTaxRate', Number(e.target.value) / 100)
                          }
                          className={`${styles.retirementInput} ${styles.retirementInputWithSuffix}`}
                          style={{ fontSize: 13, padding: '6px 28px 6px 8px' }}
                        />
                        <span className={styles.retirementInputSuffix} style={{ fontSize: 12 }}>%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Results */}
            <div className={styles.retirementCol4}>
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
        <div className={styles.retirementAssetsCard}>
          {/* Card Header */}
          <div className={styles.retirementAssetsCardHeader}>
            <div className={styles.retirementAssetsCardHeaderLeft}>
              <h2 className={styles.retirementAssetsCardTitle}>Your Assets</h2>
              <p className={styles.retirementAssetsCardDesc}>
                {mode === 'easy'
                  ? 'Your assets imported from your Personal Financial Statement'
                  : 'Assets from your PFS plus any modeling adjustments'}
              </p>
            </div>
            {mode === 'pro' && (
              <div className={styles.retirementAssetsCardActions}>
                {(manualAssets.length > 0 || excludedAssetIds.length > 0 || Object.keys(assetOverrides).length > 0) && (
                  <Button onClick={clearAllAdjustments} variant="ghost" size="sm">
                    Reset to PFS Values
                  </Button>
                )}
                <Button onClick={addManualAsset} variant="outline" size="sm">
                  + Add for Modeling
                </Button>
              </div>
            )}
          </div>

          {/* Modeling mode banner */}
          {mode === 'pro' && (manualAssets.length > 0 || excludedAssetIds.length > 0 || Object.keys(assetOverrides).length > 0) && (
            <div className={styles.retirementModelingBanner}>
              <div className={styles.retirementModelingBannerInner}>
                <span className={styles.retirementModelingBannerBold}>Modeling Mode:</span>{' '}
                You have customizations for scenario planning
                {manualAssets.length > 0 && ` (${manualAssets.length} added)`}
                {excludedAssetIds.length > 0 && ` (${excludedAssetIds.length} excluded)`}
                {Object.keys(assetOverrides).length > 0 && ` (${Object.keys(assetOverrides).length} modified)`}.
                These changes are saved locally for this calculator only.{' '}
                <Link href="/dashboard/financials/personal" className={styles.retirementLink}>
                  Edit your actual PFS →
                </Link>
              </div>
            </div>
          )}

          {/* Card Body */}
          <div className={styles.retirementAssetsCardBody}>
            {mode === 'easy' ? (
              /* Easy Mode: Simplified Asset Table */
              <div>
                {/* Table Header */}
                <div className={`${styles.retirementTableHeader} ${styles.retirementTableHeaderEasy}`}>
                  <div>Asset</div>
                  <div className={styles.retirementTableHeaderRight}>Value</div>
                  <div className={styles.retirementTableHeaderRight}>
                    After-Tax Value
                    <div className={styles.retirementTooltipWrapper}>
                      <svg className={styles.retirementTooltipIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className={styles.retirementTooltipContent}>
                        <p className={styles.retirementTooltipTitle}>Estimated value after taxes:</p>
                        <ul className={styles.retirementTooltipList}>
                          <li>
                            <span className={styles.retirementTooltipListLabel}>Retirement accounts:</span>{' '}
                            Taxed at {((assumptions.federalTaxRate + assumptions.stateTaxRate + assumptions.localTaxRate) * 100).toFixed(0)}% income rate
                          </li>
                          <li>
                            <span className={styles.retirementTooltipListLabel}>Investments &amp; Real Estate:</span>{' '}
                            {(assumptions.capitalGainsTaxRate * 100).toFixed(0)}% capital gains rate
                          </li>
                          <li>
                            <span className={styles.retirementTooltipListLabel}>Cash &amp; other:</span>{' '}
                            Already taxed (no deduction)
                          </li>
                        </ul>
                        <button
                          onClick={() => setMode('pro')}
                          className={styles.retirementTooltipCta}
                        >
                          Switch to Pro to adjust rates
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Asset Rows */}
                {assets.length === 0 ? (
                  <div className={styles.retirementEmptyState}>
                    <p className={styles.retirementEmptyStateText}>No assets found.</p>
                    <p className={styles.retirementEmptyStateSub}>
                      Add assets in your{' '}
                      <Link href="/dashboard/financials/personal" className={styles.retirementLink}>
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
                        case 'capital_gains': {
                          const gain = currentValue - costBasis
                          const tax = gain > 0 ? gain * assumptions.capitalGainsTaxRate : 0
                          return currentValue - tax
                        }
                        default:
                          return currentValue
                      }
                    })()

                    return (
                      <div key={asset.id} className={styles.retirementAssetRow}>
                        <div className={styles.retirementAssetNameCell}>
                          <span className={styles.retirementAssetNameText}>{asset.name || asset.category}</span>
                          <span className={styles.retirementAssetCategoryText}>{asset.category}</span>
                        </div>
                        <div className={styles.retirementAssetValueCell}>
                          {formatCurrency(asset.currentValue)}
                        </div>
                        <div className={styles.retirementAssetAfterTaxCell}>
                          {formatCurrency(Math.round(afterTaxValue))}
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Totals */}
                {assets.length > 0 && (
                  <>
                    <div className={`${styles.retirementTotalsRow} ${styles.retirementTotalsRowEasy}`}>
                      <div className={styles.retirementTotalsLabel}>Total</div>
                      <div className={styles.retirementTotalsValue}>
                        {formatCurrency(assets.reduce((sum, a) => sum + a.currentValue, 0))}
                      </div>
                      <div className={styles.retirementTotalsAfterTax}>
                        {formatCurrency(projections.totalAfterTaxToday)}
                      </div>
                    </div>
                    {excludedAssetDetails.length > 0 && (
                      <p className={styles.retirementExcludedNote}>
                        <span className={styles.retirementExcludedNoteLabel}>Not included:</span>{' '}
                        {excludedAssetDetails.map(a => `${a.name} (${formatCurrency(a.value)})`).join(', ')}.
                        {' '}Primary residence is excluded since most retirees continue living in their home.{' '}
                        <button onClick={() => setMode('pro')} className={styles.retirementTextLink}>
                          Switch to Pro mode
                        </button>{' '}
                        to include it.
                      </p>
                    )}
                    <p className={styles.retirementExcludedNote}>
                      After-tax values use default rates ({((assumptions.federalTaxRate + assumptions.stateTaxRate + assumptions.localTaxRate) * 100).toFixed(0)}% income, {(assumptions.capitalGainsTaxRate * 100).toFixed(0)}% cap gains).{' '}
                      <button onClick={() => setMode('pro')} className={styles.retirementTextLink}>
                        Switch to Pro mode
                      </button>{' '}
                      to customize tax rates and cost basis.
                    </p>
                  </>
                )}
              </div>
            ) : (
              /* Pro Mode: Full Asset Table */
              <div>
                {/* Table Header */}
                <div className={`${styles.retirementTableHeader} ${styles.retirementTableHeaderPro}`}>
                  <div>Asset</div>
                  <div className={styles.retirementTableHeaderRight}>Value</div>
                  <div>Tax Treatment</div>
                  <div className={styles.retirementTableHeaderRight}>Cost Basis</div>
                  <div className={styles.retirementTableHeaderRight}>After-Tax</div>
                  <div />
                </div>

                {/* Asset Rows */}
                {assets.length === 0 ? (
                  <p className={styles.retirementEmptyStateText} style={{ textAlign: 'center', padding: '16px 0' }}>
                    No assets added yet.
                  </p>
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
                        case 'capital_gains': {
                          const gain = currentValue - costBasis
                          const tax = gain > 0 ? gain * assumptions.capitalGainsTaxRate : 0
                          return currentValue - tax
                        }
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
                        className={`${styles.retirementProAssetRow} ${isManualAsset ? styles.retirementProAssetRowManual : hasOverrides ? styles.retirementProAssetRowOverridden : ''}`}
                      >
                        {/* Name */}
                        <div className={styles.retirementProAssetNameCell}>
                          <input
                            type="text"
                            value={asset.name}
                            onChange={(e) => updateAsset(asset.id, 'name', e.target.value)}
                            placeholder="Asset name"
                            className={`${styles.retirementProNameInput} ${isManualAsset ? styles.retirementProNameInputManual : hasOverrides ? styles.retirementProNameInputOverridden : ''}`}
                          />
                          <div className={styles.retirementProAssetCategoryRow}>
                            <span className={styles.retirementProAssetCategoryText}>{asset.category}</span>
                            {isManualAsset && (
                              <span className={styles.retirementChipAdded}>Added</span>
                            )}
                            {hasOverrides && (
                              <span className={styles.retirementChipModified}>Modified</span>
                            )}
                          </div>
                        </div>

                        {/* Value */}
                        <div className={styles.retirementProValueCell}>
                          <span className={styles.retirementProValuePrefix}>$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatInputValue(asset.currentValue)}
                            onChange={(e) =>
                              updateAsset(asset.id, 'currentValue', parseInputValue(e.target.value))
                            }
                            className={styles.retirementProValueInput}
                          />
                        </div>

                        {/* Tax Treatment */}
                        <div>
                          <select
                            value={asset.taxTreatment}
                            onChange={(e) =>
                              updateAsset(asset.id, 'taxTreatment', e.target.value as TaxTreatment)
                            }
                            className={styles.retirementProSelect}
                          >
                            {TAX_TREATMENTS.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Cost Basis */}
                        <div className={styles.retirementProValueCell}>
                          {showCostBasis ? (
                            <>
                              <span className={styles.retirementProValuePrefix}>$</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatInputValue(asset.costBasis || 0)}
                                onChange={(e) =>
                                  updateAsset(asset.id, 'costBasis', parseInputValue(e.target.value))
                                }
                                placeholder="0"
                                className={styles.retirementProValueInput}
                              />
                            </>
                          ) : (
                            <span className={styles.retirementProNAText}>N/A</span>
                          )}
                        </div>

                        {/* After-Tax Value */}
                        <div className={styles.retirementProAfterTaxCell}>
                          {formatCurrency(Math.round(afterTaxValue))}
                        </div>

                        {/* Remove Button */}
                        <div className={styles.retirementProRemoveCell}>
                          <button
                            onClick={() => removeAsset(asset.id)}
                            className={styles.retirementRemoveBtn}
                            title={isManualAsset ? 'Delete this modeling asset' : 'Exclude from calculation (can restore later)'}
                          >
                            {isManualAsset ? (
                              <svg className={styles.retirementRemoveIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            ) : (
                              <svg className={styles.retirementRemoveIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Totals Row */}
                {assets.length > 0 && (
                  <div className={`${styles.retirementTotalsRow} ${styles.retirementTotalsRowPro}`}>
                    <div className={styles.retirementTotalsLabel}>Total</div>
                    <div className={styles.retirementTotalsValue}>
                      {formatCurrency(assets.reduce((sum, a) => sum + a.currentValue, 0))}
                    </div>
                    <div />
                    <div />
                    <div className={styles.retirementTotalsAfterTax}>
                      {formatCurrency(projections.totalAfterTaxToday)}
                    </div>
                    <div />
                  </div>
                )}
              </div>
            )}

            {/* Tax Treatment Legend - Pro mode only */}
            {mode === 'pro' && (
              <div className={styles.retirementTaxLegendSection}>
                <div>
                  <p className={styles.retirementTaxLegendTitle}>Tax Treatment Guide:</p>
                  <div className={styles.retirementTaxLegendGrid}>
                    {TAX_TREATMENTS.map((t) => (
                      <div key={t.value} className={styles.retirementTaxLegendItem}>
                        <span className={styles.retirementTaxLegendItemBold}>{t.label}:</span>{' '}
                        {t.description}
                      </div>
                    ))}
                  </div>
                </div>
                <p className={styles.retirementModelingNote}>
                  <span className={styles.retirementModelingNoteLabel}>About Modeling Adjustments:</span>{' '}
                  Assets marked with{' '}
                  <span className={styles.retirementModelingChip}>Modeling</span>{' '}
                  are for scenario planning only and are saved locally to this calculator.
                  To permanently add or change assets, update your{' '}
                  <Link href="/dashboard/financials/personal" className={styles.retirementLink}>
                    Personal Financial Statement
                  </Link>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <p className={styles.retirementDisclaimer}>
          This calculator provides estimates for planning purposes only and should not be considered
          financial advice. Actual results will vary based on market conditions, tax law changes, and
          personal circumstances. Consult a qualified financial advisor for personalized guidance.
        </p>
      </div>
    </FeatureGate>
  )
}
