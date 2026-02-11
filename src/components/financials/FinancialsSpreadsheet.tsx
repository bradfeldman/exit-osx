'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { analytics } from '@/lib/analytics'
import { Plus, Check, Loader2, TrendingUp, TrendingDown, Minus, AlertCircle, Trash2, PlusCircle, MinusCircle, ChevronDown, ChevronRight, ArrowRight, X, DollarSign, Sparkles, Lightbulb } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ValuationImpactCelebration } from './ValuationImpactCelebration'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Types
export type StatementType = 'pnl' | 'balance-sheet' | 'add-backs' | 'cash-flow'

interface FinancialPeriod {
  id: string
  label: string
  fiscalYear: number
  periodType: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY'
}

interface PeriodData {
  // P&L
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
  netAdjustment?: number | null
  adjustedEbitda?: number | null
  // Balance Sheet
  cash?: number | null
  accountsReceivable?: number | null
  inventory?: number | null
  prepaidExpenses?: number | null
  otherCurrentAssets?: number | null
  totalCurrentAssets?: number | null
  ppeGross?: number | null
  accumulatedDepreciation?: number | null
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
  deferredTaxLiabilities?: number | null
  otherLongTermLiabilities?: number | null
  totalLiabilities?: number | null
  retainedEarnings?: number | null
  ownersEquity?: number | null
  totalEquity?: number | null
  // Cash Flow
  netIncome?: number | null
  depreciationCF?: number | null
  amortizationCF?: number | null
  workingCapitalChanges?: number | null
  cashFromOperations?: number | null
  capitalExpenditures?: number | null
  cashFromInvesting?: number | null
  debtChanges?: number | null
  equityChanges?: number | null
  cashFromFinancing?: number | null
  netChangeInCash?: number | null
  freeCashFlow?: number | null
  // Add-backs
  totalAddBacks?: number | null
  totalDeductions?: number | null
}

interface RowConfig {
  label: string
  field: keyof PeriodData | null
  format: 'currency' | 'percent' | 'number'
  isHeader?: boolean
  isTotal?: boolean
  isSubtotal?: boolean
  indent?: number
  editable?: boolean
  calculate?: (data: PeriodData) => number | null
}

interface FinancialsSpreadsheetProps {
  companyId: string
  initialTab?: StatementType
  hideTabs?: boolean
  hidePnlTab?: boolean
}

// Adjustment type for add-backs/deductions
interface Adjustment {
  id: string
  description: string
  amount: number
  type: 'ADD_BACK' | 'DEDUCTION'
  frequency: 'MONTHLY' | 'ANNUAL'
  periodId: string
}

// Common add-back items that owners typically have
const COMMON_ADDBACKS = [
  { id: 'excess-comp', description: "Owner's Excess Compensation", defaultType: 'ADD_BACK' as const, hint: 'Salary above market rate for the role' },
  { id: 'health-ins', description: "Owner's Health Insurance", defaultType: 'ADD_BACK' as const, hint: 'Personal health insurance paid by business' },
  { id: 'life-ins', description: "Owner's Life Insurance", defaultType: 'ADD_BACK' as const, hint: 'Personal life insurance premiums' },
  { id: 'auto', description: "Owner's Auto/Vehicle Expenses", defaultType: 'ADD_BACK' as const, hint: 'Personal vehicle use charged to business' },
  { id: 'travel', description: "Owner's Personal Travel & Entertainment", defaultType: 'ADD_BACK' as const, hint: 'Non-business travel and meals' },
  { id: 'family', description: 'Family Members on Payroll', defaultType: 'ADD_BACK' as const, hint: 'Above-market or non-working family compensation' },
  { id: 'one-time-legal', description: 'One-Time Professional Fees', defaultType: 'ADD_BACK' as const, hint: 'Non-recurring legal, accounting, consulting' },
  { id: 'non-recurring', description: 'Other Non-Recurring Expenses', defaultType: 'ADD_BACK' as const, hint: 'One-time costs not expected to continue' },
  { id: 'rent-above', description: 'Above-Market Related Party Rent', defaultType: 'ADD_BACK' as const, hint: 'Rent paid to owner above fair market value' },
  { id: 'charitable', description: 'Charitable Contributions', defaultType: 'ADD_BACK' as const, hint: 'Donations made through the business' },
  { id: 'personal-exp', description: 'Personal Expenses Through Business', defaultType: 'ADD_BACK' as const, hint: 'Cell phone, subscriptions, etc.' },
  { id: 'rent-below', description: 'Below-Market Related Party Rent', defaultType: 'DEDUCTION' as const, hint: 'Rent paid to owner below fair market value' },
]

// Row configurations
const pnlRows: RowConfig[] = [
  { label: 'Revenue', field: null, format: 'currency', isHeader: true },
  { label: 'Gross Revenue', field: 'grossRevenue', format: 'currency', editable: true, indent: 1 },
  { label: 'Cost of Goods Sold', field: 'cogs', format: 'currency', editable: true, indent: 1 },
  { label: 'Gross Profit', field: 'grossProfit', format: 'currency', isSubtotal: true },
  { label: 'Gross Margin', field: 'grossMarginPct', format: 'percent' },
  { label: 'Operating Expenses', field: null, format: 'currency', isHeader: true },
  { label: 'Total Operating Expenses', field: 'operatingExpenses', format: 'currency', editable: true, indent: 1 },
  { label: 'Depreciation', field: 'depreciation', format: 'currency', editable: true, indent: 2 },
  { label: 'Amortization', field: 'amortization', format: 'currency', editable: true, indent: 2 },
  { label: 'Interest Expense', field: 'interestExpense', format: 'currency', editable: true, indent: 2 },
  { label: 'Tax Expense', field: 'taxExpense', format: 'currency', editable: true, indent: 2 },
  { label: 'Earnings', field: null, format: 'currency', isHeader: true },
  { label: 'EBITDA', field: 'ebitda', format: 'currency', isSubtotal: true },
  { label: 'EBITDA Margin', field: 'ebitdaMarginPct', format: 'percent' },
  { label: 'Add-Backs (Net)', field: 'netAdjustment', format: 'currency', indent: 1 },
  { label: 'Adjusted EBITDA', field: 'adjustedEbitda', format: 'currency', isTotal: true },
]

const balanceSheetRows: RowConfig[] = [
  { label: 'Assets', field: null, format: 'currency', isHeader: true },
  { label: 'Cash & Equivalents', field: 'cash', format: 'currency', editable: true, indent: 1 },
  { label: 'Accounts Receivable', field: 'accountsReceivable', format: 'currency', editable: true, indent: 1 },
  { label: 'Inventory', field: 'inventory', format: 'currency', editable: true, indent: 1 },
  { label: 'Prepaid Expenses', field: 'prepaidExpenses', format: 'currency', editable: true, indent: 1 },
  { label: 'Other Current Assets', field: 'otherCurrentAssets', format: 'currency', editable: true, indent: 1 },
  { label: 'Total Current Assets', field: 'totalCurrentAssets', format: 'currency', isSubtotal: true },
  { label: 'PP&E (Gross)', field: 'ppeGross', format: 'currency', editable: true, indent: 1 },
  { label: 'Accumulated Depreciation', field: 'accumulatedDepreciation', format: 'currency', editable: true, indent: 1 },
  { label: 'Intangible Assets', field: 'intangibleAssets', format: 'currency', editable: true, indent: 1 },
  { label: 'Other Long-Term Assets', field: 'otherLongTermAssets', format: 'currency', editable: true, indent: 1 },
  { label: 'Total Assets', field: 'totalAssets', format: 'currency', isTotal: true },
  { label: 'Liabilities', field: null, format: 'currency', isHeader: true },
  { label: 'Accounts Payable', field: 'accountsPayable', format: 'currency', editable: true, indent: 1 },
  { label: 'Accrued Expenses', field: 'accruedExpenses', format: 'currency', editable: true, indent: 1 },
  { label: 'Current Portion LTD', field: 'currentPortionLtd', format: 'currency', editable: true, indent: 1 },
  { label: 'Other Current Liabilities', field: 'otherCurrentLiabilities', format: 'currency', editable: true, indent: 1 },
  { label: 'Total Current Liabilities', field: 'totalCurrentLiabilities', format: 'currency', isSubtotal: true },
  { label: 'Long-Term Debt', field: 'longTermDebt', format: 'currency', editable: true, indent: 1 },
  { label: 'Deferred Tax Liabilities', field: 'deferredTaxLiabilities', format: 'currency', editable: true, indent: 1 },
  { label: 'Other LT Liabilities', field: 'otherLongTermLiabilities', format: 'currency', editable: true, indent: 1 },
  { label: 'Total Liabilities', field: 'totalLiabilities', format: 'currency', isSubtotal: true },
  { label: 'Equity', field: null, format: 'currency', isHeader: true },
  { label: 'Retained Earnings', field: 'retainedEarnings', format: 'currency', editable: true, indent: 1 },
  { label: "Owner's Equity", field: 'ownersEquity', format: 'currency', editable: true, indent: 1 },
  { label: 'Total Equity', field: 'totalEquity', format: 'currency', isSubtotal: true },
  { label: 'Balance Check', field: null, format: 'currency', isHeader: true },
  {
    label: 'Liabilities + Equity',
    field: null,
    format: 'currency',
    isTotal: true,
    calculate: (data: PeriodData) => {
      const liabilities = data.totalLiabilities ?? 0
      const equity = data.totalEquity ?? 0
      return liabilities + equity
    }
  },
]

