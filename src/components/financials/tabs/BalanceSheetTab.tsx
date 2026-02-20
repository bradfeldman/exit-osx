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
import styles from '@/components/financials/financials-pages.module.css'

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

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
      <Label htmlFor={id} className={styles.stmtFieldLabel}>
        {label}
      </Label>
      <div className={styles.stmtInputWrap}>
        <span className={styles.stmtInputPrefix}>$</span>
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          value={formatInputValue(value)}
          onChange={(e) => onChange(parseInputValue(e.target.value))}
          className="pl-8 h-11 font-medium"
          placeholder="0"
        />
      </div>
      {hint && <p className={styles.stmtInputHint}>{hint}</p>}
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  colorClass,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  colorClass: string
}) {
  return (
    <div className={styles.stmtSectionHead}>
      <div className={`${styles.stmtIconBadge} ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <h3 className={styles.stmtSectionLabel}>{title}</h3>
    </div>
  )
}

type TotalRowVariant = 'default' | 'primary' | 'success' | 'error'

function TotalRow({
  label,
  value,
  variant = 'default',
}: {
  label: string
  value: number
  variant?: TotalRowVariant
}) {
  const rowClass = {
    default: styles.stmtTotalRow,
    primary: `${styles.stmtTotalRow} ${styles.stmtTotalRowPrimary}`,
    success: `${styles.stmtTotalRow} ${styles.stmtTotalRowSuccess}`,
    error: `${styles.stmtTotalRow} ${styles.stmtTotalRowError}`,
  }[variant]

  const valueClass = {
    default: styles.stmtTotalRowValue,
    primary: `${styles.stmtTotalRowValue} ${styles.stmtTotalRowValuePrimary}`,
    success: `${styles.stmtTotalRowValue} ${styles.stmtTotalRowValueSuccess}`,
    error: `${styles.stmtTotalRowValue} ${styles.stmtTotalRowValueError}`,
  }[variant]

  return (
    <div className={rowClass}>
      <span className={styles.stmtTotalRowLabel}>{label}</span>
      <span className={valueClass}>{formatCurrency(value)}</span>
    </div>
  )
}

// BalanceSheet interface reserved for type-checking API responses
interface _BalanceSheet {
  id: string
  periodId: string
  cash: number
  accountsReceivable: number
  inventory: number
  prepaidExpenses: number
  otherCurrentAssets: number
  ppeGross: number
  accumulatedDepreciation: number
  intangibleAssets: number
  otherLongTermAssets: number
  accountsPayable: number
  accruedExpenses: number
  currentPortionLtd: number
  otherCurrentLiabilities: number
  longTermDebt: number
  deferredTaxLiabilities: number
  otherLongTermLiabilities: number
  retainedEarnings: number
  ownersEquity: number
}

export function BalanceSheetTab({ companyId, periodId, onDirty }: BalanceSheetTabProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

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

  if (isLoading) {
    return (
      <div className={styles.stmtTabLoading}>
        <div className={styles.stmtSpinner} />
      </div>
    )
  }

  return (
    <div className={styles.stmtSection} style={{ gap: '32px' }}>

      {/* Current Assets */}
      <div className={styles.stmtSection}>
        <SectionHeader icon={Wallet} title="Current Assets" colorClass={styles.stmtIconBadgeGreen} />
        <div className={`${styles.stmtSectionIndent} ${styles.stmtFieldGrid}`}>
          <InputField id="cash" label="Cash & Equivalents" value={cash} onChange={setCash} />
          <InputField id="ar" label="Accounts Receivable" value={accountsReceivable} onChange={setAccountsReceivable} />
          <InputField id="inventory" label="Inventory" value={inventory} onChange={setInventory} />
          <InputField id="prepaid" label="Prepaid Expenses" value={prepaidExpenses} onChange={setPrepaidExpenses} />
          <InputField id="otherCurrent" label="Other Current Assets" value={otherCurrentAssets} onChange={setOtherCurrentAssets} />
        </div>
        <div className={styles.stmtSectionIndent}>
          <TotalRow label="Total Current Assets" value={totalCurrentAssets} variant="success" />
        </div>
      </div>

      {/* Long-term Assets */}
      <div className={styles.stmtSection}>
        <SectionHeader icon={Building2} title="Long-term Assets" colorClass={styles.stmtIconBadgeBlue} />
        <div className={`${styles.stmtSectionIndent} ${styles.stmtFieldGrid}`}>
          <InputField id="ppeGross" label="PP&E (Gross)" value={ppeGross} onChange={setPpeGross} />
          <InputField id="accumDepr" label="Accumulated Depreciation" value={accumulatedDepreciation} onChange={setAccumulatedDepreciation} hint="Enter as positive number" />
          <InputField id="intangible" label="Intangible Assets" value={intangibleAssets} onChange={setIntangibleAssets} />
          <InputField id="otherLTA" label="Other Long-term Assets" value={otherLongTermAssets} onChange={setOtherLongTermAssets} />
        </div>
        <div className={styles.stmtSectionIndent} style={{ gap: '8px' }}>
          <div className={styles.stmtNetPPERow}>
            <span>Net PP&E</span>
            <span className={styles.stmtNetPPEValue}>{formatCurrency(netPPE)}</span>
          </div>
          <TotalRow label="Total Long-term Assets" value={totalLongTermAssets} variant="primary" />
        </div>
      </div>

      {/* Total Assets */}
      <div className={styles.stmtSectionIndent}>
        <TotalRow label="Total Assets" value={totalAssets} variant="primary" />
      </div>

      <hr className={styles.stmtSectionDivider} />

      {/* Current Liabilities */}
      <div className={styles.stmtSection}>
        <SectionHeader icon={CreditCard} title="Current Liabilities" colorClass={styles.stmtIconBadgeOrange} />
        <div className={`${styles.stmtSectionIndent} ${styles.stmtFieldGrid}`}>
          <InputField id="ap" label="Accounts Payable" value={accountsPayable} onChange={setAccountsPayable} />
          <InputField id="accrued" label="Accrued Expenses" value={accruedExpenses} onChange={setAccruedExpenses} />
          <InputField id="currentLtd" label="Current Portion of LTD" value={currentPortionLtd} onChange={setCurrentPortionLtd} />
          <InputField id="otherCL" label="Other Current Liabilities" value={otherCurrentLiabilities} onChange={setOtherCurrentLiabilities} />
        </div>
        <div className={styles.stmtSectionIndent}>
          <TotalRow label="Total Current Liabilities" value={totalCurrentLiabilities} />
        </div>
      </div>

      {/* Long-term Liabilities */}
      <div className={styles.stmtSection}>
        <SectionHeader icon={Landmark} title="Long-term Liabilities" colorClass={styles.stmtIconBadgeGray} />
        <div className={`${styles.stmtSectionIndent} ${styles.stmtFieldGrid}`}>
          <InputField id="longTermDebt" label="Long-term Debt" value={longTermDebt} onChange={setLongTermDebt} />
          <InputField id="deferredTax" label="Deferred Tax Liabilities" value={deferredTaxLiabilities} onChange={setDeferredTaxLiabilities} />
          <InputField id="otherLTL" label="Other Long-term Liabilities" value={otherLongTermLiabilities} onChange={setOtherLongTermLiabilities} />
        </div>
        <div className={styles.stmtSectionIndent}>
          <TotalRow label="Total Long-term Liabilities" value={totalLongTermLiabilities} />
        </div>
      </div>

      {/* Total Liabilities */}
      <div className={styles.stmtSectionIndent}>
        <TotalRow label="Total Liabilities" value={totalLiabilities} />
      </div>

      <hr className={styles.stmtSectionDivider} />

      {/* Equity */}
      <div className={styles.stmtSection}>
        <SectionHeader icon={Users} title="Shareholders' Equity" colorClass={styles.stmtIconBadgeBlue} />
        <div className={`${styles.stmtSectionIndent} ${styles.stmtFieldGrid}`}>
          <InputField id="retainedEarnings" label="Retained Earnings" value={retainedEarnings} onChange={setRetainedEarnings} />
          <InputField id="ownersEquity" label="Owner's Equity / Common Stock" value={ownersEquity} onChange={setOwnersEquity} />
        </div>
        <div className={styles.stmtSectionIndent}>
          <TotalRow label="Total Equity" value={totalEquity} variant="success" />
        </div>
      </div>

      {/* Balance Check */}
      <div className={styles.stmtSectionIndent}>
        <div className={`${styles.stmtBalanceCheck} ${isBalanced ? styles.stmtBalanceCheckOk : styles.stmtBalanceCheckErr}`}>
          <div>
            <p className={`${styles.stmtBalanceCheckTitle} ${isBalanced ? styles.stmtBalanceCheckTitleOk : styles.stmtBalanceCheckTitleErr}`}>
              Balance Check
            </p>
            <p className={styles.stmtBalanceCheckSubtitle}>Assets = Liabilities + Equity</p>
          </div>
          <div className={styles.stmtBalanceCheckResult}>
            <p className={`${styles.stmtBalanceCheckStatus} ${isBalanced ? styles.stmtBalanceCheckStatusOk : styles.stmtBalanceCheckStatusErr}`}>
              {isBalanced ? 'Balanced' : 'Unbalanced'}
            </p>
            {!isBalanced && (
              <p className={styles.stmtBalanceCheckDiff}>
                Difference: {formatCurrency(totalAssets - (totalLiabilities + totalEquity))}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
