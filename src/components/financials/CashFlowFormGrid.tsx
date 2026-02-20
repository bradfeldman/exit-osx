'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, TrendingDown, Wallet, BarChart3, Loader2, AlertCircle } from 'lucide-react'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import {
  CalcCell,
  SectionHeader,
  PeriodHeaders,
  FormRow,
  type FinancialPeriod,
} from './form-grid-shared'

// ─── Types ────────────────────────────────────────────────────────
interface CashFlowData {
  // Operating
  netIncome: number
  depreciation: number
  amortization: number
  changeInAccountsReceivable: number
  changeInInventory: number
  changeInPrepaidExpenses: number
  changeInOtherCurrentAssets: number
  changeInAccountsPayable: number
  changeInAccruedExpenses: number
  changeInOtherCurrentLiabilities: number
  changeInDeferredTaxLiabilities: number
  cashFromOperations: number
  // Investing
  capitalExpenditures: number
  changeInIntangibleAssets: number
  changeInOtherLongTermAssets: number
  cashFromInvesting: number
  // Financing
  changeInCurrentPortionLtd: number
  changeInLongTermDebt: number
  changeInOtherLongTermLiabilities: number
  changeInOwnersEquity: number
  cashFromFinancing: number
  // Summary
  netChangeInCash: number
  beginningCash: number
  endingCash: number
  freeCashFlow: number
}

interface PeriodCashFlow {
  data: CashFlowData | null
  canCalculate: boolean
  missingData?: {
    currentPL: boolean
    currentBS: boolean
    priorBS: boolean
    priorYear: number
  }
}

interface CashFlowFormGridProps {
  companyId: string
}

