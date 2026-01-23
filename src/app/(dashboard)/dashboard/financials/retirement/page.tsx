'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Tax treatment types
type TaxTreatment =
  | 'tax_free'        // Roth accounts - no tax on withdrawal
  | 'tax_deferred'    // Traditional 401k/IRA - taxed as ordinary income
  | 'capital_gains'   // Business sale, stocks, real estate - capital gains tax
  | 'already_taxed'   // Cash, savings - no additional tax

interface RetirementAsset {
  id: string
  name: string
  category: string
  currentValue: number
  taxTreatment: TaxTreatment
  costBasis?: number // For capital gains calculation
}

interface RetirementAssumptions {
  currentAge: number
  retirementAge: number
  lifeExpectancy: number
  annualSpendingNeeds: number // After-tax annual spending in retirement
  inflationRate: number
  growthRate: number
  federalTaxRate: number
  stateCode: string // US state code or 'OTHER' for outside USA
  stateTaxRate: number
  localTaxRate: number // City/county tax rate (user enters manually)
  capitalGainsTaxRate: number
  socialSecurityMonthly: number
  otherIncomeMonthly: number
}

// 2026 State Income Tax Rates (top marginal rates)
// Source: Tax Foundation, Paycor, Tax-Rates.org
const US_STATE_TAX_RATES: { code: string; name: string; rate: number }[] = [
  { code: 'AL', name: 'Alabama', rate: 0.05 },
  { code: 'AK', name: 'Alaska', rate: 0 },
  { code: 'AZ', name: 'Arizona', rate: 0.025 },
  { code: 'AR', name: 'Arkansas', rate: 0.039 },
  { code: 'CA', name: 'California', rate: 0.133 },
  { code: 'CO', name: 'Colorado', rate: 0.044 },
  { code: 'CT', name: 'Connecticut', rate: 0.0699 },
  { code: 'DE', name: 'Delaware', rate: 0.066 },
  { code: 'FL', name: 'Florida', rate: 0 },
  { code: 'GA', name: 'Georgia', rate: 0.0519 },
  { code: 'HI', name: 'Hawaii', rate: 0.11 },
  { code: 'ID', name: 'Idaho', rate: 0.058 },
  { code: 'IL', name: 'Illinois', rate: 0.0495 },
  { code: 'IN', name: 'Indiana', rate: 0.0305 },
  { code: 'IA', name: 'Iowa', rate: 0.0385 },
  { code: 'KS', name: 'Kansas', rate: 0.057 },
  { code: 'KY', name: 'Kentucky', rate: 0.04 },
  { code: 'LA', name: 'Louisiana', rate: 0.0425 },
  { code: 'ME', name: 'Maine', rate: 0.0715 },
  { code: 'MD', name: 'Maryland', rate: 0.0575 },
  { code: 'MA', name: 'Massachusetts', rate: 0.09 },
  { code: 'MI', name: 'Michigan', rate: 0.0425 },
  { code: 'MN', name: 'Minnesota', rate: 0.0985 },
  { code: 'MS', name: 'Mississippi', rate: 0.05 },
  { code: 'MO', name: 'Missouri', rate: 0.0495 },
  { code: 'MT', name: 'Montana', rate: 0.059 },
  { code: 'NE', name: 'Nebraska', rate: 0.0584 },
  { code: 'NV', name: 'Nevada', rate: 0 },
  { code: 'NH', name: 'New Hampshire', rate: 0 }, // No income tax (interest/dividends tax ended 2025)
  { code: 'NJ', name: 'New Jersey', rate: 0.1075 },
  { code: 'NM', name: 'New Mexico', rate: 0.059 },
  { code: 'NY', name: 'New York', rate: 0.109 },
  { code: 'NC', name: 'North Carolina', rate: 0.045 },
  { code: 'ND', name: 'North Dakota', rate: 0.0225 },
  { code: 'OH', name: 'Ohio', rate: 0.035 },
  { code: 'OK', name: 'Oklahoma', rate: 0.0475 },
  { code: 'OR', name: 'Oregon', rate: 0.099 },
  { code: 'PA', name: 'Pennsylvania', rate: 0.0307 },
  { code: 'RI', name: 'Rhode Island', rate: 0.0599 },
  { code: 'SC', name: 'South Carolina', rate: 0.064 },
  { code: 'SD', name: 'South Dakota', rate: 0 },
  { code: 'TN', name: 'Tennessee', rate: 0 },
  { code: 'TX', name: 'Texas', rate: 0 },
  { code: 'UT', name: 'Utah', rate: 0.0465 },
  { code: 'VT', name: 'Vermont', rate: 0.0875 },
  { code: 'VA', name: 'Virginia', rate: 0.0575 },
  { code: 'WA', name: 'Washington', rate: 0 }, // No income tax (has capital gains tax)
  { code: 'WV', name: 'West Virginia', rate: 0.055 },
  { code: 'WI', name: 'Wisconsin', rate: 0.0765 },
  { code: 'WY', name: 'Wyoming', rate: 0 },
  { code: 'DC', name: 'Washington D.C.', rate: 0.1075 },
  { code: 'OTHER', name: 'Outside USA / Manual Entry', rate: 0.05 },
]

