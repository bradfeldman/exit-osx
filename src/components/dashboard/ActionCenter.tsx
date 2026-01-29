'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'
import { useUserRole } from '@/contexts/UserRoleContext'
import { analytics } from '@/lib/analytics'
import { useCtaTracking } from '@/lib/analytics/hooks'

interface Task {
  id: string
  title: string
  status: string
  effortLevel: string
  estimatedHours: number | null
  valueImpact: number
  issueTier?: string | null
}

interface MyTask {
  id: string
  title: string
  status: string
  effortLevel: string
  issueTier?: string | null
  dueDate?: string | null
  briCategory: string
}

interface Playbook {
  id: string
  category: string
  label: string
  description: string
  score: number
  rank: number
  tasks: Task[]
  taskCount: number
  availableQuestions: number
  hasActiveAssessment: boolean
  activeAssessmentId?: string
  potentialValueRecovery: number
}

interface CurrentAssessment {
  id: string
  assessmentNumber: number
  status: string
  questionsAnswered: number
  totalQuestions: number
  startedAt: string
  completedAt?: string
}

interface ActionCenterData {
  playbooks: Playbook[]
  currentAssessment: CurrentAssessment | null
  recentlyCompleted: boolean // Assessment completed in current session
  needsInitialAssessment: boolean
  tasks: Array<Task & { category: string; categoryLabel: string }>
  summary: {
    totalTasks: number
    totalValueAtStake: number
    briScore: number
    valueGap: number
  }
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-green-100'
  if (score >= 50) return 'bg-yellow-100'
  return 'bg-red-100'
}

function getEffortLevel(effort: string): string {
  switch (effort) {
    case 'MINIMAL':
    case 'LOW':
      return 'Low Effort'
    case 'MODERATE':
      return 'Mid Effort'
    case 'HIGH':
    case 'MAJOR':
      return 'High Effort'
    default:
      return 'Mid Effort'
  }
}

function getImpactLevel(issueTier: string | null | undefined): string {
  switch (issueTier) {
    case 'CRITICAL':
      return 'Critical'
    case 'SIGNIFICANT':
      return 'Significant'
    case 'OPTIMIZATION':
    default:
      return 'Optimization'
  }
}

function getImpactEffortColor(effort: string, issueTier: string | null | undefined): string {
  const isLowEffort = effort === 'MINIMAL' || effort === 'LOW'
  const isHighEffort = effort === 'HIGH' || effort === 'MAJOR'

  // Critical issues always get red tones
  if (issueTier === 'CRITICAL') {
    if (isLowEffort) return 'bg-red-100 text-red-700' // Quick win on critical issue
    return 'bg-red-50 text-red-600'
  }

  // Significant issues get orange/yellow tones
  if (issueTier === 'SIGNIFICANT') {
    if (isLowEffort) return 'bg-orange-100 text-orange-700' // Quick win on significant issue
    return 'bg-yellow-100 text-yellow-700'
  }

  // Optimization issues get blue/green tones
  if (isLowEffort) return 'bg-green-100 text-green-700'
  if (isHighEffort) return 'bg-gray-100 text-gray-600'
  return 'bg-blue-100 text-blue-700'
}

