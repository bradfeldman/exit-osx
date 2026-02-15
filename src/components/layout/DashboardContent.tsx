'use client'

import { ReactNode } from 'react'
import { useProgression } from '@/contexts/ProgressionContext'
import { useCompany } from '@/contexts/CompanyContext'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TrialBanner } from '@/components/subscription/TrialBanner'
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

  // Normal dashboard layout
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <TrialBanner />
        <Header user={user} />
        <main className="p-6">
          {children}
        </main>
      </div>
      <SessionTimeoutWarning />
      <FeedbackWidget />
    </div>
  )
}