const TAX_TREATMENTS: { value: TaxTreatment; label: string; description: string }[] = [
  { value: 'tax_free', label: 'Tax-Free', description: 'Roth 401k, Roth IRA, HSA (qualified)' },
  { value: 'tax_deferred', label: 'Tax-Deferred', description: 'Traditional 401k, Traditional IRA, 403b' },
  { value: 'capital_gains', label: 'Capital Gains', description: 'Business sale, stocks, real estate' },
  { value: 'already_taxed', label: 'Already Taxed', description: 'Cash, savings, taxable accounts (basis)' },
]

const GROWTH_PRESETS = [
  { label: 'Conservative (3%)', value: 0.03, description: 'Bonds, CDs, money market' },
  { label: 'Moderate (5%)', value: 0.05, description: 'Balanced portfolio' },
  { label: 'Aggressive (7%)', value: 0.07, description: 'Stock-heavy portfolio' },
  { label: 'Custom', value: -1, description: 'Enter your own rate' },
]

const DEFAULT_ASSUMPTIONS: RetirementAssumptions = {
  currentAge: 50,
  retirementAge: 65,
  lifeExpectancy: 90,
  annualSpendingNeeds: 100000,
  inflationRate: 0.03,
  growthRate: 0.05,
  federalTaxRate: 0.22,
  stateCode: 'CA', // Default to California
  stateTaxRate: 0.133,
  localTaxRate: 0,
  capitalGainsTaxRate: 0.15,
  socialSecurityMonthly: 2000,
  otherIncomeMonthly: 0,
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatInputValue(value: number): string {
  if (value === 0) return ''
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

function parseInputValue(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return Math.round(parseFloat(cleaned) || 0)
}

// Format percentage for display (without auto-conversion that breaks typing)
function formatPercentInput(value: number): string {
  const percent = value * 100
  // Avoid showing unnecessary decimals
  if (percent === 0) return ''
  if (Number.isInteger(percent)) return percent.toString()
  return percent.toFixed(1)
}

export default function RetirementCalculatorPage() {
  const [assets, setAssets] = useState<RetirementAsset[]>([])
  const [assumptions, setAssumptions] = useState<RetirementAssumptions>(DEFAULT_ASSUMPTIONS)
  const [customGrowthRate, setCustomGrowthRate] = useState(false)
  const [showAdvancedTax, setShowAdvancedTax] = useState(false)
  const [pfsImported, setPfsImported] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load saved assumptions on mount
  useEffect(() => {
    const savedAssumptions = localStorage.getItem('retirement_assumptions')
    if (savedAssumptions) {
      setAssumptions(JSON.parse(savedAssumptions))
    }
  }, [])

  // Save data when it changes
  useEffect(() => {
    localStorage.setItem('retirement_assets', JSON.stringify(assets))
    localStorage.setItem('retirement_assumptions', JSON.stringify(assumptions))
  }, [assets, assumptions])

  const importFromPFS = useCallback(async () => {
    try {
      // Load business assets from API
      const response = await fetch('/api/companies')
      let businessAssets: RetirementAsset[] = []

      if (response.ok) {
        const data = await response.json()
        const savedOwnership = localStorage.getItem('pfs_businessOwnership')
        const ownership = savedOwnership ? JSON.parse(savedOwnership) : {}

        // Fetch current calculated value from dashboard API for each company
        // This ensures Retirement Calculator shows the same value as the Scorecard
        businessAssets = await Promise.all(
          (data.companies || []).map(async (company: { id: string; name: string; valuationSnapshots?: { currentValue: string | number }[] }) => {
            let marketValue = 0

            // Get the live calculated value from dashboard API
            try {
              const dashboardRes = await fetch(`/api/companies/${company.id}/dashboard`)
              if (dashboardRes.ok) {
                const dashboardData = await dashboardRes.json()
                marketValue = dashboardData.tier1?.currentValue || 0
              }
            } catch {
              // Fallback to snapshot value if dashboard fails
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
              costBasis: 0, // User should update this
            }
          })
        )
      }

      // Load personal assets from localStorage
      const savedPersonalAssets = localStorage.getItem('pfs_personalAssets')
      let personalAssets: RetirementAsset[] = []

      if (savedPersonalAssets) {
        const pfsAssets = JSON.parse(savedPersonalAssets)
        personalAssets = pfsAssets.map((asset: { id: string; category: string; description: string; value: number }) => {
          // Determine default tax treatment based on category
          let taxTreatment: TaxTreatment = 'already_taxed'
          if (asset.category === 'Retirement Accounts') {
            taxTreatment = 'tax_deferred' // Default to traditional, user can change to Roth
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
            costBasis: asset.category === 'Real Estate' ? asset.value * 0.5 : 0, // Rough estimate
          }
        })
      }

      // Load liabilities to subtract from net worth
      const savedLiabilities = localStorage.getItem('pfs_personalLiabilities')
      let totalLiabilities = 0
      if (savedLiabilities) {
        const liabilities = JSON.parse(savedLiabilities)
        totalLiabilities = liabilities.reduce((sum: number, l: { amount: number }) => sum + l.amount, 0)
      }

      // Combine all assets
      const allAssets = [...businessAssets, ...personalAssets]

      // Add a "liability offset" entry if there are liabilities
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
      setPfsImported(true)
    } catch (error) {
      console.error('Failed to import PFS data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto-load PFS data on mount
  useEffect(() => {
    importFromPFS()
  }, [importFromPFS])

  function updateAsset(id: string, field: keyof RetirementAsset, value: string | number | TaxTreatment) {
    setAssets(prev => prev.map(asset =>
      asset.id === id ? { ...asset, [field]: value } : asset
    ))
  }

  function addManualAsset() {
    setAssets(prev => [...prev, {
      id: `manual-${Date.now()}`,
      name: '',
      category: 'Other',
      currentValue: 0,
      taxTreatment: 'already_taxed',
    }])
  }

  function removeAsset(id: string) {
    setAssets(prev => prev.filter(a => a.id !== id))
  }

  function updateAssumption<K extends keyof RetirementAssumptions>(key: K, value: RetirementAssumptions[K]) {
    setAssumptions(prev => ({ ...prev, [key]: value }))
  }

  // Calculate after-tax value of an asset
  // Handle state selection and auto-update rate
  function handleStateChange(stateCode: string) {
    const stateData = US_STATE_TAX_RATES.find(s => s.code === stateCode)
    if (stateData) {
      setAssumptions(prev => ({
        ...prev,
        stateCode,
        stateTaxRate: stateData.rate,
      }))
    }
  }

  function calculateAfterTaxValue(asset: RetirementAsset): number {
    const { currentValue, taxTreatment, costBasis = 0 } = asset
    const { federalTaxRate, stateTaxRate, localTaxRate, capitalGainsTaxRate } = assumptions
    const totalIncomeTaxRate = federalTaxRate + stateTaxRate + localTaxRate

    switch (taxTreatment) {
      case 'tax_free':
        return currentValue
      case 'tax_deferred':
        return currentValue * (1 - totalIncomeTaxRate)
      case 'capital_gains':
        const gain = currentValue - costBasis
        const tax = gain > 0 ? gain * capitalGainsTaxRate : 0
        return currentValue - tax
      case 'already_taxed':
      default:
        return currentValue
    }
  }

  // Calculate projections
  function calculateProjections() {
    const {
      currentAge,
      retirementAge,
      lifeExpectancy,
      annualSpendingNeeds,
      inflationRate,
      growthRate,
      socialSecurityMonthly,
      otherIncomeMonthly,
    } = assumptions

    const yearsToRetirement = Math.max(0, retirementAge - currentAge)
    const yearsInRetirement = Math.max(0, lifeExpectancy - retirementAge)

    // Calculate total after-tax value today
    const totalAfterTaxToday = assets.reduce((sum, asset) => sum + calculateAfterTaxValue(asset), 0)

    // Project value at retirement (with growth)
    const valueAtRetirement = totalAfterTaxToday * Math.pow(1 + growthRate, yearsToRetirement)

    // Calculate inflation-adjusted annual spending at retirement
    const spendingAtRetirement = annualSpendingNeeds * Math.pow(1 + inflationRate, yearsToRetirement)

    // Annual income from Social Security and other sources
    const annualOtherIncome = (socialSecurityMonthly + otherIncomeMonthly) * 12

    // Net annual withdrawal needed from portfolio (what you need beyond other income)
    const annualWithdrawalNeeded = Math.max(0, spendingAtRetirement - annualOtherIncome)

    // Calculate how long money will last using withdrawal simulation
    // Accounts for continued growth and inflation during retirement
    let portfolioValue = valueAtRetirement
    let yearsMoneyLasts = 0
    let annualSpending = spendingAtRetirement
    const annualIncome = annualOtherIncome

    while (portfolioValue > 0 && yearsMoneyLasts < yearsInRetirement + 50) {
      const withdrawal = Math.max(0, annualSpending - annualIncome)
      portfolioValue = portfolioValue * (1 + growthRate) - withdrawal
      annualSpending *= (1 + inflationRate)
      yearsMoneyLasts++
    }

    // Calculate required nest egg for desired retirement
    // Using present value of annuity formula, adjusted for growth and inflation
    const realReturnRate = (1 + growthRate) / (1 + inflationRate) - 1
    let requiredNestEgg = 0

    if (realReturnRate > 0) {
      // PV of growing annuity
      const pvFactor = (1 - Math.pow((1 + inflationRate) / (1 + growthRate), yearsInRetirement)) /
                       (growthRate - inflationRate)
      requiredNestEgg = annualWithdrawalNeeded * pvFactor
    } else {
      // Simple calculation if returns don't beat inflation
      requiredNestEgg = annualWithdrawalNeeded * yearsInRetirement
    }

    // Gap analysis
    const surplusOrShortfall = valueAtRetirement - requiredNestEgg

    // What you need TODAY to close the gap
    const additionalNeededToday = surplusOrShortfall < 0
      ? Math.abs(surplusOrShortfall) / Math.pow(1 + growthRate, yearsToRetirement)
      : 0

    // Safe withdrawal rate (4% rule baseline)
    const safeWithdrawalAmount = valueAtRetirement * 0.04
    const sustainableSpendingLevel = safeWithdrawalAmount + annualOtherIncome

    return {
      totalAfterTaxToday,
      valueAtRetirement,
      spendingAtRetirement,
      annualOtherIncome,
      annualWithdrawalNeeded,
      yearsMoneyLasts: Math.min(yearsMoneyLasts, yearsInRetirement + 50),
      yearsInRetirement,
      requiredNestEgg,
      surplusOrShortfall,
      additionalNeededToday,
      safeWithdrawalAmount,
      sustainableSpendingLevel,
      yearsToRetirement,
    }
  }

  const projections = calculateProjections()
  const isOnTrack = projections.surplusOrShortfall >= 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retirement Calculator</h1>
          <p className="text-gray-600">
            Analyze if you have enough to retire comfortably based on your Personal Financial Statement
          </p>
        </div>
        <Link href="/dashboard/financials/personal">
          <Button variant="outline" size="sm">View PFS</Button>
        </Link>
      </div>

      {/* Assets Section - always shown since we preload from PFS */}
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Assets</CardTitle>
              <CardDescription>
                Review your assets and set the appropriate tax treatment for each
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={importFromPFS} variant="outline" size="sm">
                Refresh from PFS
              </Button>
              <Button onClick={addManualAsset} variant="outline" size="sm">
                + Add Asset
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                assets.map(asset => {
                  const afterTaxValue = calculateAfterTaxValue(asset)
                  const showCostBasis = asset.taxTreatment === 'capital_gains'

                  return (
                    <div key={asset.id} className="grid grid-cols-12 gap-3 items-start py-2 border-b border-gray-100">
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
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatInputValue(asset.currentValue)}
                            onChange={(e) => updateAsset(asset.id, 'currentValue', parseInputValue(e.target.value))}
                            className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <select
                          value={asset.taxTreatment}
                          onChange={(e) => updateAsset(asset.id, 'taxTreatment', e.target.value as TaxTreatment)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {TAX_TREATMENTS.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        {showCostBasis ? (
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatInputValue(asset.costBasis || 0)}
                              onChange={(e) => updateAsset(asset.id, 'costBasis', parseInputValue(e.target.value))}
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
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

            {/* Tax Treatment Legend */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-gray-500 mb-2">Tax Treatment Guide:</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                {TAX_TREATMENTS.map(t => (
                  <div key={t.value}>
                    <span className="font-medium">{t.label}:</span> {t.description}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Assumptions Section */}
      <Card>
        <CardHeader>
          <CardTitle>Retirement Assumptions</CardTitle>
          <CardDescription>
            Configure your retirement timeline, spending needs, and growth expectations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timeline */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Timeline</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Current Age</label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={assumptions.currentAge}
                  onChange={(e) => updateAssumption('currentAge', Math.min(999, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Retirement Age</label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={assumptions.retirementAge}
                  onChange={(e) => updateAssumption('retirementAge', Math.min(999, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Life Expectancy</label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={assumptions.lifeExpectancy}
                  onChange={(e) => updateAssumption('lifeExpectancy', Math.min(999, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {projections.yearsToRetirement} years to retirement, {projections.yearsInRetirement} years in retirement
            </p>
          </div>

          {/* Spending */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Spending Needs</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Annual Spending in Retirement (today&apos;s dollars)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatInputValue(assumptions.annualSpendingNeeds)}
                    onChange={(e) => updateAssumption('annualSpendingNeeds', parseInputValue(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Inflation Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={(assumptions.inflationRate * 100).toFixed(1)}
                    onChange={(e) => updateAssumption('inflationRate', Number(e.target.value) / 100)}
                    className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">%</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              At retirement, you&apos;ll need approximately {formatCurrency(projections.spendingAtRetirement)}/year (inflation-adjusted)
            </p>
          </div>

          {/* Other Income */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Other Retirement Income</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Social Security (monthly)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatInputValue(assumptions.socialSecurityMonthly)}
                    onChange={(e) => updateAssumption('socialSecurityMonthly', parseInputValue(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Other Income (monthly) - pension, rental, etc.</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatInputValue(assumptions.otherIncomeMonthly)}
                    onChange={(e) => updateAssumption('otherIncomeMonthly', parseInputValue(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Total other income: {formatCurrency(projections.annualOtherIncome)}/year
            </p>
          </div>

          {/* Growth Rate */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Investment Growth Rate</h4>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {GROWTH_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    if (preset.value === -1) {
                      setCustomGrowthRate(true)
                    } else {
                      setCustomGrowthRate(false)
                      updateAssumption('growthRate', preset.value)
                    }
                  }}
                  className={`p-2 text-sm border rounded-md transition-colors ${
                    !customGrowthRate && assumptions.growthRate === preset.value
                      ? 'border-[#B87333] bg-orange-50 text-gray-900'
                      : customGrowthRate && preset.value === -1
                      ? 'border-[#B87333] bg-orange-50 text-gray-900'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-xs text-gray-500">{preset.description}</div>
                </button>
              ))}
            </div>
            {customGrowthRate && (
              <div className="w-48">
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={(assumptions.growthRate * 100).toFixed(1)}
                    onChange={(e) => updateAssumption('growthRate', Number(e.target.value) / 100)}
                    className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">%</span>
                </div>
              </div>
            )}
          </div>

          {/* Tax Settings */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Tax Location & Rates</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">State / Location</label>
                <select
                  value={assumptions.stateCode}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {US_STATE_TAX_RATES.map(state => (
                    <option key={state.code} value={state.code}>
                      {state.name} {state.rate > 0 ? `(${(state.rate * 100).toFixed(1)}%)` : '(No state tax)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Local Tax Rate (city/county)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatPercentInput(assumptions.localTaxRate)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '')
                      updateAssumption('localTaxRate', (parseFloat(val) || 0) / 100)
                    }}
                    placeholder="0"
                    className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">NYC ~3.9%, some PA cities have local tax</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Combined income tax rate: <span className="font-medium">{((assumptions.federalTaxRate + assumptions.stateTaxRate + assumptions.localTaxRate) * 100).toFixed(1)}%</span>
              <span className="text-gray-400 ml-2">(Federal {(assumptions.federalTaxRate * 100).toFixed(0)}% + State {(assumptions.stateTaxRate * 100).toFixed(1)}% + Local {(assumptions.localTaxRate * 100).toFixed(1)}%)</span>
            </p>

            <button
              onClick={() => setShowAdvancedTax(!showAdvancedTax)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <svg className={`w-4 h-4 transition-transform ${showAdvancedTax ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Override Tax Rates
            </button>
            {showAdvancedTax && (
              <div className="mt-3 grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Federal Tax Rate</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={(assumptions.federalTaxRate * 100).toFixed(0)}
                      onChange={(e) => updateAssumption('federalTaxRate', Number(e.target.value) / 100)}
                      className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">State Tax Rate</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={(assumptions.stateTaxRate * 100).toFixed(1)}
                      onChange={(e) => updateAssumption('stateTaxRate', Number(e.target.value) / 100)}
                      className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Override the state dropdown rate</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Capital Gains Rate</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={(assumptions.capitalGainsTaxRate * 100).toFixed(0)}
                      onChange={(e) => updateAssumption('capitalGainsTaxRate', Number(e.target.value) / 100)}
                      className="w-full pr-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {assets.length > 0 && (
        <Card className={isOnTrack ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isOnTrack ? (
                <>
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-700">You&apos;re On Track</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-amber-700">Gap to Close</span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              Based on your assets and assumptions, here&apos;s your retirement outlook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-sm text-gray-500">After-Tax Value Today</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(projections.totalAfterTaxToday)}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-sm text-gray-500">Projected at Retirement</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(projections.valueAtRetirement)}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-sm text-gray-500">Required Nest Egg</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(projections.requiredNestEgg)}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-sm text-gray-500">{isOnTrack ? 'Surplus' : 'Shortfall'}</p>
                <p className={`text-xl font-bold ${isOnTrack ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnTrack ? '+' : ''}{formatCurrency(projections.surplusOrShortfall)}
                </p>
              </div>
            </div>

            {/* Detailed Analysis */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Spending Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Annual spending at retirement:</span>
                    <span className="font-medium">{formatCurrency(projections.spendingAtRetirement)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Less: Other income (SS, pension):</span>
                    <span className="font-medium text-green-600">-{formatCurrency(projections.annualOtherIncome)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Annual portfolio withdrawal needed:</span>
                    <span className="font-medium">{formatCurrency(projections.annualWithdrawalNeeded)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Longevity Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Years in retirement:</span>
                    <span className="font-medium">{projections.yearsInRetirement} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your money lasts:</span>
                    <span className={`font-medium ${projections.yearsMoneyLasts >= projections.yearsInRetirement ? 'text-green-600' : 'text-red-600'}`}>
                      {projections.yearsMoneyLasts >= projections.yearsInRetirement + 50
                        ? 'Indefinitely'
                        : `${projections.yearsMoneyLasts} years`}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Safe withdrawal (4% rule):</span>
                    <span className="font-medium">{formatCurrency(projections.safeWithdrawalAmount)}/year</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Item */}
            {!isOnTrack && (
              <div className="p-4 bg-amber-100 border border-amber-200 rounded-lg">
                <h4 className="font-medium text-amber-900 mb-2">What You Need to Do</h4>
                <p className="text-amber-800">
                  To retire comfortably with your desired lifestyle, you need an additional{' '}
                  <strong>{formatCurrency(projections.additionalNeededToday)}</strong> in after-tax assets today.
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  Options to close the gap:
                </p>
                <ul className="text-sm text-amber-700 list-disc ml-5 mt-1 space-y-1">
                  <li>Increase your business value before exit</li>
                  <li>Save more aggressively before retirement</li>
                  <li>Consider working {Math.ceil(Math.abs(projections.surplusOrShortfall) / projections.annualWithdrawalNeeded)} additional years</li>
                  <li>Reduce planned retirement spending by {formatCurrency(Math.abs(projections.surplusOrShortfall) / projections.yearsInRetirement)}/year</li>
                </ul>
              </div>
            )}

            {isOnTrack && (
              <div className="p-4 bg-green-100 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">You&apos;re in Great Shape</h4>
                <p className="text-green-800">
                  Based on your current assets and assumptions, you have a surplus of{' '}
                  <strong>{formatCurrency(projections.surplusOrShortfall)}</strong> at retirement.
                </p>
                <p className="text-sm text-green-700 mt-2">
                  This means you could potentially:
                </p>
                <ul className="text-sm text-green-700 list-disc ml-5 mt-1 space-y-1">
                  <li>Retire {Math.floor(projections.surplusOrShortfall / projections.annualWithdrawalNeeded)} years earlier</li>
                  <li>Increase annual spending by {formatCurrency(projections.surplusOrShortfall / projections.yearsInRetirement)}/year</li>
                  <li>Leave a larger estate for heirs</li>
                  <li>Use more conservative investment assumptions</li>
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-gray-500 border-t pt-4">
              This calculator provides estimates for planning purposes only and should not be considered financial advice.
              Actual results will vary based on market conditions, tax law changes, and personal circumstances.
              Consult a qualified financial advisor for personalized guidance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
