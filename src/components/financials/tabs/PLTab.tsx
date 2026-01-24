'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  Minus,
  Equal,
  Receipt,
  Calculator,
  TrendingUp,
} from 'lucide-react'

interface PLTabProps {
  companyId: string
  periodId: string
  onDataChange?: (data: PLData) => void
  onDirty?: () => void
}

export interface PLData {
  grossRevenue: number
  cogs: number
  totalExpenses: number  // Renamed from operatingExpenses - includes all expenses below gross profit
  grossProfit: number
  grossMarginPct: number
  ebitda: number
  ebitdaMarginPct: number
  depreciation: number
  amortization: number
  interestExpense: number
  taxExpense: number
  netOperatingIncome: number
}

interface IncomeStatement {
  id: string
  periodId: string
  grossRevenue: number
  cogs: number
  operatingExpenses: number  // API still uses this name, we display as "Total Expenses"
  grossProfit: number
  grossMarginPct: number
  ebitda: number
  ebitdaMarginPct: number
  depreciation: number | null
  amortization: number | null
  interestExpense: number | null
  taxExpense: number | null
}

export function PLTab({ companyId, periodId, onDataChange, onDirty }: PLTabProps) {
  const [_incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showBelowTheLine, setShowBelowTheLine] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Store callbacks in ref to avoid dependency issues
  const onDataChangeRef = useRef(onDataChange)
  onDataChangeRef.current = onDataChange
  const onDirtyRef = useRef(onDirty)
  onDirtyRef.current = onDirty

  // Form state
  const [grossRevenue, setGrossRevenue] = useState<number>(0)
  const [cogs, setCogs] = useState<number>(0)
  const [totalExpenses, setTotalExpenses] = useState<number>(0)  // All expenses below gross profit (includes D, A, I, T)
  const [depreciation, setDepreciation] = useState<number>(0)
  const [amortization, setAmortization] = useState<number>(0)
  const [interestExpense, setInterestExpense] = useState<number>(0)
  const [taxExpense, setTaxExpense] = useState<number>(0)

  // Calculated values
  const grossProfit = grossRevenue - cogs
  const grossMarginPct = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0
  // EBITDA = Gross Profit - Total Expenses + D + A + I + T
  // (Total Expenses includes everything, so we add back ITDA to get EBITDA)
  const ebitda = grossProfit - totalExpenses + depreciation + amortization + interestExpense + taxExpense
  const ebitdaMarginPct = grossRevenue > 0 ? (ebitda / grossRevenue) * 100 : 0
  const ebit = ebitda - depreciation - amortization
  const ebt = ebit - interestExpense
  const netOperatingIncome = ebt - taxExpense

  // Notify parent of data changes (using ref to avoid infinite loop)
  useEffect(() => {
    onDataChangeRef.current?.({
      grossRevenue,
      cogs,
      totalExpenses,
      grossProfit,
      grossMarginPct,
      ebitda,
      ebitdaMarginPct,
      depreciation,
      amortization,
      interestExpense,
      taxExpense,
      netOperatingIncome,
    })
  }, [grossRevenue, cogs, totalExpenses, depreciation, amortization, interestExpense, taxExpense, grossProfit, grossMarginPct, ebitda, ebitdaMarginPct, netOperatingIncome])

  const fetchIncomeStatement = useCallback(async () => {
    if (!companyId || !periodId) return

    setIsLoading(true)
    setIsInitialized(false)
    try {
      const response = await fetch(
        `/api/companies/${companyId}/financial-periods/${periodId}/income-statement`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.incomeStatement) {
          const stmt = data.incomeStatement
          setIncomeStatement(stmt)
          setGrossRevenue(stmt.grossRevenue || 0)
          setCogs(stmt.cogs || 0)
          setTotalExpenses(stmt.operatingExpenses || 0)  // API uses operatingExpenses, we display as Total Expenses
          setDepreciation(stmt.depreciation || 0)
          setAmortization(stmt.amortization || 0)
          setInterestExpense(stmt.interestExpense || 0)
          setTaxExpense(stmt.taxExpense || 0)
        } else {
          clearForm()
        }
      }
    } catch (error) {
      console.error('Failed to fetch income statement:', error)
    } finally {
      setIsLoading(false)
      // Mark as initialized after a small delay to avoid triggering dirty on initial load
      setTimeout(() => setIsInitialized(true), 100)
    }
  }, [companyId, periodId])

  const clearForm = () => {
    setIncomeStatement(null)
    setGrossRevenue(0)
    setCogs(0)
    setTotalExpenses(0)
    setDepreciation(0)
    setAmortization(0)
    setInterestExpense(0)
    setTaxExpense(0)
  }

  useEffect(() => {
    fetchIncomeStatement()
  }, [fetchIncomeStatement])

  // Notify parent when dirty (only after initial load)
  useEffect(() => {
    if (isInitialized) {
      onDirtyRef.current?.()
    }
  }, [isInitialized, grossRevenue, cogs, totalExpenses, depreciation, amortization, interestExpense, taxExpense])

  // Auto-save with debounce
  useEffect(() => {
    if (!companyId || !periodId || isLoading) return

    const timer = setTimeout(async () => {
      try {
        await fetch(
          `/api/companies/${companyId}/financial-periods/${periodId}/income-statement`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grossRevenue,
              cogs,
              operatingExpenses: totalExpenses,  // API still uses operatingExpenses field name
              depreciation,
              amortization,
              interestExpense,
              taxExpense,
            }),
          }
        )
      } catch (error) {
        console.error('Failed to auto-save income statement:', error)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [companyId, periodId, grossRevenue, cogs, totalExpenses, depreciation, amortization, interestExpense, taxExpense, isLoading])

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
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
            />
          </div>
        </div>
      </div>

      {/* Visual Divider */}
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

        <div className="ml-11 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Direct costs to produce your product/service</p>
            </div>

            <div>
              <Label htmlFor="totalExpenses" className="text-sm font-medium text-gray-700">
                Total Expenses
              </Label>
              <div className="relative mt-1.5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <Input
                  id="totalExpenses"
                  type="text"
                  inputMode="numeric"
                  value={formatInputValue(totalExpenses)}
                  onChange={(e) => setTotalExpenses(parseInputValue(e.target.value))}
                  className="pl-8 h-11 font-medium bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  placeholder="0"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">All expenses below gross profit (from QuickBooks)</p>
            </div>
          </div>

          {/* D, A, I, T breakdown - used to calculate EBITDA from Total Expenses */}
          <div className="bg-orange-50/50 rounded-lg p-4 border border-orange-100">
            <p className="text-sm font-medium text-orange-800 mb-3">
              Breakdown of Total Expenses (added back to calculate EBITDA)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="depreciation" className="text-xs font-medium text-gray-600">
                  Depreciation
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input
                    id="depreciation"
                    type="text"
                    inputMode="numeric"
                    value={formatInputValue(depreciation)}
                    onChange={(e) => setDepreciation(parseInputValue(e.target.value))}
                    className="pl-7 h-9 text-sm font-medium bg-white border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="amortization" className="text-xs font-medium text-gray-600">
                  Amortization
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input
                    id="amortization"
                    type="text"
                    inputMode="numeric"
                    value={formatInputValue(amortization)}
                    onChange={(e) => setAmortization(parseInputValue(e.target.value))}
                    className="pl-7 h-9 text-sm font-medium bg-white border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="interestExpense" className="text-xs font-medium text-gray-600">
                  Interest
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input
                    id="interestExpense"
                    type="text"
                    inputMode="numeric"
                    value={formatInputValue(interestExpense)}
                    onChange={(e) => setInterestExpense(parseInputValue(e.target.value))}
                    className="pl-7 h-9 text-sm font-medium bg-white border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="taxExpense" className="text-xs font-medium text-gray-600">
                  Taxes
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input
                    id="taxExpense"
                    type="text"
                    inputMode="numeric"
                    value={formatInputValue(taxExpense)}
                    onChange={(e) => setTaxExpense(parseInputValue(e.target.value))}
                    className="pl-7 h-9 text-sm font-medium bg-white border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Divider */}
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

      {/* Below-the-line Results Section */}
      <div className="border-t">
        <Button
          variant="ghost"
          onClick={() => setShowBelowTheLine(!showBelowTheLine)}
          className="w-full justify-between py-6 px-0 hover:bg-transparent"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-gray-700">Below-the-Line Results</h3>
              <p className="text-sm text-gray-500 font-normal">EBIT, EBT, and Net Operating Income</p>
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
        </Button>

        {showBelowTheLine && (
          <div className="pb-6 bg-gray-50/50 rounded-b-lg px-4 -mx-4">
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
                <span className="text-sm font-semibold text-gray-900">Net Operating Income</span>
                <span className={`font-bold text-lg ${netOperatingIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(netOperatingIncome)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
