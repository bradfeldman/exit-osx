'use client'

import { ReactNode, useState, useCallback } from 'react'
import { useProgression } from '@/contexts/ProgressionContext'
import { useCompany } from '@/contexts/CompanyContext'
import { Sidebar, MobileHeader, DrawerOverlay } from './Sidebar'
import { SessionTimeoutWarning } from '@/components/session/SessionTimeoutWarning'
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget'
import { EntryScreen } from './EntryScreen'
import { DashboardLoadError } from './DashboardLoadError'
import type { User } from '@supabase/supabase-js'

interface DashboardContentProps {
  children: ReactNode
  user: User
}

export function DashboardContent({ children, user }: DashboardContentProps) {
  const { hasCompany, isLoading } = useProgression()
  const { loadError } = useCompany()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // While loading, show a minimal loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Load failed: Show friendly error instead of mistakenly showing EntryScreen
  if (!hasCompany && loadError) {
    return <DashboardLoadError />
  }

  // No company: Show entry screen with no sidebar
  if (!hasCompany) {
    return <EntryScreen />
  }

  // Normal dashboard layout — matches mocksite spec
  return (
    <>
      {/* Mobile header — visible < 1024px */}
      <MobileHeader onMenuToggle={openDrawer} />

      {/* Drawer overlay for mobile */}
      <DrawerOverlay isOpen={drawerOpen} onClose={closeDrawer} />

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <Sidebar user={user} isOpen={drawerOpen} onClose={closeDrawer} />

        {/* Main content — mocksite: margin-left: 260px, padding: 32px 40px, max-width: 1200px */}
        <main
          style={{
            flex: 1,
            marginLeft: 260,
            padding: '32px 40px',
            maxWidth: 1200,
            minHeight: '100vh',
          }}
          className="main-content"
        >
          {children}
        </main>
      </div>

      <SessionTimeoutWarning />
      <FeedbackWidget />

      {/* Responsive override for mobile */}
      <style>{`
        @media (max-width: 1024px) {
          .main-content {
            margin-left: 0 !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </>
  )
}
