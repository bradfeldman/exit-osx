'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, DollarSign, Calculator, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FinancialData {
  // P&L data
  grossRevenue?: number
  cogs?: number
  operatingExpenses?: number
  depreciation?: number | null
  amortization?: number | null
  interestExpense?: number | null
  taxExpense?: number | null
  // Add-backs
  totalAddBacks?: number
  // Cash Flow
  cashFromOperations?: number
  capitalExpenditures?: number
  freeCashFlow?: number
  // Owner Add-backs (for Owner Adjusted FCF)
  ownerSalaryAddBack?: number
  ownerPerksAddBack?: number
  otherDiscretionaryAddBacks?: number
}

interface PriorPeriodData {
  grossRevenue?: number
  ebitda?: number
  adjustedEbitda?: number
  freeCashFlow?: number
}

interface FinancialSummaryPanelProps {
  currentData: FinancialData
  priorData?: PriorPeriodData
  className?: string
  isLoading?: boolean
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function YoYIndicator({ current, prior }: { current?: number; prior?: number }) {
  if (current === undefined || prior === undefined || prior === 0) {
    return null
  }

  const change = ((current - prior) / Math.abs(prior)) * 100

  if (Math.abs(change) < 0.1) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>0%</span>
      </div>
    )
  }

  const isPositive = change > 0

  return (
    <div className={cn(
      "flex items-center gap-1 text-xs font-medium",
      isPositive ? "text-green-dark" : "text-red-dark"
    )}>
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>{formatPercent(change)}</span>
    </div>
  )
}

interface MetricRowProps {
  label: string
  value?: number
  priorValue?: number
  isHighlighted?: boolean
  isNegative?: boolean
  className?: string
}

function MetricRow({ label, value, priorValue, isHighlighted, isNegative, className }: MetricRowProps) {
  return (
    <div className={cn(
      "flex items-center justify-between py-2",
      isHighlighted && "bg-accent-light -mx-3 px-3 rounded-lg",
      className
    )}>
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-sm",
          isHighlighted ? "font-semibold text-primary" : "text-muted-foreground"
        )}>
          {label}
        </span>
        <YoYIndicator current={value} prior={priorValue} />
      </div>
      <span className={cn(
        "font-semibold tabular-nums",
        isHighlighted ? "text-primary" : isNegative ? "text-red-dark" : "text-foreground"
      )}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

export function FinancialSummaryPanel({
  currentData,
  priorData,
  className,
  isLoading
}: FinancialSummaryPanelProps) {
  const calculations = useMemo(() => {
    const grossRevenue = currentData.grossRevenue || 0
    const cogs = currentData.cogs || 0
    const operatingExpenses = currentData.operatingExpenses || 0  // This is Total Expenses in the UI
    const depreciation = currentData.depreciation || 0
    const amortization = currentData.amortization || 0
    const interestExpense = currentData.interestExpense || 0
    const taxExpense = currentData.taxExpense || 0

    const grossProfit = grossRevenue - cogs
    // EBITDA = Gross Profit - Total Expenses + D + A + I + T
    const ebitda = grossProfit - operatingExpenses + depreciation + amortization + interestExpense + taxExpense
    const totalAddBacks = currentData.totalAddBacks || 0
    const adjustedEbitda = ebitda + totalAddBacks

    // Free Cash Flow (if available from cash flow statement)
    const freeCashFlow = currentData.freeCashFlow

    // Owner Adjusted FCF
    const ownerAddBacks =
      (currentData.ownerSalaryAddBack || 0) +
      (currentData.ownerPerksAddBack || 0) +
      (currentData.otherDiscretionaryAddBacks || 0)
    const ownerAdjustedFCF = freeCashFlow !== undefined
      ? freeCashFlow + ownerAddBacks
      : undefined

    // Margins
    const grossMarginPct = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0
    const ebitdaMarginPct = grossRevenue > 0 ? (ebitda / grossRevenue) * 100 : 0
    const adjustedEbitdaMarginPct = grossRevenue > 0 ? (adjustedEbitda / grossRevenue) * 100 : 0

    return {
      grossRevenue,
      grossProfit,
      grossMarginPct,
      ebitda,
      ebitdaMarginPct,
      totalAddBacks,
      adjustedEbitda,
      adjustedEbitdaMarginPct,
      freeCashFlow,
      ownerAddBacks,
      ownerAdjustedFCF
    }
  }, [currentData])

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-4 bg-muted rounded w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("sticky top-6", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Profitability Section */}
        <div className="pb-2">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Profitability
            </span>
          </div>

          <MetricRow
            label="Revenue"
            value={calculations.grossRevenue}
            priorValue={priorData?.grossRevenue}
          />
          <MetricRow
            label="Gross Profit"
            value={calculations.grossProfit}
          />
          <div className="flex items-center justify-between py-1 text-xs text-muted-foreground">
            <span>Gross Margin</span>
            <span>{calculations.grossMarginPct.toFixed(1)}%</span>
          </div>
          <MetricRow
            label="EBITDA"
            value={calculations.ebitda}
            priorValue={priorData?.ebitda}
            isNegative={calculations.ebitda < 0}
          />
          <div className="flex items-center justify-between py-1 text-xs text-muted-foreground">
            <span>EBITDA Margin</span>
            <span>{calculations.ebitdaMarginPct.toFixed(1)}%</span>
          </div>
        </div>

        <div className="border-t pt-2 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Adjustments
            </span>
          </div>

          <MetricRow
            label="Net Add-backs"
            value={calculations.totalAddBacks}
          />
          <MetricRow
            label="Adjusted EBITDA"
            value={calculations.adjustedEbitda}
            priorValue={priorData?.adjustedEbitda}
            isHighlighted
            isNegative={calculations.adjustedEbitda < 0}
          />
          <div className="flex items-center justify-between py-1 text-xs text-muted-foreground">
            <span>Adj. EBITDA Margin</span>
            <span>{calculations.adjustedEbitdaMarginPct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Cash Flow Section */}
        <div className="border-t pt-2">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Cash Flow
            </span>
          </div>

          <MetricRow
            label="Free Cash Flow"
            value={calculations.freeCashFlow}
            priorValue={priorData?.freeCashFlow}
            isNegative={calculations.freeCashFlow !== undefined && calculations.freeCashFlow < 0}
          />
          <MetricRow
            label="Owner Adj. FCF"
            value={calculations.ownerAdjustedFCF}
            isHighlighted
            isNegative={calculations.ownerAdjustedFCF !== undefined && calculations.ownerAdjustedFCF < 0}
          />
          {calculations.ownerAddBacks > 0 && (
            <div className="flex items-center justify-between py-1 text-xs text-muted-foreground">
              <span>Owner Add-backs</span>
              <span>+{formatCurrency(calculations.ownerAddBacks)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
