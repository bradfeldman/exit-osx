'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  Minus,
  Equal,
  Receipt,
  Calculator,
  TrendingUp,
} from 'lucide-react'
import styles from '@/components/financials/financials-pages.module.css'

interface PLTabProps {
  companyId: string
  periodId: string
  onDataChange?: (data: PLData) => void
  onDirty?: () => void
}

export interface PLData {
  grossRevenue: number
  cogs: number
  totalExpenses: number  // All expenses below gross profit (includes D, A, I, T)
  grossProfit: number
  grossMarginPct: number
  ebitda: number
  ebitdaMarginPct: number
  depreciation: number
  amortization: number
  interestExpense: number
  taxExpense: number
  netOperatingIncome: number
}

interface IncomeStatement {
  id: string
  periodId: string
  grossRevenue: number
  cogs: number
  operatingExpenses: number  // API field name; displayed as "Total Expenses"
  grossProfit: number
  grossMarginPct: number
  ebitda: number
  ebitdaMarginPct: number
  depreciation: number | null
  amortization: number | null
  interestExpense: number | null
  taxExpense: number | null
}

export function PLTab({ companyId, periodId, onDataChange, onDirty }: PLTabProps) {
  const [_incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showBelowTheLine, setShowBelowTheLine] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Store callbacks in ref to avoid dependency issues
  const onDataChangeRef = useRef(onDataChange)
  onDataChangeRef.current = onDataChange
  const onDirtyRef = useRef(onDirty)
  onDirtyRef.current = onDirty

  // Form state
  const [grossRevenue, setGrossRevenue] = useState<number>(0)
  const [cogs, setCogs] = useState<number>(0)
  const [totalExpenses, setTotalExpenses] = useState<number>(0)
  const [depreciation, setDepreciation] = useState<number>(0)
  const [amortization, setAmortization] = useState<number>(0)
  const [interestExpense, setInterestExpense] = useState<number>(0)
  const [taxExpense, setTaxExpense] = useState<number>(0)

  // Calculated values
  const grossProfit = grossRevenue - cogs
  const grossMarginPct = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0
  const ebitda = grossProfit - totalExpenses + depreciation + amortization + interestExpense + taxExpense
  const ebitdaMarginPct = grossRevenue > 0 ? (ebitda / grossRevenue) * 100 : 0
  const ebit = ebitda - depreciation - amortization
  const ebt = ebit - interestExpense
  const netOperatingIncome = ebt - taxExpense

  // Notify parent of data changes
  useEffect(() => {
    onDataChangeRef.current?.({
      grossRevenue,
      cogs,
      totalExpenses,
      grossProfit,
      grossMarginPct,
      ebitda,
      ebitdaMarginPct,
      depreciation,
      amortization,
      interestExpense,
      taxExpense,
      netOperatingIncome,
    })
  }, [grossRevenue, cogs, totalExpenses, depreciation, amortization, interestExpense, taxExpense, grossProfit, grossMarginPct, ebitda, ebitdaMarginPct, netOperatingIncome])

  const fetchIncomeStatement = useCallback(async () => {
    if (!companyId || !periodId) return

    setIsLoading(true)
    setIsInitialized(false)
    try {
      const response = await fetch(
        `/api/companies/${companyId}/financial-periods/${periodId}/income-statement`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.incomeStatement) {
          const stmt = data.incomeStatement
          setIncomeStatement(stmt)
          setGrossRevenue(stmt.grossRevenue || 0)
          setCogs(stmt.cogs || 0)
          setTotalExpenses(stmt.operatingExpenses || 0)
          setDepreciation(stmt.depreciation || 0)
          setAmortization(stmt.amortization || 0)
          setInterestExpense(stmt.interestExpense || 0)
          setTaxExpense(stmt.taxExpense || 0)
        } else {
          clearForm()
        }
      }
    } catch (error) {
      console.error('Failed to fetch income statement:', error)
    } finally {
      setIsLoading(false)
      setTimeout(() => setIsInitialized(true), 100)
    }
  }, [companyId, periodId])

  const clearForm = () => {
    setIncomeStatement(null)
    setGrossRevenue(0)
    setCogs(0)
    setTotalExpenses(0)
    setDepreciation(0)
    setAmortization(0)
    setInterestExpense(0)
    setTaxExpense(0)
  }

  useEffect(() => {
    fetchIncomeStatement()
  }, [fetchIncomeStatement])

  // Notify parent when dirty (only after initial load)
  useEffect(() => {
    if (isInitialized) {
      onDirtyRef.current?.()
    }
  }, [isInitialized, grossRevenue, cogs, totalExpenses, depreciation, amortization, interestExpense, taxExpense])

  // Auto-save with debounce
  useEffect(() => {
    if (!companyId || !periodId || isLoading) return

    const timer = setTimeout(async () => {
      try {
        await fetch(
          `/api/companies/${companyId}/financial-periods/${periodId}/income-statement`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grossRevenue,
              cogs,
              operatingExpenses: totalExpenses,
              depreciation,
              amortization,
              interestExpense,
              taxExpense,
            }),
          }
        )
      } catch (error) {
        console.error('Failed to auto-save income statement:', error)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [companyId, periodId, grossRevenue, cogs, totalExpenses, depreciation, amortization, interestExpense, taxExpense, isLoading])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  const formatPercent = (value: number) => `${value.toFixed(1)}%`

  const formatInputValue = (value: number) => {
    if (value === 0) return ''
    return new Intl.NumberFormat('en-US').format(value)
  }

  const parseInputValue = (value: string) => {
    const cleaned = value.replace(/[^0-9.-]/g, '')
    return parseFloat(cleaned) || 0
  }

  const marginBadgeClass = (pct: number, threshold1: number, threshold2: number) => {
    if (pct >= threshold1) return `${styles.stmtMarginBadge} ${styles.stmtMarginBadgeGreen}`
    if (pct >= threshold2) return `${styles.stmtMarginBadge} ${styles.stmtMarginBadgeYellow}`
    return `${styles.stmtMarginBadge} ${styles.stmtMarginBadgeGray}`
  }

  if (isLoading) {
    return (
      <div className={styles.stmtTabLoading}>
        <div className={styles.stmtSpinner} />
      </div>
    )
  }

  return (
    <div className={styles.stmtSection} style={{ gap: '32px' }}>

      {/* Revenue Section */}
      <div className={styles.stmtSection}>
        <div className={styles.stmtSectionHead}>
          <div className={`${styles.stmtIconBadge} ${styles.stmtIconBadgeGreen}`}>
            <DollarSign />
          </div>
          <div>
            <p className={styles.stmtSectionLabel}>Revenue</p>
            <p className={styles.stmtSectionDesc}>Your total sales before any deductions</p>
          </div>
        </div>

        <div className={styles.stmtSectionIndent}>
          <div>
            <Label htmlFor="grossRevenue" className={styles.stmtFieldLabel}>
              Gross Revenue
            </Label>
            <div className={styles.stmtInputWrap}>
              <span className={styles.stmtInputPrefix}>$</span>
              <Input
                id="grossRevenue"
                type="text"
                inputMode="numeric"
                value={formatInputValue(grossRevenue)}
                onChange={(e) => setGrossRevenue(parseInputValue(e.target.value))}
                className="pl-8 h-12 text-lg font-medium"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Divider: minus */}
      <div className={styles.stmtDivider}>
        <div className={styles.stmtDividerLine} />
        <div className={styles.stmtDividerIcon}>
          <Minus />
        </div>
        <div className={styles.stmtDividerLine} />
      </div>

      {/* Costs Section */}
      <div className={styles.stmtSection}>
        <div className={styles.stmtSectionHead}>
          <div className={`${styles.stmtIconBadge} ${styles.stmtIconBadgeOrange}`}>
            <Receipt />
          </div>
          <div>
            <p className={styles.stmtSectionLabel}>Costs &amp; Expenses</p>
            <p className={styles.stmtSectionDesc}>Direct costs and operating expenses</p>
          </div>
        </div>

        <div className={styles.stmtSectionIndent}>
          <div className={styles.stmtFieldGrid}>
            <div>
              <Label htmlFor="cogs" className={styles.stmtFieldLabel}>
                Cost of Goods Sold
              </Label>
              <div className={styles.stmtInputWrap}>
                <span className={styles.stmtInputPrefix}>$</span>
                <Input
                  id="cogs"
                  type="text"
                  inputMode="numeric"
                  value={formatInputValue(cogs)}
                  onChange={(e) => setCogs(parseInputValue(e.target.value))}
                  className="pl-8 h-11 font-medium"
                  placeholder="0"
                />
              </div>
              <p className={styles.stmtInputHint}>Direct costs to produce your product/service</p>
            </div>

            <div>
              <Label htmlFor="totalExpenses" className={styles.stmtFieldLabel}>
                Total Expenses
              </Label>
              <div className={styles.stmtInputWrap}>
                <span className={styles.stmtInputPrefix}>$</span>
                <Input
                  id="totalExpenses"
                  type="text"
                  inputMode="numeric"
                  value={formatInputValue(totalExpenses)}
                  onChange={(e) => setTotalExpenses(parseInputValue(e.target.value))}
                  className="pl-8 h-11 font-medium"
                  placeholder="0"
                />
              </div>
              <p className={styles.stmtInputHint}>All expenses below gross profit (from QuickBooks)</p>
            </div>
          </div>

          {/* DAIT breakdown */}
          <div className={styles.stmtBreakdownBox}>
            <p className={styles.stmtBreakdownBoxLabel}>
              Breakdown of Total Expenses (added back to calculate EBITDA)
            </p>
            <div className={styles.stmtBreakdownGrid}>
              <div>
                <Label htmlFor="depreciation" className={styles.stmtFieldLabelSm}>
                  Depreciation
                </Label>
                <div className={styles.stmtInputWrap}>
                  <span className={styles.stmtInputPrefixSm}>$</span>
                  <Input
                    id="depreciation"
                    type="text"
                    inputMode="numeric"
                    value={formatInputValue(depreciation)}
                    onChange={(e) => setDepreciation(parseInputValue(e.target.value))}
                    className="pl-7 h-9 text-sm font-medium"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="amortization" className={styles.stmtFieldLabelSm}>
                  Amortization
                </Label>
                <div className={styles.stmtInputWrap}>
                  <span className={styles.stmtInputPrefixSm}>$</span>
                  <Input
                    id="amortization"
                    type="text"
                    inputMode="numeric"
                    value={formatInputValue(amortization)}
                    onChange={(e) => setAmortization(parseInputValue(e.target.value))}
                    className="pl-7 h-9 text-sm font-medium"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="interestExpense" className={styles.stmtFieldLabelSm}>
                  Interest
                </Label>
                <div className={styles.stmtInputWrap}>
                  <span className={styles.stmtInputPrefixSm}>$</span>
                  <Input
                    id="interestExpense"
                    type="text"
                    inputMode="numeric"
                    value={formatInputValue(interestExpense)}
                    onChange={(e) => setInterestExpense(parseInputValue(e.target.value))}
                    className="pl-7 h-9 text-sm font-medium"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="taxExpense" className={styles.stmtFieldLabelSm}>
                  Taxes
                </Label>
                <div className={styles.stmtInputWrap}>
                  <span className={styles.stmtInputPrefixSm}>$</span>
                  <Input
                    id="taxExpense"
                    type="text"
                    inputMode="numeric"
                    value={formatInputValue(taxExpense)}
                    onChange={(e) => setTaxExpense(parseInputValue(e.target.value))}
                    className="pl-7 h-9 text-sm font-medium"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divider: equals */}
      <div className={styles.stmtDivider}>
        <div className={styles.stmtDividerLine} />
        <div className={styles.stmtDividerIcon}>
          <Equal />
        </div>
        <div className={styles.stmtDividerLine} />
      </div>

      {/* Calculated Results */}
      <div className={styles.stmtSection}>
        <div className={styles.stmtSectionHead}>
          <div className={`${styles.stmtIconBadge} ${styles.stmtIconBadgeBlue}`}>
            <Calculator />
          </div>
          <div>
            <p className={styles.stmtSectionLabel}>Calculated Results</p>
            <p className={styles.stmtSectionDesc}>Auto-calculated from your inputs above</p>
          </div>
        </div>

        <div className={styles.stmtSectionIndent}>
          <div className={styles.stmtResultGrid}>
            {/* Gross Profit card */}
            <div className={styles.stmtResultCard}>
              <div className={styles.stmtResultCardHeader}>
                <span className={styles.stmtResultCardName}>Gross Profit</span>
                <span className={marginBadgeClass(grossMarginPct, 50, 30)}>
                  {formatPercent(grossMarginPct)} margin
                </span>
              </div>
              <p className={grossProfit >= 0 ? styles.stmtResultValue : `${styles.stmtResultValue} ${styles.stmtResultValueNeg}`}>
                {formatCurrency(grossProfit)}
              </p>
              <p className={styles.stmtResultHint}>Revenue minus COGS</p>
            </div>

            {/* EBITDA card */}
            <div className={styles.stmtResultCardBlue}>
              <div className={styles.stmtResultCardHeader}>
                <span className={styles.stmtResultCardNameBlue}>EBITDA</span>
                <span className={marginBadgeClass(ebitdaMarginPct, 20, 10)}>
                  {formatPercent(ebitdaMarginPct)} margin
                </span>
              </div>
              <p className={ebitda >= 0 ? styles.stmtResultValueBlue : `${styles.stmtResultValueBlue} ${styles.stmtResultValueNeg}`}>
                {formatCurrency(ebitda)}
              </p>
              <p className={styles.stmtResultHintBlue}>Key metric for valuation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Below-the-line collapsible */}
      <div className={styles.stmtBelowLine}>
        <button
          className={styles.stmtBelowLineToggle}
          onClick={() => setShowBelowTheLine(!showBelowTheLine)}
        >
          <div className={styles.stmtBelowLineToggleLeft}>
            <div className={`${styles.stmtIconBadge} ${styles.stmtIconBadgeGray}`}>
              <TrendingUp />
            </div>
            <div>
              <p className={styles.stmtBelowLineTitle}>Below-the-Line Results</p>
              <p className={styles.stmtBelowLineSubtitle}>EBIT, EBT, and Net Operating Income</p>
            </div>
          </div>
          <div className={styles.stmtBelowLineToggleRight}>
            <span>{showBelowTheLine ? 'Hide' : 'Show'}</span>
            {showBelowTheLine ? <ChevronUp /> : <ChevronDown />}
          </div>
        </button>

        {showBelowTheLine && (
          <div className={styles.stmtBelowLineContent}>
            <div className={styles.stmtBelowLineTable}>
              <div className={styles.stmtBelowLineRow}>
                <span className={styles.stmtBelowLineRowLabel}>EBIT (Operating Income)</span>
                <span className={styles.stmtBelowLineRowValue}>{formatCurrency(ebit)}</span>
              </div>
              <div className={styles.stmtBelowLineRow}>
                <span className={styles.stmtBelowLineRowLabel}>EBT (Pre-Tax Income)</span>
                <span className={styles.stmtBelowLineRowValue}>{formatCurrency(ebt)}</span>
              </div>
              <div className={styles.stmtBelowLineRowTotal}>
                <span className={styles.stmtBelowLineRowTotalLabel}>Net Operating Income</span>
                <span className={netOperatingIncome >= 0 ? styles.stmtBelowLineRowTotalValuePos : styles.stmtBelowLineRowTotalValueNeg}>
                  {formatCurrency(netOperatingIncome)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
