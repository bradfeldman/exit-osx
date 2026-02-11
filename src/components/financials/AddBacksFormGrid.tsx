'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, TrendingUp, TrendingDown, Calculator, Loader2 } from 'lucide-react'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import {
  CalcCell,
  SectionHeader,
  PeriodHeaders,
  FormRow,
  formatInputValue,
  parseInputValue,
  type FinancialPeriod,
} from './form-grid-shared'

// ─── Types ────────────────────────────────────────────────────────
interface Adjustment {
  id: string
  description: string
  amount: number
  type: 'ADD_BACK' | 'DEDUCTION'
  periodId: string | null
  frequency: string
}

interface AddBacksFormGridProps {
  companyId: string
}

// ─── Component ────────────────────────────────────────────────────
export function AddBacksFormGrid({ companyId }: AddBacksFormGridProps) {
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [ebitdaByPeriod, setEbitdaByPeriod] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [newAddBackDesc, setNewAddBackDesc] = useState('')
  const [newDeductionDesc, setNewDeductionDesc] = useState('')
  const [showAddBackInput, setShowAddBackInput] = useState(false)
  const [showDeductionInput, setShowDeductionInput] = useState(false)
  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Load periods
  const loadPeriods = useCallback(async (): Promise<FinancialPeriod[]> => {
    if (!companyId) return []
    try {
      const response = await fetchWithRetry(`/api/companies/${companyId}/financial-periods`)
      if (response.ok) {
        const data = await response.json()
        const sorted = (data.periods || []).sort(
          (a: FinancialPeriod, b: FinancialPeriod) => a.fiscalYear - b.fiscalYear
        )
        setPeriods(sorted)
        return sorted
      }
    } catch (err) {
      console.error('Error loading periods:', err)
    }
    return []
  }, [companyId])

  // Load all adjustments (no period filter — we need them all to group by description)
  const loadAdjustments = useCallback(async () => {
    try {
      const response = await fetchWithRetry(`/api/companies/${companyId}/adjustments`)
      if (response.ok) {
        const data = await response.json()
        setAdjustments(data.adjustments || [])
      }
    } catch (err) {
      console.error('Error loading adjustments:', err)
    }
  }, [companyId])

  // Load base EBITDA for each period
  const loadEbitda = useCallback(async (loadedPeriods: FinancialPeriod[]) => {
    const map: Record<string, number> = {}
    await Promise.all(
      loadedPeriods.map(async (p) => {
        try {
          const res = await fetchWithRetry(
            `/api/companies/${companyId}/financial-periods/${p.id}/income-statement`
          )
          if (res.ok) {
            const data = await res.json()
            if (data.incomeStatement) {
              const stmt = data.incomeStatement
              const grossProfit = (stmt.grossRevenue || 0) - (stmt.cogs || 0)
              const ebitda = grossProfit - (stmt.operatingExpenses || 0) +
                (stmt.depreciation || 0) + (stmt.amortization || 0) +
                (stmt.interestExpense || 0) + (stmt.taxExpense || 0)
              map[p.id] = ebitda
            }
          }
        } catch {
          // ignore
        }
      })
    )
    setEbitdaByPeriod(map)
  }, [companyId])

  // Initial load
  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const loadedPeriods = await loadPeriods()
      await Promise.all([loadAdjustments(), loadEbitda(loadedPeriods)])
      setIsLoading(false)
    }
    load()
  }, [loadPeriods, loadAdjustments, loadEbitda])

  // Cleanup timers
  useEffect(() => {
    const timers = saveTimersRef.current
    return () => { Object.values(timers).forEach(clearTimeout) }
  }, [])

  // ─── Helpers: group adjustments by description ──────────────────
  // Unique descriptions for ADD_BACK type
  const addBackDescs = [...new Set(adjustments.filter(a => a.type === 'ADD_BACK').map(a => a.description))]
  const deductionDescs = [...new Set(adjustments.filter(a => a.type === 'DEDUCTION').map(a => a.description))]

  // Get the adjustment record for a given description + periodId
  function findAdj(description: string, periodId: string, type: 'ADD_BACK' | 'DEDUCTION'): Adjustment | undefined {
    return adjustments.find(a => a.description === description && a.periodId === periodId && a.type === type)
  }

  // ─── CRUD ───────────────────────────────────────────────────────
  const handleAmountChange = useCallback((description: string, periodId: string, type: 'ADD_BACK' | 'DEDUCTION', value: number) => {
    const existing = adjustments.find(a => a.description === description && a.periodId === periodId && a.type === type)

    if (existing) {
      // Optimistic update
      setAdjustments(prev =>
        prev.map(a => a.id === existing.id ? { ...a, amount: value } : a)
      )
      // Debounced PATCH
      const timerKey = existing.id
      if (saveTimersRef.current[timerKey]) clearTimeout(saveTimersRef.current[timerKey])
      saveTimersRef.current[timerKey] = setTimeout(async () => {
        try {
          await fetch(
            `/api/companies/${companyId}/adjustments?adjustmentId=${existing.id}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: value }),
            }
          )
        } catch (err) {
          console.error('Failed to update adjustment:', err)
        }
      }, 1000)
    } else if (value !== 0) {
      // Create new adjustment for this period
      const tempId = `temp-${Date.now()}-${Math.random()}`
      const newAdj: Adjustment = {
        id: tempId,
        description,
        amount: value,
        type,
        periodId,
        frequency: 'ANNUAL',
      }
      setAdjustments(prev => [...prev, newAdj])

      const timerKey = tempId
      if (saveTimersRef.current[timerKey]) clearTimeout(saveTimersRef.current[timerKey])
      saveTimersRef.current[timerKey] = setTimeout(async () => {
        try {
          const res = await fetch(`/api/companies/${companyId}/adjustments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, amount: value, type, periodId, frequency: 'ANNUAL' }),
          })
          if (res.ok) {
            const data = await res.json()
            // Replace temp with real record
            setAdjustments(prev =>
              prev.map(a => a.id === tempId ? { ...data.adjustment } : a)
            )
          }
        } catch (err) {
          console.error('Failed to create adjustment:', err)
        }
      }, 1000)
    }
  }, [adjustments, companyId])

  const addNewItem = useCallback(async (description: string, type: 'ADD_BACK' | 'DEDUCTION') => {
    if (!description.trim()) return
    // Create a zero-amount adjustment for the first period to establish the row
    const firstPeriod = periods[0]
    if (!firstPeriod) return

    try {
      const res = await fetch(`/api/companies/${companyId}/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount: 0,
          type,
          periodId: firstPeriod.id,
          frequency: 'ANNUAL',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAdjustments(prev => [...prev, data.adjustment])
      }
    } catch (err) {
      console.error('Failed to add item:', err)
    }
  }, [companyId, periods])

  const deleteRow = useCallback(async (description: string, type: 'ADD_BACK' | 'DEDUCTION') => {
    const toDelete = adjustments.filter(a => a.description === description && a.type === type)
    // Optimistic removal
    setAdjustments(prev => prev.filter(a => !(a.description === description && a.type === type)))
    // Delete all from server
    for (const adj of toDelete) {
      if (adj.id.startsWith('temp-')) continue
      try {
        await fetch(`/api/companies/${companyId}/adjustments/${adj.id}`, { method: 'DELETE' })
      } catch (err) {
        console.error('Failed to delete adjustment:', err)
      }
    }
  }, [adjustments, companyId])

  // ─── Calculated values ──────────────────────────────────────────
  function calcTotals(periodId: string) {
    const periodAdjs = adjustments.filter(a => a.periodId === periodId)
    const totalAddBacks = periodAdjs.filter(a => a.type === 'ADD_BACK').reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
    const totalDeductions = periodAdjs.filter(a => a.type === 'DEDUCTION').reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
    const netAdjustment = totalAddBacks - totalDeductions
    const baseEbitda = ebitdaByPeriod[periodId] || 0
    const adjustedEbitda = baseEbitda + netAdjustment
    return { totalAddBacks, totalDeductions, netAdjustment, baseEbitda, adjustedEbitda }
  }

  // ─── Render ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (periods.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No periods found. Click &quot;Enter Manually&quot; to get started.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <PeriodHeaders periods={periods} />

          {/* ── Add-Backs ── */}
          <div className="space-y-3 mb-6">
            <SectionHeader icon={TrendingUp} label="Add-Backs" bgColor="bg-emerald-100" textColor="text-emerald-600" />

            {addBackDescs.map(desc => (
              <div key={desc}>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: `200px repeat(${periods.length}, 1fr) 32px` }}
                >
                  <div className="flex items-center pl-8">
                    <span className="text-sm text-gray-600 truncate" title={desc}>{desc}</span>
                  </div>
                  {periods.map(period => {
                    const adj = findAdj(desc, period.id, 'ADD_BACK')
                    return (
                      <div key={period.id} className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatInputValue(Number(adj?.amount) || 0)}
                          onChange={(e) => handleAmountChange(desc, period.id, 'ADD_BACK', parseInputValue(e.target.value))}
                          className="pl-7 h-9 text-sm font-medium bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-right"
                          placeholder="0"
                        />
                      </div>
                    )
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-8 p-0 text-gray-400 hover:text-red-500"
                    onClick={() => deleteRow(desc, 'ADD_BACK')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Add item */}
            {showAddBackInput ? (
              <div className="flex items-center gap-2 pl-8">
                <Input
                  autoFocus
                  value={newAddBackDesc}
                  onChange={(e) => setNewAddBackDesc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newAddBackDesc.trim()) {
                      addNewItem(newAddBackDesc, 'ADD_BACK')
                      setNewAddBackDesc('')
                      setShowAddBackInput(false)
                    }
                    if (e.key === 'Escape') {
                      setNewAddBackDesc('')
                      setShowAddBackInput(false)
                    }
                  }}
                  placeholder="e.g., Owner compensation above market"
                  className="h-8 text-sm max-w-xs"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => {
                    if (newAddBackDesc.trim()) {
                      addNewItem(newAddBackDesc, 'ADD_BACK')
                      setNewAddBackDesc('')
                    }
                    setShowAddBackInput(false)
                  }}
                >
                  Add
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="ml-8 text-xs text-muted-foreground hover:text-foreground gap-1 h-7"
                onClick={() => setShowAddBackInput(true)}
              >
                <Plus className="h-3 w-3" /> Add item
              </Button>
            )}

            {/* Total Add-Backs */}
            <FormRow label="Total Add-Backs" periods={periods}>
              {(p) => <CalcCell value={calcTotals(p.id).totalAddBacks} format="currency" />}
            </FormRow>
          </div>

          {/* ── Deductions ── */}
          <div className="space-y-3 mb-6">
            <SectionHeader icon={TrendingDown} label="Deductions" bgColor="bg-red-100" textColor="text-red-600" />

            {deductionDescs.map(desc => (
              <div key={desc}>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: `200px repeat(${periods.length}, 1fr) 32px` }}
                >
                  <div className="flex items-center pl-8">
                    <span className="text-sm text-gray-600 truncate" title={desc}>{desc}</span>
                  </div>
                  {periods.map(period => {
                    const adj = findAdj(desc, period.id, 'DEDUCTION')
                    return (
                      <div key={period.id} className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatInputValue(Number(adj?.amount) || 0)}
                          onChange={(e) => handleAmountChange(desc, period.id, 'DEDUCTION', parseInputValue(e.target.value))}
                          className="pl-7 h-9 text-sm font-medium bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-right"
                          placeholder="0"
                        />
                      </div>
                    )
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-8 p-0 text-gray-400 hover:text-red-500"
                    onClick={() => deleteRow(desc, 'DEDUCTION')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Add item */}
            {showDeductionInput ? (
              <div className="flex items-center gap-2 pl-8">
                <Input
                  autoFocus
                  value={newDeductionDesc}
                  onChange={(e) => setNewDeductionDesc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newDeductionDesc.trim()) {
                      addNewItem(newDeductionDesc, 'DEDUCTION')
                      setNewDeductionDesc('')
                      setShowDeductionInput(false)
                    }
                    if (e.key === 'Escape') {
                      setNewDeductionDesc('')
                      setShowDeductionInput(false)
                    }
                  }}
                  placeholder="e.g., Missing rent expense"
                  className="h-8 text-sm max-w-xs"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => {
                    if (newDeductionDesc.trim()) {
                      addNewItem(newDeductionDesc, 'DEDUCTION')
                      setNewDeductionDesc('')
                    }
                    setShowDeductionInput(false)
                  }}
                >
                  Add
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="ml-8 text-xs text-muted-foreground hover:text-foreground gap-1 h-7"
                onClick={() => setShowDeductionInput(true)}
              >
                <Plus className="h-3 w-3" /> Add item
              </Button>
            )}

            {/* Total Deductions */}
            <FormRow label="Total Deductions" periods={periods}>
              {(p) => <CalcCell value={calcTotals(p.id).totalDeductions} format="currency" />}
            </FormRow>
          </div>

          {/* ── Results ── */}
          <div className="space-y-3">
            <SectionHeader icon={Calculator} label="Results" bgColor="bg-blue-100" textColor="text-blue-600" />

            <FormRow label="Net Adjustment" periods={periods}>
              {(p) => <CalcCell value={calcTotals(p.id).netAdjustment} format="currency" />}
            </FormRow>
            <FormRow label="Base EBITDA" periods={periods}>
              {(p) => <CalcCell value={calcTotals(p.id).baseEbitda} format="currency" />}
            </FormRow>
            <FormRow label="Adjusted EBITDA" periods={periods}>
              {(p) => <CalcCell value={calcTotals(p.id).adjustedEbitda} format="currency" highlight />}
            </FormRow>
          </div>
        </div>
      </div>
    </div>
  )
}
