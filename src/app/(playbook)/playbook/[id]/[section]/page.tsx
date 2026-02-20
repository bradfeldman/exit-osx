'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { notFound } from 'next/navigation'
import { getPlaybookDefinition } from '@/lib/playbook/playbook-registry'
import { FocusModeContent } from '@/components/layout/FocusModeContent'
import { PlaybookUpgradeGate } from '@/components/playbook/PlaybookUpgradeGate'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { canAccessPlaybookSection } from '@/lib/subscriptions/playbook-access'
import type { PlaybookSection } from '@/components/playbook/PlaybookSidebar'

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

  // Check freemium gating
  const canAccess = canAccessPlaybookSection(playbookId, sectionIndex, planTier)

  // Handle postMessage from playbook iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.data || typeof event.data.type !== 'string') return

    if (event.data.type === 'playbook:score-update') {
      const detail = event.data.detail
      if (detail?.compositeScore != null) {
        setProgress(prev => {
          const updated = { ...prev, compositeScore: detail.compositeScore }
          saveProgress(playbookId, updated)
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
          return updated
        })
      }
    }

    if (event.data.type === 'playbook:section-change') {
      const detail = event.data.detail
      if (detail?.sectionIndex != null && detail.sectionIndex !== sectionIndex) {
        window.location.href = `/playbook/${playbookId}/${detail.sectionIndex}`
      }
    }
  }, [playbookId, sectionIndex, definition.phases.length])

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
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title={`${definition.title} — Section ${sectionIndex + 1}`}
        className="w-full border-0"
        style={{ minHeight: 'calc(100vh - 120px)' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </FocusModeContent>
  )
}
