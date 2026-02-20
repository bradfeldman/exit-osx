'use client'

import { ReactNode, useState } from 'react'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-[100dvh]" style={{ backgroundColor: 'var(--bg, #F5F5F7)' }}>
      <FocusBar
        playbookId={playbookId}
        playbookTitle={playbookTitle}
        currentSection={currentSection}
        totalSections={sections.length}
        saveStatus={saveStatus}
        referrer={referrer}
        onMenuToggle={() => setMobileMenuOpen(v => !v)}
      />

      <div className="pt-12 flex h-[calc(100dvh-48px)]">
        <PlaybookSidebar
          playbookId={playbookId}
          playbookTitle={playbookTitle}
          sections={sections}
          currentSection={currentSection}
          compositeScore={compositeScore}
          percentComplete={percentComplete}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile section drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[201] bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Playbook sections"
            onKeyDown={(e) => { if (e.key === 'Escape') setMobileMenuOpen(false) }}
            className="fixed inset-x-0 bottom-0 z-[202] bg-white rounded-t-2xl shadow-xl lg:hidden max-h-[75vh] overflow-hidden animate-in slide-in-from-bottom duration-300 pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="overflow-y-auto max-h-[calc(75vh-20px)]">
              <PlaybookSidebar
                playbookId={playbookId}
                playbookTitle={playbookTitle}
                sections={sections}
                currentSection={currentSection}
                compositeScore={compositeScore}
                percentComplete={percentComplete}
                variant="mobile"
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
