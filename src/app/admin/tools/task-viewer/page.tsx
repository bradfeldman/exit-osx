'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import styles from '@/components/admin/admin-tools.module.css'

interface Company {
  id: string
  name: string
}

interface QuestionOption {
  id: string
  text: string
  score: number
  isSelected: boolean
}

interface LinkedQuestionDetails {
  questionText: string
  helpText: string | null
  category: string
  options: QuestionOption[]
  selectedResponse: {
    text: string
    score: number
  } | null
}

interface UpgradeOption {
  id: string
  text: string
  score: number
}

interface UpgradePath {
  from: UpgradeOption | null
  to: UpgradeOption | null
}

interface Task {
  id: string
  title: string
  description: string
  status: string
  actionType: string
  briCategory: string
  rawImpact: number
  normalizedValue: number
  effortLevel: string
  complexity: string
  estimatedHours: number | null
  deferredUntil: string | null
  completedAt: string | null
  linkedQuestionId: string | null
  linkedQuestionDetails: LinkedQuestionDetails | null
  upgradePath: UpgradePath | null
  createdAt: string
  updatedAt: string
}

interface TaskStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  deferred: number
  blocked: number
  cancelled: number
  totalValue: number
  completedValue: number
  recoverableValue: number
}

const STATUS_CONFIG: Record<string, { label: string; statCard: string; statNumber: string }> = {
  PENDING:     { label: 'Pending',     statCard: styles.statCardPending,    statNumber: styles.statNumberPending    },
  IN_PROGRESS: { label: 'In Progress', statCard: styles.statCardInProgress, statNumber: styles.statNumberInProgress },
  COMPLETED:   { label: 'Completed',   statCard: styles.statCardCompleted,  statNumber: styles.statNumberCompleted  },
  DEFERRED:    { label: 'Deferred',    statCard: styles.statCardDeferred,   statNumber: styles.statNumberDeferred   },
  BLOCKED:     { label: 'Blocked',     statCard: styles.statCardBlocked,    statNumber: styles.statNumberBlocked    },
  CANCELLED:   { label: 'Cancelled',   statCard: styles.statCardCancelled,  statNumber: styles.statNumberCancelled  },
}

