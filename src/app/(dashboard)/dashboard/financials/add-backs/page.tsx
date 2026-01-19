'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useCompany } from '@/contexts/CompanyContext'
import { PeriodSelector, FinancialPeriod } from '@/components/financials'
import {
  ArrowRight,
  Info,
  Plus,
  Minus,
  X,
  Search,
  Check,
  ChevronDown,
  Pencil,
  Calculator
} from 'lucide-react'

// Add-back categories with detailed items
// defaultFrequency: MONTHLY for recurring items, ANNUAL for one-time items
const addBackCategories = [
  {
    category: 'Owner Perks',
    description: 'Personal expenses run through the business',
    type: 'ADD_BACK' as const,
    items: [
      { label: 'Auto lease/expenses', description: 'Personal vehicle costs', defaultFrequency: 'MONTHLY' as const },
      { label: 'Vacation/travel', description: 'Personal trips charged to business', defaultFrequency: 'ANNUAL' as const },
      { label: 'Club memberships', description: 'Golf, country club, gym', defaultFrequency: 'MONTHLY' as const },
      { label: 'Entertainment', description: 'Personal meals, events, tickets', defaultFrequency: 'MONTHLY' as const },
      { label: 'Personal insurance', description: 'Life, health, disability', defaultFrequency: 'MONTHLY' as const },
      { label: 'Cell phone/internet', description: 'Personal portion of bills', defaultFrequency: 'MONTHLY' as const },
    ]
  },
  {
    category: 'Owner Compensation',
    description: 'Excess compensation above market rate',
    type: 'ADD_BACK' as const,
    items: [
      { label: 'Salary above market', description: 'Owner pay exceeding replacement cost', defaultFrequency: 'ANNUAL' as const },
      { label: 'Bonus/distributions', description: 'Discretionary payments to owner', defaultFrequency: 'ANNUAL' as const },
      { label: 'Family salaries', description: 'Relatives paid above market rate', defaultFrequency: 'ANNUAL' as const },
      { label: 'Retirement contributions', description: 'Excess 401k, pension funding', defaultFrequency: 'ANNUAL' as const },
    ]
  },
  {
    category: 'Non-Recurring Expenses',
    description: 'One-time costs that won\'t repeat',
    type: 'ADD_BACK' as const,
    items: [
      { label: 'Legal fees (one-time)', description: 'Lawsuits, settlements, special matters', defaultFrequency: 'ANNUAL' as const },
      { label: 'Consulting fees', description: 'Special projects, restructuring', defaultFrequency: 'ANNUAL' as const },
      { label: 'Moving/relocation', description: 'Office moves, employee relo', defaultFrequency: 'ANNUAL' as const },
      { label: 'Severance payments', description: 'One-time termination costs', defaultFrequency: 'ANNUAL' as const },
      { label: 'Bad debt write-off', description: 'Unusual customer defaults', defaultFrequency: 'ANNUAL' as const },
      { label: 'Natural disaster costs', description: 'Storm damage, repairs', defaultFrequency: 'ANNUAL' as const },
    ]
  },
  {
    category: 'Accounting Adjustments',
    description: 'Non-cash expenses added back',
    type: 'ADD_BACK' as const,
    items: [
      { label: 'Depreciation', description: 'Non-cash asset write-down', defaultFrequency: 'ANNUAL' as const },
      { label: 'Amortization', description: 'Non-cash intangible write-down', defaultFrequency: 'ANNUAL' as const },
      { label: 'Stock compensation', description: 'Non-cash equity grants', defaultFrequency: 'ANNUAL' as const },
    ]
  },
  {
    category: 'Related Party Adjustments',
    description: 'Below-market arrangements that inflate earnings',
    type: 'DEDUCTION' as const,
    items: [
      { label: 'Below-market rent', description: 'Favorable lease from related party', defaultFrequency: 'MONTHLY' as const },
      { label: 'Below-market salary', description: 'Owner paid under market rate', defaultFrequency: 'ANNUAL' as const },
      { label: 'Free services', description: 'Unpaid management, consulting', defaultFrequency: 'ANNUAL' as const },
      { label: 'Deferred maintenance', description: 'Postponed repairs/capex', defaultFrequency: 'ANNUAL' as const },
    ]
  },
]

// Flatten for search
interface FlattenedAddBack {
  category: string
  categoryDescription: string
  label: string
  description: string
  type: 'ADD_BACK' | 'DEDUCTION'
  defaultFrequency: 'MONTHLY' | 'ANNUAL'
  searchString: string
}

