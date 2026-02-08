'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useCompany } from './CompanyContext'

interface ProgressionData {
  hasCompany: boolean
  hasAssessment: boolean
  completedTaskCount: number
  hasBusinessFinancials: boolean
  hasDcfValuation: boolean
  hasPersonalFinancials: boolean
  isExitReady: boolean
  briScore: number | null
}

const MILESTONE_REQUIREMENTS: Record<string, { check: (d: ProgressionData) => boolean; hint: string }> = {
  retirementCalculator: {
    check: (d) => !(d.hasDcfValuation && d.hasPersonalFinancials),
    hint: 'Complete DCF valuation and personal financials',
  },
}

interface ProgressionContextType {
  isLoading: boolean
  error: string | null
  progressionData: ProgressionData | null
  hasCompany: boolean
  isProgressionLocked: (featureKey: string) => boolean
  getUnlockHint: (featureKey: string) => string | null
  refetch: () => Promise<void>
}

const ProgressionContext = createContext<ProgressionContextType | undefined>(undefined)

export function ProgressionProvider({ children }: { children: ReactNode }) {
  const [progressionData, setProgressionData] = useState<ProgressionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { selectedCompanyId, companies, isLoading: companiesLoading } = useCompany()

  const loadProgression = useCallback(async () => {
    // Wait for CompanyContext to finish loading before deciding hasCompany.
    // Without this, we see companies=[] while the fetch is in flight and
    // briefly flash the EntryScreen (dark "add company" page).
    if (companiesLoading) return

    // If no company selected and no companies exist, treat as no company
    if (!selectedCompanyId) {
      if (companies.length === 0) {
        setProgressionData({
          hasCompany: false,
          hasAssessment: false,
          completedTaskCount: 0,
          hasBusinessFinancials: false,
          hasDcfValuation: false,
          hasPersonalFinancials: false,
          isExitReady: false,
          briScore: null,
        })
      }
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/progression?companyId=${selectedCompanyId}`)
      if (response.ok) {
        const data = await response.json()
        setProgressionData({
          hasCompany: true,
          ...data,
        })
      } else if (response.status === 401) {
        setProgressionData(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load progression')
      }
    } catch (err) {
      console.error('Failed to load progression:', err)
      setError('Failed to load progression')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId, companies.length, companiesLoading])

  useEffect(() => {
    loadProgression()
  }, [loadProgression])

  const hasCompany = progressionData?.hasCompany ?? false

  // Helper to check if a feature is progression-locked
  const isProgressionLocked = useCallback((featureKey: string): boolean => {
    const requirement = MILESTONE_REQUIREMENTS[featureKey]
    if (!requirement) return false
    if (!progressionData) return true
    return requirement.check(progressionData)
  }, [progressionData])

  // Get unlock hint for a locked feature
  const getUnlockHint = useCallback((featureKey: string): string | null => {
    const requirement = MILESTONE_REQUIREMENTS[featureKey]
    if (!requirement) return null
    if (!progressionData) return requirement.hint
    if (!requirement.check(progressionData)) return null
    return requirement.hint
  }, [progressionData])

  return (
    <ProgressionContext.Provider
      value={{
        isLoading,
        error,
        progressionData,
        hasCompany,
        isProgressionLocked,
        getUnlockHint,
        refetch: loadProgression,
      }}
    >
      {children}
    </ProgressionContext.Provider>
  )
}

export function useProgression() {
  const context = useContext(ProgressionContext)
  if (context === undefined) {
    throw new Error('useProgression must be used within a ProgressionProvider')
  }
  return context
}
