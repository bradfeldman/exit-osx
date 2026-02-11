'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'

type ExposureState = 'LEARNING' | 'VIEWING' | 'ACTING'

interface ExposureContextType {
  exposureState: ExposureState
  isLoading: boolean
  isLearning: boolean
  isViewing: boolean
  isActing: boolean
  completeTour: () => Promise<void>
  startActing: () => Promise<void>
  refetch: () => Promise<void>
}

const ExposureContext = createContext<ExposureContextType | undefined>(undefined)

export function ExposureProvider({ children }: { children: ReactNode }) {
  const [exposureState, setExposureState] = useState<ExposureState>('LEARNING')
  const [isLoading, setIsLoading] = useState(true)

  const loadExposureState = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/exposure-state')
      if (response.ok) {
        const data = await response.json()
        setExposureState(data.exposureState)
      }
    } catch (err) {
      console.error('Failed to load exposure state:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadExposureState()
  }, [loadExposureState])

  const completeTour = useCallback(async () => {
    try {
      const response = await fetch('/api/user/exposure-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exposureState: 'VIEWING' }),
      })
      if (response.ok) {
        setExposureState('VIEWING')
      }
    } catch (err) {
      console.error('Failed to update exposure state:', err)
    }
  }, [])

  const startActing = useCallback(async () => {
    try {
      const response = await fetch('/api/user/exposure-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exposureState: 'ACTING' }),
      })
      if (response.ok) {
        setExposureState('ACTING')
      }
    } catch (err) {
      console.error('Failed to update exposure state:', err)
    }
  }, [])

  const isLearning = exposureState === 'LEARNING'
  const isViewing = exposureState === 'VIEWING'
  const isActing = exposureState === 'ACTING'

  const value = useMemo(
    () => ({
      exposureState,
      isLoading,
      isLearning,
      isViewing,
      isActing,
      completeTour,
      startActing,
      refetch: loadExposureState,
    }),
    [exposureState, isLoading, isLearning, isViewing, isActing, completeTour, startActing, loadExposureState]
  )

  return <ExposureContext.Provider value={value}>{children}</ExposureContext.Provider>
}

export function useExposure() {
  const context = useContext(ExposureContext)
  if (context === undefined) {
    throw new Error('useExposure must be used within an ExposureProvider')
  }
  return context
}
