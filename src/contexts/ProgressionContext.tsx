'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { useCompany } from './CompanyContext'
import { toast } from 'sonner'

// Stage definitions
const STAGE_NAMES: Record<number, string> = {
  0: 'Entry',
  1: 'Value Discovered',
  2: 'Data Entry',
  3: 'First Win',
  4: 'Financial Depth',
  5: 'Personal + Future',
  6: 'Capital Options',
  7: 'Exit Tools',
}

// What each feature requires to unlock
const UNLOCK_REQUIREMENTS: Record<string, { stage: number; action: string }> = {
  valueBuilder: { stage: 1, action: 'Complete the Quick Scan' },
  buyerView: { stage: 3, action: 'Complete your first task' },
  progress: { stage: 3, action: 'Complete your first task' },
  valueModeling: { stage: 4, action: 'Upload business financials' },
  retirementCalculator: { stage: 5, action: 'Complete DCF valuation and personal financials' },
  capitalOptions: { stage: 6, action: 'Verify business and personal financials' },
  exitTools: { stage: 7, action: 'Reach Exit-Ready status' },
}

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

interface ProgressionUnlocks {
  valueBuilder: boolean
  buyerView: boolean
  progress: boolean
  valueModeling: boolean
  retirementCalculator: boolean
  capitalOptions: boolean
  exitTools: boolean
}

interface NextUnlock {
  feature: string
  featureDisplayName: string
  action: string
}

interface ProgressionContextType {
  stage: number
  stageName: string
  isLoading: boolean
  error: string | null
  unlocks: ProgressionUnlocks
  nextUnlock: NextUnlock | null
  // Raw progression data for debugging/display
  progressionData: ProgressionData | null
  // Helper to check if a specific feature is progression-locked
  isProgressionLocked: (featureKey: string) => boolean
  // Get unlock hint for a locked feature
  getUnlockHint: (featureKey: string) => string | null
  // Refetch progression data
  refetch: () => Promise<void>
}

const ProgressionContext = createContext<ProgressionContextType | undefined>(undefined)

function computeStage(data: ProgressionData): number {
  if (!data.hasCompany) return 0
  if (!data.hasAssessment) return 0
  if (data.isExitReady) return 7
  if (data.hasBusinessFinancials && data.hasPersonalFinancials) return 6
  if (data.hasDcfValuation && data.hasPersonalFinancials) return 5
  if (data.hasBusinessFinancials) return 4
  if (data.completedTaskCount >= 1) return 3
  // Stages 1 and 2 are the same nav-wise, just different content states
  return 1
}

function computeUnlocks(stage: number): ProgressionUnlocks {
  return {
    valueBuilder: stage >= 1,
    buyerView: stage >= 3,
    progress: stage >= 3,
    valueModeling: stage >= 4,
    retirementCalculator: stage >= 5,
    capitalOptions: stage >= 6,
    exitTools: stage >= 7,
  }
}

function computeNextUnlock(stage: number): NextUnlock | null {
  const featureDisplayNames: Record<string, string> = {
    valueBuilder: 'Value Builder',
    buyerView: 'Buyer View',
    progress: 'Progress',
    valueModeling: 'Value Modeling',
    retirementCalculator: 'Retirement Calculator',
    capitalOptions: 'Capital Options',
    exitTools: 'Exit Tools',
  }

  // Find the first feature that's not yet unlocked
  for (const [feature, requirement] of Object.entries(UNLOCK_REQUIREMENTS)) {
    if (stage < requirement.stage) {
      return {
        feature,
        featureDisplayName: featureDisplayNames[feature] || feature,
        action: requirement.action,
      }
    }
  }
  return null
}

export function ProgressionProvider({ children }: { children: ReactNode }) {
  const [progressionData, setProgressionData] = useState<ProgressionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { selectedCompanyId, companies } = useCompany()
  const previousStageRef = useRef<number | null>(null)

  const loadProgression = useCallback(async () => {
    // If no company selected and no companies exist, treat as stage 0
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
  }, [selectedCompanyId, companies.length])

  useEffect(() => {
    loadProgression()
  }, [loadProgression])

  // Compute stage from data
  const stage = progressionData ? computeStage(progressionData) : 0
  const stageName = STAGE_NAMES[stage] || 'Unknown'
  const unlocks = computeUnlocks(stage)
  const nextUnlock = computeNextUnlock(stage)

  // Show toast notification when stage increases
  useEffect(() => {
    if (previousStageRef.current !== null && stage > previousStageRef.current) {
      // Stage increased - show unlock notification
      const newUnlocks: string[] = []
      const prevUnlocks = computeUnlocks(previousStageRef.current)
      const currentUnlocks = computeUnlocks(stage)

      const featureDisplayNames: Record<string, string> = {
        valueBuilder: 'Value Builder',
        buyerView: 'Buyer View',
        progress: 'Progress',
        valueModeling: 'Value Modeling',
        retirementCalculator: 'Retirement Calculator',
        capitalOptions: 'Capital Options',
        exitTools: 'Exit Tools',
      }

      for (const [feature, isUnlocked] of Object.entries(currentUnlocks)) {
        if (isUnlocked && !prevUnlocks[feature as keyof ProgressionUnlocks]) {
          newUnlocks.push(featureDisplayNames[feature] || feature)
        }
      }

      if (newUnlocks.length > 0) {
        toast.success(`${newUnlocks.join(', ')} unlocked!`, {
          duration: 5000,
        })
      }
    }
    previousStageRef.current = stage
  }, [stage])

  // Helper to check if a feature is progression-locked
  const isProgressionLocked = useCallback((featureKey: string): boolean => {
    const requirement = UNLOCK_REQUIREMENTS[featureKey]
    if (!requirement) return false
    return stage < requirement.stage
  }, [stage])

  // Get unlock hint for a locked feature
  const getUnlockHint = useCallback((featureKey: string): string | null => {
    const requirement = UNLOCK_REQUIREMENTS[featureKey]
    if (!requirement) return null
    if (stage >= requirement.stage) return null
    return requirement.action
  }, [stage])

  return (
    <ProgressionContext.Provider
      value={{
        stage,
        stageName,
        isLoading,
        error,
        unlocks,
        nextUnlock,
        progressionData,
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
