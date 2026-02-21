'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/components/changelog/changelog.module.css'

// TODO: wire to API — fetch changelog entries

type EntryType = 'new' | 'improved' | 'fixed' | 'launch'

interface ChangelogEntry {
  type: EntryType
  title: string
  desc: string
}

interface MonthGroup {
  id: string
  label: string
  entries: ChangelogEntry[]
  count: number
}

const CHANGELOG_DATA: MonthGroup[] = [
  {
    id: 'feb-2026',
    label: 'February 2026',
    count: 8,
    entries: [
      { type: 'new', title: 'Playbook Recommendation Engine', desc: 'Exit OSx now automatically recommends the most impactful playbooks based on your BRI score, valuation gaps, and business profile. No more guessing where to start.' },
      { type: 'new', title: 'Valuation Engine V2 — Three-Score Model', desc: 'Introduced Business Quality Score (BQS), Deal Readiness Score (DRS), and Risk & Stability Score (RSS) to power more accurate, nuanced valuations.' },
      { type: 'improved', title: 'Streamlined Onboarding Flow', desc: 'Reduced onboarding from 6 steps to 4, eliminating redundant data entry. Average completion time is now under 5 minutes.' },
      { type: 'improved', title: 'Virtual Data Room Overhaul', desc: 'Added sidebar category navigation, sortable table view, search, and download tracking. Now mobile-responsive with a collapsible sidebar.' },
      { type: 'new', title: 'Action Center Delegate Banner', desc: 'When you\'re in a delegated task, a clear banner shows who delegated it and context about the assignment.' },
      { type: 'fixed', title: 'Contacts Page Refresh Bug', desc: 'Editing a deal participant no longer triggers a full page refresh, preserving scroll position.' },
      { type: 'improved', title: 'Pipeline Drag-and-Drop', desc: 'Native HTML5 drag-and-drop for moving buyers between deal stages, with keyboard accessibility (M key) and toast feedback.' },
      { type: 'fixed', title: 'Valuation History Chart Y-axis', desc: 'Fixed an issue where the history chart would show incorrect y-axis gridlines for companies with values above $10M.' },
    ],
  },
  {
    id: 'jan-2026',
    label: 'January 2026',
    count: 7,
    entries: [
      { type: 'new', title: 'AI Coach — Full Conversation Mode', desc: 'The AI Exit Coach can now maintain full conversations across sessions, with memory of your business context and past questions.' },
      { type: 'improved', title: 'BRI Score Visualization', desc: 'New gauge visualization shows your BRI score across four zones (Critical, Developing, Strong, Excellent) with animated transitions.' },
      { type: 'new', title: 'Personal Financial Statement', desc: 'Added the PFS wizard to calculate your net worth and prepare for SBA loan applications and buyer due diligence.' },
      { type: 'improved', title: 'Signals Drift Detection', desc: 'Drift cards now show live data comparisons between current and previous periods with automated change detection.' },
      { type: 'fixed', title: 'Multiple Range Slider Edge Cases', desc: 'Fixed positioning issue when dragging the multiple slider to extreme low or high values outside industry bounds.' },
      { type: 'improved', title: 'Retirement Calculator', desc: 'Added retirement age slider, inflation adjustments, and Social Security income modeling to the retirement planning module.' },
      { type: 'new', title: 'Value Ledger', desc: 'Track every improvement, assessment, and strategic action that impacts your business valuation over time.' },
    ],
  },
  {
    id: 'dec-2025',
    label: 'December 2025',
    count: 6,
    entries: [
      { type: 'improved', title: 'Comparable Companies Analysis', desc: 'Improved filtering, range gauge visualization, and transaction table for the Comparables valuation method.' },
      { type: 'new', title: 'Progression System', desc: 'Introduced the 8-stage progression system that gates advanced features until you\'ve completed prerequisite steps.' },
      { type: 'fixed', title: 'Dark Mode Contrast Issues', desc: 'Fixed multiple contrast and readability issues in dark mode across the dashboard, settings, and deal room.' },
      { type: 'improved', title: 'Financials Page Performance', desc: 'Reduced initial load time by 40% through lazy loading of chart components and optimized API batching.' },
      { type: 'new', title: 'Exposure System — Learn → See → Act', desc: 'New users now follow a gradual exposure journey that introduces features progressively rather than all at once.' },
      { type: 'improved', title: 'Touch Targets', desc: 'All interactive elements now meet WCAG 2.1 AAA minimum 44px touch targets, improving mobile usability.' },
    ],
  },
  {
    id: 'nov-2025',
    label: 'November 2025 — Launch',
    count: 5,
    entries: [
      { type: 'launch', title: 'Exit OSx — Public Launch', desc: 'Exit OSx officially launches with the Foundation plan (free), Growth ($149/mo), and Exit-Ready ($379/mo) tiers.' },
      { type: 'launch', title: 'Core Valuation Engine', desc: 'Three-method valuation engine (Multiples, DCF, Comparables) with industry benchmarks for 200+ verticals.' },
      { type: 'launch', title: 'Exit Readiness Assessment', desc: '8-question QuickScan + 23-question DeepDive assessment that generates your Business Readiness Index score.' },
      { type: 'launch', title: 'Deal Room & Buyer Pipeline', desc: '6-stage visual buyer pipeline with NDA tracking, document sharing, and activity logging.' },
      { type: 'launch', title: '44 Exit Playbooks', desc: 'Library of 44 expert-curated playbooks covering financial cleanup, operational improvements, and exit preparation.' },
    ],
  },
]