const addBacksRows: RowConfig[] = [
  { label: 'Adjustments', field: null, format: 'currency', isHeader: true },
  { label: 'Total Add-Backs', field: 'totalAddBacks', format: 'currency', indent: 1 },
  { label: 'Total Deductions', field: 'totalDeductions', format: 'currency', indent: 1 },
  { label: 'Net Adjustment', field: 'netAdjustment', format: 'currency', isSubtotal: true },
  { label: 'Impact on Valuation', field: null, format: 'currency', isHeader: true },
  { label: 'Base EBITDA', field: 'ebitda', format: 'currency', indent: 1 },
  { label: 'Adjusted EBITDA', field: 'adjustedEbitda', format: 'currency', isTotal: true },
]

const cashFlowRows: RowConfig[] = [
  { label: 'Operating Activities', field: null, format: 'currency', isHeader: true },
  { label: 'Net Income', field: 'netIncome', format: 'currency', indent: 1 },
  { label: 'Depreciation', field: 'depreciationCF', format: 'currency', indent: 1 },
  { label: 'Amortization', field: 'amortizationCF', format: 'currency', indent: 1 },
  { label: 'Working Capital Changes', field: 'workingCapitalChanges', format: 'currency', indent: 1 },
  { label: 'Cash from Operations', field: 'cashFromOperations', format: 'currency', isSubtotal: true },
  { label: 'Investing Activities', field: null, format: 'currency', isHeader: true },
  { label: 'Capital Expenditures', field: 'capitalExpenditures', format: 'currency', indent: 1 },
  { label: 'Cash from Investing', field: 'cashFromInvesting', format: 'currency', isSubtotal: true },
  { label: 'Financing Activities', field: null, format: 'currency', isHeader: true },
  { label: 'Debt Changes', field: 'debtChanges', format: 'currency', indent: 1 },
  { label: 'Equity Changes', field: 'equityChanges', format: 'currency', indent: 1 },
  { label: 'Cash from Financing', field: 'cashFromFinancing', format: 'currency', isSubtotal: true },
  { label: 'Summary', field: null, format: 'currency', isHeader: true },
  { label: 'Net Change in Cash', field: 'netChangeInCash', format: 'currency', indent: 1 },
  { label: 'Free Cash Flow', field: 'freeCashFlow', format: 'currency', isTotal: true },
]

// Formatters
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${(value * 100).toFixed(1)}%`
}

function formatValue(value: number | null | undefined, format: 'currency' | 'percent' | 'number'): string {
  if (format === 'currency') return formatCurrency(value)
  if (format === 'percent') return formatPercent(value)
  return value?.toLocaleString() ?? '-'
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`
  }
  return `$${value.toLocaleString()}`
}

function parseInputValue(input: string): number {
  const cleaned = input.replace(/[$,\s]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

// Calculate derived P&L values from input fields
function calculatePnlDerivedValues(data: PeriodData): Partial<PeriodData> {
  const grossRevenue = data.grossRevenue ?? 0
  const cogs = data.cogs ?? 0
  const operatingExpenses = data.operatingExpenses ?? 0
  const depreciation = data.depreciation ?? 0
  const amortization = data.amortization ?? 0
  const interestExpense = data.interestExpense ?? 0
  const taxExpense = data.taxExpense ?? 0

  const grossProfit = grossRevenue - cogs
  const grossMarginPct = grossRevenue > 0 ? grossProfit / grossRevenue : 0

  // EBITDA = Gross Profit - Operating Expenses + D + A + I + T (add back since they're in OpEx)
  const ebitda = grossProfit - operatingExpenses + depreciation + amortization + interestExpense + taxExpense
  const ebitdaMarginPct = grossRevenue > 0 ? ebitda / grossRevenue : 0

  // Adjusted EBITDA includes add-backs
  const netAdjustment = data.netAdjustment ?? 0
  const adjustedEbitda = ebitda + netAdjustment

  return {
    grossProfit,
    grossMarginPct,
    ebitda,
    ebitdaMarginPct,
    adjustedEbitda,
  }
}

// Calculate derived Balance Sheet values from input fields
function calculateBsDerivedValues(data: PeriodData): Partial<PeriodData> {
  const cash = data.cash ?? 0
  const accountsReceivable = data.accountsReceivable ?? 0
  const inventory = data.inventory ?? 0
  const prepaidExpenses = data.prepaidExpenses ?? 0
  const otherCurrentAssets = data.otherCurrentAssets ?? 0
  const ppeGross = data.ppeGross ?? 0
  const accumulatedDepreciation = data.accumulatedDepreciation ?? 0
  const intangibleAssets = data.intangibleAssets ?? 0
  const otherLongTermAssets = data.otherLongTermAssets ?? 0
  const accountsPayable = data.accountsPayable ?? 0
  const accruedExpenses = data.accruedExpenses ?? 0
  const currentPortionLtd = data.currentPortionLtd ?? 0
  const otherCurrentLiabilities = data.otherCurrentLiabilities ?? 0
  const longTermDebt = data.longTermDebt ?? 0
  const deferredTaxLiabilities = data.deferredTaxLiabilities ?? 0
  const otherLongTermLiabilities = data.otherLongTermLiabilities ?? 0
  const retainedEarnings = data.retainedEarnings ?? 0
  const ownersEquity = data.ownersEquity ?? 0

  const totalCurrentAssets = cash + accountsReceivable + inventory + prepaidExpenses + otherCurrentAssets
  const ppeNet = ppeGross - accumulatedDepreciation
  const totalAssets = totalCurrentAssets + ppeNet + intangibleAssets + otherLongTermAssets
  const totalCurrentLiabilities = accountsPayable + accruedExpenses + currentPortionLtd + otherCurrentLiabilities
  const totalLiabilities = totalCurrentLiabilities + longTermDebt + deferredTaxLiabilities + otherLongTermLiabilities
  const totalEquity = retainedEarnings + ownersEquity

  return {
    totalCurrentAssets,
    ppeNet,
    totalAssets,
    totalCurrentLiabilities,
    totalLiabilities,
    totalEquity,
  }
}

// Convert Prisma Decimal values (returned as strings) to numbers
function convertDecimalsToNumbers(obj: Record<string, unknown> | null | undefined): Record<string, number | null> {
  if (!obj) return {}
  const result: Record<string, number | null> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = null
    } else if (typeof value === 'string' && !isNaN(Number(value))) {
      result[key] = Number(value)
    } else if (typeof value === 'number') {
      result[key] = value
    }
    // Skip non-numeric fields like id, periodId, etc.
  }
  return result
}

// Format number with commas for input display
function formatInputWithCommas(input: string): string {
  // Remove everything except digits, decimal, and minus
  const cleaned = input.replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-') return cleaned

  // Split by decimal point
  const parts = cleaned.split('.')
  // Format the integer part with commas
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  // Rejoin with decimal if present
  return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0]
}

