'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'
import { formatCurrency } from '@/lib/utils/currency'
import { FinancialsDataEntry } from '@/components/financials/FinancialsDataEntry'
import { Pencil, Loader2, CheckCircle, Link2, AlertCircle, X, TrendingUp } from 'lucide-react'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { analytics } from '@/lib/analytics'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/financials/financials-pages.module.css'

interface FinancialPeriod {
  id: string
  fiscalYear: number
  label: string
}

interface IntegrationData {
  configured: boolean
  hasQuickBooksIntegration: boolean
  lastSyncedAt: string | null
  providerCompanyName?: string | null
}

// QuickBooks Logo Component
function QuickBooksLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <circle cx="20" cy="20" r="18" fill="#2CA01C" />
      <path
        d="M12 20c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8"
        stroke="white"
        strokeWidth="3"
        fill="none"
      />
      <circle cx="20" cy="20" r="3" fill="white" />
    </svg>
  )
}

// Get conditional headline based on assessment status
function getFinancialsHeadline(hasAssessment: boolean, hasBriScore: boolean) {
  if (hasBriScore) {
    return {
      title: "Move Beyond Industry Averages",
      description: "Your BRI shows how buyers see your business. Add your financials to see what they'd actually pay.",
    }
  }
  if (hasAssessment) {
    return {
      title: "Your Profile is Missing Financials",
      description: "Add 3 years of historical data to unlock your actual valuation — not just industry estimates.",
    }
  }
  return {
    title: "Unlock Your True Valuation",
    description: "Add your financial data to see what your business is really worth.",
  }
}

