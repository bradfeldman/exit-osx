'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Calculator } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import {
  MarketDataPanel,
  WACCCalculator,
  GrowthAssumptions,
  TerminalValuePanel,
  ValuationResults,
  SensitivityTable,
  type WACCInputs,
} from '@/components/valuation'
import {
  calculateCostOfEquity,
  calculateDCF,
  type DCFInputs,
  type DCFResults,
} from '@/lib/valuation/dcf-calculator'
import styles from '@/components/valuation/valuation-pages.module.css'

interface DCFAssumptions {
  riskFreeRate: number
  marketRiskPremium: number
  beta: number
  sizeRiskPremium: number
  companySpecificRisk: number
  costOfDebtOverride: number | null
  taxRateOverride: number | null
  debtWeightOverride: number | null
  terminalMethod: 'gordon' | 'exit_multiple'
  perpetualGrowthRate: number
  exitMultiple: number | null
  growthAssumptions: Record<string, number>
  useMidYearConvention: boolean
  ebitdaTier: string | null
  ebitdaMultipleLowOverride: number | null
  ebitdaMultipleHighOverride: number | null
}

const DEFAULT_ASSUMPTIONS: DCFAssumptions = {
  riskFreeRate: 0.041, // 4.1% - Feb 2026 10Y Treasury
  marketRiskPremium: 0.050, // 5.0% - Duff & Phelps / Kroll 2026
  beta: 1.0,
  sizeRiskPremium: 0.04, // 4% - default for ~$1M EBITDA
  companySpecificRisk: 0.05, // 5% - default, driven by BRI score
  costOfDebtOverride: null,
  taxRateOverride: null,
  debtWeightOverride: null,
  terminalMethod: 'gordon',
  perpetualGrowthRate: 0.025, // 2.5%
  exitMultiple: null,
  growthAssumptions: {
    year1: 0.05,
    year2: 0.04,
    year3: 0.03,
    year4: 0.025,
    year5: 0.02,
  },
  useMidYearConvention: true,
  ebitdaTier: null,
  ebitdaMultipleLowOverride: null,
  ebitdaMultipleHighOverride: null,
}

