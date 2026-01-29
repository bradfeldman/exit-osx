'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'
import { AddPeriodDialog } from '@/components/financials/AddPeriodDialog'
import { FinancialsSpreadsheet } from '@/components/financials/FinancialsSpreadsheet'
import { Plus, Pencil, Loader2, CheckCircle, Link2, AlertCircle, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { analytics } from '@/lib/analytics'

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

// Empty State Component
function FinancialsEmptyState({
  companyId,
  integrationData,
  onAddYear,
  onQuickBooksConnect,
  isConnecting,
}: {
  companyId: string
  integrationData: IntegrationData
  onAddYear: () => void
  onQuickBooksConnect: () => void
  isConnecting: boolean
}) {
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
      className="space-y-8"
    >
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center max-w-2xl mx-auto"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6"
        >
          <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl md:text-4xl font-bold text-foreground font-display mb-3"
        >
          Unlock Your True Valuation
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-muted-foreground"
        >
          Add 3 years of historical financials plus your trailing 12 months to calculate your company&apos;s value based on actual performance.
        </motion.p>
      </motion.div>

      {/* Timeline Visual */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <Card className="border-border/50 shadow-lg overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 text-center">
              Required Financial Periods
            </h3>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-muted via-primary/30 to-primary hidden md:block" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {requiredYears.map((period, index) => (
                  <motion.div
                    key={period.year}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="relative"
                  >
                    <div className="hidden md:flex w-4 h-4 rounded-full bg-muted border-2 border-primary/30 mx-auto mb-4 relative z-10" />

                    <div className="bg-muted/50 rounded-xl p-4 text-center hover:bg-muted/70 transition-colors">
                      <div className="text-2xl font-bold text-foreground font-display">
                        {period.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {period.description}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">Choose how to add your data</span>
              </div>
            </div>

            {/* Two Paths */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* QuickBooks Path */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
                className={`relative p-6 rounded-xl border-2 transition-all ${
                  integrationData.hasQuickBooksIntegration
                    ? 'border-green-500/50 bg-green-50/50'
                    : 'border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40'
                }`}
              >
                {integrationData.configured && !integrationData.hasQuickBooksIntegration && (
                  <div className="absolute -top-3 left-4">
                    <span className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                      Recommended
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                    <QuickBooksLogo />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">QuickBooks Online</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {integrationData.hasQuickBooksIntegration
                        ? `Connected${integrationData.providerCompanyName ? ` to ${integrationData.providerCompanyName}` : ''}`
                        : 'Import P&L and Balance Sheet data automatically'
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  {integrationData.hasQuickBooksIntegration ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
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
                    <p className="text-xs text-muted-foreground">
                      QuickBooks integration not configured for your account
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Manual Path */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 }}
                className="p-6 rounded-xl border-2 border-border hover:border-primary/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Pencil className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">Enter Manually</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add your financial data year by year
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <Button variant="outline" onClick={onAddYear} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Year
                  </Button>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="max-w-3xl mx-auto"
      >
        <div className="grid md:grid-cols-3 gap-4">
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
              className="text-center p-4"
            >
              <div className="text-3xl mb-2">{benefit.icon}</div>
              <h4 className="font-medium text-foreground">{benefit.title}</h4>
              <p className="text-sm text-muted-foreground">{benefit.desc}</p>
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
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [qbError, setQbError] = useState<string | null>(null)
  const [qbSuccess, setQbSuccess] = useState<string | null>(null)

  // Analytics tracking
  const hasTrackedPageView = useRef(false)

  // Load periods
  const loadPeriods = useCallback(async () => {
    if (!selectedCompanyId) return

    try {
      const response = await fetchWithRetry(`/api/companies/${selectedCompanyId}/financial-periods`)
      if (response.ok) {
        const data = await response.json()
        setPeriods(data.periods || [])
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

  // Initial load
  useEffect(() => {
    async function load() {
      setIsLoading(true)
      await Promise.all([loadPeriods(), loadIntegrationData()])
      setIsLoading(false)
    }
    load()
  }, [loadPeriods, loadIntegrationData])

  // Track page view after loading
  useEffect(() => {
    if (isLoading || hasTrackedPageView.current) return

    hasTrackedPageView.current = true
    analytics.track('financials_page_viewed', {
      entryPoint: 'navigation',
      subscriptionTier: 'unknown', // Could be enriched from context
      hasExistingData: periods.length > 0,
    })

    // Track empty state if no data
    if (periods.length === 0) {
      analytics.track('financials_empty_state_seen', {
        section: 'main',
      })
    }
  }, [isLoading, periods.length])

  // Check for OAuth callback params
  // This effect intentionally sets state based on URL params for OAuth callback handling
  useEffect(() => {
    const qbConnected = searchParams.get('qb_connected')
    const qbErrorParam = searchParams.get('qb_error')

    if (qbConnected === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQbSuccess('QuickBooks connected successfully! Syncing your data...')
      window.history.replaceState({}, '', window.location.pathname)
      loadIntegrationData()
      loadPeriods()
    } else if (qbErrorParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQbError(decodeURIComponent(qbErrorParam))
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams, loadIntegrationData, loadPeriods])

  // Handle QuickBooks connect
  const handleQuickBooksConnect = async () => {
    if (!selectedCompanyId) return

    // Track QuickBooks connect click
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

  // Handle period created
  const handlePeriodCreated = (periodData?: { fiscalYear: number; periodType: string }) => {
    setShowAddDialog(false)
    loadPeriods()

    // Track period creation
    if (periodData) {
      analytics.track('financial_period_created', {
        fiscalYear: periodData.fiscalYear,
        periodType: periodData.periodType.toLowerCase() as 'annual' | 'quarterly' | 'monthly' | 't12',
        dataSource: 'manual',
      })
    }
  }

  if (!selectedCompanyId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Please select a company</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* QB Messages */}
      <AnimatePresence>
        {qbError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{qbError}</span>
            <button onClick={() => setQbError(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
        {qbSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-2 text-sm text-green-600 bg-green-50 px-4 py-3 rounded-lg"
          >
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{qbSuccess}</span>
            <button onClick={() => setQbSuccess(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state or Spreadsheet */}
      {periods.length === 0 ? (
        <FinancialsEmptyState
          companyId={selectedCompanyId}
          integrationData={integrationData}
          onAddYear={() => setShowAddDialog(true)}
          onQuickBooksConnect={handleQuickBooksConnect}
          isConnecting={isConnecting}
        />
      ) : (
        <FinancialsSpreadsheet companyId={selectedCompanyId} />
      )}

      {/* Add Period Dialog */}
      <AddPeriodDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        companyId={selectedCompanyId}
        onPeriodCreated={handlePeriodCreated}
      />
    </div>
  )
}

// Page component with Suspense
export default function FinancialsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <FinancialsContent />
    </Suspense>
  )
}