// Empty State Component
function FinancialsEmptyState({
  companyId: _companyId,
  integrationData,
  onAddYear,
  onQuickBooksConnect,
  isConnecting,
  isCreatingPeriods = false,
  hasAssessment = false,
  hasBriScore = false,
  completedTaskCount = 0,
  completedTaskValue = 0,
}: {
  companyId: string
  integrationData: IntegrationData
  onAddYear: (fyeMonth: number, fyeDay: number) => void
  onQuickBooksConnect: () => void
  isConnecting: boolean
  isCreatingPeriods?: boolean
  hasAssessment?: boolean
  hasBriScore?: boolean
  completedTaskCount?: number
  completedTaskValue?: number
}) {
  const headline = getFinancialsHeadline(hasAssessment, hasBriScore)

  const currentYear = new Date().getFullYear()
  const requiredYears = [
    { year: currentYear - 3, label: `FY ${currentYear - 3}`, description: '3 years ago' },
    { year: currentYear - 2, label: `FY ${currentYear - 2}`, description: '2 years ago' },
    { year: currentYear - 1, label: `FY ${currentYear - 1}`, description: 'Last year' },
    { year: currentYear, label: 'T12', description: 'Trailing 12 months' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={styles.editEmptyRoot}
    >
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={styles.editHero}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className={styles.editHeroIcon}
        >
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={styles.editHeroTitle}
        >
          {headline.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={styles.editHeroDesc}
        >
          {headline.description}
        </motion.p>

        {hasBriScore && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={styles.editHeroSub}
          >
            Add 3 years of historical financials plus your trailing 12 months.
          </motion.p>
        )}
      </motion.div>

      {/* Task Value Context Banner */}
      {completedTaskCount > 0 && completedTaskValue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className={styles.editContextBanner}
        >
          <div className={styles.editBannerEmerald}>
            <div className={styles.editBannerEmeraldIcon}>
              <TrendingUp size={16} />
            </div>
            <p>
              You&apos;ve already improved your value by{' '}
              <span className={styles.editBannerBold}>{formatCurrency(completedTaskValue)}</span>{' '}
              through {completedTaskCount} completed task{completedTaskCount !== 1 ? 's' : ''}.
              Add your financials to see your total valuation.
            </p>
          </div>
        </motion.div>
      )}

      {hasBriScore && completedTaskCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className={styles.editContextBanner}
        >
          <div className={styles.editBannerBlue}>
            <div className={styles.editBannerBlueIcon}>
              <CheckCircle size={16} />
            </div>
            <p>
              Your risk profile is assessed. Now add financials to see what buyers would actually pay.
            </p>
          </div>
        </motion.div>
      )}

      {/* Timeline Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={styles.editTimelineCard}
      >
        <h3 className={styles.editTimelineHeading}>
          Required Financial Periods
        </h3>

        {/* Period Timeline */}
        <div className={styles.editTimeline}>
          <div className={styles.editTimelineTrack} />

          <div className={styles.editTimelineGrid}>
            {requiredYears.map((period, index) => (
              <motion.div
                key={period.year}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <div className={styles.editTimelineDot} />
                <div className={styles.editPeriodTile}>
                  <div className={styles.editPeriodYear}>{period.label}</div>
                  <div className={styles.editPeriodDesc}>{period.description}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className={styles.editDivider}>
          <div className={styles.editDividerInner}>
            <hr className={styles.editDividerLine} />
            <span className={styles.editDividerLabel}>Choose how to add your data</span>
            <hr className={styles.editDividerLine} />
          </div>
        </div>

        {/* Two Paths */}
        <div className={styles.editPathGrid}>
          {/* QuickBooks Path */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className={
              integrationData.hasQuickBooksIntegration
                ? `${styles.editQbCard} ${styles.editQbCardConnected}`
                : styles.editQbCard
            }
          >
            {integrationData.configured && !integrationData.hasQuickBooksIntegration && (
              <span className={styles.editRecommendedBadge}>Recommended</span>
            )}

            <div className={styles.editPathHeader}>
              <div className={styles.editQbLogoWrap}>
                <QuickBooksLogo />
              </div>
              <div className={styles.editPathMeta}>
                <h4 className={styles.editPathTitle}>QuickBooks Online</h4>
                <p className={styles.editPathDesc}>
                  {integrationData.hasQuickBooksIntegration
                    ? `Connected${integrationData.providerCompanyName ? ` to ${integrationData.providerCompanyName}` : ''}`
                    : 'Import P&L and Balance Sheet data automatically'
                  }
                </p>
              </div>
            </div>

            <div className={styles.editPathAction}>
              {integrationData.hasQuickBooksIntegration ? (
                <div className={styles.editQbConnectedStatus}>
                  <CheckCircle size={16} />
                  <span>Connected and syncing</span>
                </div>
              ) : integrationData.configured ? (
                <Button
                  onClick={onQuickBooksConnect}
                  disabled={isConnecting}
                  className="w-full"
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Connect QuickBooks
                </Button>
              ) : (
                <p className={styles.editQbNotConfigured}>
                  QuickBooks integration not configured for your account
                </p>
              )}
            </div>
          </motion.div>

          {/* Manual Entry Path */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
            className={styles.editManualCard}
          >
            <div className={styles.editPathHeader}>
              <div className={styles.editManualIconWrap}>
                <Pencil size={24} />
              </div>
              <div className={styles.editPathMeta}>
                <h4 className={styles.editPathTitle}>Enter Manually</h4>
                <p className={styles.editPathDesc}>
                  Add your financial data year by year
                </p>
              </div>
            </div>

            <div className={styles.editPathAction}>
              <Button variant="outline" onClick={() => onAddYear(12, 31)} className="w-full" disabled={isCreatingPeriods}>
                {isCreatingPeriods ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting up your periods...
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Enter Manually
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className={styles.editBenefits}
      >
        <div className={styles.editBenefitsGrid}>
          {[
            { icon: '📊', title: 'Accurate Valuation', desc: 'Based on your actual EBITDA trends' },
            { icon: '📈', title: 'Growth Analysis', desc: 'See revenue and profit trajectories' },
            { icon: '💰', title: 'DCF Modeling', desc: 'Unlock discounted cash flow analysis' },
          ].map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + index * 0.1 }}
              className={styles.editBenefit}
            >
              <div className={styles.editBenefitIcon}>{benefit.icon}</div>
              <h4 className={styles.editBenefitTitle}>{benefit.title}</h4>
              <p className={styles.editBenefitDesc}>{benefit.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Main content component
function FinancialsContent() {
  const searchParams = useSearchParams()
  const { selectedCompanyId } = useCompany()
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [integrationData, setIntegrationData] = useState<IntegrationData>({
    configured: false,
    hasQuickBooksIntegration: false,
    lastSyncedAt: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCreatingPeriods, setIsCreatingPeriods] = useState(false)
  const [qbError, setQbError] = useState<string | null>(null)
  const [qbSuccess, setQbSuccess] = useState<string | null>(null)

  // Assessment status for conditional messaging
  const [hasAssessment, setHasAssessment] = useState(false)
  const [hasBriScore, setHasBriScore] = useState(false)

  // Task stats for motivational context
  const [completedTaskCount, setCompletedTaskCount] = useState(0)
  const [completedTaskValue, setCompletedTaskValue] = useState(0)

  // Analytics tracking
  const hasTrackedPageView = useRef(false)

  // Load periods — always call batch to ensure current years are scaffolded.
  // The batch endpoint is idempotent: skips existing, creates missing, returns full list.
  const loadPeriods = useCallback(async () => {
    if (!selectedCompanyId) return

    try {
      const response = await fetchWithRetry(`/api/companies/${selectedCompanyId}/financial-periods`)
      if (response.ok) {
        const data = await response.json()
        const loadedPeriods = data.periods || []

        if (loadedPeriods.length > 0) {
          // Ensure periods are up-to-date (e.g. new fiscal year rolls over)
          const batchResponse = await fetch(
            `/api/companies/${selectedCompanyId}/financial-periods/batch`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' } }
          )
          if (batchResponse.ok) {
            const batchData = await batchResponse.json()
            setPeriods(batchData.periods || loadedPeriods)
            return
          }
        }

        setPeriods(loadedPeriods)
      }
    } catch (err) {
      console.error('Error loading periods:', err)
    }
  }, [selectedCompanyId])

  // Load integration data
  const loadIntegrationData = useCallback(async () => {
    if (!selectedCompanyId) return

    try {
      const response = await fetchWithRetry(`/api/integrations/quickbooks?companyId=${selectedCompanyId}`)
      if (response.ok) {
        const data = await response.json()
        setIntegrationData({
          configured: data.configured || false,
          hasQuickBooksIntegration: data.connected || false,
          lastSyncedAt: data.lastSyncedAt || null,
          providerCompanyName: data.providerCompanyName,
        })
      }
    } catch (err) {
      console.error('Error loading integration data:', err)
    }
  }, [selectedCompanyId])

  // Load assessment status for conditional messaging
  const loadAssessmentStatus = useCallback(async () => {
    if (!selectedCompanyId) return

    try {
      const response = await fetchWithRetry(`/api/companies/${selectedCompanyId}/dashboard`)
      if (response.ok) {
        const data = await response.json()
        setHasAssessment(data.hasAssessment || false)
        setHasBriScore(data.tier1?.briScore != null && data.tier1.briScore > 0)
      }
    } catch (err) {
      console.error('Error loading assessment status:', err)
    }
  }, [selectedCompanyId])

  // Load task stats for motivational context
  const loadTaskStats = useCallback(async () => {
    if (!selectedCompanyId) return

    try {
      const response = await fetchWithRetry(`/api/tasks?companyId=${selectedCompanyId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.stats) {
          setCompletedTaskCount(data.stats.completed || 0)
          setCompletedTaskValue(data.stats.completedValue || 0)
        }
      }
    } catch (err) {
      console.error('Error loading task stats:', err)
    }
  }, [selectedCompanyId])

  // Initial load
  useEffect(() => {
    async function load() {
      setIsLoading(true)
      await Promise.all([loadPeriods(), loadIntegrationData(), loadAssessmentStatus(), loadTaskStats()])
      setIsLoading(false)
    }
    load()
  }, [loadPeriods, loadIntegrationData, loadAssessmentStatus, loadTaskStats])

  // Track page view after loading
  useEffect(() => {
    if (isLoading || hasTrackedPageView.current) return

    hasTrackedPageView.current = true
    analytics.track('financials_page_viewed', {
      entryPoint: 'navigation',
      subscriptionTier: 'unknown',
      hasExistingData: periods.length > 0,
    })

    if (periods.length === 0) {
      analytics.track('financials_empty_state_seen', {
        section: 'main',
      })
    }
  }, [isLoading, periods.length])

  // Check for OAuth callback params
  useEffect(() => {
    const qbConnected = searchParams.get('qb_connected')
    const qbErrorParam = searchParams.get('qb_error')

    if (qbConnected === 'true') {
      setQbSuccess('QuickBooks connected successfully! Syncing your data...')
      window.history.replaceState({}, '', window.location.pathname)
      loadIntegrationData()
      loadPeriods()
    } else if (qbErrorParam) {
      setQbError(decodeURIComponent(qbErrorParam))
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams, loadIntegrationData, loadPeriods])

  // Handle QuickBooks connect
  const handleQuickBooksConnect = async () => {
    if (!selectedCompanyId) return

    analytics.track('quickbooks_connect_clicked', {
      currentDataState: periods.length === 0 ? 'empty' : 'partial',
    })

    setIsConnecting(true)
    setQbError(null)

    try {
      const response = await fetch('/api/integrations/quickbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', companyId: selectedCompanyId }),
      })

      if (response.ok) {
        const data = await response.json()
        window.location.href = data.authUrl
      } else {
        const data = await response.json()
        setQbError(data.error || 'Failed to start connection')
        setIsConnecting(false)
      }
    } catch (_err) {
      setQbError('Failed to connect to QuickBooks')
      setIsConnecting(false)
    }
  }

  // Handle "Enter Manually" — save FYE then batch-create all required periods
  const handleEnterManually = async (fyeMonth: number, fyeDay: number) => {
    if (!selectedCompanyId || isCreatingPeriods) return

    setIsCreatingPeriods(true)
    analytics.track('financials_enter_manually_clicked', {})

    try {
      await fetch(`/api/companies/${selectedCompanyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fiscalYearEndMonth: fyeMonth,
          fiscalYearEndDay: fyeDay,
        }),
      })

      const response = await fetch(`/api/companies/${selectedCompanyId}/financial-periods/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create periods')
      }

      const data = await response.json()
      setPeriods(data.periods || [])

      analytics.track('financial_periods_batch_created', {
        created: data.created,
        skipped: data.skipped,
        totalPeriods: data.periods?.length || 0,
      })
    } catch (err) {
      console.error('Error creating periods:', err)
    } finally {
      setIsCreatingPeriods(false)
    }
  }

  if (!selectedCompanyId) {
    return (
      <div className={styles.editCentered}>
        <p>Please select a company</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={styles.editCentered}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--text-secondary)' }} />
      </div>
    )
  }

  return (
    <div className={styles.editContainer}>
      {/* QB Messages */}
      <AnimatePresence>
        {qbError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={styles.editAlertError}
          >
            <AlertCircle size={16} />
            <span>{qbError}</span>
            <button onClick={() => setQbError(null)} className={styles.editAlertDismiss}>
              <X size={16} />
            </button>
          </motion.div>
        )}
        {qbSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={styles.editAlertSuccess}
          >
            <CheckCircle size={16} />
            <span>{qbSuccess}</span>
            <button onClick={() => setQbSuccess(null)} className={styles.editAlertDismiss}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state or Spreadsheet */}
      {periods.length === 0 ? (
        <FinancialsEmptyState
          companyId={selectedCompanyId}
          integrationData={integrationData}
          onAddYear={handleEnterManually}
          onQuickBooksConnect={handleQuickBooksConnect}
          isConnecting={isConnecting}
          isCreatingPeriods={isCreatingPeriods}
          hasAssessment={hasAssessment}
          hasBriScore={hasBriScore}
          completedTaskCount={completedTaskCount}
          completedTaskValue={completedTaskValue}
        />
      ) : (
        <FinancialsDataEntry companyId={selectedCompanyId} />
      )}
    </div>
  )
}

// Page component with Suspense
export default function FinancialsPage() {
  return (
    <>
      <TrackPageView page="/dashboard/financials" />
      <Suspense fallback={
        <div className={styles.editCentered}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      }>
        <FinancialsContent />
      </Suspense>
    </>
  )
}
