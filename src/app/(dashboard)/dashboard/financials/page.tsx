'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCompany } from '@/contexts/CompanyContext'
import { AddPeriodDialog } from '@/components/financials/AddPeriodDialog'
import { FinancialTable, DataType, PeriodData } from '@/components/financials/FinancialTable'
import { QuickBooksStatus } from '@/components/financials/QuickBooksStatus'
import { FinancialSettingsModal } from '@/components/financials/FinancialSettingsModal'
import { Plus, Settings } from 'lucide-react'
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
          hasQuickBooksIntegration: data.hasIntegration || false,
          lastSyncedAt: data.lastSyncedAt || null,
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
        cash: bs?.cash ?? null,
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

      {/* Tab Navigation with Add Year button */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pnl">P&L</TabsTrigger>
            <TabsTrigger value="add-backs">Add-Backs</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Year
        </Button>
      </div>

      {/* Financial Table */}
      <FinancialTable
        periods={tablePeriods}
        dataType={activeTab}
        data={getTableData()}
        onYearClick={handleYearClick}
        loading={loading}
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