const flattenedAddBacks: FlattenedAddBack[] = addBackCategories.flatMap(cat =>
  cat.items.map(item => ({
    category: cat.category,
    categoryDescription: cat.description,
    label: item.label,
    description: item.description,
    type: cat.type,
    defaultFrequency: item.defaultFrequency,
    searchString: `${cat.category} ${item.label} ${item.description}`.toLowerCase()
  }))
)

interface Adjustment {
  id: string
  description: string
  amount: number
  type: 'ADD_BACK' | 'DEDUCTION'
  frequency: 'MONTHLY' | 'ANNUAL'
  periodId?: string | null
}

interface DashboardEbitdaData {
  adjustedEbitda: number
  isEbitdaEstimated: boolean
}

interface IncomeStatementData {
  ebitda: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatInputValue(value: number): string {
  if (!value) return ''
  return new Intl.NumberFormat('en-US').format(value)
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export default function AddBacksPage() {
  const { selectedCompanyId } = useCompany()
  const [selectedPeriod, setSelectedPeriod] = useState<FinancialPeriod | null>(null)
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [dashboardEbitda, setDashboardEbitda] = useState<DashboardEbitdaData | null>(null)
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [_hasPeriods, setHasPeriods] = useState<boolean | null>(null)

  // Combobox state
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pendingSelections, setPendingSelections] = useState<FlattenedAddBack[]>([])
  const [customLabel, setCustomLabel] = useState('')
  const [customType, setCustomType] = useState<'ADD_BACK' | 'DEDUCTION'>('ADD_BACK')

  // Edit mode for amounts
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')

  // Load company data and dashboard EBITDA
  useEffect(() => {
    async function loadData() {
      if (!selectedCompanyId) {
        setLoading(false)
        return
      }

      try {
        const dashboardRes = await fetch(`/api/companies/${selectedCompanyId}/dashboard`)
        if (dashboardRes.ok) {
          const dashData = await dashboardRes.json()
          setDashboardEbitda({
            adjustedEbitda: dashData.tier2?.adjustedEbitda || 0,
            isEbitdaEstimated: dashData.tier2?.isEbitdaEstimated || false
          })
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedCompanyId])

  // Load adjustments when period changes
  const loadAdjustments = useCallback(async () => {
    if (!selectedCompanyId) return

    try {
      const url = selectedPeriod
        ? `/api/companies/${selectedCompanyId}/adjustments?periodId=${selectedPeriod.id}`
        : `/api/companies/${selectedCompanyId}/adjustments`

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setAdjustments(data.adjustments || [])
      }
    } catch (error) {
      console.error('Error loading adjustments:', error)
    }
  }, [selectedCompanyId, selectedPeriod])

  // Load income statement for selected period
  const loadIncomeStatement = useCallback(async () => {
    if (!selectedCompanyId || !selectedPeriod) {
      setIncomeStatement(null)
      return
    }

    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/financial-periods/${selectedPeriod.id}/income-statement`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.incomeStatement) {
          setIncomeStatement({ ebitda: data.incomeStatement.ebitda })
        } else {
          setIncomeStatement(null)
        }
      }
    } catch (error) {
      console.error('Error loading income statement:', error)
      setIncomeStatement(null)
    }
  }, [selectedCompanyId, selectedPeriod])

  useEffect(() => {
    loadAdjustments()
    loadIncomeStatement()
  }, [loadAdjustments, loadIncomeStatement])

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return flattenedAddBacks
    const searchLower = search.toLowerCase()
    return flattenedAddBacks.filter(item => item.searchString.includes(searchLower))
  }, [search])

  // Group filtered options by category
  const groupedOptions = useMemo(() => {
    const groups: Record<string, FlattenedAddBack[]> = {}
    for (const option of filteredOptions) {
      if (!groups[option.category]) {
        groups[option.category] = []
      }
      groups[option.category].push(option)
    }
    return groups
  }, [filteredOptions])

  // Toggle item in pending selections
  const handleToggleSelection = (item: FlattenedAddBack) => {
    const isSelected = pendingSelections.some(s => s.label === item.label)
    if (isSelected) {
      setPendingSelections(pendingSelections.filter(s => s.label !== item.label))
    } else {
      setPendingSelections([...pendingSelections, item])
    }
  }

  // Add custom label to pending
  const handleAddCustom = () => {
    if (!customLabel.trim()) return

    const customItem: FlattenedAddBack = {
      category: 'Custom',
      categoryDescription: 'Custom adjustment',
      label: customLabel.trim(),
      description: 'Custom entry',
      type: customType,
      defaultFrequency: 'ANNUAL', // Default custom items to annual
      searchString: customLabel.toLowerCase()
    }

    setPendingSelections([...pendingSelections, customItem])
    setCustomLabel('')
  }

  // Add all pending selections
  const handleAddSelections = async () => {
    if (!selectedCompanyId || pendingSelections.length === 0) return

    setOpen(false)
    setSearch('')
    setSaving(true)

    try {
      const newAdjustments: Adjustment[] = []

      for (const item of pendingSelections) {
        const response = await fetch(`/api/companies/${selectedCompanyId}/adjustments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: item.label,
            amount: 0,
            type: item.type,
            frequency: item.defaultFrequency,
            periodId: selectedPeriod?.id || null,
          })
        })

        if (response.ok) {
          const data = await response.json()
          newAdjustments.push(data.adjustment)
        }
      }

