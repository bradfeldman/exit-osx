'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCompany } from '@/contexts/CompanyContext'
import {
  Loader2,
  Building2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Shield,
  Clock,
  ChevronRight,
  DollarSign,
  Target,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
} as const

const criteriaVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
} as const

interface CompanyDashboard {
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
    briScore: number | null
  }
}

interface PersonalAsset {
  id: string
  category: string
  description: string
  value: number
}

interface PersonalLiability {
  id: string
  category: string
  description: string
  amount: number
}

interface QualificationCriteria {
  name: string
  description: string
  passed: boolean
  value: string
  requirement: string
  critical: boolean
  icon: React.ComponentType<{ className?: string }>
}

// PPL Lending Parameters (from their website)
const PPL_PARAMS = {
  minLoan: 2000000,       // $2MM minimum
  maxLoan: 15000000,      // $15MM maximum
  minEbitda: 500000,      // $500K minimum EBITDA to support $2MM loan
  minDscr: 1.25,          // 1.25x debt service coverage ratio
  minCollateralCoverage: 1.5, // 1.5x collateral coverage
  maxLeverage: 3.0,       // 3x EBITDA max loan
  maxLtv: 0.6,            // 60% LTV on collateral
  interestRateSpread: { low: 3, high: 7 }, // 3-7% over Prime
  primeRate: 7.5,         // Current prime rate (approximate)
  originationFee: { low: 1, high: 2 }, // 1-2%
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}MM`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatInputValue(value: number): string {
  if (value === 0) return ''
  return new Intl.NumberFormat('en-US').format(value)
}

function parseInputValue(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, '')
  return parseInt(cleaned, 10) || 0
}

// Animated number component
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 1500
    const startTime = Date.now()
    const startValue = displayValue
    let animationId: number

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (value - startValue) * easeProgress

      setDisplayValue(Math.round(currentValue))

      if (progress < 1) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <span>
      {prefix}{formatCurrency(displayValue)}{suffix}
    </span>
  )
}

export default function BusinessLoansPage() {
  const { selectedCompanyId, isLoading: companyLoading } = useCompany()
  const [dashboardData, setDashboardData] = useState<CompanyDashboard | null>(null)
  const [personalNetWorth, setPersonalNetWorth] = useState<number>(0)
  const [businessValue, setBusinessValue] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestedAmount, setRequestedAmount] = useState<number>(0)
  const [loanPurpose, setLoanPurpose] = useState<string>('')
  const [showRequestForm, setShowRequestForm] = useState(false)

  const loadData = useCallback(async () => {
    if (!selectedCompanyId) return

    setLoading(true)
    setError(null)

    try {
      // First, get list of companies and personal financials
      const [companiesResponse, pfsResponse] = await Promise.all([
        fetch('/api/companies'),
        fetch(`/api/companies/${selectedCompanyId}/personal-financials`)
      ])

      if (!companiesResponse.ok) {
        throw new Error('Failed to load companies')
      }

      const companiesData = await companiesResponse.json()
      const companies = companiesData.companies || []

      // Load saved ownership percentages
      const savedOwnership = localStorage.getItem('pfs_businessOwnership')
      const ownership = savedOwnership ? JSON.parse(savedOwnership) : {}

      // Fetch dashboard data for EACH company to get computed values
      // (Dashboard API calculates values even without snapshots)
      const dashboardPromises = companies.map((company: { id: string }) =>
        fetch(`/api/companies/${company.id}/dashboard`).then(r => r.ok ? r.json() : null)
      )
      const dashboardResults = await Promise.all(dashboardPromises)

      let totalBusinessValue = 0
      let totalAdjustedEbitda = 0
      let selectedCompanyDashboard = null

      for (let i = 0; i < companies.length; i++) {
        const company = companies[i]
        const dashboard = dashboardResults[i]
        const ownershipPercent = ownership[company.id] ?? 100

        if (dashboard) {
          // Use dashboard-computed values (works even without snapshots)
          const currentValue = dashboard.tier1?.currentValue || 0
          const adjustedEbitda = dashboard.company?.adjustedEbitda || 0

          totalBusinessValue += currentValue * (ownershipPercent / 100)
          totalAdjustedEbitda += adjustedEbitda * (ownershipPercent / 100)

          // Track selected company's dashboard for display
          if (company.id === selectedCompanyId) {
            selectedCompanyDashboard = dashboard
          }
        }
      }

      setBusinessValue(totalBusinessValue)

      // Set dashboard data with combined EBITDA across all companies
      if (selectedCompanyDashboard) {
        setDashboardData({
          ...selectedCompanyDashboard,
          company: {
            ...selectedCompanyDashboard.company,
            adjustedEbitda: totalAdjustedEbitda
          }
        })
      }

      // Load personal net worth from database (organization-level PFS)
      // Note: This is personal assets/liabilities only, NOT including business interests
      // Business value is tracked separately above
      let totalPersonalAssets = 0
      let totalPersonalLiabilities = 0

      if (pfsResponse.ok) {
        const pfsData = await pfsResponse.json()
        if (pfsData.personalFinancials) {
          const assets: PersonalAsset[] = pfsData.personalFinancials.personalAssets || []
          const liabilities: PersonalLiability[] = pfsData.personalFinancials.personalLiabilities || []
          totalPersonalAssets = assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0)
          totalPersonalLiabilities = liabilities.reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
        }
      }

      // Personal net worth = personal assets - personal liabilities (excludes business interests)
      // Total collateral = business value + personal net worth (calculated in qualification)
      setPersonalNetWorth(totalPersonalAssets - totalPersonalLiabilities)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Calculate qualification criteria
  const qualification = useMemo(() => {
    const ebitda = dashboardData?.company.adjustedEbitda || 0
    const totalCollateral = businessValue + personalNetWorth

    // Calculate max loan based on different methods
    const cashFlowBasedMax = ebitda * PPL_PARAMS.maxLeverage
    const collateralBasedMax = totalCollateral * PPL_PARAMS.maxLtv
    const rawMaxLoan = Math.min(cashFlowBasedMax, collateralBasedMax)
    const maxLoan = Math.min(PPL_PARAMS.maxLoan, Math.max(0, rawMaxLoan))

    // Calculate annual debt service for the max loan (assuming 5-year amortization at low rate)
    const interestRate = (PPL_PARAMS.primeRate + PPL_PARAMS.interestRateSpread.low) / 100
    const monthlyRate = interestRate / 12
    const numPayments = 5 * 12 // 5-year amortization
    const monthlyPayment = maxLoan > 0
      ? (maxLoan * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0
    const annualDebtService = monthlyPayment * 12
    const dscr = annualDebtService > 0 ? ebitda / annualDebtService : 0

    // Collateral coverage ratio
    const collateralCoverage = maxLoan > 0 ? totalCollateral / maxLoan : 0

    // Calculate max loan based purely on DSCR (what could you borrow if DSCR was only criteria)
    // At 1.25x DSCR: Annual Debt Service = EBITDA / 1.25
    // Work backwards from annual debt service to loan amount
    const maxAnnualDebtService = ebitda / PPL_PARAMS.minDscr
    const maxMonthlyPayment = maxAnnualDebtService / 12
    // Loan = Payment * [(1+r)^n - 1] / [r * (1+r)^n]
    const factor = Math.pow(1 + monthlyRate, numPayments)
    const dscrBasedMax = maxMonthlyPayment > 0
      ? maxMonthlyPayment * (factor - 1) / (monthlyRate * factor)
      : 0

    // Build criteria checklist
    const criteria: QualificationCriteria[] = [
      {
        name: 'Minimum EBITDA',
        description: 'Annual adjusted EBITDA of at least $500,000',
        passed: ebitda >= PPL_PARAMS.minEbitda,
        value: formatCurrency(ebitda),
        requirement: formatCurrency(PPL_PARAMS.minEbitda),
        critical: true,
        icon: TrendingUp,
      },
      {
        name: 'Debt Service Coverage',
        description: 'DSCR of at least 1.25x',
        passed: dscr >= PPL_PARAMS.minDscr || maxLoan === 0,
        value: dscr > 0 ? `${dscr.toFixed(2)}x` : 'N/A',
        requirement: `${PPL_PARAMS.minDscr}x`,
        critical: true,
        icon: Shield,
      },
      {
        name: 'Collateral Coverage',
        description: `Total collateral of ${formatCurrency(totalCollateral)} supports loan at 60% LTV`,
        passed: collateralBasedMax >= PPL_PARAMS.minLoan,
        value: formatCurrency(collateralBasedMax),
        requirement: formatCurrency(PPL_PARAMS.minLoan),
        critical: true,
        icon: Building2,
      },
      {
        name: 'Owner Net Worth',
        description: 'Positive total net worth (business + personal) for owner guarantee',
        passed: totalCollateral > 0,
        value: formatCurrency(totalCollateral),
        requirement: '> $0',
        critical: false,
        icon: Wallet,
      },
    ]

    const passesAllCritical = criteria.filter(c => c.critical).every(c => c.passed)
    const passesAll = criteria.every(c => c.passed)

    return {
      criteria,
      maxLoan,
      cashFlowBasedMax,
      collateralBasedMax,
      dscrBasedMax,
      dscr,
      collateralCoverage,
      passesAllCritical,
      passesAll,
      ebitda,
      totalCollateral,
    }
  }, [dashboardData, businessValue, personalNetWorth])

  // Handle loan request submission
  const handleSubmitRequest = async () => {
    if (!selectedCompanyId || !dashboardData) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/loans/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          requestedAmount,
          loanPurpose,
          qualification: {
            maxLoan: qualification.maxLoan,
            ebitda: qualification.ebitda,
            businessValue,
            personalNetWorth,
            dscr: qualification.dscr,
            collateralCoverage: qualification.collateralCoverage,
          },
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        setShowRequestForm(false)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to submit loan inquiry')
      }
    } catch (err) {
      console.error('Failed to submit loan inquiry:', err)
      setError('Failed to submit loan inquiry')
    } finally {
      setSubmitting(false)
    }
  }

  // Show skeleton while company context or page data is loading
  if (companyLoading || loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-6 animate-pulse">
        {/* Header skeleton */}
        <div>
          <div className="h-9 w-48 bg-muted rounded-lg" />
          <div className="h-5 w-96 bg-muted rounded mt-2" />
        </div>

        {/* PPL Overview Card skeleton */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-muted rounded-xl" />
              <div className="flex-1">
                <div className="h-6 w-64 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded mt-2" />
                <div className="h-4 w-3/4 bg-muted rounded mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Qualification Status skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-72 bg-muted rounded mt-1" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                  <div className="h-10 w-10 bg-muted rounded-lg" />
                  <div className="flex-1">
                    <div className="h-5 w-40 bg-muted rounded" />
                    <div className="h-4 w-64 bg-muted rounded mt-1" />
                  </div>
                  <div className="h-6 w-20 bg-muted rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loan Sizing skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-56 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-muted/30">
                  <div className="h-4 w-24 bg-muted rounded mb-2" />
                  <div className="h-8 w-32 bg-muted rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show "No Company Selected" only after loading is complete
  if (!selectedCompanyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Company Selected</h3>
          <p className="text-muted-foreground">Select a company to explore business financing options</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 max-w-5xl mx-auto p-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Business Loans</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Check your eligibility for growth capital financing through Pasadena Private Lending
        </p>
      </motion.div>

      {/* PPL Overview Card */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-border/50">
          <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
                  <Building2 className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-display">Pasadena Private Lending</CardTitle>
                  <CardDescription>Owner-Guaranteed Business Loans</CardDescription>
                </div>
              </div>
            </CardHeader>
          </div>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-xl bg-muted/50 border border-border/50"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Loan Range</span>
                </div>
                <p className="font-semibold text-foreground text-lg">$2MM - $15MM</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-xl bg-muted/50 border border-border/50"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Interest Rate</span>
                </div>
                <p className="font-semibold text-foreground text-lg">Prime + 3-7%</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-xl bg-muted/50 border border-border/50"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Time to Fund</span>
                </div>
                <p className="font-semibold text-foreground text-lg">~14 business days</p>
              </motion.div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              PPL provides growth capital for acquisitions, refinancing, working capital, and owner distributions.
              Unlike traditional banks, they examine multiple sources of repayment including future cash flows,
              working capital assets, real estate, and personal wealth.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Qualification Status */}
      <motion.div variants={itemVariants}>
        <Card className={`overflow-hidden border-2 transition-colors ${
          qualification.passesAllCritical
            ? 'border-green-500/30 bg-gradient-to-br from-green-50/50 via-emerald-50/30 to-green-50/50 dark:from-green-950/20 dark:via-emerald-950/10 dark:to-green-950/20'
            : 'border-amber-500/30 bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-amber-50/50 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-amber-950/20'
        }`}>
          <CardHeader className="pb-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="flex items-center gap-3"
            >
              {qualification.passesAllCritical ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                      Congratulations!
                      <Sparkles className="w-5 h-5" />
                    </CardTitle>
                    <CardDescription className="text-green-600/80 dark:text-green-400/80">
                      You meet the criteria for business financing
                    </CardDescription>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-amber-700 dark:text-amber-300">Does Not Meet Criteria Yet</CardTitle>
                    <CardDescription className="text-amber-600/80 dark:text-amber-400/80">
                      Based on your company financials and Personal Financial Statement
                    </CardDescription>
                  </div>
                </>
              )}
            </motion.div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Qualified - Exciting Message */}
            {qualification.passesAllCritical && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center py-6"
              >
                <p className="text-lg text-foreground/80 mb-2">
                  You preliminarily qualify for a business loan of up to
                </p>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                  className="my-4"
                >
                  <p className="text-5xl md:text-6xl font-bold font-display text-green-600 dark:text-green-400 tracking-tight">
                    <AnimatedNumber value={qualification.maxLoan} />
                  </p>
                </motion.div>
                <p className="text-muted-foreground">
                  Funding in as little as <span className="font-semibold text-foreground">4 weeks</span>
                </p>
                <div className="mt-6 pt-6 border-t border-green-200/50 dark:border-green-800/50">
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    As an Exit OSx member, your financial profile is ready to go.
                    Click below to start a conversation with our lending partner — no credit check, no obligation.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Criteria Checklist */}
            <div>
              <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Qualification Criteria
              </h4>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {qualification.criteria.map((criterion, index) => {
                  const Icon = criterion.icon
                  return (
                    <motion.div
                      key={index}
                      variants={criteriaVariants}
                      whileHover={{ x: 4 }}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                        criterion.passed
                          ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30'
                          : 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                        criterion.passed
                          ? 'bg-green-100 dark:bg-green-900/50'
                          : 'bg-red-100 dark:bg-red-900/50'
                      }`}>
                        {criterion.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${criterion.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                          <p className={`font-medium ${criterion.passed ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                            {criterion.name}
                          </p>
                          {criterion.critical && (
                            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">Required</span>
                          )}
                        </div>
                        <p className={`text-sm ${criterion.passed ? 'text-green-700/80 dark:text-green-300/80' : 'text-red-700/80 dark:text-red-300/80'}`}>
                          {criterion.description}
                        </p>
                        <div className="mt-2 flex gap-4 text-xs">
                          <span className={criterion.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            Your value: <strong>{criterion.value}</strong>
                          </span>
                          <span className="text-muted-foreground">
                            Required: {criterion.requirement}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </div>

            {/* Financial Summary */}
            <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border/50">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">Leverage (3x EBITDA)</p>
                <p className="font-medium text-foreground">Supports up to {formatCurrency(qualification.cashFlowBasedMax)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">Collateral (60% LTV)</p>
                <p className="font-medium text-foreground">Supports up to {formatCurrency(qualification.collateralBasedMax)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">Debt Service (1.25x DSCR)</p>
                <p className="font-medium text-foreground">Supports up to {formatCurrency(qualification.dscrBasedMax)}</p>
              </div>
            </div>

            {/* Missing Data Warning */}
            {(personalNetWorth === 0 || businessValue === 0 || qualification.ebitda === 0) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 rounded-xl"
              >
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Complete your financial profile for accurate results:
                </p>
                <ul className="list-disc ml-6 space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  {qualification.ebitda === 0 && (
                    <li>Add company financials in the Business Financials section</li>
                  )}
                  {businessValue === 0 && (
                    <li>Complete your business valuation assessment</li>
                  )}
                  {personalNetWorth === 0 && (
                    <li>Add personal assets in the Personal Financial Statement</li>
                  )}
                </ul>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Section */}
      <AnimatePresence mode="wait">
        {qualification.passesAllCritical && !submitted && (
          <motion.div
            key="action"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 overflow-hidden">
              <CardContent className="pt-6">
                <AnimatePresence mode="wait">
                  {!showRequestForm ? (
                    <motion.div
                      key="cta"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center space-y-4 py-4"
                    >
                      <h3 className="text-2xl font-semibold font-display text-foreground">Ready to Take the Next Step?</h3>
                      <p className="text-muted-foreground max-w-lg mx-auto">
                        Your Exit OSx profile gives you a head start. We&apos;ll share your business summary
                        with our lending partner so you can skip the paperwork and get straight to the conversation.
                      </p>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          onClick={() => {
                            setRequestedAmount(Math.min(qualification.maxLoan, PPL_PARAMS.maxLoan))
                            setShowRequestForm(true)
                          }}
                          size="lg"
                          className="mt-4 text-lg px-8 py-6 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
                        >
                          Start My Loan Inquiry
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </motion.div>
                      <p className="text-xs text-muted-foreground pt-2">
                        No credit check. No obligation. Just a conversation.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-5"
                    >
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Requested Loan Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatInputValue(requestedAmount)}
                            onChange={(e) => setRequestedAmount(parseInputValue(e.target.value))}
                            className="pl-7"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Range: {formatCurrency(PPL_PARAMS.minLoan)} - {formatCurrency(Math.min(qualification.maxLoan, PPL_PARAMS.maxLoan))}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Purpose of Loan
                        </label>
                        <Select value={loanPurpose} onValueChange={setLoanPurpose}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select purpose..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="acquisition">Acquisition</SelectItem>
                            <SelectItem value="growth">Growth Capital</SelectItem>
                            <SelectItem value="working_capital">Working Capital</SelectItem>
                            <SelectItem value="refinancing">Refinancing</SelectItem>
                            <SelectItem value="equipment">Equipment Purchase</SelectItem>
                            <SelectItem value="real_estate">Real Estate</SelectItem>
                            <SelectItem value="owner_distribution">Owner Distribution</SelectItem>
                            <SelectItem value="buyout">Partner/Shareholder Buyout</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300"
                        >
                          {error}
                        </motion.div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={handleSubmitRequest}
                          disabled={submitting || !loanPurpose || requestedAmount < PPL_PARAMS.minLoan}
                          className="shadow-lg shadow-primary/20"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              Submit Inquiry
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => setShowRequestForm(false)}
                          variant="outline"
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground pt-2">
                        By submitting, you authorize Exit OSx to share your business and financial information
                        with Pasadena Private Lending for the purpose of evaluating your loan request.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Success Message */}
        {submitted && (
          <motion.div
            key="success"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="border-green-200/50 dark:border-green-800/30 bg-gradient-to-br from-green-50/50 via-emerald-50/30 to-green-50/50 dark:from-green-950/20 dark:via-emerald-950/10 dark:to-green-950/20 overflow-hidden">
              <CardContent className="pt-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="text-center space-y-4 py-4"
                >
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                    >
                      <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </motion.div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <h3 className="text-2xl font-semibold font-display text-green-900 dark:text-green-100">You&apos;re On Your Way!</h3>
                    <p className="text-green-700 dark:text-green-300 max-w-md mx-auto mt-2">
                      Your inquiry has been sent to Pasadena Private Lending along with your Exit OSx business profile.
                      A financing specialist will reach out within <span className="font-semibold">1-2 business days</span> to discuss your options.
                    </p>
                  </motion.div>
                  <p className="text-sm text-muted-foreground pt-4">
                    In the meantime, keep building your exit readiness — the stronger your profile, the better your terms.
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Not Qualified Guidance */}
      {!qualification.passesAllCritical && (
        <motion.div variants={itemVariants}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="font-display">How to Qualify</CardTitle>
              <CardDescription>
                Steps to improve your eligibility for PPL financing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualification.criteria.filter(c => !c.passed && c.critical).map((criterion, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-muted/50 rounded-xl border border-border/50"
                  >
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <criterion.icon className="w-4 h-4 text-primary" />
                      {criterion.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {criterion.name === 'Minimum EBITDA' && (
                        <>
                          Your adjusted EBITDA of {criterion.value} is below the {criterion.requirement} minimum.
                          Focus on increasing profitability through revenue growth or cost reduction.
                        </>
                      )}
                      {criterion.name === 'Minimum Loan Size' && (
                        <>
                          Based on your financials, you qualify for {criterion.value} which is below the
                          {criterion.requirement} minimum. Build your EBITDA and/or collateral base to qualify.
                        </>
                      )}
                      {criterion.name === 'Debt Service Coverage' && (
                        <>
                          Your DSCR of {criterion.value} is below the required {criterion.requirement}.
                          Increase EBITDA or reduce the loan amount to improve coverage.
                        </>
                      )}
                      {criterion.name === 'Collateral Coverage' && (
                        <>
                          Your collateral of {criterion.value} is below the {criterion.requirement} minimum.
                          Build your business value or personal assets to increase collateral coverage.
                        </>
                      )}
                    </p>
                  </motion.div>
                ))}
                <p className="text-sm text-muted-foreground pt-2">
                  Consider alternative financing options such as SBA loans, traditional bank loans,
                  or revenue-based financing for smaller capital needs.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Disclaimer */}
      <motion.p
        variants={itemVariants}
        className="text-xs text-muted-foreground text-center pb-6"
      >
        This qualification assessment is for informational purposes only and does not guarantee loan approval.
        Final lending decisions are made by Pasadena Private Lending based on their full underwriting process.
      </motion.p>
    </motion.div>
  )
}
