'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  Receipt,
  Calculator,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

interface FinancialPeriod {
  id: string
  label: string
  fiscalYear: number
  periodType: string
}

interface PeriodPLData {
  grossRevenue: number
  cogs: number
  totalExpenses: number
  depreciation: number
  amortization: number
  interestExpense: number
  taxExpense: number
}

interface CalculatedValues {
  grossProfit: number
  grossMarginPct: number
  ebitda: number
  ebitdaMarginPct: number
}

interface PLFormGridProps {
  companyId: string
}

function formatInputValue(value: number): string {
  if (value === 0) return ''
  return new Intl.NumberFormat('en-US').format(value)
}

function parseInputValue(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
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
  return `${value.toFixed(1)}%`
}

function calculateValues(data: PeriodPLData): CalculatedValues {
  const grossProfit = data.grossRevenue - data.cogs
  const grossMarginPct = data.grossRevenue > 0 ? (grossProfit / data.grossRevenue) * 100 : 0
  const ebitda = grossProfit - data.totalExpenses + data.depreciation + data.amortization + data.interestExpense + data.taxExpense
  const ebitdaMarginPct = data.grossRevenue > 0 ? (ebitda / data.grossRevenue) * 100 : 0
  return { grossProfit, grossMarginPct, ebitda, ebitdaMarginPct }
}

// Currency input cell for the grid
function GridInput({
  value,
  onChange,
  periodId,
  field,
}: {
  value: number
  onChange: (periodId: string, field: string, value: number) => void
  periodId: string
  field: string
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
      <Input
        type="text"
        inputMode="numeric"
        value={formatInputValue(value)}
        onChange={(e) => onChange(periodId, field, parseInputValue(e.target.value))}
        className="pl-7 h-9 text-sm font-medium bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-right"
        placeholder="0"
      />
    </div>
  )
}

// Read-only calculated value cell
function CalcCell({ value, format, highlight }: { value: number; format: 'currency' | 'percent'; highlight?: boolean }) {
  const formatted = format === 'currency' ? formatCurrency(value) : formatPercent(value)
  return (
    <div className={cn(
      'h-9 flex items-center justify-end px-3 text-sm font-semibold rounded',
      highlight ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'
    )}>
      {formatted}
    </div>
  )
}

