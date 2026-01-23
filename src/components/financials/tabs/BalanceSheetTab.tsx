'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Wallet,
  Building2,
  CreditCard,
  Landmark,
  Users,
} from 'lucide-react'

interface BalanceSheetTabProps {
  companyId: string
  periodId: string
  onDirty?: () => void
}

// Moved outside component to prevent re-creation on each render
const formatInputValue = (value: number) => {
  if (value === 0) return ''
  return new Intl.NumberFormat('en-US').format(value)
}

const parseInputValue = (value: string) => {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

// InputField moved outside component to prevent focus loss on re-render
function InputField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      <div className="relative mt-1.5">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          value={formatInputValue(value)}
          onChange={(e) => onChange(parseInputValue(e.target.value))}
          className="pl-8 h-11 font-medium bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          placeholder="0"
        />
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
    </div>
  )
}

function TotalRow({
  label,
  value,
  variant = 'default',
}: {
  label: string
  value: number
  variant?: 'default' | 'primary' | 'success' | 'error'
}) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const colors = {
    default: 'bg-gray-50 text-gray-900',
    primary: 'bg-blue-50 text-blue-700',
    success: 'bg-emerald-50 text-emerald-700',
    error: 'bg-red-50 text-red-700',
  }
  return (
    <div className={`flex justify-between items-center px-4 py-3 rounded-lg ${colors[variant]}`}>
      <span className="font-medium">{label}</span>
      <span className="font-bold text-lg">{formatCurrency(value)}</span>
    </div>
  )
}

// BalanceSheet interface reserved for type checking API responses
interface _BalanceSheet {
  id: string
  periodId: string
  // Current Assets
  cash: number
  accountsReceivable: number
  inventory: number
  prepaidExpenses: number
  otherCurrentAssets: number
  // Long-term Assets
  ppeGross: number
  accumulatedDepreciation: number
  intangibleAssets: number
  otherLongTermAssets: number
  // Current Liabilities
  accountsPayable: number
  accruedExpenses: number
  currentPortionLtd: number
  otherCurrentLiabilities: number
  // Long-term Liabilities
  longTermDebt: number
  deferredTaxLiabilities: number
  otherLongTermLiabilities: number
  // Equity
  retainedEarnings: number
  ownersEquity: number
}

