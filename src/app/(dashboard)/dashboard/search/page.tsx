'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import styles from '@/components/search/search.module.css'

// ─── Types ───────────────────────────────────────────────────────────────────

type ResultType = 'signal' | 'task' | 'page' | 'report' | 'help' | 'playbook'

interface SearchResult {
  id: number
  type: ResultType
  title: string
  date: string
  snippet: ReactNode
  breadcrumbIcon: ReactNode
  breadcrumbParent: string
  breadcrumbParentHref: string
  breadcrumbChild: string
  href: string
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function SignalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function TaskIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function PageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function PlaybookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  )
}

function DollarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ─── Static data ──────────────────────────────────────────────────────────────
// TODO: wire to API

const ALL_RESULTS: SearchResult[] = [
  {
    id: 1,
    type: 'signal',
    title: 'Customer Concentration Increased to 34%',
    date: 'Feb 10, 2026',
    snippet: (
      <p className={styles.resultSnippet}>
        Your top 3 customers now account for <mark>34%</mark> of total revenue, crossing the elevated-risk
        threshold. <mark>Customer concentration</mark> at this level may reduce your valuation multiple by
        0.3&ndash;0.5x.
      </p>
    ),
    breadcrumbIcon: <SignalIcon />,
    breadcrumbParent: 'Signals',
    breadcrumbParentHref: '/dashboard/signals',
    breadcrumbChild: 'Active Signal',
    href: '/dashboard/signals',
  },
  {
    id: 2,
    type: 'task',
    title: 'Document Key Customer Relationships',
    date: 'Due Mar 1, 2026',
    snippet: (
      <p className={styles.resultSnippet}>
        Create formal documentation of all <mark>customer</mark> contracts, renewal terms, and key contacts.
        High <mark>customer concentration</mark> risk increases the urgency of this task — buyers will
        scrutinize these relationships closely.
      </p>
    ),
    breadcrumbIcon: <TaskIcon />,
    breadcrumbParent: 'Action Center',
    breadcrumbParentHref: '/dashboard/action-center',
    breadcrumbChild: 'In Progress',
    href: '/dashboard/action-center',
  },
  {
    id: 3,
    type: 'page',
    title: 'Risk Assessment',
    date: 'Updated Feb 12, 2026',
    snippet: (
      <p className={styles.resultSnippet}>
        Your <mark>customer concentration</mark> score is 62/100 — Moderate Risk. Top 3 customers represent{' '}
        <mark>34%</mark> of revenue. Industry benchmark for HVAC services is below 25% for strong exit
        valuations.
      </p>
    ),
    breadcrumbIcon: <PageIcon />,
    breadcrumbParent: 'Assessments',
    breadcrumbParentHref: '/dashboard/assessments',
    breadcrumbChild: 'Risk Assessment',
    href: '/dashboard/assessments',
  },
  {
    id: 4,
    type: 'task',
    title: 'Diversify Top 3 Customer Accounts',
    date: 'Due Apr 15, 2026',
    snippet: (
      <p className={styles.resultSnippet}>
        Develop a targeted plan to reduce reliance on your top 3 <mark>customer</mark> accounts. Goal: reduce{' '}
        <mark>concentration</mark> from 34% to below 25% within 12 months. Estimated valuation impact:
        +$320K.
      </p>
    ),
    breadcrumbIcon: <TaskIcon />,
    breadcrumbParent: 'Action Center',
    breadcrumbParentHref: '/dashboard/action-center',
    breadcrumbChild: 'Not Started',
    href: '/dashboard/action-center',
  },
  {
    id: 5,
    type: 'help',
    title: 'How Customer Concentration Affects Your Valuation',
    date: 'Help Center',
    snippet: (
      <p className={styles.resultSnippet}>
        Buyers and PE firms apply a discount when a business relies heavily on a small number of{' '}
        <mark>customers</mark>. Learn how <mark>concentration</mark> thresholds map to valuation multiples and
        what steps drive the biggest impact.
      </p>
    ),
    breadcrumbIcon: <HelpIcon />,
    breadcrumbParent: 'Help Center',
    breadcrumbParentHref: '/dashboard/help',
    breadcrumbChild: 'Valuation Fundamentals',
    href: '/dashboard/help',
  },
  {
    id: 6,
    type: 'report',
    title: 'Exit Readiness Report \u2014 Section 4: Customer Risks',
    date: 'Feb 2026',
    snippet: (
      <p className={styles.resultSnippet}>
        Section 4 covers <mark>customer concentration</mark> risk in detail, including a breakdown of your
        top 10 accounts by revenue contribution and a recommended 18-month diversification roadmap.
      </p>
    ),
    breadcrumbIcon: <ReportIcon />,
    breadcrumbParent: 'Reports',
    breadcrumbParentHref: '/dashboard/reports',
    breadcrumbChild: 'Exit Readiness Report',
    href: '/dashboard/reports',
  },
  {
    id: 7,
    type: 'signal',
    title: 'Customer Concentration Reduced to 31% (Dec 2025)',
    date: 'Dec 18, 2025',
    snippet: (
      <p className={styles.resultSnippet}>
        <mark>Customer concentration</mark> dropped from 36% to 31% following the onboarding of 4 new
        commercial accounts in Q4 2025. <mark>Concentration</mark> is still above target — continued
        progress needed.
      </p>
    ),
    breadcrumbIcon: <SignalIcon />,
    breadcrumbParent: 'Signals',
    breadcrumbParentHref: '/dashboard/signals',
    breadcrumbChild: 'Resolved',
    href: '/dashboard/signals',
  },
  {
    id: 8,
    type: 'task',
    title: 'Create Customer Transition Plan',
    date: 'Due May 1, 2026',
    snippet: (
      <p className={styles.resultSnippet}>
        Prepare a written plan showing how each major <mark>customer</mark> relationship will transition to
        new management post-close. Directly addresses acquirer concerns around <mark>customer
        concentration</mark> dependency on the owner.
      </p>
    ),
    breadcrumbIcon: <TaskIcon />,
    breadcrumbParent: 'Action Center',
    breadcrumbParentHref: '/dashboard/action-center',
    breadcrumbChild: 'Not Started',
    href: '/dashboard/action-center',
  },
  {
    id: 9,
    type: 'page',
    title: 'Value Ledger \u2014 Concentration Reduction',
    date: 'Updated Feb 14, 2026',
    snippet: (
      <p className={styles.resultSnippet}>
        Your <mark>customer concentration</mark> reduction efforts have contributed an estimated +$180K to
        your enterprise valuation. Continued progress toward the 25% target could add another +$140K.
      </p>
    ),
    breadcrumbIcon: <DollarIcon />,
    breadcrumbParent: 'Valuation',
    breadcrumbParentHref: '/dashboard/valuation',
    breadcrumbChild: 'Value Ledger',
    href: '/dashboard/value-ledger',
  },
  {
    id: 10,
    type: 'playbook',
    title: 'Diversify Customer Base',
    date: '8 steps',
    snippet: (
      <p className={styles.resultSnippet}>
        A step-by-step playbook for reducing <mark>customer concentration</mark> risk before your exit.
        Covers new market identification, service bundle expansion, and referral programs to grow your{' '}
        <mark>customer</mark> count.
      </p>
    ),
    breadcrumbIcon: <PlaybookIcon />,
    breadcrumbParent: 'Playbook',
    breadcrumbParentHref: '/dashboard/playbook',
    breadcrumbChild: 'Growth',
    href: '/dashboard/playbook',
  },
  {
    id: 11,
    type: 'help',
    title: 'Understanding Customer Concentration Risk',
    date: 'Help Center',
    snippet: (
      <p className={styles.resultSnippet}>
        An overview of how <mark>customer concentration</mark> is measured, why it matters to buyers, and
        what the typical thresholds are across different industries. Includes benchmarks for HVAC and
        field-services businesses.
      </p>
    ),
    breadcrumbIcon: <HelpIcon />,
    breadcrumbParent: 'Help Center',
    breadcrumbParentHref: '/dashboard/help',
    breadcrumbChild: 'Risk Factors',
    href: '/dashboard/help',
  },
  {
    id: 12,
    type: 'task',
    title: 'Implement Concentration Ceiling Policy',
    date: 'Due Jun 30, 2026',
    snippet: (
      <p className={styles.resultSnippet}>
        Establish a formal policy capping any single <mark>customer</mark> at 15% of revenue and top-3{' '}
        <mark>customer concentration</mark> at 30%. Document policy and present to leadership team.
        Valuation impact: +$80K.
      </p>
    ),
    breadcrumbIcon: <TaskIcon />,
    breadcrumbParent: 'Action Center',
    breadcrumbParentHref: '/dashboard/action-center',
    breadcrumbChild: 'Not Started',
    href: '/dashboard/action-center',
  },
]

