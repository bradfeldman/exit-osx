'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import {
  ArrowRight,
  TrendingUp,
  Clock,
  ChevronRight,
  LayoutDashboard,
  Loader2,
} from 'lucide-react'

interface DashboardData {
  company: {
    id: string
    name: string
  }
  tier1: {
    currentValue: number
    potentialValue: number
    valueGap: number
    briScore: number | null
  }
  tier4: {
    taskStats: {
      total: number
      completed: number
      completedValue: number
      recoverableValue: number
    }
  }
}

interface Task {
  id: string
  title: string
  description: string
  briCategory: string
  rawImpact: string
  estimatedHours: number | null
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}k`
  }
  return `$${value.toLocaleString()}`
}

function formatCategory(category: string): string {
  const labels: Record<string, string> = {
    FINANCIAL: 'Financial',
    TRANSFERABILITY: 'Transferability',
    OPERATIONAL: 'Operations',
    MARKET: 'Market',
    LEGAL_TAX: 'Legal',
    PERSONAL: 'Personal',
  }
  return labels[category] || category
}

interface ValueBuilderClientProps {
  userName?: string
}

export function ValueBuilderClient({ userName }: ValueBuilderClientProps) {
  const router = useRouter()
  const { selectedCompanyId } = useCompany()
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isStarting, setIsStarting] = useState(false)

  // Fetch dashboard data
  useEffect(() => {
    if (!selectedCompanyId) return

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [dashboardRes, tasksRes] = await Promise.all([
          fetch(`/api/companies/${selectedCompanyId}/dashboard`),
          fetch(`/api/companies/${selectedCompanyId}/tasks?status=PENDING,IN_PROGRESS&limit=5`),
        ])

        if (dashboardRes.ok) {
          const data = await dashboardRes.json()
          setDashboardData(data)
        }

        if (tasksRes.ok) {
          const data = await tasksRes.json()
          setTasks(data.tasks || [])
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedCompanyId])

  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { tier1, tier4 } = dashboardData
  const briScore = tier1.briScore || 50
  const currentValue = tier1.currentValue || 0
  const potentialValue = tier1.potentialValue || 0
  const valueGap = tier1.valueGap || 0
  const totalRecovered = tier4.taskStats.completedValue || 0
  const tasksCompleted = tier4.taskStats.completed || 0
  const totalTasks = tier4.taskStats.total || 0

  const progressPercent = potentialValue > 0 ? (currentValue / potentialValue) * 100 : 0

  // Calculate circumference for SVG ring
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (briScore / 100) * circumference

  // Show dashboard teaser after $1M recovered OR 3 tasks
  const showDashboardTeaser = totalRecovered >= 1000000 || tasksCompleted >= 3

  // Get next task (first pending task)
  const nextTask = tasks[0]
  const upcomingTasks = tasks.slice(1, 4)

  const handleStartTask = () => {
    if (!nextTask) return
    setIsStarting(true)
    router.push(`/dashboard/action-plan?task=${nextTask.id}`)
  }

  const handleViewAllTasks = () => {
    router.push('/dashboard/action-plan')
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Value Builder
              </span>
              {userName && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Welcome back, {userName.split(' ')[0]}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoToDashboard}
              className="text-muted-foreground"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Score & Stats Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6"
        >
          <div className="flex items-center gap-6">
            {/* BRI Score Ring */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted"
                />
                <motion.circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-primary"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, delay: 0.2 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{briScore}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">BRI</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalRecovered)}
                </p>
                <p className="text-xs text-muted-foreground">Value Recovered</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(valueGap)}
                </p>
                <p className="text-xs text-muted-foreground">Gap Remaining</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {tasksCompleted} of {totalTasks}
                </p>
                <p className="text-xs text-muted-foreground">Tasks Done</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              Current: <strong className="text-foreground">{formatCurrency(currentValue)}</strong>
            </span>
            <span className="text-muted-foreground">
              Potential: <strong className="text-foreground">{formatCurrency(potentialValue)}</strong>
            </span>
          </div>
          <div className="relative h-6 bg-muted rounded-full overflow-visible">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
            <motion.div
              className="absolute -top-6 flex flex-col items-center"
              initial={{ left: 0, opacity: 0 }}
              animate={{ left: `${progressPercent}%`, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              style={{ transform: 'translateX(-50%)' }}
            >
              <span className="text-xs font-semibold text-primary">You</span>
              <span className="text-primary">▼</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Next Task Card */}
        {nextTask && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl border-2 border-primary p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                Highest ROI
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4" />
                ~{(nextTask.estimatedHours || 1) * 60} min
              </span>
            </div>

            <h3 className="text-xl font-bold text-foreground mb-2">
              {nextTask.title}
            </h3>
            <p className="text-muted-foreground mb-6 line-clamp-2">
              {nextTask.description}
            </p>

            <div className="grid grid-cols-3 gap-4 py-4 border-y border-border mb-6">
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(Number(nextTask.rawImpact))}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Value Impact</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">
                  {formatCategory(nextTask.briCategory)}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Risk Category</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">
                  {briScore} → {Math.min(100, briScore + 6)}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">BRI Change</p>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleStartTask}
              disabled={isStarting}
            >
              {isStarting ? 'Loading...' : 'Start This Task'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* No tasks message */}
        {!nextTask && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl border border-border p-8 text-center"
          >
            <TrendingUp className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">All caught up!</h3>
            <p className="text-muted-foreground mb-6">
              Complete an assessment to generate more improvement tasks.
            </p>
            <Button onClick={() => router.push('/dashboard/assessment')}>
              Start Assessment
            </Button>
          </motion.div>
        )}

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-foreground">Coming Up</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewAllTasks}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                See all {totalTasks - tasksCompleted} remaining
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="space-y-3">
              {upcomingTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCategory(task.briCategory)} • {(task.estimatedHours || 1) * 60} min
                    </p>
                  </div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                    +{formatCurrency(Number(task.rawImpact))}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Dashboard Teaser */}
        {showDashboardTeaser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-muted/50 to-muted rounded-xl border border-dashed border-border p-6 text-center"
          >
            <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-foreground mb-1">
              You&apos;ve recovered <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(totalRecovered)}</strong> in potential value.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Ready to see the full picture?
            </p>
            <Button variant="outline" onClick={handleGoToDashboard}>
              See Full Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
