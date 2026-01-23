'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'

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

function formatCurrencyFull(value: number): string {
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

export default function BusinessLoansPage() {
  const { selectedCompanyId, selectedCompany } = useCompany()
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
      // Fetch company dashboard data
      const dashResponse = await fetch(`/api/companies/${selectedCompanyId}/dashboard`)
      if (dashResponse.ok) {
        const data = await dashResponse.json()
        setDashboardData(data)
        setBusinessValue(data.tier1?.currentValue || 0)
      }

      // Fetch all companies for total business value (using live calculated values)
      const companiesResponse = await fetch('/api/companies')
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json()
        const savedOwnership = localStorage.getItem('pfs_businessOwnership')
        const ownership = savedOwnership ? JSON.parse(savedOwnership) : {}

        let totalBusinessValue = 0
        for (const company of companiesData.companies || []) {
          // Get live calculated value from dashboard API (same as PFS and Scorecard)
          let marketValue = 0
          try {
            const dashboardRes = await fetch(`/api/companies/${company.id}/dashboard`)
            if (dashboardRes.ok) {
              const dashboardData = await dashboardRes.json()
              marketValue = dashboardData.tier1?.currentValue || 0
            }
          } catch {
            // Fallback to snapshot if dashboard fails
            marketValue = company.valuationSnapshots?.[0]?.currentValue
              ? Number(company.valuationSnapshots[0].currentValue)
              : 0
          }
          const ownershipPercent = ownership[company.id] ?? 100
          totalBusinessValue += marketValue * (ownershipPercent / 100)
        }
        setBusinessValue(totalBusinessValue)
      }

      // Load PFS data from localStorage
      const savedAssets = localStorage.getItem('pfs_personalAssets')
      const savedLiabilities = localStorage.getItem('pfs_personalLiabilities')

      let totalAssets = 0
      let totalLiabilities = 0

      if (savedAssets) {
        const assets: PersonalAsset[] = JSON.parse(savedAssets)
        totalAssets = assets.reduce((sum, a) => sum + a.value, 0)
      }

      if (savedLiabilities) {
        const liabilities: PersonalLiability[] = JSON.parse(savedLiabilities)
        totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0)
      }

      setPersonalNetWorth(totalAssets - totalLiabilities)
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
  const calculateQualification = useCallback(() => {
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
      },
      {
        name: 'Debt Service Coverage',
        description: 'DSCR of at least 1.25x',
        passed: dscr >= PPL_PARAMS.minDscr || maxLoan === 0,
        value: dscr > 0 ? `${dscr.toFixed(2)}x` : 'N/A',
        requirement: `${PPL_PARAMS.minDscr}x`,
        critical: true,
      },
      {
        name: 'Collateral Coverage',
        description: 'Collateral supports at least minimum loan (60% LTV)',
        passed: collateralBasedMax >= PPL_PARAMS.minLoan,
        value: formatCurrency(collateralBasedMax),
        requirement: formatCurrency(PPL_PARAMS.minLoan),
        critical: true,
      },
      {
        name: 'Owner Net Worth',
        description: 'Positive personal net worth for owner guarantee',
        passed: personalNetWorth > 0,
        value: formatCurrency(personalNetWorth),
        requirement: '> $0',
        critical: false,
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

  const qualification = calculateQualification()

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

  if (!selectedCompanyId) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Loans</h1>
          <p className="text-gray-600">Select a company to explore business financing options</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              No company selected. Please select a company from the dropdown above.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Business Loans</h1>
        <p className="text-gray-600">
          Check your eligibility for growth capital financing through Pasadena Private Lending
        </p>
      </div>

      {/* PPL Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
              </svg>
            </div>
            <div>
              <CardTitle>Pasadena Private Lending</CardTitle>
              <CardDescription>Owner-Guaranteed Business Loans</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Loan Range</p>
              <p className="font-semibold text-gray-900">$2MM - $15MM</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Interest Rate</p>
              <p className="font-semibold text-gray-900">Prime + 3-7%</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Time to Fund</p>
              <p className="font-semibold text-gray-900">~14 business days</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>
              PPL provides growth capital for acquisitions, refinancing, working capital, and owner distributions.
              Unlike traditional banks, they examine multiple sources of repayment including future cash flows,
              working capital assets, real estate, and personal wealth.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Qualification Status */}
      <Card className={qualification.passesAllCritical
        ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50'
        : 'border-amber-200 bg-amber-50/30'
      }>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {qualification.passesAllCritical ? (
              <>
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-700">Congratulations!</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-amber-700">Does Not Meet Criteria Yet</span>
              </>
            )}
          </CardTitle>
          {!qualification.passesAllCritical && (
            <CardDescription>
              Based on your company financials and Personal Financial Statement
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Qualified - Exciting Message */}
          {qualification.passesAllCritical && (
            <div className="text-center space-y-4">
              <div>
                <p className="text-lg text-gray-700">
                  You preliminarily qualify for a business loan of up to
                </p>
                <p className="text-5xl font-bold text-green-700 my-3">
                  {formatCurrency(qualification.maxLoan)}
                </p>
                <p className="text-gray-600">
                  Funding in as little as <span className="font-semibold">4 weeks</span>
                </p>
              </div>
              <div className="pt-4 border-t border-green-200">
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  As an Exit OSx member, your financial profile is ready to go.
                  Click below to start a conversation with our lending partner — no credit check, no obligation.
                </p>
              </div>
            </div>
          )}

          {/* Criteria Checklist */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Qualification Criteria</h4>
            <div className="space-y-3">
              {qualification.criteria.map((criterion, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    criterion.passed ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    criterion.passed ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {criterion.passed ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${criterion.passed ? 'text-green-900' : 'text-red-900'}`}>
                        {criterion.name}
                      </p>
                      {criterion.critical && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">Required</span>
                      )}
                    </div>
                    <p className={`text-sm ${criterion.passed ? 'text-green-700' : 'text-red-700'}`}>
                      {criterion.description}
                    </p>
                    <div className="mt-1 flex gap-4 text-xs">
                      <span className={criterion.passed ? 'text-green-600' : 'text-red-600'}>
                        Your value: <strong>{criterion.value}</strong>
                      </span>
                      <span className="text-gray-500">
                        Required: {criterion.requirement}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid md:grid-cols-3 gap-4 pt-4 border-t text-sm">
            <div>
              <p className="text-gray-600">Leverage (3x EBITDA)</p>
              <p className="font-medium">Supports loans up to {formatCurrency(qualification.cashFlowBasedMax)}</p>
            </div>
            <div>
              <p className="text-gray-600">Collateral (60% LTV)</p>
              <p className="font-medium">Supports loans up to {formatCurrency(qualification.collateralBasedMax)}</p>
            </div>
            <div>
              <p className="text-gray-600">Debt Service (1.25x DSCR)</p>
              <p className="font-medium">Supports loans up to {formatCurrency(qualification.dscrBasedMax)}</p>
            </div>
          </div>

          {/* Missing Data Warning */}
          {(personalNetWorth === 0 || businessValue === 0 || qualification.ebitda === 0) && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <p className="font-medium">Complete your financial profile for accurate results:</p>
              <ul className="mt-1 list-disc ml-5 space-y-1">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Section */}
      {qualification.passesAllCritical && !submitted && (
        <Card className="border-[#B87333]/30 bg-gradient-to-br from-orange-50/50 to-amber-50/50">
          <CardContent className="pt-6">
            {!showRequestForm ? (
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Ready to Take the Next Step?</h3>
                <p className="text-gray-600 max-w-lg mx-auto">
                  Your Exit OSx profile gives you a head start. We&apos;ll share your business summary
                  with our lending partner so you can skip the paperwork and get straight to the conversation.
                </p>
                <Button
                  onClick={() => {
                    setRequestedAmount(Math.min(qualification.maxLoan, PPL_PARAMS.maxLoan))
                    setShowRequestForm(true)
                  }}
                  size="lg"
                  className="bg-[#B87333] hover:bg-[#9A5F2A] text-lg px-8 py-6"
                >
                  Start My Loan Inquiry
                </Button>
                <p className="text-xs text-gray-500">
                  No credit check. No obligation. Just a conversation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requested Loan Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatInputValue(requestedAmount)}
                      onChange={(e) => setRequestedAmount(parseInputValue(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Range: {formatCurrency(PPL_PARAMS.minLoan)} - {formatCurrency(Math.min(qualification.maxLoan, PPL_PARAMS.maxLoan))}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose of Loan
                  </label>
                  <select
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select purpose...</option>
                    <option value="acquisition">Acquisition</option>
                    <option value="growth">Growth Capital</option>
                    <option value="working_capital">Working Capital</option>
                    <option value="refinancing">Refinancing</option>
                    <option value="equipment">Equipment Purchase</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="owner_distribution">Owner Distribution</option>
                    <option value="buyout">Partner/Shareholder Buyout</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmitRequest}
                    disabled={submitting || !loanPurpose || requestedAmount < PPL_PARAMS.minLoan}
                    className="bg-[#B87333] hover:bg-[#9A5F2A]"
                  >
                    {submitting ? 'Submitting...' : 'Submit Inquiry'}
                  </Button>
                  <Button
                    onClick={() => setShowRequestForm(false)}
                    variant="outline"
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>

                <p className="text-xs text-gray-500">
                  By submitting, you authorize Exit OSx to share your business and financial information
                  with Pasadena Private Lending for the purpose of evaluating your loan request.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {submitted && (
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-green-900">You&apos;re On Your Way!</h3>
              <p className="text-green-700 max-w-md mx-auto">
                Your inquiry has been sent to Pasadena Private Lending along with your Exit OSx business profile.
                A financing specialist will reach out within <span className="font-semibold">1-2 business days</span> to discuss your options.
              </p>
              <p className="text-sm text-gray-600 pt-2">
                In the meantime, keep building your exit readiness — the stronger your profile, the better your terms.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Qualified Guidance */}
      {!qualification.passesAllCritical && (
        <Card>
          <CardHeader>
            <CardTitle>How to Qualify</CardTitle>
            <CardDescription>
              Steps to improve your eligibility for PPL financing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {qualification.criteria.filter(c => !c.passed && c.critical).map((criterion, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{criterion.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
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
                  </p>
                </div>
              ))}
              <p className="text-sm text-gray-500">
                Consider alternative financing options such as SBA loans, traditional bank loans,
                or revenue-based financing for smaller capital needs.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 text-center">
        This qualification assessment is for informational purposes only and does not guarantee loan approval.
        Final lending decisions are made by Pasadena Private Lending based on their full underwriting process.
      </p>
    </div>
  )
}