// Badge color classes (Tailwind — retained since Badge is a kept shadcn component)
const STATUS_BADGE: Record<string, { color: string; bgColor: string }> = {
  PENDING:     { color: 'text-gray-600',   bgColor: 'bg-gray-100'   },
  IN_PROGRESS: { color: 'text-blue-600',   bgColor: 'bg-blue-100'   },
  COMPLETED:   { color: 'text-green-600',  bgColor: 'bg-green-100'  },
  DEFERRED:    { color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  BLOCKED:     { color: 'text-red-600',    bgColor: 'bg-red-100'    },
  CANCELLED:   { color: 'text-gray-400',   bgColor: 'bg-gray-50'    },
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL:      'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL:    'Operational',
  MARKET:         'Market',
  LEGAL_TAX:      'Legal & Tax',
  PERSONAL:       'Personal',
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  TYPE_I_EVIDENCE:              'I. Evidence',
  TYPE_II_DOCUMENTATION:        'II. Documentation',
  TYPE_III_OPERATIONAL_CHANGE:  'III. Operational',
  TYPE_IV_INSTITUTIONALIZATION: 'IV. Institutionalization',
  TYPE_V_RISK_REDUCTION:        'V. Risk Reduction',
  TYPE_VI_ALIGNMENT:            'VI. Alignment',
  TYPE_VII_READINESS:           'VII. Readiness',
  TYPE_VIII_SIGNALING:          'VIII. Signaling',
  TYPE_IX_OPTION_CREATION:      'IX. Option Creation',
  TYPE_X_DEFER:                 'X. Defer',
}

function getScoreClass(score: number): string {
  if (score >= 0.8) return styles.scoreGreen
  if (score >= 0.5) return styles.scoreYellow
  return styles.scoreRed
}

export default function AdminTaskViewerPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompanyId) {
      loadTasks()
    } else {
      setTasks([])
      setStats(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, statusFilter, categoryFilter])

  async function loadCompanies() {
    try {
      const response = await fetch('/api/admin/companies')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])
      }
    } catch (error) {
      console.error('Failed to load companies:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadTasks() {
    if (!selectedCompanyId) return

    setLoadingTasks(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter)

      const response = await fetch(
        `/api/developer/tasks/${selectedCompanyId}?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error('Failed to load tasks')
      }

      const data = await response.json()
      setTasks(data.tasks)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoadingTasks(false)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Task Viewer</h1>
        <p className={styles.pageDescription}>
          View and debug tasks for any company
        </p>
      </div>

      {/* Company Selector */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Select Company</h2>
          <p className={styles.cardDescription}>
            Choose a company to view its tasks
          </p>
        </div>
        <div className={styles.cardContent}>
          {loading ? (
            <div className={styles.loadingRow}>
              <div className={styles.spinner} />
              <span className={styles.loadingText}>Loading companies...</span>
            </div>
          ) : (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className={styles.companySelect}
            >
              <option value="">Select a company...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selectedCompanyId && (
        <>
          {/* Stats Summary */}
          {stats && (
            <div className={styles.statCardsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{stats.total}</div>
                <div className={styles.statLabel}>Total</div>
              </div>
              <div className={STATUS_CONFIG.PENDING.statCard}>
                <div className={STATUS_CONFIG.PENDING.statNumber}>{stats.pending}</div>
                <div className={styles.statLabel}>Pending</div>
              </div>
              <div className={STATUS_CONFIG.IN_PROGRESS.statCard}>
                <div className={STATUS_CONFIG.IN_PROGRESS.statNumber}>{stats.inProgress}</div>
                <div className={styles.statLabel}>In Progress</div>
              </div>
              <div className={STATUS_CONFIG.COMPLETED.statCard}>
                <div className={STATUS_CONFIG.COMPLETED.statNumber}>{stats.completed}</div>
                <div className={styles.statLabel}>Completed</div>
              </div>
              <div className={STATUS_CONFIG.DEFERRED.statCard}>
                <div className={STATUS_CONFIG.DEFERRED.statNumber}>{stats.deferred}</div>
                <div className={styles.statLabel}>Deferred</div>
              </div>
              <div className={STATUS_CONFIG.BLOCKED.statCard}>
                <div className={STATUS_CONFIG.BLOCKED.statNumber}>{stats.blocked}</div>
                <div className={styles.statLabel}>Blocked</div>
              </div>
              <div className={STATUS_CONFIG.CANCELLED.statCard}>
                <div className={STATUS_CONFIG.CANCELLED.statNumber}>{stats.cancelled}</div>
                <div className={styles.statLabel}>Cancelled</div>
              </div>
            </div>
          )}

          {/* Value Summary */}
          {stats && (
            <div className={styles.card}>
              <div className={styles.cardContentPy}>
                <div className={styles.valueSummary}>
                  <div className={styles.valueSummaryItem}>
                    <div className={styles.valueSummaryAmount}>{formatCurrency(stats.totalValue)}</div>
                    <div className={styles.valueSummaryLabel}>Total Task Value</div>
                  </div>
                  <div className={styles.valueSummaryItem}>
                    <div className={styles.valueSummaryAmountGreen}>{formatCurrency(stats.completedValue)}</div>
                    <div className={styles.valueSummaryLabel}>Value Captured</div>
                  </div>
                  <div className={styles.valueSummaryItem}>
                    <div className={styles.valueSummaryAmountBlue}>{formatCurrency(stats.recoverableValue)}</div>
                    <div className={styles.valueSummaryLabel}>Recoverable Value</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className={styles.card}>
            <div className={styles.cardHeaderCompact}>
              <h2 className={styles.cardTitle}>Filters</h2>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.filtersRow}>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="DEFERRED">Deferred</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="ALL">All Categories</option>
                    <option value="FINANCIAL">Financial</option>
                    <option value="TRANSFERABILITY">Transferability</option>
                    <option value="OPERATIONAL">Operational</option>
                    <option value="MARKET">Market</option>
                    <option value="LEGAL_TAX">Legal &amp; Tax</option>
                    <option value="PERSONAL">Personal</option>
                  </select>
                </div>
                <div>
                  <Button onClick={loadTasks} variant="outline" disabled={loadingTasks}>
                    {loadingTasks ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className={styles.bannerError}>{error}</div>
          )}

          {/* Task List */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                Tasks ({tasks.length})
              </h2>
              <p className={styles.cardDescription}>
                Click on a task to see full details
              </p>
            </div>
            <div className={styles.cardContent}>
              {loadingTasks ? (
                <div className={styles.emptyStateText}>Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className={styles.emptyStateText}>
                  No tasks found matching the selected filters.
                </div>
              ) : (
                <div className={styles.taskList}>
                  {tasks.map((task) => {
                    const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING
                    const badgeConfig = STATUS_BADGE[task.status] || STATUS_BADGE.PENDING
                    const isExpanded = expandedTaskId === task.id

                    return (
                      <div
                        key={task.id}
                        className={isExpanded ? styles.taskItemExpanded : styles.taskItem}
                      >
                        {/* Task Summary Row */}
                        <button
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          className={styles.taskSummaryButton}
                        >
                          <div className={styles.taskSummaryInner}>
                            <div className={styles.taskMeta}>
                              <div className={styles.taskBadges}>
                                <Badge
                                  variant="outline"
                                  className={`${badgeConfig.bgColor} ${badgeConfig.color} border-0`}
                                >
                                  {statusConfig.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {CATEGORY_LABELS[task.briCategory] || task.briCategory}
                                </Badge>
                                <span className={styles.taskActionType}>
                                  {ACTION_TYPE_LABELS[task.actionType] || task.actionType}
                                </span>
                              </div>
                              <h3 className={styles.taskTitle}>{task.title}</h3>
                            </div>
                            <div className={styles.taskRight}>
                              <div className={styles.taskImpact}>{formatCurrency(task.rawImpact)}</div>
                              <div className={styles.taskEffort}>{task.effortLevel}</div>
                            </div>
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className={styles.taskDetails}>
                            {/* Upgrade Path Section */}
                            {task.upgradePath && task.upgradePath.from && task.upgradePath.to && (
                              <div className={styles.upgradePath}>
                                <h4 className={styles.upgradePathTitle}>
                                  <svg className={styles.upgradePathIcon} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                                  </svg>
                                  Answer Upgrade Path
                                </h4>
                                <div className={styles.upgradePathRow}>
                                  <div className={styles.upgradeBox}>
                                    <div className={styles.upgradeBoxLabel}>Current Answer</div>
                                    <div className={styles.upgradeBoxText}>{task.upgradePath.from.text}</div>
                                    <div className={styles.upgradeBoxScore}>
                                      Score: {task.upgradePath.from.score.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className={styles.upgradeArrow}>
                                    <span style={{ fontSize: '1.125rem' }}>→</span>
                                    <span className={styles.upgradeArrowLabel}>upgrades to</span>
                                  </div>
                                  <div className={styles.upgradeBoxTarget}>
                                    <div className={styles.upgradeBoxLabel}>Target Answer</div>
                                    <div className={styles.upgradeBoxTextTarget}>{task.upgradePath.to.text}</div>
                                    <div className={styles.upgradeBoxScore}>
                                      Score: {task.upgradePath.to.score.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                                <p className={styles.upgradePathNote}>
                                  Completing this task will upgrade the effective answer from {task.upgradePath.from.score.toFixed(2)} to {task.upgradePath.to.score.toFixed(2)}, improving the BRI score.
                                </p>
                              </div>
                            )}

                            {/* Linked Question Section */}
                            {task.linkedQuestionDetails && (
                              <div className={styles.linkedQuestion}>
                                <h4 className={styles.linkedQuestionTitle}>
                                  <svg className={styles.linkedQuestionIcon} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                                  </svg>
                                  Triggering Assessment Response
                                </h4>
                                <p className={styles.linkedQuestionText}>
                                  {task.linkedQuestionDetails.questionText}
                                </p>
                                {task.linkedQuestionDetails.helpText && (
                                  <p className={styles.linkedQuestionHelp}>
                                    {task.linkedQuestionDetails.helpText}
                                  </p>
                                )}
                                <div className={styles.linkedQuestionOptions}>
                                  {task.linkedQuestionDetails.options.map((option, idx) => (
                                    <div
                                      key={option.id}
                                      className={option.isSelected ? styles.linkedQuestionOptionSelected : styles.linkedQuestionOption}
                                    >
                                      <span>
                                        {idx + 1}. {option.text}
                                        {option.isSelected && (
                                          <span className={styles.linkedQuestionUserTag}>← User&apos;s Response</span>
                                        )}
                                      </span>
                                      <span className={getScoreClass(option.score)}>
                                        {option.score.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                {task.linkedQuestionDetails.selectedResponse && (
                                  <p className={styles.linkedQuestionNote}>
                                    This task was generated because the response score ({task.linkedQuestionDetails.selectedResponse.score.toFixed(2)}) indicates risk that can be mitigated.
                                  </p>
                                )}
                              </div>
                            )}

                            <div className={styles.taskDetailsGrid}>
                              <div>
                                <h4 className={styles.taskDetailSectionTitle}>Description</h4>
                                <p className={styles.taskDetailDesc}>{task.description}</p>
                              </div>
                              <div className={styles.taskDetailMeta}>
                                <div className={styles.taskDetailRow}>
                                  <span className={styles.taskDetailRowLabel}>Normalized Value:</span>
                                  <span className={styles.taskDetailRowValue}>{formatCurrency(task.normalizedValue)}</span>
                                </div>
                                <div className={styles.taskDetailRow}>
                                  <span className={styles.taskDetailRowLabel}>Complexity:</span>
                                  <span className={styles.taskDetailRowValue}>{task.complexity}</span>
                                </div>
                                {task.estimatedHours && (
                                  <div className={styles.taskDetailRow}>
                                    <span className={styles.taskDetailRowLabel}>Est. Hours:</span>
                                    <span className={styles.taskDetailRowValue}>{task.estimatedHours}h</span>
                                  </div>
                                )}
                                {task.deferredUntil && (
                                  <div className={styles.taskDetailRow}>
                                    <span className={styles.taskDetailRowLabel}>Deferred Until:</span>
                                    <span className={styles.taskDetailRowValue}>
                                      {new Date(task.deferredUntil).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {task.completedAt && (
                                  <div className={styles.taskDetailRow}>
                                    <span className={styles.taskDetailRowLabel}>Completed:</span>
                                    <span className={styles.taskDetailRowValue}>
                                      {new Date(task.completedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className={styles.taskIdRow}>
                              ID: {task.id}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!selectedCompanyId && (
        <div className={styles.card}>
          <div className={styles.emptyState}>
            Select a company above to view its tasks.
          </div>
        </div>
      )}
    </div>
  )
}
