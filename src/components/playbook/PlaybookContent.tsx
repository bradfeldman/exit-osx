'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { analytics } from '@/lib/analytics'
import { toast } from 'sonner'
import { motion, AnimatePresence } from '@/lib/motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TaskCard } from './TaskCard'
import { TaskAssignDialog } from './TaskAssignDialog'
import { GenerateActionPlanDialog } from './GenerateActionPlanDialog'
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  Lightbulb,
  Trophy,
  ClipboardCheck,
} from 'lucide-react'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 }
  }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
}

interface TaskUser {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

interface TaskInvite {
  id: string
  email: string
  isPrimary: boolean
  createdAt: string
}

interface ProofDocument {
  id: string
  fileName: string | null
  filePath: string | null
  status: string
}

interface Task {
  id: string
  title: string
  description: string
  actionType: string
  briCategory: string
  rawImpact: string
  normalizedValue: string
  effortLevel: string
  complexity: string
  estimatedHours: number | null
  status: string
  issueTier?: string | null
  dueDate?: string | null
  completionNotes?: string | null
  primaryAssignee?: TaskUser | null
  assignments?: Array<{ user: TaskUser }> | null
  invites?: TaskInvite[] | null
  proofDocuments?: ProofDocument[] | null
}

interface Stats {
  total: number
  pending: number
  inProgress: number
  completed: number
  totalValue: number
  completedValue: number
  inActionPlan: number
  inQueue: number
  maxActionPlan: number
  canRefresh: boolean
}

interface PlaybookContentProps {
  companyId: string
  companyName: string
  expandTaskId?: string
}

const BRI_CATEGORIES = [
  { key: 'FINANCIAL', label: 'Financial', color: 'bg-blue-500' },
  { key: 'TRANSFERABILITY', label: 'Transferability', color: 'bg-green-500' },
  { key: 'OPERATIONAL', label: 'Operations', color: 'bg-yellow-500' },
  { key: 'MARKET', label: 'Market', color: 'bg-purple-500' },
  { key: 'LEGAL_TAX', label: 'Legal & Tax', color: 'bg-red-500' },
  { key: 'PERSONAL', label: 'Personal', color: 'bg-orange-500' },
]

const STATUS_TABS = [
  { value: '', label: 'All', icon: ListTodo },
  { value: 'PENDING', label: 'To Do', icon: Target },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: Clock },
  { value: 'COMPLETED', label: 'Done', icon: CheckCircle2 },
]

