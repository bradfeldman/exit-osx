'use client'

import { useState, useEffect, use } from 'react'
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

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

interface SubStep {
  id: string
  title: string
  completed: boolean
}

interface TaskDetail {
  id: string
  title: string
  description: string
  briCategory: string
  categoryLabel: string
  normalizedValue: number
  status: string
  priorityRank: number
  startedAt: string | null
  daysInProgress: number | null
  buyerConsequence: string | null
  subSteps: SubStep[]
  subStepProgress: { completed: number; total: number }
  assignee: { id: string; name: string; email: string; role: string | null } | null
  proofDocuments: Array<{ id: string; name: string; uploadedAt: string }>
  relatedTasks: Array<{ id: string; title: string; value: number; status: string }>
  successCriteria: string[] | null
  companyContext: { companyName?: string } | null
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

function getPriorityLabel(rank: number): { label: string; badgeClass: string } {
  if (rank <= 2) return { label: 'Critical Priority', badgeClass: 'badgeRed' }
  if (rank <= 5) return { label: 'High Priority', badgeClass: 'badgeOrange' }
  if (rank <= 10) return { label: 'Medium Priority', badgeClass: 'badgeBlue' }
  return { label: 'Low Priority', badgeClass: 'badgeGray' }
}

function getStatusBadge(status: string): { label: string; badgeClass: string } {
  switch (status) {
    case 'IN_PROGRESS': return { label: 'In Progress', badgeClass: 'badgeBlue' }
    case 'PENDING': return { label: 'To Do', badgeClass: 'badgeGray' }
    case 'COMPLETED': return { label: 'Completed', badgeClass: 'badgeGreen' }
    case 'BLOCKED': return { label: 'Blocked', badgeClass: 'badgeRed' }
    case 'DEFERRED': return { label: 'Deferred', badgeClass: 'badgeOrange' }
    default: return { label: status, badgeClass: 'badgeGray' }
  }
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = use(params)
  const { selectedCompanyId } = useCompany()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    // Fetch from actions endpoint and find this task
    fetch(`/api/companies/${selectedCompanyId}/actions`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return
        // Search across all task arrays
        const allTasks = [
          ...(data.activeTasks || []),
          ...(data.upNext || []),
        ]
        const found = allTasks.find((t: TaskDetail) => t.id === taskId)
        if (found) setTask(found)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [selectedCompanyId, taskId])

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className={styles.card} style={{ textAlign: 'center', padding: '60px 40px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Task not found.</p>
        <Link href="/dashboard/action-center" className={styles.sectionLink} style={{ marginTop: '8px', display: 'inline-block' }}>
          Back to Action Center
        </Link>
      </div>
    )
  }

  const statusBadge = getStatusBadge(task.status)
  const priorityBadge = getPriorityLabel(task.priorityRank)
  const tag = TAG_MAP[task.briCategory]
  const progress = task.subStepProgress
  const progressPct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0

  return (
    <>
      <TrackPageView page={`/dashboard/action-center/${taskId}`} />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/action-center">Action Center</Link>
        <ChevronSmallIcon />
        <span>{task.title.length > 50 ? task.title.slice(0, 50) + '...' : task.title}</span>
      </div>

      {/* Status Row */}
      <div className={styles.taskStatusRow}>
        <span className={`${styles.badge} ${styles[statusBadge.badgeClass]}`}>
          {statusBadge.label}
        </span>
        <div className={styles.statusDivider} />
        <span className={`${styles.badge} ${styles[priorityBadge.badgeClass]}`}>
          {priorityBadge.label}
        </span>
        {task.daysInProgress !== null && (
          <>
            <div className={styles.statusDivider} />
            <div className={styles.statusMeta}>
              {task.daysInProgress} days in progress
            </div>
          </>
        )}
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>{task.title}</h1>
        </div>
      </div>

      {/* Two-column layout */}
      <div className={styles.taskLayout}>
        {/* LEFT COLUMN */}
        <div>
          {/* Value Impact Card */}
          {task.normalizedValue > 0 && (
            <div className={styles.valueImpactCard}>
              <div className={styles.valueImpactIcon}>
                <TrendUpIcon />
              </div>
              <div style={{ flex: 1 }}>
                <div className={styles.valueImpactLabel}>Potential Value Impact</div>
                <div className={styles.valueImpactAmount}>+{formatCurrency(task.normalizedValue)}</div>
                {task.buyerConsequence && (
                  <div className={styles.valueImpactDesc}>{task.buyerConsequence}</div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className={styles.card}>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Why This Matters
              </div>
              <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                {task.description}
              </div>
            </div>
          )}

          {/* Subtasks Checklist */}
          {task.subSteps.length > 0 && (
            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>Subtasks</div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {progress.completed} of {progress.total} complete
                </span>
              </div>
              {progress.total > 0 && (
                <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
                  <div style={{ height: '100%', borderRadius: '3px', background: 'var(--green)', width: `${progressPct}%` }} />
                </div>
              )}
              <ul className={styles.checklist}>
                {task.subSteps.map(step => (
                  <li key={step.id} className={styles.checklistItem}>
                    <div className={`${styles.checkBox} ${step.completed ? styles.checkBoxChecked : ''}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div className={`${styles.checklistLabel} ${step.completed ? styles.checklistLabelDone : ''}`}>
                      {step.title}
                    </div>
                    <span className={`${styles.badge} ${step.completed ? styles.badgeGreen : styles.badgeGray}`} style={{ fontSize: '11px' }}>
                      {step.completed ? 'Done' : 'To Do'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence */}
          {task.proofDocuments.length > 0 && (
            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>Evidence</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {task.proofDocuments.map(doc => (
                  <div key={doc.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                    background: 'var(--surface-secondary)', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)'
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '10px',
                      fontWeight: 800, background: 'var(--accent-light)', color: 'var(--accent)'
                    }}>
                      DOC
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{doc.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Sidebar Meta */}
        <div>
          {/* Task Info Card */}
          <div className={styles.card}>
            <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Task Details
            </div>
            <div className={styles.metaList}>
              {task.assignee && (
                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>Assigned to</div>
                  <div className={styles.metaValue}>{task.assignee.name}</div>
                </div>
              )}
              <div className={styles.metaRow}>
                <div className={styles.metaLabel}>Category</div>
                <div className={styles.metaValue}>
                  {tag && (
                    <span className={`${styles.badge} ${styles[tag.class === 'tagOwnerDep' ? 'badgeRed' : tag.class === 'tagCustomer' ? 'badgeOrange' : tag.class === 'tagFinancial' ? 'badgeBlue' : tag.class === 'tagGrowth' ? 'badgeGreen' : 'badgeGray']}`} style={{ fontSize: '11px' }}>
                      {tag.label}
                    </span>
                  )}
                </div>
              </div>
              {progress.total > 0 && (
                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>Progress</div>
                  <div className={styles.metaValue}>{progress.completed} / {progress.total} subtasks</div>
                </div>
              )}
              {task.startedAt && (
                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>Started</div>
                  <div className={styles.metaValue}>
                    {new Date(task.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              )}
            </div>
            {progress.total > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '3px', background: 'var(--green)', width: `${progressPct}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Related Tasks */}
          {task.relatedTasks.length > 0 && (
            <div className={styles.card}>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Related Tasks
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {task.relatedTasks.map(rt => (
                  <Link
                    key={rt.id}
                    href={`/dashboard/action-center/${rt.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                      background: 'var(--surface-secondary)', borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none', border: '1px solid var(--border-light)'
                    }}
                  >
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                      background: rt.status === 'IN_PROGRESS' ? 'var(--orange)' : 'var(--border)'
                    }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{rt.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                        {rt.status === 'IN_PROGRESS' ? 'In Progress' : 'Not Started'}
                        {rt.value > 0 && ` \u00b7 +${formatShort(rt.value)}`}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function ChevronSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function TrendUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  )
}
