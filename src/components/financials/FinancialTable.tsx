'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Types
export type DataType = 'pnl' | 'add-backs' | 'balance-sheet' | 'cash-flow'

export interface FinancialPeriod {
  id: string
  label: string
  fiscalYear: number
}

export interface PeriodData {
  // P&L fields
  grossRevenue?: number | null
  cogs?: number | null
  grossProfit?: number | null
  grossMarginPct?: number | null
  operatingExpenses?: number | null
  ebitda?: number | null
  ebitdaMarginPct?: number | null
  // Add-backs fields
  totalAddBacks?: number | null
  totalDeductions?: number | null
  netAdjustment?: number | null
  adjustedEbitda?: number | null
  // Balance sheet fields
  cash?: number | null
  accountsReceivable?: number | null
  inventory?: number | null
  otherCurrentAssets?: number | null
  totalCurrentAssets?: number | null
  ppeNet?: number | null
  intangibleAssets?: number | null
  otherLongTermAssets?: number | null
  totalAssets?: number | null
  accountsPayable?: number | null
  accruedExpenses?: number | null
  currentPortionLtd?: number | null
  otherCurrentLiabilities?: number | null
  totalCurrentLiabilities?: number | null
  longTermDebt?: number | null
  otherLongTermLiabilities?: number | null
  totalLiabilities?: number | null
  retainedEarnings?: number | null
  ownersEquity?: number | null
  totalEquity?: number | null
  // Cash flow fields
  netIncome?: number | null
  depreciationAmortization?: number | null
  workingCapitalChanges?: number | null
  cashFromOperations?: number | null
  capitalExpenditures?: number | null
  otherInvesting?: number | null
  cashFromInvesting?: number | null
  debtChanges?: number | null
  equityChanges?: number | null
  cashFromFinancing?: number | null
  netChangeInCash?: number | null
  freeCashFlow?: number | null
}

interface RowConfig {
  label: string
  field: keyof PeriodData | ((data: PeriodData) => number | null)
  format: 'currency' | 'percent' | 'number'
  isHeader?: boolean
  isTotal?: boolean
  indent?: number
}

interface FinancialTableProps {
  periods: FinancialPeriod[]
  dataType: DataType
  data: Record<string, PeriodData>
  onYearClick: (periodId: string) => void
  loading?: boolean
}

// Row configurations for each tab
const pnlRows: RowConfig[] = [
  { label: 'Gross Revenue', field: 'grossRevenue', format: 'currency' },
  { label: 'Cost of Goods Sold', field: 'cogs', format: 'currency' },
  { label: 'Gross Profit', field: 'grossProfit', format: 'currency', isTotal: true },
  { label: 'Gross Margin %', field: 'grossMarginPct', format: 'percent' },
  { label: 'Operating Expenses', field: 'operatingExpenses', format: 'currency' },
  { label: 'EBITDA', field: 'ebitda', format: 'currency', isTotal: true },
  { label: 'Add-Backs / Adjustments', field: 'netAdjustment', format: 'currency' },
  { label: 'Adjusted EBITDA', field: 'adjustedEbitda', format: 'currency', isTotal: true },
  {
    label: 'Adjusted EBITDA Margin %',
    field: (data) => {
      const revenue = data.grossRevenue
      const adjustedEbitda = data.adjustedEbitda
      if (!revenue || !adjustedEbitda) return null
      return adjustedEbitda / revenue
    },
    format: 'percent',
  },
]

const addBacksRows: RowConfig[] = [
  { label: 'Total Add-Backs', field: 'totalAddBacks', format: 'currency' },
  { label: 'Total Deductions', field: 'totalDeductions', format: 'currency' },
  { label: 'Net Adjustment', field: 'netAdjustment', format: 'currency', isTotal: true },
  { label: 'Base EBITDA', field: 'ebitda', format: 'currency' },
  { label: 'Adjusted EBITDA', field: 'adjustedEbitda', format: 'currency', isTotal: true },
]

const balanceSheetRows: RowConfig[] = [
  { label: 'Current Assets', field: 'cash', format: 'currency', isHeader: true },
  { label: 'Cash & Equivalents', field: 'cash', format: 'currency', indent: 1 },
  { label: 'Accounts Receivable', field: 'accountsReceivable', format: 'currency', indent: 1 },
  { label: 'Inventory', field: 'inventory', format: 'currency', indent: 1 },
  { label: 'Other Current Assets', field: 'otherCurrentAssets', format: 'currency', indent: 1 },
  { label: 'Total Current Assets', field: 'totalCurrentAssets', format: 'currency', isTotal: true },
  { label: 'Long-Term Assets', field: 'ppeNet', format: 'currency', isHeader: true },
  { label: 'PP&E (Net)', field: 'ppeNet', format: 'currency', indent: 1 },
  { label: 'Intangible Assets', field: 'intangibleAssets', format: 'currency', indent: 1 },
  { label: 'Other Long-Term', field: 'otherLongTermAssets', format: 'currency', indent: 1 },
  { label: 'Total Assets', field: 'totalAssets', format: 'currency', isTotal: true },
  { label: 'Current Liabilities', field: 'accountsPayable', format: 'currency', isHeader: true },
  { label: 'Accounts Payable', field: 'accountsPayable', format: 'currency', indent: 1 },
  { label: 'Accrued Expenses', field: 'accruedExpenses', format: 'currency', indent: 1 },
  { label: 'Current Portion LTD', field: 'currentPortionLtd', format: 'currency', indent: 1 },
  { label: 'Other Current Liab', field: 'otherCurrentLiabilities', format: 'currency', indent: 1 },
  { label: 'Total Current Liab', field: 'totalCurrentLiabilities', format: 'currency', isTotal: true },
  { label: 'Long-Term Liabilities', field: 'longTermDebt', format: 'currency', isHeader: true },
  { label: 'Long-Term Debt', field: 'longTermDebt', format: 'currency', indent: 1 },
  { label: 'Other LT Liabilities', field: 'otherLongTermLiabilities', format: 'currency', indent: 1 },
  { label: 'Total Liabilities', field: 'totalLiabilities', format: 'currency', isTotal: true },
  { label: 'Equity', field: 'retainedEarnings', format: 'currency', isHeader: true },
  { label: 'Retained Earnings', field: 'retainedEarnings', format: 'currency', indent: 1 },
  { label: "Owner's Equity", field: 'ownersEquity', format: 'currency', indent: 1 },
  { label: 'Total Equity', field: 'totalEquity', format: 'currency', isTotal: true },
]

