'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/actions/action-center.module.css'

function formatShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000).toLocaleString()}K`
  return `$${Math.round(value).toLocaleString()}`
}

interface TaskData {
  id: string
  title: string
  description: string
  briCategory: string
  categoryLabel: string
  normalizedValue: number
  status: string
  priorityRank: number
  subStepProgress: { completed: number; total: number }
  assignee: { id: string; name: string; role: string | null } | null
  isAssignedToCurrentUser: boolean
  buyerConsequence: string | null
  startedAt: string | null
  daysInProgress: number | null
}

interface CompletedTask {
  id: string
  title: string
  completedValue: number
  completedAt: string
  briCategory: string
}

interface ActionData {
  summary: {
    totalTasks: number
    activeTasks: number
    deferredTasks: number
    completedThisMonth: number
    valueRecoveredThisMonth: number
  }
  activeTasks: TaskData[]
  upNext: TaskData[]
  completedThisMonth: CompletedTask[]
  waitingOnOthers: Array<{ id: string; title: string; assignee: { name: string } }>
}

const TAG_MAP: Record<string, { class: string; label: string }> = {
  OWNER_DEPENDENCY: { class: 'tagOwnerDep', label: 'Owner Dependence' },
  CUSTOMER_CONCENTRATION: { class: 'tagCustomer', label: 'Customer Risk' },
  OPERATIONAL: { class: 'tagOps', label: 'Operations' },
  FINANCIAL: { class: 'tagFinancial', label: 'Financials' },
  LEGAL_TAX: { class: 'tagLegal', label: 'Legal & Compliance' },
  LEGAL_COMPLIANCE: { class: 'tagLegal', label: 'Legal & Compliance' },
  REVENUE_GROWTH: { class: 'tagGrowth', label: 'Revenue Growth' },
  RECURRING_REVENUE: { class: 'tagGrowth', label: 'Recurring Revenue' },
  PERSONAL: { class: 'tagOps', label: 'Personal' },
  MARKET: { class: 'tagFinancial', label: 'Market' },
  TRANSFERABILITY: { class: 'tagOwnerDep', label: 'Transferability' },
}

function getPriorityGroup(rank: number): 'critical' | 'high' | 'medium' | 'low' {
  if (rank <= 2) return 'critical'
  if (rank <= 5) return 'high'
  if (rank <= 10) return 'medium'
  return 'low'
}

const PRIORITY_STYLES: Record<string, { class: string; label: string; color: string }> = {
  critical: { class: 'priorityCritical', label: 'Critical Priority', color: 'var(--red)' },
  high: { class: 'priorityHigh', label: 'High Priority', color: 'var(--orange)' },
  medium: { class: 'priorityMedium', label: 'Medium Priority', color: 'var(--accent)' },
  low: { class: 'priorityLow', label: 'Low Priority', color: 'var(--text-tertiary)' },
}

type FilterStatus = 'all' | 'todo' | 'in_progress' | 'overdue'
type FilterPriority = 'all' | 'critical' | 'high' | 'medium'

export default function ActionCenterPage() {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<ActionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    fetch(`/api/companies/${selectedCompanyId}/actions`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d) setData(d) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [selectedCompanyId])

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  if (!data) return null

  // Merge active + upNext for unified task list
  const allTasks = [...data.activeTasks, ...data.upNext]

  // Apply filters
  let filtered = allTasks
  if (filterStatus === 'todo') filtered = filtered.filter(t => t.status === 'PENDING')
  if (filterStatus === 'in_progress') filtered = filtered.filter(t => t.status === 'IN_PROGRESS')
  if (filterPriority !== 'all') filtered = filtered.filter(t => getPriorityGroup(t.priorityRank) === filterPriority)
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
  }

  // Group by priority
  const groups: Record<string, TaskData[]> = {}
  for (const t of filtered) {
    const g = getPriorityGroup(t.priorityRank)
    if (!groups[g]) groups[g] = []
    groups[g].push(t)
  }

  // Calculate impact values
  const totalImpact = allTasks.reduce((s, t) => s + t.normalizedValue, 0)
  const inProgressImpact = data.activeTasks.reduce((s, t) => s + t.normalizedValue, 0)
  const notStartedImpact = data.upNext.reduce((s, t) => s + t.normalizedValue, 0)
  const capturedImpact = data.summary.valueRecoveredThisMonth

  const delegatableCount = data.waitingOnOthers.length

  return (
    <>
      <TrackPageView page="/dashboard/action-center" />

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Action Center</h1>
          <p>Every task that increases your business value, prioritized by impact</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/action-center" className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Plan
          </Link>
          <Link href="/dashboard" className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/>
            </svg>
            Generate New Actions
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Actions</div>
          <div className={styles.statValue}>{data.summary.totalTasks}</div>
          <div className={styles.statSub}>In your action plan</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>In Progress</div>
          <div className={styles.statValue} style={{ color: 'var(--accent)' }}>{data.summary.activeTasks}</div>
          <div className={styles.statSub}>Currently active</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Completed</div>
          <div className={styles.statValue} style={{ color: 'var(--green)' }}>{data.summary.completedThisMonth}</div>
          <div className={styles.statSub}>This month</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Delegated</div>
          <div className={styles.statValue} style={{ color: 'var(--purple)' }}>{delegatableCount}</div>
          <div className={styles.statSub}>To team & advisors</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Deferred</div>
          <div className={styles.statValue} style={{ color: 'var(--text-secondary)' }}>{data.summary.deferredTasks}</div>
          <div className={styles.statSub}>Scheduled later</div>
        </div>
      </div>

      {/* Value Impact Summary */}
      {totalImpact > 0 && (
        <div className={styles.impactBanner}>
          <div className={styles.impactBannerLeft}>
            <div className={styles.impactBannerLabel}>Total Potential Value Impact</div>
            <div className={styles.impactBannerValue}>+{formatShort(totalImpact)}</div>
            <div className={styles.impactBannerDesc}>
              If all open actions are completed, your valuation could increase significantly
            </div>
          </div>
          <div className={styles.impactDivider} />
          <div className={styles.impactSegments}>
            {capturedImpact > 0 && (
              <div className={styles.impactSeg}>
                <div className={styles.impactSegValue} style={{ color: 'var(--green)' }}>+{formatShort(capturedImpact)}</div>
                <div className={styles.impactSegLabel}>Captured</div>
              </div>
            )}
            {inProgressImpact > 0 && (
              <div className={styles.impactSeg}>
                <div className={styles.impactSegValue} style={{ color: 'var(--orange)' }}>+{formatShort(inProgressImpact)}</div>
                <div className={styles.impactSegLabel}>In Progress</div>
              </div>
            )}
            {notStartedImpact > 0 && (
              <div className={styles.impactSeg}>
                <div className={styles.impactSegValue} style={{ color: 'rgba(255,255,255,0.4)' }}>+{formatShort(notStartedImpact)}</div>
                <div className={styles.impactSegLabel}>Not Started</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delegation Banner */}
      {delegatableCount > 0 && (
        <div className={styles.delegateBanner}>
          <div className={styles.delegateBannerIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </div>
          <div className={styles.delegateBannerContent}>
            <div className={styles.delegateBannerTitle}>{delegatableCount} action{delegatableCount !== 1 ? 's' : ''} can be delegated to your team</div>
            <div className={styles.delegateBannerDesc}>Invite your CPA, attorney, or operations manager to handle tasks directly. They&apos;ll get a secure link — no account needed.</div>
          </div>
          <Link href="/dashboard/settings" className={`${styles.btn} ${styles.btnPurple}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9"/>
            </svg>
            Invite Team
          </Link>
        </div>
      )}

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          {(['all', 'todo', 'in_progress'] as FilterStatus[]).map(s => (
            <button
              key={s}
              className={`${styles.filterBtn} ${filterStatus === s ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? `All (${allTasks.length})` : s === 'todo' ? `To Do` : 'In Progress'}
            </button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          {(['all', 'critical', 'high', 'medium'] as FilterPriority[]).map(p => (
            <button
              key={p}
              className={`${styles.filterBtn} ${filterPriority === p ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterPriority(p)}
            >
              {p === 'all' ? 'All Priority' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className={styles.filterSearch}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search actions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Task List */}
      <div className={styles.taskList}>
        {(['critical', 'high', 'medium', 'low'] as const).map(priority => {
          const tasks = groups[priority]
          if (!tasks || tasks.length === 0) return null
          const ps = PRIORITY_STYLES[priority]

          return (
            <div key={priority}>
              <div className={styles.taskGroupHeader}>
                <span style={{ color: ps.color }}>{ps.label}</span>
                <span className={styles.groupCount}>{tasks.length}</span>
                {priority === 'critical' && (
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                    Highest impact on valuation
                  </span>
                )}
              </div>
              {tasks.map(task => {
                const tag = TAG_MAP[task.briCategory]
                const progress = task.subStepProgress
                const initials = task.assignee
                  ? task.assignee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  : '?'
                const isOwner = task.isAssignedToCurrentUser
                const isDelegate = task.assignee && !task.isAssignedToCurrentUser
                return (
                  <Link
                    key={task.id}
                    href={`/dashboard/action-center/${task.id}`}
                    className={styles.taskItem}
                  >
                    <div className={styles.taskCheck} />
                    <div className={`${styles.taskPriority} ${styles[ps.class]}`} />
                    <div className={styles.taskContent}>
                      <div className={styles.taskTitle}>{task.title}</div>
                      {task.description && (
                        <div className={styles.taskDesc}>
                          {task.description.length > 160 ? task.description.slice(0, 160) + '...' : task.description}
                        </div>
                      )}
                      <div className={styles.taskMetaRow}>
                        {tag && (
                          <span className={`${styles.taskTag} ${styles[tag.class]}`}>{tag.label}</span>
                        )}
                        {progress.total > 0 && (
                          <div className={styles.taskProgress}>
                            <div className={styles.taskProgressBar}>
                              <div
                                className={styles.taskProgressFill}
                                style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                              />
                            </div>
                            <span className={styles.taskProgressText}>
                              {progress.completed} of {progress.total} steps
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.taskRight}>
                      {task.normalizedValue > 0 && (
                        <div className={styles.taskImpact}>+{formatShort(task.normalizedValue)}</div>
                      )}
                      {task.assignee && (
                        <div className={styles.taskAssignee}>
                          <div className={`${styles.taskAssigneeAvatar} ${isOwner ? styles.taskAssigneeOwner : isDelegate ? styles.taskAssigneeDelegate : styles.taskAssigneeUnassigned}`}>
                            {initials}
                          </div>
                          <span className={styles.taskAssigneeName}>
                            {isOwner ? 'You' : task.assignee.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={styles.taskArrow}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}

        {/* Completed Toggle */}
        {data.completedThisMonth.length > 0 && (
          <>
            <button
              className={styles.completedToggle}
              onClick={() => setShowCompleted(!showCompleted)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: showCompleted ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              Completed ({data.completedThisMonth.length})
            </button>
            {showCompleted && data.completedThisMonth.map(task => {
              const tag = TAG_MAP[task.briCategory]
              return (
                <Link
                  key={task.id}
                  href={`/dashboard/action-center/${task.id}`}
                  className={`${styles.taskItem} ${styles.taskItemCompleted}`}
                >
                  <div className={`${styles.taskCheck} ${styles.taskCheckDone}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div className={styles.taskPriority} style={{ background: 'var(--green)' }} />
                  <div className={styles.taskContent}>
                    <div className={styles.taskTitle} style={{ textDecoration: 'line-through', color: 'var(--text-tertiary)' }}>
                      {task.title}
                    </div>
                    <div className={styles.taskMetaRow}>
                      {tag && (
                        <span className={`${styles.taskTag} ${styles[tag.class]}`}>{tag.label}</span>
                      )}
                      <span className={styles.taskDue}>
                        Completed {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className={styles.taskRight}>
                    {task.completedValue > 0 && (
                      <div className={styles.taskImpact}>+{formatShort(task.completedValue)}</div>
                    )}
                  </div>
                </Link>
              )
            })}
          </>
        )}

        {filtered.length === 0 && data.completedThisMonth.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No actions match your current filters.
          </div>
        )}
      </div>
    </>
  )
}