// ─── Filter tab config ────────────────────────────────────────────────────────

type FilterKey = 'all' | ResultType

const FILTER_TABS: { key: FilterKey; label: string; count: number }[] = [
  { key: 'all', label: 'All', count: 12 },
  { key: 'page', label: 'Pages', count: 3 },
  { key: 'task', label: 'Tasks', count: 4 },
  { key: 'signal', label: 'Signals', count: 2 },
  { key: 'report', label: 'Reports', count: 1 },
  { key: 'help', label: 'Help', count: 2 },
]

// ─── Icon map helpers ─────────────────────────────────────────────────────────

function getResultIcon(type: ResultType) {
  if (type === 'signal') return <SignalIcon />
  if (type === 'task') return <TaskIcon />
  if (type === 'page') return <PageIcon />
  if (type === 'report') return <ReportIcon />
  if (type === 'help') return <HelpIcon />
  if (type === 'playbook') return <PlaybookIcon />
  return null
}

function getIconClass(type: ResultType) {
  if (type === 'signal') return styles.iconSignal
  if (type === 'task') return styles.iconTask
  if (type === 'page') return styles.iconPage
  if (type === 'report') return styles.iconReport
  if (type === 'help') return styles.iconHelp
  if (type === 'playbook') return styles.iconPlaybook
  return ''
}

