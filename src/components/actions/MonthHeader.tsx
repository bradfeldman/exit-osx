'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { formatCurrency } from '@/lib/utils/currency'

interface MonthHeaderProps {
  totalTasks: number
  activeTasks: number
  deferredTasks: number
  completedThisMonth: number
  valueRecoveredThisMonth: number
  isFreeUser?: boolean
  freeTaskLimit?: number
}

interface PaceData {
  projectedMonthsToClose: number | null
  hasEnoughHistory: boolean
  monthlyCompletionRate: number
  remainingValueGap: number
}

export function MonthHeader({
  totalTasks,
  completedThisMonth,
  valueRecoveredThisMonth,
  isFreeUser = false,
  freeTaskLimit = 3,
}: MonthHeaderProps) {
  const { selectedCompanyId } = useCompany()
  const [paceData, setPaceData] = useState<PaceData | null>(null)

  const fetchPaceData = useCallback(async () => {
    if (!selectedCompanyId) return
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/pace`)
      if (!response.ok) throw new Error('Failed to fetch pace data')
      const data = await response.json()
      setPaceData(data)
    } catch {
      setPaceData(null)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchPaceData()
  }, [fetchPaceData])

  const monthName = new Date().toLocaleString('en-US', { month: 'long' })
  const progressPercent = totalTasks > 0
    ? Math.round((completedThisMonth / totalTasks) * 100)
    : 0

  // SVG progress ring dimensions
  const size = 56
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  const subtitle = isFreeUser
    ? `${freeTaskLimit} free items \u2014 upgrade to unlock all`
    : `${totalTasks} items this month`

  const paceMessage = paceData?.hasEnoughHistory && paceData.projectedMonthsToClose !== null
    ? `At this rate, you\u2019ll close your Value Gap in ~${Math.ceil(paceData.projectedMonthsToClose)} months`
    : null

  return (
    <div className="w-full rounded-xl border border-border/50 bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title + subtitle */}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground">
            {monthName}&rsquo;s Action Items
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {subtitle}
          </p>
          {paceMessage && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              {paceMessage}
            </p>
          )}
        </div>

        {/* Right: Progress ring + value */}
        <div className="flex flex-col items-center shrink-0">
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/50"
              />
              {/* Progress arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--burnt-orange)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-foreground">
                {completedThisMonth}/{totalTasks}
              </span>
            </div>
          </div>
          {valueRecoveredThisMonth > 0 && (
            <span className="text-xs font-bold text-[var(--burnt-orange)] mt-1">
              {formatCurrency(valueRecoveredThisMonth)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
