'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import {
  MarketDataPanel,
  WACCCalculator,
  GrowthAssumptions,
  TerminalValuePanel,
  ValuationResults,
  MonteCarloPanel,
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
  costOfDebtOverride: number | null
  taxRateOverride: number | null
  terminalMethod: 'gordon' | 'exit_multiple'
  perpetualGrowthRate: number
  exitMultiple: number | null
  growthAssumptions: Record<string, number>
}

const DEFAULT_ASSUMPTIONS: DCFAssumptions = {
  riskFreeRate: 0.0425, // 4.25% - Jan 2026 10Y Treasury
  marketRiskPremium: 0.055, // 5.5%
  beta: 1.0,
  sizeRiskPremium: 0.02, // 2%
  costOfDebtOverride: null,
  taxRateOverride: null,
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
}

export default function ValuationPage() {
  const { selectedCompanyId } = useCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assumptions, setAssumptions] = useState<DCFAssumptions>(DEFAULT_ASSUMPTIONS)
  const [baseFCF, setBaseFCF] = useState(500000) // Default $500K FCF
  const [netDebt, setNetDebt] = useState(0)
  const [ebitda, setEbitda] = useState(600000) // Default $600K EBITDA
  const [hasChanges, setHasChanges] = useState(false)
  const [originalAssumptions, setOriginalAssumptions] = useState<DCFAssumptions | null>(null)

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
            costOfDebtOverride: data.assumptions.costOfDebtOverride
              ? Number(data.assumptions.costOfDebtOverride)
              : null,
            taxRateOverride: data.assumptions.taxRateOverride
              ? Number(data.assumptions.taxRateOverride)
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
          }
          setAssumptions(loadedAssumptions)
          setOriginalAssumptions(loadedAssumptions)
        }

        // Try to get financial data for base FCF and EBITDA
        if (data.financials) {
          if (data.financials.freeCashFlow) {
            setBaseFCF(Number(data.financials.freeCashFlow))
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

  // Track changes
  useEffect(() => {
    if (originalAssumptions) {
      const changed = JSON.stringify(assumptions) !== JSON.stringify(originalAssumptions)
      setHasChanges(changed)
    }
  }, [assumptions, originalAssumptions])

  // Save assumptions
  const handleSave = async () => {
    if (!selectedCompanyId) return

    setSaving(true)
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/dcf`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assumptions),
      })

      if (response.ok) {
        setOriginalAssumptions(assumptions)
        setHasChanges(false)
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
      assumptions.sizeRiskPremium
    )

    // For small businesses, often 100% equity financed or minimal debt
    // Use simple cost of equity as WACC for simplicity
    // In a more complete implementation, we'd calculate proper debt/equity weights
    const costOfDebt = assumptions.costOfDebtOverride || 0.06 // 6% default
    const taxRate = assumptions.taxRateOverride || 0.25 // 25% default

    // Assume 80% equity, 20% debt for small business
    const equityWeight = 0.8
    const debtWeight = 0.2

    return equityWeight * costOfEquity + debtWeight * costOfDebt * (1 - taxRate)
  }, [assumptions])

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
    costOfDebt: assumptions.costOfDebtOverride,
    taxRate: assumptions.taxRateOverride,
  }

  // Handle WACC input changes
  const handleWACCInputChange = <K extends keyof WACCInputs>(key: K, value: WACCInputs[K]) => {
    if (key === 'costOfDebt') {
      setAssumptions((prev) => ({ ...prev, costOfDebtOverride: value as number | null }))
    } else if (key === 'taxRate') {
      setAssumptions((prev) => ({ ...prev, taxRateOverride: value as number | null }))
    } else {
      setAssumptions((prev) => ({ ...prev, [key]: value }))
    }
  }

  // Handle growth rate changes
  const handleGrowthRateChange = (year: string, value: number) => {
    setAssumptions((prev) => ({
      ...prev,
      growthAssumptions: { ...prev.growthAssumptions, [year]: value },
    }))
  }

  // DCF inputs for Monte Carlo
  const dcfInputsForMonteCarlo: DCFInputs = useMemo(
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
    }),
    [assumptions, baseFCF, calculatedWACC, netDebt]
  )

  if (!selectedCompanyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Please select a company to view valuation</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DCF Valuation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Interactive discounted cash flow analysis with Monte Carlo simulation
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Market & Industry Data */}
        <div className="lg:col-span-3 space-y-4">
          <MarketDataPanel
            industryBetaLow={industryData.betaLow}
            industryBetaHigh={industryData.betaHigh}
            industryGrowthLow={industryData.growthLow}
            industryGrowthHigh={industryData.growthHigh}
            ebitdaMultipleLow={industryData.ebitdaMultipleLow}
            ebitdaMultipleHigh={industryData.ebitdaMultipleHigh}
            industrySource={industryData.source}
          />
        </div>

        {/* Center Column: Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <WACCCalculator
            inputs={waccInputs}
            onInputChange={handleWACCInputChange}
            calculatedWACC={calculatedWACC}
          />

          <GrowthAssumptions
            baseFCF={baseFCF}
            growthRates={assumptions.growthAssumptions}
            onGrowthRateChange={handleGrowthRateChange}
            onBaseFCFChange={setBaseFCF}
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
            industryMultipleLow={industryData.ebitdaMultipleLow}
            industryMultipleHigh={industryData.ebitdaMultipleHigh}
          />
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-4 space-y-4">
          <ValuationResults
            results={dcfResults}
            wacc={calculatedWACC}
            netDebt={netDebt}
            isLoading={false}
          />

          <SensitivityTable
            baseInputs={dcfInputsForMonteCarlo}
            centerWACC={calculatedWACC}
            centerTerminalGrowth={assumptions.perpetualGrowthRate}
            finalEBITDA={ebitda}
          />

          <MonteCarloPanel baseInputs={dcfInputsForMonteCarlo} finalEBITDA={ebitda} />
        </div>
      </div>
    </div>
  )
}
