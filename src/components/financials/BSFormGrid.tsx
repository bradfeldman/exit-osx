'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Landmark, Receipt, Calculator, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import {
  GridInput,
  CalcCell,
  SectionHeader,
  PeriodHeaders,
  FormRow,
  type FinancialPeriod,
} from './form-grid-shared'

// ─── Types ────────────────────────────────────────────────────────
interface PeriodBSData {
  // Current Assets
  cash: number
  accountsReceivable: number
  inventory: number
  prepaidExpenses: number
  otherCurrentAssets: number
  // Long-Term Assets
  ppeGross: number
  accumulatedDepreciation: number
  intangibleAssets: number
  otherLongTermAssets: number
  // Current Liabilities
  accountsPayable: number
  accruedExpenses: number
  currentPortionLtd: number
  otherCurrentLiabilities: number
  // Long-Term Liabilities
  longTermDebt: number
  deferredTaxLiabilities: number
  otherLongTermLiabilities: number
  // Equity
  retainedEarnings: number
  ownersEquity: number
}

const BS_DEFAULTS: PeriodBSData = {
  cash: 0, accountsReceivable: 0, inventory: 0, prepaidExpenses: 0, otherCurrentAssets: 0,
  ppeGross: 0, accumulatedDepreciation: 0, intangibleAssets: 0, otherLongTermAssets: 0,
  accountsPayable: 0, accruedExpenses: 0, currentPortionLtd: 0, otherCurrentLiabilities: 0,
  longTermDebt: 0, deferredTaxLiabilities: 0, otherLongTermLiabilities: 0,
  retainedEarnings: 0, ownersEquity: 0,
}

function calculateBS(d: PeriodBSData) {
  const totalCurrentAssets = d.cash + d.accountsReceivable + d.inventory + d.prepaidExpenses + d.otherCurrentAssets
  const netPPE = d.ppeGross - d.accumulatedDepreciation
  const totalLongTermAssets = netPPE + d.intangibleAssets + d.otherLongTermAssets
  const totalAssets = totalCurrentAssets + totalLongTermAssets

  const totalCurrentLiabilities = d.accountsPayable + d.accruedExpenses + d.currentPortionLtd + d.otherCurrentLiabilities
  const totalLongTermLiabilities = d.longTermDebt + d.deferredTaxLiabilities + d.otherLongTermLiabilities
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities

  const totalEquity = d.retainedEarnings + d.ownersEquity
  const balanceCheck = totalAssets - totalLiabilities - totalEquity

  return {
    totalCurrentAssets, totalLongTermAssets, totalAssets,
    totalCurrentLiabilities, totalLongTermLiabilities, totalLiabilities,
    totalEquity, balanceCheck,
  }
}

// ─── Component ────────────────────────────────────────────────────
interface BSFormGridProps {
  companyId: string
}