export function BalanceSheetTab({ companyId, periodId, onDirty }: BalanceSheetTabProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Store callback in ref
  const onDirtyRef = useRef(onDirty)
  onDirtyRef.current = onDirty

  // Current Assets
  const [cash, setCash] = useState<number>(0)
  const [accountsReceivable, setAccountsReceivable] = useState<number>(0)
  const [inventory, setInventory] = useState<number>(0)
  const [prepaidExpenses, setPrepaidExpenses] = useState<number>(0)
  const [otherCurrentAssets, setOtherCurrentAssets] = useState<number>(0)

  // Long-term Assets
  const [ppeGross, setPpeGross] = useState<number>(0)
  const [accumulatedDepreciation, setAccumulatedDepreciation] = useState<number>(0)
  const [intangibleAssets, setIntangibleAssets] = useState<number>(0)
  const [otherLongTermAssets, setOtherLongTermAssets] = useState<number>(0)

  // Current Liabilities
  const [accountsPayable, setAccountsPayable] = useState<number>(0)
  const [accruedExpenses, setAccruedExpenses] = useState<number>(0)
  const [currentPortionLtd, setCurrentPortionLtd] = useState<number>(0)
  const [otherCurrentLiabilities, setOtherCurrentLiabilities] = useState<number>(0)

  // Long-term Liabilities
  const [longTermDebt, setLongTermDebt] = useState<number>(0)
  const [deferredTaxLiabilities, setDeferredTaxLiabilities] = useState<number>(0)
  const [otherLongTermLiabilities, setOtherLongTermLiabilities] = useState<number>(0)

  // Equity
  const [retainedEarnings, setRetainedEarnings] = useState<number>(0)
  const [ownersEquity, setOwnersEquity] = useState<number>(0)

  // Calculated values
  const totalCurrentAssets = cash + accountsReceivable + inventory + prepaidExpenses + otherCurrentAssets
  const netPPE = ppeGross - accumulatedDepreciation
  const totalLongTermAssets = netPPE + intangibleAssets + otherLongTermAssets
  const totalAssets = totalCurrentAssets + totalLongTermAssets

  const totalCurrentLiabilities = accountsPayable + accruedExpenses + currentPortionLtd + otherCurrentLiabilities
  const totalLongTermLiabilities = longTermDebt + deferredTaxLiabilities + otherLongTermLiabilities
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities

  const totalEquity = retainedEarnings + ownersEquity

  // Balance check
  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01

  const fetchBalanceSheet = useCallback(async () => {
    if (!companyId || !periodId) return

    setIsLoading(true)
    setIsInitialized(false)
    try {
      const response = await fetch(
        `/api/companies/${companyId}/financial-periods/${periodId}/balance-sheet`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.balanceSheet) {
          const bs = data.balanceSheet
          setCash(bs.cash || 0)
          setAccountsReceivable(bs.accountsReceivable || 0)
          setInventory(bs.inventory || 0)
          setPrepaidExpenses(bs.prepaidExpenses || 0)
          setOtherCurrentAssets(bs.otherCurrentAssets || 0)
          setPpeGross(bs.ppeGross || 0)
          setAccumulatedDepreciation(bs.accumulatedDepreciation || 0)
          setIntangibleAssets(bs.intangibleAssets || 0)
          setOtherLongTermAssets(bs.otherLongTermAssets || 0)
          setAccountsPayable(bs.accountsPayable || 0)
          setAccruedExpenses(bs.accruedExpenses || 0)
          setCurrentPortionLtd(bs.currentPortionLtd || 0)
          setOtherCurrentLiabilities(bs.otherCurrentLiabilities || 0)
          setLongTermDebt(bs.longTermDebt || 0)
          setDeferredTaxLiabilities(bs.deferredTaxLiabilities || 0)
          setOtherLongTermLiabilities(bs.otherLongTermLiabilities || 0)
          setRetainedEarnings(bs.retainedEarnings || 0)
          setOwnersEquity(bs.ownersEquity || 0)
        }
      }
    } catch (error) {
      console.error('Failed to fetch balance sheet:', error)
    } finally {
      setIsLoading(false)
      setTimeout(() => setIsInitialized(true), 100)
    }
  }, [companyId, periodId])

  useEffect(() => {
    fetchBalanceSheet()
  }, [fetchBalanceSheet])

  // Notify parent when dirty
  useEffect(() => {
    if (isInitialized) {
      onDirtyRef.current?.()
    }
  }, [
    isInitialized, cash, accountsReceivable, inventory, prepaidExpenses, otherCurrentAssets,
    ppeGross, accumulatedDepreciation, intangibleAssets, otherLongTermAssets,
    accountsPayable, accruedExpenses, currentPortionLtd, otherCurrentLiabilities,
    longTermDebt, deferredTaxLiabilities, otherLongTermLiabilities,
    retainedEarnings, ownersEquity
  ])

  // Auto-save with debounce
  useEffect(() => {
    if (!companyId || !periodId || isLoading || !isInitialized) return

    const timer = setTimeout(async () => {
      try {
        await fetch(
          `/api/companies/${companyId}/financial-periods/${periodId}/balance-sheet`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cash, accountsReceivable, inventory, prepaidExpenses, otherCurrentAssets,
              ppeGross, accumulatedDepreciation, intangibleAssets, otherLongTermAssets,
              accountsPayable, accruedExpenses, currentPortionLtd, otherCurrentLiabilities,
              longTermDebt, deferredTaxLiabilities, otherLongTermLiabilities,
              retainedEarnings, ownersEquity,
            }),
          }
        )
      } catch (error) {
        console.error('Failed to auto-save balance sheet:', error)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [
    companyId, periodId, isLoading, isInitialized,
    cash, accountsReceivable, inventory, prepaidExpenses, otherCurrentAssets,
    ppeGross, accumulatedDepreciation, intangibleAssets, otherLongTermAssets,
    accountsPayable, accruedExpenses, currentPortionLtd, otherCurrentLiabilities,
    longTermDebt, deferredTaxLiabilities, otherLongTermLiabilities,
    retainedEarnings, ownersEquity
  ])

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

  return (
    <div className="space-y-8">
      {/* Current Assets */}
      <div className="space-y-4">
        <SectionHeader icon={Wallet} title="Current Assets" color="bg-emerald-100 text-emerald-600" />
        <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField id="cash" label="Cash & Equivalents" value={cash} onChange={setCash} />
          <InputField id="ar" label="Accounts Receivable" value={accountsReceivable} onChange={setAccountsReceivable} />
          <InputField id="inventory" label="Inventory" value={inventory} onChange={setInventory} />
          <InputField id="prepaid" label="Prepaid Expenses" value={prepaidExpenses} onChange={setPrepaidExpenses} />
          <InputField id="otherCurrent" label="Other Current Assets" value={otherCurrentAssets} onChange={setOtherCurrentAssets} />
        </div>
        <div className="ml-11">
          <TotalRow label="Total Current Assets" value={totalCurrentAssets} variant="success" />
        </div>
      </div>

      {/* Long-term Assets */}
      <div className="space-y-4">
        <SectionHeader icon={Building2} title="Long-term Assets" color="bg-blue-100 text-blue-600" />
        <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField id="ppeGross" label="PP&E (Gross)" value={ppeGross} onChange={setPpeGross} />
          <InputField id="accumDepr" label="Accumulated Depreciation" value={accumulatedDepreciation} onChange={setAccumulatedDepreciation} hint="Enter as positive number" />
          <InputField id="intangible" label="Intangible Assets" value={intangibleAssets} onChange={setIntangibleAssets} />
          <InputField id="otherLTA" label="Other Long-term Assets" value={otherLongTermAssets} onChange={setOtherLongTermAssets} />
        </div>
        <div className="ml-11 space-y-2">
          <div className="flex justify-between items-center px-4 py-2 text-sm text-gray-600">
            <span>Net PP&E</span>
            <span className="font-medium">{formatCurrency(netPPE)}</span>
          </div>
          <TotalRow label="Total Long-term Assets" value={totalLongTermAssets} variant="primary" />
        </div>
      </div>

      {/* Total Assets */}
      <div className="ml-11">
        <TotalRow label="Total Assets" value={totalAssets} variant="primary" />
      </div>

      <hr className="border-gray-200" />

      {/* Current Liabilities */}
      <div className="space-y-4">
        <SectionHeader icon={CreditCard} title="Current Liabilities" color="bg-orange-100 text-orange-600" />
        <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField id="ap" label="Accounts Payable" value={accountsPayable} onChange={setAccountsPayable} />
          <InputField id="accrued" label="Accrued Expenses" value={accruedExpenses} onChange={setAccruedExpenses} />
          <InputField id="currentLtd" label="Current Portion of LTD" value={currentPortionLtd} onChange={setCurrentPortionLtd} />
          <InputField id="otherCL" label="Other Current Liabilities" value={otherCurrentLiabilities} onChange={setOtherCurrentLiabilities} />
        </div>
        <div className="ml-11">
          <TotalRow label="Total Current Liabilities" value={totalCurrentLiabilities} />
        </div>
      </div>

      {/* Long-term Liabilities */}
      <div className="space-y-4">
        <SectionHeader icon={Landmark} title="Long-term Liabilities" color="bg-purple-100 text-purple-600" />
        <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField id="longTermDebt" label="Long-term Debt" value={longTermDebt} onChange={setLongTermDebt} />
          <InputField id="deferredTax" label="Deferred Tax Liabilities" value={deferredTaxLiabilities} onChange={setDeferredTaxLiabilities} />
          <InputField id="otherLTL" label="Other Long-term Liabilities" value={otherLongTermLiabilities} onChange={setOtherLongTermLiabilities} />
        </div>
        <div className="ml-11">
          <TotalRow label="Total Long-term Liabilities" value={totalLongTermLiabilities} />
        </div>
      </div>

      {/* Total Liabilities */}
      <div className="ml-11">
        <TotalRow label="Total Liabilities" value={totalLiabilities} />
      </div>

      <hr className="border-gray-200" />

      {/* Equity */}
      <div className="space-y-4">
        <SectionHeader icon={Users} title="Shareholders' Equity" color="bg-indigo-100 text-indigo-600" />
        <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField id="retainedEarnings" label="Retained Earnings" value={retainedEarnings} onChange={setRetainedEarnings} />
          <InputField id="ownersEquity" label="Owner's Equity / Common Stock" value={ownersEquity} onChange={setOwnersEquity} />
        </div>
        <div className="ml-11">
          <TotalRow label="Total Equity" value={totalEquity} variant="success" />
        </div>
      </div>

      {/* Balance Check */}
      <div className="ml-11">
        <div className={`flex justify-between items-center px-4 py-4 rounded-lg border-2 ${
          isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        }`}>
          <div>
            <span className={`font-semibold ${isBalanced ? 'text-emerald-700' : 'text-red-700'}`}>
              Balance Check
            </span>
            <p className="text-sm text-gray-600 mt-0.5">
              Assets = Liabilities + Equity
            </p>
          </div>
          <div className="text-right">
            <span className={`font-bold text-lg ${isBalanced ? 'text-emerald-700' : 'text-red-700'}`}>
              {isBalanced ? 'Balanced' : 'Unbalanced'}
            </span>
            {!isBalanced && (
              <p className="text-sm text-red-600">
                Difference: {formatCurrency(totalAssets - (totalLiabilities + totalEquity))}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
