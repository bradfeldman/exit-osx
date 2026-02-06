'use client'

import { useState, useEffect } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { DriftReportCard } from './DriftReportCard'

interface DriftReportSummary {
  id: string
  periodStart: string
  periodEnd: string
  briScoreStart: number
  briScoreEnd: number
  valuationStart: number
  valuationEnd: number
  tasksCompletedCount: number
  signalsCount: number
  viewedAt: string | null
}

export function DriftReportBanner() {
  const { selectedCompanyId } = useCompany()
  const [report, setReport] = useState<DriftReportSummary | null>(null)

  useEffect(() => {
    if (!selectedCompanyId) return

    let cancelled = false

    async function fetchLatest() {
      try {
        const response = await fetch(`/api/companies/${selectedCompanyId}/drift-reports?limit=1`)
        if (!response.ok || cancelled) return
        const data = await response.json()
        if (!cancelled && data.reports?.length > 0 && !data.reports[0].viewedAt) {
          setReport(data.reports[0])
        }
      } catch {
        // Silent fail — banner is supplementary
      }
    }

    fetchLatest()

    return () => { cancelled = true }
  }, [selectedCompanyId])

  if (!report) return null

  return <DriftReportCard report={report} compact />
}