function getBadgeClass(type: ResultType) {
  if (type === 'signal') return styles.typeSignal
  if (type === 'task') return styles.typeTask
  if (type === 'page') return styles.typePage
  if (type === 'report') return styles.typeReport
  if (type === 'help') return styles.typeHelp
  if (type === 'playbook') return styles.typePlaybook
  return ''
}

function getBadgeLabel(type: ResultType) {
  if (type === 'signal') return 'Signal'
  if (type === 'task') return 'Task'
  if (type === 'page') return 'Page'
  if (type === 'report') return 'Report'
  if (type === 'help') return 'Help'
  if (type === 'playbook') return 'Playbook'
  return type
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('customer concentration')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const filteredResults =
    activeFilter === 'all'
      ? ALL_RESULTS
      : ALL_RESULTS.filter((r) => r.type === activeFilter)

  const visibleCount = filteredResults.length

  return (
    <div>
      {/* TODO: wire to API */}

      {/* Search bar */}
      <div className={styles.searchHeader}>
        <div className={styles.searchBarWrap}>
          {/* Magnifying glass icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          <input
            className={styles.searchInput}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search"
            placeholder="Search…"
          />

          {searchQuery.length > 0 && (
            <button
              className={styles.searchClear}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <p className={styles.resultsSummary}>
          Showing <strong>{visibleCount} results</strong> for &ldquo;{searchQuery || 'customer concentration'}&rdquo;
        </p>
      </div>

      {/* Filter tabs */}
      <div className={styles.filterTabs} role="tablist">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeFilter === tab.key}
            className={
              activeFilter === tab.key
                ? `${styles.filterTab} ${styles.filterTabActive}`
                : styles.filterTab
            }
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
            <span className={styles.filterTabCount}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Results list */}
      {filteredResults.length > 0 ? (
        <ol className={styles.resultsList} role="list">
          {filteredResults.map((result) => (
            <li key={result.id} role="listitem">
              <Link href={result.href} className={styles.resultItem}>
                {/* Icon circle */}
                <div className={`${styles.resultIcon} ${getIconClass(result.type)}`}>
                  {getResultIcon(result.type)}
                </div>

                {/* Body */}
                <div className={styles.resultBody}>
                  {/* Top row: [badge + title] flex-group on left, date on right */}
                  <div className={styles.resultTop}>
                    <div className={styles.resultTitleRow}>
                      <span className={`${styles.resultTypeBadge} ${getBadgeClass(result.type)}`}>
                        {getBadgeLabel(result.type)}
                      </span>
                      <span className={styles.resultTitle}>{result.title}</span>
                    </div>
                    <span className={styles.resultDate}>{result.date}</span>
                  </div>

                  {/* Snippet with <mark> highlights */}
                  {result.snippet}

                  {/* Breadcrumb */}
                  <div className={styles.resultBreadcrumb}>
                    <span aria-hidden="true">{result.breadcrumbIcon}</span>
                    <Link href={result.breadcrumbParentHref}>{result.breadcrumbParent}</Link>
                    <ChevronRightIcon />
                    <span>{result.breadcrumbChild}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3>No results found</h3>
          <p>Try adjusting your search or clearing the filter.</p>
        </div>
      )}
    </div>
  )
}
