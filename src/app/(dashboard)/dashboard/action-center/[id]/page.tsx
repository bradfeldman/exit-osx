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

function getCategoryBadgeClass(tagClass: string): string {
  if (tagClass === 'tagOwnerDep') return 'badgeRed'
  if (tagClass === 'tagCustomer') return 'badgeOrange'
  if (tagClass === 'tagFinancial') return 'badgeBlue'
  if (tagClass === 'tagGrowth') return 'badgeGreen'
  return 'badgeGray'
}

function getFileExtension(name: string): string {
  const ext = name.split('.').pop()?.toUpperCase() || 'DOC'
  return ext
}

function getFileIconClass(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return styles.fileIconXlsx
  if (ext === 'pdf') return styles.fileIconPdf
  return styles.fileIconDoc
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = use(params)
  const { selectedCompanyId } = useCompany()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    fetch(`/api/companies/${selectedCompanyId}/actions`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return
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
  const assigneeInitials = task.assignee
    ? task.assignee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ME'

  return (
    <>
      <TrackPageView page={`/dashboard/action-center/${taskId}`} />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard/action-center">Action Center</Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span>{task.title.length > 50 ? task.title.slice(0, 50) + '...' : task.title}</span>
      </div>

      {/* Status Row */}
      <div className={styles.taskStatusRow}>
        <span className={`${styles.badge} ${styles[statusBadge.badgeClass]}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {statusBadge.label}
        </span>
        <div className={styles.statusDivider} />
        <span className={`${styles.badge} ${styles[priorityBadge.badgeClass]}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          {priorityBadge.label}
        </span>
        {task.daysInProgress !== null && (
          <>
            <div className={styles.statusDivider} />
            <div className={styles.statusMeta}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
              </svg>
              Updated {task.daysInProgress} days ago
            </div>
          </>
        )}
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>{task.title}</h1>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Mark Complete
          </button>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                </svg>
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

          {/* Description — Why This Matters */}
          {task.description && (
            <div className={styles.card}>
              <div className={styles.cardLabel}>Why This Matters</div>
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
                <div className={styles.progressTrack} style={{ marginBottom: '16px' }}>
                  <div className={`${styles.progressFill} ${styles.progressFillGreen}`} style={{ width: `${progressPct}%` }} />
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
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>Evidence</div>
              <Link href="/dashboard/evidence" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Evidence
              </Link>
            </div>

            {/* TODO: wire to API — file upload */}
            <div className={styles.uploadZone}>
              <div className={styles.uploadZoneIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className={styles.uploadZoneText}>Drop files here or <span>click to browse</span></div>
              <div className={styles.uploadZoneSub}>PDF, XLSX, DOCX, PNG, JPG &middot; Max 25MB</div>
            </div>

            {task.proofDocuments.length > 0 && (
              <div className={styles.fileList}>
                {task.proofDocuments.map(doc => {
                  const ext = getFileExtension(doc.name)
                  const iconClass = getFileIconClass(doc.name)
                  return (
                    <div key={doc.id} className={styles.fileItem}>
                      <div className={`${styles.fileIcon} ${iconClass}`}>{ext}</div>
                      <div style={{ flex: 1 }}>
                        <div className={styles.fileName}>{doc.name}</div>
                        <div className={styles.fileMeta}>
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <div className={styles.fileActions}>
                        <button className={styles.iconBtn} aria-label="Download">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </button>
                        <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} aria-label="Delete">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Activity Log */}
          {/* TODO: wire to API — activity feed */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>Activity</div>
            </div>
            <div className={styles.activityList}>
              {task.startedAt && (
                <div className={styles.activityItem}>
                  <div className={`${styles.activityAvatar} ${styles.avatarSystem}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                  </div>
                  <div className={styles.activityContent}>
                    <div className={`${styles.activityUser} ${styles.activityUserAi}`}>Exit OS AI Coach</div>
                    <div className={styles.activityText}>
                      Task created and added to your action plan based on your business assessment results.
                    </div>
                    <div className={styles.activityTime}>
                      {new Date(task.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.commentInputRow}>
              <div className={`${styles.activityAvatar} ${styles.avatarBlue}`} style={{ flexShrink: 0, marginTop: '4px' }}>
                ME
              </div>
              <textarea
                className={styles.commentTextarea}
                placeholder="Add a comment or update..."
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} style={{ marginTop: '4px' }}>
                Post
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Task Info Card */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Task Details</div>
            <div className={styles.metaList}>
              {task.assignee && (
                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>Assigned to</div>
                  <div className={styles.metaValue}>
                    <div className={styles.assigneeRow}>
                      <div className={styles.assigneeAvatar}>{assigneeInitials}</div>
                      {task.assignee.name}
                    </div>
                  </div>
                </div>
              )}
              {tag && (
                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>Category</div>
                  <div className={styles.metaValue}>
                    <span className={`${styles.badge} ${styles[getCategoryBadgeClass(tag.class)]}`} style={{ fontSize: '11px' }}>
                      {tag.label}
                    </span>
                  </div>
                </div>
              )}
              {task.startedAt && (
                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>Created</div>
                  <div className={styles.metaValue}>
                    {new Date(task.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              )}
              {progress.total > 0 && (
                <div className={styles.metaRow}>
                  <div className={styles.metaLabel}>Progress</div>
                  <div className={styles.metaValue}>{progress.completed} / {progress.total} subtasks</div>
                </div>
              )}
            </div>
            {progress.total > 0 && (
              <div className={styles.progressTrack} style={{ marginTop: '4px' }}>
                <div className={`${styles.progressFill} ${styles.progressFillGreen}`} style={{ width: `${progressPct}%` }} />
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Quick Actions</div>
            <div className={styles.quickActions}>
              <button className={styles.quickActionBtn}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                Ask AI Coach for Help
              </button>
              <button className={styles.quickActionBtn}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
                Reassign Task
              </button>
              <button className={styles.quickActionBtn}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Change Due Date
              </button>
              <button className={`${styles.quickActionBtn} ${styles.quickActionBtnWarning}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Flag as Blocked
              </button>
            </div>
          </div>

          {/* Related Tasks */}
          {task.relatedTasks.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardLabel}>Related Tasks</div>
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