export default function ValuationPage() {
  const { selectedCompanyId } = useCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assumptions, setAssumptions] = useState<DCFAssumptions>(DEFAULT_ASSUMPTIONS)
  const [baseFCF, setBaseFCF] = useState(0)
  const [netDebt, setNetDebt] = useState(0)
  const [ebitda, setEbitda] = useState(0)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalAssumptions, setOriginalAssumptions] = useState<DCFAssumptions | null>(null)
  const [useDCFValue, setUseDCFValue] = useState(false)
  const [workingCapital, setWorkingCapital] = useState<{ t12: number | null; lastFY: number | null; threeYearAvg: number | null } | null>(null)
  const [fcfIsEstimated, setFcfIsEstimated] = useState(false)
  const [originalUseDCFValue, setOriginalUseDCFValue] = useState(false)
  const [debtWeight, setDebtWeight] = useState(0.20)
  const [equityWeight, setEquityWeight] = useState(0.80)

  const hasTrackedPageView = useRef(false)
  const _previousAssumptions = useRef<DCFAssumptions | null>(null)

  const [industryData, setIndustryData] = useState({
    betaLow: 0.8,
    betaHigh: 1.2,
    growthLow: 0.02,
    growthHigh: 0.05,
    ebitdaMultipleLow: 4.0,
    ebitdaMultipleHigh: 8.0,
    source: 'Default industry benchmarks',
  })

  const fetchAssumptions = useCallback(async () => {
    if (!selectedCompanyId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/dcf`)
      if (response.ok) {
        const data = await response.json()
        if (data.assumptions) {
          const loadedAssumptions: DCFAssumptions = {
            riskFreeRate: Number(data.assumptions.riskFreeRate) || DEFAULT_ASSUMPTIONS.riskFreeRate,
            marketRiskPremium:
              Number(data.assumptions.marketRiskPremium) || DEFAULT_ASSUMPTIONS.marketRiskPremium,
            beta: Number(data.assumptions.beta) || DEFAULT_ASSUMPTIONS.beta,
            sizeRiskPremium:
              Number(data.assumptions.sizeRiskPremium) || DEFAULT_ASSUMPTIONS.sizeRiskPremium,
            companySpecificRisk:
              data.assumptions.companySpecificRisk != null
                ? Number(data.assumptions.companySpecificRisk)
                : DEFAULT_ASSUMPTIONS.companySpecificRisk,
            costOfDebtOverride: data.assumptions.costOfDebtOverride
              ? Number(data.assumptions.costOfDebtOverride)
              : null,
            taxRateOverride: data.assumptions.taxRateOverride
              ? Number(data.assumptions.taxRateOverride)
              : null,
            debtWeightOverride: data.assumptions.debtWeightOverride
              ? Number(data.assumptions.debtWeightOverride)
              : null,
            terminalMethod: data.assumptions.terminalMethod || 'gordon',
            perpetualGrowthRate:
              Number(data.assumptions.perpetualGrowthRate) ||
              DEFAULT_ASSUMPTIONS.perpetualGrowthRate,
            exitMultiple: data.assumptions.exitMultiple
              ? Number(data.assumptions.exitMultiple)
              : null,
            growthAssumptions:
              data.assumptions.growthAssumptions || DEFAULT_ASSUMPTIONS.growthAssumptions,
            useMidYearConvention: data.assumptions.useMidYearConvention ?? true,
            ebitdaTier: data.assumptions.ebitdaTier ?? null,
            ebitdaMultipleLowOverride: data.assumptions.ebitdaMultipleLowOverride
              ? Number(data.assumptions.ebitdaMultipleLowOverride)
              : null,
            ebitdaMultipleHighOverride: data.assumptions.ebitdaMultipleHighOverride
              ? Number(data.assumptions.ebitdaMultipleHighOverride)
              : null,
          }
          setAssumptions(loadedAssumptions)
          setOriginalAssumptions(loadedAssumptions)

          if (data.assumptions.debtWeightOverride) {
            setDebtWeight(Number(data.assumptions.debtWeightOverride))
            setEquityWeight(1 - Number(data.assumptions.debtWeightOverride))
          }

          const dcfToggle = data.assumptions.useDCFValue ?? false
          setUseDCFValue(dcfToggle)
          setOriginalUseDCFValue(dcfToggle)
        } else {
          const initial = { ...DEFAULT_ASSUMPTIONS }
          if (data.suggestedDefaults) {
            if (data.suggestedDefaults.riskFreeRate != null) initial.riskFreeRate = data.suggestedDefaults.riskFreeRate
            if (data.suggestedDefaults.marketRiskPremium != null) initial.marketRiskPremium = data.suggestedDefaults.marketRiskPremium
            if (data.suggestedDefaults.beta != null) initial.beta = data.suggestedDefaults.beta
            if (data.suggestedDefaults.sizeRiskPremium != null) initial.sizeRiskPremium = data.suggestedDefaults.sizeRiskPremium
            if (data.suggestedDefaults.companySpecificRisk != null) initial.companySpecificRisk = data.suggestedDefaults.companySpecificRisk
            if (data.suggestedDefaults.costOfDebt != null) initial.costOfDebtOverride = data.suggestedDefaults.costOfDebt
            if (data.suggestedDefaults.taxRate != null) initial.taxRateOverride = data.suggestedDefaults.taxRate
            if (data.suggestedDefaults.growthAssumptions) initial.growthAssumptions = data.suggestedDefaults.growthAssumptions
            if (data.suggestedDefaults.ebitdaTier) initial.ebitdaTier = data.suggestedDefaults.ebitdaTier
            if (data.suggestedDefaults.debtWeight != null) setDebtWeight(data.suggestedDefaults.debtWeight)
            if (data.suggestedDefaults.equityWeight != null) setEquityWeight(data.suggestedDefaults.equityWeight)
          }
          setAssumptions(initial)
          setOriginalAssumptions(initial)
          setOriginalUseDCFValue(false)
        }

        if (data.workingCapital) {
          setWorkingCapital(data.workingCapital)
        }

        if (data.financials) {
          if (data.financials.freeCashFlow) {
            setBaseFCF(Number(data.financials.freeCashFlow))
            setFcfIsEstimated(false)
          } else if (data.financials.estimatedFCF) {
            setBaseFCF(Number(data.financials.estimatedFCF))
            setFcfIsEstimated(true)
          }
          if (data.financials.ebitda) {
            setEbitda(Number(data.financials.ebitda))
          }
          if (data.financials.netDebt !== undefined) {
            setNetDebt(Number(data.financials.netDebt))
          }
        }

        if (data.industryMultiples) {
          setIndustryData({
            betaLow: data.industryMultiples.betaLow || 0.8,
            betaHigh: data.industryMultiples.betaHigh || 1.2,
            growthLow: data.industryMultiples.growthLow || 0.02,
            growthHigh: data.industryMultiples.growthHigh || 0.05,
            ebitdaMultipleLow: Number(data.industryMultiples.ebitdaMultipleLow) || 4.0,
            ebitdaMultipleHigh: Number(data.industryMultiples.ebitdaMultipleHigh) || 8.0,
            source: data.industryMultiples.source || 'Default industry benchmarks',
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch assumptions:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchAssumptions()
  }, [fetchAssumptions])

  useEffect(() => {
    if (hasTrackedPageView.current || loading) return
    hasTrackedPageView.current = true
    analytics.track('dcf_page_viewed', {
      hasFinancials: baseFCF > 0 && ebitda > 0,
    })
  }, [loading, baseFCF, ebitda])

  useEffect(() => {
    if (originalAssumptions) {
      const assumptionsChanged = JSON.stringify(assumptions) !== JSON.stringify(originalAssumptions)
      const toggleChanged = useDCFValue !== originalUseDCFValue
      setHasChanges(assumptionsChanged || toggleChanged)
    }
  }, [assumptions, originalAssumptions, useDCFValue, originalUseDCFValue])

  const handleSave = async () => {
    if (!selectedCompanyId) return

    setSaving(true)
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/dcf`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...assumptions,
          calculatedWACC,
          enterpriseValue: dcfResults?.enterpriseValue ?? null,
          equityValue: dcfResults?.equityValue ?? null,
          useDCFValue,
          useMidYearConvention: assumptions.useMidYearConvention,
          ebitdaTier: assumptions.ebitdaTier,
          ebitdaMultipleLowOverride: assumptions.ebitdaMultipleLowOverride,
          ebitdaMultipleHighOverride: assumptions.ebitdaMultipleHighOverride,
        }),
      })

      if (response.ok) {
        setOriginalAssumptions(assumptions)
        setOriginalUseDCFValue(useDCFValue)
        setHasChanges(false)

        if (dcfResults) {
          analytics.track('dcf_result_viewed', {
            valuationResult: dcfResults.equityValue,
            scenarioName: 'base',
          })
        }
      } else {
        const data = await response.json()
        console.error('Failed to save:', data.error)
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
  }

  const calculatedWACC = useMemo(() => {
    const costOfEquity = calculateCostOfEquity(
      assumptions.riskFreeRate,
      assumptions.marketRiskPremium,
      assumptions.beta,
      assumptions.sizeRiskPremium,
      assumptions.companySpecificRisk
    )

    const costOfDebt = assumptions.costOfDebtOverride || 0.10
    const taxRate = assumptions.taxRateOverride || 0.25

    return equityWeight * costOfEquity + debtWeight * costOfDebt * (1 - taxRate)
  }, [assumptions, debtWeight, equityWeight])

  const dcfResults = useMemo<DCFResults | null>(() => {
    if (baseFCF <= 0) return null

    const growthRatesArray = [
      assumptions.growthAssumptions.year1 || 0,
      assumptions.growthAssumptions.year2 || 0,
      assumptions.growthAssumptions.year3 || 0,
      assumptions.growthAssumptions.year4 || 0,
      assumptions.growthAssumptions.year5 || 0,
    ]

    const dcfInputs: DCFInputs = {
      baseFCF,
      growthRates: growthRatesArray,
      wacc: calculatedWACC,
      terminalMethod: assumptions.terminalMethod,
      perpetualGrowthRate: assumptions.perpetualGrowthRate,
      exitMultiple: assumptions.exitMultiple || undefined,
      netDebt,
      useMidYearConvention: assumptions.useMidYearConvention,
    }

    try {
      return calculateDCF(dcfInputs, ebitda)
    } catch (error) {
      console.error('DCF calculation error:', error)
      return null
    }
  }, [assumptions, baseFCF, calculatedWACC, netDebt, ebitda])

  const waccInputs: WACCInputs = {
    riskFreeRate: assumptions.riskFreeRate,
    marketRiskPremium: assumptions.marketRiskPremium,
    beta: assumptions.beta,
    sizeRiskPremium: assumptions.sizeRiskPremium,
    companySpecificRisk: assumptions.companySpecificRisk,
    costOfDebt: assumptions.costOfDebtOverride,
    taxRate: assumptions.taxRateOverride,
  }

  const handleWACCInputChange = <K extends keyof WACCInputs>(key: K, value: WACCInputs[K]) => {
    const prevValue = key === 'costOfDebt'
      ? assumptions.costOfDebtOverride
      : key === 'taxRate'
        ? assumptions.taxRateOverride
        : assumptions[key as keyof DCFAssumptions]

    if (key === 'costOfDebt') {
      setAssumptions((prev) => ({ ...prev, costOfDebtOverride: value as number | null }))
    } else if (key === 'taxRate') {
      setAssumptions((prev) => ({ ...prev, taxRateOverride: value as number | null }))
    } else {
      setAssumptions((prev) => ({ ...prev, [key]: value }))
    }

    analytics.track('dcf_assumptions_modified', {
      assumptionChanged: key,
      previousValue: typeof prevValue === 'number' ? prevValue : 0,
      newValue: typeof value === 'number' ? value : 0,
    })
  }

  const handleGrowthRateChange = (year: string, value: number) => {
    const prevValue = assumptions.growthAssumptions[year] || 0

    setAssumptions((prev) => ({
      ...prev,
      growthAssumptions: { ...prev.growthAssumptions, [year]: value },
    }))

    analytics.track('dcf_assumptions_modified', {
      assumptionChanged: `growth_${year}`,
      previousValue: prevValue,
      newValue: value,
    })
  }

  const handleDcfToggleChange = (checked: boolean) => {
    setUseDCFValue(checked)

    analytics.track('dcf_toggle_changed', {
      useDcfValue: checked,
      dcfValue: dcfResults?.equityValue ?? null,
      impliedMultiple: ebitda > 0 && dcfResults
        ? dcfResults.enterpriseValue / ebitda
        : null,
    })
  }

  const handleMultipleOverrideChange = (low: number | null, high: number | null) => {
    setAssumptions((prev) => ({
      ...prev,
      ebitdaMultipleLowOverride: low,
      ebitdaMultipleHighOverride: high,
    }))
  }

  const effectiveEbitdaMultipleLow = assumptions.ebitdaMultipleLowOverride ?? industryData.ebitdaMultipleLow
  const effectiveEbitdaMultipleHigh = assumptions.ebitdaMultipleHighOverride ?? industryData.ebitdaMultipleHigh

  const dcfInputsForSensitivity: DCFInputs = useMemo(
    () => ({
      baseFCF,
      growthRates: [
        assumptions.growthAssumptions.year1 || 0,
        assumptions.growthAssumptions.year2 || 0,
        assumptions.growthAssumptions.year3 || 0,
        assumptions.growthAssumptions.year4 || 0,
        assumptions.growthAssumptions.year5 || 0,
      ],
      wacc: calculatedWACC,
      terminalMethod: assumptions.terminalMethod,
      perpetualGrowthRate: assumptions.perpetualGrowthRate,
      exitMultiple: assumptions.exitMultiple || undefined,
      netDebt,
      useMidYearConvention: assumptions.useMidYearConvention,
    }),
    [assumptions, baseFCF, calculatedWACC, netDebt]
  )

  // Suppress unused variable warning — toggle handler wired for future use
  void handleDcfToggleChange

  if (!selectedCompanyId) {
    return (
      <div className={styles.loading}>
        <div className="flex flex-col items-center gap-4">
          <Calculator className="h-8 w-8 text-muted-foreground" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Please select a company to view valuation</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  const waccPct = (calculatedWACC * 100).toFixed(1)
  const evDisplay = dcfResults ? (() => {
    const v = dcfResults.enterpriseValue
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
    return `$${Math.round(v)}`
  })() : '—'

  return (
    <>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/valuation" className={styles.breadcrumbLink}>Valuation</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span>DCF Analysis</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderFlex}>
          <div>
            <div className={styles.pageTitle}>DCF Analysis</div>
            <div className={styles.pageSubtitle}>Discounted Cash Flow Valuation &middot; 5-Year Projection</div>
          </div>
          <div className={styles.headerActions}>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" style={{ marginRight: '6px' }} />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" style={{ marginRight: '6px' }} />
                  Save Assumptions
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* DCF Hero */}
      <div className={styles.dcfHeroLayout}>
        <div className={styles.dcfHeroMain}>
          <div className={styles.dcfHeroLabel}>DCF Enterprise Value</div>
          <div className={styles.dcfHeroAmount}>{evDisplay}</div>
          {dcfResults && (
            <div className={styles.dcfHeroRange}>
              Equity Value: {(() => {
                const v = dcfResults.equityValue
                if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
                if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
                return `$${Math.round(v)}`
              })()} &middot; Net Debt: {(() => {
                if (netDebt >= 1_000_000) return `$${(netDebt / 1_000_000).toFixed(1)}M`
                if (netDebt >= 1_000) return `$${Math.round(netDebt / 1_000)}K`
                return `$${Math.round(netDebt)}`
              })()}
            </div>
          )}
          <div className={styles.dcfHeroStats}>
            <div className={styles.dcfStat}>
              <div className={styles.dcfStatLabel}>WACC</div>
              <div className={`${styles.dcfStatValue} ${styles.dcfStatBlueColor}`}>{waccPct}%</div>
            </div>
            <div className={styles.dcfStat}>
              <div className={styles.dcfStatLabel}>Growth Rate (Yr 1)</div>
              <div className={`${styles.dcfStatValue} ${styles.dcfStatGreenColor}`}>
                {((assumptions.growthAssumptions.year1 || 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div className={styles.dcfStat}>
              <div className={styles.dcfStatLabel}>Terminal Method</div>
              <div className={styles.dcfStatValue}>
                {assumptions.terminalMethod === 'gordon' ? 'Gordon Growth' : 'Exit Multiple'}
              </div>
            </div>
            {baseFCF > 0 && (
              <div className={styles.dcfStat}>
                <div className={styles.dcfStatLabel}>Base FCF</div>
                <div className={styles.dcfStatValue}>
                  {baseFCF >= 1_000_000
                    ? `$${(baseFCF / 1_000_000).toFixed(1)}M`
                    : baseFCF >= 1_000
                      ? `$${Math.round(baseFCF / 1_000)}K`
                      : `$${Math.round(baseFCF)}`}
                  {fcfIsEstimated && <span className={styles.dcfActiveMarker}>est.</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Method comparison sidebar */}
        <div className={styles.heroSidebarCard}>
          <div className={styles.methodCompareLabel}>All Valuation Methods</div>
          <div className={styles.methodBarRow}>
            <div className={styles.methodBarName}>Industry Multiples</div>
            <div className={styles.methodBarTrack}>
              <div className={styles.methodBarFillBlue} style={{ width: '75%' }} />
            </div>
            <div className={styles.methodBarValue}>—</div>
          </div>
          <div className={styles.methodBarRow}>
            <div className={styles.methodBarNameActive}>DCF Analysis</div>
            <div className={styles.methodBarTrack}>
              <div className={styles.methodBarFillPurple} style={{ width: dcfResults ? '82%' : '40%' }} />
            </div>
            <div className={styles.methodBarValue}>{evDisplay}</div>
            <span className={styles.activeBadge}>Active</span>
          </div>
          <div className={styles.methodBarRow}>
            <div className={styles.methodBarName}>Comparables</div>
            <div className={styles.methodBarTrack}>
              <div className={styles.methodBarFillTeal} style={{ width: '60%' }} />
            </div>
            <div className={styles.methodBarValue}>—</div>
          </div>
          <div className={styles.blendedSection}>
            <div className={styles.blendedLabel}>WACC Build-Up</div>
            <div className={styles.blendedAmount}>{waccPct}%</div>
            <div className={styles.blendedRange}>Weighted Average Cost of Capital</div>
          </div>
        </div>
      </div>

      {/* AI Coach Insight */}
      <Link href="/dashboard/coach" className={styles.aiInsightCard} style={{ textDecoration: 'none' }}>
        <div className={styles.aiInsightIconWrap}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </div>
        <div>
          <div className={styles.aiInsightCardTitle}>AI Coach &mdash; DCF Insight</div>
          <div className={styles.aiInsightCardText}>
            Your WACC of {waccPct}% includes a company-specific risk premium driven by owner dependence. Reducing this risk factor by improving your BRI score could lower your WACC and add significant value to the DCF result. Adjust your assumptions below and save to update your blended valuation.
          </div>
          <div className={styles.aiInsightActionRow}>
            <span className={styles.aiInsightActionLink}>Talk to AI Coach about your DCF &rarr;</span>
          </div>
        </div>
      </Link>

      {/* Interactive DCF Panels */}
      <div className={styles.dcfValGrid}>
        {/* Left Column: Market & Industry Data */}
        <div className={styles.dcfValCol}>
          <MarketDataPanel
            industryBetaLow={industryData.betaLow}
            industryBetaHigh={industryData.betaHigh}
            industryGrowthLow={industryData.growthLow}
            industryGrowthHigh={industryData.growthHigh}
            ebitdaMultipleLow={industryData.ebitdaMultipleLow}
            ebitdaMultipleHigh={industryData.ebitdaMultipleHigh}
            industrySource={industryData.source}
            ebitdaMultipleLowOverride={assumptions.ebitdaMultipleLowOverride}
            ebitdaMultipleHighOverride={assumptions.ebitdaMultipleHighOverride}
            onMultipleOverrideChange={handleMultipleOverrideChange}
            workingCapital={workingCapital}
          />
        </div>

        {/* Center Column: Inputs */}
        <div className={styles.dcfValCol}>
          <WACCCalculator
            inputs={waccInputs}
            onInputChange={handleWACCInputChange}
            calculatedWACC={calculatedWACC}
            ebitdaTier={assumptions.ebitdaTier}
          />

          <GrowthAssumptions
            baseFCF={baseFCF}
            growthRates={assumptions.growthAssumptions}
            onGrowthRateChange={handleGrowthRateChange}
            onBaseFCFChange={setBaseFCF}
            fcfIsEstimated={fcfIsEstimated}
          />

          <TerminalValuePanel
            terminalMethod={assumptions.terminalMethod}
            perpetualGrowthRate={assumptions.perpetualGrowthRate}
            exitMultiple={assumptions.exitMultiple}
            onMethodChange={(method) =>
              setAssumptions((prev) => ({ ...prev, terminalMethod: method }))
            }
            onPerpetualGrowthChange={(value) =>
              setAssumptions((prev) => ({ ...prev, perpetualGrowthRate: value }))
            }
            onExitMultipleChange={(value) =>
              setAssumptions((prev) => ({ ...prev, exitMultiple: value }))
            }
            industryMultipleLow={effectiveEbitdaMultipleLow}
            industryMultipleHigh={effectiveEbitdaMultipleHigh}
          />
        </div>

        {/* Right Column: Results */}
        <div className={styles.dcfValCol}>
          <ValuationResults
            results={dcfResults}
            wacc={calculatedWACC}
            netDebt={netDebt}
            isLoading={false}
            workingCapital={workingCapital}
          />

          {baseFCF > 0 && (
            <SensitivityTable
              baseInputs={dcfInputsForSensitivity}
              centerWACC={calculatedWACC}
              centerTerminalGrowth={assumptions.perpetualGrowthRate}
              finalEBITDA={ebitda}
            />
          )}
        </div>
      </div>
    </>
  )
}
