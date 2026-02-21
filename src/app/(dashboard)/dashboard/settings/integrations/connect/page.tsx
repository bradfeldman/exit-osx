'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/connect-accounting/connect-accounting.module.css'

// TODO: wire to API — submit selected integration + handle OAuth redirect

type IntegrationType = 'quickbooks' | 'xero' | 'csv'

const STEPS = [
  { num: 1, label: 'Company Setup', done: true },
  { num: 2, label: 'Connect Financials', active: true },
  { num: 3, label: 'Take Assessment' },
  { num: 4, label: 'Review Valuation' },
  { num: 5, label: 'Explore Dashboard' },
]

const WHAT_WE_IMPORT = [
  'Profit & Loss Statements',
  'Balance Sheet',
  'Revenue History (3 years)',
  'Cash Flow Statements',
  'Expense Categories',
  'Year-over-Year Trends',
  'EBITDA Calculation',
  'Working Capital',
]

const SECURITY_ITEMS = [
  '256-bit encryption',
  'Read-only OAuth',
  'SOC 2 certified',
  'Never stores credentials',
]

export default function ConnectAccountingPage() {
  const [selected, setSelected] = useState<IntegrationType | null>(null)

  // TODO: wire to API — handle QuickBooks/Xero OAuth + CSV upload
  const handleConnect = () => {
    if (!selected) return
    if (selected === 'quickbooks') {
      console.log('Redirect to QuickBooks OAuth')
    } else if (selected === 'xero') {
      console.log('Redirect to Xero OAuth')
    } else {
      console.log('Open CSV upload modal')
    }
  }

  return (
    <>
      {/* Top nav */}
      <nav className={styles.topNav} aria-label="Onboarding navigation">
        <Link href="/dashboard" className={styles.topNavLogo}>
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#0071E3" />
            <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Exit OSx
        </Link>
        <span className={styles.topNavStep}>Step 2 of 5</span>
      </nav>

      {/* Progress bar */}
      <div className={styles.progressBarTrack} role="progressbar" aria-valuenow={40} aria-valuemin={0} aria-valuemax={100} aria-label="Onboarding progress: step 2 of 5">
        <div className={styles.progressBarFill} style={{ width: '40%' }} />
      </div>

      {/* Main body */}
      <div className={styles.pageBody}>
        {/* Step list sidebar */}
        <aside className={styles.stepListSidebar} aria-label="Onboarding steps">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className={`${styles.stepListItem} ${step.active ? styles.stepListItemActive : ''} ${step.done ? styles.stepListItemDone : ''}`}
            >
              <div
                className={`${styles.stepDot} ${step.active ? styles.stepDotActive : ''} ${step.done ? styles.stepDotDone : ''}`}
                aria-hidden="true"
              >
                {step.done ? (
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6l2.5 2.5L10 3" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>
              <span>{step.label}</span>
            </div>
          ))}
        </aside>

        {/* Main content */}
        <main className={styles.mainContent}>
          <div className={styles.formHeader}>
            <p className={styles.formEyebrow}>Step 2 of 5</p>
            <h1>Connect Your Financials</h1>
            <p>Link your accounting software so Exit OSx can automatically import your financial data and calculate an accurate valuation.</p>
          </div>

          {/* Integration grid */}
          <div
            className={styles.integrationGrid}
            role="radiogroup"
            aria-label="Select your accounting software"
          >
            {/* QuickBooks */}
            <div style={{ position: 'relative' }}>
              <span className={styles.featuredBadge}>Most Popular</span>
              <button
                type="button"
                role="radio"
                aria-checked={selected === 'quickbooks'}
                onClick={() => setSelected('quickbooks')}
                className={`${styles.integrationCard} ${styles.integrationCardFeatured} ${selected === 'quickbooks' ? styles.integrationCardSelected : ''}`}
              >
                <div className={`${styles.intLogoWrap} ${styles.intLogoQb}`} aria-hidden="true">
                  <svg viewBox="0 0 32 32" fill="white" aria-hidden="true">
                    <path d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12 12-5.373 12-12S22.627 4 16 4zm-2 16V12l8 4-8 4z" />
                  </svg>
                </div>
                <div className={styles.intInfo}>
                  <h3>QuickBooks Online</h3>
                  <p>Connect in seconds. Auto-sync P&L, balance sheet, and cash flow.</p>
                </div>
                <div className={styles.intSelectRow}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {selected === 'quickbooks' ? (
                      <>
                        <circle cx="12" cy="12" r="10" fill="var(--accent)" stroke="var(--accent)" />
                        <path d="M9 12l2 2 4-4" stroke="white" />
                      </>
                    ) : (
                      <circle cx="12" cy="12" r="10" />
                    )}
                  </svg>
                  {selected === 'quickbooks' ? 'Selected' : 'Select'}
                </div>
              </button>
            </div>

            {/* Xero */}
            <button
              type="button"
              role="radio"
              aria-checked={selected === 'xero'}
              onClick={() => setSelected('xero')}
              className={`${styles.integrationCard} ${selected === 'xero' ? styles.integrationCardSelected : ''}`}
            >
              <div className={`${styles.intLogoWrap} ${styles.intLogoXero}`} aria-hidden="true">
                <svg viewBox="0 0 32 32" fill="white" aria-hidden="true">
                  <path d="M16 6c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6zm4.5 12.5l-3.5-3.5 3.5-3.5-1-1L16 14l-3.5-3.5-1 1 3.5 3.5-3.5 3.5 1 1L16 16l3.5 3.5 1-1z" />
                </svg>
              </div>
              <div className={styles.intInfo}>
                <h3>Xero</h3>
                <p>Seamless connection for Xero users. Same auto-sync capability.</p>
              </div>
              <div className={styles.intSelectRow}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {selected === 'xero' ? (
                    <>
                      <circle cx="12" cy="12" r="10" fill="var(--accent)" stroke="var(--accent)" />
                      <path d="M9 12l2 2 4-4" stroke="white" />
                    </>
                  ) : (
                    <circle cx="12" cy="12" r="10" />
                  )}
                </svg>
                {selected === 'xero' ? 'Selected' : 'Select'}
              </div>
            </button>

            {/* CSV Upload */}
            <button
              type="button"
              role="radio"
              aria-checked={selected === 'csv'}
              onClick={() => setSelected('csv')}
              className={`${styles.integrationCard} ${selected === 'csv' ? styles.integrationCardSelected : ''}`}
            >
              <div className={`${styles.intLogoWrap} ${styles.intLogoCsv}`} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div className={styles.intInfo}>
                <h3>Upload CSV</h3>
                <p>Manually upload your financial statements. No direct connection required.</p>
              </div>
              <div className={styles.intSelectRow}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {selected === 'csv' ? (
                    <>
                      <circle cx="12" cy="12" r="10" fill="var(--accent)" stroke="var(--accent)" />
                      <path d="M9 12l2 2 4-4" stroke="white" />
                    </>
                  ) : (
                    <circle cx="12" cy="12" r="10" />
                  )}
                </svg>
                {selected === 'csv' ? 'Selected' : 'Select'}
              </div>
            </button>
          </div>

          {/* What we import */}
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>
            What We Import
          </h2>
          <div className={styles.importGrid}>
            {WHAT_WE_IMPORT.map((item) => (
              <div key={item} className={styles.importItem}>
                <div className={styles.importCheckCircle} aria-hidden="true">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6l2.5 2.5L10 3" />
                  </svg>
                </div>
                {item}
              </div>
            ))}
          </div>

          {/* Security notice */}
          <div className={styles.securityNotice} role="note" aria-label="Security information">
            <div className={styles.securityIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className={styles.securityNoticeText}>
              <h3>Bank-grade security</h3>
              <p>Exit OSx uses read-only OAuth connections. We never store your accounting credentials, and you can revoke access at any time from your accounting provider.</p>
              <div className={styles.securityDots}>
                {SECURITY_ITEMS.map((item) => (
                  <span key={item} className={styles.securityDot}>{item}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Skip link */}
          <button
            type="button"
            onClick={() => console.log('Skip step')}
            className={styles.skipLink}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            Skip for now — I'll connect financials later
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </main>
      </div>

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        <Link href="/dashboard/welcome" className={styles.btnBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </Link>
        <p className={styles.bottomBarHelp}>
          Need help? <Link href="/dashboard/help/getting-started/connect-accounting">Read the guide</Link> or <Link href="/dashboard/help/contact">contact support</Link>.
        </p>
        <button
          type="button"
          onClick={handleConnect}
          disabled={!selected}
          className={styles.btnConnect}
          aria-disabled={!selected}
          style={{ opacity: selected ? 1 : 0.5 }}
        >
          {selected === 'csv' ? 'Upload CSV' : selected ? 'Connect & Continue' : 'Select an Option'}
          {selected && selected !== 'csv' && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </button>
      </div>
    </>
  )
}
