'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCompany } from '@/contexts/CompanyContext'

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

interface TaskViewerProps {
  onBack: () => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: 'Pending', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
  DEFERRED: { label: 'Deferred', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  BLOCKED: { label: 'Blocked', color: 'text-red-600', bgColor: 'bg-red-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-400', bgColor: 'bg-gray-50' },
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operational',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal',
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  TYPE_I_EVIDENCE: 'I. Evidence',
  TYPE_II_DOCUMENTATION: 'II. Documentation',
  TYPE_III_OPERATIONAL_CHANGE: 'III. Operational',
  TYPE_IV_INSTITUTIONALIZATION: 'IV. Institutionalization',
  TYPE_V_RISK_REDUCTION: 'V. Risk Reduction',
  TYPE_VI_ALIGNMENT: 'VI. Alignment',
  TYPE_VII_READINESS: 'VII. Readiness',
  TYPE_VIII_SIGNALING: 'VIII. Signaling',
  TYPE_IX_OPTION_CREATION: 'IX. Option Creation',
  TYPE_X_DEFER: 'X. Defer',
}

export function TaskViewer({ onBack }: TaskViewerProps) {
  const { selectedCompanyId, selectedCompany } = useCompany()
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedCompanyId) {
      loadTasks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, statusFilter, categoryFilter])

  async function loadTasks() {
    if (!selectedCompanyId) return

    setLoading(true)
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
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)

  if (!selectedCompanyId) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No company selected. Please select a company first.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2">
            ← Back to Task Engine
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Task Viewer</h1>
          <p className="text-sm text-muted-foreground">
            View all tasks for {selectedCompany?.name || 'selected company'}
          </p>
        </div>
        <Button onClick={loadTasks} variant="outline" disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="p-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </Card>
          <Card className={`p-3 ${STATUS_CONFIG.PENDING.bgColor}`}>
            <div className={`text-2xl font-bold ${STATUS_CONFIG.PENDING.color}`}>
              {stats.pending}
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </Card>
          <Card className={`p-3 ${STATUS_CONFIG.IN_PROGRESS.bgColor}`}>
            <div className={`text-2xl font-bold ${STATUS_CONFIG.IN_PROGRESS.color}`}>
              {stats.inProgress}
            </div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </Card>
          <Card className={`p-3 ${STATUS_CONFIG.COMPLETED.bgColor}`}>
            <div className={`text-2xl font-bold ${STATUS_CONFIG.COMPLETED.color}`}>
              {stats.completed}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </Card>
          <Card className={`p-3 ${STATUS_CONFIG.DEFERRED.bgColor}`}>
            <div className={`text-2xl font-bold ${STATUS_CONFIG.DEFERRED.color}`}>
              {stats.deferred}
            </div>
            <div className="text-xs text-muted-foreground">Deferred</div>
          </Card>
          <Card className={`p-3 ${STATUS_CONFIG.BLOCKED.bgColor}`}>
            <div className={`text-2xl font-bold ${STATUS_CONFIG.BLOCKED.color}`}>
              {stats.blocked}
            </div>
            <div className="text-xs text-muted-foreground">Blocked</div>
          </Card>
          <Card className={`p-3 ${STATUS_CONFIG.CANCELLED.bgColor}`}>
            <div className={`text-2xl font-bold ${STATUS_CONFIG.CANCELLED.color}`}>
              {stats.cancelled}
            </div>
            <div className="text-xs text-muted-foreground">Cancelled</div>
          </Card>
        </div>
      )}

      {/* Value Summary */}
      {stats && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-6 justify-center text-center">
              <div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats.totalValue)}
                </div>
                <div className="text-xs text-muted-foreground">Total Task Value</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(stats.completedValue)}
                </div>
                <div className="text-xs text-muted-foreground">Value Captured</div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency(stats.recoverableValue)}
                </div>
                <div className="text-xs text-muted-foreground">Recoverable Value</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm"
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
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm"
              >
                <option value="ALL">All Categories</option>
                <option value="FINANCIAL">Financial</option>
                <option value="TRANSFERABILITY">Transferability</option>
                <option value="OPERATIONAL">Operational</option>
                <option value="MARKET">Market</option>
                <option value="LEGAL_TAX">Legal & Tax</option>
                <option value="PERSONAL">Personal</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Tasks ({tasks.length})
          </CardTitle>
          <CardDescription>
            Click on a task to see full details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No tasks found matching the selected filters.
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING
                const isExpanded = expandedTaskId === task.id

                return (
                  <div
                    key={task.id}
                    className={`border rounded-lg transition-all ${
                      isExpanded ? 'ring-2 ring-primary' : 'hover:border-gray-300'
                    }`}
                  >
                    {/* Task Summary Row */}
                    <button
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className="w-full p-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
                            >
                              {statusConfig.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {CATEGORY_LABELS[task.briCategory] || task.briCategory}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {ACTION_TYPE_LABELS[task.actionType] || task.actionType}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900 mt-1 truncate">
                            {task.title}
                          </h3>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(task.rawImpact)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {task.effortLevel}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t bg-gray-50">
                        {/* Upgrade Path Section */}
                        {task.upgradePath && task.upgradePath.from && task.upgradePath.to && (
                          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <h4 className="font-medium text-emerald-800 mb-2 flex items-center gap-2">
                              <ArrowUpIcon className="h-4 w-4" />
                              Answer Upgrade Path
                            </h4>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 p-2 bg-white rounded border border-emerald-200">
                                <div className="text-xs text-emerald-600 mb-1">Current Answer</div>
                                <div className="text-sm text-gray-900">{task.upgradePath.from.text}</div>
                                <div className="text-xs font-mono text-emerald-700 mt-1">
                                  Score: {task.upgradePath.from.score.toFixed(2)}
                                </div>
                              </div>
                              <div className="flex flex-col items-center text-emerald-600">
                                <span className="text-lg">→</span>
                                <span className="text-[10px]">upgrades to</span>
                              </div>
                              <div className="flex-1 p-2 bg-emerald-100 rounded border-2 border-emerald-300">
                                <div className="text-xs text-emerald-600 mb-1">Target Answer</div>
                                <div className="text-sm font-medium text-emerald-900">{task.upgradePath.to.text}</div>
                                <div className="text-xs font-mono text-emerald-700 mt-1">
                                  Score: {task.upgradePath.to.score.toFixed(2)}
                                </div>
                              </div>
                            </div>
                            <p className="mt-2 text-xs text-emerald-700">
                              Completing this task will upgrade the effective answer from {task.upgradePath.from.score.toFixed(2)} to {task.upgradePath.to.score.toFixed(2)}, improving the BRI score.
                            </p>
                          </div>
                        )}

                        {/* Linked Question Section */}
                        {task.linkedQuestionDetails && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                              <QuestionMarkIcon className="h-4 w-4" />
                              Triggering Assessment Response
                            </h4>
                            <p className="text-sm text-blue-900 font-medium mb-2">
                              {task.linkedQuestionDetails.questionText}
                            </p>
                            {task.linkedQuestionDetails.helpText && (
                              <p className="text-xs text-blue-700 italic mb-3">
                                {task.linkedQuestionDetails.helpText}
                              </p>
                            )}
                            <div className="space-y-1">
                              {task.linkedQuestionDetails.options.map((option, idx) => (
                                <div
                                  key={option.id}
                                  className={`flex items-center justify-between text-xs p-2 rounded ${
                                    option.isSelected
                                      ? 'bg-blue-200 border-2 border-blue-400 font-medium'
                                      : 'bg-white border border-blue-100'
                                  }`}
                                >
                                  <span className={option.isSelected ? 'text-blue-900' : 'text-gray-600'}>
                                    {idx + 1}. {option.text}
                                    {option.isSelected && (
                                      <span className="ml-2 text-blue-600">← User&apos;s Response</span>
                                    )}
                                  </span>
                                  <span className={`${getScoreColor(option.score)} font-mono`}>
                                    {option.score.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {task.linkedQuestionDetails.selectedResponse && (
                              <p className="mt-2 text-xs text-blue-700">
                                This task was generated because the response score ({task.linkedQuestionDetails.selectedResponse.score.toFixed(2)}) indicates risk that can be mitigated.
                              </p>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">Description</h4>
                            <p className="text-gray-600">{task.description}</p>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-muted-foreground">Normalized Value:</span>{' '}
                              <span className="font-medium">{formatCurrency(task.normalizedValue)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Complexity:</span>{' '}
                              <span className="font-medium">{task.complexity}</span>
                            </div>
                            {task.estimatedHours && (
                              <div>
                                <span className="text-muted-foreground">Est. Hours:</span>{' '}
                                <span className="font-medium">{task.estimatedHours}h</span>
                              </div>
                            )}
                            {task.deferredUntil && (
                              <div>
                                <span className="text-muted-foreground">Deferred Until:</span>{' '}
                                <span className="font-medium">
                                  {new Date(task.deferredUntil).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {task.completedAt && (
                              <div>
                                <span className="text-muted-foreground">Completed:</span>{' '}
                                <span className="font-medium">
                                  {new Date(task.completedAt).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                          ID: {task.id}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function QuestionMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  )
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
    </svg>
  )
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return 'text-green-600'
  if (score >= 0.5) return 'text-yellow-600'
  return 'text-red-600'
}
