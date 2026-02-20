'use client'

import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react'
import { useCompany } from '@/contexts/CompanyContext'

interface PlaybookProgressState {
  compositeScore: number | null
  completedSections: number
  totalSections: number
  percentComplete: number
  sectionScores: Record<string, number>
}

interface BriFeedback {
  category: string
  bonus: number
  snapshotRecalculated: boolean
  autoCompletedTasks?: number
}

interface PlaybookContextValue {
  /** Sync progress to backend. Called from Focus Mode page on score updates. */
  syncProgress: (
    playbookSlug: string,
    progress: PlaybookProgressState
  ) => Promise<{ briFeedback: BriFeedback | null } | null>
}

const PlaybookCtx = createContext<PlaybookContextValue | null>(null)

export function PlaybookProvider({ children }: { children: ReactNode }) {
  const { selectedCompanyId } = useCompany()
  const syncInFlightRef = useRef<Map<string, AbortController>>(new Map())

  const syncProgress = useCallback(async (
    playbookSlug: string,
    progress: PlaybookProgressState
  ): Promise<{ briFeedback: BriFeedback | null } | null> => {
    if (!selectedCompanyId) return null

    // Abort any in-flight sync for this playbook to prevent race conditions
    const existing = syncInFlightRef.current.get(playbookSlug)
    if (existing) existing.abort()

    const controller = new AbortController()
    syncInFlightRef.current.set(playbookSlug, controller)

    try {
      const res = await fetch('/api/playbook-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbookSlug,
          companyId: selectedCompanyId,
          compositeScore: progress.compositeScore,
          sectionScores: progress.sectionScores,
          completedSections: progress.completedSections,
          totalSections: progress.totalSections,
          percentComplete: progress.percentComplete,
        }),
        signal: controller.signal,
      })

      if (!res.ok) return null
      const data = await res.json()
      return { briFeedback: data.briFeedback ?? null }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('[PlaybookContext] Sync failed:', err)
      return null
    } finally {
      syncInFlightRef.current.delete(playbookSlug)
    }
  }, [selectedCompanyId])

  return (
    <PlaybookCtx.Provider value={{ syncProgress }}>
      {children}
    </PlaybookCtx.Provider>
  )
}

export function usePlaybookSync() {
  const ctx = useContext(PlaybookCtx)
  if (!ctx) throw new Error('usePlaybookSync must be used within PlaybookProvider')
  return ctx
}
