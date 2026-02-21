'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CompanySettings } from '@/components/settings/CompanySettings'
import { WorkspaceSettings } from '@/components/settings/WorkspaceSettings'
import { BillingSettings } from '@/components/settings/BillingSettings'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from './settings.module.css'

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'company', label: 'Company' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'subscription', label: 'Subscription' },
  { key: 'team', label: 'Team' },
] as const

type SettingsTab = typeof TABS[number]['key']
const VALID_KEYS = TABS.map((t) => t.key)
function isValidTab(tab: string | null): tab is SettingsTab {
  return VALID_KEYS.includes(tab as SettingsTab)
}

/* ── Notification preference state ── */
const DEFAULT_NOTIFICATIONS = {
  weeklyReport: true,
  signalAlerts: true,
  taskReminders: true,
  buyerActivity: true,
  financialSync: false,
  marketing: false,
}

/* ── Profile Tab ── */
function ProfileTab() {
  return (
    <>
      {/* Personal Information */}
      <div className={styles.settingsSection}>
        <h2>Personal Information</h2>
        <div className={styles.sectionDesc}>Update your photo and personal details</div>

        <div className={styles.avatarUpload}>
          <div className={styles.avatarLarge}>
            {/* TODO: render user initials from useUserRole */}
            MR
          </div>
          <div className={styles.avatarActions}>
            <button className={styles.btnSecondarySmall}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Photo
            </button>
            <div className={styles.infoHint}>JPG, PNG or GIF. Max 2 MB.</div>
          </div>
        </div>

        {/* TODO: wire to useUserRole / user update API */}
        <div className={styles.formRow2}>
          <div className={styles.formGroupSpaced}>
            <label className={styles.formLabel}>First Name</label>
            <input type="text" className={styles.formInput} defaultValue="" placeholder="First name" />
          </div>
          <div className={styles.formGroupSpaced}>
            <label className={styles.formLabel}>Last Name</label>
            <input type="text" className={styles.formInput} defaultValue="" placeholder="Last name" />
          </div>
        </div>
        <div className={styles.formRow2}>
          <div className={styles.formGroupSpaced}>
            <label className={styles.formLabel}>Email Address</label>
            <input type="email" className={styles.formInput} defaultValue="" placeholder="you@company.com" />
          </div>
          <div className={styles.formGroupSpaced}>
            <label className={styles.formLabel}>Phone Number</label>
            <input type="tel" className={styles.formInput} defaultValue="" placeholder="(555) 000-0000" />
          </div>
        </div>
        <div className={styles.formGroupSpaced}>
          <label className={styles.formLabel}>Role / Title</label>
          <input type="text" className={styles.formInput} defaultValue="" placeholder="Owner & CEO" />
        </div>

        <div className={styles.formActions}>
          <button className={styles.btnSecondary}>Cancel</button>
          <button className={styles.btnPrimary}>Save Changes</button>
        </div>
      </div>

      {/* Security */}
      <div className={styles.settingsSection}>
        <h2>Security</h2>
        <div className={styles.sectionDesc}>Manage your password and account security</div>

        <SecurityToggleRow
          label="Two-Factor Authentication"
          desc="Add an extra layer of security to your account"
          defaultOn
        />
        <SecurityToggleRow
          label="Login Notifications"
          desc="Get notified when a new device logs into your account"
          defaultOn
        />

        <div style={{ marginTop: '16px' }}>
          <button className={styles.btnSecondary}>Change Password</button>
        </div>
      </div>
    </>
  )
}

/* ── Reusable toggle row for notifications / security ── */
function SecurityToggleRow({ label, desc, defaultOn }: { label: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn ?? false)
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleInfo}>
        <div className={styles.toggleLabel}>{label}</div>
        <div className={styles.toggleDesc}>{desc}</div>
      </div>
      <button
        className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
        onClick={() => setOn((v) => !v)}
        aria-label={`Toggle ${label}`}
        aria-pressed={on}
      />
    </div>
  )
}

