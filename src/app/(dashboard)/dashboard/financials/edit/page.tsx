'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from '@/lib/motion'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { FinancialsDataEntry } from '@/components/financials/FinancialsDataEntry'
import { Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'
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

// Empty State Component
function FinancialsEmptyState({
  companyId: _companyId,
  integrationData: _integrationData,
  onAddYear,
  onQuickBooksConnect,
  isConnecting,
  isCreatingPeriods = false,
  hasAssessment: _hasAssessment = false,
  hasBriScore: _hasBriScore = false,
  completedTaskCount: _completedTaskCount = 0,
  completedTaskValue: _completedTaskValue = 0,
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
  return (
    <>
      {/* Top bar */}
      <div className={styles.finTopBar}>
        <div>
          <h1 className={styles.finTopBarTitle}>Financials</h1>
          <p className={styles.finTopBarSub}>Connect your accounting to get started</p>
        </div>
        <button
          className={styles.finTopBarBtn}
          onClick={onQuickBooksConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          )}
          Connect QuickBooks
        </button>
      </div>

      {/* Empty hero card */}
      <div className={styles.emptyHero}>
        <div className={styles.emptyIconWrap}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="36" height="36"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="7 10 9 10 11 6 13 14 15 10 17 10"/></svg>
        </div>
        <div className={styles.emptyTitle}>No financial data yet</div>
        <div className={styles.emptySubtitle}>Connect your accounting software or upload statements to unlock:</div>
        <ul className={styles.benefitList}>
          <li>
            <div className={styles.benefitCheck}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            Automated P&amp;L, balance sheet, and cash flow analysis
          </li>
          <li>
            <div className={styles.benefitCheck}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            EBITDA calculation with add-back suggestions
          </li>
          <li>
            <div className={styles.benefitCheck}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            Trend analysis and financial health scoring
          </li>
        </ul>
        <div className={styles.ctaStack}>
          <button
            className={styles.finTopBarBtn}
            style={{ fontSize: '14px', padding: '11px 28px' }}
            onClick={onQuickBooksConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            )}
            Connect QuickBooks
          </button>
          <div className={styles.ctaLinks}>
            <button
              className={styles.linkPlain}
              onClick={() => onAddYear(12, 31)}
              disabled={isCreatingPeriods}
            >
              {isCreatingPeriods ? 'Setting up your periods...' : 'Or upload CSV statements'}
            </button>
            <span className={styles.ctaDivider}>&nbsp;&middot;&nbsp;</span>
            <Link href="/dashboard/financials" className={styles.linkAccent}>
              See sample financials &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Blurred preview cards */}
      <div className={styles.previewGrid}>

        {/* P&L Preview */}
        <div className={styles.previewCard}>
          <div className={styles.previewCardInner}>
            <div className={styles.previewCardLabel}>P&amp;L Statement</div>
            <div className={styles.previewRow}>
              <div className={styles.previewCell} style={{ width: '44%' }} />
              <div className={styles.previewCell} style={{ width: '18%' }} />
            </div>
            <div className={styles.previewRow}>
              <div className={styles.previewCell} style={{ width: '58%' }} />
              <div className={styles.previewCell} style={{ width: '20%' }} />
            </div>
            <div className={styles.previewRow}>
              <div className={styles.previewCell} style={{ width: '32%' }} />
              <div className={styles.previewCell} style={{ width: '22%' }} />
            </div>
            <div className={styles.previewRow} style={{ borderBottom: 'none' }}>
              <div className={styles.previewCell} style={{ width: '50%', height: '11px' }} />
              <div className={styles.previewCell} style={{ width: '22%', height: '11px' }} />
            </div>
            <div className={styles.previewBars}>
              <div className={styles.previewBar} style={{ height: '42%' }} />
              <div className={styles.previewBar} style={{ height: '53%' }} />
              <div className={styles.previewBar} style={{ height: '48%' }} />
              <div className={styles.previewBar} style={{ height: '63%' }} />
              <div className={styles.previewBar} style={{ height: '57%' }} />
              <div className={styles.previewBar} style={{ height: '72%' }} />
            </div>
          </div>
          <div className={styles.previewOverlay}>
            <div>
              <div className={styles.previewLock}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <div className={styles.previewOverlayLabel}>P&amp;L Statement<br />Unlocked with financial data</div>
            </div>
          </div>
        </div>

        {/* Balance Sheet Preview */}
        <div className={styles.previewCard}>
          <div className={styles.previewCardInner}>
            <div className={styles.previewCardLabel}>Balance Sheet</div>
            <div className={styles.previewRow}>
              <div className={styles.previewCell} style={{ width: '36%' }} />
              <div className={styles.previewCell} style={{ width: '21%' }} />
            </div>
            <div className={styles.previewRow}>
              <div className={styles.previewCell} style={{ width: '52%' }} />
              <div className={styles.previewCell} style={{ width: '19%' }} />
            </div>
            <div className={styles.previewRow}>
              <div className={styles.previewCell} style={{ width: '40%' }} />
              <div className={styles.previewCell} style={{ width: '23%' }} />
            </div>
            <div className={styles.previewRow} style={{ borderBottom: 'none' }}>
              <div className={styles.previewCell} style={{ width: '46%', height: '11px' }} />
              <div className={styles.previewCell} style={{ width: '20%', height: '11px' }} />
            </div>
            <div className={styles.previewBars}>
              <div className={styles.previewBar} style={{ height: '60%' }} />
              <div className={styles.previewBar} style={{ height: '60%' }} />
              <div className={styles.previewBar} style={{ height: '38%' }} />
              <div className={styles.previewBar} style={{ height: '38%' }} />
              <div className={styles.previewBar} style={{ height: '76%' }} />
              <div className={styles.previewBar} style={{ height: '76%' }} />
            </div>
          </div>
          <div className={styles.previewOverlay}>
            <div>
              <div className={styles.previewLock}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <div className={styles.previewOverlayLabel}>Balance Sheet<br />Unlocked with financial data</div>
            </div>
          </div>
        </div>

      </div>

      {/* AI Coach CTA */}
      <Link href="/dashboard/ai-coach" className={styles.finCoachCta}>
        <div className={styles.finCoachIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </div>
        <div className={styles.finCoachContent}>
          <div className={styles.finCoachTitle}>Your AI Coach is ready to analyze your financials</div>
          <div className={styles.finCoachDesc}>Once you connect your financials, I&apos;ll automatically identify EBITDA adjustments that could increase your valuation. Most owners miss $50K&ndash;$200K in legitimate add-backs.</div>
        </div>
        <div className={styles.finCoachArrow}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </Link>
    </>
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
