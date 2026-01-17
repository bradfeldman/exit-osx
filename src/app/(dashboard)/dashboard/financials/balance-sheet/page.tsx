'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCompany } from '@/contexts/CompanyContext'
import { PeriodSelector, FinancialPeriod } from '@/components/financials'
import {
  Save,
  Scale,
  Wallet,
  Building2,
  CreditCard,
  Landmark,
  Users,
  Sparkles,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface BalanceSheet {
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
  totalCurrentAssets: number
  totalLongTermAssets: number
  totalAssets: number
  totalCurrentLiabilities: number
  totalLongTermLiabilities: number
  totalLiabilities: number
  totalEquity: number
  workingCapital: number
}

export default function BalanceSheetPage() {
  const { selectedCompanyId } = useCompany()
  const [selectedPeriod, setSelectedPeriod] = useState<FinancialPeriod | null>(null)
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showLongTermAssets, setShowLongTermAssets] = useState(false)
  const [showLongTermLiabilities, setShowLongTermLiabilities] = useState(false)

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
  const workingCapital = totalCurrentAssets - totalCurrentLiabilities
  const currentRatio = totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : 0
  const debtToEquity = totalEquity > 0 ? totalLiabilities / totalEquity : 0

  // Check if balance sheet balances
  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
  const imbalanceAmount = totalAssets - (totalLiabilities + totalEquity)

  const fetchBalanceSheet = useCallback(async () => {
    if (!selectedCompanyId || !selectedPeriod) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/financial-periods/${selectedPeriod.id}/balance-sheet`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.balanceSheet) {
          const bs = data.balanceSheet
          setBalanceSheet(bs)
          setCash(bs.cash)
          setAccountsReceivable(bs.accountsReceivable)
          setInventory(bs.inventory)
          setPrepaidExpenses(bs.prepaidExpenses)
          setOtherCurrentAssets(bs.otherCurrentAssets)
          setPpeGross(bs.ppeGross)
          setAccumulatedDepreciation(bs.accumulatedDepreciation)
          setIntangibleAssets(bs.intangibleAssets)
          setOtherLongTermAssets(bs.otherLongTermAssets)
          setAccountsPayable(bs.accountsPayable)
          setAccruedExpenses(bs.accruedExpenses)
          setCurrentPortionLtd(bs.currentPortionLtd)
          setOtherCurrentLiabilities(bs.otherCurrentLiabilities)
          setLongTermDebt(bs.longTermDebt)
          setDeferredTaxLiabilities(bs.deferredTaxLiabilities)
          setOtherLongTermLiabilities(bs.otherLongTermLiabilities)
          setRetainedEarnings(bs.retainedEarnings)
          setOwnersEquity(bs.ownersEquity)

          // Auto-expand if there's long-term data
          if (bs.ppeGross > 0 || bs.intangibleAssets > 0 || bs.otherLongTermAssets > 0) {
            setShowLongTermAssets(true)
          }
          if (bs.longTermDebt > 0 || bs.deferredTaxLiabilities > 0 || bs.otherLongTermLiabilities > 0) {
            setShowLongTermLiabilities(true)
          }
        } else {
          clearForm()
        }
      }
    } catch (error) {
      console.error('Failed to fetch balance sheet:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId, selectedPeriod])

  const clearForm = () => {
    setBalanceSheet(null)
    setCash(0)
    setAccountsReceivable(0)
    setInventory(0)
    setPrepaidExpenses(0)
    setOtherCurrentAssets(0)
    setPpeGross(0)
    setAccumulatedDepreciation(0)
    setIntangibleAssets(0)
    setOtherLongTermAssets(0)
    setAccountsPayable(0)
    setAccruedExpenses(0)
    setCurrentPortionLtd(0)
    setOtherCurrentLiabilities(0)
    setLongTermDebt(0)
    setDeferredTaxLiabilities(0)
    setOtherLongTermLiabilities(0)
    setRetainedEarnings(0)
    setOwnersEquity(0)
  }

  useEffect(() => {
    fetchBalanceSheet()
  }, [fetchBalanceSheet])

  const handleSave = async () => {
    if (!selectedCompanyId || !selectedPeriod) return

    setIsSaving(true)
    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/financial-periods/${selectedPeriod.id}/balance-sheet`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cash,
            accountsReceivable,
            inventory,
            prepaidExpenses,
            otherCurrentAssets,
            ppeGross,
            accumulatedDepreciation,
            intangibleAssets,
            otherLongTermAssets,
            accountsPayable,
            accruedExpenses,
            currentPortionLtd,
            otherCurrentLiabilities,
            longTermDebt,
            deferredTaxLiabilities,
            otherLongTermLiabilities,
            retainedEarnings,
            ownersEquity,
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        setBalanceSheet(data.balanceSheet)
      }
    } catch (error) {
      console.error('Failed to save balance sheet:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatInputValue = (value: number) => {
    if (value === 0) return ''
    return new Intl.NumberFormat('en-US').format(value)
  }

  const parseInputValue = (value: string) => {
    const cleaned = value.replace(/[^0-9.-]/g, '')
    return parseFloat(cleaned) || 0
  }

  const CurrencyInput = ({
    id,
    label,
    value,
    onChange,
    description,
    colorClass = 'focus:ring-blue-500/20 focus:border-blue-500',
  }: {
    id: string
    label: string
    value: number
    onChange: (value: number) => void
    description?: string
    colorClass?: string
  }) => (
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
          className={`pl-8 h-11 font-medium bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 ${colorClass} transition-all`}
          placeholder="0"
          disabled={!selectedPeriod}
        />
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-1.5">{description}</p>
      )}
    </div>
  )

  if (!selectedCompanyId) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
          <p className="text-gray-600">Select a company to view and manage balance sheet data</p>
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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
          <p className="text-gray-600">Track your assets, liabilities, and equity</p>
        </div>
      </div>

      {/* Period selector and save */}
      <div className="flex items-center justify-between">
        <PeriodSelector
          companyId={selectedCompanyId}
          selectedPeriodId={selectedPeriod?.id}
          onPeriodChange={setSelectedPeriod}
        />
        <Button onClick={handleSave} disabled={isSaving || !selectedPeriod} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Intro banner when no period selected */}
            {!selectedPeriod && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Get started with your Balance Sheet</p>
                    <p className="text-sm text-gray-600">Add a fiscal year above to begin entering your financial position</p>
                  </div>
                </div>
              </div>
            )}

            {/* Balance Check Banner */}
            {selectedPeriod && totalAssets > 0 && (
              <div className={`px-6 py-3 border-b ${isBalanced ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-2">
                  {isBalanced ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">Balance sheet is balanced</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700">
                        Out of balance by {formatCurrency(Math.abs(imbalanceAmount))}
                      </span>
                      <span className="text-xs text-amber-600 ml-2">
                        (Assets {imbalanceAmount > 0 ? '>' : '<'} Liabilities + Equity)
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Main Form */}
            <div className="p-6 space-y-8">
              {/* ==================== ASSETS SECTION ==================== */}

              {/* Current Assets */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Current Assets</h3>
                    <p className="text-sm text-gray-500">Assets expected to convert to cash within one year</p>
                  </div>
                </div>

                <div className="ml-11 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <CurrencyInput
                    id="cash"
                    label="Cash & Equivalents"
                    value={cash}
                    onChange={setCash}
                    colorClass="focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <CurrencyInput
                    id="accountsReceivable"
                    label="Accounts Receivable"
                    value={accountsReceivable}
                    onChange={setAccountsReceivable}
                    description="Money owed by customers"
                    colorClass="focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <CurrencyInput
                    id="inventory"
                    label="Inventory"
                    value={inventory}
                    onChange={setInventory}
                    colorClass="focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <CurrencyInput
                    id="prepaidExpenses"
                    label="Prepaid Expenses"
                    value={prepaidExpenses}
                    onChange={setPrepaidExpenses}
                    colorClass="focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <CurrencyInput
                    id="otherCurrentAssets"
                    label="Other Current Assets"
                    value={otherCurrentAssets}
                    onChange={setOtherCurrentAssets}
                    colorClass="focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Current Assets Total */}
                <div className="ml-11 bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-emerald-800">Total Current Assets</span>
                    <span className="text-xl font-bold text-emerald-700">{formatCurrency(totalCurrentAssets)}</span>
                  </div>
                </div>
              </div>

              {/* Long-term Assets (Collapsible) */}
              <div className="border-t pt-6">
                <button
                  type="button"
                  onClick={() => setShowLongTermAssets(!showLongTermAssets)}
                  className="w-full flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-600">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">Long-term Assets</h3>
                      <p className="text-sm text-gray-500">Property, equipment, and intangibles</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-600">
                    {totalLongTermAssets > 0 && (
                      <span className="text-sm font-medium text-teal-600">{formatCurrency(totalLongTermAssets)}</span>
                    )}
                    {showLongTermAssets ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {showLongTermAssets && (
                  <div className="mt-4 ml-11 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CurrencyInput
                        id="ppeGross"
                        label="PP&E (Gross)"
                        value={ppeGross}
                        onChange={setPpeGross}
                        description="Property, plant & equipment"
                        colorClass="focus:ring-teal-500/20 focus:border-teal-500"
                      />
                      <CurrencyInput
                        id="accumulatedDepreciation"
                        label="Accumulated Depreciation"
                        value={accumulatedDepreciation}
                        onChange={setAccumulatedDepreciation}
                        description="Enter as positive number"
                        colorClass="focus:ring-teal-500/20 focus:border-teal-500"
                      />
                      <CurrencyInput
                        id="intangibleAssets"
                        label="Intangible Assets"
                        value={intangibleAssets}
                        onChange={setIntangibleAssets}
                        description="Patents, trademarks, goodwill"
                        colorClass="focus:ring-teal-500/20 focus:border-teal-500"
                      />
                      <CurrencyInput
                        id="otherLongTermAssets"
                        label="Other Long-term Assets"
                        value={otherLongTermAssets}
                        onChange={setOtherLongTermAssets}
                        colorClass="focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>

                    <div className="bg-teal-50 rounded-lg p-4 border border-teal-200 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-teal-700">Net PP&E</span>
                        <span className="font-medium text-teal-800">{formatCurrency(netPPE)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-teal-200">
                        <span className="font-medium text-teal-800">Total Long-term Assets</span>
                        <span className="text-xl font-bold text-teal-700">{formatCurrency(totalLongTermAssets)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Assets Summary */}
              <div className="ml-11 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-blue-700">Total Assets</span>
                    <p className="text-xs text-blue-600/70 mt-0.5">Current + Long-term</p>
                  </div>
                  <span className="text-2xl font-bold text-blue-700">{formatCurrency(totalAssets)}</span>
                </div>
              </div>

              {/* Visual Divider */}
              <div className="flex items-center gap-3 pl-11">
                <div className="flex-1 h-px bg-gray-200" />
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                  <Scale className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* ==================== LIABILITIES SECTION ==================== */}

              {/* Current Liabilities */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Current Liabilities</h3>
                    <p className="text-sm text-gray-500">Obligations due within one year</p>
                  </div>
                </div>

                <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CurrencyInput
                    id="accountsPayable"
                    label="Accounts Payable"
                    value={accountsPayable}
                    onChange={setAccountsPayable}
                    description="Money owed to suppliers"
                    colorClass="focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <CurrencyInput
                    id="accruedExpenses"
                    label="Accrued Expenses"
                    value={accruedExpenses}
                    onChange={setAccruedExpenses}
                    description="Expenses incurred but not yet paid"
                    colorClass="focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <CurrencyInput
                    id="currentPortionLtd"
                    label="Current Portion of LTD"
                    value={currentPortionLtd}
                    onChange={setCurrentPortionLtd}
                    description="Long-term debt due within 1 year"
                    colorClass="focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <CurrencyInput
                    id="otherCurrentLiabilities"
                    label="Other Current Liabilities"
                    value={otherCurrentLiabilities}
                    onChange={setOtherCurrentLiabilities}
                    colorClass="focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Current Liabilities Total */}
                <div className="ml-11 bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-orange-800">Total Current Liabilities</span>
                    <span className="text-xl font-bold text-orange-700">{formatCurrency(totalCurrentLiabilities)}</span>
                  </div>
                </div>
              </div>

              {/* Long-term Liabilities (Collapsible) */}
              <div className="border-t pt-6">
                <button
                  type="button"
                  onClick={() => setShowLongTermLiabilities(!showLongTermLiabilities)}
                  className="w-full flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600">
                      <Landmark className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">Long-term Liabilities</h3>
                      <p className="text-sm text-gray-500">Obligations due beyond one year</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-600">
                    {totalLongTermLiabilities > 0 && (
                      <span className="text-sm font-medium text-red-600">{formatCurrency(totalLongTermLiabilities)}</span>
                    )}
                    {showLongTermLiabilities ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {showLongTermLiabilities && (
                  <div className="mt-4 ml-11 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <CurrencyInput
                        id="longTermDebt"
                        label="Long-term Debt"
                        value={longTermDebt}
                        onChange={setLongTermDebt}
                        description="Bank loans, notes payable"
                        colorClass="focus:ring-red-500/20 focus:border-red-500"
                      />
                      <CurrencyInput
                        id="deferredTaxLiabilities"
                        label="Deferred Tax Liabilities"
                        value={deferredTaxLiabilities}
                        onChange={setDeferredTaxLiabilities}
                        colorClass="focus:ring-red-500/20 focus:border-red-500"
                      />
                      <CurrencyInput
                        id="otherLongTermLiabilities"
                        label="Other Long-term Liabilities"
                        value={otherLongTermLiabilities}
                        onChange={setOtherLongTermLiabilities}
                        colorClass="focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>

                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-red-800">Total Long-term Liabilities</span>
                        <span className="text-xl font-bold text-red-700">{formatCurrency(totalLongTermLiabilities)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Liabilities Summary */}
              <div className="ml-11 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-5 border border-orange-200">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-orange-700">Total Liabilities</span>
                    <p className="text-xs text-orange-600/70 mt-0.5">Current + Long-term</p>
                  </div>
                  <span className="text-2xl font-bold text-orange-700">{formatCurrency(totalLiabilities)}</span>
                </div>
              </div>

              {/* Visual Divider */}
              <div className="flex items-center gap-3 pl-11">
                <div className="flex-1 h-px bg-gray-200" />
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
                  <Plus className="h-3 w-3 text-gray-400" />
                </div>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* ==================== EQUITY SECTION ==================== */}

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Shareholders' Equity</h3>
                    <p className="text-sm text-gray-500">Owner's stake in the business</p>
                  </div>
                </div>

                <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CurrencyInput
                    id="retainedEarnings"
                    label="Retained Earnings"
                    value={retainedEarnings}
                    onChange={setRetainedEarnings}
                    description="Accumulated profits not distributed"
                    colorClass="focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <CurrencyInput
                    id="ownersEquity"
                    label="Owner's Equity / Capital"
                    value={ownersEquity}
                    onChange={setOwnersEquity}
                    description="Initial investment and contributions"
                    colorClass="focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                {/* Total Equity */}
                <div className="ml-11 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-purple-700">Total Equity</span>
                      <p className="text-xs text-purple-600/70 mt-0.5">Net worth of the business</p>
                    </div>
                    <span className="text-2xl font-bold text-purple-700">{formatCurrency(totalEquity)}</span>
                  </div>
                </div>
              </div>

              {/* ==================== KEY METRICS ==================== */}

              {selectedPeriod && totalAssets > 0 && (
                <div className="border-t pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Key Metrics</h3>
                      <p className="text-sm text-gray-500">Auto-calculated from your inputs</p>
                    </div>
                  </div>

                  <div className="ml-11 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Working Capital */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-600">Working Capital</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          workingCapital > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {workingCapital >= 0 ? 'Positive' : 'Negative'}
                        </span>
                      </div>
                      <p className={`text-xl font-bold ${workingCapital >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {formatCurrency(workingCapital)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Current Assets - Current Liabilities</p>
                    </div>

                    {/* Current Ratio */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-600">Current Ratio</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          currentRatio >= 1.5 ? 'bg-emerald-100 text-emerald-700' :
                          currentRatio >= 1 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {currentRatio >= 1.5 ? 'Healthy' : currentRatio >= 1 ? 'Adequate' : 'Low'}
                        </span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {currentRatio.toFixed(2)}x
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Liquidity measure (target: 1.5+)</p>
                    </div>

                    {/* Debt to Equity */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-600">Debt to Equity</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          debtToEquity <= 1 ? 'bg-emerald-100 text-emerald-700' :
                          debtToEquity <= 2 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {debtToEquity <= 1 ? 'Low' : debtToEquity <= 2 ? 'Moderate' : 'High'}
                        </span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {debtToEquity.toFixed(2)}x
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Leverage measure (lower is safer)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