/* ── Notifications Tab ── */
function NotificationsTab() {
  const [prefs, setPrefs] = useState(DEFAULT_NOTIFICATIONS)
  const toggle = (key: keyof typeof prefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }))

  const rows: Array<{ key: keyof typeof prefs; label: string; desc: string }> = [
    { key: 'weeklyReport', label: 'Weekly Progress Report', desc: 'Summary of your exit readiness score changes and completed tasks' },
    { key: 'signalAlerts', label: 'Signal Alerts', desc: 'Get notified when new business signals are detected' },
    { key: 'taskReminders', label: 'Task Reminders', desc: 'Reminders for overdue or upcoming action items' },
    { key: 'buyerActivity', label: 'Buyer Activity', desc: 'Notifications when buyers view your data room or send messages' },
    { key: 'financialSync', label: 'Financial Sync Updates', desc: 'Alerts when new financial data is synced from QuickBooks' },
    { key: 'marketing', label: 'Marketing & Product Updates', desc: 'News about new features and Exit OSx product updates' },
  ]

  return (
    <div className={styles.settingsSection}>
      <h2>Notification Preferences</h2>
      <div className={styles.sectionDesc}>Choose what you want to be notified about</div>

      {rows.map((row) => (
        <div key={row.key} className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <div className={styles.toggleLabel}>{row.label}</div>
            <div className={styles.toggleDesc}>{row.desc}</div>
          </div>
          <button
            className={`${styles.toggle} ${prefs[row.key] ? styles.toggleOn : ''}`}
            onClick={() => toggle(row.key)}
            aria-label={`Toggle ${row.label}`}
            aria-pressed={prefs[row.key]}
          />
        </div>
      ))}
    </div>
  )
}

/* ── Integrations Tab ── */
function IntegrationsTab() {
  const integrations = [
    {
      name: 'QuickBooks Online',
      status: 'Connected',
      statusDesc: 'Last synced: recently',
      iconColor: 'var(--green-light)',
      iconFg: 'var(--green)',
      connected: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      name: 'Google Workspace',
      status: 'Connected',
      statusDesc: 'Syncing calendar and contacts',
      iconColor: 'var(--accent-light)',
      iconFg: 'var(--accent)',
      connected: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
    },
    {
      name: 'Xero',
      status: 'Not Connected',
      statusDesc: 'Alternative accounting integration',
      iconColor: 'var(--orange-light)',
      iconFg: 'var(--orange)',
      connected: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      name: 'Slack',
      status: 'Not Connected',
      statusDesc: 'Get Exit OSx notifications in Slack',
      iconColor: 'var(--purple-light)',
      iconFg: 'var(--purple)',
      connected: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      ),
    },
  ]

  return (
    <div className={styles.settingsSection}>
      <h2>Connected Integrations</h2>
      <div className={styles.sectionDesc}>Manage your connected accounts and data sources</div>

      {integrations.map((integration) => (
        <div key={integration.name} className={styles.integrationCard}>
          <div
            className={styles.integrationIcon}
            style={{ background: integration.iconColor, color: integration.iconFg }}
          >
            {integration.icon}
          </div>
          <div className={styles.integrationInfo}>
            <div className={styles.integrationName}>{integration.name}</div>
            <div className={styles.integrationStatus}>{integration.statusDesc}</div>
          </div>
          <span className={`${styles.statusPill} ${integration.connected ? styles.statusConnected : styles.statusDisconnected}`}>
            <span className={`${styles.statusDot} ${integration.connected ? styles.statusDotConnected : styles.statusDotDisconnected}`} />
            {integration.status}
          </span>
          {integration.connected ? (
            <button className={styles.btnSecondarySmall}>Manage</button>
          ) : (
            <button className={styles.btnPrimary} style={{ fontSize: '13px', padding: '7px 14px', minHeight: 'auto' }}>
              Connect
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Subscription Tab ── */
function SubscriptionTab() {
  return (
    <Suspense fallback={
      <div className={styles.loadingCenter}>
        <div className={styles.spinner} />
      </div>
    }>
      <BillingSettings />
    </Suspense>
  )
}

/* ── Main SettingsPage ── */
export function SettingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab')
  const activeTab = isValidTab(tabParam) ? tabParam : 'profile'

  const handleTabChange = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', key)
    router.replace(`/dashboard/settings?${params.toString()}`, { scroll: false })
  }

  return (
    <>
      <TrackPageView page="settings" />

      <div className={styles.page}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <h1>Settings</h1>
          <p>Manage your account, company, and application preferences</p>
        </div>

        {/* Tab Bar */}
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

        {/* Tab Content */}
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'company' && <CompanySettings />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'subscription' && <SubscriptionTab />}
        {activeTab === 'team' && <WorkspaceSettings />}

        {/* Danger Zone — always visible at bottom */}
        {(activeTab === 'profile' || activeTab === 'company') && (
          <div className={styles.dangerSection}>
            <h2>Danger Zone</h2>
            <div className={styles.sectionDesc}>Irreversible and destructive actions</div>

            <div className={styles.dangerRow}>
              <div>
                <div className={styles.dangerRowLabel}>Export All Data</div>
                <div className={styles.dangerRowDesc}>Download a copy of all your data, documents, and reports</div>
              </div>
              <button className={styles.btnSecondarySmall}>Export</button>
            </div>
            <div className={styles.dangerRow}>
              <div>
                <div className={styles.dangerRowLabel}>Delete Account</div>
                <div className={styles.dangerRowDesc}>Permanently delete your account and all associated data</div>
              </div>
              <button className={styles.btnDanger}>Delete Account</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
