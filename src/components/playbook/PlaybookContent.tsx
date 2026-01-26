'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  TrendingDown,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target
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

  const handleStatusChange = async (taskId: string, newStatus: string, extra?: { blockedReason?: string }) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(extra?.blockedReason && { blockedReason: extra.blockedReason }),
        }),
      })

      if (!response.ok) throw new Error('Failed to update task')
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
      {/* Hero Section - The WHY */}
      <motion.div variants={itemVariants}>
        <div
          className="relative overflow-hidden rounded-2xl p-8 md:p-10"
          style={{ background: 'linear-gradient(to bottom right, #3D3D3D, #1F1F1F)' }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: 'rgba(184, 115, 51, 0.15)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" style={{ backgroundColor: 'rgba(184, 115, 51, 0.08)' }} />

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary uppercase tracking-wide">Your Value-Building Playbook</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight mb-3">
                  Every Task Completed<br />
                  <span className="text-primary">Reduces Buyer Risk</span>
                </h1>
                <p className="text-gray-400 max-w-xl">
                  These tasks are personalized based on your assessment. Complete them to improve your Buyer Readiness Index and maximize your exit value.
                </p>
              </div>

              {/* Progress Ring */}
              {stats && stats.inActionPlan > 0 && (
                <div className="flex-shrink-0">
                  <div className="relative w-32 h-32 md:w-40 md:h-40">
                    {/* Background circle */}
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="54"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="12"
                      />
                      <motion.circle
                        cx="60"
                        cy="60"
                        r="54"
                        fill="none"
                        stroke="#B87333"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 54}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 54 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 54 * (1 - progressPercent / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <span className="text-3xl md:text-4xl font-bold font-display">{progressPercent}%</span>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Complete</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Impact Stats Row */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <ListTodo className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.pending}</p>
                    <p className="text-xs text-gray-400">To Do</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Clock className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
                    <p className="text-xs text-gray-400">In Progress</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.completed}</p>
                    <p className="text-xs text-gray-400">Completed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#B87333]/20">
                    <TrendingDown className="h-5 w-5 text-[#B87333]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.inActionPlan}</p>
                    <p className="text-xs text-gray-400">Total Tasks</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

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

      {/* Task List */}
      <AnimatePresence mode="wait">
        {tasks.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-dashed border-2">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mx-auto mb-6 flex items-center justify-center">
                  <TrendingUp className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {statusFilter || categoryFilter ? 'No matching tasks' : 'Ready to Build Value?'}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  {statusFilter || categoryFilter
                    ? 'Try adjusting your filters to see more tasks.'
                    : 'Generate your personalized action plan based on your assessment. Each task is designed to reduce buyer risk and increase your exit value.'}
                </p>
                {!statusFilter && !categoryFilter && (
                  <Button
                    onClick={() => setGenerateDialogOpen(true)}
                    size="lg"
                    className="shadow-lg shadow-primary/20"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate My Action Plan
                  </Button>
                )}
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
