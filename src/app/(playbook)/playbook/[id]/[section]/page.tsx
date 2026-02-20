'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlaybookDefinition } from '@/lib/playbook/playbook-registry'
import { FocusModeContent } from '@/components/layout/FocusModeContent'
import { PlaybookUpgradeGate } from '@/components/playbook/PlaybookUpgradeGate'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { canAccessPlaybookSection } from '@/lib/subscriptions/playbook-access'
import { usePlaybookSync } from '@/lib/playbook/PlaybookContext'
import type { PlaybookSection } from '@/components/playbook/PlaybookSidebar'
import styles from '@/components/playbook/playbook.module.css'

interface StoredProgress {
  currentPage: number
  completedSections: number[]
  compositeScore?: number
}

function getStorageKey(slug: string): string {
  return `exitosx-${slug.toLowerCase()}`
}

function loadProgress(slug: string): StoredProgress {
  if (typeof window === 'undefined') return { currentPage: 0, completedSections: [] }
  try {
    const stored = localStorage.getItem(getStorageKey(slug))
    if (!stored) return { currentPage: 0, completedSections: [] }
    return JSON.parse(stored)
  } catch {
    return { currentPage: 0, completedSections: [] }
  }
}

function saveProgress(slug: string, progress: StoredProgress) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getStorageKey(slug), JSON.stringify(progress))
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Focus Mode Page — renders the playbook content in the Focus Mode shell.
 * URL: /playbook/pb-01/0, /playbook/pb-01/1, etc.
 *
 * Playbook HTML is loaded via iframe from /playbooks/{slug}.html?embedded=true&section={N}.
 * The iframe's embedded mode hides the playbook's own sidebar/header and communicates
 * score updates via postMessage.
 */
