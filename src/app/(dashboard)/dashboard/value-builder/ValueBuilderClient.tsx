'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
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
  const { selectedCompanyId, isLoading: isContextLoading, companies } = useCompany()
  const { stage, progressionData } = useProgression()
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isStarting, setIsStarting] = useState(false)
  const [hasFinancials, setHasFinancials] = useState(false)

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
          // Filter to pending/in-progress tasks and limit to top 5
          const activeTasks = (data.tasks || [])
            .filter((t: Task) =>
              t.status === 'PENDING' || t.status === 'IN_PROGRESS' || !t.status
            )
            .slice(0, 5)
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

  // Check if user needs to upload financials
  // Use both progression data AND local check based on dashboard EBITDA
  const needsFinancials = !progressionData?.hasBusinessFinancials && !hasFinancials && stage <= 3

  const handleStartTask = () => {
    if (!nextTask) return
    setIsStarting(true)
    router.push(`/dashboard/tasks/${nextTask.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Card Container - matching demo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-8 shadow-lg"
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Value Builder</h1>
          <p className="text-muted-foreground">Your fastest path to higher buyer confidence</p>
        </div>

        {/* Progress Bar - matching demo */}
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

        {/* Value Gap - Large and Red like demo */}
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
            {/* Headline - matching demo */}
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-foreground">
                If you do nothing else, do this.
              </h2>
              <p className="text-sm text-muted-foreground">
                Buyers discount businesses for this reason first.
              </p>
            </div>

            {/* Task Card - matching demo design */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="border-2 border-primary rounded-xl p-6"
            >
              <h3 className="text-lg font-bold text-foreground mb-4">
                {nextTask.title}
              </h3>

              {/* Task details row - matching demo */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mb-4">
                <span className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Buyer risk removed:</span>
                  <span className="font-medium text-foreground">{formatRiskLabel(nextTask.briCategory)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Estimated value impact: +{formatCurrency(Number(nextTask.rawImpact))}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
                <Clock className="w-4 h-4" />
                <span>Time: ~{(nextTask.estimatedHours || 1.5) * 60} minutes</span>
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
          </>
        )}

        {/* Case 2: No task, needs financials */}
        {!nextTask && needsFinancials && (
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

        {/* Case 3: Has financials, no tasks - next step is assessment */}
        {!nextTask && !needsFinancials && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            {/* Financials complete checkmark */}
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

        {/* Footer note - matching demo */}
        {needsFinancials && !nextTask && (
          <p className="text-xs text-muted-foreground text-center mt-6">
            Saved for future diligence.
          </p>
        )}
      </motion.div>
    </div>
  )
}
