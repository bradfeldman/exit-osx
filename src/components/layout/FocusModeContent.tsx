'use client'

import { ReactNode } from 'react'
import { FocusBar } from './FocusBar'
import { PlaybookSidebar, type PlaybookSection } from '@/components/playbook/PlaybookSidebar'

interface FocusModeContentProps {
  playbookId: string
  playbookTitle: string
  sections: PlaybookSection[]
  currentSection: number
  compositeScore?: number | null
  percentComplete: number
  saveStatus?: 'saved' | 'saving' | 'idle'
  referrer?: string | null
  children: ReactNode
}

/**
 * Layout wrapper for Focus Mode — replaces the standard dashboard
 * Sidebar + Header with FocusBar + PlaybookSidebar.
 */
export function FocusModeContent({
  playbookId,
  playbookTitle,
  sections,
  currentSection,
  compositeScore,
  percentComplete,
  saveStatus,
  referrer,
  children,
}: FocusModeContentProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg, #F5F5F7)' }}>
      <FocusBar
        playbookId={playbookId}
        playbookTitle={playbookTitle}
        currentSection={currentSection}
        totalSections={sections.length}
        saveStatus={saveStatus}
        referrer={referrer}
      />

      <div className="pt-12 flex h-[calc(100vh-48px)]">
        <PlaybookSidebar
          playbookId={playbookId}
          playbookTitle={playbookTitle}
          sections={sections}
          currentSection={currentSection}
          compositeScore={compositeScore}
          percentComplete={percentComplete}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[800px] mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
