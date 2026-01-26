'use client'

import { ReactNode } from 'react'
import { CompanyProvider } from '@/contexts/CompanyContext'
import { UserRoleProvider } from '@/contexts/UserRoleContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TrialBanner } from '@/components/subscription/TrialBanner'
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
          <div className="min-h-screen bg-background">
            <TrialBanner />
            <Sidebar />
            <div className="lg:pl-64">
              <Header user={user} />
              <main className="p-6">
                {children}
              </main>
            </div>
          </div>
        </SubscriptionProvider>
      </UserRoleProvider>
    </CompanyProvider>
  )
}