// Calculate YoY change
function calculateYoYChange(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (!current || !previous || previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

// Editable Cell Component
function SpreadsheetCell({
  value,
  format,
  editable,
  isTotal,
  isSubtotal,
  onChange,
  previousValue,
  cellId,
  isActive,
  onActivate,
  onNavigate,
}: {
  value: number | null | undefined
  format: 'currency' | 'percent' | 'number'
  editable?: boolean
  isTotal?: boolean
  isSubtotal?: boolean
  onChange?: (value: number) => void
  previousValue?: number | null
  cellId: string
  isActive: boolean
  onActivate: (cellId: string) => void
  onNavigate: (direction: 'left' | 'right' | 'up' | 'down') => void
}) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isNavigatingRef = useRef(false)
  const wasActiveRef = useRef(false)

  // When becoming active, initialize input value and focus
  // Only set input value when transitioning from inactive to active (not on value changes while editing)
  useEffect(() => {
    if (isActive && editable && !wasActiveRef.current) {
      // Transitioning from inactive to active - initialize input
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputValue(value?.toLocaleString() ?? '')
      isNavigatingRef.current = false
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    }
    wasActiveRef.current = isActive && !!editable
  }, [isActive, editable, value])

  const handleClick = () => {
    if (!editable) return
    onActivate(cellId)
  }

  const saveValue = useCallback(() => {
    const newValue = parseInputValue(inputValue)
    if (newValue !== value && onChange) {
      onChange(newValue)
    }
  }, [inputValue, value, onChange])

  const handleBlur = () => {
    // Skip if we're navigating via keyboard (Tab/Enter)
    if (isNavigatingRef.current) {
      return
    }
    saveValue()
    onActivate('') // Deactivate on blur outside grid
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      isNavigatingRef.current = true
      saveValue()
      onNavigate(e.shiftKey ? 'left' : 'right')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      isNavigatingRef.current = true
      saveValue()
      onNavigate(e.shiftKey ? 'up' : 'down')
    } else if (e.key === 'Escape') {
      isNavigatingRef.current = true
      onActivate('') // Cancel editing without saving
    } else if (e.key === 'ArrowUp' && e.altKey) {
      e.preventDefault()
      isNavigatingRef.current = true
      saveValue()
      onNavigate('up')
    } else if (e.key === 'ArrowDown' && e.altKey) {
      e.preventDefault()
      isNavigatingRef.current = true
      saveValue()
      onNavigate('down')
    } else if (e.key === 'ArrowLeft' && e.altKey) {
      e.preventDefault()
      isNavigatingRef.current = true
      saveValue()
      onNavigate('left')
    } else if (e.key === 'ArrowRight' && e.altKey) {
      e.preventDefault()
      isNavigatingRef.current = true
      saveValue()
      onNavigate('right')
    }
  }

  // Handle input change with live comma formatting
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInputWithCommas(e.target.value)
    setInputValue(formatted)
  }

  // YoY indicator
  const yoyChange = calculateYoYChange(value, previousValue)
  const showYoY = previousValue !== undefined && yoyChange !== null && format === 'currency'

  if (isActive && editable) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-cell-id={cellId}
        className="w-full px-2 py-1 text-right font-mono text-sm border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
      />
    )
  }

  return (
    <div
      data-editable={editable}
      data-cell-id={cellId}
      onClick={handleClick}
      className={cn(
        'px-3 py-2 text-right font-mono text-sm flex items-center justify-end gap-1',
        editable && 'cursor-pointer hover:bg-primary/5 rounded transition-colors',
        isTotal && 'font-bold text-foreground bg-muted/50',
        isSubtotal && 'font-semibold text-foreground'
      )}
    >
      {showYoY && (
        <span className={cn(
          'text-xs',
          yoyChange > 0 ? 'text-green-600' : yoyChange < 0 ? 'text-red-600' : 'text-muted-foreground'
        )}>
          {yoyChange > 0 ? <TrendingUp className="h-3 w-3" /> :
           yoyChange < 0 ? <TrendingDown className="h-3 w-3" /> :
           <Minus className="h-3 w-3" />}
        </span>
      )}
      <span>{formatValue(value, format)}</span>
    </div>
  )
}

// Adjustment Cell Component with navigation support
function AdjustmentCell({
  value,
  onChange,
  cellId,
  isActive,
  onActivate,
  onNavigate,
}: {
  value: number
  onChange: (value: number) => void
  cellId: string
  isActive: boolean
  onActivate: (cellId: string) => void
  onNavigate: (direction: 'left' | 'right' | 'up' | 'down') => void
}) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isNavigatingRef = useRef(false)
  const wasActiveRef = useRef(false)

  // When becoming active, initialize input value and focus
  // Only set input value when transitioning from inactive to active (not on value changes while editing)
  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      // Transitioning from inactive to active - initialize input
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputValue(value ? value.toLocaleString() : '')
      isNavigatingRef.current = false
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    }
    wasActiveRef.current = isActive
  }, [isActive, value])

  const handleClick = () => {
    onActivate(cellId)
  }

  const saveValue = useCallback(() => {
    const newValue = parseInputValue(inputValue)
    if (newValue !== value) {
      onChange(newValue)
    }
  }, [inputValue, value, onChange])

  const handleBlur = () => {
    if (isNavigatingRef.current) {
      return
    }
    saveValue()
    onActivate('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      isNavigatingRef.current = true
      saveValue()
      onNavigate(e.shiftKey ? 'left' : 'right')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      isNavigatingRef.current = true
      saveValue()
      onNavigate(e.shiftKey ? 'up' : 'down')
    } else if (e.key === 'Escape') {
      isNavigatingRef.current = true
      onActivate('')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(formatInputWithCommas(e.target.value))
  }

  if (isActive) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-cell-id={cellId}
        className="w-full px-2 py-1 text-right font-mono text-sm border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
      />
    )
  }

  return (
    <div
      onClick={handleClick}
      data-cell-id={cellId}
      className="px-3 py-2 text-right font-mono text-sm cursor-pointer hover:bg-primary/5 rounded transition-colors"
    >
      {formatCurrency(value)}
    </div>
  )
}