      setAdjustments([...newAdjustments, ...adjustments])
      setPendingSelections([])

      // Focus first new adjustment for amount entry
      if (newAdjustments.length > 0) {
        setEditingId(newAdjustments[0].id)
        setEditAmount('')
      }
    } catch (error) {
      console.error('Error adding adjustments:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateAmount = async (adjustmentId: string, moveToNext = false) => {
    if (!selectedCompanyId) {
      setEditingId(null)
      return
    }

    const amount = parseCurrency(editAmount)

    // If amount is 0 or empty, just close editing (don't save 0)
    if (!editAmount || amount <= 0) {
      setEditingId(null)
      setEditAmount('')

      // If moving to next, still move even if current is empty
      if (moveToNext) {
        const currentIndex = adjustments.findIndex(a => a.id === adjustmentId)
        if (currentIndex < adjustments.length - 1) {
          const nextAdjustment = adjustments[currentIndex + 1]
          setEditingId(nextAdjustment.id)
          setEditAmount(nextAdjustment.amount > 0 ? formatInputValue(nextAdjustment.amount) : '')
        }
      }
      return
    }

    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/adjustments?adjustmentId=${adjustmentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount })
        }
      )

      if (response.ok) {
        setAdjustments(adjustments.map(a =>
          a.id === adjustmentId ? { ...a, amount } : a
        ))
      }
    } catch (error) {
      console.error('Error updating adjustment:', error)
    }

    // Move to next adjustment if requested (Enter key)
    if (moveToNext) {
      const currentIndex = adjustments.findIndex(a => a.id === adjustmentId)
      if (currentIndex < adjustments.length - 1) {
        const nextAdjustment = adjustments[currentIndex + 1]
        setEditingId(nextAdjustment.id)
        setEditAmount(nextAdjustment.amount > 0 ? formatInputValue(nextAdjustment.amount) : '')
      } else {
        // Last item, just close
        setEditingId(null)
        setEditAmount('')
      }
    } else {
      // Just close editing (blur)
      setEditingId(null)
      setEditAmount('')
    }
  }

  const handleRemoveAdjustment = async (adjustmentId: string) => {
    if (!selectedCompanyId) return

    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/adjustments?adjustmentId=${adjustmentId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setAdjustments(adjustments.filter(a => a.id !== adjustmentId))
      }
    } catch (error) {
      console.error('Error removing adjustment:', error)
    }
  }

  const handleToggleFrequency = async (adjustmentId: string, currentFrequency: 'MONTHLY' | 'ANNUAL') => {
    if (!selectedCompanyId) return

    const newFrequency = currentFrequency === 'MONTHLY' ? 'ANNUAL' : 'MONTHLY'

    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/adjustments?adjustmentId=${adjustmentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frequency: newFrequency })
        }
      )

      if (response.ok) {
        setAdjustments(adjustments.map(a =>
          a.id === adjustmentId ? { ...a, frequency: newFrequency } : a
        ))
      }
    } catch (error) {
      console.error('Error updating frequency:', error)
    }
  }

  // Helper to get annualized amount
  const getAnnualizedAmount = (adj: Adjustment) => {
    const amount = Number(adj.amount)
    return adj.frequency === 'MONTHLY' ? amount * 12 : amount
  }

  // Calculations (always annualized)
  const totalAddBacks = adjustments
    .filter(a => a.type === 'ADD_BACK')
    .reduce((sum, a) => sum + getAnnualizedAmount(a), 0)

  const totalDeductions = adjustments
    .filter(a => a.type === 'DEDUCTION')
    .reduce((sum, a) => sum + getAnnualizedAmount(a), 0)

  // Determine base EBITDA
  const hasPlEbitda = incomeStatement !== null && incomeStatement.ebitda !== undefined

  let baseEbitda: number
  let ebitdaSource: 'pnl' | 'estimated'

  if (hasPlEbitda) {
    baseEbitda = incomeStatement.ebitda
    ebitdaSource = 'pnl'
  } else if (dashboardEbitda && dashboardEbitda.adjustedEbitda > 0) {
    const localNetAdjustment = totalAddBacks - totalDeductions
    baseEbitda = dashboardEbitda.adjustedEbitda - localNetAdjustment
    ebitdaSource = 'estimated'
  } else {
    baseEbitda = 0
    ebitdaSource = 'estimated'
  }

  const adjustedEbitda = baseEbitda + totalAddBacks - totalDeductions

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!selectedCompanyId) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EBITDA Add-Backs</h1>
          <p className="text-gray-600">Select a company to manage adjustments</p>
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
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">EBITDA Add-Backs</h1>
        <p className="text-gray-600">
          Normalize your earnings by adjusting for owner perks and non-recurring items
        </p>
      </div>

      {/* Period Selector */}
      <PeriodSelector
        companyId={selectedCompanyId}
        selectedPeriodId={selectedPeriod?.id}
        onPeriodChange={setSelectedPeriod}
        onPeriodsLoaded={setHasPeriods}
      />

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Calculator className="h-4 w-4" />
                {ebitdaSource === 'pnl' ? 'From P&L Statement' : 'Estimated'}
              </div>
              <div className="text-3xl font-bold">{formatCurrency(adjustedEbitda)}</div>
              <div className="text-slate-400 text-sm mt-1">Adjusted EBITDA</div>
            </div>

            <div className="text-right space-y-1 text-sm">
              <div className="flex items-center justify-end gap-2">
                <span className="text-slate-400">Base</span>
                <span className="font-medium">{formatCurrency(baseEbitda)}</span>
              </div>
              {totalAddBacks > 0 && (
                <div className="flex items-center justify-end gap-2">
                  <span className="text-emerald-400">+ Add-backs</span>
                  <span className="font-medium text-emerald-400">{formatCurrency(totalAddBacks)}</span>
                </div>
              )}
              {totalDeductions > 0 && (
                <div className="flex items-center justify-end gap-2">
                  <span className="text-red-400">- Deductions</span>
                  <span className="font-medium text-red-400">{formatCurrency(totalDeductions)}</span>
                </div>
              )}
            </div>
          </div>

          {ebitdaSource === 'estimated' && (
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Info className="h-4 w-4" />
                <span>Enter P&L data for accurate base EBITDA</span>
              </div>
              <Link href="/dashboard/financials/pnl">
                <Button size="sm" variant="secondary">
                  Enter P&L
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Adjustment Combobox */}
      <Card>
        <CardContent className="p-4">
          <Popover open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) {
              setSearch('')
              setPendingSelections([])
              setCustomLabel('')
            }
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between h-12 text-base"
                disabled={!selectedPeriod}
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Search className="h-4 w-4" />
                  <span>Search add-backs and deductions...</span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Type to search (e.g., 'auto', 'salary', 'legal')..."
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList className="max-h-[300px]">
                  <CommandEmpty>No matching add-backs found.</CommandEmpty>
                  {Object.entries(groupedOptions).map(([category, items]) => {
                    const isDeduction = items[0]?.type === 'DEDUCTION'
                    return (
                      <CommandGroup
                        key={category}
                        heading={
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              isDeduction ? "bg-red-500" : "bg-emerald-500"
                            )} />
                            <span>{category}</span>
                            <span className="text-xs font-normal text-muted-foreground">
                              ({isDeduction ? 'Deduction' : 'Add-back'})
                            </span>
                          </div>
                        }
                      >
                        {items.map((item) => {
                          const isAdded = adjustments.some(a => a.description === item.label)
                          const isPending = pendingSelections.some(s => s.label === item.label)
                          return (
                            <CommandItem
                              key={`${item.category}-${item.label}`}
                              value={`${item.category}-${item.label}`}
                              onSelect={() => !isAdded && handleToggleSelection(item)}
                              disabled={isAdded}
                              className={cn(
                                "py-2.5",
                                isAdded && "opacity-50"
                              )}
                            >
                              <div className="flex items-center w-full">
                                <div className={cn(
                                  "w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-colors",
                                  isAdded ? "bg-gray-200 border-gray-300" :
                                  isPending ? (isDeduction ? "bg-red-500 border-red-500" : "bg-emerald-500 border-emerald-500") :
                                  "border-gray-300"
                                )}>
                                  {(isAdded || isPending) && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">{item.label}</div>
                                  <div className="text-xs text-muted-foreground">{item.description}</div>
                                </div>
                                {isAdded && (
                                  <span className="text-xs text-muted-foreground">Already added</span>
                                )}
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    )
                  })}
                </CommandList>

                {/* Custom Label Input */}
                <div className="border-t p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Add custom item</div>
                  <div className="flex gap-2">
                    <Input
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="Enter custom label..."
                      className="h-9 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddCustom()
                        }
                      }}
                    />
                    <select
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value as 'ADD_BACK' | 'DEDUCTION')}
                      className="h-9 px-2 text-sm border rounded-md bg-background"
                    >
                      <option value="ADD_BACK">Add-back</option>
                      <option value="DEDUCTION">Deduction</option>
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddCustom}
                      disabled={!customLabel.trim()}
                      className="h-9"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Pending Selections & Add Button */}
                <div className="border-t p-3 bg-gray-50">
                  {pendingSelections.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {pendingSelections.map((item, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                              item.type === 'DEDUCTION' ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                            )}
                          >
                            {item.label}
                            <button
                              onClick={() => setPendingSelections(pendingSelections.filter((_, i) => i !== idx))}
                              className="hover:bg-black/10 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <Button
                        onClick={handleAddSelections}
                        disabled={saving}
                        className="w-full"
                      >
                        {saving ? 'Adding...' : `Add ${pendingSelections.length} item${pendingSelections.length > 1 ? 's' : ''}`}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-1">
                      Select items above or add a custom entry
                    </p>
                  )}
                </div>
              </Command>
            </PopoverContent>
          </Popover>

          {!selectedPeriod && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Select a fiscal year above to add adjustments
            </p>
          )}
        </CardContent>
      </Card>

      {/* Adjustments List */}
      {adjustments.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {adjustments.map((adjustment) => {
                const isDeduction = adjustment.type === 'DEDUCTION'
                const isEditing = editingId === adjustment.id

                return (
                  <div
                    key={adjustment.id}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Type indicator */}
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
                      isDeduction ? "bg-red-100" : "bg-emerald-100"
                    )}>
                      {isDeduction ? (
                        <Minus className="h-4 w-4 text-red-600" />
                      ) : (
                        <Plus className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {adjustment.description}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isDeduction ? 'Deduction' : 'Add-back'}
                      </div>
                    </div>

                    {/* Frequency toggle */}
                    <button
                      onClick={() => handleToggleFrequency(adjustment.id, adjustment.frequency)}
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded-md border transition-colors shrink-0",
                        adjustment.frequency === 'MONTHLY'
                          ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {adjustment.frequency === 'MONTHLY' ? '/mo' : '/yr'}
                    </button>

                    {/* Amount */}
                    {isEditing ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={editAmount}
                          onChange={(e) => {
                            // Strip non-numeric, format with commas
                            const raw = e.target.value.replace(/[^0-9]/g, '')
                            if (raw === '') {
                              setEditAmount('')
                            } else {
                              setEditAmount(Number(raw).toLocaleString('en-US'))
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleUpdateAmount(adjustment.id, true) // Save and move to next
                            }
                            if (e.key === 'Escape') {
                              setEditingId(null)
                              setEditAmount('')
                            }
                          }}
                          onBlur={() => handleUpdateAmount(adjustment.id, false)} // Save on blur
                          className="w-36 pl-7 h-9"
                          placeholder="0"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="text-right">
                        <button
                          onClick={() => {
                            setEditingId(adjustment.id)
                            setEditAmount(adjustment.amount > 0 ? formatInputValue(adjustment.amount) : '')
                          }}
                          className={cn(
                            "flex items-center gap-1 font-semibold tabular-nums hover:underline",
                            isDeduction ? "text-red-600" : "text-emerald-600"
                          )}
                        >
                          {adjustment.amount > 0 ? (
                            <>
                              {isDeduction ? '-' : '+'}{formatCurrency(Number(adjustment.amount))}
                            </>
                          ) : (
                            <span className="text-muted-foreground font-normal flex items-center gap-1">
                              <Pencil className="h-3 w-3" />
                              Enter amount
                            </span>
                          )}
                        </button>
                        {adjustment.frequency === 'MONTHLY' && adjustment.amount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            = {formatCurrency(getAnnualizedAmount(adjustment))}/yr
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => handleRemoveAdjustment(adjustment.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {adjustments.length === 0 && selectedPeriod && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <p className="font-medium text-gray-900">No adjustments yet</p>
          <p className="text-sm mt-1">Use the search box above to add common add-backs and deductions</p>
        </div>
      )}

      {/* Continue Button */}
      {selectedPeriod && adjustments.length > 0 && (
        <div className="flex justify-end">
          <Link href="/dashboard/financials/dcf">
            <Button className="gap-2">
              Continue to Valuation
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
