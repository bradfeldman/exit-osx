'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/deal-room/deal-room.module.css'

interface PipelineStage {
  visualStage: string
  label: string
  buyerCount: number
}

interface DealRoomData {
  activation: {
    isActivated: boolean
  }
  pipeline: {
    totalBuyers: number
    activeBuyers: number
    stages: PipelineStage[]
  } | null
  offers: Array<{
    buyerId: string
    companyName: string
    buyerType: string
    offerType: 'IOI' | 'LOI'
    amount: number
    deadline: string | null
  }>
}

type SiState = 'done' | 'prog' | 'none' | 'flag'
type StatusState = 'done' | 'prog' | 'none' | 'flag'
type DateState = '' | 'warn' | 'overdue'

interface ReqItem {
  state: SiState
  name: string
  note?: string
  noteType?: 'issue'
  status: StatusState
  statusLabel: string
  date: string
  dateState?: DateState
  viewed?: boolean
  btnLabel: string
  btnResolve?: boolean
}

const FINANCIAL_ITEMS: ReqItem[] = [
  { state: 'done', name: '3 years audited financial statements', status: 'done', statusLabel: 'Provided', date: 'Feb 1', viewed: true, btnLabel: 'View' },
  { state: 'done', name: 'Accounts receivable aging report', status: 'done', statusLabel: 'Provided', date: 'Feb 3', viewed: true, btnLabel: 'View' },
  { state: 'done', name: 'Revenue by customer (top 20)', status: 'done', statusLabel: 'Provided', date: 'Feb 5', viewed: true, btnLabel: 'View' },
  { state: 'done', name: 'EBITDA reconciliation & add-backs (3 years)', status: 'done', statusLabel: 'Provided', date: 'Feb 7', viewed: true, btnLabel: 'View' },
  { state: 'done', name: 'Bank statements (24 months)', status: 'done', statusLabel: 'Provided', date: 'Feb 8', viewed: true, btnLabel: 'View' },
  { state: 'prog', name: 'Monthly revenue detail (36 months)', note: 'Exporting from accounting software', status: 'prog', statusLabel: 'In Progress', date: 'Due Feb 22', dateState: 'warn', viewed: false, btnLabel: 'Upload' },
  { state: 'none', name: 'Capital expenditure schedule', status: 'none', statusLabel: 'Not Started', date: 'Due Feb 25', dateState: 'overdue', btnLabel: 'Upload' },
]

const LEGAL_ITEMS: ReqItem[] = [
  { state: 'done', name: 'Articles of incorporation', status: 'done', statusLabel: 'Provided', date: 'Jan 28', viewed: true, btnLabel: 'View' },
  { state: 'done', name: 'Operating agreement', status: 'done', statusLabel: 'Provided', date: 'Jan 28', viewed: true, btnLabel: 'View' },
  { state: 'done', name: 'Business licenses & permits (all states)', status: 'done', statusLabel: 'Provided', date: 'Feb 2', viewed: true, btnLabel: 'View' },
  { state: 'prog', name: 'Customer contract summaries', note: 'Reviewing with attorney', status: 'prog', statusLabel: 'In Progress', date: 'Due Mar 1', dateState: 'warn', viewed: false, btnLabel: 'Upload' },
  { state: 'flag', name: 'Pending litigation disclosure', note: 'Buyer flagged: need more detail on 2024 warranty claim', noteType: 'issue', status: 'flag', statusLabel: 'Issue', date: 'Action req.', dateState: 'overdue', btnLabel: 'Resolve', btnResolve: true },
  { state: 'none', name: 'Intellectual property schedule', status: 'none', statusLabel: 'Not Started', date: 'Due Feb 28', dateState: 'overdue', btnLabel: 'Upload' },
]

