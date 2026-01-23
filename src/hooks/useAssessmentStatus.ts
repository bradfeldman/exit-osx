'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'

interface AssessmentStatus {
  hasInitialAssessment: boolean
  hasPendingAssessment: boolean // Open or available assessment
  pendingAssessmentType?: 'OPEN' | 'AVAILABLE'
  isLoading: boolean
}

export function useAssessmentStatus(): AssessmentStatus {
  const { selectedCompanyId } = useCompany()
  const pathname = usePathname()
  const [hasInitialAssessment, setHasInitialAssessment] = useState(true) // Default to true to avoid flash
  const [hasPendingAssessment, setHasPendingAssessment] = useState(false)
  const [pendingAssessmentType, setPendingAssessmentType] = useState<'OPEN' | 'AVAILABLE' | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAssessmentStatus() {
      if (!selectedCompanyId) {
        setIsLoading(false)
        return
      }

      try {
        // Use the dashboard endpoint which already has hasAssessment flag
        const response = await fetch(`/api/companies/${selectedCompanyId}/dashboard`)
        if (response.ok) {
          const data = await response.json()
          setHasInitialAssessment(data.hasAssessment ?? false)
        }

        // Check for pending assessment alerts
        const alertsResponse = await fetch('/api/alerts')
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json()
          const companyAlerts = alertsData.alerts?.filter(
            (a: { companyId: string }) => a.companyId === selectedCompanyId
          ) || []

          // Check for open or available assessment alerts
          const openAlert = companyAlerts.find(
            (a: { type: string }) => a.type === 'OPEN_ASSESSMENT'
          )
          const availableAlert = companyAlerts.find(
            (a: { type: string }) => a.type === 'ASSESSMENT_AVAILABLE'
          )

          if (openAlert) {
            setHasPendingAssessment(true)
            setPendingAssessmentType('OPEN')
          } else if (availableAlert) {
            setHasPendingAssessment(true)
            setPendingAssessmentType('AVAILABLE')
          } else {
            setHasPendingAssessment(false)
            setPendingAssessmentType(undefined)
          }
        }
      } catch (error) {
        console.error('Failed to check assessment status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAssessmentStatus()
  }, [selectedCompanyId, pathname]) // Re-fetch when route changes

  return { hasInitialAssessment, hasPendingAssessment, pendingAssessmentType, isLoading }
}
