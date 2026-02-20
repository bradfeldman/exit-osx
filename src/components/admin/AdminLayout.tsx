'use client'

import { ReactNode } from 'react'
import { AdminSidebar } from './AdminNav'
import { AdminHeader } from './AdminHeader'
import { ImpersonationBanner } from './ImpersonationBanner'
import styles from '@/components/admin/admin.module.css'

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
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <div className={styles.adminContent}>
        {impersonation?.isImpersonating && (
          <ImpersonationBanner
            targetEmail={impersonation.targetEmail}
            remainingMinutes={impersonation.remainingMinutes}
          />
        )}
        <AdminHeader user={user} />
        <main className={styles.adminMain}>
          {children}
        </main>
      </div>
    </div>
  )
}
