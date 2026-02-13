'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { useCompany } from './CompanyContext'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface ProgressionData {
  // Core milestones (from API)
  hasCompany: boolean
  hasAssessment: boolean           // At least 1 BRI category assessed
  hasFullAssessment: boolean       // All 6 BRI categories assessed
  hasBusinessFinancials: boolean   // At least 1 financial period or evidence doc
  hasDcfValuation: boolean         // Valuation snapshot exists
  hasPersonalFinancials: boolean   // Personal financial statement exists
  hasDealRoom: boolean             // Data room initialized
  isExitReady: boolean             // BRI >= 80
  briScore: number | null
  completedTaskCount: number
  assessedCategoryCount: number    // 0-6, how many of 6 BRI categories assessed
  evidencePercentage: number       // 0-100, percentage of expected evidence uploaded
}

/**
 * MILESTONE_REQUIREMENTS defines feature-level locks based on progression milestones.
 * Each entry maps a featureKey to a check function and a user-facing hint.
 * The check returns TRUE if the feature IS LOCKED (i.e., requirement NOT met).
 */
const MILESTONE_REQUIREMENTS: Record<string, { check: (d: ProgressionData) => boolean; hint: string }> = {
  retirementCalculator: {
    check: (d) => !(d.hasDcfValuation && d.hasPersonalFinancials),
    hint: 'Complete DCF valuation and personal financials',
  },
}

/**
 * Unlock hints for the 5 core navigation modes.
 * These are shown in tooltips when a mode is gated.
 */
const MODE_UNLOCK_HINTS: Record<string, string> = {
  actions: 'Complete at least one assessment category to unlock Actions',
  evidence: 'Complete at least one assessment category to unlock Evidence',
  dealRoom: 'Upload at least 70% of expected evidence documents to unlock Deal Room',
}

interface ProgressionContextType {
  isLoading: boolean
  error: string | null
  progressionData: ProgressionData | null
  hasCompany: boolean

  // Computed navigation gates for the 5 core modes + value modeling
  canAccessValuation: boolean      // hasBusinessFinancials
  canAccessDiagnosis: boolean      // always true (entry point)
  canAccessActions: boolean        // hasAssessment
  canAccessEvidence: boolean       // hasAssessment
  canAccessDealRoom: boolean       // always accessible

  // Feature-level lock checks (for sub-items like retirement calculator)
  isProgressionLocked: (featureKey: string) => boolean
  getUnlockHint: (featureKey: string) => string | null

  // Mode-level lock hints
  getModeUnlockHint: (modeKey: string) => string | null

  refetch: () => Promise<void>
}

const ProgressionContext = createContext<ProgressionContextType | undefined>(undefined)

// --------------------------------------------------------------------------
// Provider
// --------------------------------------------------------------------------

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
          hasFullAssessment: false,
          completedTaskCount: 0,
          hasBusinessFinancials: false,
          hasDcfValuation: false,
          hasPersonalFinancials: false,
          hasDealRoom: false,
          isExitReady: false,
          briScore: null,
          assessedCategoryCount: 0,
          evidencePercentage: 0,
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

  // --------------------------------------------------------------------------
  // Computed navigation gates
  // --------------------------------------------------------------------------
  const canAccessValuation = progressionData?.hasBusinessFinancials ?? false
  const canAccessDiagnosis = true // Always accessible -- this is the entry point
  const canAccessActions = progressionData?.hasAssessment ?? false
  const canAccessEvidence = progressionData?.hasAssessment ?? false
  const canAccessDealRoom = true // Always accessible — no evidence gate

  // --------------------------------------------------------------------------
  // Feature-level lock helpers (for sub-items like retirement calculator)
  // --------------------------------------------------------------------------
  const isProgressionLocked = useCallback((featureKey: string): boolean => {
    const requirement = MILESTONE_REQUIREMENTS[featureKey]
    if (!requirement) return false
    if (!progressionData) return true
    return requirement.check(progressionData)
  }, [progressionData])

  const getUnlockHint = useCallback((featureKey: string): string | null => {
    const requirement = MILESTONE_REQUIREMENTS[featureKey]
    if (!requirement) return null
    if (!progressionData) return requirement.hint
    if (!requirement.check(progressionData)) return null
    return requirement.hint
  }, [progressionData])

  // --------------------------------------------------------------------------
  // Mode-level lock hints (for the 5 core modes)
  // --------------------------------------------------------------------------
  const getModeUnlockHint = useCallback((modeKey: string): string | null => {
    return MODE_UNLOCK_HINTS[modeKey] ?? null
  }, [])

  // --------------------------------------------------------------------------
  // Memoized context value
  // --------------------------------------------------------------------------
  const value = useMemo(() => ({
    isLoading,
    error,
    progressionData,
    hasCompany,
    canAccessValuation,
    canAccessDiagnosis,
    canAccessActions,
    canAccessEvidence,
    canAccessDealRoom,
    isProgressionLocked,
    getUnlockHint,
    getModeUnlockHint,
    refetch: loadProgression,
  }), [
    isLoading,
    error,
    progressionData,
    hasCompany,
    canAccessValuation,
    canAccessDiagnosis,
    canAccessActions,
    canAccessEvidence,
    canAccessDealRoom,
    isProgressionLocked,
    getUnlockHint,
    getModeUnlockHint,
    loadProgression,
  ])

  return (
    <ProgressionContext.Provider value={value}>
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