// ─── Component ────────────────────────────────────────────────────
export function CashFlowFormGrid({ companyId }: CashFlowFormGridProps) {
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [periodCF, setPeriodCF] = useState<Record<string, PeriodCashFlow>>({})
  const [isLoading, setIsLoading] = useState(true)

  const loadPeriods = useCallback(async (): Promise<FinancialPeriod[]> => {
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

  const loadCashFlow = useCallback(async (periodId: string): Promise<PeriodCashFlow> => {
    try {
      const res = await fetchWithRetry(
        `/api/companies/${companyId}/financial-periods/${periodId}/cash-flow`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.cashFlowStatement) {
          const cfs = data.cashFlowStatement
          return {
            canCalculate: true,
            data: {
              netIncome: cfs.netIncome || 0,
              depreciation: cfs.depreciation || 0,
              amortization: cfs.amortization || 0,
              changeInAccountsReceivable: cfs.changeInAccountsReceivable || 0,
              changeInInventory: cfs.changeInInventory || 0,
              changeInPrepaidExpenses: cfs.changeInPrepaidExpenses || 0,
              changeInOtherCurrentAssets: cfs.changeInOtherCurrentAssets || 0,
              changeInAccountsPayable: cfs.changeInAccountsPayable || 0,
              changeInAccruedExpenses: cfs.changeInAccruedExpenses || 0,
              changeInOtherCurrentLiabilities: cfs.changeInOtherCurrentLiabilities || 0,
              changeInDeferredTaxLiabilities: cfs.changeInDeferredTaxLiabilities || 0,
              cashFromOperations: cfs.cashFromOperations || 0,
              capitalExpenditures: cfs.capitalExpenditures || 0,
              changeInIntangibleAssets: cfs.changeInIntangibleAssets || 0,
              changeInOtherLongTermAssets: cfs.changeInOtherLongTermAssets || 0,
              cashFromInvesting: cfs.cashFromInvesting || 0,
              changeInCurrentPortionLtd: cfs.changeInCurrentPortionLtd || 0,
              changeInLongTermDebt: cfs.changeInLongTermDebt || 0,
              changeInOtherLongTermLiabilities: cfs.changeInOtherLongTermLiabilities || 0,
              changeInOwnersEquity: cfs.changeInOwnersEquity || 0,
              cashFromFinancing: cfs.cashFromFinancing || 0,
              netChangeInCash: cfs.netChangeInCash || 0,
              beginningCash: cfs.beginningCash || 0,
              endingCash: cfs.endingCash || 0,
              freeCashFlow: cfs.freeCashFlow || 0,
            },
          }
        }
        return {
          canCalculate: data.canCalculate ?? false,
          data: null,
          missingData: data.missingData,
        }
      }
    } catch (err) {
      console.error('Error loading cash flow for period', periodId, err)
    }
    return { canCalculate: false, data: null }
  }, [companyId])

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const loadedPeriods = await loadPeriods()
      if (loadedPeriods.length > 0) {
        const cfMap: Record<string, PeriodCashFlow> = {}
        await Promise.all(
          loadedPeriods.map(async (p: FinancialPeriod) => {
            cfMap[p.id] = await loadCashFlow(p.id)
          })
        )
        setPeriodCF(cfMap)
      }
      setIsLoading(false)
    }
    load()
  }, [loadPeriods, loadCashFlow])

  // ─── Render ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Cash flow needs prior-year balance sheet, so skip the first (earliest) period
  // since it will always show "Needs data"
  const cashFlowPeriods = periods.length > 1 ? periods.slice(1) : periods

  if (periods.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No periods found. Click &quot;Enter Manually&quot; to get started.
      </div>
    )
  }

  if (cashFlowPeriods.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Add at least two fiscal years of data to view cash flow statements.
      </div>
    )
  }

  // Helper: render a read-only value or a "needs data" message
  function CashFlowCell({ periodId, field }: { periodId: string; field: keyof CashFlowData }) {
    const cf = periodCF[periodId]
    if (!cf?.data) {
      return (
        <div className="h-9 flex items-center justify-center px-2 text-xs text-muted-foreground italic">
          <AlertCircle className="h-3 w-3 mr-1 shrink-0" />
          <span className="truncate">Needs data</span>
        </div>
      )
    }
    return <CalcCell value={cf.data[field]} format="currency" />
  }

  function CashFlowSubtotal({ periodId, field, highlight }: { periodId: string; field: keyof CashFlowData; highlight?: boolean }) {
    const cf = periodCF[periodId]
    if (!cf?.data) {
      return (
        <div className="h-9 flex items-center justify-center px-2 text-xs text-muted-foreground italic">
          --
        </div>
      )
    }
    return <CalcCell value={cf.data[field]} format="currency" highlight={highlight} />
  }

  return (
    <div className="space-y-6">
      {/* Info banner for periods that can't calculate */}
      {cashFlowPeriods.some(p => !periodCF[p.id]?.data) && (
        <div className="flex items-start gap-2 p-3 bg-orange-light text-orange-dark rounded-lg border border-orange/20 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Cash flow is auto-calculated from P&L and Balance Sheet data. Some periods are missing data.
            Enter P&L and Balance Sheet data first.
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <PeriodHeaders periods={cashFlowPeriods} />

          {/* ── Operating Activities ── */}
          <div className="space-y-3 mb-6">
            <SectionHeader icon={Activity} label="Operating Activities" bgColor="bg-green-light" textColor="text-green-dark" />

            <FormRow label="Net Income" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="netIncome" />}
            </FormRow>
            <FormRow label="Depreciation" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="depreciation" />}
            </FormRow>
            <FormRow label="Amortization" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="amortization" />}
            </FormRow>

            <p className="text-xs text-muted-foreground pl-8 font-medium uppercase tracking-wide">Working Capital Changes</p>
            <FormRow label="Chg. in A/R" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInAccountsReceivable" />}
            </FormRow>
            <FormRow label="Chg. in Inventory" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInInventory" />}
            </FormRow>
            <FormRow label="Chg. in Prepaid" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInPrepaidExpenses" />}
            </FormRow>
            <FormRow label="Chg. in Other CA" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInOtherCurrentAssets" />}
            </FormRow>
            <FormRow label="Chg. in A/P" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInAccountsPayable" />}
            </FormRow>
            <FormRow label="Chg. in Accrued" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInAccruedExpenses" />}
            </FormRow>
            <FormRow label="Chg. in Other CL" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInOtherCurrentLiabilities" />}
            </FormRow>
            <FormRow label="Chg. in Deferred Tax" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInDeferredTaxLiabilities" />}
            </FormRow>

            <FormRow label="Cash from Operations" periods={cashFlowPeriods}>
              {(p) => <CashFlowSubtotal periodId={p.id} field="cashFromOperations" highlight />}
            </FormRow>
          </div>

          {/* ── Investing Activities ── */}
          <div className="space-y-3 mb-6">
            <SectionHeader icon={TrendingDown} label="Investing Activities" bgColor="bg-orange-light" textColor="text-orange" />

            <FormRow label="Capital Expenditures" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="capitalExpenditures" />}
            </FormRow>
            <FormRow label="Chg. in Intangibles" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInIntangibleAssets" />}
            </FormRow>
            <FormRow label="Chg. in Other LT Assets" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInOtherLongTermAssets" />}
            </FormRow>

            <FormRow label="Cash from Investing" periods={cashFlowPeriods}>
              {(p) => <CashFlowSubtotal periodId={p.id} field="cashFromInvesting" highlight />}
            </FormRow>
          </div>

          {/* ── Financing Activities ── */}
          <div className="space-y-3 mb-6">
            <SectionHeader icon={Wallet} label="Financing Activities" bgColor="bg-purple-light" textColor="text-purple-dark" />

            <FormRow label="Chg. in Current LTD" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInCurrentPortionLtd" />}
            </FormRow>
            <FormRow label="Chg. in LT Debt" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInLongTermDebt" />}
            </FormRow>
            <FormRow label="Chg. in Other LT Liab." periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInOtherLongTermLiabilities" />}
            </FormRow>
            <FormRow label="Chg. in Owner's Equity" periods={cashFlowPeriods}>
              {(p) => <CashFlowCell periodId={p.id} field="changeInOwnersEquity" />}
            </FormRow>

            <FormRow label="Cash from Financing" periods={cashFlowPeriods}>
              {(p) => <CashFlowSubtotal periodId={p.id} field="cashFromFinancing" highlight />}
            </FormRow>
          </div>

          {/* ── Summary ── */}
          <div className="space-y-3">
            <SectionHeader icon={BarChart3} label="Summary" bgColor="bg-accent-light" textColor="text-primary" />

            <FormRow label="Net Change in Cash" periods={cashFlowPeriods}>
              {(p) => <CashFlowSubtotal periodId={p.id} field="netChangeInCash" />}
            </FormRow>
            <FormRow label="Beginning Cash" periods={cashFlowPeriods}>
              {(p) => <CashFlowSubtotal periodId={p.id} field="beginningCash" />}
            </FormRow>
            <FormRow label="Ending Cash" periods={cashFlowPeriods}>
              {(p) => <CashFlowSubtotal periodId={p.id} field="endingCash" />}
            </FormRow>
            <FormRow label="Free Cash Flow" periods={cashFlowPeriods}>
              {(p) => <CashFlowSubtotal periodId={p.id} field="freeCashFlow" highlight />}
            </FormRow>
          </div>
        </div>
      </div>
    </div>
  )
}
