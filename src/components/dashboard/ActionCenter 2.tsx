'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'

interface Task {
  id: string
  title: string
  status: string
  effortLevel: string
  estimatedHours: number | null
  valueImpact: number
  issueTier?: string | null
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
  isCreating
}: {
  currentAssessment: CurrentAssessment | null
  recentlyCompleted: boolean
  onRequestNew: () => void
  isCreating: boolean
}) {
  // If there's an in-progress assessment
  if (currentAssessment && currentAssessment.status === 'IN_PROGRESS') {
    const progress = Math.round((currentAssessment.questionsAnswered / currentAssessment.totalQuestions) * 100)

    return (
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-5 border border-primary/20 relative overflow-hidden">
        {/* Time-sensitive indicator */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-medium text-primary">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          In Progress
        </div>

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">Continue Your Assessment</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {currentAssessment.questionsAnswered} of {currentAssessment.totalQuestions} questions answered
            </p>

            {/* Progress bar */}
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            ~{10 - currentAssessment.questionsAnswered} min remaining
          </span>
          <Link href={`/dashboard/assessments/${currentAssessment.id}`}>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              Continue Assessment
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // If recently completed an assessment (don't push another one)
  if (recentlyCompleted) {
    return (
      <div className="bg-green-50 rounded-xl p-5 border border-green-200">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Assessment Complete!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Great work! Your BRI score has been refined based on your responses.
            </p>
            <button
              onClick={onRequestNew}
              disabled={isCreating}
              className="mt-3 text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></span>
                  Creating assessment...
                </>
              ) : (
                'Want to answer more questions? Start another assessment'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // No assessment - show the "10 in 10" CTA
  return (
    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-5 border border-primary/20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full" />
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full" />

      <div className="relative flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-primary">10</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">10 Questions in 10 Minutes</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
              Quick
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Refine your Buyer Readiness score with targeted questions about your business.
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ~10 min
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Skip any question
          </span>
        </div>
        <Link href="/dashboard/assessments/new">
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            Start Assessment
          </Button>
        </Link>
      </div>
    </div>
  )
}

// Playbook Card Component
interface PlaybookCardProps {
  playbook: Playbook
  isExpanded: boolean
  onToggle: () => void
}

function PlaybookCard({ playbook, isExpanded, onToggle }: PlaybookCardProps) {
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

interface ActionCenterProps {
  hasAssessment?: boolean
}

export function ActionCenter({ hasAssessment = true }: ActionCenterProps) {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<ActionCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | null>(null)
  const [creatingAssessment, setCreatingAssessment] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!selectedCompanyId) {
        setLoading(false)
        return
      }

      setError(null)
      try {
        const response = await fetch(`/api/companies/${selectedCompanyId}/action-center`)
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
        console.error('Failed to fetch action center data:', err)
        setError('Failed to load')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedCompanyId])

  const handleRequestNewAssessment = async () => {
    if (!selectedCompanyId || creatingAssessment) return

    setCreatingAssessment(true)
    setError(null)
    try {
      const response = await fetch('/api/project-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          questionCount: 10,
        }),
      })

      const responseData = await response.json()

      if (response.ok) {
        if (responseData.assessment) {
          window.location.href = `/dashboard/assessments/${responseData.assessment.id}`
        }
      } else {
        // Handle specific error cases
        if (responseData.allQuestionsAnswered) {
          setError('All available questions have been answered. Check back later for new questions.')
        } else {
          setError(responseData.error || 'Failed to create assessment')
        }
      }
    } catch (err) {
      console.error('Failed to create assessment:', err)
      setError('Failed to create assessment. Please try again.')
    } finally {
      setCreatingAssessment(false)
    }
  }

  // Show initial assessment CTA if needed
  if (!hasAssessment) {
    return (
      <div className="space-y-6">
        {/* Assessment Section */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Your Assessment</h4>
          <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Initial Assessment Required</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete the Initial BRI Assessment to unlock your personalized action playbooks.
                </p>
                <Link href="/dashboard/assessment" className="inline-block mt-3">
                  <Button size="sm">Start Initial Assessment</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Playbooks Section (locked) */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Action Playbooks</h4>
          <div className="bg-gray-100 rounded-lg p-4 text-center">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm text-muted-foreground">
              Playbooks unlock after completing your initial assessment
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
          <div className="h-32 bg-gray-200 rounded-xl" />
        </div>
        <div className="animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded mt-2" />
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
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Your Assessment</h4>
        <AssessmentSection
          currentAssessment={data?.currentAssessment || null}
          recentlyCompleted={data?.recentlyCompleted || false}
          onRequestNew={handleRequestNewAssessment}
          isCreating={creatingAssessment}
        />
      </div>

      {/* Section 2: Action Playbooks */}
      {data && data.playbooks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Action Playbooks</h4>

          <div className="space-y-2">
            {data.playbooks.map((playbook) => (
              <PlaybookCard
                key={playbook.id}
                playbook={playbook}
                isExpanded={expandedPlaybook === playbook.id}
                onToggle={() => setExpandedPlaybook(
                  expandedPlaybook === playbook.id ? null : playbook.id
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