// Assessment Section Component
function AssessmentSection({
  currentAssessment,
  recentlyCompleted,
  onRequestNew,
  onCtaClick,
  continueCtaRef,
  updateCtaRef,
}: {
  currentAssessment: CurrentAssessment | null
  recentlyCompleted: boolean
  onRequestNew: () => void
  onCtaClick: (ctaId: string, ctaVariant: string, clickHandler: () => void) => void
  continueCtaRef: React.RefObject<HTMLDivElement | null>
  updateCtaRef: React.RefObject<HTMLDivElement | null>
}) {
  // If there's an in-progress assessment
  if (currentAssessment && currentAssessment.status === 'IN_PROGRESS') {
    const progress = Math.round((currentAssessment.questionsAnswered / currentAssessment.totalQuestions) * 100)

    return (
      <motion.div
        ref={continueCtaRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-5 border border-primary/20 relative overflow-hidden group"
      >
        {/* Animated glow effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        {/* Time-sensitive indicator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-medium text-primary"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          In Progress
        </motion.div>

        <div className="relative flex items-start gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0"
          >
            <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground font-display">Continue Your Assessment</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {currentAssessment.questionsAnswered} of {currentAssessment.totalQuestions} questions answered
            </p>

            {/* Animated progress bar */}
            <div className="mt-3 h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative mt-4 flex items-center justify-between"
        >
          <span className="text-xs text-muted-foreground">
            ~{10 - currentAssessment.questionsAnswered} min remaining
          </span>
          <Link href="/dashboard/assessment/risk">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              onClick={() => onCtaClick('continue_assessment_cta', 'in_progress', () => {})}
            >
              Continue Assessment
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    )
  }

  // If recently completed an assessment (don't push another one)
  if (recentlyCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-5 border border-green-200 relative overflow-hidden"
      >
        {/* Success celebration particles */}
        <motion.div
          className="absolute top-0 left-1/4 w-2 h-2 bg-green-400 rounded-full"
          animate={{ y: [-20, 60], opacity: [1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="absolute top-0 right-1/3 w-1.5 h-1.5 bg-green-500 rounded-full"
          animate={{ y: [-20, 60], opacity: [1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        />

        <div className="relative flex items-start gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0"
          >
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <div className="flex-1">
            <motion.h3
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-semibold text-foreground font-display"
            >
              Assessment Complete!
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-muted-foreground mt-1"
            >
              Great work! Your BRI score has been refined based on your responses.
            </motion.p>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={onRequestNew}
              className="mt-3 text-sm text-primary hover:underline font-medium"
            >
              Want to answer more questions? Start another assessment
            </motion.button>
          </div>
        </div>
      </motion.div>
    )
  }

  // No in-progress assessment - show "Update BRI Score" CTA
  return (
    <motion.div
      ref={updateCtaRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-5 border border-primary/20 relative overflow-hidden group hover:border-primary/40 transition-colors"
    >
      {/* Animated background decoration */}
      <motion.div
        className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      <div className="relative flex items-start gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.05, rotate: 5 }}
          className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0"
        >
          <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </motion.div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <motion.h3
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-semibold text-foreground font-display"
            >
              Update BRI Score
            </motion.h3>
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full"
            >
              ~10 min
            </motion.span>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-muted-foreground mt-1"
          >
            Answer 10 targeted questions to refine your Buyer Readiness Index and unlock new improvement tasks.
          </motion.p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative mt-4 flex items-center justify-end"
      >
        <Link href="/dashboard/assessment/risk">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
            onClick={() => onCtaClick('update_assessment_cta', 'update_bri', () => {})}
          >
            Start Assessment
            <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  )
}

// Playbook Card Component
interface PlaybookCardProps {
  playbook: Playbook
  isExpanded: boolean
  onToggle: () => void
}

function _PlaybookCard({ playbook, isExpanded, onToggle }: PlaybookCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Playbook Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getScoreBgColor(playbook.score)} ${getScoreColor(playbook.score)}`}>
            {playbook.rank}
          </span>
          <div className="text-left">
            <h4 className="font-medium text-gray-900">{playbook.label}</h4>
            <p className="text-xs text-muted-foreground">{playbook.description}</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
          {/* Tasks List */}
          {playbook.tasks.length > 0 ? (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Priority Tasks
                </h5>
                <span className="text-xs text-muted-foreground">
                  {playbook.taskCount} total
                </span>
              </div>
              <div className="space-y-2">
                {playbook.tasks.map((task) => {
                  const impactEffortLabel = `${getImpactLevel(task.issueTier)} / ${getEffortLevel(task.effortLevel)}`
                  const badgeColor = getImpactEffortColor(task.effortLevel, task.issueTier)
                  return (
                    <div
                      key={task.id}
                      className="block p-2 bg-white rounded border border-gray-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{task.title}</p>
                          <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded ${badgeColor}`}>
                            {impactEffortLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-center py-4">
              <p className="text-sm text-muted-foreground">
                Complete assessments to generate improvement tasks
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Category labels for task display
const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transfer',
  OPERATIONAL: 'Operations',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal/Tax',
  PERSONAL: 'Personal',
}

const CATEGORY_COLORS: Record<string, string> = {
  FINANCIAL: 'bg-blue-100 text-blue-700',
  TRANSFERABILITY: 'bg-green-100 text-green-700',
  OPERATIONAL: 'bg-yellow-100 text-yellow-700',
  MARKET: 'bg-purple-100 text-purple-700',
  LEGAL_TAX: 'bg-red-100 text-red-700',
  PERSONAL: 'bg-orange-100 text-orange-700',
}

// Your Tasks Section Component
function YourTasksSection({ tasks, loading }: { tasks: MyTask[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="h-16 bg-muted rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-muted/50 rounded-lg p-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <svg className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </motion.div>
        <p className="text-sm text-muted-foreground">
          No tasks assigned to you yet
        </p>
      </motion.div>
    )
  }

  const formatDueDate = (dateStr: string): { text: string; className: string } => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    if (diffDays < 0) return { text: `Overdue`, className: 'text-red-600 font-medium' }
    if (diffDays === 0) return { text: 'Due today', className: 'text-orange-600 font-medium' }
    if (diffDays <= 3) return { text: `Due ${formatted}`, className: 'text-yellow-600' }
    return { text: `Due ${formatted}`, className: 'text-muted-foreground' }
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, index) => {
        const impactEffortLabel = `${getImpactLevel(task.issueTier)} / ${getEffortLevel(task.effortLevel)}`
        const badgeColor = getImpactEffortColor(task.effortLevel, task.issueTier)
        const dueInfo = task.dueDate ? formatDueDate(task.dueDate) : null

        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
          >
            <Link
              href={`/dashboard/playbook?expand=${task.id}`}
              className="block p-3 bg-card rounded-lg border border-border hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[task.briCategory] || 'bg-muted text-muted-foreground'}`}>
                      {CATEGORY_LABELS[task.briCategory] || task.briCategory}
                    </span>
                    <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${badgeColor}`}>
                      {impactEffortLabel}
                    </span>
                    {dueInfo && (
                      <span className={`text-xs ${dueInfo.className}`}>
                        {dueInfo.text}
                      </span>
                    )}
                  </div>
                </div>
                <svg className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </motion.div>
        )
      })}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: tasks.length * 0.08 + 0.2 }}
      >
        <Link
          href="/dashboard/playbook"
          className="block text-center text-sm text-primary hover:underline pt-2 font-medium"
        >
          View all tasks →
        </Link>
      </motion.div>
    </div>
  )
}

interface ActionCenterProps {
  hasAssessment?: boolean
  onAssessmentCtaVisible?: () => void
}

export function ActionCenter({ hasAssessment = true, onAssessmentCtaVisible }: ActionCenterProps) {
  const { selectedCompanyId } = useCompany()
  const { user } = useUserRole()
  const [data, setData] = useState<ActionCenterData | null>(null)
  const [myTasks, setMyTasks] = useState<MyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [myTasksLoading, setMyTasksLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [_expandedPlaybook, setExpandedPlaybook] = useState<string | null>(null)

  // Fetch action center data (for assessment section)
  useEffect(() => {
    const abortController = new AbortController()

    async function fetchData() {
      if (!selectedCompanyId) {
        setLoading(false)
        return
      }

      setError(null)
      try {
        const response = await fetch(`/api/companies/${selectedCompanyId}/action-center`, {
          signal: abortController.signal
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Action Center API error:', response.status, errorData)
          setError(`API error: ${response.status}`)
          setLoading(false)
          return
        }
        const result = await response.json()
        setData(result)
        // Auto-expand first playbook if has tasks
        if (result.playbooks?.[0]?.tasks?.length > 0) {
          setExpandedPlaybook(result.playbooks[0].id)
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Failed to fetch action center data:', err)
        setError('Failed to load')
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => abortController.abort()
  }, [selectedCompanyId])

  // Fetch user's assigned tasks
  useEffect(() => {
    const abortController = new AbortController()

    async function fetchMyTasks() {
      if (!selectedCompanyId || !user) {
        setMyTasksLoading(false)
        return
      }

      setMyTasksLoading(true)
      try {
        const response = await fetch(`/api/tasks?companyId=${selectedCompanyId}&assignedToMe=true`, {
          signal: abortController.signal
        })
        if (response.ok) {
          const result = await response.json()
          // Filter to only non-completed tasks, limit to 5
          const activeTasks = (result.tasks || [])
            .filter((t: MyTask) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'NOT_APPLICABLE')
            .slice(0, 5)
          setMyTasks(activeTasks)
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Failed to fetch my tasks:', err)
      } finally {
        if (!abortController.signal.aborted) {
          setMyTasksLoading(false)
        }
      }
    }

    fetchMyTasks()

    return () => abortController.abort()
  }, [selectedCompanyId, user])

  const handleRequestNewAssessment = () => {
    if (!selectedCompanyId) return
    // Redirect to the new assessment page which shows the loading animation
    // while creating the assessment, then redirects to Risk page
    window.location.href = '/dashboard/assessments/new'
  }

  // Track dashboard load time for time-to-assessment calculation
  const dashboardLoadTime = useRef(Date.now())

  // Track initial assessment CTA visibility and interactions
  const { ref: initialCtaRef, handleClick: handleInitialCtaClick } = useCtaTracking({
    ctaId: 'initial_assessment_cta',
    ctaText: 'Start Initial Assessment',
    ctaType: 'primary',
    destination: '/dashboard/assessment/risk',
    onVisible: onAssessmentCtaVisible,
  })

  // Track update assessment CTA
  const { ref: updateCtaRef } = useCtaTracking({
    ctaId: 'update_assessment_cta',
    ctaText: 'Start Assessment',
    ctaType: 'primary',
    destination: '/dashboard/assessment/risk',
    onVisible: onAssessmentCtaVisible,
  })

  // Track continue assessment CTA
  const { ref: continueCtaRef } = useCtaTracking({
    ctaId: 'continue_assessment_cta',
    ctaText: 'Continue Assessment',
    ctaType: 'primary',
    destination: '/dashboard/assessment/risk',
    onVisible: onAssessmentCtaVisible,
  })

  // Handler for assessment CTA clicks with additional tracking
  const handleAssessmentCtaClick = (ctaId: string, ctaVariant: string, clickHandler: () => void) => {
    const timeOnDashboard = Date.now() - dashboardLoadTime.current

    analytics.track('assessment_cta_click', {
      ctaId,
      ctaVariant,
      timeOnDashboard,
    })

    // Also track time to assessment start
    analytics.track('time_to_assessment_start', {
      duration: timeOnDashboard,
    })

    clickHandler()
  }

  // Show initial assessment CTA if needed
  if (!hasAssessment) {
    return (
      <div className="space-y-6">
        {/* Assessment Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Next Step</h4>
          <motion.div
            ref={initialCtaRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-amber-500/10 rounded-xl p-6 border-2 border-primary/30 overflow-hidden group"
          >
            {/* Animated background pulse */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            {/* Decorative corner accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-12 translate-x-12" />

            <div className="relative">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 rounded-full mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs font-semibold text-primary">10 minutes</span>
              </div>

              {/* Headline */}
              <h3 className="text-xl font-bold text-foreground font-display mb-2">
                What Would Buyers Actually Pay?
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-1">
                The number above is an industry average. Your business is unique.
              </p>
              <p className="text-sm text-foreground font-medium mb-5">
                Answer 10 questions to see how acquirers would evaluate <span className="text-primary">your</span> business — and what you could do to increase the price.
              </p>

              {/* Value proposition bullets */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Your personalized BRI score
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Risk-adjusted valuation
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Action plan to increase value
                </span>
              </div>

              {/* CTA Button */}
              <Link href="/dashboard/assessment/risk">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
                  onClick={() => handleAssessmentCtaClick('initial_assessment_cta', 'what_would_buyers_pay', handleInitialCtaClick)}
                >
                  Discover Your True Value
                  <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
            </div>
          </motion.div>
        </motion.div>

        {/* Your Tasks Section (locked) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Your Action Plan</h4>
          <div className="bg-muted/30 rounded-xl p-6 border border-dashed border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Your personalized roadmap appears here
                </p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Complete your assessment to unlock specific actions that increase value
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-4 w-32 bg-muted rounded mb-3 animate-pulse"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="h-32 bg-muted rounded-xl animate-pulse"
          />
        </div>
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="h-4 w-32 bg-muted rounded mb-3 animate-pulse"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="h-24 bg-muted rounded animate-pulse"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="h-24 bg-muted rounded mt-2 animate-pulse"
          />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
        <h4 className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">
          Action Center Error
        </h4>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Assessment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Your Assessment</h4>
        <AssessmentSection
          currentAssessment={data?.currentAssessment || null}
          recentlyCompleted={data?.recentlyCompleted || false}
          onRequestNew={handleRequestNewAssessment}
          onCtaClick={handleAssessmentCtaClick}
          continueCtaRef={continueCtaRef}
          updateCtaRef={updateCtaRef}
        />
      </motion.div>

      {/* Section 2: Your Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Your Tasks</h4>
        <YourTasksSection tasks={myTasks} loading={myTasksLoading} />
      </motion.div>
    </div>
  )
}
