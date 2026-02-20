'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PlusCircle,
  MinusCircle,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckSquare,
} from 'lucide-react'

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
  { id: 'rent-below', description: 'Below-Market Related Party Rent', defaultType: 'DEDUCTION' as const, hint: 'Rent paid to owner below fair market value', warnIfPositive: true },
]

interface AddBacksTabProps {
  companyId: string
  periodId: string
  onDirty?: () => void
}

interface Adjustment {
  id: string
  description: string
  amount: number
  type: 'ADD_BACK' | 'DEDUCTION'
  frequency: 'MONTHLY' | 'ANNUAL'
  periodId: string | null
}

export function AddBacksTab({ companyId, periodId, onDirty }: AddBacksTabProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [_isInitialized, setIsInitialized] = useState(false)
  const [allPeriodIds, setAllPeriodIds] = useState<string[]>([])

  // New adjustment form
  const [newDescription, setNewDescription] = useState('')
  const [newAmount, setNewAmount] = useState<number>(0)
  const [newType, setNewType] = useState<'ADD_BACK' | 'DEDUCTION'>('ADD_BACK')
  const [newFrequency, setNewFrequency] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL')

  // Quick add common items
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddSelections, setQuickAddSelections] = useState<Record<string, { selected: boolean; amount: number }>>({})
  const [pendingDeductionConfirm, setPendingDeductionConfirm] = useState<string | null>(null)

  // Store callback in ref
  const onDirtyRef = useRef(onDirty)
  onDirtyRef.current = onDirty

  // Fetch all period IDs for this company (to copy add-backs across years)
  const fetchAllPeriods = useCallback(async () => {
    if (!companyId) return

    try {
      const response = await fetch(`/api/companies/${companyId}/financial-periods`)
      if (response.ok) {
        const data = await response.json()
        const periods = data.periods || []
        setAllPeriodIds(periods.map((p: { id: string }) => p.id))
      }
    } catch (error) {
      console.error('Failed to fetch periods:', error)
    }
  }, [companyId])

  const fetchAdjustments = useCallback(async () => {
    if (!companyId || !periodId) return

    setIsLoading(true)
    setIsInitialized(false)
    try {
      const response = await fetch(
        `/api/companies/${companyId}/adjustments?periodId=${periodId}`
      )
      if (response.ok) {
        const data = await response.json()
        setAdjustments(data.adjustments || [])
      }
    } catch (error) {
      console.error('Failed to fetch adjustments:', error)
    } finally {
      setIsLoading(false)
      setTimeout(() => setIsInitialized(true), 100)
    }
  }, [companyId, periodId])

  useEffect(() => {
    fetchAllPeriods()
    fetchAdjustments()
  }, [fetchAllPeriods, fetchAdjustments])

  const handleAddAdjustment = async () => {
    if (!newDescription.trim() || newAmount === 0) return

    try {
      // Add to current period
      const response = await fetch(`/api/companies/${companyId}/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newDescription,
          amount: newAmount,
          type: newType,
          frequency: newFrequency,
          periodId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAdjustments((prev) => [data.adjustment, ...prev])
        setNewDescription('')
        setNewAmount(0)
        onDirtyRef.current?.()

        // Also add to all other periods (description only, amount = 0 since each year differs)
        const otherPeriodIds = allPeriodIds.filter(id => id !== periodId)
        for (const otherPeriodId of otherPeriodIds) {
          try {
            await fetch(`/api/companies/${companyId}/adjustments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                description: newDescription,
                amount: 0,  // Each year will have different amounts
                type: newType,
                frequency: newFrequency,
                periodId: otherPeriodId,
              }),
            })
          } catch (err) {
            console.error(`Failed to add adjustment to period ${otherPeriodId}:`, err)
          }
        }
      }
    } catch (error) {
      console.error('Failed to add adjustment:', error)
    }
  }

  // Handle quick add item toggle
  const handleQuickAddToggle = (itemId: string) => {
    setQuickAddSelections(prev => ({
      ...prev,
      [itemId]: {
        selected: !prev[itemId]?.selected,
        amount: prev[itemId]?.amount || 0
      }
    }))
  }

  // Handle quick add amount change
  const handleQuickAddAmount = (itemId: string, amount: number) => {
    const item = COMMON_ADDBACKS.find(i => i.id === itemId)

    // Check if this is a typically-deduction item with a positive amount
    if (item?.warnIfPositive && amount > 0 && item.defaultType === 'DEDUCTION') {
      setPendingDeductionConfirm(itemId)
    }

    setQuickAddSelections(prev => ({
      ...prev,
      [itemId]: {
        selected: prev[itemId]?.selected || false,
        amount
      }
    }))
  }

  // Add all selected quick add items
  const handleAddQuickItems = async () => {
    const selectedItems = COMMON_ADDBACKS.filter(
      item => quickAddSelections[item.id]?.selected && quickAddSelections[item.id]?.amount > 0
    )

    // Add to current period with the entered amount
    for (const item of selectedItems) {
      const selection = quickAddSelections[item.id]

      try {
        const response = await fetch(`/api/companies/${companyId}/adjustments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: item.description,
            amount: selection.amount,
            type: item.defaultType,
            frequency: 'ANNUAL',
            periodId,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setAdjustments((prev) => [data.adjustment, ...prev])
        }
      } catch (error) {
        console.error('Failed to add adjustment:', error)
      }

      // Add to other periods with amount = 0 (description only, each year differs)
      const otherPeriodIds = allPeriodIds.filter(id => id !== periodId)
      for (const otherPeriodId of otherPeriodIds) {
        try {
          await fetch(`/api/companies/${companyId}/adjustments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: item.description,
              amount: 0,
              type: item.defaultType,
              frequency: 'ANNUAL',
              periodId: otherPeriodId,
            }),
          })
        } catch (error) {
          console.error('Failed to add adjustment to other period:', error)
        }
      }
    }

    // Clear selections and close
    setQuickAddSelections({})
    setShowQuickAdd(false)
    onDirtyRef.current?.()
  }

  // Count selected items with amounts
  const selectedQuickAddCount = COMMON_ADDBACKS.filter(
    item => quickAddSelections[item.id]?.selected && quickAddSelections[item.id]?.amount > 0
  ).length

  const handleUpdateAdjustment = async (id: string, updates: Partial<Adjustment>) => {
    try {
      const response = await fetch(
        `/api/companies/${companyId}/adjustments?adjustmentId=${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      )

      if (response.ok) {
        const data = await response.json()
        setAdjustments((prev) =>
          prev.map((a) => (a.id === id ? data.adjustment : a))
        )
        onDirtyRef.current?.()
      }
    } catch (error) {
      console.error('Failed to update adjustment:', error)
    }
  }

  const handleDeleteAdjustment = async (id: string) => {
    try {
      const response = await fetch(
        `/api/companies/${companyId}/adjustments?adjustmentId=${id}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setAdjustments((prev) => prev.filter((a) => a.id !== id))
        onDirtyRef.current?.()
      }
    } catch (error) {
      console.error('Failed to delete adjustment:', error)
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

  // Calculate totals
  const totalAddBacks = adjustments
    .filter((a) => a.type === 'ADD_BACK')
    .reduce((sum, a) => {
      const amount = Number(a.amount) || 0
      return sum + (a.frequency === 'MONTHLY' ? amount * 12 : amount)
    }, 0)

  const totalDeductions = adjustments
    .filter((a) => a.type === 'DEDUCTION')
    .reduce((sum, a) => {
      const amount = Number(a.amount) || 0
      return sum + (a.frequency === 'MONTHLY' ? amount * 12 : amount)
    }, 0)

  const netAdjustment = totalAddBacks - totalDeductions

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const addBacks = adjustments.filter((a) => a.type === 'ADD_BACK')
  const deductions = adjustments.filter((a) => a.type === 'DEDUCTION')

  return (
    <div className="space-y-8">
      {/* Add New Adjustment */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-light text-primary">
              <Plus className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-foreground">Add New Adjustment</h3>
          </div>
          {allPeriodIds.length > 1 && (
            <span className="text-xs text-muted-foreground">
              Description copied to all years (amounts entered separately)
            </span>
          )}
        </div>

        <div className="ml-11 p-4 bg-secondary rounded-lg border border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Description
              </label>
              <Input
                placeholder="e.g., Owner's salary above market rate"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatInputValue(newAmount)}
                  onChange={(e) => setNewAmount(parseInputValue(e.target.value))}
                  className="pl-7 bg-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Type
                </label>
                <Select value={newType} onValueChange={(v) => setNewType(v as 'ADD_BACK' | 'DEDUCTION')}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADD_BACK">Add-Back</SelectItem>
                    <SelectItem value="DEDUCTION">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Frequency:</label>
              <Select value={newFrequency} onValueChange={(v) => setNewFrequency(v as 'MONTHLY' | 'ANNUAL')}>
                <SelectTrigger className="w-32 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {newFrequency === 'MONTHLY' && newAmount > 0 && (
                <span className="text-sm text-muted-foreground">
                  = {formatCurrency(newAmount * 12)}/year
                </span>
              )}
            </div>
            <Button onClick={handleAddAdjustment} disabled={!newDescription.trim() || newAmount === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Quick Add Common Items - Collapsible */}
        <div className="ml-11 mt-3">
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showQuickAdd ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <CheckSquare className="h-4 w-4" />
            Quick Add Common Items
          </button>

          {showQuickAdd && (
            <div className="mt-3 p-4 bg-secondary rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-3">
                Check items that apply and enter amounts. They&apos;ll be added as add-backs (or deductions where noted).
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {COMMON_ADDBACKS.map(item => {
                  const selection = quickAddSelections[item.id]
                  const isSelected = selection?.selected || false
                  const amount = selection?.amount || 0
                  const isDeduction = item.defaultType === 'DEDUCTION'

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                        isSelected ? 'bg-white border border-border' : 'hover:bg-secondary'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleQuickAddToggle(item.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${isSelected ? 'font-medium text-foreground' : 'text-foreground'}`}>
                            {item.description}
                          </span>
                          {isDeduction && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-light text-red-dark rounded">Deduction</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{item.hint}</p>
                      </div>
                      {isSelected && (
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatInputValue(amount)}
                            onChange={(e) => handleQuickAddAmount(item.id, parseInputValue(e.target.value))}
                            placeholder="0"
                            className="pl-6 h-8 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Deduction confirmation dialog */}
              {pendingDeductionConfirm && (
                <div className="mt-3 p-3 bg-orange-light border border-orange/20 rounded-md">
                  <p className="text-sm text-orange-dark">
                    <strong>Note:</strong> This item is typically a deduction (reduces adjusted EBITDA).
                    A positive amount will be subtracted. Is this correct?
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => setPendingDeductionConfirm(null)}>
                      Got it
                    </Button>
                  </div>
                </div>
              )}

              {selectedQuickAddCount > 0 && (
                <div className="flex justify-end mt-3 pt-3 border-t border-border">
                  <Button onClick={handleAddQuickItems} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add {selectedQuickAddCount} Item{selectedQuickAddCount > 1 ? 's' : ''}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add-Backs Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-light text-green-dark">
            <PlusCircle className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-foreground">Add-Backs</h3>
          <span className="text-sm text-muted-foreground">({addBacks.length} items)</span>
        </div>

        <div className="ml-11 space-y-2">
          {addBacks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4">No add-backs yet. Add one above.</p>
          ) : (
            addBacks.map((adj) => (
              <AdjustmentRow
                key={adj.id}
                adjustment={adj}
                onUpdate={handleUpdateAdjustment}
                onDelete={handleDeleteAdjustment}
                formatCurrency={formatCurrency}
                formatInputValue={formatInputValue}
                parseInputValue={parseInputValue}
              />
            ))
          )}
          <div className="flex justify-between items-center px-4 py-3 bg-green-light rounded-lg">
            <span className="font-medium text-green-dark">Total Add-Backs</span>
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg text-green-dark text-right min-w-[100px]">{formatCurrency(totalAddBacks)}</span>
              <div className="w-[28px]" /> {/* Spacer to align with trash icon */}
            </div>
          </div>
        </div>
      </div>

      {/* Deductions Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-light text-red-dark">
            <MinusCircle className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-foreground">Deductions</h3>
          <span className="text-sm text-muted-foreground">({deductions.length} items)</span>
        </div>

        <div className="ml-11 space-y-2">
          {deductions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4">No deductions yet. Add one above.</p>
          ) : (
            deductions.map((adj) => (
              <AdjustmentRow
                key={adj.id}
                adjustment={adj}
                onUpdate={handleUpdateAdjustment}
                onDelete={handleDeleteAdjustment}
                formatCurrency={formatCurrency}
                formatInputValue={formatInputValue}
                parseInputValue={parseInputValue}
              />
            ))
          )}
          <div className="flex justify-between items-center px-4 py-3 bg-red-light rounded-lg">
            <span className="font-medium text-red-dark">Total Deductions</span>
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg text-red-dark text-right min-w-[100px]">({formatCurrency(totalDeductions)})</span>
              <div className="w-[28px]" /> {/* Spacer to align with trash icon */}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="ml-11">
        <div className={`flex justify-between items-center px-4 py-4 rounded-lg border-2 ${
          netAdjustment >= 0 ? 'bg-accent-light border-primary/20' : 'bg-orange-light border-orange/20'
        }`}>
          <div>
            <span className={`font-semibold ${netAdjustment >= 0 ? 'text-primary' : 'text-orange-dark'}`}>
              Net Adjustment
            </span>
            <p className="text-sm text-muted-foreground mt-0.5">
              Added to EBITDA for Adjusted EBITDA
            </p>
          </div>
          <span className={`font-bold text-2xl ${netAdjustment >= 0 ? 'text-primary' : 'text-orange-dark'}`}>
            {netAdjustment >= 0 ? '+' : ''}{formatCurrency(netAdjustment)}
          </span>
        </div>
      </div>
    </div>
  )
}

interface AdjustmentRowProps {
  adjustment: Adjustment
  onUpdate: (id: string, updates: Partial<Adjustment>) => void
  onDelete: (id: string) => void
  formatCurrency: (v: number) => string
  formatInputValue: (v: number) => string
  parseInputValue: (v: string) => number
}

function AdjustmentRow({
  adjustment,
  onUpdate,
  onDelete,
  formatCurrency,
  formatInputValue,
  parseInputValue,
}: AdjustmentRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [description, setDescription] = useState(adjustment.description)
  const [amount, setAmount] = useState(adjustment.amount)
  const [frequency, setFrequency] = useState(adjustment.frequency)

  const handleSave = () => {
    onUpdate(adjustment.id, { description, amount, frequency })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setDescription(adjustment.description)
    setAmount(adjustment.amount)
    setFrequency(adjustment.frequency)
    setIsEditing(false)
  }

  const annualizedAmount = frequency === 'MONTHLY' ? amount * 12 : amount

  if (isEditing) {
    return (
      <div className="p-3 bg-white border border-border rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="md:col-span-2"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="text"
                inputMode="numeric"
                value={formatInputValue(amount)}
                onChange={(e) => setAmount(parseInputValue(e.target.value))}
                className="pl-7"
              />
            </div>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as 'MONTHLY' | 'ANNUAL')}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANNUAL">Annual</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Save</Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex items-center justify-between p-3 bg-white border border-border rounded-lg hover:border-border transition-colors cursor-pointer group"
      onClick={() => setIsEditing(true)}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{adjustment.description}</p>
        {adjustment.frequency === 'MONTHLY' && (
          <p className="text-xs text-muted-foreground">
            {formatCurrency(adjustment.amount)}/month
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-foreground text-right min-w-[100px]">{formatCurrency(annualizedAmount)}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(adjustment.id)
          }}
          className="p-1.5 text-muted-foreground hover:text-red opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
