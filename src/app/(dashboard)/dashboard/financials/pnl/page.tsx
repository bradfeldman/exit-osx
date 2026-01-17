'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCompany } from '@/contexts/CompanyContext'
import { PeriodSelector, FinancialPeriod } from '@/components/financials'
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Save,
  TrendingUp,
  DollarSign,
  Minus,
  Equal,
  ArrowDown,
  Receipt,
  Calculator,
  Sparkles
} from 'lucide-react'

interface IncomeStatement {
  id: string
  periodId: string
  grossRevenue: number
  cogs: number
  operatingExpenses: number
  grossProfit: number
  grossMarginPct: number
  ebitda: number
  ebitdaMarginPct: number
  depreciation: number | null
  amortization: number | null
  interestExpense: number | null
  taxExpense: number | null
  createdAt: string
  updatedAt: string
}

export default function PnLPage() {
  const { selectedCompanyId } = useCompany()
  const [selectedPeriod, setSelectedPeriod] = useState<FinancialPeriod | null>(null)
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showBelowTheLine, setShowBelowTheLine] = useState(false)
  const [hasPeriods, setHasPeriods] = useState<boolean | null>(null)

  // Form state
  const [grossRevenue, setGrossRevenue] = useState<number>(0)
  const [cogs, setCogs] = useState<number>(0)
  const [operatingExpenses, setOperatingExpenses] = useState<number>(0)
  const [depreciation, setDepreciation] = useState<number | null>(null)
  const [amortization, setAmortization] = useState<number | null>(null)
  const [interestExpense, setInterestExpense] = useState<number | null>(null)
  const [taxExpense, setTaxExpense] = useState<number | null>(null)

  // Calculated values
  const grossProfit = grossRevenue - cogs
  const grossMarginPct = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0
  const ebitda = grossProfit - operatingExpenses
  const ebitdaMarginPct = grossRevenue > 0 ? (ebitda / grossRevenue) * 100 : 0

  // Below-the-line calculations
  const ebit = ebitda - (depreciation || 0) - (amortization || 0)
  const ebt = ebit - (interestExpense || 0)
  const netIncome = ebt - (taxExpense || 0)

  const fetchIncomeStatement = useCallback(async () => {
    if (!selectedCompanyId || !selectedPeriod) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/financial-periods/${selectedPeriod.id}/income-statement`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.incomeStatement) {
          const stmt = data.incomeStatement
          setIncomeStatement(stmt)
          setGrossRevenue(stmt.grossRevenue)
          setCogs(stmt.cogs)
          setOperatingExpenses(stmt.operatingExpenses)
          setDepreciation(stmt.depreciation)
          setAmortization(stmt.amortization)
          setInterestExpense(stmt.interestExpense)
          setTaxExpense(stmt.taxExpense)
        } else {
          // Clear form for new period
          setIncomeStatement(null)
          setGrossRevenue(0)
          setCogs(0)
          setOperatingExpenses(0)
          setDepreciation(null)
          setAmortization(null)
          setInterestExpense(null)
          setTaxExpense(null)
        }
      }
    } catch (error) {
      console.error('Failed to fetch income statement:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId, selectedPeriod])

  useEffect(() => {
    fetchIncomeStatement()
  }, [fetchIncomeStatement])

  const handleSave = async () => {
    if (!selectedCompanyId || !selectedPeriod) return

    setIsSaving(true)
    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/financial-periods/${selectedPeriod.id}/income-statement`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grossRevenue,
            cogs,
            operatingExpenses,
            depreciation,
            amortization,
            interestExpense,
            taxExpense,
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        setIncomeStatement(data.incomeStatement)
      }
    } catch (error) {
      console.error('Failed to save income statement:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatInputValue = (value: number) => {
    if (value === 0) return ''
    return new Intl.NumberFormat('en-US').format(value)
  }

  const parseInputValue = (value: string) => {
    const cleaned = value.replace(/[^0-9.-]/g, '')
    return parseFloat(cleaned) || 0
  }

  if (!selectedCompanyId) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h1>
          <p className="text-gray-600">Select a company to view and manage P&L data</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              No company selected. Please select a company from the dropdown above.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h1>
          <p className="text-gray-600">Track your revenue, expenses, and profitability</p>
        </div>
      </div>

      {/* Period selector and save */}
      <div className="flex items-center justify-between">
        <PeriodSelector
          companyId={selectedCompanyId}
          selectedPeriodId={selectedPeriod?.id}
          onPeriodChange={setSelectedPeriod}
          onPeriodsLoaded={setHasPeriods}
        />
        <Button onClick={handleSave} disabled={isSaving || !selectedPeriod} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Intro banner when no period selected */}
            {!selectedPeriod && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Get started with your P&L</p>
                    <p className="text-sm text-gray-600">Add a fiscal year above to begin entering your financial data</p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Form */}
            <div className="p-6 space-y-8">

              {/* Revenue Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Revenue</h3>
                    <p className="text-sm text-gray-500">Your total sales before any deductions</p>
                  </div>
                </div>

                <div className="ml-11">
                  <Label htmlFor="grossRevenue" className="text-sm font-medium text-gray-700">
                    Gross Revenue
                  </Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <Input
                      id="grossRevenue"
                      type="text"
                      inputMode="numeric"
                      value={formatInputValue(grossRevenue)}
                      onChange={(e) => setGrossRevenue(parseInputValue(e.target.value))}
                      className="pl-8 h-12 text-lg font-medium bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      placeholder="0"
                      disabled={!selectedPeriod}
                    />
                  </div>
                </div>
              </div>

              {/* Visual Divider with Arrow */}
              <div className="flex items-center gap-3 pl-11">
                <div className="flex-1 h-px bg-gray-200" />
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
                  <Minus className="h-3 w-3 text-gray-400" />
                </div>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Costs Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Costs & Expenses</h3>
                    <p className="text-sm text-gray-500">Direct costs and operating expenses</p>
                  </div>
                </div>

                <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cogs" className="text-sm font-medium text-gray-700">
                      Cost of Goods Sold
                    </Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                      <Input
                        id="cogs"
                        type="text"
                        inputMode="numeric"
                        value={formatInputValue(cogs)}
                        onChange={(e) => setCogs(parseInputValue(e.target.value))}
                        className="pl-8 h-11 font-medium bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        placeholder="0"
                        disabled={!selectedPeriod}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">Direct costs to produce your product/service</p>
                  </div>

                  <div>
                    <Label htmlFor="operatingExpenses" className="text-sm font-medium text-gray-700">
                      Operating Expenses
                    </Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                      <Input
                        id="operatingExpenses"
                        type="text"
                        inputMode="numeric"
                        value={formatInputValue(operatingExpenses)}
                        onChange={(e) => setOperatingExpenses(parseInputValue(e.target.value))}
                        className="pl-8 h-11 font-medium bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        placeholder="0"
                        disabled={!selectedPeriod}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">SG&A, rent, utilities, salaries, etc.</p>
                  </div>
                </div>
              </div>

              {/* Visual Divider with Equal */}
              <div className="flex items-center gap-3 pl-11">
                <div className="flex-1 h-px bg-gray-200" />
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
                  <Equal className="h-3 w-3 text-gray-400" />
                </div>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Results Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                    <Calculator className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Calculated Results</h3>
                    <p className="text-sm text-gray-500">Auto-calculated from your inputs above</p>
                  </div>
                </div>

                <div className="ml-11">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gross Profit Card */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-600">Gross Profit</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          grossMarginPct >= 50 ? 'bg-emerald-100 text-emerald-700' :
                          grossMarginPct >= 30 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {formatPercent(grossMarginPct)} margin
                        </span>
                      </div>
                      <p className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {formatCurrency(grossProfit)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Revenue minus COGS</p>
                    </div>

                    {/* EBITDA Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-blue-700">EBITDA</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          ebitdaMarginPct >= 20 ? 'bg-emerald-100 text-emerald-700' :
                          ebitdaMarginPct >= 10 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {formatPercent(ebitdaMarginPct)} margin
                        </span>
                      </div>
                      <p className={`text-2xl font-bold ${ebitda >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                        {formatCurrency(ebitda)}
                      </p>
                      <p className="text-xs text-blue-600/70 mt-1">Key metric for valuation</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Continue Button */}
              {selectedPeriod && (
                <div className="ml-11 pt-2">
                  <Link href="/dashboard/financials/add-backs">
                    <Button variant="default" className="gap-2">
                      Continue to Add-Backs
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Below-the-line Section */}
            <div className="border-t">
              <button
                type="button"
                onClick={() => setShowBelowTheLine(!showBelowTheLine)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-700">Below-the-Line Items</h3>
                    <p className="text-sm text-gray-500">Optional: D&A, interest, and taxes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-sm">{showBelowTheLine ? 'Hide' : 'Show'}</span>
                  {showBelowTheLine ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {showBelowTheLine && (
                <div className="px-6 pb-6 space-y-6 bg-gray-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-11">
                    <div>
                      <Label htmlFor="depreciation" className="text-sm font-medium text-gray-700">
                        Depreciation
                      </Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                        <Input
                          id="depreciation"
                          type="text"
                          inputMode="numeric"
                          value={depreciation ? formatInputValue(depreciation) : ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setDepreciation(val ? parseInputValue(val) : null)
                          }}
                          className="pl-8 h-11 font-medium bg-white border-gray-200 focus:ring-2 focus:ring-gray-500/20 focus:border-gray-400 transition-all"
                          placeholder="0"
                          disabled={!selectedPeriod}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="amortization" className="text-sm font-medium text-gray-700">
                        Amortization
                      </Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                        <Input
                          id="amortization"
                          type="text"
                          inputMode="numeric"
                          value={amortization ? formatInputValue(amortization) : ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setAmortization(val ? parseInputValue(val) : null)
                          }}
                          className="pl-8 h-11 font-medium bg-white border-gray-200 focus:ring-2 focus:ring-gray-500/20 focus:border-gray-400 transition-all"
                          placeholder="0"
                          disabled={!selectedPeriod}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="interestExpense" className="text-sm font-medium text-gray-700">
                        Interest Expense
                      </Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                        <Input
                          id="interestExpense"
                          type="text"
                          inputMode="numeric"
                          value={interestExpense ? formatInputValue(interestExpense) : ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setInterestExpense(val ? parseInputValue(val) : null)
                          }}
                          className="pl-8 h-11 font-medium bg-white border-gray-200 focus:ring-2 focus:ring-gray-500/20 focus:border-gray-400 transition-all"
                          placeholder="0"
                          disabled={!selectedPeriod}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="taxExpense" className="text-sm font-medium text-gray-700">
                        Tax Expense
                      </Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                        <Input
                          id="taxExpense"
                          type="text"
                          inputMode="numeric"
                          value={taxExpense ? formatInputValue(taxExpense) : ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setTaxExpense(val ? parseInputValue(val) : null)
                          }}
                          className="pl-8 h-11 font-medium bg-white border-gray-200 focus:ring-2 focus:ring-gray-500/20 focus:border-gray-400 transition-all"
                          placeholder="0"
                          disabled={!selectedPeriod}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Below-the-line Results */}
                  <div className="ml-11 bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-sm text-gray-600">EBIT (Operating Income)</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(ebit)}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-sm text-gray-600">EBT (Pre-Tax Income)</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(ebt)}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50">
                      <span className="text-sm font-semibold text-gray-900">Net Income</span>
                      <span className={`font-bold text-lg ${netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(netIncome)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
