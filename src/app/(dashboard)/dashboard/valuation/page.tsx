'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save, Calculator, Info } from 'lucide-react'
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
  const [useDCFValue, setUseDCFValue] = useState(false) // Toggle to use DCF value for scorecard/PFS/loans
  const [workingCapital, setWorkingCapital] = useState<{ t12: number | null; lastFY: number | null; threeYearAvg: number | null } | null>(null)
  const [fcfIsEstimated, setFcfIsEstimated] = useState(false)
  const [originalUseDCFValue, setOriginalUseDCFValue] = useState(false)
  const [debtWeight, setDebtWeight] = useState(0.20)
  const [equityWeight, setEquityWeight] = useState(0.80)

  // Analytics tracking
  const hasTrackedPageView = useRef(false)
  const _previousAssumptions = useRef<DCFAssumptions | null>(null)

  // Industry data (could be fetched from API based on company)
  const [industryData, setIndustryData] = useState({
    betaLow: 0.8,
    betaHigh: 1.2,
    growthLow: 0.02,
    growthHigh: 0.05,
    ebitdaMultipleLow: 4.0,
    ebitdaMultipleHigh: 8.0,
    source: 'Default industry benchmarks',
  })

  // Fetch existing assumptions
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

          // Set debt/equity weights from override or keep defaults
          if (data.assumptions.debtWeightOverride) {
            setDebtWeight(Number(data.assumptions.debtWeightOverride))
            setEquityWeight(1 - Number(data.assumptions.debtWeightOverride))
          }

          // Load useDCFValue toggle
          const dcfToggle = data.assumptions.useDCFValue ?? false
          setUseDCFValue(dcfToggle)
          setOriginalUseDCFValue(dcfToggle)
        } else {
          // No saved assumptions - use calibrated defaults from WACC engine
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

        // Set working capital data
        if (data.workingCapital) {
          setWorkingCapital(data.workingCapital)
        }

        // Try to get financial data for base FCF and EBITDA
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

        // Try to get industry multiples
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

  // Track page view
  useEffect(() => {
    if (hasTrackedPageView.current || loading) return

    hasTrackedPageView.current = true
    analytics.track('dcf_page_viewed', {
      hasFinancials: baseFCF > 0 && ebitda > 0,
    })
  }, [loading, baseFCF, ebitda])

  // Track changes
  useEffect(() => {
    if (originalAssumptions) {
      const assumptionsChanged = JSON.stringify(assumptions) !== JSON.stringify(originalAssumptions)
      const toggleChanged = useDCFValue !== originalUseDCFValue
      setHasChanges(assumptionsChanged || toggleChanged)
    }
  }, [assumptions, originalAssumptions, useDCFValue, originalUseDCFValue])

  // Save assumptions
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

        // Track DCF result viewed/saved
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

  // Calculate WACC
  const calculatedWACC = useMemo(() => {
    const costOfEquity = calculateCostOfEquity(
      assumptions.riskFreeRate,
      assumptions.marketRiskPremium,
      assumptions.beta,
      assumptions.sizeRiskPremium,
      assumptions.companySpecificRisk
    )

    const costOfDebt = assumptions.costOfDebtOverride || 0.10 // 10% default (calibrated)
    const taxRate = assumptions.taxRateOverride || 0.25 // 25% default

    return equityWeight * costOfEquity + debtWeight * costOfDebt * (1 - taxRate)
  }, [assumptions, debtWeight, equityWeight])

  // Calculate DCF results
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

  // WACC inputs for the calculator component
  const waccInputs: WACCInputs = {
    riskFreeRate: assumptions.riskFreeRate,
    marketRiskPremium: assumptions.marketRiskPremium,
    beta: assumptions.beta,
    sizeRiskPremium: assumptions.sizeRiskPremium,
    companySpecificRisk: assumptions.companySpecificRisk,
    costOfDebt: assumptions.costOfDebtOverride,
    taxRate: assumptions.taxRateOverride,
  }

  // Handle WACC input changes
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

    // Track assumption change
    analytics.track('dcf_assumptions_modified', {
      assumptionChanged: key,
      previousValue: typeof prevValue === 'number' ? prevValue : 0,
      newValue: typeof value === 'number' ? value : 0,
    })
  }

  // Handle growth rate changes
  const handleGrowthRateChange = (year: string, value: number) => {
    const prevValue = assumptions.growthAssumptions[year] || 0

    setAssumptions((prev) => ({
      ...prev,
      growthAssumptions: { ...prev.growthAssumptions, [year]: value },
    }))

    // Track assumption change
    analytics.track('dcf_assumptions_modified', {
      assumptionChanged: `growth_${year}`,
      previousValue: prevValue,
      newValue: value,
    })
  }

  // Handle DCF toggle change
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

  // Handle EBITDA multiple override changes
  const handleMultipleOverrideChange = (low: number | null, high: number | null) => {
    setAssumptions((prev) => ({
      ...prev,
      ebitdaMultipleLowOverride: low,
      ebitdaMultipleHighOverride: high,
    }))
  }

  // Calculate effective EBITDA multiples (override or industry default)
  const effectiveEbitdaMultipleLow = assumptions.ebitdaMultipleLowOverride ?? industryData.ebitdaMultipleLow
  const effectiveEbitdaMultipleHigh = assumptions.ebitdaMultipleHighOverride ?? industryData.ebitdaMultipleHigh

  // DCF inputs for sensitivity table
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

  if (!selectedCompanyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <Calculator className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Please select a company to view valuation</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Running valuation analysis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">DCF Valuation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Interactive discounted cash flow analysis with sensitivity tables
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges} className="shadow-lg shadow-primary/20">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Assumptions
            </>
          )}
        </Button>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        {/* Left Column: Market & Industry Data */}
        <div className="md:col-span-1 lg:col-span-3 space-y-4">
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
        <div className="md:col-span-1 lg:col-span-5 space-y-4">
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
        <div className="md:col-span-2 lg:col-span-4 space-y-4">
          <ValuationResults
            results={dcfResults}
            wacc={calculatedWACC}
            netDebt={netDebt}
            isLoading={false}
            workingCapital={workingCapital}
          />

          {/* Use DCF Value Toggle */}
          <Card className={useDCFValue ? 'border-primary/50 bg-primary/5' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Use DCF for Valuation</CardTitle>
                <Switch
                  checked={useDCFValue}
                  onCheckedChange={handleDcfToggleChange}
                  disabled={!dcfResults}
                />
              </div>
              <CardDescription>
                {useDCFValue
                  ? 'DCF enterprise value is being used across the platform'
                  : 'Using EBITDA multiple-based valuation (default)'}
              </CardDescription>
            </CardHeader>
            {useDCFValue && dcfResults && (
              <CardContent className="pt-0">
                <div className="p-3 bg-primary/10 rounded-lg space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">This DCF value will be used for:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Dashboard Scorecard company value</li>
                        <li>Personal Financial Statement business assets</li>
                        <li>Retirement Calculator business value</li>
                        <li>Business Loan collateral calculations</li>
                      </ul>
                    </div>
                  </div>
                  <div className="text-sm pt-2 border-t border-primary/20">
                    <span className="text-muted-foreground">Implied EBITDA Multiple: </span>
                    <span className="font-semibold text-foreground">
                      {ebitda > 0 ? `${(dcfResults.enterpriseValue / ebitda).toFixed(1)}x` : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

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
    </div>
  )
}
