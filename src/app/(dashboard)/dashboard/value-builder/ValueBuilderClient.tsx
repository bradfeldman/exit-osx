'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { useProgression } from '@/contexts/ProgressionContext'
import {
  ArrowRight,
  TrendingUp,
  Clock,
  Target,
  Loader2,
  Upload,
  Link2,
  PenLine,
  CheckCircle2,
  Sparkles,
  Trophy,
  ChevronRight,
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
  tier2?: {
    adjustedEbitda?: number
    isEbitdaFromFinancials?: boolean
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
  status?: string
}

interface TaskStats {
  total: number
  completed: number
  totalValue: number
  completedValue: number
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

function formatRiskLabel(category: string): string {
  const labels: Record<string, string> = {
    FINANCIAL: 'Financial opacity',
    TRANSFERABILITY: 'Founder dependency',
    OPERATIONAL: 'Operational gaps',
    MARKET: 'Market position',
    LEGAL_TAX: 'Legal exposure',
    PERSONAL: 'Transition readiness',
  }
  return labels[category] || category
}

interface ValueBuilderClientProps {
  userName?: string
}

export function ValueBuilderClient({ userName }: ValueBuilderClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedCompanyId, isLoading: isContextLoading, companies } = useCompany()
  const { stage, progressionData } = useProgression()
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [hasFinancials, setHasFinancials] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [lastCompletedValue, setLastCompletedValue] = useState<number | null>(null)

  // Check for completion celebration
  useEffect(() => {
    const completed = searchParams.get('completed')
    const value = searchParams.get('value')

    if (completed === 'true') {
      setShowCelebration(true)
      if (value) {
        setLastCompletedValue(Number(value))
      }
      // Clear the URL params after showing celebration
      const timer = setTimeout(() => {
        router.replace('/dashboard/value-builder', { scroll: false })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [searchParams, router])

  // Auto-hide celebration after delay
  useEffect(() => {
    if (showCelebration) {
      const timer = setTimeout(() => {
        setShowCelebration(false)
        setLastCompletedValue(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [showCelebration])

  // Redirect to onboarding if no companies exist
  useEffect(() => {
    if (!isContextLoading && companies.length === 0) {
      router.replace('/onboarding')
    }
  }, [isContextLoading, companies, router])

  // Fetch dashboard data on mount
  useEffect(() => {
    if (!selectedCompanyId) {
      setIsDataLoading(false)
      return
    }

    const fetchData = async () => {
      setIsDataLoading(true)

      try {
        const [dashboardRes, tasksRes] = await Promise.all([
          fetch(`/api/companies/${selectedCompanyId}/dashboard`),
          fetch(`/api/tasks?companyId=${selectedCompanyId}&includeQueue=true`),
        ])

        if (dashboardRes.ok) {
          const data = await dashboardRes.json()
          setDashboardData(data)
          // Check if actual financials were uploaded (not just estimated from revenue)
          setHasFinancials(data.tier2?.isEbitdaFromFinancials === true)
        }

        if (tasksRes.ok) {
          const data = await tasksRes.json()

          // Store stats
          if (data.stats) {
            setTaskStats({
              total: data.stats.total,
              completed: data.stats.completed,
              totalValue: data.stats.totalValue,
              completedValue: data.stats.completedValue,
            })
          }

          // Filter to pending/in-progress tasks
          const activeTasks = (data.tasks || [])
            .filter((t: Task) =>
              t.status === 'PENDING' || t.status === 'IN_PROGRESS' || !t.status
            )
          setTasks(activeTasks)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsDataLoading(false)
      }
    }

    fetchData()
  }, [selectedCompanyId])

  // Show loading while context or data is loading
  if (isContextLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Handle case where no company is selected
  if (!selectedCompanyId || !dashboardData) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No company selected</p>
          <Button onClick={() => router.push('/onboarding')}>
            Set up your company
          </Button>
        </div>
      </div>
    )
  }

  const { tier1 } = dashboardData
  const currentValue = tier1.currentValue || 0
  const potentialValue = tier1.potentialValue || 0
  const valueGap = tier1.valueGap || 0

  const progressPercent = potentialValue > 0 ? (currentValue / potentialValue) * 100 : 0

  // Get next task (first pending task)
  const nextTask = tasks[0]
  // Get upcoming tasks (next 2 after current)
  const upcomingTasks = tasks.slice(1, 3)

  // Check if user needs to upload financials
  const needsFinancials = !progressionData?.hasBusinessFinancials && !hasFinancials && stage <= 3

  // Calculate task progress
  const completedCount = taskStats?.completed || 0
  const totalCount = taskStats?.total || 0
  const completedValue = taskStats?.completedValue || 0
  const totalValue = taskStats?.totalValue || 0
  const taskProgressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const handleStartTask = () => {
    if (!nextTask) return
    setIsStarting(true)
    router.push(`/dashboard/tasks/${nextTask.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="bg-card rounded-2xl border border-border p-8 shadow-2xl text-center max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6"
              >
                <Trophy className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                  +{formatCurrency(lastCompletedValue || completedValue)}
                </p>
                <p className="text-lg font-semibold text-foreground mb-2">
                  Value recovered!
                </p>
                <p className="text-muted-foreground mb-6">
                  Task {completedCount} of {totalCount} complete.
                  {taskProgressPercent >= 100
                    ? " You've completed all tasks!"
                    : ` You're ${Math.round(taskProgressPercent)}% there.`}
                </p>
                <Button onClick={() => setShowCelebration(false)} size="lg">
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-8 shadow-lg"
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Value Builder</h1>
          <p className="text-muted-foreground">Your fastest path to higher buyer confidence</p>
        </div>

        {/* Task Progress Indicator - Dan/Alex style */}
        {totalCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-muted/50 rounded-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {completedCount} of {totalCount} tasks complete
              </span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(completedValue)} recovered
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${taskProgressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
            {totalValue > completedValue && (
              <p className="text-xs text-muted-foreground mt-2">
                {formatCurrency(totalValue - completedValue)} remaining to unlock
              </p>
            )}
          </motion.div>
        )}

        {/* Value Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Current: <strong className="text-foreground">{formatCurrency(currentValue)}</strong></span>
            <span>Potential: <strong className="text-foreground">{formatCurrency(potentialValue)}</strong></span>
          </div>
          <div className="h-6 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.max(progressPercent, 5)}%` }}
            />
          </div>
        </div>

        {/* Value Gap */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <p className="text-4xl font-bold text-red-600 dark:text-red-500">
            {formatCurrency(valueGap)}
          </p>
          <p className="text-muted-foreground">Value gap to close</p>
        </motion.div>

        {/* Context note when financials are connected */}
        {hasFinancials && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-muted/50 rounded-lg p-4 mb-8 text-sm"
          >
            <p className="text-muted-foreground">
              <strong className="text-foreground">Updated with your actual financials.</strong>{' '}
              This valuation is based on your real EBITDA and industry multiples, replacing the earlier estimate from onboarding which used industry-average margins.
            </p>
          </motion.div>
        )}

        {/* Case 1: Has task to work on */}
        {nextTask && (
          <>
            {/* Headline */}
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-foreground">
                If you do nothing else, do this.
              </h2>
              <p className="text-sm text-muted-foreground">
                Buyers discount businesses for this reason first.
              </p>
            </div>

            {/* Current Task Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="border-2 border-primary rounded-xl p-6 mb-6"
            >
              <h3 className="text-lg font-bold text-foreground mb-4">
                {nextTask.title}
              </h3>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mb-4">
                <span className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Buyer risk removed:</span>
                  <span className="font-medium text-foreground">{formatRiskLabel(nextTask.briCategory)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(Number(nextTask.rawImpact))}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
                <Clock className="w-4 h-4" />
                <span>~{Math.round((nextTask.estimatedHours || 1) * 60)} minutes</span>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={handleStartTask}
                disabled={isStarting}
              >
                {isStarting ? 'Loading...' : 'Start This Task'}
              </Button>
            </motion.div>

            {/* Coming Up Preview - just a peek */}
            {upcomingTasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm"
              >
                <p className="text-muted-foreground mb-3 font-medium">Coming up:</p>
                <div className="space-y-2">
                  {upcomingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg"
                    >
                      <span className="text-foreground truncate pr-4">{task.title}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                        +{formatCurrency(Number(task.rawImpact))}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Case 2: All tasks complete - celebrate first, then suggest next step */}
        {!nextTask && totalCount > 0 && completedCount === totalCount && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              All tasks complete!
            </h3>
            <p className="text-muted-foreground mb-6">
              You&apos;ve addressed {formatCurrency(completedValue)} worth of buyer concerns.
            </p>

            {/* Next step: financials or buyer view */}
            {needsFinancials ? (
              <div className="bg-muted/50 rounded-xl p-6 text-left">
                <p className="font-semibold text-foreground mb-2">
                  Next: Unlock buyer-grade valuation
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your financials to get a valuation based on real numbers, not estimates.
                </p>
                <Button
                  className="w-full"
                  onClick={() => router.push('/dashboard/financials')}
                >
                  Add Financials
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/assessment/risk')}
              >
                See Buyer View
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </motion.div>
        )}

        {/* Case 3: No task, needs financials (and tasks not all complete) */}
        {!nextTask && needsFinancials && !(totalCount > 0 && completedCount === totalCount) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-primary rounded-xl p-6 text-primary-foreground"
          >
            <h3 className="text-lg font-bold mb-2">
              This unlocks buyer-grade valuation and capital options.
            </h3>
            <p className="text-primary-foreground/80 mb-6">
              Buyers won&apos;t trust projections without this.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard/financials')}
                className="w-full flex items-center gap-3 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-lg p-4 transition-colors text-left"
              >
                <Upload className="w-5 h-5" />
                <span className="font-medium">Upload financials</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/financials?connect=quickbooks')}
                className="w-full flex items-center gap-3 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-lg p-4 transition-colors text-left"
              >
                <Link2 className="w-5 h-5" />
                <span className="font-medium">Connect QuickBooks</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/financials/statements')}
                className="w-full flex items-center gap-3 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-lg p-4 transition-colors text-left"
              >
                <PenLine className="w-5 h-5" />
                <span className="font-medium">Enter manually</span>
              </button>
            </div>

            <p className="text-xs text-primary-foreground/60 text-center mt-4">
              Step 1 of 3 toward buyer-grade valuation
            </p>
          </motion.div>
        )}

        {/* Case 4: Has financials, no tasks - next step is assessment */}
        {!nextTask && !needsFinancials && totalCount === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium mb-6">
              <CheckCircle2 className="w-4 h-4" />
              Financials connected
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">
                Ready to identify your value gaps
              </h3>
              <p className="text-muted-foreground mb-6">
                Complete a quick assessment to generate personalized improvement tasks based on your business profile.
              </p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => router.push('/dashboard/assessment/risk')}
              >
                Start Risk Assessment
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              This takes about 10 minutes and generates your personalized action plan.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
