'use client'

import { ReactNode } from 'react'
import { CompanyProvider } from '@/contexts/CompanyContext'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { User } from '@supabase/supabase-js'

interface DashboardShellProps {
  children: ReactNode
  user: User
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  return (
    <CompanyProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64">
          <Header user={user} />
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </CompanyProvider>
  )
}
