'use client'

import { ReactNode } from 'react'
import { AdminSidebar } from './AdminNav'
import { AdminHeader } from './AdminHeader'
import { ImpersonationBanner } from './ImpersonationBanner'

interface AdminLayoutProps {
  children: ReactNode
  user: {
    email: string
    name: string | null
  }
  impersonation?: {
    isImpersonating: boolean
    targetEmail: string
    remainingMinutes: number
  } | null
}

export function AdminLayout({ children, user, impersonation }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="lg:pl-64">
        {impersonation?.isImpersonating && (
          <ImpersonationBanner
            targetEmail={impersonation.targetEmail}
            remainingMinutes={impersonation.remainingMinutes}
          />
        )}
        <AdminHeader user={user} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
