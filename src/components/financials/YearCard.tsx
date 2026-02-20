'use client'

import { Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type DataType = 'pnl' | 'add-backs' | 'balance-sheet' | 'cash-flow'

interface YearCardData {
  // P&L metrics
  grossRevenue?: number | null
  grossProfit?: number | null
  ebitda?: number | null
  // Add-backs metrics
  totalAddBacks?: number | null
  adjustedEbitda?: number | null
  // Balance Sheet metrics
  totalAssets?: number | null
  totalEquity?: number | null
  // Cash Flow metrics
  freeCashFlow?: number | null
  ownerAdjustedFCF?: number | null
}

export interface YearCardPeriod {
  id: string
  label: string
  fiscalYear: number
  hasIncomeStatement: boolean
  hasBalanceSheet: boolean
  adjustmentCount: number
}

interface YearCardProps {
  period: YearCardPeriod
  data: YearCardData
  dataType: DataType
  onEdit: () => void
  className?: string
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function getDataStatus(period: YearCardPeriod, dataType: DataType): boolean {
  switch (dataType) {
    case 'pnl':
      return period.hasIncomeStatement
    case 'balance-sheet':
      return period.hasBalanceSheet
    case 'add-backs':
      return period.adjustmentCount > 0
    case 'cash-flow':
      return period.hasIncomeStatement // FCF is calculated from P&L
    default:
      return false
  }
}

interface MetricRowProps {
  label: string
  value: number | null | undefined
  highlight?: boolean
}

function MetricRow({ label, value, highlight }: MetricRowProps) {
  return (
    <div className={cn(
      'flex justify-between items-center py-1.5',
      highlight && 'bg-accent-light -mx-2 px-2 rounded'
    )}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn(
        'text-sm font-medium',
        highlight ? 'text-primary' : 'text-foreground'
      )}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

export function YearCard({
  period,
  data,
  dataType,
  onEdit,
  className,
}: YearCardProps) {
  const hasData = getDataStatus(period, dataType)

  const renderMetrics = () => {
    switch (dataType) {
      case 'pnl':
        return (
          <>
            <MetricRow label="Revenue" value={data.grossRevenue} />
            <MetricRow label="Gross Profit" value={data.grossProfit} />
            <MetricRow label="EBITDA" value={data.ebitda} highlight />
          </>
        )
      case 'add-backs':
        return (
          <>
            <MetricRow label="Total Add-Backs" value={data.totalAddBacks} />
            <MetricRow label="Adjusted EBITDA" value={data.adjustedEbitda} highlight />
          </>
        )
      case 'balance-sheet':
        return (
          <>
            <MetricRow label="Total Assets" value={data.totalAssets} />
            <MetricRow label="Total Equity" value={data.totalEquity} highlight />
          </>
        )
      case 'cash-flow':
        return (
          <>
            <MetricRow label="Free Cash Flow" value={data.freeCashFlow} />
            <MetricRow label="Owner Adj. FCF" value={data.ownerAdjustedFCF} highlight />
          </>
        )
      default:
        return null
    }
  }

  return (
    <Card
      className={cn(
        'relative min-w-[220px] max-w-[280px] flex-shrink-0 snap-start cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-primary/30 group',
        className
      )}
      onClick={onEdit}
    >
      {/* Edit Icon - appears on hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-1.5 rounded-full bg-accent-light text-primary">
          <Pencil className="h-3.5 w-3.5" />
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {/* Data status indicator */}
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              hasData ? 'bg-green' : 'bg-muted-foreground'
            )}
            title={hasData ? 'Data entered' : 'No data yet'}
          />
          <CardTitle className="text-base font-semibold text-foreground">
            {period.label}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-1">
          {renderMetrics()}
        </div>

        {!hasData && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Click to add data
          </p>
        )}
      </CardContent>
    </Card>
  )
}
