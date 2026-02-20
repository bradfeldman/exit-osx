'use client'

import { ReactNode } from 'react'
import { CompanyProvider } from '@/contexts/CompanyContext'
import { UserRoleProvider } from '@/contexts/UserRoleContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { ProgressionProvider } from '@/contexts/ProgressionContext'
import { ExposureProvider } from '@/contexts/ExposureContext'
import { DashboardContent } from './DashboardContent'
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
              <DashboardContent user={user}>
                {children}
              </DashboardContent>
            </ExposureProvider>
          </ProgressionProvider>
        </SubscriptionProvider>
      </UserRoleProvider>
    </CompanyProvider>
  )
}
