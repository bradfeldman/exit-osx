'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

interface CashFlowTabProps {
  companyId: string
  periodId: string
  onDirty?: () => void
}

interface CashFlowStatement {
  periodId: string
  priorPeriodId: string | null
  // Operating Activities
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
  otherOperatingAdjustments: number
  cashFromOperations: number
  // Investing Activities
  capitalExpenditures: number
  changeInIntangibleAssets: number
  changeInOtherLongTermAssets: number
  otherInvestingActivities: number
  cashFromInvesting: number
  // Financing Activities
  changeInCurrentPortionLtd: number
  changeInLongTermDebt: number
  changeInOtherLongTermLiabilities: number
  changeInOwnersEquity: number
  otherFinancingActivities: number
  cashFromFinancing: number
  // Summary
  netChangeInCash: number
  beginningCash: number
  endingCash: number
  freeCashFlow: number
}

interface MissingData {
  currentPL?: boolean
  currentBS?: boolean
  priorBS?: boolean
  priorYear?: number
}

export function CashFlowTab({ companyId, periodId }: CashFlowTabProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [cashFlow, setCashFlow] = useState<CashFlowStatement | null>(null)
  const [canCalculate, setCanCalculate] = useState(false)
  const [missingData, setMissingData] = useState<MissingData | null>(null)
  const [isRecalculating, setIsRecalculating] = useState(false)

  const fetchCashFlow = useCallback(async () => {
    if (!companyId || !periodId) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/companies/${companyId}/financial-periods/${periodId}/cash-flow`
      )
      if (response.ok) {
        const data = await response.json()
        setCashFlow(data.cashFlowStatement || null)
        setCanCalculate(data.canCalculate || false)
        setMissingData(data.missingData || null)
      }
    } catch (error) {
      console.error('Failed to fetch cash flow:', error)
    } finally {
      setIsLoading(false)
    }
  }, [companyId, periodId])

  useEffect(() => {
    fetchCashFlow()
  }, [fetchCashFlow])

  const handleRecalculate = async () => {
    setIsRecalculating(true)
    await fetchCashFlow()
    setIsRecalculating(false)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // Show missing data message
  if (!cashFlow && !canCalculate && missingData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange" />
        <h3 className="font-semibold text-foreground mb-2">Cannot Calculate Cash Flow</h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          Cash Flow Statement requires both current and prior year data to calculate changes.
        </p>
        <div className="inline-block text-left bg-orange-light border border-orange/20 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-orange-dark mb-2">Missing data:</p>
          <ul className="text-sm text-orange-dark space-y-1">
            {missingData.currentPL && <li>- Current year P&L (Income Statement)</li>}
            {missingData.currentBS && <li>- Current year Balance Sheet</li>}
            {missingData.priorBS && (
              <li>- Prior year Balance Sheet ({missingData.priorYear})</li>
            )}
          </ul>
        </div>
        <p className="text-sm text-muted-foreground">
          Please complete the P&L and Balance Sheet tabs, and ensure prior year data exists.
        </p>
      </div>
    )
  }

  if (!cashFlow) {
    return (
      <div className="text-center py-12">
        <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="font-medium text-foreground">No cash flow data available</p>
        <p className="text-sm text-muted-foreground mt-2">
          Enter P&L and Balance Sheet data to calculate cash flow.
        </p>
      </div>
    )
  }

  const Section = ({
    icon: Icon,
    title,
    color,
    children,
  }: {
    icon: React.ComponentType<{ className?: string }>
    title: string
    color: string
    children: React.ReactNode
  }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <div className="ml-11">{children}</div>
    </div>
  )

  const LineItem = ({
    label,
    value,
    indent = false,
    isTotal = false,
  }: {
    label: string
    value: number
    indent?: boolean
    isTotal?: boolean
  }) => (
    <div
      className={`flex justify-between items-center py-2 px-3 ${
        isTotal ? 'bg-secondary rounded-lg font-semibold' : ''
      } ${indent ? 'pl-6' : ''}`}
    >
      <span className={`${isTotal ? 'text-foreground' : 'text-muted-foreground'} ${indent ? 'text-sm' : ''}`}>
        {label}
      </span>
      <span
        className={`font-medium ${
          value >= 0 ? 'text-foreground' : 'text-red-dark'
        } ${isTotal ? 'text-lg' : ''}`}
      >
        {value >= 0 ? formatCurrency(value) : `(${formatCurrency(Math.abs(value))})`}
      </span>
    </div>
  )

  const TotalLine = ({
    label,
    value,
    variant = 'default',
  }: {
    label: string
    value: number
    variant?: 'default' | 'success' | 'primary'
  }) => {
    const colors = {
      default: 'bg-secondary text-foreground',
      success: 'bg-green-light text-green-dark border-green/20',
      primary: 'bg-accent-light text-primary border-primary/20',
    }
    return (
      <div className={`flex justify-between items-center px-4 py-3 rounded-lg border ${colors[variant]}`}>
        <span className="font-semibold">{label}</span>
        <span className="font-bold text-lg">
          {value >= 0 ? formatCurrency(value) : `(${formatCurrency(Math.abs(value))})`}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Recalculate Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRecalculate}
          disabled={isRecalculating}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
          Recalculate from P&L & Balance Sheet
        </Button>
      </div>

      {/* Operating Activities */}
      <Section
        icon={ArrowUpCircle}
        title="Operating Activities"
        color="bg-green-light text-green-dark"
      >
        <div className="bg-white border border-border rounded-lg divide-y divide-border">
          <LineItem label="Net Income" value={cashFlow.netIncome} />
          <div className="py-1 px-3 text-xs font-medium text-muted-foreground bg-secondary">
            Adjustments to reconcile net income
          </div>
          <LineItem label="Depreciation" value={cashFlow.depreciation} indent />
          <LineItem label="Amortization" value={cashFlow.amortization} indent />
          <div className="py-1 px-3 text-xs font-medium text-muted-foreground bg-secondary">
            Changes in working capital
          </div>
          <LineItem label="Accounts Receivable" value={cashFlow.changeInAccountsReceivable} indent />
          <LineItem label="Inventory" value={cashFlow.changeInInventory} indent />
          <LineItem label="Prepaid Expenses" value={cashFlow.changeInPrepaidExpenses} indent />
          <LineItem label="Other Current Assets" value={cashFlow.changeInOtherCurrentAssets} indent />
          <LineItem label="Accounts Payable" value={cashFlow.changeInAccountsPayable} indent />
          <LineItem label="Accrued Expenses" value={cashFlow.changeInAccruedExpenses} indent />
          <LineItem label="Other Current Liabilities" value={cashFlow.changeInOtherCurrentLiabilities} indent />
          <LineItem label="Deferred Tax Liabilities" value={cashFlow.changeInDeferredTaxLiabilities} indent />
        </div>
        <div className="mt-3">
          <TotalLine label="Cash from Operations" value={cashFlow.cashFromOperations} variant="success" />
        </div>
      </Section>

      {/* Investing Activities */}
      <Section
        icon={ArrowDownCircle}
        title="Investing Activities"
        color="bg-orange-light text-orange"
      >
        <div className="bg-white border border-border rounded-lg divide-y divide-border">
          <LineItem label="Capital Expenditures (CapEx)" value={cashFlow.capitalExpenditures} />
          <LineItem label="Change in Intangible Assets" value={cashFlow.changeInIntangibleAssets} />
          <LineItem label="Change in Other Long-term Assets" value={cashFlow.changeInOtherLongTermAssets} />
        </div>
        <div className="mt-3">
          <TotalLine label="Cash from Investing" value={cashFlow.cashFromInvesting} />
        </div>
      </Section>

      {/* Financing Activities */}
      <Section
        icon={Wallet}
        title="Financing Activities"
        color="bg-purple-light text-purple-dark"
      >
        <div className="bg-white border border-border rounded-lg divide-y divide-border">
          <LineItem label="Change in Current Portion of LTD" value={cashFlow.changeInCurrentPortionLtd} />
          <LineItem label="Change in Long-term Debt" value={cashFlow.changeInLongTermDebt} />
          <LineItem label="Change in Other LT Liabilities" value={cashFlow.changeInOtherLongTermLiabilities} />
          <LineItem label="Change in Owner's Equity" value={cashFlow.changeInOwnersEquity} />
        </div>
        <div className="mt-3">
          <TotalLine label="Cash from Financing" value={cashFlow.cashFromFinancing} />
        </div>
      </Section>

      {/* Summary */}
      <Section
        icon={TrendingUp}
        title="Summary"
        color="bg-accent-light text-primary"
      >
        <div className="space-y-3">
          <div className="bg-white border border-border rounded-lg divide-y divide-border">
            <LineItem label="Net Change in Cash" value={cashFlow.netChangeInCash} isTotal />
            <LineItem label="Beginning Cash" value={cashFlow.beginningCash} />
            <LineItem label="Ending Cash" value={cashFlow.endingCash} />
          </div>

          <div className="p-4 bg-gradient-to-br from-accent-light to-accent-light rounded-xl border-2 border-primary/20">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold text-primary">Free Cash Flow</span>
                <p className="text-xs text-primary mt-0.5">
                  Cash from Operations - Capital Expenditures
                </p>
              </div>
              <span className={`font-bold text-2xl ${cashFlow.freeCashFlow >= 0 ? 'text-primary' : 'text-red-dark'}`}>
                {cashFlow.freeCashFlow >= 0
                  ? formatCurrency(cashFlow.freeCashFlow)
                  : `(${formatCurrency(Math.abs(cashFlow.freeCashFlow))})`}
              </span>
            </div>
          </div>

          {/* Validation */}
          {Math.abs(cashFlow.beginningCash + cashFlow.netChangeInCash - cashFlow.endingCash) > 0.01 && (
            <div className="p-3 bg-orange-light border border-orange/20 rounded-lg text-sm text-orange-dark">
              <strong>Note:</strong> The ending cash does not match beginning cash + net change.
              This may indicate data inconsistencies.
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
