'use client'

import { ReactNode } from 'react'
import { CompanyProvider } from '@/contexts/CompanyContext'
import { UserRoleProvider } from '@/contexts/UserRoleContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { ProgressionProvider } from '@/contexts/ProgressionContext'
import { ExitCoachProvider } from '@/contexts/ExitCoachContext'
import { ExposureProvider } from '@/contexts/ExposureContext'
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
            <ExposureProvider>
              <ExitCoachProvider>
                <DashboardContent user={user}>
                  {children}
                </DashboardContent>
                <ExitCoachDrawer />
              </ExitCoachProvider>
            </ExposureProvider>
          </ProgressionProvider>
        </SubscriptionProvider>
      </UserRoleProvider>
    </CompanyProvider>
  )
}
