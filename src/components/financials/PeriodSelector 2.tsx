'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlusCircle, Calendar, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AddPeriodDialog } from './AddPeriodDialog'

export interface FinancialPeriod {
  id: string
  periodType: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY'
  fiscalYear: number
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null
  month?: number | null
  startDate: string
  endDate: string
  label: string
  hasIncomeStatement: boolean
  hasBalanceSheet: boolean
  adjustmentCount: number
  ebitda: number | null
  createdAt: string
}

interface PeriodSelectorProps {
  companyId: string
  selectedPeriodId?: string | null
  onPeriodChange: (period: FinancialPeriod | null) => void
  onPeriodsLoaded?: (hasPeriods: boolean) => void
  className?: string
}

export function PeriodSelector({
  companyId,
  selectedPeriodId,
  onPeriodChange,
  onPeriodsLoaded,
  className,
}: PeriodSelectorProps) {
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const fetchPeriods = useCallback(async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/financial-periods`)
      if (response.ok) {
        const data = await response.json()
        setPeriods(data.periods)
        onPeriodsLoaded?.(data.periods.length > 0)

        // Auto-select if exactly 1 period exists
        if (data.periods.length === 1 && !selectedPeriodId) {
          onPeriodChange(data.periods[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch periods:', error)
    } finally {
      setIsLoading(false)
    }
  }, [companyId, onPeriodsLoaded, selectedPeriodId, onPeriodChange])

  useEffect(() => {
    fetchPeriods()
  }, [fetchPeriods])

  const handlePeriodSelect = (value: string) => {
    if (value === 'add-new') {
      setShowAddDialog(true)
      return
    }

    const period = periods.find((p) => p.id === value)
    onPeriodChange(period || null)
  }

  const handlePeriodCreated = (newPeriod: FinancialPeriod) => {
    setPeriods((prev) => [newPeriod, ...prev])
    onPeriodChange(newPeriod)
  }

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)

  const formatPeriodDisplay = (period: FinancialPeriod) => {
    const parts = [period.label]
    const indicators: string[] = []
    if (period.hasIncomeStatement) indicators.push('P&L')
    if (period.hasBalanceSheet) indicators.push('BS')
    if (period.adjustmentCount > 0) indicators.push(`${period.adjustmentCount} adj`)
    if (indicators.length > 0) {
      parts.push(`(${indicators.join(', ')})`)
    }
    return parts.join(' ')
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
      </div>
    )
  }

  // When no periods exist, show just the Add Period button (no dropdown)
  if (periods.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant="outline"
          onClick={() => setShowAddDialog(true)}
          className="gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Add Fiscal Year
        </Button>

        <AddPeriodDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          companyId={companyId}
          onPeriodCreated={handlePeriodCreated}
        />
      </div>
    )
  }

  // When exactly 1 period exists, don't show selector (it's auto-selected)
  // Just show the period label and an option to add more
  if (periods.length === 1) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-gray-700">{periods[0].label}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="gap-1 text-muted-foreground h-7 px-2"
        >
          <PlusCircle className="h-3 w-3" />
          Add Year
        </Button>

        <AddPeriodDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          companyId={companyId}
          onPeriodCreated={handlePeriodCreated}
        />
      </div>
    )
  }

  // When 2+ periods exist, show the dropdown selector
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedPeriodId || ''}
        onValueChange={handlePeriodSelect}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Select a period">
            {selectedPeriod ? formatPeriodDisplay(selectedPeriod) : 'Select a period'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {periods.map((period) => (
            <SelectItem key={period.id} value={period.id}>
              <div className="flex items-center justify-between gap-2">
                <span>{period.label}</span>
                <div className="flex gap-1 text-xs text-muted-foreground">
                  {period.hasIncomeStatement && (
                    <span className="rounded bg-green-100 px-1 text-green-700">P&L</span>
                  )}
                  {period.hasBalanceSheet && (
                    <span className="rounded bg-blue-100 px-1 text-blue-700">BS</span>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="add-new">
            <div className="flex items-center gap-2 text-primary">
              <PlusCircle className="h-4 w-4" />
              <span>Add New Period</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <AddPeriodDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        companyId={companyId}
        onPeriodCreated={handlePeriodCreated}
      />
    </div>
  )
}