export function FinancialsSpreadsheet({ companyId, initialTab, hideTabs, hidePnlTab }: FinancialsSpreadsheetProps) {
  const [activeTab, setActiveTab] = useState<StatementType>(initialTab || 'pnl')
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [data, setData] = useState<Record<string, PeriodData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [_isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [periodToDelete, setPeriodToDelete] = useState<FinancialPeriod | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeCellId, setActiveCellId] = useState<string>('')
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [showAddAdjustment, setShowAddAdjustment] = useState(false)
  const [showCommonAddBacks, setShowCommonAddBacks] = useState(false)
  const [newAdjustment, setNewAdjustment] = useState({ description: '', type: 'ADD_BACK' as 'ADD_BACK' | 'DEDUCTION' })
  const [valuationCelebration, setValuationCelebration] = useState<{
    previousValue: number | null
    newValue: number
    isFirstFinancials: boolean
  } | null>(null)
  const [showValuationBanner, setShowValuationBanner] = useState(false)
  const [currentValuation, setCurrentValuation] = useState<number | null>(null)
  const [sessionStartValuation, setSessionStartValuation] = useState<number | null>(null)
  const [lastValuationChange, setLastValuationChange] = useState<{
    previousValue: number | null
    newValue: number
    change: number
    percentChange: number | null
    isFirstFinancials: boolean
  } | null>(null)
  const [showNextSteps, setShowNextSteps] = useState(false)
  const nextStepsTimeoutRef = useRef<NodeJS.Timeout>(undefined)
  const saveTimeoutRef = useRef<NodeJS.Timeout>(undefined)
  const pendingChangesRef = useRef<Map<string, { periodId: string; field: string; value: number }>>(new Map())
  const _pendingAdjustmentChangesRef = useRef<Map<string, { adjustmentId: string; periodId: string; amount: number }>>(new Map())

  // Fetch periods and data
  const loadData = useCallback(async () => {
    if (!companyId) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch periods with retry
      const periodsRes = await fetchWithRetry(`/api/companies/${companyId}/financial-periods`)
      if (!periodsRes.ok) throw new Error('Failed to load periods')
      const periodsData = await periodsRes.json()
      setPeriods(periodsData.periods || [])

      // Fetch all period data in parallel with retry
      const periodsList = periodsData.periods || []

      // Create all fetch promises for all periods at once (with retry logic)
      const allFetches = periodsList.map(async (period: FinancialPeriod) => {
        // Fetch all 4 data types for this period in parallel with retry
        const [plRes, bsRes, adjRes, cfRes] = await Promise.all([
          fetchWithRetry(`/api/companies/${companyId}/financial-periods/${period.id}/income-statement`).catch(() => null),
          fetchWithRetry(`/api/companies/${companyId}/financial-periods/${period.id}/balance-sheet`).catch(() => null),
          fetchWithRetry(`/api/companies/${companyId}/adjustments?periodId=${period.id}`).catch(() => null),
          fetchWithRetry(`/api/companies/${companyId}/financial-periods/${period.id}/cash-flow`).catch(() => null),
        ])

        const periodData: PeriodData = {}

        // Process income statement
        if (plRes?.ok) {
          try {
            const plData = await plRes.json()
            Object.assign(periodData, convertDecimalsToNumbers(plData.incomeStatement))
          } catch (e) {
            console.error('Error parsing P&L for period', period.id, e)
          }
        }

        // Process balance sheet
        if (bsRes?.ok) {
          try {
            const bsData = await bsRes.json()
            Object.assign(periodData, convertDecimalsToNumbers(bsData.balanceSheet))
          } catch (e) {
            console.error('Error parsing Balance Sheet for period', period.id, e)
          }
        }

        // Process adjustments
        let periodAdjustments: Adjustment[] = []
        if (adjRes?.ok) {
          try {
            const adjData = await adjRes.json()
            // Store raw adjustments with proper number conversion
            periodAdjustments = (adjData.adjustments || []).map((a: Adjustment & { amount: string | number }) => ({
              ...a,
              amount: Number(a.amount) || 0
            }))
            const totalAddBacks = periodAdjustments
              .filter(a => a.type === 'ADD_BACK')
              .reduce((sum, a) => sum + (a.frequency === 'MONTHLY' ? a.amount * 12 : a.amount), 0)
            const totalDeductions = periodAdjustments
              .filter(a => a.type === 'DEDUCTION')
              .reduce((sum, a) => sum + (a.frequency === 'MONTHLY' ? a.amount * 12 : a.amount), 0)
            const netAdjustment = totalAddBacks - totalDeductions
            const baseEbitda = Number(periodData.ebitda) || 0
            periodData.totalAddBacks = totalAddBacks
            periodData.totalDeductions = totalDeductions
            periodData.netAdjustment = netAdjustment
            periodData.adjustedEbitda = baseEbitda + netAdjustment
          } catch (e) {
            console.error('Error parsing adjustments for period', period.id, e)
          }
        }

        // Process cash flow
        if (cfRes?.ok) {
          try {
            const cfData = await cfRes.json()
            if (cfData.cashFlowStatement) {
              const cf = convertDecimalsToNumbers(cfData.cashFlowStatement)
              periodData.netIncome = cf.netIncome
              periodData.depreciationCF = cf.depreciation
              periodData.amortizationCF = cf.amortization
              periodData.cashFromOperations = cf.cashFromOperations
              periodData.capitalExpenditures = cf.capitalExpenditures
              periodData.cashFromInvesting = cf.cashFromInvesting
              periodData.cashFromFinancing = cf.cashFromFinancing
              periodData.netChangeInCash = cf.netChangeInCash
              periodData.freeCashFlow = cf.freeCashFlow
            }
          } catch (e) {
            console.error('Error parsing Cash Flow for period', period.id, e)
          }
        }

        return { periodId: period.id, data: periodData, adjustments: periodAdjustments }
      })

      // Wait for all periods to complete in parallel
      const results = await Promise.all(allFetches)

      // Build the data object and collect all adjustments
      const newData: Record<string, PeriodData> = {}
      const allAdjustments: Adjustment[] = []
      for (const result of results) {
        newData[result.periodId] = result.data
        allAdjustments.push(...result.adjustments)
      }

      setData(newData)
      setAdjustments(allAdjustments)
    } catch (err) {
      console.error('Error loading financial data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Sort periods by fiscal year (needed by handlers below)
  const sortedPeriods = useMemo(() => {
    return [...periods].sort((a, b) => a.fiscalYear - b.fiscalYear)
  }, [periods])

  // Auto-save with debounce
  const saveChanges = useCallback(async () => {
    if (pendingChangesRef.current.size === 0) return

    setIsSaving(true)
    setSaveStatus('saving')

    try {
      // Group changes by period and statement type
      const changesByPeriod = new Map<string, Map<string, number>>()

      pendingChangesRef.current.forEach((change) => {
        if (!changesByPeriod.has(change.periodId)) {
          changesByPeriod.set(change.periodId, new Map())
        }
        changesByPeriod.get(change.periodId)!.set(change.field, change.value)
      })

      // Track valuation impact from the last P&L save
      let lastValuationImpact: {
        previousValue: number | null
        newValue: number | null
        isFirstFinancials: boolean
      } | null = null

      // Save each period's changes
      for (const [periodId, fields] of changesByPeriod) {
        const periodData = data[periodId] || {}

        // Determine which statement to update based on fields
        const pnlFields = ['grossRevenue', 'cogs', 'operatingExpenses', 'depreciation', 'amortization', 'interestExpense', 'taxExpense']
        const bsFields = ['cash', 'accountsReceivable', 'inventory', 'prepaidExpenses', 'otherCurrentAssets', 'ppeGross', 'accumulatedDepreciation', 'intangibleAssets', 'otherLongTermAssets', 'accountsPayable', 'accruedExpenses', 'currentPortionLtd', 'otherCurrentLiabilities', 'longTermDebt', 'deferredTaxLiabilities', 'otherLongTermLiabilities', 'retainedEarnings', 'ownersEquity']

        const hasPnlChanges = Array.from(fields.keys()).some(f => pnlFields.includes(f))
        const hasBsChanges = Array.from(fields.keys()).some(f => bsFields.includes(f))

        if (hasPnlChanges) {
          const pnlData = {
            grossRevenue: fields.get('grossRevenue') ?? periodData.grossRevenue ?? 0,
            cogs: fields.get('cogs') ?? periodData.cogs ?? 0,
            operatingExpenses: fields.get('operatingExpenses') ?? periodData.operatingExpenses ?? 0,
            depreciation: fields.get('depreciation') ?? periodData.depreciation ?? 0,
            amortization: fields.get('amortization') ?? periodData.amortization ?? 0,
            interestExpense: fields.get('interestExpense') ?? periodData.interestExpense ?? 0,
            taxExpense: fields.get('taxExpense') ?? periodData.taxExpense ?? 0,
          }

          const response = await fetchWithRetry(`/api/companies/${companyId}/financial-periods/${periodId}/income-statement`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pnlData),
          })

          // Check for valuation impact in response
          if (response.ok) {
            try {
              const responseData = await response.json()
              if (responseData.valuationImpact) {
                lastValuationImpact = responseData.valuationImpact
              }
            } catch (_e) {
              // Ignore parsing errors
            }
          }
        }

        if (hasBsChanges) {
          const bsData: Record<string, number> = {}
          bsFields.forEach(field => {
            bsData[field] = fields.get(field) ?? (periodData as Record<string, number>)[field] ?? 0
          })

          await fetchWithRetry(`/api/companies/${companyId}/financial-periods/${periodId}/balance-sheet`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bsData),
          })
        }
      }

      // Track financial data saved
      const savedPeriods = new Set(Array.from(pendingChangesRef.current.values()).map(c => c.periodId))
      const savedFields = Array.from(pendingChangesRef.current.values())

      for (const periodId of savedPeriods) {
        const periodFields = savedFields.filter(f => f.periodId === periodId)
        const periodData = data[periodId] || {}
        const hasPnlFields = periodFields.some(f =>
          ['grossRevenue', 'cogs', 'operatingExpenses', 'depreciation', 'amortization', 'interestExpense', 'taxExpense'].includes(f.field)
        )
        const hasBsFields = periodFields.some(f =>
          ['cash', 'accountsReceivable', 'inventory', 'totalAssets', 'totalLiabilities'].includes(f.field)
        )

        analytics.track('financial_data_saved', {
          statementType: hasPnlFields ? 'pnl' : hasBsFields ? 'balance_sheet' : 'pnl',
          periodId,
          fieldsUpdated: periodFields.length,
          hasEbitda: !!periodData.ebitda && periodData.ebitda > 0,
        })
      }

      pendingChangesRef.current.clear()
      setSaveStatus('saved')

      // Note: We no longer reload data after save to avoid disrupting user input
      // Derived values are calculated locally in handleCellChange

      // Show valuation impact celebration if there's a meaningful change
      if (lastValuationImpact?.newValue) {
        const { previousValue, newValue, isFirstFinancials } = lastValuationImpact
        const change = previousValue ? newValue - previousValue : newValue
        const percentChange = previousValue && previousValue > 0
          ? ((newValue - previousValue) / previousValue) * 100
          : null

        // Update valuation tracking state
        setCurrentValuation(newValue)
        setSessionStartValuation(prev => prev === null ? (previousValue ?? newValue) : prev)
        setLastValuationChange({
          previousValue,
          newValue,
          change,
          percentChange,
          isFirstFinancials: isFirstFinancials || false,
        })

        // Show celebration for first financials OR significant changes (>5%)
        if (isFirstFinancials || (percentChange !== null && Math.abs(percentChange) > 5)) {
          setValuationCelebration({
            previousValue,
            newValue,
            isFirstFinancials: isFirstFinancials || false,
          })
        } else {
          // For smaller changes, show the banner instead
          setShowValuationBanner(true)
        }

        // Show next steps prompt after a delay
        if (nextStepsTimeoutRef.current) {
          clearTimeout(nextStepsTimeoutRef.current)
        }
        nextStepsTimeoutRef.current = setTimeout(() => {
          setShowNextSteps(true)
        }, 3000)
      } else {
        // Always show banner after successful save with P&L data
        const hasPnlData = Array.from(pendingChangesRef.current.values()).some(c =>
          ['grossRevenue', 'cogs', 'operatingExpenses'].includes(c.field)
        )
        if (hasPnlData) {
          setShowValuationBanner(true)
        }
      }

      // Reset status after a delay
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Error saving changes:', err)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }, [companyId, data])

  // Handle cell change with debounced save
  const handleCellChange = useCallback((periodId: string, field: string, value: number) => {
    // P&L fields that affect derived calculations
    const pnlFields = ['grossRevenue', 'cogs', 'operatingExpenses', 'depreciation', 'amortization', 'interestExpense', 'taxExpense']
    // Balance sheet fields that affect derived calculations
    const bsFields = ['cash', 'accountsReceivable', 'inventory', 'prepaidExpenses', 'otherCurrentAssets', 'ppeGross', 'accumulatedDepreciation', 'intangibleAssets', 'otherLongTermAssets', 'accountsPayable', 'accruedExpenses', 'currentPortionLtd', 'otherCurrentLiabilities', 'longTermDebt', 'deferredTaxLiabilities', 'otherLongTermLiabilities', 'retainedEarnings', 'ownersEquity']

    // Update local state immediately and recalculate derived values
    setData(prev => {
      const updatedPeriodData = {
        ...prev[periodId],
        [field]: value,
      }

      // Recalculate derived values based on which field changed
      let derivedValues: Partial<PeriodData> = {}
      if (pnlFields.includes(field)) {
        derivedValues = calculatePnlDerivedValues(updatedPeriodData)
      } else if (bsFields.includes(field)) {
        derivedValues = calculateBsDerivedValues(updatedPeriodData)
      }

      return {
        ...prev,
        [periodId]: {
          ...updatedPeriodData,
          ...derivedValues,
        },
      }
    })

    // Track pending change
    const key = `${periodId}-${field}`
    pendingChangesRef.current.set(key, { periodId, field, value })

    // Debounce save - 3 seconds gives users time to finish entering data
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(saveChanges, 3000)
  }, [saveChanges])

  // Handle period delete
  const handleDeletePeriod = useCallback(async () => {
    if (!periodToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetchWithRetry(
        `/api/companies/${companyId}/financial-periods/${periodToDelete.id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete period')
      }

      // Remove from local state and refetch
      setPeriodToDelete(null)
      loadData()
    } catch (err) {
      console.error('Error deleting period:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete period')
    } finally {
      setIsDeleting(false)
    }
  }, [companyId, periodToDelete, loadData])

  // Add a new adjustment to all periods
  const handleAddAdjustment = useCallback(async (description: string, type: 'ADD_BACK' | 'DEDUCTION') => {
    if (!description.trim()) return

    try {
      // Add to all periods with amount = 0 (user will fill in amounts)
      const newAdjustments: Adjustment[] = []
      for (const period of sortedPeriods) {
        const response = await fetchWithRetry(`/api/companies/${companyId}/adjustments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description,
            amount: 0,
            type,
            frequency: 'ANNUAL',
            periodId: period.id,
          }),
        })
        if (response.ok) {
          const data = await response.json()
          newAdjustments.push({ ...data.adjustment, amount: Number(data.adjustment.amount) || 0 })
        }
      }
      setAdjustments(prev => [...prev, ...newAdjustments])
      setShowAddAdjustment(false)
      setNewAdjustment({ description: '', type: 'ADD_BACK' })

      // Track EBITDA adjustment made
      analytics.track('ebitda_adjustment_made', {
        adjustmentType: type === 'ADD_BACK' ? 'add_back' : 'deduction',
        adjustmentCategory: description,
        amount: 0, // Initial amount is 0
        isNew: true,
      })
    } catch (err) {
      console.error('Error adding adjustment:', err)
    }
  }, [companyId, sortedPeriods])

  // Update an adjustment amount
  const handleUpdateAdjustmentAmount = useCallback(async (adjustmentId: string, amount: number) => {
    try {
      const response = await fetchWithRetry(`/api/companies/${companyId}/adjustments?adjustmentId=${adjustmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      if (response.ok) {
        const adjustment = adjustments.find(a => a.id === adjustmentId)

        setAdjustments(prev => prev.map(a =>
          a.id === adjustmentId ? { ...a, amount } : a
        ))

        // Track EBITDA adjustment update
        if (adjustment) {
          analytics.track('ebitda_adjustment_made', {
            adjustmentType: adjustment.type === 'ADD_BACK' ? 'add_back' : 'deduction',
            adjustmentCategory: adjustment.description,
            amount,
            isNew: false,
          })
        }

        // Recalculate totals for the affected period
        if (adjustment) {
          const periodAdjs = adjustments
            .map(a => a.id === adjustmentId ? { ...a, amount } : a)
            .filter(a => a.periodId === adjustment.periodId)
          const totalAddBacks = periodAdjs
            .filter(a => a.type === 'ADD_BACK')
            .reduce((sum, a) => sum + (a.frequency === 'MONTHLY' ? a.amount * 12 : a.amount), 0)
          const totalDeductions = periodAdjs
            .filter(a => a.type === 'DEDUCTION')
            .reduce((sum, a) => sum + (a.frequency === 'MONTHLY' ? a.amount * 12 : a.amount), 0)
          const netAdjustment = totalAddBacks - totalDeductions
          setData(prev => ({
            ...prev,
            [adjustment.periodId]: {
              ...prev[adjustment.periodId],
              totalAddBacks,
              totalDeductions,
              netAdjustment,
              adjustedEbitda: (prev[adjustment.periodId]?.ebitda || 0) + netAdjustment,
            }
          }))
        }
      }
    } catch (err) {
      console.error('Error updating adjustment:', err)
    }
  }, [companyId, adjustments])

  // Create a new adjustment for a specific period (when one doesn't exist)
  const handleCreateAdjustmentForPeriod = useCallback(async (
    periodId: string,
    description: string,
    type: 'ADD_BACK' | 'DEDUCTION',
    amount: number
  ) => {
    try {
      const response = await fetchWithRetry(`/api/companies/${companyId}/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount,
          type,
          frequency: 'ANNUAL',
          periodId,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        const newAdj = { ...data.adjustment, amount: Number(data.adjustment.amount) || 0 }
        setAdjustments(prev => [...prev, newAdj])

        // Recalculate totals for the period
        const periodAdjs = [...adjustments.filter(a => a.periodId === periodId), newAdj]
        const totalAddBacks = periodAdjs
          .filter(a => a.type === 'ADD_BACK')
          .reduce((sum, a) => sum + (a.frequency === 'MONTHLY' ? a.amount * 12 : a.amount), 0)
        const totalDeductions = periodAdjs
          .filter(a => a.type === 'DEDUCTION')
          .reduce((sum, a) => sum + (a.frequency === 'MONTHLY' ? a.amount * 12 : a.amount), 0)
        const netAdjustment = totalAddBacks - totalDeductions
        setData(prev => ({
          ...prev,
          [periodId]: {
            ...prev[periodId],
            totalAddBacks,
            totalDeductions,
            netAdjustment,
            adjustedEbitda: (prev[periodId]?.ebitda || 0) + netAdjustment,
          }
        }))
      }
    } catch (err) {
      console.error('Error creating adjustment:', err)
    }
  }, [companyId, adjustments])

  // Delete an adjustment (from all periods with same description)
  const handleDeleteAdjustment = useCallback(async (description: string) => {
    try {
      // Find all adjustments with this description and delete them
      const toDelete = adjustments.filter(a => a.description === description)
      for (const adj of toDelete) {
        await fetchWithRetry(`/api/companies/${companyId}/adjustments?adjustmentId=${adj.id}`, {
          method: 'DELETE',
        })
      }
      // Update local state and recalculate totals
      const remainingAdjustments = adjustments.filter(a => a.description !== description)
      setAdjustments(remainingAdjustments)

      // Recalculate totals for all affected periods
      const affectedPeriodIds = new Set(toDelete.map(a => a.periodId))
      setData(prev => {
        const newData = { ...prev }
        affectedPeriodIds.forEach(periodId => {
          const periodAdjs = remainingAdjustments.filter(a => a.periodId === periodId)
          const totalAddBacks = periodAdjs
            .filter(a => a.type === 'ADD_BACK')
            .reduce((sum, a) => sum + (a.frequency === 'MONTHLY' ? a.amount * 12 : a.amount), 0)
          const totalDeductions = periodAdjs
            .filter(a => a.type === 'DEDUCTION')
            .reduce((sum, a) => sum + (a.frequency === 'MONTHLY' ? a.amount * 12 : a.amount), 0)
          const netAdjustment = totalAddBacks - totalDeductions
          newData[periodId] = {
            ...newData[periodId],
            totalAddBacks,
            totalDeductions,
            netAdjustment,
            adjustedEbitda: (newData[periodId]?.ebitda || 0) + netAdjustment,
          }
        })
        return newData
      })
    } catch (err) {
      console.error('Error deleting adjustment:', err)
    }
  }, [companyId, adjustments])

  // Get unique adjustment descriptions (for displaying rows)
  const uniqueAdjustmentDescriptions = useMemo(() => {
    const descriptions = new Map<string, { type: 'ADD_BACK' | 'DEDUCTION' }>()
    adjustments.forEach(a => {
      if (!descriptions.has(a.description)) {
        descriptions.set(a.description, { type: a.type })
      }
    })
    return Array.from(descriptions.entries()).map(([description, { type }]) => ({ description, type }))
  }, [adjustments])

  // Get rows for current tab
  const rows = useMemo(() => {
    switch (activeTab) {
      case 'pnl': return pnlRows
      case 'balance-sheet': return balanceSheetRows
      case 'add-backs': return addBacksRows
      case 'cash-flow': return cashFlowRows
      default: return pnlRows
    }
  }, [activeTab])

  // Build a grid map of editable cells for navigation
  // Cell ID format: "rowIndex-colIndex" where rowIndex is the row in the current tab
  const editableCellGrid = useMemo(() => {
    const grid: { rowIndex: number; colIndex: number; cellId: string }[] = []
    const isEditableTab = activeTab !== 'cash-flow'

    if (!isEditableTab) return grid

    rows.forEach((row, rowIndex) => {
      if (row.editable) {
        sortedPeriods.forEach((period, colIndex) => {
          const cellId = `${rowIndex}-${colIndex}`
          grid.push({ rowIndex, colIndex, cellId })
        })
      }
    })

    return grid
  }, [rows, sortedPeriods, activeTab])

  // Navigation handler
  const handleNavigate = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (!activeCellId) return

    const [currentRowStr, currentColStr] = activeCellId.split('-')
    const currentRow = parseInt(currentRowStr, 10)
    const currentCol = parseInt(currentColStr, 10)

    let nextRow = currentRow
    let nextCol = currentCol

    if (direction === 'right') {
      nextCol = currentCol + 1
      // Wrap to next editable row if at end of columns
      if (nextCol >= sortedPeriods.length) {
        nextCol = 0
        // Find next editable row
        for (let r = currentRow + 1; r < rows.length; r++) {
          if (rows[r].editable) {
            nextRow = r
            break
          }
        }
        // If we didn't find a next editable row, stay at current
        if (nextRow === currentRow) {
          nextCol = currentCol
        }
      }
    } else if (direction === 'left') {
      nextCol = currentCol - 1
      // Wrap to previous editable row if at start of columns
      if (nextCol < 0) {
        nextCol = sortedPeriods.length - 1
        // Find previous editable row
        for (let r = currentRow - 1; r >= 0; r--) {
          if (rows[r].editable) {
            nextRow = r
            break
          }
        }
        // If we didn't find a previous editable row, stay at current
        if (nextRow === currentRow) {
          nextCol = currentCol
        }
      }
    } else if (direction === 'down') {
      // Find next editable row
      for (let r = currentRow + 1; r < rows.length; r++) {
        if (rows[r].editable) {
          nextRow = r
          break
        }
      }
    } else if (direction === 'up') {
      // Find previous editable row
      for (let r = currentRow - 1; r >= 0; r--) {
        if (rows[r].editable) {
          nextRow = r
          break
        }
      }
    }

    // Check if the new cell exists and is editable
    const nextCellId = `${nextRow}-${nextCol}`
    const cellExists = editableCellGrid.some(c => c.cellId === nextCellId)

    if (cellExists) {
      setActiveCellId(nextCellId)
    }
  }, [activeCellId, sortedPeriods.length, rows, editableCellGrid])

  // Navigation handler for Add-Backs tab
  // Cell ID format: "adj-{rowIndex}-{colIndex}" where rowIndex is index in adjustment list
  const handleAdjustmentNavigate = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (!activeCellId || !activeCellId.startsWith('adj-')) return

    const parts = activeCellId.split('-')
    const currentRow = parseInt(parts[1], 10)
    const currentCol = parseInt(parts[2], 10)

    // Build ordered list of all adjustment rows (add-backs first, then deductions)
    const addBacks = uniqueAdjustmentDescriptions.filter(a => a.type === 'ADD_BACK')
    const deductions = uniqueAdjustmentDescriptions.filter(a => a.type === 'DEDUCTION')
    const allRows = [...addBacks, ...deductions]
    const totalRows = allRows.length
    const totalCols = sortedPeriods.length

    let nextRow = currentRow
    let nextCol = currentCol

    if (direction === 'right') {
      nextCol = currentCol + 1
      if (nextCol >= totalCols) {
        nextCol = 0
        nextRow = currentRow + 1
        if (nextRow >= totalRows) {
          nextRow = 0 // Wrap to first row
        }
      }
    } else if (direction === 'left') {
      nextCol = currentCol - 1
      if (nextCol < 0) {
        nextCol = totalCols - 1
        nextRow = currentRow - 1
        if (nextRow < 0) {
          nextRow = totalRows - 1 // Wrap to last row
        }
      }
    } else if (direction === 'down') {
      nextRow = currentRow + 1
      if (nextRow >= totalRows) {
        nextRow = 0 // Wrap to first row
      }
    } else if (direction === 'up') {
      nextRow = currentRow - 1
      if (nextRow < 0) {
        nextRow = totalRows - 1 // Wrap to last row
      }
    }

    if (totalRows > 0) {
      setActiveCellId(`adj-${nextRow}-${nextCol}`)
    }
  }, [activeCellId, uniqueAdjustmentDescriptions, sortedPeriods.length])

  // Clear active cell when switching tabs
  useEffect(() => {
    setActiveCellId('')
  }, [activeTab])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="text-red-600">{error}</p>
            <Button onClick={loadData}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Financials</h1>
          <p className="text-muted-foreground">Enter and compare financial data across periods</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live Valuation Ticker */}
          <AnimatePresence mode="wait">
            {currentValuation !== null && (
              <motion.div
                key={currentValuation}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg"
              >
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatCurrencyCompact(currentValuation)}
                </span>
                {sessionStartValuation !== null && currentValuation !== sessionStartValuation && (
                  <span className={cn(
                    'text-xs font-medium',
                    currentValuation > sessionStartValuation
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  )}>
                    {currentValuation > sessionStartValuation ? '+' : ''}
                    {formatCurrencyCompact(currentValuation - sessionStartValuation)} this session
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save status indicator */}
          <AnimatePresence mode="wait">
            {saveStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                  'flex items-center gap-2 text-sm px-3 py-1 rounded-full',
                  saveStatus === 'saving' && 'bg-muted text-muted-foreground',
                  saveStatus === 'saved' && 'bg-green-100 text-green-700',
                  saveStatus === 'error' && 'bg-red-100 text-red-700'
                )}
              >
                {saveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
                {saveStatus === 'saved' && <Check className="h-3 w-3" />}
                {saveStatus === 'error' && <AlertCircle className="h-3 w-3" />}
                <span>
                  {saveStatus === 'saving' && 'Saving...'}
                  {saveStatus === 'saved' && 'Saved'}
                  {saveStatus === 'error' && 'Error saving'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Valuation Updated Banner */}
      <AnimatePresence>
        {showValuationBanner && lastValuationChange && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-full">
                  {lastValuationChange.isFirstFinancials
                    ? <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    : <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  }
                </div>
                <div>
                  {lastValuationChange.isFirstFinancials ? (
                    <>
                      <p className="font-medium text-emerald-800 dark:text-emerald-200">
                        Your valuation is live! {formatCurrency(lastValuationChange.newValue)}
                      </p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        Your financials are now powering a more accurate valuation.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-emerald-800 dark:text-emerald-200">
                        {lastValuationChange.previousValue
                          ? `${formatCurrency(lastValuationChange.previousValue)} → ${formatCurrency(lastValuationChange.newValue)}`
                          : formatCurrency(lastValuationChange.newValue)
                        }
                        {lastValuationChange.change !== 0 && (
                          <span className={cn(
                            'ml-2 text-sm',
                            lastValuationChange.change > 0 ? 'text-emerald-600' : 'text-red-600'
                          )}>
                            ({lastValuationChange.change > 0 ? '+' : ''}{formatCurrencyCompact(lastValuationChange.change)}
                            {lastValuationChange.percentChange !== null &&
                              ` / ${lastValuationChange.change > 0 ? '+' : ''}${lastValuationChange.percentChange.toFixed(1)}%`
                            })
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        Your valuation has been updated based on your financial data.
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    View Impact
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
                <button
                  onClick={() => setShowValuationBanner(false)}
                  className="p-1.5 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next Steps Prompt */}
      <AnimatePresence>
        {showNextSteps && !showValuationBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                  <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  {sortedPeriods.length === 1 ? (
                    <>
                      <p className="font-medium text-blue-800 dark:text-blue-200">
                        Great start! Buyers want to see 3 years of trends.
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Add another year to strengthen your profile and improve accuracy.
                      </p>
                    </>
                  ) : adjustments.length === 0 ? (
                    <>
                      <p className="font-medium text-blue-800 dark:text-blue-200">
                        Consider adding owner add-backs
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Add-backs increase your adjusted EBITDA and can significantly raise your valuation.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-blue-800 dark:text-blue-200">
                        Your financial profile is looking strong
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        See how your value compares and find more ways to improve.
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {adjustments.length === 0 ? (
                  <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100" onClick={() => { setActiveTab('add-backs'); setShowNextSteps(false) }}>
                    Add-Backs
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Link href="/dashboard">
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                      Value Builder
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                )}
                <button
                  onClick={() => setShowNextSteps(false)}
                  className="p-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-sm"
                >
                  Later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      {!hideTabs && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatementType)}>
          <TabsList>
            {!hidePnlTab && <TabsTrigger value="pnl">P&L</TabsTrigger>}
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="add-backs">Add-Backs</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Spreadsheet Grid */}
      {sortedPeriods.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-muted-foreground">No fiscal years yet. Return to the financials page to set up your periods.</p>
            </div>
          </CardContent>
        </Card>
      ) : activeTab === 'add-backs' ? (
        /* Special Add-Backs Tab with individual line items */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto" data-spreadsheet-grid>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground sticky left-0 bg-muted/50 min-w-[280px] z-20">
                      Add-Backs & Adjustments
                    </th>
                    {sortedPeriods.map((period) => (
                      <th key={period.id} className="text-right py-3 px-4 font-semibold text-foreground min-w-[140px]">
                        {period.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Add-Backs Section Header */}
                  <tr className="border-b bg-emerald-50">
                    <td colSpan={sortedPeriods.length + 1} className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4 text-emerald-600" />
                        <span className="font-semibold text-emerald-700 text-xs uppercase tracking-wider">Add-Backs</span>
                        <span className="text-xs text-emerald-600">({uniqueAdjustmentDescriptions.filter(a => a.type === 'ADD_BACK').length} items)</span>
                      </div>
                    </td>
                  </tr>

                  {/* Add-Back Items */}
                  {uniqueAdjustmentDescriptions.filter(a => a.type === 'ADD_BACK').map((item, rowIndex) => (
                    <tr key={item.description} className="border-b hover:bg-muted/10 group">
                      <td className="py-2 px-4 pl-8 sticky left-0 bg-white z-10">
                        <div className="flex items-center justify-between">
                          <span>{item.description}</span>
                          <button
                            onClick={() => handleDeleteAdjustment(item.description)}
                            className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      {sortedPeriods.map((period, colIndex) => {
                        const adj = adjustments.find(a => a.periodId === period.id && a.description === item.description)
                        const cellId = `adj-${rowIndex}-${colIndex}`
                        return (
                          <td key={period.id} className="p-0">
                            <AdjustmentCell
                              value={adj?.amount || 0}
                              onChange={(amount) => {
                                if (adj) {
                                  handleUpdateAdjustmentAmount(adj.id, amount)
                                } else {
                                  // No adjustment exists for this period - create one
                                  handleCreateAdjustmentForPeriod(period.id, item.description, item.type, amount)
                                }
                              }}
                              cellId={cellId}
                              isActive={activeCellId === cellId}
                              onActivate={setActiveCellId}
                              onNavigate={handleAdjustmentNavigate}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}

                  {uniqueAdjustmentDescriptions.filter(a => a.type === 'ADD_BACK').length === 0 && (
                    <tr className="border-b">
                      <td colSpan={sortedPeriods.length + 1} className="py-4 px-8 text-muted-foreground text-sm italic">
                        No add-backs yet. Click &quot;Add Adjustment&quot; below.
                      </td>
                    </tr>
                  )}

                  {/* Add-Backs Total */}
                  <tr className="border-b bg-emerald-50">
                    <td className="py-2 px-4 pl-8 font-semibold text-emerald-700 sticky left-0 bg-emerald-50 z-10">Total Add-Backs</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="py-2 px-4 text-right font-semibold text-emerald-700">
                        {formatCurrency(data[period.id]?.totalAddBacks || 0)}
                      </td>
                    ))}
                  </tr>

                  {/* Deductions Section Header */}
                  <tr className="border-b bg-red-50">
                    <td colSpan={sortedPeriods.length + 1} className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <MinusCircle className="h-4 w-4 text-red-600" />
                        <span className="font-semibold text-red-700 text-xs uppercase tracking-wider">Deductions</span>
                        <span className="text-xs text-red-600">({uniqueAdjustmentDescriptions.filter(a => a.type === 'DEDUCTION').length} items)</span>
                      </div>
                    </td>
                  </tr>

                  {/* Deduction Items */}
                  {uniqueAdjustmentDescriptions.filter(a => a.type === 'DEDUCTION').map((item, deductionIndex) => {
                    // Row index accounts for add-backs coming first
                    const addBacksCount = uniqueAdjustmentDescriptions.filter(a => a.type === 'ADD_BACK').length
                    const rowIndex = addBacksCount + deductionIndex
                    return (
                      <tr key={item.description} className="border-b hover:bg-muted/10 group">
                        <td className="py-2 px-4 pl-8 sticky left-0 bg-white z-10">
                          <div className="flex items-center justify-between">
                            <span>{item.description}</span>
                            <button
                              onClick={() => handleDeleteAdjustment(item.description)}
                              className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        {sortedPeriods.map((period, colIndex) => {
                          const adj = adjustments.find(a => a.periodId === period.id && a.description === item.description)
                          const cellId = `adj-${rowIndex}-${colIndex}`
                          return (
                            <td key={period.id} className="p-0">
                              <AdjustmentCell
                                value={adj?.amount || 0}
                                onChange={(amount) => {
                                  if (adj) {
                                    handleUpdateAdjustmentAmount(adj.id, amount)
                                  } else {
                                    // No adjustment exists for this period - create one
                                    handleCreateAdjustmentForPeriod(period.id, item.description, item.type, amount)
                                  }
                                }}
                                cellId={cellId}
                                isActive={activeCellId === cellId}
                                onActivate={setActiveCellId}
                                onNavigate={handleAdjustmentNavigate}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}

                  {uniqueAdjustmentDescriptions.filter(a => a.type === 'DEDUCTION').length === 0 && (
                    <tr className="border-b">
                      <td colSpan={sortedPeriods.length + 1} className="py-4 px-8 text-muted-foreground text-sm italic">
                        No deductions yet.
                      </td>
                    </tr>
                  )}

                  {/* Deductions Total */}
                  <tr className="border-b bg-red-50">
                    <td className="py-2 px-4 pl-8 font-semibold text-red-700 sticky left-0 bg-red-50 z-10">Total Deductions</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="py-2 px-4 text-right font-semibold text-red-700">
                        ({formatCurrency(data[period.id]?.totalDeductions || 0)})
                      </td>
                    ))}
                  </tr>

                  {/* Net Adjustment */}
                  <tr className="border-b bg-blue-50">
                    <td className="py-3 px-4 font-bold text-blue-700 sticky left-0 bg-blue-50 z-10">Net Adjustment</td>
                    {sortedPeriods.map((period) => {
                      const net = data[period.id]?.netAdjustment || 0
                      return (
                        <td key={period.id} className="py-3 px-4 text-right font-bold text-blue-700">
                          {net >= 0 ? '+' : ''}{formatCurrency(net)}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Impact Section */}
                  <tr className="border-b bg-muted/30">
                    <td colSpan={sortedPeriods.length + 1} className="py-2 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Impact on Valuation
                    </td>
                  </tr>

                  <tr className="border-b">
                    <td className="py-2 px-4 pl-8 sticky left-0 bg-white z-10">Base EBITDA</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="py-2 px-4 text-right font-mono">
                        {formatCurrency(data[period.id]?.ebitda || 0)}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b bg-muted/50">
                    <td className="py-3 px-4 font-bold sticky left-0 bg-muted/50 z-10">Adjusted EBITDA</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="py-3 px-4 text-right font-bold font-mono">
                        {formatCurrency(data[period.id]?.adjustedEbitda || 0)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Add Adjustment Section */}
            <div className="p-4 border-t bg-muted/20">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => setShowAddAdjustment(!showAddAdjustment)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Adjustment
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowCommonAddBacks(!showCommonAddBacks)}>
                  {showCommonAddBacks ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  Common Add-Backs
                </Button>
              </div>

              {/* Custom Add Form */}
              {showAddAdjustment && (
                <div className="mt-4 p-4 bg-white rounded-lg border">
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-muted-foreground block mb-1">Description</label>
                      <Input
                        value={newAdjustment.description}
                        onChange={(e) => setNewAdjustment(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g., Owner's salary adjustment"
                      />
                    </div>
                    <div className="w-40">
                      <label className="text-sm font-medium text-muted-foreground block mb-1">Type</label>
                      <Select value={newAdjustment.type} onValueChange={(v) => setNewAdjustment(prev => ({ ...prev, type: v as 'ADD_BACK' | 'DEDUCTION' }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADD_BACK">Add-Back</SelectItem>
                          <SelectItem value="DEDUCTION">Deduction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => handleAddAdjustment(newAdjustment.description, newAdjustment.type)} disabled={!newAdjustment.description.trim()}>
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {/* Common Add-Backs List */}
              {showCommonAddBacks && (
                <div className="mt-4 p-4 bg-white rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-3">Click to add common adjustment items:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {COMMON_ADDBACKS.filter(item =>
                      !uniqueAdjustmentDescriptions.some(a => a.description === item.description)
                    ).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleAddAdjustment(item.description, item.defaultType)}
                        className={cn(
                          'text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors',
                          item.defaultType === 'DEDUCTION' && 'border-red-200 hover:border-red-400'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.description}</span>
                          {item.defaultType === 'DEDUCTION' && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">Deduction</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>
                      </button>
                    ))}
                  </div>
                  {COMMON_ADDBACKS.filter(item => !uniqueAdjustmentDescriptions.some(a => a.description === item.description)).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">All common items have been added.</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Standard Spreadsheet for P&L, Balance Sheet, Cash Flow */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto" data-spreadsheet-grid>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground sticky left-0 bg-muted/50 min-w-[220px] z-20">
                      {activeTab === 'pnl' && 'Profit & Loss'}
                      {activeTab === 'balance-sheet' && 'Balance Sheet'}
                      {activeTab === 'cash-flow' && 'Cash Flow Statement'}
                    </th>
                    {sortedPeriods.map((period) => (
                      <th
                        key={period.id}
                        className="text-right py-3 px-4 font-semibold text-foreground min-w-[140px]"
                      >
                        <div className="flex items-center justify-end gap-2">
                          <span>{period.label}</span>
                          {(activeTab === 'pnl' || activeTab === 'balance-sheet') && (
                            <button
                              onClick={() => setPeriodToDelete(period)}
                              className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                              title={`Delete ${period.label}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => {
                    if (row.isHeader) {
                      return (
                        <tr key={rowIndex} className="border-b bg-muted/30">
                          <td
                            colSpan={sortedPeriods.length + 1}
                            className="py-2 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider"
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
                          'border-b transition-colors',
                          row.isTotal && 'bg-muted/50',
                          row.isSubtotal && 'bg-muted/20',
                          !row.isTotal && !row.isSubtotal && 'hover:bg-muted/10'
                        )}
                      >
                        <td
                          className={cn(
                            'py-2 px-4 sticky left-0 bg-white z-10',
                            row.isTotal && 'font-bold text-foreground bg-muted/50',
                            row.isSubtotal && 'font-semibold text-foreground bg-muted/20',
                            row.indent === 1 && 'pl-8',
                            row.indent === 2 && 'pl-12'
                          )}
                        >
                          {row.label}
                        </td>
                        {sortedPeriods.map((period, periodIndex) => {
                          const periodData = data[period.id] || {}
                          // Use calculate function if provided, otherwise use field value
                          const value = row.calculate
                            ? row.calculate(periodData)
                            : (row.field ? periodData[row.field] : null)
                          const previousPeriod = sortedPeriods[periodIndex - 1]
                          const previousPeriodData = previousPeriod ? data[previousPeriod.id] || {} : null
                          const previousValue = previousPeriodData
                            ? (row.calculate
                                ? row.calculate(previousPeriodData)
                                : (row.field ? previousPeriodData[row.field] : undefined))
                            : undefined

                          const cellId = `${rowIndex}-${periodIndex}`
                          const isEditable = row.editable && activeTab !== 'cash-flow'

                          return (
                            <td key={period.id} className="p-0">
                              <SpreadsheetCell
                                value={value}
                                format={row.format}
                                editable={isEditable}
                                isTotal={row.isTotal}
                                isSubtotal={row.isSubtotal}
                                previousValue={previousValue}
                                cellId={cellId}
                                isActive={activeCellId === cellId}
                                onActivate={setActiveCellId}
                                onNavigate={handleNavigate}
                                onChange={row.field && row.editable
                                  ? (v) => handleCellChange(period.id, row.field!, v)
                                  : undefined
                                }
                              />
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
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!periodToDelete} onOpenChange={(open) => !open && setPeriodToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {periodToDelete?.label}?</DialogTitle>
            <DialogDescription>
              This will permanently delete all financial data for {periodToDelete?.label}, including income statement, balance sheet, and cash flow data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPeriodToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePeriod}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Valuation Impact Celebration */}
      {valuationCelebration && (
        <ValuationImpactCelebration
          previousValue={valuationCelebration.previousValue}
          newValue={valuationCelebration.newValue}
          isFirstFinancials={valuationCelebration.isFirstFinancials}
          onDismiss={() => setValuationCelebration(null)}
        />
      )}
    </div>
  )
}