export function BSFormGrid({ companyId }: BSFormGridProps) {
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [periodData, setPeriodData] = useState<Record<string, PeriodBSData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatuses, setSaveStatuses] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({})
  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Load periods
  const loadPeriods = useCallback(async () => {
    if (!companyId) return []
    try {
      const response = await fetchWithRetry(`/api/companies/${companyId}/financial-periods`)
      if (response.ok) {
        const data = await response.json()
        const sorted = (data.periods || []).sort(
          (a: FinancialPeriod, b: FinancialPeriod) => a.fiscalYear - b.fiscalYear
        )
        setPeriods(sorted)
        return sorted
      }
    } catch (err) {
      console.error('Error loading periods:', err)
    }
    return []
  }, [companyId])

  // Load balance sheet for one period
  const loadBalanceSheet = useCallback(async (periodId: string): Promise<PeriodBSData> => {
    try {
      const response = await fetchWithRetry(
        `/api/companies/${companyId}/financial-periods/${periodId}/balance-sheet`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.balanceSheet) {
          const bs = data.balanceSheet
          return {
            cash: bs.cash || 0,
            accountsReceivable: bs.accountsReceivable || 0,
            inventory: bs.inventory || 0,
            prepaidExpenses: bs.prepaidExpenses || 0,
            otherCurrentAssets: bs.otherCurrentAssets || 0,
            ppeGross: bs.ppeGross || 0,
            accumulatedDepreciation: bs.accumulatedDepreciation || 0,
            intangibleAssets: bs.intangibleAssets || 0,
            otherLongTermAssets: bs.otherLongTermAssets || 0,
            accountsPayable: bs.accountsPayable || 0,
            accruedExpenses: bs.accruedExpenses || 0,
            currentPortionLtd: bs.currentPortionLtd || 0,
            otherCurrentLiabilities: bs.otherCurrentLiabilities || 0,
            longTermDebt: bs.longTermDebt || 0,
            deferredTaxLiabilities: bs.deferredTaxLiabilities || 0,
            otherLongTermLiabilities: bs.otherLongTermLiabilities || 0,
            retainedEarnings: bs.retainedEarnings || 0,
            ownersEquity: bs.ownersEquity || 0,
          }
        }
      }
    } catch (err) {
      console.error('Error loading balance sheet for period', periodId, err)
    }
    return { ...BS_DEFAULTS }
  }, [companyId])

  // Initial load
  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const loadedPeriods = await loadPeriods()
      if (loadedPeriods.length > 0) {
        const dataMap: Record<string, PeriodBSData> = {}
        await Promise.all(
          loadedPeriods.map(async (p: FinancialPeriod) => {
            dataMap[p.id] = await loadBalanceSheet(p.id)
          })
        )
        setPeriodData(dataMap)
      }
      setIsLoading(false)
    }
    load()
  }, [loadPeriods, loadBalanceSheet])

  // Auto-save (1s debounce)
  const savePeriod = useCallback(async (periodId: string, data: PeriodBSData) => {
    setSaveStatuses(prev => ({ ...prev, [periodId]: 'saving' }))
    try {
      await fetch(
        `/api/companies/${companyId}/financial-periods/${periodId}/balance-sheet`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      )
      setSaveStatuses(prev => ({ ...prev, [periodId]: 'saved' }))
      setTimeout(() => setSaveStatuses(prev => ({ ...prev, [periodId]: 'idle' })), 2000)
    } catch (err) {
      console.error('Failed to save balance sheet for period', periodId, err)
      setSaveStatuses(prev => ({ ...prev, [periodId]: 'idle' }))
    }
  }, [companyId])

  const handleFieldChange = useCallback((periodId: string, field: string, value: number) => {
    setPeriodData(prev => {
      const updated = {
        ...prev,
        [periodId]: { ...prev[periodId], [field]: value },
      }
      if (saveTimersRef.current[periodId]) clearTimeout(saveTimersRef.current[periodId])
      saveTimersRef.current[periodId] = setTimeout(() => savePeriod(periodId, updated[periodId]), 1000)
      return updated
    })
  }, [savePeriod])

  // Cleanup timers
  useEffect(() => {
    const timers = saveTimersRef.current
    return () => { Object.values(timers).forEach(clearTimeout) }
  }, [])

  // ─── Render ───────────────────────────────────────────────────
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

  const calc: Record<string, ReturnType<typeof calculateBS>> = {}
  for (const p of periods) {
    if (periodData[p.id]) calc[p.id] = calculateBS(periodData[p.id])
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
              status === 'saving' && 'text-orange-dark',
              status === 'saved' && 'text-green-dark',
            )}>
              {status === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
              {status === 'saved' && '✓'}
              {period?.label}
            </span>
          )
        })}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <PeriodHeaders periods={periods} />

          {/* ── Assets ── */}
          <div className="space-y-3 mb-6">
            <SectionHeader icon={Landmark} label="Assets" bgColor="bg-green-light" textColor="text-green-dark" />

            {/* Current Assets */}
            <p className="text-xs text-muted-foreground pl-8 font-medium uppercase tracking-wide">Current Assets</p>
            <FormRow label="Cash" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.cash ?? 0} onChange={handleFieldChange} periodId={p.id} field="cash" />}
            </FormRow>
            <FormRow label="Accounts Receivable" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.accountsReceivable ?? 0} onChange={handleFieldChange} periodId={p.id} field="accountsReceivable" />}
            </FormRow>
            <FormRow label="Inventory" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.inventory ?? 0} onChange={handleFieldChange} periodId={p.id} field="inventory" />}
            </FormRow>
            <FormRow label="Prepaid Expenses" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.prepaidExpenses ?? 0} onChange={handleFieldChange} periodId={p.id} field="prepaidExpenses" />}
            </FormRow>
            <FormRow label="Other Current Assets" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.otherCurrentAssets ?? 0} onChange={handleFieldChange} periodId={p.id} field="otherCurrentAssets" />}
            </FormRow>
            <FormRow label="Total Current Assets" periods={periods}>
              {(p) => <CalcCell value={calc[p.id]?.totalCurrentAssets ?? 0} format="currency" />}
            </FormRow>

            {/* Long-Term Assets */}
            <p className="text-xs text-muted-foreground pl-8 font-medium uppercase tracking-wide mt-4">Long-Term Assets</p>
            <FormRow label="PP&E (Gross)" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.ppeGross ?? 0} onChange={handleFieldChange} periodId={p.id} field="ppeGross" />}
            </FormRow>
            <FormRow label="Accum. Depreciation" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.accumulatedDepreciation ?? 0} onChange={handleFieldChange} periodId={p.id} field="accumulatedDepreciation" />}
            </FormRow>
            <FormRow label="Intangible Assets" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.intangibleAssets ?? 0} onChange={handleFieldChange} periodId={p.id} field="intangibleAssets" />}
            </FormRow>
            <FormRow label="Other LT Assets" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.otherLongTermAssets ?? 0} onChange={handleFieldChange} periodId={p.id} field="otherLongTermAssets" />}
            </FormRow>
            <FormRow label="Total LT Assets" periods={periods}>
              {(p) => <CalcCell value={calc[p.id]?.totalLongTermAssets ?? 0} format="currency" />}
            </FormRow>

            {/* Total Assets */}
            <FormRow label="Total Assets" periods={periods}>
              {(p) => <CalcCell value={calc[p.id]?.totalAssets ?? 0} format="currency" highlight />}
            </FormRow>
          </div>

          {/* ── Liabilities ── */}
          <div className="space-y-3 mb-6">
            <SectionHeader icon={Receipt} label="Liabilities" bgColor="bg-orange-light" textColor="text-orange" />

            {/* Current Liabilities */}
            <p className="text-xs text-muted-foreground pl-8 font-medium uppercase tracking-wide">Current Liabilities</p>
            <FormRow label="Accounts Payable" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.accountsPayable ?? 0} onChange={handleFieldChange} periodId={p.id} field="accountsPayable" />}
            </FormRow>
            <FormRow label="Accrued Expenses" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.accruedExpenses ?? 0} onChange={handleFieldChange} periodId={p.id} field="accruedExpenses" />}
            </FormRow>
            <FormRow label="Current Portion LTD" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.currentPortionLtd ?? 0} onChange={handleFieldChange} periodId={p.id} field="currentPortionLtd" />}
            </FormRow>
            <FormRow label="Other Current Liabilities" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.otherCurrentLiabilities ?? 0} onChange={handleFieldChange} periodId={p.id} field="otherCurrentLiabilities" />}
            </FormRow>
            <FormRow label="Total Current Liabilities" periods={periods}>
              {(p) => <CalcCell value={calc[p.id]?.totalCurrentLiabilities ?? 0} format="currency" />}
            </FormRow>

            {/* Long-Term Liabilities */}
            <p className="text-xs text-muted-foreground pl-8 font-medium uppercase tracking-wide mt-4">Long-Term Liabilities</p>
            <FormRow label="Long-Term Debt" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.longTermDebt ?? 0} onChange={handleFieldChange} periodId={p.id} field="longTermDebt" />}
            </FormRow>
            <FormRow label="Deferred Tax Liabilities" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.deferredTaxLiabilities ?? 0} onChange={handleFieldChange} periodId={p.id} field="deferredTaxLiabilities" />}
            </FormRow>
            <FormRow label="Other LT Liabilities" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.otherLongTermLiabilities ?? 0} onChange={handleFieldChange} periodId={p.id} field="otherLongTermLiabilities" />}
            </FormRow>
            <FormRow label="Total LT Liabilities" periods={periods}>
              {(p) => <CalcCell value={calc[p.id]?.totalLongTermLiabilities ?? 0} format="currency" />}
            </FormRow>

            {/* Total Liabilities */}
            <FormRow label="Total Liabilities" periods={periods}>
              {(p) => <CalcCell value={calc[p.id]?.totalLiabilities ?? 0} format="currency" highlight />}
            </FormRow>
          </div>

          {/* ── Equity ── */}
          <div className="space-y-3 mb-6">
            <SectionHeader icon={Calculator} label="Equity" bgColor="bg-accent-light" textColor="text-primary" />

            <FormRow label="Retained Earnings" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.retainedEarnings ?? 0} onChange={handleFieldChange} periodId={p.id} field="retainedEarnings" />}
            </FormRow>
            <FormRow label="Owner's Equity" periods={periods}>
              {(p) => <GridInput value={periodData[p.id]?.ownersEquity ?? 0} onChange={handleFieldChange} periodId={p.id} field="ownersEquity" />}
            </FormRow>
            <FormRow label="Total Equity" periods={periods}>
              {(p) => <CalcCell value={calc[p.id]?.totalEquity ?? 0} format="currency" highlight />}
            </FormRow>
          </div>

          {/* ── Balance Check ── */}
          <div className="space-y-3">
            <FormRow label="Balance Check" periods={periods}>
              {(p) => {
                const check = calc[p.id]?.balanceCheck ?? 0
                return (
                  <CalcCell
                    value={check}
                    format="currency"
                    colorClass={Math.abs(check) < 0.01 ? 'bg-green-light text-green-dark' : 'bg-red-light text-red-dark'}
                  />
                )
              }}
            </FormRow>
          </div>
        </div>
      </div>
    </div>
  )
}
