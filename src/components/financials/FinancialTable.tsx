'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { EditableCell } from './EditableCell'

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
  depreciation?: number | null
  amortization?: number | null
  interestExpense?: number | null
  taxExpense?: number | null
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

export interface PendingChange {
  periodId: string
  field: string
  originalValue: number | null
  newValue: number
}

interface RowConfig {
  label: string
  field: keyof PeriodData | ((data: PeriodData) => number | null)
  format: 'currency' | 'percent' | 'number'
  isHeader?: boolean
  isTotal?: boolean
  indent?: number
  isEditable?: boolean
}

interface FinancialTableProps {
  periods: FinancialPeriod[]
  dataType: DataType
  data: Record<string, PeriodData>
  onYearClick?: (periodId: string) => void
  loading?: boolean
  bulkEditMode?: boolean
  pendingChanges?: Map<string, PendingChange>
  onCellChange?: (periodId: string, field: string, value: number) => void
}

// Row configurations for each tab
const pnlRows: RowConfig[] = [
  { label: 'Gross Revenue', field: 'grossRevenue', format: 'currency', isEditable: true },
  { label: 'Cost of Goods Sold', field: 'cogs', format: 'currency', isEditable: true },
  { label: 'Gross Profit', field: 'grossProfit', format: 'currency', isTotal: true },
  { label: 'Gross Margin %', field: 'grossMarginPct', format: 'percent' },
  { label: 'Total Expenses', field: 'operatingExpenses', format: 'currency', isEditable: true },
  { label: 'Depreciation', field: 'depreciation', format: 'currency', isEditable: true, indent: 1 },
  { label: 'Amortization', field: 'amortization', format: 'currency', isEditable: true, indent: 1 },
  { label: 'Interest Expense', field: 'interestExpense', format: 'currency', isEditable: true, indent: 1 },
  { label: 'Tax Expense', field: 'taxExpense', format: 'currency', isEditable: true, indent: 1 },
  { label: 'EBITDA', field: 'ebitda', format: 'currency', isTotal: true },
  { label: 'EBITDA Margin %', field: 'ebitdaMarginPct', format: 'percent' },
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
  { label: 'Cash & Equivalents', field: 'cash', format: 'currency', indent: 1, isEditable: true },
  { label: 'Accounts Receivable', field: 'accountsReceivable', format: 'currency', indent: 1, isEditable: true },
  { label: 'Inventory', field: 'inventory', format: 'currency', indent: 1, isEditable: true },
  { label: 'Other Current Assets', field: 'otherCurrentAssets', format: 'currency', indent: 1, isEditable: true },
  { label: 'Total Current Assets', field: 'totalCurrentAssets', format: 'currency', isTotal: true },
  { label: 'Long-Term Assets', field: 'ppeNet', format: 'currency', isHeader: true },
  { label: 'PP&E (Net)', field: 'ppeNet', format: 'currency', indent: 1, isEditable: true },
  { label: 'Intangible Assets', field: 'intangibleAssets', format: 'currency', indent: 1, isEditable: true },
  { label: 'Other Long-Term', field: 'otherLongTermAssets', format: 'currency', indent: 1, isEditable: true },
  { label: 'Total Assets', field: 'totalAssets', format: 'currency', isTotal: true },
  { label: 'Current Liabilities', field: 'accountsPayable', format: 'currency', isHeader: true },
  { label: 'Accounts Payable', field: 'accountsPayable', format: 'currency', indent: 1, isEditable: true },
  { label: 'Accrued Expenses', field: 'accruedExpenses', format: 'currency', indent: 1, isEditable: true },
  { label: 'Current Portion LTD', field: 'currentPortionLtd', format: 'currency', indent: 1, isEditable: true },
  { label: 'Other Current Liab', field: 'otherCurrentLiabilities', format: 'currency', indent: 1, isEditable: true },
  { label: 'Total Current Liab', field: 'totalCurrentLiabilities', format: 'currency', isTotal: true },
  { label: 'Long-Term Liabilities', field: 'longTermDebt', format: 'currency', isHeader: true },
  { label: 'Long-Term Debt', field: 'longTermDebt', format: 'currency', indent: 1, isEditable: true },
  { label: 'Other LT Liabilities', field: 'otherLongTermLiabilities', format: 'currency', indent: 1, isEditable: true },
  { label: 'Total Liabilities', field: 'totalLiabilities', format: 'currency', isTotal: true },
  { label: 'Equity', field: 'retainedEarnings', format: 'currency', isHeader: true },
  { label: 'Retained Earnings', field: 'retainedEarnings', format: 'currency', indent: 1, isEditable: true },
  { label: "Owner's Equity", field: 'ownersEquity', format: 'currency', indent: 1, isEditable: true },
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
    // Always use K format for consistency - rounds to nearest thousand
    const kValue = Math.round(absValue / 1_000)
    if (kValue === 0) {
      return '$0'
    }
    return `${value < 0 ? '-' : ''}$${kValue}K`
  }

  if (format === 'percent') {
    return `${(value * 100).toFixed(1)}%`
  }

  return value.toLocaleString()
}

