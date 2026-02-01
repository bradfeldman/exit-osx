'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from '@/lib/motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'
import { FocusedOnboardingWizard } from '@/components/onboarding/FocusedOnboardingWizard'
import { HeroMetrics } from './HeroMetrics'
import { ValueDrivers } from './ValueDrivers'
import { RiskBreakdown } from './RiskBreakdown'
import { analytics } from '@/lib/analytics'
import { useScrollDepthTracking } from '@/lib/analytics/hooks'

interface DashboardData {
  company: {
    id: string
    name: string
    annualRevenue: number
    annualEbitda: number
    adjustedEbitda: number
  }
  tier1: {
    currentValue: number
    potentialValue: number
    valueGap: number
    marketPremium: number
    briScore: number | null
    coreScore: number | null
    finalMultiple: number
    multipleRange: {
      low: number
      high: number
    }
    industryName: string
    isEstimated?: boolean
  } | null
  tier2: {
    adjustedEbitda: number
    isEbitdaEstimated: boolean
    multipleRange: {
      low: number
      high: number
      current: number | null
    }
  }
  tier3: {
    categories: Array<{
      key: string
      label: string
      score: number
    }>
    topConstraints: Array<{
      category: string
      score: number
    }>
  } | null
  tier4: {
    taskStats: {
      total: number
      pending: number
      inProgress: number
      completed: number
      recoverableValue: number
      atRisk: number
    }
    sprintProgress: {
      id: string
      name: string
      totalTasks: number
      completedTasks: number
      recoverableValue: number
    } | null
  }
  tier5: {
    valueTrend: Array<{ value: number; date: string }>
    briTrend: { direction: 'up' | 'down'; change: number } | null
    exitWindow: string | null
  }
  hasAssessment: boolean
  lastAssessmentDate?: string | null
  tasksCompletedSinceAssessment?: number
  criticalTasksTotal?: number
  criticalTasksCompleted?: number
  significantTasksCompleted?: number
}

interface DashboardContentProps {
  userName?: string
}

