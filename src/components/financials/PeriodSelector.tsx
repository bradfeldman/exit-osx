'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Calendar } from 'lucide-react'

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

  // Store callback in ref to avoid dependency issues
  const onPeriodsLoadedRef = useRef(onPeriodsLoaded)
  onPeriodsLoadedRef.current = onPeriodsLoaded

  const fetchPeriods = useCallback(async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/financial-periods`)
      if (response.ok) {
        const data = await response.json()
        setPeriods(data.periods)
        // Notify parent about whether periods exist (use ref to avoid dep issues)
        onPeriodsLoadedRef.current?.(data.periods.length > 0)
      }
    } catch (error) {
      console.error('Failed to fetch periods:', error)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchPeriods()
  }, [fetchPeriods])

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

  // When no periods exist, show a simple message
  if (periods.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No periods yet</span>
      </div>
    )
  }

  // When exactly 1 period exists, just show the label
  if (periods.length === 1) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-gray-700">{periods[0].label}</span>
      </div>
    )
  }

  // When 2+ periods exist, show the dropdown selector
  const handleNativeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const period = periods.find((p) => p.id === value)
    onPeriodChange(period || null)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <select
        value={selectedPeriodId || ''}
        onChange={handleNativeSelect}
        className="h-9 w-[240px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="" disabled>Select a period</option>
        {periods.map((period) => (
          <option key={period.id} value={period.id}>
            {formatPeriodDisplay(period)}
          </option>
        ))}
      </select>
    </div>
  )
}
