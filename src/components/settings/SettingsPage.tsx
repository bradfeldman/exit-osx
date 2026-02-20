'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { WorkspaceSettings } from '@/components/settings/WorkspaceSettings'
import { BillingSettings } from '@/components/settings/BillingSettings'
import { CompanySettings } from '@/components/settings/CompanySettings'
import { UserSettings } from '@/components/settings/UserSettings'
import styles from './settings.module.css'

const TABS = [
  { key: 'company', label: 'Company' },
  { key: 'account', label: 'Account' },
  { key: 'team', label: 'Team' },
  { key: 'billing', label: 'Billing' },
] as const

type SettingsTab = typeof TABS[number]['key']

const VALID_KEYS = TABS.map(t => t.key)

function isValidTab(tab: string | null): tab is SettingsTab {
  return VALID_KEYS.includes(tab as SettingsTab)
}

export function SettingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab')
  const activeTab = isValidTab(tabParam) ? tabParam : 'company'

  const handleTabChange = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', key)
    router.replace(`/dashboard/settings?${params.toString()}`, { scroll: false })
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Settings</h1>
        <p>Manage your company, account, team, and billing</p>
      </div>

      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'company' && <CompanySettings />}
      {activeTab === 'account' && <UserSettings />}
      {activeTab === 'team' && <WorkspaceSettings />}
      {activeTab === 'billing' && (
        <Suspense fallback={
          <div className={styles.loadingCenter}>
            <div className={styles.spinner} />
          </div>
        }>
          <BillingSettings />
        </Suspense>
      )}
    </div>
  )
}