const ENTRY_TYPE_ICONS: Record<EntryType, React.ReactNode> = {
  new: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  ),
  improved: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 8 8 3 13 8" />
      <line x1="8" y1="3" x2="8" y2="13" />
    </svg>
  ),
  fixed: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l-1.5 1.5a3 3 0 010 4.24l-6 6-2.24-2.24 6-6a3 3 0 014.24 0L14 4" />
    </svg>
  ),
  launch: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L2 7l4 2 2 4 5-11z" />
    </svg>
  ),
}

const ENTRY_TYPE_CLASSES: Record<EntryType, string> = {
  new: styles.entryIconNew,
  improved: styles.entryIconImproved,
  fixed: styles.entryIconFixed,
  launch: styles.entryIconLaunch,
}

const TAG_CLASSES: Record<EntryType, string> = {
  new: styles.tagNew,
  improved: styles.tagImproved,
  fixed: styles.tagFixed,
  launch: styles.tagLaunch,
}

export default function ChangelogPage() {
  const [email, setEmail] = useState('')

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: wire to API — subscribe to changelog notifications
    console.log('Subscribe:', email)
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/dashboard/help">Help</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>What&apos;s New</span>
      </nav>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>What&apos;s New</h1>
          <p>Latest updates, improvements, and new features in Exit OSx.</p>
        </div>
      </div>

      <div className={styles.contentLayout}>
        {/* Main changelog column */}
        <main>
          <div className={styles.changelog}>
            {CHANGELOG_DATA.map((month) => (
              <section
                key={month.id}
                id={month.id}
                className={styles.monthGroup}
                aria-label={month.label}
              >
                <h2 className={styles.monthHeading}>{month.label}</h2>
                {month.entries.map((entry, i) => (
                  <div key={i} className={styles.entry}>
                    <div className={`${styles.entryIcon} ${ENTRY_TYPE_CLASSES[entry.type]}`} aria-hidden="true">
                      {ENTRY_TYPE_ICONS[entry.type]}
                    </div>
                    <div className={styles.entryBody}>
                      <div className={styles.entryTop}>
                        <span className={`${styles.entryTag} ${TAG_CLASSES[entry.type]}`}>
                          {entry.type}
                        </span>
                        <span className={styles.entryTitle}>{entry.title}</span>
                      </div>
                      <p className={styles.entryDesc}>{entry.desc}</p>
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </main>

        {/* Sidebar */}
        <aside>
          <div className={styles.sidebarPanel}>
            {/* Subscribe card */}
            <div className={styles.panelCard}>
              <h3 className={styles.panelTitle}>Stay Updated</h3>
              <p className={styles.panelSubtitle}>Get notified when we ship new features and improvements.</p>
              <form onSubmit={handleSubscribe}>
                <input
                  type="email"
                  className={styles.subscribeInput}
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email address for changelog updates"
                  required
                />
                <button type="submit" className={styles.subscribeBtn}>
                  Subscribe to Updates
                </button>
              </form>
              <p className={styles.subscribeNote}>No spam. Unsubscribe anytime.</p>
            </div>

            {/* Jump to month */}
            <div className={styles.panelCard}>
              <h3 className={styles.panelTitle}>Jump To</h3>
              <nav className={styles.jumpLinks} aria-label="Jump to month">
                {CHANGELOG_DATA.map((month) => (
                  <a
                    key={month.id}
                    href={`#${month.id}`}
                    className={styles.jumpLink}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className={styles.jumpLinkMonth}>{month.label}</span>
                    <span className={styles.jumpLinkCount}>{month.count}</span>
                  </a>
                ))}
              </nav>
            </div>

            {/* Tag legend */}
            <div className={styles.panelCard}>
              <h3 className={styles.panelTitle}>Tag Legend</h3>
              <div className={styles.legend}>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.dotNew}`} aria-hidden="true" />
                  New — brand new feature
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.dotImproved}`} aria-hidden="true" />
                  Improved — enhancement to existing
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.dotFixed}`} aria-hidden="true" />
                  Fixed — bug or issue resolved
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.dotLaunch}`} aria-hidden="true" />
                  Launch — major milestone
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