const cashFlowRows: RowConfig[] = [
  { label: 'Operating Activities', field: 'netIncome', format: 'currency', isHeader: true },
  { label: 'Net Income', field: 'netIncome', format: 'currency', indent: 1 },
  { label: 'Depreciation & Amort', field: 'depreciationAmortization', format: 'currency', indent: 1 },
  { label: 'Working Capital Changes', field: 'workingCapitalChanges', format: 'currency', indent: 1 },
  { label: 'Cash from Operations', field: 'cashFromOperations', format: 'currency', isTotal: true },
  { label: 'Investing Activities', field: 'capitalExpenditures', format: 'currency', isHeader: true },
  { label: 'Capital Expenditures', field: 'capitalExpenditures', format: 'currency', indent: 1 },
  { label: 'Other Investing', field: 'otherInvesting', format: 'currency', indent: 1 },
  { label: 'Cash from Investing', field: 'cashFromInvesting', format: 'currency', isTotal: true },
  { label: 'Financing Activities', field: 'debtChanges', format: 'currency', isHeader: true },
  { label: 'Debt Changes', field: 'debtChanges', format: 'currency', indent: 1 },
  { label: 'Equity Changes', field: 'equityChanges', format: 'currency', indent: 1 },
  { label: 'Cash from Financing', field: 'cashFromFinancing', format: 'currency', isTotal: true },
  { label: 'Summary', field: 'netChangeInCash', format: 'currency', isHeader: true },
  { label: 'Net Change in Cash', field: 'netChangeInCash', format: 'currency', indent: 1 },
  { label: 'Free Cash Flow', field: 'freeCashFlow', format: 'currency', isTotal: true },
]

function formatValue(value: number | null | undefined, format: 'currency' | 'percent' | 'number'): string {
  if (value === null || value === undefined) return '-'

  if (format === 'currency') {
    const absValue = Math.abs(value)
    if (absValue >= 1_000_000) {
      return `${value < 0 ? '-' : ''}$${(absValue / 1_000_000).toFixed(1)}M`
    }
    if (absValue >= 1_000) {
      return `${value < 0 ? '-' : ''}$${(absValue / 1_000).toFixed(0)}K`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (format === 'percent') {
    return `${(value * 100).toFixed(1)}%`
  }

  return value.toLocaleString()
}

function getRowValue(data: PeriodData | undefined, field: RowConfig['field']): number | null {
  if (!data) return null
  if (typeof field === 'function') {
    return field(data)
  }
  return data[field] ?? null
}

export function FinancialTable({ periods, dataType, data, onYearClick, loading }: FinancialTableProps) {
  const rows = useMemo(() => {
    switch (dataType) {
      case 'pnl': return pnlRows
      case 'add-backs': return addBacksRows
      case 'balance-sheet': return balanceSheetRows
      case 'cash-flow': return cashFlowRows
      default: return pnlRows
    }
  }, [dataType])

  // Sort periods by fiscal year
  const sortedPeriods = useMemo(() => {
    return [...periods].sort((a, b) => a.fiscalYear - b.fiscalYear)
  }, [periods])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (sortedPeriods.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-gray-500">
            No fiscal years yet. Click &quot;Add Year&quot; to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[200px]">
                  {/* Empty header for row labels */}
                </th>
                {sortedPeriods.map((period) => (
                  <th
                    key={period.id}
                    className="text-right py-3 px-4 font-semibold text-gray-900 min-w-[120px] cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => onYearClick(period.id)}
                  >
                    {period.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                // Skip rendering data for header rows
                if (row.isHeader) {
                  return (
                    <tr key={rowIndex} className="border-b bg-gray-50/50">
                      <td
                        colSpan={sortedPeriods.length + 1}
                        className="py-2 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wide"
                      >
                        {row.label}
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr
                    key={rowIndex}
                    className={cn(
                      'border-b hover:bg-gray-50/50 transition-colors',
                      row.isTotal && 'bg-gray-50/30'
                    )}
                  >
                    <td
                      className={cn(
                        'py-2 px-4 sticky left-0 bg-white',
                        row.isTotal ? 'font-semibold text-gray-900' : 'text-gray-700',
                        row.indent === 1 && 'pl-8',
                        row.indent === 2 && 'pl-12'
                      )}
                    >
                      {row.label}
                    </td>
                    {sortedPeriods.map((period) => {
                      const periodData = data[period.id]
                      const value = getRowValue(periodData, row.field)

                      return (
                        <td
                          key={period.id}
                          className={cn(
                            'py-2 px-4 text-right font-mono cursor-pointer hover:bg-primary/5 transition-colors',
                            row.isTotal ? 'font-semibold text-gray-900' : 'text-gray-600'
                          )}
                          onClick={() => onYearClick(period.id)}
                        >
                          {formatValue(value, row.format)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
