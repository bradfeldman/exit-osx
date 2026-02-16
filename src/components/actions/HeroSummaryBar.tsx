'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { formatCurrency } from '@/lib/utils/currency'

interface HeroSummaryBarProps {
  totalTasks: number
  activeTasks: number
  deferredTasks: number
  completedThisMonth: number
  valueRecoveredThisMonth: number
}

interface PaceData {
  projectedMonthsToClose: number | null
  hasEnoughHistory: boolean
  monthlyCompletionRate: number
  remainingValueGap: number
}

export function HeroSummaryBar({
  totalTasks,
  activeTasks,
  deferredTasks,
  completedThisMonth,
  valueRecoveredThisMonth,
}: HeroSummaryBarProps) {
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
      // Silently fail - pace indicator is non-critical
      setPaceData(null)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchPaceData()
  }, [fetchPaceData])

  const statsSegments = [`${totalTasks} tasks`, `${activeTasks} active`]
  if (deferredTasks > 0) {
    statsSegments.push(`${deferredTasks} deferred`)
  }

  // Format pace message
  const paceMessage = paceData?.hasEnoughHistory && paceData.projectedMonthsToClose !== null
    ? `At this rate, you'll close your Value Gap in ~${Math.ceil(paceData.projectedMonthsToClose)} months`
    : null

  return (
    <div className="w-full rounded-xl border border-border/50 bg-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            YOUR ACTION QUEUE
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {statsSegments.map((seg, i) => (
              <span key={i}>
                {i > 0 && ' · '}
                {seg.includes('deferred') ? (
                  <span className="text-amber-600 cursor-pointer">{seg}</span>
                ) : (
                  seg
                )}
              </span>
            ))}
          </p>
        </div>

        <div className="text-sm text-muted-foreground sm:text-right">
          {completedThisMonth > 0 ? (
            <div className="space-y-0.5">
              <p>
                <span>{new Date().toLocaleString('en-US', { month: 'long' })}: </span>
                <span className="font-semibold text-foreground">
                  {completedThisMonth} completed
                </span>
                <span> · </span>
                <span className="font-bold text-[var(--burnt-orange)]">
                  {formatCurrency(valueRecoveredThisMonth)} recovered
                </span>
              </p>
              {paceMessage && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {paceMessage}
                </p>
              )}
            </div>
          ) : (
            <p>{new Date().toLocaleString('en-US', { month: 'long' })}: Ready to start</p>
          )}
        </div>
      </div>
    </div>
  )
}
