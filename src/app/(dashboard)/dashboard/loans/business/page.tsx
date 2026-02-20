'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
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
import styles from '@/components/financials/financials-pages.module.css'

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
      const [companiesResponse, pfsResponse] = await Promise.all([
        fetch('/api/companies'),
        fetch(`/api/companies/${selectedCompanyId}/personal-financials`)
      ])

      if (!companiesResponse.ok) {
        throw new Error('Failed to load companies')
      }

      const companiesData = await companiesResponse.json()
      const companies = companiesData.companies || []

      const savedOwnership = localStorage.getItem('pfs_businessOwnership')
      const ownership = savedOwnership ? JSON.parse(savedOwnership) : {}

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
          const currentValue = dashboard.tier1?.currentValue || 0
          const adjustedEbitda = dashboard.company?.adjustedEbitda || 0

          totalBusinessValue += currentValue * (ownershipPercent / 100)
          totalAdjustedEbitda += adjustedEbitda * (ownershipPercent / 100)

          if (company.id === selectedCompanyId) {
            selectedCompanyDashboard = dashboard
          }
        }
      }

      setBusinessValue(totalBusinessValue)

      if (selectedCompanyDashboard) {
        setDashboardData({
          ...selectedCompanyDashboard,
          company: {
            ...selectedCompanyDashboard.company,
            adjustedEbitda: totalAdjustedEbitda
          }
        })
      }

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

  const qualification = useMemo(() => {
    const ebitda = dashboardData?.company.adjustedEbitda || 0
    const totalCollateral = businessValue + personalNetWorth

    const cashFlowBasedMax = ebitda * PPL_PARAMS.maxLeverage
    const collateralBasedMax = totalCollateral * PPL_PARAMS.maxLtv
    const rawMaxLoan = Math.min(cashFlowBasedMax, collateralBasedMax)
    const maxLoan = Math.min(PPL_PARAMS.maxLoan, Math.max(0, rawMaxLoan))

    const interestRate = (PPL_PARAMS.primeRate + PPL_PARAMS.interestRateSpread.low) / 100
    const monthlyRate = interestRate / 12
    const numPayments = 5 * 12
    const monthlyPayment = maxLoan > 0
      ? (maxLoan * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0
    const annualDebtService = monthlyPayment * 12
    const dscr = annualDebtService > 0 ? ebitda / annualDebtService : 0

    const collateralCoverage = maxLoan > 0 ? totalCollateral / maxLoan : 0

    const maxAnnualDebtService = ebitda / PPL_PARAMS.minDscr
    const maxMonthlyPayment = maxAnnualDebtService / 12
    const factor = Math.pow(1 + monthlyRate, numPayments)
    const dscrBasedMax = maxMonthlyPayment > 0
      ? maxMonthlyPayment * (factor - 1) / (monthlyRate * factor)
      : 0

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

  // Loading skeleton
  if (companyLoading || loading) {
    return (
      <div className={`${styles.loansSkeleton} ${styles.loansSkeletonPulse}`}>
        {/* Header skeleton */}
        <div>
          <div className={styles.loansSkeletonBlock} style={{ height: 36, width: 192 }} />
          <div className={styles.loansSkeletonBlock} style={{ height: 20, width: 384, marginTop: 8 }} />
        </div>

        {/* Overview card skeleton */}
        <div className={styles.loansSkeletonCard}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div className={styles.loansSkeletonBlock} style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className={styles.loansSkeletonBlock} style={{ height: 24, width: 256 }} />
              <div className={styles.loansSkeletonBlock} style={{ height: 16, width: '100%', marginTop: 8 }} />
              <div className={styles.loansSkeletonBlock} style={{ height: 16, width: '75%', marginTop: 4 }} />
            </div>
          </div>
        </div>

        {/* Qualification card skeleton */}
        <div className={styles.loansSkeletonCard}>
          <div className={styles.loansSkeletonBlock} style={{ height: 24, width: 192, marginBottom: 8 }} />
          <div className={styles.loansSkeletonBlock} style={{ height: 16, width: 288, marginBottom: 16 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 12, background: 'var(--muted)' }}>
                <div className={styles.loansSkeletonBlock} style={{ height: 40, width: 40, borderRadius: 10 }} />
                <div style={{ flex: 1 }}>
                  <div className={styles.loansSkeletonBlock} style={{ height: 20, width: 160 }} />
                  <div className={styles.loansSkeletonBlock} style={{ height: 16, width: 256, marginTop: 4 }} />
                </div>
                <div className={styles.loansSkeletonBlock} style={{ height: 24, width: 80, borderRadius: 20 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Loan sizing skeleton */}
        <div className={styles.loansSkeletonCard}>
          <div className={styles.loansSkeletonBlock} style={{ height: 24, width: 224, marginBottom: 16 }} />
          <div className={styles.loansMetaGrid}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ padding: 16, borderRadius: 10, background: 'var(--muted)' }}>
                <div className={styles.loansSkeletonBlock} style={{ height: 16, width: 96, marginBottom: 8 }} />
                <div className={styles.loansSkeletonBlock} style={{ height: 32, width: 128 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Empty state — no company selected
  if (!selectedCompanyId) {
    return (
      <div className={styles.loansEmptyState}>
        <div className={styles.loansEmptyInner}>
          <div className={styles.loansEmptyIcon}>
            <Building2 />
          </div>
          <h3 className={styles.loansEmptyTitle}>No Company Selected</h3>
          <p className={styles.loansEmptyDesc}>Select a company to explore business financing options</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={styles.loansPage}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className={styles.loansPageHeader}>
        <h1>Business Loans</h1>
        <p>Check your eligibility for growth capital financing through Pasadena Private Lending</p>
      </motion.div>

      {/* PPL Overview Card */}
      <motion.div variants={itemVariants}>
        <div className={styles.loansOverviewCard}>
          <div className={styles.loansOverviewHeader}>
            <div className={styles.loansOverviewHeaderInner}>
              <div className={styles.loansOverviewIcon}>
                <Building2 />
              </div>
              <div>
                <p className={styles.loansOverviewTitle}>Pasadena Private Lending</p>
                <p className={styles.loansOverviewSubtitle}>Owner-Guaranteed Business Loans</p>
              </div>
            </div>
          </div>
          <div className={styles.loansOverviewBody}>
            <div className={styles.loansMetaGrid}>
              <motion.div whileHover={{ scale: 1.02 }} className={styles.loansMetaItem}>
                <div className={styles.loansMetaLabel}>
                  <DollarSign />
                  <span>Loan Range</span>
                </div>
                <p className={styles.loansMetaValue}>$2MM - $15MM</p>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} className={styles.loansMetaItem}>
                <div className={styles.loansMetaLabel}>
                  <TrendingUp />
                  <span>Interest Rate</span>
                </div>
                <p className={styles.loansMetaValue}>Prime + 3-7%</p>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} className={styles.loansMetaItem}>
                <div className={styles.loansMetaLabel}>
                  <Clock />
                  <span>Time to Fund</span>
                </div>
                <p className={styles.loansMetaValue}>~14 business days</p>
              </motion.div>
            </div>
            <p className={styles.loansOverviewDesc}>
              PPL provides growth capital for acquisitions, refinancing, working capital, and owner distributions.
              Unlike traditional banks, they examine multiple sources of repayment including future cash flows,
              working capital assets, real estate, and personal wealth.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Qualification Status */}
      <motion.div variants={itemVariants}>
        <div className={`${styles.loansQualCard} ${qualification.passesAllCritical ? styles.loansQualCardPass : styles.loansQualCardFail}`}>
          <div className={styles.loansQualHeader}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className={styles.loansQualStatusRow}
            >
              {qualification.passesAllCritical ? (
                <>
                  <div className={`${styles.loansQualStatusIcon} ${styles.loansQualStatusIconPass}`}>
                    <CheckCircle2 />
                  </div>
                  <div>
                    <p className={`${styles.loansQualStatusTitle} ${styles.loansQualStatusTitlePass}`}>
                      Congratulations!
                      <Sparkles />
                    </p>
                    <p className={`${styles.loansQualStatusDesc} ${styles.loansQualStatusDescPass}`}>
                      You meet the criteria for business financing
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className={`${styles.loansQualStatusIcon} ${styles.loansQualStatusIconFail}`}>
                    <AlertTriangle />
                  </div>
                  <div>
                    <p className={`${styles.loansQualStatusTitle} ${styles.loansQualStatusTitleFail}`}>
                      Does Not Meet Criteria Yet
                    </p>
                    <p className={`${styles.loansQualStatusDesc} ${styles.loansQualStatusDescFail}`}>
                      Based on your company financials and Personal Financial Statement
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </div>

          <div className={styles.loansQualBody}>
            {/* Qualified hero amount */}
            {qualification.passesAllCritical && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={styles.loansQualHero}
              >
                <p className={styles.loansQualHeroIntro}>
                  You preliminarily qualify for a business loan of up to
                </p>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                >
                  <p className={styles.loansQualHeroAmount}>
                    <AnimatedNumber value={qualification.maxLoan} />
                  </p>
                </motion.div>
                <p className={styles.loansQualHeroFunding}>
                  Funding in as little as <strong>4 weeks</strong>
                </p>
                <p className={styles.loansQualHeroNote}>
                  As an Exit OSx member, your financial profile is ready to go.
                  Click below to start a conversation with our lending partner — no credit check, no obligation.
                </p>
              </motion.div>
            )}

            {/* Criteria Checklist */}
            <div className={styles.loansCriteriaSection}>
              <h4>
                <Target />
                Qualification Criteria
              </h4>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className={styles.loansCriteriaList}
              >
                {qualification.criteria.map((criterion, index) => {
                  const Icon = criterion.icon
                  return (
                    <motion.div
                      key={index}
                      variants={criteriaVariants}
                      whileHover={{ x: 4 }}
                      className={`${styles.loansCriterionRow} ${criterion.passed ? styles.loansCriterionRowPass : styles.loansCriterionRowFail}`}
                    >
                      <div className={`${styles.loansCriterionIcon} ${criterion.passed ? styles.loansCriterionIconPass : styles.loansCriterionIconFail}`}>
                        {criterion.passed ? <CheckCircle2 /> : <X />}
                      </div>
                      <div className={styles.loansCriterionContent}>
                        <div className={`${styles.loansCriterionNameRow} ${criterion.passed ? styles.loansCriterionNameRowPass : styles.loansCriterionNameRowFail}`}>
                          <Icon />
                          <p className={`${styles.loansCriterionName} ${criterion.passed ? styles.loansCriterionNamePass : styles.loansCriterionNameFail}`}>
                            {criterion.name}
                          </p>
                          {criterion.critical && (
                            <span className={styles.loansRequiredBadge}>Required</span>
                          )}
                        </div>
                        <p className={`${styles.loansCriterionDesc} ${criterion.passed ? styles.loansCriterionDescPass : styles.loansCriterionDescFail}`}>
                          {criterion.description}
                        </p>
                        <div className={styles.loansCriterionValues}>
                          <span className={`${styles.loansCriterionYourValue} ${criterion.passed ? styles.loansCriterionYourValuePass : styles.loansCriterionYourValueFail}`}>
                            Your value: <strong>{criterion.value}</strong>
                          </span>
                          <span className={styles.loansCriterionRequired}>
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
            <div className={styles.loansSummaryGrid}>
              <div className={styles.loansSummaryItem}>
                <p className={styles.loansSummaryLabel}>Leverage (3x EBITDA)</p>
                <p className={styles.loansSummaryValue}>Supports up to {formatCurrency(qualification.cashFlowBasedMax)}</p>
              </div>
              <div className={styles.loansSummaryItem}>
                <p className={styles.loansSummaryLabel}>Collateral (60% LTV)</p>
                <p className={styles.loansSummaryValue}>Supports up to {formatCurrency(qualification.collateralBasedMax)}</p>
              </div>
              <div className={styles.loansSummaryItem}>
                <p className={styles.loansSummaryLabel}>Debt Service (1.25x DSCR)</p>
                <p className={styles.loansSummaryValue}>Supports up to {formatCurrency(qualification.dscrBasedMax)}</p>
              </div>
            </div>

            {/* Missing Data Warning */}
            {(personalNetWorth === 0 || businessValue === 0 || qualification.ebitda === 0) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={styles.loansIncompleteAlert}
              >
                <p className={styles.loansIncompleteAlertTitle}>
                  <AlertTriangle />
                  Complete your financial profile for accurate results:
                </p>
                <ul className={styles.loansIncompleteList}>
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
          </div>
        </div>
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
            <div className={styles.loansActionCard}>
              <div className={styles.loansActionBody}>
                <AnimatePresence mode="wait">
                  {!showRequestForm ? (
                    <motion.div
                      key="cta"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={styles.loansCta}
                    >
                      <h3 className={styles.loansCtaTitle}>Ready to Take the Next Step?</h3>
                      <p className={styles.loansCtaDesc}>
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
                      <p className={styles.loansCtaDisclaimer}>
                        No credit check. No obligation. Just a conversation.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={styles.loansForm}
                    >
                      <div className={styles.loansFormField}>
                        <label className={styles.loansFormLabel}>
                          Requested Loan Amount
                        </label>
                        <div className={styles.loansFormInputWrap}>
                          <span className={styles.loansFormInputPrefix}>$</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatInputValue(requestedAmount)}
                            onChange={(e) => setRequestedAmount(parseInputValue(e.target.value))}
                            className="pl-7"
                          />
                        </div>
                        <p className={styles.loansFormHint}>
                          Range: {formatCurrency(PPL_PARAMS.minLoan)} - {formatCurrency(Math.min(qualification.maxLoan, PPL_PARAMS.maxLoan))}
                        </p>
                      </div>

                      <div className={styles.loansFormField}>
                        <label className={styles.loansFormLabel}>
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
                          className={styles.loansFormError}
                        >
                          {error}
                        </motion.div>
                      )}

                      <div className={styles.loansFormActions}>
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

                      <p className={styles.loansFormLegal}>
                        By submitting, you authorize Exit OSx to share your business and financial information
                        with Pasadena Private Lending for the purpose of evaluating your loan request.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
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
            <div className={styles.loansSuccessCard}>
              <div className={styles.loansSuccessBody}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className={styles.loansSuccessContent}
                >
                  <div className={styles.loansSuccessIconWrap}>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                    >
                      <CheckCircle2 />
                    </motion.div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <h3 className={styles.loansSuccessTitle}>You&apos;re On Your Way!</h3>
                    <p className={styles.loansSuccessDesc}>
                      Your inquiry has been sent to Pasadena Private Lending along with your Exit OSx business profile.
                      A financing specialist will reach out within <strong>1-2 business days</strong> to discuss your options.
                    </p>
                  </motion.div>
                  <p className={styles.loansSuccessFootnote}>
                    In the meantime, keep building your exit readiness — the stronger your profile, the better your terms.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Not Qualified Guidance */}
      {!qualification.passesAllCritical && (
        <motion.div variants={itemVariants}>
          <div className={styles.loansGuideCard}>
            <div className={styles.loansGuideHeader}>
              <p className={styles.loansGuideTitle}>How to Qualify</p>
              <p className={styles.loansGuideSubtitle}>
                Steps to improve your eligibility for PPL financing
              </p>
            </div>
            <div className={styles.loansGuideBody}>
              {qualification.criteria.filter(c => !c.passed && c.critical).map((criterion, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={styles.loansGuideItem}
                >
                  <p className={styles.loansGuideItemTitle}>
                    <criterion.icon />
                    {criterion.name}
                  </p>
                  <p className={styles.loansGuideItemDesc}>
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
              <p className={styles.loansGuideAlt}>
                Consider alternative financing options such as SBA loans, traditional bank loans,
                or revenue-based financing for smaller capital needs.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Disclaimer */}
      <motion.p variants={itemVariants} className={styles.loansDisclaimer}>
        This qualification assessment is for informational purposes only and does not guarantee loan approval.
        Final lending decisions are made by Pasadena Private Lending based on their full underwriting process.
      </motion.p>
    </motion.div>
  )
}