export function PLFormGrid({ companyId }: PLFormGridProps) {
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [periodData, setPeriodData] = useState<Record<string, PeriodPLData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [showDAIT, setShowDAIT] = useState(false)
  const [saveStatuses, setSaveStatuses] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({})

  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Load periods
  const loadPeriods = useCallback(async () => {
    if (!companyId) return

    try {
      const response = await fetchWithRetry(`/api/companies/${companyId}/financial-periods`)
      if (response.ok) {
        const data = await response.json()
        const sortedPeriods = (data.periods || []).sort(
          (a: FinancialPeriod, b: FinancialPeriod) => a.fiscalYear - b.fiscalYear
        )
        setPeriods(sortedPeriods)
        return sortedPeriods
      }
    } catch (err) {
      console.error('Error loading periods:', err)
    }
    return []
  }, [companyId])

  // Load income statement for a period
  const loadIncomeStatement = useCallback(async (periodId: string): Promise<PeriodPLData> => {
    const defaults: PeriodPLData = {
      grossRevenue: 0, cogs: 0, totalExpenses: 0,
      depreciation: 0, amortization: 0, interestExpense: 0, taxExpense: 0,
    }

    try {
      const response = await fetchWithRetry(
        `/api/companies/${companyId}/financial-periods/${periodId}/income-statement`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.incomeStatement) {
          const stmt = data.incomeStatement
          return {
            grossRevenue: stmt.grossRevenue || 0,
            cogs: stmt.cogs || 0,
            totalExpenses: stmt.operatingExpenses || 0,
            depreciation: stmt.depreciation || 0,
            amortization: stmt.amortization || 0,
            interestExpense: stmt.interestExpense || 0,
            taxExpense: stmt.taxExpense || 0,
          }
        }
      }
    } catch (err) {
      console.error('Error loading income statement for period', periodId, err)
    }
    return defaults
  }, [companyId])

  // Initial load
  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const loadedPeriods = await loadPeriods()
      if (loadedPeriods.length > 0) {
        const dataMap: Record<string, PeriodPLData> = {}
        await Promise.all(
          loadedPeriods.map(async (p: FinancialPeriod) => {
            dataMap[p.id] = await loadIncomeStatement(p.id)
          })
        )
        setPeriodData(dataMap)
      }
      setIsLoading(false)
    }
    load()
  }, [loadPeriods, loadIncomeStatement])

  // Auto-save a single period (1s debounce)
  const savePeriod = useCallback(async (periodId: string, data: PeriodPLData) => {
    setSaveStatuses(prev => ({ ...prev, [periodId]: 'saving' }))
    try {
      await fetch(
        `/api/companies/${companyId}/financial-periods/${periodId}/income-statement`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grossRevenue: data.grossRevenue,
            cogs: data.cogs,
            operatingExpenses: data.totalExpenses,
            depreciation: data.depreciation,
            amortization: data.amortization,
            interestExpense: data.interestExpense,
            taxExpense: data.taxExpense,
          }),
        }
      )
      setSaveStatuses(prev => ({ ...prev, [periodId]: 'saved' }))
      setTimeout(() => {
        setSaveStatuses(prev => ({ ...prev, [periodId]: 'idle' }))
      }, 2000)
    } catch (err) {
      console.error('Failed to save income statement for period', periodId, err)
      setSaveStatuses(prev => ({ ...prev, [periodId]: 'idle' }))
    }
  }, [companyId])

  // Handle field change for a period
  const handleFieldChange = useCallback((periodId: string, field: string, value: number) => {
    setPeriodData(prev => {
      const updated = {
        ...prev,
        [periodId]: {
          ...prev[periodId],
          [field]: value,
        },
      }

      // Schedule debounced save
      if (saveTimersRef.current[periodId]) {
        clearTimeout(saveTimersRef.current[periodId])
      }
      saveTimersRef.current[periodId] = setTimeout(() => {
        savePeriod(periodId, updated[periodId])
      }, 1000)

      return updated
    })
  }, [savePeriod])

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = saveTimersRef.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (periods.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No periods found. Click &quot;Enter Manually&quot; to get started.
      </div>
    )
  }

  // Calculate derived values for each period
  const calculated: Record<string, CalculatedValues> = {}
  for (const period of periods) {
    const data = periodData[period.id]
    if (data) {
      calculated[period.id] = calculateValues(data)
    }
  }

  return (
    <div className="space-y-6">
      {/* Save status row */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Object.entries(saveStatuses).map(([periodId, status]) => {
          if (status === 'idle') return null
          const period = periods.find(p => p.id === periodId)
          return (
            <span key={periodId} className={cn(
              'flex items-center gap-1',
              status === 'saving' && 'text-amber-600',
              status === 'saved' && 'text-emerald-600',
            )}>
              {status === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
              {status === 'saved' && '✓'}
              {period?.label}
            </span>
          )
        })}
      </div>

      {/* Grid container with horizontal scroll */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header row */}
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `200px repeat(${periods.length}, 1fr)` }}>
            <div /> {/* Label spacer */}
            {periods.map(period => (
              <div key={period.id} className="text-center">
                <span className="text-sm font-semibold text-foreground">{period.label}</span>
              </div>
            ))}
          </div>

          {/* Revenue Section */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                <DollarSign className="h-3 w-3" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Revenue</span>
            </div>

            {/* Gross Revenue */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `200px repeat(${periods.length}, 1fr)` }}>
              <div className="flex items-center pl-8">
                <span className="text-sm text-gray-600">Gross Revenue</span>
              </div>
              {periods.map(period => (
                <GridInput
                  key={period.id}
                  value={periodData[period.id]?.grossRevenue ?? 0}
                  onChange={handleFieldChange}
                  periodId={period.id}
                  field="grossRevenue"
                />
              ))}
            </div>
          </div>

          {/* Costs & Expenses Section */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600">
                <Receipt className="h-3 w-3" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Costs & Expenses</span>
            </div>

            {/* COGS */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `200px repeat(${periods.length}, 1fr)` }}>
              <div className="flex items-center pl-8">
                <span className="text-sm text-gray-600">Cost of Goods Sold</span>
              </div>
              {periods.map(period => (
                <GridInput
                  key={period.id}
                  value={periodData[period.id]?.cogs ?? 0}
                  onChange={handleFieldChange}
                  periodId={period.id}
                  field="cogs"
                />
              ))}
            </div>

            {/* Total Expenses */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `200px repeat(${periods.length}, 1fr)` }}>
              <div className="flex items-center pl-8">
                <span className="text-sm text-gray-600">Total Expenses</span>
              </div>
              {periods.map(period => (
                <GridInput
                  key={period.id}
                  value={periodData[period.id]?.totalExpenses ?? 0}
                  onChange={handleFieldChange}
                  periodId={period.id}
                  field="totalExpenses"
                />
              ))}
            </div>

            {/* DAIT Breakdown (collapsible) */}
            <div className="pl-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDAIT(!showDAIT)}
                className="text-xs text-muted-foreground hover:text-foreground gap-1 px-2 h-7"
              >
                {showDAIT ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                D, A, I, T Breakdown
              </Button>

              {showDAIT && (
                <div className="mt-2 space-y-2 p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <p className="text-xs text-orange-700 mb-3">
                    These are included in Total Expenses and added back to calculate EBITDA
                  </p>

                  {/* Depreciation */}
                  <div className="grid gap-3" style={{ gridTemplateColumns: `168px repeat(${periods.length}, 1fr)` }}>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-600">Depreciation</span>
                    </div>
                    {periods.map(period => (
                      <GridInput
                        key={period.id}
                        value={periodData[period.id]?.depreciation ?? 0}
                        onChange={handleFieldChange}
                        periodId={period.id}
                        field="depreciation"
                      />
                    ))}
                  </div>

                  {/* Amortization */}
                  <div className="grid gap-3" style={{ gridTemplateColumns: `168px repeat(${periods.length}, 1fr)` }}>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-600">Amortization</span>
                    </div>
                    {periods.map(period => (
                      <GridInput
                        key={period.id}
                        value={periodData[period.id]?.amortization ?? 0}
                        onChange={handleFieldChange}
                        periodId={period.id}
                        field="amortization"
                      />
                    ))}
                  </div>

                  {/* Interest */}
                  <div className="grid gap-3" style={{ gridTemplateColumns: `168px repeat(${periods.length}, 1fr)` }}>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-600">Interest</span>
                    </div>
                    {periods.map(period => (
                      <GridInput
                        key={period.id}
                        value={periodData[period.id]?.interestExpense ?? 0}
                        onChange={handleFieldChange}
                        periodId={period.id}
                        field="interestExpense"
                      />
                    ))}
                  </div>

                  {/* Taxes */}
                  <div className="grid gap-3" style={{ gridTemplateColumns: `168px repeat(${periods.length}, 1fr)` }}>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-600">Taxes</span>
                    </div>
                    {periods.map(period => (
                      <GridInput
                        key={period.id}
                        value={periodData[period.id]?.taxExpense ?? 0}
                        onChange={handleFieldChange}
                        periodId={period.id}
                        field="taxExpense"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section (read-only) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600">
                <Calculator className="h-3 w-3" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Results</span>
            </div>

            {/* Gross Profit */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `200px repeat(${periods.length}, 1fr)` }}>
              <div className="flex items-center pl-8">
                <span className="text-sm text-gray-600">Gross Profit</span>
              </div>
              {periods.map(period => (
                <CalcCell
                  key={period.id}
                  value={calculated[period.id]?.grossProfit ?? 0}
                  format="currency"
                />
              ))}
            </div>

            {/* Gross Margin */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `200px repeat(${periods.length}, 1fr)` }}>
              <div className="flex items-center pl-8">
                <span className="text-sm text-gray-500">Gross Margin</span>
              </div>
              {periods.map(period => (
                <CalcCell
                  key={period.id}
                  value={calculated[period.id]?.grossMarginPct ?? 0}
                  format="percent"
                />
              ))}
            </div>

            {/* EBITDA */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `200px repeat(${periods.length}, 1fr)` }}>
              <div className="flex items-center pl-8">
                <span className="text-sm font-semibold text-blue-700">EBITDA</span>
              </div>
              {periods.map(period => (
                <CalcCell
                  key={period.id}
                  value={calculated[period.id]?.ebitda ?? 0}
                  format="currency"
                  highlight
                />
              ))}
            </div>

            {/* EBITDA Margin */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `200px repeat(${periods.length}, 1fr)` }}>
              <div className="flex items-center pl-8">
                <span className="text-sm text-blue-600">EBITDA Margin</span>
              </div>
              {periods.map(period => (
                <CalcCell
                  key={period.id}
                  value={calculated[period.id]?.ebitdaMarginPct ?? 0}
                  format="percent"
                  highlight
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
