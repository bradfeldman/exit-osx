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
  ClipboardList,
  CheckCircle2,
  Clock,
  ListTodo,
  Filter,
  DollarSign,
  Users,
  Settings,
  Target,
  Scale,
  User
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

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
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

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial Health',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

const CATEGORY_ICONS: Record<string, typeof DollarSign> = {
  FINANCIAL: DollarSign,
  TRANSFERABILITY: Users,
  OPERATIONAL: Settings,
  MARKET: Target,
  LEGAL_TAX: Scale,
  PERSONAL: User,
}

const STATUS_FILTERS = [
  { value: '', label: 'All Tasks' },
  { value: 'PENDING', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
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
      // Small delay to ensure the DOM has rendered
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

      // Reload tasks to get updated stats
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
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">Action Plan</h1>
          <p className="text-muted-foreground mt-1">{companyName}</p>
        </div>
        <Button
          onClick={() => setGenerateDialogOpen(true)}
          className="flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Generate Action Plan
        </Button>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-foreground">{stats.inActionPlan}</p>
                <p className="text-xs text-muted-foreground">of {stats.maxActionPlan} tasks</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ListTodo className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-foreground">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">To Do</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-foreground">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-foreground">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filter Tasks</span>
            </div>
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
                <div className="flex gap-2">
                  {STATUS_FILTERS.map(filter => (
                    <Button
                      key={filter.value}
                      variant={statusFilter === filter.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(filter.value)}
                      className={statusFilter === filter.value ? 'shadow-md' : ''}
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={categoryFilter === '' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter('')}
                    className={categoryFilter === '' ? 'shadow-md' : ''}
                  >
                    All
                  </Button>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => {
                    const Icon = CATEGORY_ICONS[value]
                    return (
                      <Button
                        key={value}
                        variant={categoryFilter === value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCategoryFilter(value)}
                        className={categoryFilter === value ? 'shadow-md' : ''}
                      >
                        {Icon && <Icon className="h-3.5 w-3.5 mr-1.5" />}
                        {label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <ClipboardList className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {statusFilter || categoryFilter ? 'No matching tasks' : 'No action plan yet'}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {statusFilter || categoryFilter
                    ? 'Try adjusting your filters to see more tasks.'
                    : 'Complete the BRI assessment to generate your personalized action plan with prioritized tasks.'}
                </p>
                {!statusFilter && !categoryFilter && (
                  <Button
                    onClick={() => setGenerateDialogOpen(true)}
                    className="mt-6"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate Action Plan
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
            className="space-y-4"
          >
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