// Get effective value considering pending changes
function getEffectiveValue(
  data: PeriodData | undefined,
  periodId: string,
  field: string,
  pendingChanges?: Map<string, PendingChange>
): number | null {
  const changeKey = `${periodId}-${field}`
  const pendingChange = pendingChanges?.get(changeKey)
  if (pendingChange) {
    return pendingChange.newValue
  }
  if (!data) return null
  return (data[field as keyof PeriodData] as number | null) ?? null
}

// Recalculate derived P&L values based on editable fields
function recalculatePnlDerived(
  data: PeriodData | undefined,
  periodId: string,
  pendingChanges?: Map<string, PendingChange>
): Partial<PeriodData> {
  const grossRevenue = getEffectiveValue(data, periodId, 'grossRevenue', pendingChanges) ?? 0
  const cogs = getEffectiveValue(data, periodId, 'cogs', pendingChanges) ?? 0
  const operatingExpenses = getEffectiveValue(data, periodId, 'operatingExpenses', pendingChanges) ?? 0
  const depreciation = getEffectiveValue(data, periodId, 'depreciation', pendingChanges) ?? 0
  const amortization = getEffectiveValue(data, periodId, 'amortization', pendingChanges) ?? 0
  const interestExpense = getEffectiveValue(data, periodId, 'interestExpense', pendingChanges) ?? 0
  const taxExpense = getEffectiveValue(data, periodId, 'taxExpense', pendingChanges) ?? 0
  const netAdjustment = data?.netAdjustment ?? 0

  const grossProfit = grossRevenue - cogs
  const grossMarginPct = grossRevenue > 0 ? grossProfit / grossRevenue : 0
  // EBITDA = Gross Profit - Total Expenses + D + A + I + T
  const ebitda = grossProfit - operatingExpenses + depreciation + amortization + interestExpense + taxExpense
  const ebitdaMarginPct = grossRevenue > 0 ? ebitda / grossRevenue : 0
  const adjustedEbitda = ebitda + netAdjustment

  return { grossProfit, grossMarginPct, ebitda, ebitdaMarginPct, adjustedEbitda }
}

// Recalculate derived balance sheet values
function recalculateBalanceSheetDerived(
  data: PeriodData | undefined,
  periodId: string,
  pendingChanges?: Map<string, PendingChange>
): Partial<PeriodData> {
  const cash = getEffectiveValue(data, periodId, 'cash', pendingChanges) ?? 0
  const accountsReceivable = getEffectiveValue(data, periodId, 'accountsReceivable', pendingChanges) ?? 0
  const inventory = getEffectiveValue(data, periodId, 'inventory', pendingChanges) ?? 0
  const otherCurrentAssets = getEffectiveValue(data, periodId, 'otherCurrentAssets', pendingChanges) ?? 0
  const ppeNet = getEffectiveValue(data, periodId, 'ppeNet', pendingChanges) ?? 0
  const intangibleAssets = getEffectiveValue(data, periodId, 'intangibleAssets', pendingChanges) ?? 0
  const otherLongTermAssets = getEffectiveValue(data, periodId, 'otherLongTermAssets', pendingChanges) ?? 0
  const accountsPayable = getEffectiveValue(data, periodId, 'accountsPayable', pendingChanges) ?? 0
  const accruedExpenses = getEffectiveValue(data, periodId, 'accruedExpenses', pendingChanges) ?? 0
  const currentPortionLtd = getEffectiveValue(data, periodId, 'currentPortionLtd', pendingChanges) ?? 0
  const otherCurrentLiabilities = getEffectiveValue(data, periodId, 'otherCurrentLiabilities', pendingChanges) ?? 0
  const longTermDebt = getEffectiveValue(data, periodId, 'longTermDebt', pendingChanges) ?? 0
  const otherLongTermLiabilities = getEffectiveValue(data, periodId, 'otherLongTermLiabilities', pendingChanges) ?? 0
  const retainedEarnings = getEffectiveValue(data, periodId, 'retainedEarnings', pendingChanges) ?? 0
  const ownersEquity = getEffectiveValue(data, periodId, 'ownersEquity', pendingChanges) ?? 0

  const totalCurrentAssets = cash + accountsReceivable + inventory + otherCurrentAssets
  const totalLongTermAssets = ppeNet + intangibleAssets + otherLongTermAssets
  const totalAssets = totalCurrentAssets + totalLongTermAssets
  const totalCurrentLiabilities = accountsPayable + accruedExpenses + currentPortionLtd + otherCurrentLiabilities
  const totalLongTermLiabilities = longTermDebt + otherLongTermLiabilities
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities
  const totalEquity = retainedEarnings + ownersEquity

  return { totalCurrentAssets, totalAssets, totalCurrentLiabilities, totalLiabilities, totalEquity }
}

