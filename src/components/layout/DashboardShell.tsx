'use client'

import { ReactNode } from 'react'
import { CompanyProvider } from '@/contexts/CompanyContext'
import { UserRoleProvider } from '@/contexts/UserRoleContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { ProgressionProvider } from '@/contexts/ProgressionContext'
import { ExitCoachProvider } from '@/contexts/ExitCoachContext'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TrialBanner } from '@/components/subscription/TrialBanner'
import { DashboardContent } from './DashboardContent'
import { ExitCoachDrawer } from '@/components/ai-coach/ExitCoachDrawer'
import type { User } from '@supabase/supabase-js'

interface DashboardShellProps {
  children: ReactNode
  user: User
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  return (
    <CompanyProvider>
      <UserRoleProvider>
        <SubscriptionProvider>
          <ProgressionProvider>
            <ExitCoachProvider>
              <DashboardContent user={user}>
                {children}
              </DashboardContent>
              <ExitCoachDrawer />
            </ExitCoachProvider>
          </ProgressionProvider>
        </SubscriptionProvider>
      </UserRoleProvider>
    </CompanyProvider>
  )
}
