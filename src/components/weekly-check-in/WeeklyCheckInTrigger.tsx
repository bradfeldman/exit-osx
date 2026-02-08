'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WeeklyCheckInPrompt } from './WeeklyCheckInPrompt'

interface CheckInData {
  id: string
  weekOf: string
  expiresAt: string
  completedAt: string | null
  skippedAt: string | null
}

interface WeeklyCheckInTriggerProps {
  onRefresh?: () => void
}

export function WeeklyCheckInTrigger({ onRefresh }: WeeklyCheckInTriggerProps = {}) {
  const { selectedCompanyId } = useCompany()
  const [checkIn, setCheckIn] = useState<CheckInData | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCheckIn = useCallback(async () => {
    if (!selectedCompanyId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/weekly-check-in/current`)
      if (res.ok) {
        const data = await res.json()
        setCheckIn(data.checkIn)
      }
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchCheckIn()
  }, [fetchCheckIn])

  // Don't show if loading, no check-in, or already completed/skipped
  if (isLoading || !checkIn || checkIn.completedAt || checkIn.skippedAt) {
    return null
  }

  // Don't show if expired
  if (new Date(checkIn.expiresAt) < new Date()) {
    return null
  }

  const weekDate = new Date(checkIn.weekOf)
  const weekLabel = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <ClipboardCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Weekly Check-In</p>
              <p className="text-xs text-muted-foreground">
                Week of {weekLabel} &middot; Takes ~90 seconds
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowPrompt(true)}>
            Start
          </Button>
        </div>
      </div>

      {showPrompt && (
        <WeeklyCheckInPrompt
          checkInId={checkIn.id}
          onClose={() => setShowPrompt(false)}
          onComplete={() => {
            setShowPrompt(false)
            fetchCheckIn()
            onRefresh?.()
          }}
        />
      )}
    </>
  )
}
