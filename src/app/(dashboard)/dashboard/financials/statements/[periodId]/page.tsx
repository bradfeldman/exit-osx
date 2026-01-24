'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCompany } from '@/contexts/CompanyContext'
import { FinancialSummaryPanel } from '@/components/financials'
import { QuickBooksStatus } from '@/components/financials/QuickBooksStatus'
import { PLTab, PLData, BalanceSheetTab, AddBacksTab, CashFlowTab } from '@/components/financials/tabs'
import {
  FileText,
  Scale,
  PlusCircle,
  Wallet,
  ArrowLeft,
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { use } from 'react'

interface FinancialPeriod {
  id: string
  periodType: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY'
  fiscalYear: number
  label: string
  hasIncomeStatement: boolean
  hasBalanceSheet: boolean
  adjustmentCount: number
  priorPeriodId?: string | null
}

interface AddBacksData {
  totalAddBacks: number
  ownerSalaryAddBack?: number
  ownerPerksAddBack?: number
  otherDiscretionaryAddBacks?: number
}

interface CashFlowData {
  freeCashFlow?: number
  cashFromOperations?: number
}

interface IntegrationData {
  hasQuickBooks: boolean
  lastSyncedAt?: string | null
}

interface StatementsEditPageProps {
  params: Promise<{ periodId: string }>
  searchParams: Promise<{ tab?: string }>
}

function StatementsEditContent({ periodId, initialTab }: { periodId: string; initialTab: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedCompanyId } = useCompany()

  const [period, setPeriod] = useState<FinancialPeriod | null>(null)
  const [priorPeriod, setPriorPeriod] = useState<FinancialPeriod | null>(null)
  const [allPeriods, setAllPeriods] = useState<FinancialPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Financial data for summary panel
  const [plData, setPlData] = useState<PLData | null>(null)
  const [addBacksData, setAddBacksData] = useState<AddBacksData | null>(null)
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null)
  const [integrationData, setIntegrationData] = useState<IntegrationData | null>(null)

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`/dashboard/financials/statements/${periodId}?${params.toString()}`, { scroll: false })
  }

  // Fetch period data
  const fetchPeriod = useCallback(async () => {
    if (!selectedCompanyId || !periodId) return

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/financial-periods`)
      if (response.ok) {
        const data = await response.json()
        const periods: FinancialPeriod[] = data.periods || []

        // Sort periods by fiscal year for navigation
        const sortedPeriods = [...periods].sort((a, b) => a.fiscalYear - b.fiscalYear)
        setAllPeriods(sortedPeriods)

        const currentPeriod = periods.find(p => p.id === periodId)
        if (currentPeriod) {
          setPeriod(currentPeriod)

          // Find prior year period
          const prior = periods.find(p =>
            p.periodType === currentPeriod.periodType &&
            p.fiscalYear === currentPeriod.fiscalYear - 1
          )
          setPriorPeriod(prior || null)
        }
      }
    } catch (error) {
      console.error('Failed to fetch period:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId, periodId])

  // Fetch integration data
  const fetchIntegrationData = useCallback(async () => {
    if (!selectedCompanyId) return

    try {
      const response = await fetch(`/api/integrations/quickbooks?companyId=${selectedCompanyId}`)
      if (response.ok) {
        const data = await response.json()
        setIntegrationData({
          hasQuickBooks: data.hasIntegration || false,
          lastSyncedAt: data.lastSyncedAt || null,
        })
      }
    } catch (error) {
      console.error('Failed to fetch integration data:', error)
    }
  }, [selectedCompanyId])

  // Fetch add-backs data
  const fetchAddBacksData = useCallback(async () => {
    if (!selectedCompanyId || !periodId) return

    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/adjustments?periodId=${periodId}`
      )
      if (response.ok) {
        const data = await response.json()
        const adjustments = data.adjustments || []

        // Calculate totals
        const totalAddBacks = adjustments
          .filter((a: { type: string; amount: number; frequency: string }) => a.type === 'ADD_BACK')
          .reduce((sum: number, a: { amount: number; frequency: string }) => {
            const amount = Number(a.amount)
            return sum + (a.frequency === 'MONTHLY' ? amount * 12 : amount)
          }, 0)

        // Find owner-specific add-backs
        const ownerSalaryAddBack = adjustments
          .filter((a: { description: string; type: string }) =>
            a.type === 'ADD_BACK' &&
            a.description.toLowerCase().includes('salary')
          )
          .reduce((sum: number, a: { amount: number; frequency: string }) => {
            const amount = Number(a.amount)
            return sum + (a.frequency === 'MONTHLY' ? amount * 12 : amount)
          }, 0)

        const ownerPerksAddBack = adjustments
          .filter((a: { description: string; type: string }) =>
            a.type === 'ADD_BACK' &&
            (a.description.toLowerCase().includes('perk') ||
             a.description.toLowerCase().includes('auto') ||
             a.description.toLowerCase().includes('travel'))
          )
          .reduce((sum: number, a: { amount: number; frequency: string }) => {
            const amount = Number(a.amount)
            return sum + (a.frequency === 'MONTHLY' ? amount * 12 : amount)
          }, 0)

        setAddBacksData({
          totalAddBacks,
          ownerSalaryAddBack,
          ownerPerksAddBack,
          otherDiscretionaryAddBacks: totalAddBacks - ownerSalaryAddBack - ownerPerksAddBack,
        })
      }
    } catch (error) {
      console.error('Failed to fetch add-backs data:', error)
    }
  }, [selectedCompanyId, periodId])

  // Fetch cash flow data
  const fetchCashFlowData = useCallback(async () => {
    if (!selectedCompanyId || !periodId) return

    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/financial-periods/${periodId}/cash-flow`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.cashFlowStatement) {
          setCashFlowData({
            freeCashFlow: data.cashFlowStatement.freeCashFlow,
            cashFromOperations: data.cashFlowStatement.cashFromOperations,
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch cash flow data:', error)
    }
  }, [selectedCompanyId, periodId])

  // Fetch P&L data for summary panel (so it shows even when not on P&L tab)
  const fetchPLData = useCallback(async () => {
    if (!selectedCompanyId || !periodId) return

    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/financial-periods/${periodId}/income-statement`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.incomeStatement) {
          const is = data.incomeStatement
          setPlData({
            grossRevenue: is.grossRevenue,
            cogs: is.cogs,
            totalExpenses: is.operatingExpenses,  // API uses operatingExpenses, UI uses totalExpenses
            grossProfit: is.grossProfit,
            grossMarginPct: is.grossMarginPct,
            ebitda: is.ebitda,
            ebitdaMarginPct: is.ebitdaMarginPct,
            depreciation: is.depreciation ?? 0,
            amortization: is.amortization ?? 0,
            interestExpense: is.interestExpense ?? 0,
            taxExpense: is.taxExpense ?? 0,
            netOperatingIncome: 0,  // Calculated on frontend, not stored in API
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch P&L data:', error)
    }
  }, [selectedCompanyId, periodId])

  useEffect(() => {
    fetchPeriod()
    fetchIntegrationData()
  }, [fetchPeriod, fetchIntegrationData])

  useEffect(() => {
    if (period) {
      fetchPLData()
      fetchAddBacksData()
      fetchCashFlowData()
    }
  }, [period, fetchPLData, fetchAddBacksData, fetchCashFlowData])

  // Handle P&L data updates from the PLTab
  const handlePLDataChange = (data: PLData) => {
    setPlData(data)
  }

  // Handle dirty state
  const handleDirty = () => {
    setHasChanges(true)
  }

  // Handle save
  const handleSave = async () => {
    setIsSaving(true)
    // The actual saving is handled by the individual tab components with auto-save
    // This manual save is for user confirmation
    await new Promise(resolve => setTimeout(resolve, 500))
    setHasChanges(false)
    setIsSaving(false)
  }

  if (!selectedCompanyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Statements</h1>
          <p className="text-gray-600">Select a company to view and manage financial data</p>
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (!period) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/financials"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Financials
        </Link>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-gray-500">Period not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/financials"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Financials
      </Link>

      {/* Header with Year Navigation */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {(() => {
              const currentIndex = allPeriods.findIndex(p => p.id === periodId)
              const prevPeriod = currentIndex > 0 ? allPeriods[currentIndex - 1] : null
              return prevPeriod ? (
                <button
                  onClick={() => router.push(`/dashboard/financials/statements/${prevPeriod.id}?tab=${activeTab}`)}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900"
                  title={`Previous: ${prevPeriod.label}`}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              ) : (
                <div className="w-9" />
              )
            })()}
            <h1 className="text-2xl font-bold text-gray-900">{period.label}</h1>
            {(() => {
              const currentIndex = allPeriods.findIndex(p => p.id === periodId)
              const nextPeriod = currentIndex >= 0 && currentIndex < allPeriods.length - 1 ? allPeriods[currentIndex + 1] : null
              return nextPeriod ? (
                <button
                  onClick={() => router.push(`/dashboard/financials/statements/${nextPeriod.id}?tab=${activeTab}`)}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900"
                  title={`Next: ${nextPeriod.label}`}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              ) : (
                <div className="w-9" />
              )
            })()}
          </div>
          <p className="text-gray-600">Edit financial statements for this fiscal year</p>
        </div>
        <div className="flex items-center gap-4">
          <QuickBooksStatus
            isConnected={integrationData?.hasQuickBooks || false}
            lastSyncedAt={integrationData?.lastSyncedAt}
          />
          {hasChanges && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs Content */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="pnl" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">P&L</span>
              </TabsTrigger>
              <TabsTrigger value="balance-sheet" className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                <span className="hidden sm:inline">Balance Sheet</span>
              </TabsTrigger>
              <TabsTrigger value="add-backs" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Add-Backs</span>
              </TabsTrigger>
              <TabsTrigger value="cash-flow" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Cash Flow</span>
              </TabsTrigger>
            </TabsList>

            <Card>
              <CardContent className="p-6">
                <TabsContent value="pnl" className="mt-0">
                  <PLTab
                    companyId={selectedCompanyId}
                    periodId={periodId}
                    onDataChange={handlePLDataChange}
                    onDirty={handleDirty}
                  />
                </TabsContent>

                <TabsContent value="balance-sheet" className="mt-0">
                  <BalanceSheetTab
                    companyId={selectedCompanyId}
                    periodId={periodId}
                    onDirty={handleDirty}
                  />
                </TabsContent>

                <TabsContent value="add-backs" className="mt-0">
                  <AddBacksTab
                    companyId={selectedCompanyId}
                    periodId={periodId}
                    onDirty={handleDirty}
                  />
                </TabsContent>

                <TabsContent value="cash-flow" className="mt-0">
                  <CashFlowTab
                    companyId={selectedCompanyId}
                    periodId={periodId}
                    onDirty={handleDirty}
                  />
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>

        {/* Financial Summary Panel */}
        <div className="lg:col-span-1">
          <FinancialSummaryPanel
            currentData={{
              grossRevenue: plData?.grossRevenue,
              cogs: plData?.cogs,
              operatingExpenses: plData?.totalExpenses,  // PLData uses totalExpenses, prop uses operatingExpenses
              depreciation: plData?.depreciation,
              amortization: plData?.amortization,
              interestExpense: plData?.interestExpense,
              taxExpense: plData?.taxExpense,
              totalAddBacks: addBacksData?.totalAddBacks,
              freeCashFlow: cashFlowData?.freeCashFlow,
              ownerSalaryAddBack: addBacksData?.ownerSalaryAddBack,
              ownerPerksAddBack: addBacksData?.ownerPerksAddBack,
              otherDiscretionaryAddBacks: addBacksData?.otherDiscretionaryAddBacks,
            }}
            isLoading={false}
          />
        </div>
      </div>

      {/* Prior Year Info */}
      {priorPeriod && (
        <p className="text-sm text-gray-500">
          Prior year reference: <span className="font-medium">{priorPeriod.label}</span>
        </p>
      )}
    </div>
  )
}

export default function StatementsEditPage({ params, searchParams }: StatementsEditPageProps) {
  const { periodId } = use(params)
  const { tab = 'pnl' } = use(searchParams)

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <StatementsEditContent periodId={periodId} initialTab={tab} />
    </Suspense>
  )
}