export function DashboardContent({ userName }: DashboardContentProps) {
  const router = useRouter()
  const { selectedCompanyId, companies, setSelectedCompanyId, isLoading: companyLoading } = useCompany()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [noCompany, setNoCompany] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewMultiple, setPreviewMultiple] = useState<number | null>(null)

  // Analytics tracking state
  const dashboardLoadTime = useRef(Date.now())
  const hasTrackedFirstView = useRef(false)
  const hasTrackedValuation = useRef(false)
  const hasTrackedBriScore = useRef(false)
  const hasTrackedReturnView = useRef(false)
  const assessmentCtaWasVisible = useRef(false)
  const featuresClicked = useRef<string[]>([])

  // Track scroll depth
  const { maxDepth: scrollDepthReached } = useScrollDepthTracking('dashboard')

  // State for re-assessment nudge dismissal
  const [reassessmentNudgeDismissed, setReassessmentNudgeDismissed] = useState(false)

  // State for returning user welcome banner
  const [isReturningUser, setIsReturningUser] = useState(false)
  const [lastVisitData, setLastVisitData] = useState<{
    lastBriScore: number | null
    lastValuation: number | null
    daysSinceVisit: number
  } | null>(null)

  // Track assessment CTA visibility (passed to ActionCenter)
  const handleAssessmentCtaVisible = useCallback(() => {
    assessmentCtaWasVisible.current = true
  }, [])

  // Check if re-assessment should be suggested (sophisticated triggers)
  const shouldSuggestReassessment = useCallback(() => {
    if (!dashboardData || !dashboardData.hasAssessment || reassessmentNudgeDismissed) return false

    const {
      lastAssessmentDate,
      tasksCompletedSinceAssessment,
      criticalTasksTotal,
      criticalTasksCompleted,
      significantTasksCompleted,
    } = dashboardData

    // If we don't have the date, check localStorage fallback
    if (!lastAssessmentDate) {
      const storageKey = `reassessment_nudge_${selectedCompanyId}`
      const nudgeData = localStorage.getItem(storageKey)
      if (nudgeData) {
        const data = JSON.parse(nudgeData)
        if (data.dismissed) return false
      }
      return false
    }

    const daysSinceAssessment = Math.floor(
      (Date.now() - new Date(lastAssessmentDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    const tasksCompleted = tasksCompletedSinceAssessment || 0

    // Trigger 1: 5+ tasks completed since last assessment
    if (tasksCompleted >= 5) return true

    // Trigger 2: 30+ days since last assessment
    if (daysSinceAssessment >= 30) return true

    // Trigger 3: All critical tasks completed (if there were any)
    if (criticalTasksTotal && criticalTasksTotal > 0 && criticalTasksCompleted === criticalTasksTotal) {
      return true
    }

    // Trigger 4: 3+ significant tasks completed (high-impact improvements)
    if (significantTasksCompleted && significantTasksCompleted >= 3) {
      return true
    }

    // Trigger 5: Weekly nudge after 7 days if at least 1 task completed
    if (daysSinceAssessment >= 7 && tasksCompleted >= 1) {
      // Only show once per week - check if we've already shown this week
      const weeklyNudgeKey = `reassessment_weekly_${selectedCompanyId}`
      const lastWeeklyNudge = localStorage.getItem(weeklyNudgeKey)
      if (lastWeeklyNudge) {
        const lastNudgeDate = new Date(lastWeeklyNudge)
        const daysSinceNudge = Math.floor(
          (Date.now() - lastNudgeDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSinceNudge < 7) return false
      }
      // Mark this week's nudge
      localStorage.setItem(weeklyNudgeKey, new Date().toISOString())
      return true
    }

    return false
  }, [dashboardData, reassessmentNudgeDismissed, selectedCompanyId])

  // Handle dismissing the re-assessment nudge
  const handleDismissReassessmentNudge = useCallback(() => {
    setReassessmentNudgeDismissed(true)
    analytics.track('reassessment_nudge_dismissed', {})
  }, [])

  // Handle clicking the re-assessment CTA
  const handleReassessmentClick = useCallback(() => {
    analytics.track('reassessment_nudge_clicked', {
      trigger: dashboardData?.tasksCompletedSinceAssessment && dashboardData.tasksCompletedSinceAssessment >= 5
        ? 'task_count'
        : 'time_based',
    })
    router.push('/dashboard/assessment/risk')
  }, [dashboardData, router])

  // Track feature clicks for exit analysis (available for child components)
  const _trackFeatureClick = useCallback((feature: string) => {
    if (!featuresClicked.current.includes(feature)) {
      featuresClicked.current.push(feature)
    }
  }, [])

  useEffect(() => {
    async function loadData() {
      if (companyLoading) return

      setLoading(true)
      setError(null)

      try {
        // First sync the user and check for pending invites
        const syncRes = await fetch('/api/user/sync', { method: 'POST' })
        const syncData = await syncRes.json()

        // If user has a pending invite, redirect them to accept it
        if (syncData.pendingInvite?.token) {
          router.push(`/invite/${syncData.pendingInvite.token}`)
          return
        }

        if (!selectedCompanyId) {
          // No company selected - check if companies exist in context
          if (companies.length === 0) {
            setNoCompany(true)
            setLoading(false)
            return
          }
          // Auto-select the first company
          setSelectedCompanyId(companies[0].id)
          // The useEffect will re-run with the new selectedCompanyId
          return
        }

        // Fetch consolidated dashboard data
        const response = await fetch(`/api/companies/${selectedCompanyId}/dashboard`)
        if (!response.ok) throw new Error('Failed to fetch dashboard data')

        const data = await response.json()
        setDashboardData(data)
        setNoCompany(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedCompanyId, companies, companyLoading, setSelectedCompanyId])

  // Track dashboard first view
  useEffect(() => {
    if (hasTrackedFirstView.current) return

    // Check if this is the first dashboard view this session
    const hasViewedDashboard = sessionStorage.getItem('hasViewedDashboard')
    const signupTimestamp = sessionStorage.getItem('signupTimestamp')

    if (!hasViewedDashboard) {
      const timeSinceSignup = signupTimestamp
        ? Date.now() - parseInt(signupTimestamp, 10)
        : 0

      analytics.track('dashboard_first_view', {
        timeSinceSignup,
      })

      sessionStorage.setItem('hasViewedDashboard', 'true')
    }

    hasTrackedFirstView.current = true
  }, [])

  // Track valuation and BRI score display when dashboard data loads
  useEffect(() => {
    if (!dashboardData || loading) return

    const { tier1, hasAssessment } = dashboardData

    // Track initial valuation displayed
    if (tier1 && !hasTrackedValuation.current) {
      analytics.track('initial_valuation_displayed', {
        valuationAmount: tier1.currentValue,
        industryMultiple: tier1.finalMultiple,
        calculationMethod: tier1.isEstimated ? 'quick' : 'dcf',
      })
      hasTrackedValuation.current = true
    }

    // Track BRI score displayed
    if (!hasTrackedBriScore.current) {
      analytics.track('bri_score_displayed', {
        score: tier1?.briScore ?? null,
        status: hasAssessment
          ? (tier1?.briScore ? 'complete' : 'incomplete')
          : 'not_started',
      })
      hasTrackedBriScore.current = true
    }
  }, [dashboardData, loading])

  // Track dashboard return visits and value changes (database-backed)
  useEffect(() => {
    if (!dashboardData || loading || hasTrackedReturnView.current || !selectedCompanyId) return
    hasTrackedReturnView.current = true

    const { tier1, tier4 } = dashboardData

    // Fetch last visit from database and log current visit
    async function handleVisitTracking() {
      try {
        // Get last visit from database
        const lastVisitRes = await fetch(`/api/companies/${selectedCompanyId}/visits`)
        if (lastVisitRes.ok) {
          const { lastVisit } = await lastVisitRes.json()

          if (lastVisit && lastVisit.daysSinceVisit >= 1) {
            // Set returning user state for welcome banner
            setIsReturningUser(true)
            setLastVisitData({
              lastBriScore: lastVisit.briScore ?? null,
              lastValuation: lastVisit.valuation ?? null,
              daysSinceVisit: lastVisit.daysSinceVisit,
            })

            // Track analytics
            analytics.track('dashboard_return_view', {
              daysSinceLastVisit: lastVisit.daysSinceVisit,
              visitsThisMonth: 1, // Will be tracked more accurately in future
            })

            // Track valuation change if significant (>5% change)
            if (tier1 && lastVisit.valuation && lastVisit.valuation > 0) {
              const valuationChange = tier1.currentValue - lastVisit.valuation
              const changePercent = (valuationChange / lastVisit.valuation) * 100

              if (Math.abs(changePercent) >= 5) {
                analytics.track('valuation_change_noticed', {
                  previousValue: lastVisit.valuation,
                  newValue: tier1.currentValue,
                  changePercent,
                  interactionType: 'none',
                })
              }
            }

            // Track BRI score change if different
            if (tier1?.briScore !== undefined && lastVisit.briScore !== null) {
              const scoreDiff = (tier1.briScore ?? 0) - lastVisit.briScore
              if (scoreDiff !== 0) {
                analytics.track('bri_change_noticed', {
                  previousScore: lastVisit.briScore,
                  newScore: tier1.briScore ?? 0,
                  interactionType: 'none',
                })
              }
            }
          }
        }

        // Log current visit to database
        await fetch(`/api/companies/${selectedCompanyId}/visits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            briScore: tier1?.briScore ?? null,
            valuation: tier1?.currentValue ?? null,
            tasksCompleted: tier4?.taskStats?.completed ?? 0,
            criticalTasksCompleted: 0, // Will be calculated server-side in future
          }),
        })
      } catch (error) {
        // Fallback to localStorage if database fails
        console.debug('Database visit tracking failed, using localStorage fallback:', error)
        handleLocalStorageFallback()
      }
    }

    // LocalStorage fallback (for offline/error cases)
    function handleLocalStorageFallback() {
      const storageKey = `dashboard_last_visit_${selectedCompanyId}`
      const visitsKey = `dashboard_visits_${selectedCompanyId}`

      try {
        const lastVisitData = localStorage.getItem(storageKey)
        const visitsData = localStorage.getItem(visitsKey)

        let visitsThisMonth = 1
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${now.getMonth()}`

        if (visitsData) {
          const parsed = JSON.parse(visitsData)
          if (parsed.month === currentMonth) {
            visitsThisMonth = (parsed.count || 0) + 1
          }
        }

        // Track return visit if this is not the first visit
        if (lastVisitData) {
          const lastVisit = JSON.parse(lastVisitData)
          const lastVisitDate = new Date(lastVisit.timestamp)
          const daysSinceLastVisit = Math.floor(
            (now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)
          )

          const hoursSinceLastVisit = (now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60)
          if (hoursSinceLastVisit >= 1 && daysSinceLastVisit >= 1) {
            setIsReturningUser(true)
            setLastVisitData({
              lastBriScore: lastVisit.briScore ?? null,
              lastValuation: lastVisit.valuation ?? null,
              daysSinceVisit: daysSinceLastVisit,
            })

            analytics.track('dashboard_return_view', {
              daysSinceLastVisit,
              visitsThisMonth,
            })
          }
        }

        // Store current visit data
        localStorage.setItem(storageKey, JSON.stringify({
          timestamp: now.toISOString(),
          valuation: tier1?.currentValue ?? null,
          briScore: tier1?.briScore ?? null,
        }))

        localStorage.setItem(visitsKey, JSON.stringify({
          month: currentMonth,
          count: visitsThisMonth,
        }))
      } catch (error) {
        console.debug('Could not track return visit:', error)
      }
    }

    // Run the database-backed tracking
    handleVisitTracking()
  }, [dashboardData, loading, selectedCompanyId])

  // Track exit without assessment on unmount
  useEffect(() => {
    const trackExitWithoutAssessment = () => {
      // Only track if dashboard was fully loaded and user hasn't started assessment
      if (!dashboardData || dashboardData.hasAssessment) return

      const timeOnDashboard = Date.now() - dashboardLoadTime.current

      analytics.track('dashboard_exit_without_assessment', {
        timeOnDashboard,
        scrollDepthReached,
        ctaWasVisible: assessmentCtaWasVisible.current,
        featuresClicked: featuresClicked.current,
      })
    }

    // Track on beforeunload (leaving the page)
    const handleBeforeUnload = () => {
      trackExitWithoutAssessment()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Track on component unmount (navigation)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      trackExitWithoutAssessment()
    }
  }, [dashboardData, scrollDepthReached])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative bg-card rounded-2xl border border-border shadow-xl shadow-black/5 overflow-hidden"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="pt-4 md:pt-6 px-8 md:px-12 pb-8 md:pb-12">
            {/* Hero metrics skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
              <div className="h-48 bg-gradient-to-br from-muted to-muted/50 rounded-xl animate-pulse" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-[88px] bg-muted rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
            </div>

            {/* Value drivers skeleton */}
            <div className="py-8 border-t border-border">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-full bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>

            {/* BRI breakdown skeleton */}
            <div className="py-8 border-t border-border">
              <div className="h-4 w-48 bg-muted rounded animate-pulse mb-6" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-2 bg-muted rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Loading indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-red-800 dark:text-red-200">Something went wrong</p>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </motion.div>
    )
  }

  // No company selected - show unified focused onboarding wizard (Dan + Alex style)
  if (noCompany || !dashboardData) {
    return <FocusedOnboardingWizard userName={userName} />
  }

  const { tier1, tier2, tier3, hasAssessment } = dashboardData

  // Default empty categories for when no assessment exists
  const emptyCategories = [
    { key: 'FINANCIAL', label: 'Financial', score: 0 },
    { key: 'TRANSFERABILITY', label: 'Transferability', score: 0 },
    { key: 'OPERATIONAL', label: 'Operations', score: 0 },
    { key: 'MARKET', label: 'Market', score: 0 },
    { key: 'LEGAL_TAX', label: 'Legal/Tax', score: 0 },
    { key: 'PERSONAL', label: 'Personal', score: 0 },
  ]

  // Calculate preview values when dragging the multiple slider
  const isPreviewMode = previewMultiple !== null

  // baseMultiple is the max achievable multiple based on Core Score (used for potential value)
  const baseMultiple = tier1 && tier2.adjustedEbitda > 0
    ? tier1.potentialValue / tier2.adjustedEbitda
    : tier2.multipleRange.high

  const previewCurrentValue = isPreviewMode && tier1
    ? tier2.adjustedEbitda * previewMultiple
    : tier1?.currentValue ?? 0

  const previewValueGap = isPreviewMode && tier1
    ? Math.max(0, tier1.potentialValue - previewCurrentValue)
    : tier1?.valueGap ?? 0

  // Check if preview exceeds the achievable potential (based on Core Score)
  // Also true when DCF already exceeds potential (marketPremium > 0)
  const isAbovePotential = (tier1?.marketPremium ?? 0) > 0 || (isPreviewMode && previewMultiple > baseMultiple)

  // Show the full dashboard (with assessment prompt if needed)
  return (
    <div className="max-w-5xl mx-auto">

      {/* Re-assessment Nudge */}
      <AnimatePresence>
        {shouldSuggestReassessment() && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-gradient-to-r from-emerald-500/10 to-primary/10 rounded-xl border border-emerald-500/20"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Time to See Your Progress
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ve made changes since your last assessment. Retake it to see your updated BRI score.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismissReassessmentNudge}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </Button>
                <Button
                  onClick={handleReassessmentClick}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Update My Score
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Returning User Welcome Banner */}
      <AnimatePresence>
        {isReturningUser && lastVisitData && dashboardData?.tier1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-amber-500/5 rounded-xl border border-primary/20"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Welcome back!{' '}
                    {lastVisitData.daysSinceVisit === 1
                      ? "Here's what changed since yesterday:"
                      : `Here's what changed in the last ${lastVisitData.daysSinceVisit} days:`}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-sm">
                    {lastVisitData.lastBriScore !== null &&
                      dashboardData.tier1.briScore !== null &&
                      lastVisitData.lastBriScore !== dashboardData.tier1.briScore && (
                        <span className={dashboardData.tier1.briScore > lastVisitData.lastBriScore ? 'text-emerald-600' : 'text-amber-600'}>
                          BRI: {lastVisitData.lastBriScore} → {dashboardData.tier1.briScore}
                          {dashboardData.tier1.briScore > lastVisitData.lastBriScore ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    {lastVisitData.lastValuation !== null &&
                      lastVisitData.lastValuation !== dashboardData.tier1.currentValue && (
                        <span className={dashboardData.tier1.currentValue > lastVisitData.lastValuation ? 'text-emerald-600' : 'text-amber-600'}>
                          Valuation: ${(lastVisitData.lastValuation / 1000000).toFixed(1)}M → ${(dashboardData.tier1.currentValue / 1000000).toFixed(1)}M
                        </span>
                      )}
                    {((lastVisitData.lastBriScore === null || lastVisitData.lastBriScore === dashboardData.tier1.briScore) &&
                      (lastVisitData.lastValuation === null || lastVisitData.lastValuation === dashboardData.tier1.currentValue)) && (
                        <span className="text-muted-foreground">
                          No changes yet — complete a task to see progress
                        </span>
                      )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReturningUser(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Dashboard Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden border-border/50 shadow-xl shadow-black/5">
          <CardContent className="relative pt-4 md:pt-6 px-8 md:px-12 pb-8 md:pb-12">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-amber-500/[0.02] pointer-events-none" />
          {/* Tier 1: Hero Metrics */}
          {tier1 && (
            <HeroMetrics
              currentValue={isPreviewMode ? previewCurrentValue : tier1.currentValue}
              potentialValue={tier1.potentialValue}
              valueGap={isPreviewMode ? previewValueGap : tier1.valueGap}
              marketPremium={tier1.marketPremium}
              briScore={tier1.briScore}
              coreScore={tier1.coreScore}
              personalReadinessScore={tier3?.categories.find(c => c.key === 'PERSONAL')?.score ?? null}
              isEstimated={tier1.isEstimated}
              isPreviewMode={isPreviewMode}
              isAbovePotential={isAbovePotential}
              hasAssessment={hasAssessment}
            />
          )}

          {/* Tier 2: Value Drivers */}
          <ValueDrivers
            adjustedEbitda={tier2.adjustedEbitda}
            isEbitdaEstimated={tier2.isEbitdaEstimated}
            multipleRange={tier2.multipleRange}
            industryName={tier1?.industryName || 'General Industry'}
            onMultipleDragChange={setPreviewMultiple}
            onMultipleDragEnd={() => setPreviewMultiple(null)}
          />

          {/* Tier 3: Risk Breakdown */}
          <RiskBreakdown
            categories={tier3?.categories || emptyCategories}
            topConstraints={tier3?.topConstraints || []}
            hasAssessment={hasAssessment}
            onAssessmentCtaVisible={handleAssessmentCtaVisible}
          />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
