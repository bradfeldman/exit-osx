'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCompany } from '@/contexts/CompanyContext'
import { AddPeriodDialog } from '@/components/financials/AddPeriodDialog'
import { FinancialTable, DataType, PeriodData, PendingChange } from '@/components/financials/FinancialTable'
import { QuickBooksStatus } from '@/components/financials/QuickBooksStatus'
import { FinancialSettingsModal } from '@/components/financials/FinancialSettingsModal'
import { Plus, Settings, Pencil, X, Save, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface FinancialPeriod {
  id: string
  periodType: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY'
  fiscalYear: number
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null
  month?: number | null
  startDate: string
  endDate: string
  label: string
  hasIncomeStatement: boolean
  hasBalanceSheet: boolean
  adjustmentCount: number
  ebitda: number | null
  createdAt: string
}

interface IncomeStatement {
  grossRevenue: number
  cogs: number
  grossProfit: number
  grossMarginPct: number
  operatingExpenses: number
  ebitda: number
  ebitdaMarginPct: number
  depreciation?: number
  amortization?: number
  interestExpense?: number
  taxExpense?: number
  netIncome?: number
}

interface Adjustment {
  id: string
  type: 'ADD_BACK' | 'DEDUCTION'
  amount: number
  description: string
}

interface CashFlowStatement {
  freeCashFlow: number
  cashFromOperations: number
  cashFromInvesting: number
  cashFromFinancing: number
  netIncome?: number
  depreciation?: number
  amortization?: number
  capitalExpenditures?: number
  netChangeInCash?: number
}

interface BalanceSheet {
  // Current Assets
  cashAndEquivalents?: number
  accountsReceivable?: number
  inventory?: number
  prepaidExpenses?: number
  otherCurrentAssets?: number
  totalCurrentAssets?: number
  // Long-term Assets
  ppeGross?: number
  accumulatedDepreciation?: number
  intangibleAssets?: number
  otherLongTermAssets?: number
  totalAssets?: number
  // Current Liabilities
  accountsPayable?: number
  accruedExpenses?: number
  currentPortionLtd?: number
  otherCurrentLiabilities?: number
  totalCurrentLiabilities?: number
  // Long-term Liabilities
  longTermDebt?: number
  deferredTaxLiabilities?: number
  otherLongTermLiabilities?: number
  totalLiabilities?: number
  // Equity
  retainedEarnings?: number
  ownersEquity?: number
  totalEquity?: number
}

interface PeriodWithData extends FinancialPeriod {
  incomeStatement?: IncomeStatement | null
  adjustments?: Adjustment[]
  cashFlowStatement?: CashFlowStatement | null
  balanceSheet?: BalanceSheet | null
  netAddBacks?: number
  adjustedEbitda?: number
}

interface IntegrationData {
  hasQuickBooksIntegration: boolean
  lastSyncedAt: string | null
}

function FinancialsOverviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedCompanyId } = useCompany()

  const tabFromUrl = searchParams.get('tab') || 'pnl'
  const [activeTab, setActiveTab] = useState<DataType>(tabFromUrl as DataType)

  const [periods, setPeriods] = useState<PeriodWithData[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [integrationData, setIntegrationData] = useState<IntegrationData>({
    hasQuickBooksIntegration: false,
    lastSyncedAt: null,
  })

  // Bulk edit state
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map())
  const [isSaving, setIsSaving] = useState(false)

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value as DataType)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`/dashboard/financials?${params.toString()}`, { scroll: false })
  }

  const loadIntegrationData = useCallback(async () => {
    if (!selectedCompanyId) return

    try {
      const response = await fetch(`/api/integrations/quickbooks?companyId=${selectedCompanyId}`)
      if (response.ok) {
        const data = await response.json()
        setIntegrationData({
          hasQuickBooksIntegration: data.connected || false,
          lastSyncedAt: data.integration?.lastSyncAt || null,
        })
      }
    } catch (error) {
      console.error('Error loading integration data:', error)
    }
  }, [selectedCompanyId])

  const loadPeriods = useCallback(async () => {
    if (!selectedCompanyId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/financial-periods`)
      if (response.ok) {
        const data = await response.json()
        const fetchedPeriods: FinancialPeriod[] = data.periods || []

        // Fetch all data for each period
        const periodsWithData: PeriodWithData[] = await Promise.all(
          fetchedPeriods.map(async (period) => {
            let incomeStatement = null
            let adjustments: Adjustment[] = []
            let cashFlowStatement: CashFlowStatement | null = null
            let balanceSheet: BalanceSheet | null = null

            // Fetch income statement
            if (period.hasIncomeStatement) {
              try {
                const incomeRes = await fetch(
                  `/api/companies/${selectedCompanyId}/financial-periods/${period.id}/income-statement`
                )
                if (incomeRes.ok) {
                  const incomeData = await incomeRes.json()
                  incomeStatement = incomeData.incomeStatement
                }
              } catch (err) {
                console.error('Error fetching income statement:', err)
              }
            }

            // Fetch balance sheet
            if (period.hasBalanceSheet) {
              try {
                const bsRes = await fetch(
                  `/api/companies/${selectedCompanyId}/financial-periods/${period.id}/balance-sheet`
                )
                if (bsRes.ok) {
                  const bsData = await bsRes.json()
                  balanceSheet = bsData.balanceSheet
                }
              } catch (err) {
                console.error('Error fetching balance sheet:', err)
              }
            }

            // Fetch adjustments
            try {
              const adjRes = await fetch(
                `/api/companies/${selectedCompanyId}/adjustments?periodId=${period.id}`
              )
              if (adjRes.ok) {
                const adjData = await adjRes.json()
                adjustments = adjData.adjustments || []
              }
            } catch (err) {
              console.error('Error fetching adjustments:', err)
            }

            // Fetch cash flow statement
            try {
              const cfsRes = await fetch(
                `/api/companies/${selectedCompanyId}/financial-periods/${period.id}/cash-flow`
              )
              if (cfsRes.ok) {
                const cfsData = await cfsRes.json()
                if (cfsData.cashFlowStatement) {
                  cashFlowStatement = cfsData.cashFlowStatement
                }
              }
            } catch (err) {
              console.error('Error fetching cash flow:', err)
            }

            // Calculate add-backs
            const netAddBacks = adjustments.reduce((sum, adj) => {
              const amount = Number(adj.amount) || 0
              return sum + (adj.type === 'ADD_BACK' ? amount : -amount)
            }, 0)

            const ebitda = Number(incomeStatement?.ebitda) || 0
            const adjustedEbitda = ebitda + netAddBacks

            return {
              ...period,
              incomeStatement,
              adjustments,
              cashFlowStatement,
              balanceSheet,
              netAddBacks,
              adjustedEbitda,
            }
          })
        )

        const sortedPeriods = periodsWithData.sort((a, b) => a.fiscalYear - b.fiscalYear)
        setPeriods(sortedPeriods)
      }
    } catch (error) {
      console.error('Error loading periods:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    loadPeriods()
    loadIntegrationData()
  }, [loadPeriods, loadIntegrationData])

  const handlePeriodCreated = (newPeriod: FinancialPeriod) => {
    router.push(`/dashboard/financials/statements/${newPeriod.id}?tab=pnl`)
  }

  const handleYearClick = (periodId: string) => {
    router.push(`/dashboard/financials/statements/${periodId}?tab=${activeTab}`)
  }

  // Bulk edit handlers
  const handleEnterBulkEdit = () => {
    setBulkEditMode(true)
    setPendingChanges(new Map())
  }

  const handleCancelBulkEdit = () => {
    setBulkEditMode(false)
    setPendingChanges(new Map())
  }

  const handleCellChange = (periodId: string, field: string, value: number) => {
    const tableData = getTableData()
    const originalValue = tableData[periodId]?.[field as keyof PeriodData] as number | null ?? null

    setPendingChanges((prev) => {
      const next = new Map(prev)
      const key = `${periodId}-${field}`

      // If value equals original, remove the change
      if (value === originalValue) {
        next.delete(key)
      } else {
        next.set(key, {
          periodId,
          field,
          originalValue,
          newValue: value,
        })
      }
      return next
    })
  }

  const handleSaveAll = async () => {
    if (pendingChanges.size === 0) {
      setBulkEditMode(false)
      return
    }

    setIsSaving(true)

    try {
      // Group changes by periodId and type (pnl vs balance-sheet)
      const changesByPeriod = new Map<string, { pnl: Record<string, number>; balanceSheet: Record<string, number> }>()

      const pnlFields = ['grossRevenue', 'cogs', 'operatingExpenses']
      const balanceSheetFields = [
        'cash', 'accountsReceivable', 'inventory', 'otherCurrentAssets',
        'ppeNet', 'intangibleAssets', 'otherLongTermAssets',
        'accountsPayable', 'accruedExpenses', 'currentPortionLtd', 'otherCurrentLiabilities',
        'longTermDebt', 'otherLongTermLiabilities',
        'retainedEarnings', 'ownersEquity'
      ]

      pendingChanges.forEach((change) => {
        if (!changesByPeriod.has(change.periodId)) {
          changesByPeriod.set(change.periodId, { pnl: {}, balanceSheet: {} })
        }
        const periodChanges = changesByPeriod.get(change.periodId)!

        if (pnlFields.includes(change.field)) {
          periodChanges.pnl[change.field] = change.newValue
        } else if (balanceSheetFields.includes(change.field)) {
          // Map field names to API field names
          const fieldMapping: Record<string, string> = {
            cash: 'cashAndEquivalents',
            ppeNet: 'ppeGross', // Note: API uses ppeGross, we'll handle this specially
          }
          const apiField = fieldMapping[change.field] || change.field
          periodChanges.balanceSheet[apiField] = change.newValue
        }
      })

      // Execute API calls for each period
      const savePromises: Promise<Response>[] = []

      changesByPeriod.forEach((changes, periodId) => {
        // Save P&L changes
        if (Object.keys(changes.pnl).length > 0) {
          // Get existing P&L data to merge
          const period = periods.find(p => p.id === periodId)
          const existingPnl = period?.incomeStatement

          const pnlPayload = {
            grossRevenue: changes.pnl.grossRevenue ?? existingPnl?.grossRevenue ?? 0,
            cogs: changes.pnl.cogs ?? existingPnl?.cogs ?? 0,
            operatingExpenses: changes.pnl.operatingExpenses ?? existingPnl?.operatingExpenses ?? 0,
          }

          savePromises.push(
            fetch(`/api/companies/${selectedCompanyId}/financial-periods/${periodId}/income-statement`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pnlPayload),
            })
          )
        }

        // Save Balance Sheet changes
        if (Object.keys(changes.balanceSheet).length > 0) {
          const period = periods.find(p => p.id === periodId)
          const existingBs = period?.balanceSheet

          const bsPayload = {
            cashAndEquivalents: changes.balanceSheet.cashAndEquivalents ?? existingBs?.cashAndEquivalents ?? 0,
            accountsReceivable: changes.balanceSheet.accountsReceivable ?? existingBs?.accountsReceivable ?? 0,
            inventory: changes.balanceSheet.inventory ?? existingBs?.inventory ?? 0,
            prepaidExpenses: existingBs?.prepaidExpenses ?? 0,
            otherCurrentAssets: changes.balanceSheet.otherCurrentAssets ?? existingBs?.otherCurrentAssets ?? 0,
            ppeGross: changes.balanceSheet.ppeGross ?? existingBs?.ppeGross ?? 0,
            accumulatedDepreciation: existingBs?.accumulatedDepreciation ?? 0,
            intangibleAssets: changes.balanceSheet.intangibleAssets ?? existingBs?.intangibleAssets ?? 0,
            otherLongTermAssets: changes.balanceSheet.otherLongTermAssets ?? existingBs?.otherLongTermAssets ?? 0,
            accountsPayable: changes.balanceSheet.accountsPayable ?? existingBs?.accountsPayable ?? 0,
            accruedExpenses: changes.balanceSheet.accruedExpenses ?? existingBs?.accruedExpenses ?? 0,
            currentPortionLtd: changes.balanceSheet.currentPortionLtd ?? existingBs?.currentPortionLtd ?? 0,
            otherCurrentLiabilities: changes.balanceSheet.otherCurrentLiabilities ?? existingBs?.otherCurrentLiabilities ?? 0,
            longTermDebt: changes.balanceSheet.longTermDebt ?? existingBs?.longTermDebt ?? 0,
            deferredTaxLiabilities: existingBs?.deferredTaxLiabilities ?? 0,
            otherLongTermLiabilities: changes.balanceSheet.otherLongTermLiabilities ?? existingBs?.otherLongTermLiabilities ?? 0,
            retainedEarnings: changes.balanceSheet.retainedEarnings ?? existingBs?.retainedEarnings ?? 0,
            ownersEquity: changes.balanceSheet.ownersEquity ?? existingBs?.ownersEquity ?? 0,
          }

          savePromises.push(
            fetch(`/api/companies/${selectedCompanyId}/financial-periods/${periodId}/balance-sheet`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bsPayload),
            })
          )
        }
      })

      // Wait for all saves to complete
      const results = await Promise.allSettled(savePromises)

      // Check for failures
      const failures = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok))
      if (failures.length > 0) {
        console.error('Some saves failed:', failures)
      }

      // Reload data
      await loadPeriods()

      // Exit bulk edit mode
      setBulkEditMode(false)
      setPendingChanges(new Map())
    } catch (error) {
      console.error('Error saving changes:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Transform periods data for the table
  const getTableData = (): Record<string, PeriodData> => {
    const result: Record<string, PeriodData> = {}

    for (const period of periods) {
      const totalAddBacks = period.adjustments
        ?.filter((a) => a.type === 'ADD_BACK')
        .reduce((sum, a) => sum + (Number(a.amount) || 0), 0) || 0

      const totalDeductions = period.adjustments
        ?.filter((a) => a.type === 'DEDUCTION')
        .reduce((sum, a) => sum + (Number(a.amount) || 0), 0) || 0

      const bs = period.balanceSheet
      const cfs = period.cashFlowStatement
      const is = period.incomeStatement

      result[period.id] = {
        // P&L
        grossRevenue: is?.grossRevenue ?? null,
        cogs: is?.cogs ?? null,
        grossProfit: is?.grossProfit ?? null,
        grossMarginPct: is?.grossMarginPct ?? null,
        operatingExpenses: is?.operatingExpenses ?? null,
        ebitda: is?.ebitda ?? null,
        ebitdaMarginPct: is?.ebitdaMarginPct ?? null,
        // Add-backs
        totalAddBacks: totalAddBacks,
        totalDeductions: totalDeductions,
        netAdjustment: period.netAddBacks ?? 0,
        adjustedEbitda: period.adjustedEbitda ?? null,
        // Balance sheet
        cash: bs?.cashAndEquivalents ?? null,
        accountsReceivable: bs?.accountsReceivable ?? null,
        inventory: bs?.inventory ?? null,
        otherCurrentAssets: bs ? (bs.prepaidExpenses || 0) + (bs.otherCurrentAssets || 0) : null,
        totalCurrentAssets: bs?.totalCurrentAssets ?? null,
        ppeNet: bs?.ppeGross != null
          ? (bs.ppeGross || 0) - (bs.accumulatedDepreciation || 0)
          : null,
        intangibleAssets: bs?.intangibleAssets ?? null,
        otherLongTermAssets: bs?.otherLongTermAssets ?? null,
        totalAssets: bs?.totalAssets ?? null,
        accountsPayable: bs?.accountsPayable ?? null,
        accruedExpenses: bs?.accruedExpenses ?? null,
        currentPortionLtd: bs?.currentPortionLtd ?? null,
        otherCurrentLiabilities: bs?.otherCurrentLiabilities ?? null,
        totalCurrentLiabilities: bs?.totalCurrentLiabilities ?? null,
        longTermDebt: bs?.longTermDebt ?? null,
        otherLongTermLiabilities: bs
          ? (bs.deferredTaxLiabilities || 0) + (bs.otherLongTermLiabilities || 0)
          : null,
        totalLiabilities: bs?.totalLiabilities ?? null,
        retainedEarnings: bs?.retainedEarnings ?? null,
        ownersEquity: bs?.ownersEquity ?? null,
        totalEquity: bs?.totalEquity ?? null,
        // Cash flow
        netIncome: cfs?.netIncome ?? is?.netIncome ?? null,
        depreciationAmortization: (cfs || is)
          ? (cfs?.depreciation || is?.depreciation || 0) + (cfs?.amortization || is?.amortization || 0)
          : null,
        workingCapitalChanges: null, // Calculated field - would need more data
        cashFromOperations: cfs?.cashFromOperations ?? null,
        capitalExpenditures: cfs?.capitalExpenditures ?? null,
        otherInvesting: null, // Calculated field
        cashFromInvesting: cfs?.cashFromInvesting ?? null,
        debtChanges: null, // Calculated field
        equityChanges: null, // Calculated field
        cashFromFinancing: cfs?.cashFromFinancing ?? null,
        netChangeInCash: cfs?.netChangeInCash ?? null,
        freeCashFlow: cfs?.freeCashFlow ?? null,
      }
    }

    return result
  }

  // Get periods in format for FinancialTable
  const tablePeriods = periods.map((p) => ({
    id: p.id,
    label: p.label,
    fiscalYear: p.fiscalYear,
  }))

  if (!selectedCompanyId) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
          <p className="text-gray-600">Select a company to view financial data</p>
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
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
          <p className="text-gray-600">View and compare financial performance across years</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setShowSettingsModal(true)}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* QuickBooks Status */}
      <QuickBooksStatus
        isConnected={integrationData.hasQuickBooksIntegration}
        lastSyncedAt={integrationData.lastSyncedAt}
      />

      {/* Tab Navigation with Add Year and Bulk Edit buttons */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pnl" disabled={bulkEditMode}>P&L</TabsTrigger>
            <TabsTrigger value="add-backs" disabled={bulkEditMode}>Add-Backs</TabsTrigger>
            <TabsTrigger value="balance-sheet" disabled={bulkEditMode}>Balance Sheet</TabsTrigger>
            <TabsTrigger value="cash-flow" disabled={bulkEditMode}>Cash Flow</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          {bulkEditMode ? (
            <>
              <Button variant="outline" onClick={handleCancelBulkEdit} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSaveAll} disabled={isSaving || pendingChanges.size === 0}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save All {pendingChanges.size > 0 && `(${pendingChanges.size})`}
              </Button>
            </>
          ) : (
            <>
              {(activeTab === 'pnl' || activeTab === 'balance-sheet') && periods.length > 0 && (
                <Button variant="outline" onClick={handleEnterBulkEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Bulk Edit
                </Button>
              )}
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Year
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Financial Table */}
      <FinancialTable
        periods={tablePeriods}
        dataType={activeTab}
        data={getTableData()}
        onYearClick={handleYearClick}
        loading={loading}
        bulkEditMode={bulkEditMode}
        pendingChanges={pendingChanges}
        onCellChange={handleCellChange}
      />

      {/* Add Period Dialog */}
      <AddPeriodDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        companyId={selectedCompanyId}
        onPeriodCreated={handlePeriodCreated}
      />

      {/* Settings Modal */}
      <FinancialSettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        companyId={selectedCompanyId}
        isQuickBooksConnected={integrationData.hasQuickBooksIntegration}
        lastSyncedAt={integrationData.lastSyncedAt}
        onSaved={() => {
          // Optionally reload data after settings change
        }}
      />
    </div>
  )
}

export default function FinancialsOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 max-w-6xl">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
            <p className="text-gray-600">View and manage your financial data</p>
          </div>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </div>
      }
    >
      <FinancialsOverviewContent />
    </Suspense>
  )
}
