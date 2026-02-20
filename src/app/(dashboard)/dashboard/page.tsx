'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { ValueHome } from '@/components/value/ValueHome'
import { FirstVisitDashboard } from '@/components/value/FirstVisitDashboard'
import { TrackPageView } from '@/components/tracking/TrackPageView'

/**
 * First-visit detection uses existing data signals — no schema change needed:
 * - Company created < 7 days ago
 * - No tasks have been started (nextMove.task.startedAt is null)
 * - Server returns `isFirstVisit` flag based on visit count + task activity
 *
 * Transition triggers (ANY ends first-visit state):
 * - User starts their first action (clicks "Start This Action")
 * - User has visited dashboard 3+ times
 * - User completes Diagnosis assessment
 * - 7 days pass since account creation
 */
export default function DashboardPage() {
  const { selectedCompanyId, selectedCompany } = useCompany()
  const router = useRouter()
  const [firstVisitData, setFirstVisitData] = useState<{
    isFirstVisit: boolean
    briScore: number | null
    firstTask: {
      id: string
      title: string
      description: string
      briCategory: string
      estimatedHours: number | null
      rawImpact: number
      buyerConsequence: string | null
    } | null
    quickWins: Array<{
      id: string
      title: string
      rawImpact: number
      briCategory: string
    }>
  } | null>(null)
  const [loading, setLoading] = useState(true)

  // Check first-visit state
  useEffect(() => {
    if (!selectedCompanyId) return

    fetch(`/api/companies/${selectedCompanyId}/first-visit`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setFirstVisitData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedCompanyId])

  const handleStartFirstMove = useCallback(() => {
    if (!firstVisitData?.firstTask) return

    // Mark task as IN_PROGRESS via existing task API
    fetch(`/api/tasks/${firstVisitData.firstTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    }).catch(() => {})

    // Transition to actions page with task focused
    setFirstVisitData(null)
    router.push(`/dashboard/actions?task=${firstVisitData.firstTask.id}`)
  }, [firstVisitData, router])

  const handleDismissWelcome = useCallback(() => {
    if (!selectedCompanyId) return
    // Record the dismissal — server-side will factor this into first-visit logic
    fetch(`/api/companies/${selectedCompanyId}/first-visit/dismiss`, {
      method: 'POST',
    }).catch(() => {})
  }, [selectedCompanyId])

  // If still loading or no first-visit data, show standard ValueHome
  if (loading || !firstVisitData?.isFirstVisit) {
    return (
      <>
        <TrackPageView page="/dashboard" />
        <ValueHome />
      </>
    )
  }

  return (
    <>
      <TrackPageView page="/dashboard/first-visit" />
      <FirstVisitDashboard
        companyName={selectedCompany?.name ?? 'there'}
        briScore={firstVisitData.briScore}
        firstTask={firstVisitData.firstTask}
        quickWins={firstVisitData.quickWins}
        onStartFirstMove={handleStartFirstMove}
        onDismissWelcome={handleDismissWelcome}
      />
    </>
  )
}
