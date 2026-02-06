'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const fetchLatest = useCallback(async () => {
    if (!selectedCompanyId) return

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/drift-reports?limit=1`)
      if (!response.ok) return
      const data = await response.json()
      if (data.reports?.length > 0 && !data.reports[0].viewedAt) {
        setReport(data.reports[0])
      }
    } catch {
      // Silent fail — banner is supplementary
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchLatest()
  }, [fetchLatest])

  if (!report) return null

  return <DriftReportCard report={report} compact />
}