const OPERATIONS_ITEMS: ReqItem[] = [
  { state: 'done', name: 'Organizational chart with tenure', status: 'done', statusLabel: 'Provided', date: 'Feb 1', viewed: true, btnLabel: 'View' },
  { state: 'done', name: 'Top vendor & supplier contracts (5+)', status: 'done', statusLabel: 'Provided', date: 'Feb 4', viewed: true, btnLabel: 'View' },
  { state: 'done', name: 'Equipment list & depreciation schedule', status: 'done', statusLabel: 'Provided', date: 'Feb 6', viewed: true, btnLabel: 'View' },
  { state: 'prog', name: 'Standard operating procedures (top 10)', note: 'Drafting service dispatch & billing SOPs', status: 'prog', statusLabel: 'In Progress', date: 'Due Mar 1', dateState: 'warn', viewed: false, btnLabel: 'Upload' },
  { state: 'none', name: 'Employee handbook', status: 'none', statusLabel: 'Not Started', date: 'Due Feb 28', dateState: 'overdue', btnLabel: 'Upload' },
]

const CAT_PROGRESS = [
  { name: 'Financial', count: '10/12', pct: 83, color: 'cfGreen' as const },
  { name: 'Legal', count: '7/10', pct: 70, color: 'cfOrange' as const },
  { name: 'Operations', count: '6/8', pct: 75, color: 'cfGreen' as const },
  { name: 'HR', count: '5/6', pct: 83, color: 'cfGreen' as const },
  { name: 'Tax', count: '3/5', pct: 60, color: 'cfOrange' as const },
  { name: 'Customer', count: '3/6', pct: 50, color: 'cfOrange' as const },
]

const FILTER_TABS = [
  { label: 'All', count: 47 },
  { label: 'Financial', count: 12 },
  { label: 'Legal', count: 10 },
  { label: 'Operations', count: 8 },
  { label: 'HR', count: 6 },
  { label: 'Tax', count: 5 },
  { label: 'Customer', count: 6 },
]

