'use client'

import { ReactNode } from 'react'
import { CompanyProvider } from '@/contexts/CompanyContext'
import { UserRoleProvider } from '@/contexts/UserRoleContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { ProgressionProvider } from '@/contexts/ProgressionContext'
import { PlaybookProvider } from '@/lib/playbook/PlaybookContext'
import type { User } from '@supabase/supabase-js'

interface PlaybookShellProps {
  children: ReactNode
  user: User
}

/**
 * Provides the same context providers as DashboardShell
 * but without the dashboard chrome (Sidebar, Header, BottomTabBar).
 * Used for Focus Mode and Playbook Detail pages.
 */
export function PlaybookShell({ children }: PlaybookShellProps) {
  return (
    <CompanyProvider>
      <UserRoleProvider>
        <SubscriptionProvider>
          <ProgressionProvider>
            <PlaybookProvider>
              {children}
            </PlaybookProvider>
          </ProgressionProvider>
        </SubscriptionProvider>
      </UserRoleProvider>
    </CompanyProvider>
  )
}