function getRowValue(
  data: PeriodData | undefined,
  periodId: string,
  field: RowConfig['field'],
  dataType: DataType,
  pendingChanges?: Map<string, PendingChange>
): number | null {
  if (!data && !pendingChanges?.size) return null

  // For calculated fields, we need to recalculate based on pending changes
  if (pendingChanges?.size && typeof field === 'string') {
    if (dataType === 'pnl') {
      const derived = recalculatePnlDerived(data, periodId, pendingChanges)
      if (field in derived) {
        return derived[field as keyof typeof derived] ?? null
      }
    }
    if (dataType === 'balance-sheet') {
      const derived = recalculateBalanceSheetDerived(data, periodId, pendingChanges)
      if (field in derived) {
        return derived[field as keyof typeof derived] ?? null
      }
    }
  }

  if (typeof field === 'function') {
    // For function fields, we may need to apply pending changes first
    if (pendingChanges?.size && data) {
      const modifiedData = { ...data }
      pendingChanges.forEach((change) => {
        if (change.periodId === periodId) {
          (modifiedData as Record<string, number>)[change.field] = change.newValue
        }
      })
      // Recalculate derived values
      const derived = dataType === 'pnl'
        ? recalculatePnlDerived(modifiedData, periodId, pendingChanges)
        : recalculateBalanceSheetDerived(modifiedData, periodId, pendingChanges)
      Object.assign(modifiedData, derived)
      return field(modifiedData)
    }
    return data ? field(data) : null
  }

  // Check for pending change
  const changeKey = `${periodId}-${field}`
  const pendingChange = pendingChanges?.get(changeKey)
  if (pendingChange) {
    return pendingChange.newValue
  }

  return data?.[field] ?? null
}

export function FinancialTable({
  periods,
  dataType,
  data,
  onYearClick,
  loading,
  bulkEditMode = false,
  pendingChanges,
  onCellChange,
}: FinancialTableProps) {
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
          <p className="text-center text-muted-foreground">
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
              <tr className="border-b bg-secondary">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground sticky left-0 bg-secondary min-w-[200px]">
                  {/* Empty header for row labels */}
                </th>
                {sortedPeriods.map((period) => (
                  <th
                    key={period.id}
                    className={cn(
                      "text-right py-3 px-4 font-semibold text-foreground min-w-[120px] transition-colors",
                      !bulkEditMode && onYearClick && "cursor-pointer hover:bg-primary/10"
                    )}
                    onClick={() => !bulkEditMode && onYearClick?.(period.id)}
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
                    <tr key={rowIndex} className="border-b bg-secondary/50">
                      <td
                        colSpan={sortedPeriods.length + 1}
                        className="py-2 px-4 font-semibold text-foreground text-xs uppercase tracking-wide"
                      >
                        {row.label}
                      </td>
                    </tr>
                  )
                }

                const fieldName = typeof row.field === 'string' ? row.field : null
                const canEdit = bulkEditMode && row.isEditable && fieldName && onCellChange

                return (
                  <tr
                    key={rowIndex}
                    className={cn(
                      'border-b hover:bg-secondary/50 transition-colors',
                      row.isTotal && 'bg-secondary/30'
                    )}
                  >
                    <td
                      className={cn(
                        'py-2 px-4 sticky left-0 bg-white',
                        row.isTotal ? 'font-semibold text-foreground' : 'text-foreground',
                        row.indent === 1 && 'pl-8',
                        row.indent === 2 && 'pl-12'
                      )}
                    >
                      {row.label}
                    </td>
                    {sortedPeriods.map((period) => {
                      const periodData = data[period.id]
                      const value = getRowValue(periodData, period.id, row.field, dataType, pendingChanges)
                      const changeKey = fieldName ? `${period.id}-${fieldName}` : null
                      const isDirty = changeKey ? pendingChanges?.has(changeKey) ?? false : false

                      if (canEdit && fieldName) {
                        return (
                          <td
                            key={period.id}
                            className={cn(
                              'py-1 px-2 text-right font-mono',
                              row.isTotal ? 'font-semibold text-foreground' : 'text-muted-foreground'
                            )}
                          >
                            <EditableCell
                              value={value}
                              periodId={period.id}
                              field={fieldName}
                              format={row.format === 'number' ? 'currency' : row.format}
                              isDirty={isDirty}
                              onChange={onCellChange}
                            />
                          </td>
                        )
                      }

                      return (
                        <td
                          key={period.id}
                          className={cn(
                            'py-2 px-4 text-right font-mono transition-colors',
                            row.isTotal ? 'font-semibold text-foreground' : 'text-muted-foreground',
                            !bulkEditMode && onYearClick && 'cursor-pointer hover:bg-primary/5'
                          )}
                          onClick={() => !bulkEditMode && onYearClick?.(period.id)}
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