function SiIcon({ state }: { state: SiState }) {
  if (state === 'done') {
    return (
      <div className={`${styles.si} ${styles.siDone}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    )
  }
  if (state === 'prog') {
    return (
      <div className={`${styles.si} ${styles.siProg}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
        </svg>
      </div>
    )
  }
  if (state === 'flag') {
    return (
      <div className={`${styles.si} ${styles.siFlag}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
    )
  }
  return (
    <div className={`${styles.si} ${styles.siNone}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    </div>
  )
}

function ReqRow({ item }: { item: ReqItem }) {
  const statusClass = {
    done: styles.reqStatusDone,
    prog: styles.reqStatusProg,
    none: styles.reqStatusNone,
    flag: styles.reqStatusFlag,
  }[item.status]

  const dateClass = {
    warn: styles.reqDateWarn,
    overdue: styles.reqDateOverdue,
    '': '',
  }[item.dateState ?? '']

  return (
    <div className={`${styles.reqRow} ${item.state === 'flag' ? styles.reqRowIssue : ''}`}>
      <SiIcon state={item.state} />
      <div className={styles.reqName}>
        <div className={styles.reqNameText}>{item.name}</div>
        {item.note && (
          <div className={`${styles.reqNote} ${item.noteType === 'issue' ? styles.reqNoteIssue : ''}`}>
            {item.note}
          </div>
        )}
      </div>
      <span className={`${styles.reqStatus} ${statusClass}`}>{item.statusLabel}</span>
      <span className={`${styles.reqDate} ${dateClass}`}>{item.date}</span>
      {item.viewed !== undefined ? (
        <div className={`${styles.viewed} ${item.viewed ? '' : styles.viewedNo}`}>
          {item.viewed ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Viewed
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              &nbsp;Not viewed
            </>
          )}
        </div>
      ) : (
        <div style={{ minWidth: 60 }}>&nbsp;</div>
      )}
      <button className={`${styles.reqBtn} ${item.btnResolve ? styles.reqBtnResolve : ''}`}>
        {item.btnLabel}
      </button>
    </div>
  )
}

export default function DueDiligencePage() {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<DealRoomData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/deal-room`)
      if (!res.ok) throw new Error('Failed to fetch deal room data')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    let cancelled = false
    if (!selectedCompanyId) return
    setIsLoading(true)
    setError(null)
    fetch(`/api/companies/${selectedCompanyId}/deal-room`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch deal room data')
        return res.json()
      })
      .then(json => {
        if (!cancelled) setData(json)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'An error occurred')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedCompanyId])

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading due diligence tracker...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div className={styles.emptyStateTitle}>Could not load due diligence data</div>
        <div className={styles.emptyStateText}>{error ?? 'Something went wrong. Please try again.'}</div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={fetchData}>Try Again</button>
      </div>
    )
  }

  const loiOffer = data.offers?.find(o => o.offerType === 'LOI')
  const buyerName = loiOffer?.companyName ?? 'Buyer'

  // Circumference for r=48: 2 * pi * 48 = 301.6
  // 72% done => dashoffset = 301.6 * (1 - 0.72) = 84.4
  const CIRCUMFERENCE = 301.6
  const pct = 72
  const dashOffset = CIRCUMFERENCE * (1 - pct / 100)

  return (
    <>
      <TrackPageView page="deal-room/due-diligence" />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/deal-room">Deal Room</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <Link href="/dashboard/deal-room">{buyerName}</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span>Due Diligence</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Due Diligence Tracker</h1>
          <p>{buyerName} &mdash; 34 of 47 items complete</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Status Report
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Upload Documents
          </button>
        </div>
      </div>

      {/* Progress Hero */}
      <div className={styles.progressHero}>
        <div className={styles.ringWrap}>
          <svg viewBox="0 0 116 116">
            <circle className={styles.ringBg} cx="58" cy="58" r="48"/>
            <circle
              className={styles.ringFill}
              cx="58"
              cy="58"
              r="48"
              style={{ strokeDashoffset: dashOffset }}
            />
          </svg>
          <div className={styles.ringLabel}>
            <div className={styles.ringPct}>{pct}%</div>
            <div className={styles.ringSub}>complete</div>
          </div>
        </div>
        <div className={styles.heroInfo}>
          <div className={styles.heroStats}>
            <div>
              <div className={`${styles.heroStatNum} ${styles.heroStatNumGreen}`}>34</div>
              <div className={styles.heroStatLabel}>Provided</div>
            </div>
            <div>
              <div className={`${styles.heroStatNum} ${styles.heroStatNumOrange}`}>8</div>
              <div className={styles.heroStatLabel}>In Progress</div>
            </div>
            <div>
              <div className={`${styles.heroStatNum} ${styles.heroStatNumGray}`}>5</div>
              <div className={styles.heroStatLabel}>Not Started</div>
            </div>
            <div>
              <div className={`${styles.heroStatNum} ${styles.heroStatNumRed}`}>1</div>
              <div className={styles.heroStatLabel}>Issues</div>
            </div>
          </div>
          <div className={styles.heroMeta}>
            <div className={styles.heroMetaRow}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Estimated completion: <strong>March 15, 2026 (18 days)</strong>
            </div>
            <div className={styles.heroMetaRow}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Buyer last accessed data room: <strong>2 hours ago</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column */}
      <div className={styles.twoCol}>
        {/* LEFT: Filters + Groups */}
        <div>
          {/* Filter Bar */}
          <div className={styles.filterBar}>
            {FILTER_TABS.map((tab, i) => (
              <button
                key={tab.label}
                className={`${styles.ftab} ${i === activeTab ? styles.ftabActive : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {tab.label} <span className={styles.ftabCount}>({tab.count})</span>
              </button>
            ))}
          </div>

          {/* AI Coach */}
          <div className={styles.coachCard}>
            <div className={styles.coachIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <div>
              <div className={styles.coachEyebrow}>AI Coach Insight</div>
              <div className={styles.coachText}>
                Based on the buyer&apos;s request pattern, they&apos;re focused heavily on{' '}
                <strong>customer concentration data</strong>. Make sure your top-20 customer detail
                includes contract terms and renewal dates &mdash; PE firms always ask for this in round 2.
              </div>
            </div>
          </div>

          {/* Financial Group */}
          <div className={styles.reqGroup}>
            <div className={styles.groupHead}>
              <div className={styles.groupHeadLeft}>
                <div className={styles.groupTitle}>Financial</div>
                <div className={styles.groupProgText}>10 of 12 complete</div>
              </div>
              <div className={styles.groupHeadRight}>
                <div className={styles.groupBarTrack}>
                  <div className={styles.groupBarFill} style={{ width: '83%' }} />
                </div>
                <div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, color: 'var(--text-tertiary)' }}>
                    <polyline points="18 15 12 9 6 15"/>
                  </svg>
                </div>
              </div>
            </div>
            {FINANCIAL_ITEMS.map((item, i) => <ReqRow key={i} item={item} />)}
          </div>

          {/* Legal Group */}
          <div className={styles.reqGroup}>
            <div className={styles.groupHead}>
              <div className={styles.groupHeadLeft}>
                <div className={styles.groupTitle}>Legal</div>
                <div className={styles.groupProgText}>
                  7 of 10 complete &mdash; <span style={{ color: 'var(--red)', fontWeight: 700 }}>1 issue</span>
                </div>
              </div>
              <div className={styles.groupHeadRight}>
                <div className={styles.groupBarTrack}>
                  <div className={`${styles.groupBarFill} ${styles.groupBarFillOrange}`} style={{ width: '70%' }} />
                </div>
                <div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, color: 'var(--text-tertiary)' }}>
                    <polyline points="18 15 12 9 6 15"/>
                  </svg>
                </div>
              </div>
            </div>
            {LEGAL_ITEMS.map((item, i) => <ReqRow key={i} item={item} />)}
          </div>

          {/* Operations Group */}
          <div className={styles.reqGroup}>
            <div className={styles.groupHead}>
              <div className={styles.groupHeadLeft}>
                <div className={styles.groupTitle}>Operations</div>
                <div className={styles.groupProgText}>6 of 8 complete</div>
              </div>
              <div className={styles.groupHeadRight}>
                <div className={styles.groupBarTrack}>
                  <div className={styles.groupBarFill} style={{ width: '75%' }} />
                </div>
                <div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, color: 'var(--text-tertiary)' }}>
                    <polyline points="18 15 12 9 6 15"/>
                  </svg>
                </div>
              </div>
            </div>
            {OPERATIONS_ITEMS.map((item, i) => <ReqRow key={i} item={item} />)}
          </div>
        </div>

        {/* RIGHT: Panel */}
        <div className={styles.panelCol}>
          {/* Buyer Contact */}
          <div className={styles.panelCard}>
            <div className={styles.panelTitle}>Buyer Contact</div>
            <div className={styles.contactRow}>
              <div className={styles.cAvatar}>JM</div>
              <div>
                <div className={styles.cName}>James Morrison</div>
                <div className={styles.cRole}>VP Acquisitions, {buyerName}</div>
              </div>
            </div>
            <div className={styles.detailList}>
              <div className={styles.detailRow}>
                <span className={styles.dl}>Request received</span>
                <span className={styles.dv}>Jan 20, 2026</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.dl}>Response deadline</span>
                <span className={`${styles.dv} ${styles.dvWarn}`}>Mar 1, 2026</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.dl}>Total items</span>
                <span className={styles.dv}>47</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.dl}>Items complete</span>
                <span className={`${styles.dv} ${styles.dvGood}`}>34 &mdash; 72%</span>
              </div>
            </div>
            <div className={styles.flagAlert}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              1 item flagged by buyer
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.panelCard}>
            <div className={styles.panelTitle}>Quick Actions</div>
            <div className={styles.panelActions}>
              <button className={`${styles.panelBtn} ${styles.panelBtnPrimary}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Upload Documents
              </button>
              <button className={styles.panelBtn}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                Message Buyer Team
              </button>
              <button className={styles.panelBtn}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export Status Report
              </button>
            </div>
          </div>

          {/* Category Progress */}
          <div className={styles.panelCard}>
            <div className={styles.panelTitle}>Progress by Category</div>
            <div className={styles.catProgress}>
              {CAT_PROGRESS.map((cat) => (
                <div key={cat.name}>
                  <div className={styles.catTop}>
                    <span className={styles.catName}>{cat.name}</span>
                    <span className={styles.catCount}>{cat.count}</span>
                  </div>
                  <div className={styles.catTrack}>
                    <div
                      className={`${styles.catFill} ${cat.color === 'cfGreen' ? styles.cfGreen : styles.cfOrange}`}
                      style={{ width: `${cat.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