export function PlaybookContent({ companyId, companyName, expandTaskId }: PlaybookContentProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<Task | null>(null)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Analytics tracking refs
  const hasTrackedPageView = useRef(false)
  const previousStatusFilter = useRef('')
  const previousCategoryFilter = useRef('')

  // Calculate derived stats for quick wins and high impact
  const taskStats = useMemo(() => {
    const pending = tasks.filter(t => t.status === 'PENDING')

    const quickWins = pending.filter(t =>
      ['MINIMAL', 'LOW'].includes(t.effortLevel) &&
      ['CRITICAL', 'SIGNIFICANT'].includes(t.issueTier || '')
    )

    const highImpact = pending.filter(t =>
      ['CRITICAL', 'SIGNIFICANT'].includes(t.issueTier || '')
    )

    return {
      quickWinCount: quickWins.length,
      highImpactCount: highImpact.length,
      quickWins,
      highImpact,
    }
  }, [tasks])

  const loadTasks = async () => {
    try {
      const params = new URLSearchParams({ companyId })
      if (statusFilter) params.set('status', statusFilter)
      if (categoryFilter) params.set('category', categoryFilter)

      const response = await fetch(`/api/tasks?${params}`)
      if (!response.ok) throw new Error('Failed to fetch tasks')

      const data = await response.json()
      setTasks(data.tasks || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, statusFilter, categoryFilter])

  // Track playbook_viewed when tasks are first loaded
  useEffect(() => {
    if (hasTrackedPageView.current || loading || tasks.length === 0) return
    hasTrackedPageView.current = true

    analytics.track('playbook_viewed', {
      entrySource: expandTaskId ? 'scorecard_link' : 'navigation',
      tasksDisplayed: tasks.length,
    })
  }, [loading, tasks.length, expandTaskId])

  // Track filter changes
  useEffect(() => {
    // Don't track on initial load
    if (previousStatusFilter.current === '' && previousCategoryFilter.current === '' && statusFilter === '' && categoryFilter === '') {
      previousStatusFilter.current = statusFilter
      previousCategoryFilter.current = categoryFilter
      return
    }

    // Track status filter changes
    if (statusFilter !== previousStatusFilter.current) {
      analytics.track('playbook_filter_changed', {
        filterType: 'status',
        filterValue: statusFilter || 'all',
        previousValue: previousStatusFilter.current || 'all',
        tasksMatched: tasks.length,
      })
      previousStatusFilter.current = statusFilter
    }

    // Track category filter changes
    if (categoryFilter !== previousCategoryFilter.current) {
      analytics.track('playbook_filter_changed', {
        filterType: 'category',
        filterValue: categoryFilter || 'all',
        previousValue: previousCategoryFilter.current || 'all',
        tasksMatched: tasks.length,
      })
      previousCategoryFilter.current = categoryFilter
    }
  }, [statusFilter, categoryFilter, tasks.length])

  // Scroll to expanded task when coming from Scorecard
  useEffect(() => {
    if (expandTaskId && !loading && tasks.length > 0) {
      const timer = setTimeout(() => {
        const taskElement = document.getElementById(`task-${expandTaskId}`)
        if (taskElement) {
          taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [expandTaskId, loading, tasks])

  const handleStatusChange = async (taskId: string, newStatus: string, extra?: { blockedReason?: string; completionNotes?: string }) => {
    const task = tasks.find(t => t.id === taskId)
    const taskIndex = tasks.findIndex(t => t.id === taskId)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(extra?.blockedReason && { blockedReason: extra.blockedReason }),
          ...(extra?.completionNotes && { completionNotes: extra.completionNotes }),
        }),
      })

      if (!response.ok) throw new Error('Failed to update task')

      // Track status change analytics
      if (task) {
        if (newStatus === 'IN_PROGRESS') {
          analytics.track('task_started', {
            taskId: task.id,
            taskTitle: task.title,
            taskCategory: task.briCategory,
            issueTier: task.issueTier ?? null,
            effortLevel: task.effortLevel,
            taskNumber: taskIndex + 1,
          })
        } else if (newStatus === 'COMPLETED') {
          analytics.track('task_completed', {
            taskId: task.id,
            taskTitle: task.title,
            taskCategory: task.briCategory,
            issueTier: task.issueTier ?? null,
            effortLevel: task.effortLevel,
            hasEvidence: (task.proofDocuments?.length ?? 0) > 0,
            hasCompletionNotes: !!extra?.completionNotes,
          })

          // Milestone toast at 5 tasks completed
          const newCompletedCount = (stats?.completed ?? 0) + 1
          if (newCompletedCount === 5) {
            toast.success('5 tasks complete!', {
              description: 'Consider retaking your assessment to see your progress.',
              action: {
                label: 'Update Score',
                onClick: () => router.push('/dashboard/assessment/risk'),
              },
              duration: 8000,
            })
          }
        } else if (newStatus === 'DEFERRED' || newStatus === 'NOT_APPLICABLE') {
          analytics.track('task_dismissed', {
            taskId: task.id,
            taskCategory: task.briCategory,
            dismissReason: newStatus === 'DEFERRED' ? 'deferred' : 'not_applicable',
          })
        } else if (newStatus === 'BLOCKED') {
          analytics.track('task_blocked', {
            taskId: task.id,
            taskCategory: task.briCategory,
            blockedReason: extra?.blockedReason,
          })
        }
      }

      await loadTasks()
    } catch (err) {
      console.error('Error updating task:', err)
    }
  }

  const handleAssign = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      setSelectedTaskForAssign(task)
      setAssignDialogOpen(true)
    }
  }

  // Calculate progress percentage
  const progressPercent = stats ? Math.round((stats.completed / Math.max(stats.inActionPlan, 1)) * 100) : 0

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-[400px]"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mx-auto mb-4"
          >
            <Loader2 className="h-10 w-10 text-primary" />
          </motion.div>
          <p className="text-muted-foreground font-medium">Loading your action plan...</p>
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl"
      >
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-destructive mb-1">Unable to load action plan</h3>
            <p className="text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTasks}
              className="mt-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8"
    >
      {/* Hero Section - Value-Focused */}
      <div className="rounded-2xl p-8 md:p-10 bg-gradient-to-br from-sidebar via-sidebar to-sidebar/95 text-sidebar-foreground relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wide">
                Your Value-Building Roadmap
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight mb-3">
              {stats?.completed === 0
                ? "Ready to Increase Your Exit Value?"
                : stats?.completed === stats?.inActionPlan
                  ? "Roadmap Complete!"
                  : `${stats?.completed} Down, ${(stats?.pending || 0) + (stats?.inProgress || 0)} to Go`}
            </h1>

            <p className="text-sidebar-foreground/70 max-w-xl">
              {stats?.completed === 0
                ? "Each task below addresses a specific factor that impacts what buyers will pay. Start with the high-impact items."
                : stats?.completed === stats?.inActionPlan
                  ? "You've completed your action plan. Consider retaking the assessment to identify new opportunities."
                  : "These tasks are prioritized by impact on your BRI score and exit value."}
            </p>

            {/* Quick Win Callout */}
            {stats && stats.pending > 0 && taskStats.quickWinCount > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-emerald-500/20 rounded-lg">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-300">
                  {taskStats.quickWinCount} quick wins available
                </span>
              </div>
            )}
          </div>

          {/* Progress Ring - unchanged but with value context */}
          {stats && stats.inActionPlan > 0 && (
            <div className="flex-shrink-0 text-center">
              <div className="relative w-32 h-32 md:w-40 md:h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="#B87333"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={2 * Math.PI * 54 * (1 - progressPercent / 100)}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl md:text-4xl font-bold font-display">{progressPercent}%</span>
                  <span className="text-xs text-sidebar-foreground/60 uppercase tracking-wide">Complete</span>
                </div>
              </div>
              {/* Add value context below ring */}
              <p className="text-xs text-sidebar-foreground/60 mt-2">
                of value-building tasks
              </p>
            </div>
          )}
        </div>

        {/* Impact Stats Row - Enhanced */}
        {stats && (
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-sidebar-foreground/10">
            {/* Quick Wins */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Zap className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskStats.quickWinCount}</p>
                <p className="text-xs text-sidebar-foreground/60">Quick Wins</p>
              </div>
            </div>

            {/* High Impact */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Target className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskStats.highImpactCount}</p>
                <p className="text-xs text-sidebar-foreground/60">High Impact</p>
              </div>
            </div>

            {/* In Progress */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-sidebar-foreground/60">In Progress</p>
              </div>
            </div>

            {/* Completed */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-sidebar-foreground/60">Completed</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Bar */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex bg-muted/50 rounded-lg p-1 gap-1">
          {STATUS_TABS.map(tab => {
            const Icon = tab.icon
            const count = tab.value === '' ? tasks.length
              : tab.value === 'PENDING' ? stats?.pending
              : tab.value === 'IN_PROGRESS' ? stats?.inProgress
              : stats?.completed
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  statusFilter === tab.value
                    ? 'bg-white dark:bg-gray-800 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {count !== undefined && count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    statusFilter === tab.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-muted-foreground"
          >
            {showFilters ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
            Category Filter
          </Button>
          <Button
            onClick={() => setGenerateDialogOpen(true)}
            size="sm"
            className="shadow-md shadow-primary/20"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Plan
          </Button>
        </div>
      </motion.div>

      {/* Category Filter (Collapsible) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-border/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategoryFilter('')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      categoryFilter === ''
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    All Categories
                  </button>
                  {BRI_CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setCategoryFilter(cat.key)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        categoryFilter === cat.key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Priority Guidance - Show for new users */}
      {stats && stats.completed < 3 && tasks.length > 0 && !statusFilter && !categoryFilter && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/5 to-amber-500/5 border border-primary/20 rounded-xl p-5"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Where to Start</h3>
              <p className="text-sm text-muted-foreground">
                Look for tasks marked <span className="font-medium text-emerald-600">&quot;Quick&quot;</span> effort
                with <span className="font-medium text-amber-600">&quot;High Impact&quot;</span> —
                these give you the most value improvement for the least work.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Playbook Completion State */}
      {stats && stats.pending === 0 && stats.inProgress === 0 && stats.completed > 0 && !statusFilter && !categoryFilter && (
        <Card className="bg-gradient-to-br from-emerald-50 to-primary/5 border-emerald-200">
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 mx-auto mb-4 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Roadmap Complete!
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              You&apos;ve completed all your action items. Retake the assessment to see
              how your BRI score has improved — and identify any new opportunities.
            </p>
            <Button
              onClick={() => router.push('/dashboard/assessment/risk')}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Measure My Progress
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      <AnimatePresence mode="wait">
        {tasks.length === 0 && !statusFilter && !categoryFilter ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mx-auto mb-6 flex items-center justify-center">
                  <Target className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Your Roadmap Awaits
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-2">
                  Complete your BRI Assessment to generate a personalized action plan.
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                  Each task will be tailored to your business&apos;s specific strengths and gaps,
                  designed to maximize your exit value.
                </p>
                <Button
                  onClick={() => router.push('/dashboard/assessment/risk')}
                  size="lg"
                  className="shadow-lg shadow-primary/20"
                >
                  <ClipboardCheck className="h-5 w-5 mr-2" />
                  Take Assessment First
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : tasks.length === 0 ? (
          <motion.div
            key="no-matches"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-dashed border-2">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted/50 to-muted/20 mx-auto mb-6 flex items-center justify-center">
                  <ListTodo className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No matching tasks
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Try adjusting your filters to see more tasks.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('')
                    setCategoryFilter('')
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                {statusFilter && ` \u2022 ${STATUS_TABS.find(t => t.value === statusFilter)?.label}`}
                {categoryFilter && ` \u2022 ${BRI_CATEGORIES.find(c => c.key === categoryFilter)?.label}`}
              </p>
            </div>

            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                id={`task-${task.id}`}
                variants={itemVariants}
                custom={index}
              >
                <TaskCard
                  task={task}
                  onStatusChange={handleStatusChange}
                  onAssign={handleAssign}
                  onTaskUpdate={loadTasks}
                  defaultExpanded={task.id === expandTaskId}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assignment Dialog */}
      {selectedTaskForAssign && (
        <TaskAssignDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          taskId={selectedTaskForAssign.id}
          taskTitle={selectedTaskForAssign.title}
          companyId={companyId}
          currentAssigneeId={selectedTaskForAssign.primaryAssignee?.id}
          currentDueDate={selectedTaskForAssign.dueDate}
          onSave={loadTasks}
        />
      )}

      {/* Generate Action Plan Dialog */}
      <GenerateActionPlanDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        companyId={companyId}
        currentTaskCount={tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'NOT_APPLICABLE').length}
        onSuccess={loadTasks}
      />
    </motion.div>
  )
}