export default function FocusModePage() {
  const params = useParams<{ id: string; section: string }>()
  const { planTier } = useSubscription()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const playbookId = params.id
  const sectionIndex = parseInt(params.section, 10)

  const definition = getPlaybookDefinition(playbookId)
  if (!definition || isNaN(sectionIndex) || sectionIndex < 0) {
    notFound()
  }

  if (sectionIndex >= definition.phases.length) {
    notFound()
  }

  const [progress, setProgress] = useState<StoredProgress>(() => loadProgress(playbookId))
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle')
  const [celebration, setCelebration] = useState<{ score: number; category: string; bonus: number; autoCompletedTasks: number } | null>(null)
  const { syncProgress } = usePlaybookSync()
  const syncDebounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Check freemium gating
  const canAccess = canAccessPlaybookSection(playbookId, sectionIndex, planTier)

  // Debounced backend sync
  const scheduleBackendSync = useCallback((updatedProgress: StoredProgress) => {
    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current)
    syncDebounceRef.current = setTimeout(async () => {
      const completedArr = updatedProgress.completedSections
      const total = definition.phases.length
      const pct = (completedArr.length / total) * 100

      const result = await syncProgress(playbookId, {
        compositeScore: updatedProgress.compositeScore ?? null,
        completedSections: completedArr.length,
        totalSections: total,
        percentComplete: pct,
        sectionScores: {},
      })

      // Show celebration banner if BRI was boosted
      if (result?.briFeedback) {
        setCelebration({
          score: updatedProgress.compositeScore ?? 0,
          category: result.briFeedback.category,
          bonus: result.briFeedback.bonus,
          autoCompletedTasks: result.briFeedback.autoCompletedTasks ?? 0,
        })
      }
    }, 2000) // 2 second debounce to batch rapid updates
  }, [playbookId, definition.phases.length, syncProgress])

  // Handle postMessage from playbook iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.data || typeof event.data.type !== 'string') return

    if (event.data.type === 'playbook:score-update') {
      const detail = event.data.detail
      let latestProgress: StoredProgress | null = null

      if (detail?.compositeScore != null) {
        setProgress(prev => {
          const updated = { ...prev, compositeScore: detail.compositeScore }
          saveProgress(playbookId, updated)
          latestProgress = updated
          return updated
        })
        setSaveStatus('saving')
        setTimeout(() => setSaveStatus('saved'), 500)
        setTimeout(() => setSaveStatus('idle'), 2500)
      }
      if (detail?.completedSections) {
        setProgress(prev => {
          const updated = {
            ...prev,
            completedSections: detail.completedSections,
            totalSections: detail.totalSections ?? definition.phases.length,
            lastUpdated: new Date().toISOString(),
          }
          saveProgress(playbookId, updated)
          latestProgress = updated
          return updated
        })
      }

      // Sync to backend (debounced)
      if (latestProgress) {
        scheduleBackendSync(latestProgress)
      }
    }

    if (event.data.type === 'playbook:section-change') {
      const detail = event.data.detail
      if (detail?.sectionIndex != null && detail.sectionIndex !== sectionIndex) {
        window.location.href = `/playbook/${playbookId}/${detail.sectionIndex}`
      }
    }
  }, [playbookId, sectionIndex, definition.phases.length, scheduleBackendSync])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  // Update current page in localStorage
  useEffect(() => {
    if (!canAccess) return
    const updated = { ...progress, currentPage: sectionIndex }
    saveProgress(playbookId, updated)
    setProgress(updated)
    setSaveStatus('saved')
    const timer = setTimeout(() => setSaveStatus('idle'), 2000)
    return () => clearTimeout(timer)
    // Only run when section changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbookId, sectionIndex, canAccess])

  // Build section list for sidebar
  const sections: PlaybookSection[] = definition.phases.map((phase, idx) => ({
    title: phase.title,
    order: idx,
    status: progress.completedSections.includes(idx)
      ? 'completed'
      : idx === sectionIndex
        ? 'active'
        : idx <= sectionIndex || progress.completedSections.includes(idx - 1)
          ? 'unlocked'
          : 'locked',
  }))

  const percentComplete = (progress.completedSections.length / definition.phases.length) * 100

  // If locked, show upgrade gate
  if (!canAccess) {
    return (
      <FocusModeContent
        playbookId={playbookId}
        playbookTitle={definition.title}
        sections={sections}
        currentSection={sectionIndex}
        compositeScore={progress.compositeScore ?? null}
        percentComplete={percentComplete}
        referrer={null}
      >
        <PlaybookUpgradeGate playbookTitle={definition.title} />
      </FocusModeContent>
    )
  }

  const iframeSrc = `/playbooks/${playbookId}.html?embedded=true&section=${sectionIndex}`

  return (
    <FocusModeContent
      playbookId={playbookId}
      playbookTitle={definition.title}
      sections={sections}
      currentSection={sectionIndex}
      compositeScore={progress.compositeScore ?? null}
      percentComplete={percentComplete}
      saveStatus={saveStatus}
      referrer={null}
    >
      {/* Completion celebration banner */}
      {celebration && (
        <div className={styles.celebrationBanner}>
          <p className={styles.celebrationTitle}>
            Playbook complete — Score: {celebration.score}/100
          </p>
          <p className={styles.celebrationBody}>
            This score has been shared with your Exit OS dashboard.
            Your {celebration.category.toLowerCase().replace('_', ' ')} readiness improved by +{celebration.bonus} points.
            {celebration.autoCompletedTasks > 0 && (
              <> Also completed {celebration.autoCompletedTasks} related action item{celebration.autoCompletedTasks === 1 ? '' : 's'}.</>
            )}
          </p>
          <Link href="/dashboard/diagnosis" className={styles.celebrationLink}>
            View Impact on Dashboard →
          </Link>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title={`${definition.title} — Section ${sectionIndex + 1}`}
        className={styles.playbookFrame}
        style={{ minHeight: 'calc(100dvh - 120px)' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </FocusModeContent>
  )
}
