// Retirement Calculator Library
// Core calculation logic for retirement planning

export type TaxTreatment =
  | 'tax_free' // Roth accounts - no tax on withdrawal
  | 'tax_deferred' // Traditional 401k/IRA - taxed as ordinary income
  | 'capital_gains' // Business sale, stocks, real estate - capital gains tax
  | 'already_taxed' // Cash, savings - no additional tax

export interface RetirementAsset {
  id: string
  name: string
  category: string
  currentValue: number
  taxTreatment: TaxTreatment
  costBasis?: number // For capital gains calculation
  // TAX-001 FIX: Add holding period and QSBS eligibility
  holdingPeriodMonths?: number // Months held (>12 = long-term)
  isQSBS?: boolean // Qualified Small Business Stock (Section 1202)
  qsbsExclusionUsed?: number // Amount of QSBS exclusion already used
}

export interface RetirementAssumptions {
  currentAge: number
  retirementAge: number
  lifeExpectancy: number
  annualSpendingNeeds: number // After-tax annual spending in retirement
  inflationRate: number
  growthRate: number
  federalTaxRate: number
  stateCode: string
  stateTaxRate: number
  localTaxRate: number
  capitalGainsTaxRate: number // Long-term capital gains rate (0%, 15%, or 20%)
  shortTermCapitalGainsTaxRate?: number // Short-term = ordinary income rate (defaults to federalTaxRate)
  qsbsExclusionLimit?: number // Section 1202 exclusion limit (default $10M)
  socialSecurityMonthly: number
  otherIncomeMonthly: number
  // RET-001 FIX: Configurable pre-retirement spending rate
  preRetirementSpendingRate?: number // Fraction of retirement spending needs spent pre-retirement (default 0.7)
  annualSavingsContribution?: number // Optional: additional annual savings during accumulation
}

export interface RetirementProjections {
  totalAfterTaxToday: number
  valueAtRetirement: number
  spendingAtRetirement: number
  annualOtherIncome: number
  annualWithdrawalNeeded: number
  yearsMoneyLasts: number
  yearsInRetirement: number
  requiredNestEgg: number
  surplusOrShortfall: number
  additionalNeededToday: number
  safeWithdrawalAmount: number
  sustainableSpendingLevel: number
  yearsToRetirement: number
  successProbability?: number
  portfolioByYear: YearlyProjection[]
}

export interface YearlyProjection {
  year: number
  age: number
  portfolioStart: number
  growth: number
  withdrawal: number
  portfolioEnd: number
  spending: number
  otherIncome: number
  isRetired: boolean
}

// Market benchmarks (as of January 2026)
export const MARKET_BENCHMARKS = {
  inflationRate: { current: 0.028, historical: 0.03, range: { min: 0.02, max: 0.05 } },
  stockReturns: { historical: 0.10, conservative: 0.06, aggressive: 0.12 },
  bondReturns: { historical: 0.05, current: 0.045 },
  safeWithdrawalRate: 0.04, // 4% rule
  socialSecurityCOLA: 0.025, // Typical annual increase
  lastUpdated: new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }),
}

// 2026 State Income Tax Rates (top marginal rates)
export const US_STATE_TAX_RATES: { code: string; name: string; rate: number }[] = [
  { code: 'AL', name: 'Alabama', rate: 0.05 },
  { code: 'AK', name: 'Alaska', rate: 0 },
  { code: 'AZ', name: 'Arizona', rate: 0.025 },
  { code: 'AR', name: 'Arkansas', rate: 0.039 },
  { code: 'CA', name: 'California', rate: 0.133 },
  { code: 'CO', name: 'Colorado', rate: 0.044 },
  { code: 'CT', name: 'Connecticut', rate: 0.0699 },
  { code: 'DE', name: 'Delaware', rate: 0.066 },
  { code: 'FL', name: 'Florida', rate: 0 },
  { code: 'GA', name: 'Georgia', rate: 0.0519 },
  { code: 'HI', name: 'Hawaii', rate: 0.11 },
  { code: 'ID', name: 'Idaho', rate: 0.058 },
  { code: 'IL', name: 'Illinois', rate: 0.0495 },
  { code: 'IN', name: 'Indiana', rate: 0.0305 },
  { code: 'IA', name: 'Iowa', rate: 0.0385 },
  { code: 'KS', name: 'Kansas', rate: 0.057 },
  { code: 'KY', name: 'Kentucky', rate: 0.04 },
  { code: 'LA', name: 'Louisiana', rate: 0.0425 },
  { code: 'ME', name: 'Maine', rate: 0.0715 },
  { code: 'MD', name: 'Maryland', rate: 0.0575 },
  { code: 'MA', name: 'Massachusetts', rate: 0.09 },
  { code: 'MI', name: 'Michigan', rate: 0.0425 },
  { code: 'MN', name: 'Minnesota', rate: 0.0985 },
  { code: 'MS', name: 'Mississippi', rate: 0.05 },
  { code: 'MO', name: 'Missouri', rate: 0.0495 },
  { code: 'MT', name: 'Montana', rate: 0.059 },
  { code: 'NE', name: 'Nebraska', rate: 0.0584 },
  { code: 'NV', name: 'Nevada', rate: 0 },
  { code: 'NH', name: 'New Hampshire', rate: 0 },
  { code: 'NJ', name: 'New Jersey', rate: 0.1075 },
  { code: 'NM', name: 'New Mexico', rate: 0.059 },
  { code: 'NY', name: 'New York', rate: 0.109 },
  { code: 'NC', name: 'North Carolina', rate: 0.045 },
  { code: 'ND', name: 'North Dakota', rate: 0.0225 },
  { code: 'OH', name: 'Ohio', rate: 0.035 },
  { code: 'OK', name: 'Oklahoma', rate: 0.0475 },
  { code: 'OR', name: 'Oregon', rate: 0.099 },
  { code: 'PA', name: 'Pennsylvania', rate: 0.0307 },
  { code: 'RI', name: 'Rhode Island', rate: 0.0599 },
  { code: 'SC', name: 'South Carolina', rate: 0.064 },
  { code: 'SD', name: 'South Dakota', rate: 0 },
  { code: 'TN', name: 'Tennessee', rate: 0 },
  { code: 'TX', name: 'Texas', rate: 0 },
  { code: 'UT', name: 'Utah', rate: 0.0465 },
  { code: 'VT', name: 'Vermont', rate: 0.0875 },
  { code: 'VA', name: 'Virginia', rate: 0.0575 },
  { code: 'WA', name: 'Washington', rate: 0 },
  { code: 'WV', name: 'West Virginia', rate: 0.055 },
  { code: 'WI', name: 'Wisconsin', rate: 0.0765 },
  { code: 'WY', name: 'Wyoming', rate: 0 },
  { code: 'DC', name: 'Washington D.C.', rate: 0.1075 },
  { code: 'OTHER', name: 'Outside USA / Manual Entry', rate: 0.05 },
]

export const TAX_TREATMENTS: { value: TaxTreatment; label: string; description: string }[] = [
  { value: 'tax_free', label: 'Tax-Free', description: 'Roth 401k, Roth IRA, HSA (qualified)' },
  {
    value: 'tax_deferred',
    label: 'Tax-Deferred',
    description: 'Traditional 401k, Traditional IRA, 403b',
  },
  { value: 'capital_gains', label: 'Capital Gains', description: 'Business sale, stocks, real estate' },
  { value: 'already_taxed', label: 'Already Taxed', description: 'Cash, savings, taxable accounts (basis)' },
]

export const GROWTH_PRESETS = [
  { label: 'Conservative (4%)', value: 0.04, description: 'Bonds, CDs, money market' },
  { label: 'Moderate (6%)', value: 0.06, description: 'Balanced portfolio' },
  { label: 'Growth (8%)', value: 0.08, description: 'Stock-heavy portfolio' },
]

export const DEFAULT_ASSUMPTIONS: RetirementAssumptions = {
  currentAge: 50,
  retirementAge: 65,
  lifeExpectancy: 90,
  annualSpendingNeeds: 100000,
  inflationRate: 0.03,
  growthRate: 0.06,
  federalTaxRate: 0.22,
  stateCode: 'CA',
  stateTaxRate: 0.133,
  localTaxRate: 0,
  capitalGainsTaxRate: 0.15,
  socialSecurityMonthly: 2000,
  otherIncomeMonthly: 0,
  // RET-001 FIX: Default to 70% of retirement spending during accumulation (30% savings rate)
  preRetirementSpendingRate: 0.7,
  annualSavingsContribution: 0,
}

/**
 * Calculate after-tax value of an asset
 * TAX-001 FIX: Now handles LTCG vs STCG and QSBS exclusions
 */
export function calculateAfterTaxValue(
  asset: RetirementAsset,
  assumptions: RetirementAssumptions
): number {
  const {
    currentValue,
    taxTreatment,
    costBasis = 0,
    holdingPeriodMonths = 13, // Default to long-term
    isQSBS = false,
    qsbsExclusionUsed = 0,
  } = asset
  const {
    federalTaxRate,
    stateTaxRate,
    localTaxRate,
    capitalGainsTaxRate,
    shortTermCapitalGainsTaxRate,
    qsbsExclusionLimit = 10000000, // Default $10M QSBS exclusion
  } = assumptions
  const totalIncomeTaxRate = federalTaxRate + stateTaxRate + localTaxRate

  switch (taxTreatment) {
    case 'tax_free':
      return currentValue
    case 'tax_deferred':
      return currentValue * (1 - totalIncomeTaxRate)
    case 'capital_gains':
      const gain = currentValue - costBasis
      if (gain <= 0) return currentValue

      // TAX-001 FIX: Handle QSBS exclusion (Section 1202)
      if (isQSBS && holdingPeriodMonths >= 60) {
        // QSBS requires 5+ year holding period for full exclusion
        const remainingExclusion = Math.max(0, qsbsExclusionLimit - qsbsExclusionUsed)
        const excludedGain = Math.min(gain, remainingExclusion)
        const taxableGain = gain - excludedGain

        if (taxableGain <= 0) return currentValue // Fully excluded

        // Remaining taxable gain uses LTCG rate
        const tax = taxableGain * capitalGainsTaxRate
        return currentValue - tax
      }

      // TAX-001 FIX: Determine LTCG vs STCG based on holding period
      const isLongTerm = holdingPeriodMonths > 12
      const effectiveCapGainsRate = isLongTerm
        ? capitalGainsTaxRate
        : (shortTermCapitalGainsTaxRate ?? federalTaxRate + stateTaxRate + localTaxRate)

      const tax = gain * effectiveCapGainsRate
      return currentValue - tax
    case 'already_taxed':
    default:
      return currentValue
  }
}

/**
 * Calculate total after-tax value of all assets
 */
export function calculateTotalAfterTaxValue(
  assets: RetirementAsset[],
  assumptions: RetirementAssumptions
): number {
  return assets.reduce((sum, asset) => sum + calculateAfterTaxValue(asset, assumptions), 0)
}

/**
 * Generate yearly portfolio projections
 */
export function generateYearlyProjections(
  totalAfterTaxToday: number,
  assumptions: RetirementAssumptions
): YearlyProjection[] {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    annualSpendingNeeds,
    inflationRate,
    growthRate,
    socialSecurityMonthly,
    otherIncomeMonthly,
    // RET-001 FIX: Use configurable pre-retirement spending rate
    preRetirementSpendingRate = 0.7,
    annualSavingsContribution = 0,
  } = assumptions

  const projections: YearlyProjection[] = []
  let portfolioValue = totalAfterTaxToday
  let annualSpending = annualSpendingNeeds
  const annualOtherIncome = (socialSecurityMonthly + otherIncomeMonthly) * 12

  for (let year = 0; year <= lifeExpectancy - currentAge; year++) {
    const age = currentAge + year
    const isRetired = age >= retirementAge
    const portfolioStart = portfolioValue

    // During accumulation, use configurable spending rate and add savings contributions
    const growth = portfolioValue * growthRate
    const spending = isRetired ? annualSpending : annualSpendingNeeds * preRetirementSpendingRate
    const otherIncome = isRetired ? annualOtherIncome : 0
    const withdrawal = isRetired ? Math.max(0, spending - otherIncome) : 0
    const savingsContribution = isRetired ? 0 : annualSavingsContribution

    portfolioValue = Math.max(0, portfolioValue + growth + savingsContribution - withdrawal)

    projections.push({
      year,
      age,
      portfolioStart,
      growth,
      withdrawal,
      portfolioEnd: portfolioValue,
      spending,
      otherIncome,
      isRetired,
    })

    // Increase spending by inflation
    annualSpending *= 1 + inflationRate

    if (portfolioValue <= 0 && isRetired) break
  }

  return projections
}

/**
 * Calculate full retirement projections
 */
export function calculateRetirementProjections(
  assets: RetirementAsset[],
  assumptions: RetirementAssumptions
): RetirementProjections {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    annualSpendingNeeds,
    inflationRate,
    growthRate,
    socialSecurityMonthly,
    otherIncomeMonthly,
  } = assumptions

  const yearsToRetirement = Math.max(0, retirementAge - currentAge)
  const yearsInRetirement = Math.max(0, lifeExpectancy - retirementAge)

  // Calculate total after-tax value today
  const totalAfterTaxToday = calculateTotalAfterTaxValue(assets, assumptions)

  // Project value at retirement (with growth)
  const valueAtRetirement = totalAfterTaxToday * Math.pow(1 + growthRate, yearsToRetirement)

  // Calculate inflation-adjusted annual spending at retirement
  const spendingAtRetirement = annualSpendingNeeds * Math.pow(1 + inflationRate, yearsToRetirement)

  // Annual income from Social Security and other sources
  const annualOtherIncome = (socialSecurityMonthly + otherIncomeMonthly) * 12

  // Net annual withdrawal needed from portfolio
  const annualWithdrawalNeeded = Math.max(0, spendingAtRetirement - annualOtherIncome)

  // Calculate how long money will last
  let portfolioValue = valueAtRetirement
  let yearsMoneyLasts = 0
  let annualSpending = spendingAtRetirement
  const annualIncome = annualOtherIncome

  while (portfolioValue > 0 && yearsMoneyLasts < yearsInRetirement + 50) {
    const withdrawal = Math.max(0, annualSpending - annualIncome)
    portfolioValue = portfolioValue * (1 + growthRate) - withdrawal
    annualSpending *= 1 + inflationRate
    yearsMoneyLasts++
  }

  // Calculate required nest egg
  const realReturnRate = (1 + growthRate) / (1 + inflationRate) - 1
  let requiredNestEgg = 0

  if (realReturnRate > 0.001) {
    const pvFactor =
      (1 - Math.pow((1 + inflationRate) / (1 + growthRate), yearsInRetirement)) /
      (growthRate - inflationRate)
    requiredNestEgg = annualWithdrawalNeeded * pvFactor
  } else {
    requiredNestEgg = annualWithdrawalNeeded * yearsInRetirement
  }

  // Gap analysis
  const surplusOrShortfall = valueAtRetirement - requiredNestEgg

  // What you need TODAY to close the gap
  const additionalNeededToday =
    surplusOrShortfall < 0
      ? Math.abs(surplusOrShortfall) / Math.pow(1 + growthRate, yearsToRetirement)
      : 0

  // Safe withdrawal rate (4% rule baseline)
  const safeWithdrawalAmount = valueAtRetirement * 0.04
  const sustainableSpendingLevel = safeWithdrawalAmount + annualOtherIncome

  // Generate yearly projections
  const portfolioByYear = generateYearlyProjections(totalAfterTaxToday, assumptions)

  return {
    totalAfterTaxToday,
    valueAtRetirement,
    spendingAtRetirement,
    annualOtherIncome,
    annualWithdrawalNeeded,
    yearsMoneyLasts: Math.min(yearsMoneyLasts, yearsInRetirement + 50),
    yearsInRetirement,
    requiredNestEgg,
    surplusOrShortfall,
    additionalNeededToday,
    safeWithdrawalAmount,
    sustainableSpendingLevel,
    yearsToRetirement,
    portfolioByYear,
  }
}

/**
 * Generate sensitivity table for Growth Rate vs Spending
 */
export function generateSensitivityTable(
  assets: RetirementAsset[],
  assumptions: RetirementAssumptions,
  growthRates: number[],
  spendingLevels: number[]
): { growth: number; spending: number; yearsLasts: number; successRate: number }[] {
  const results: { growth: number; spending: number; yearsLasts: number; successRate: number }[] = []
  const yearsInRetirement = Math.max(0, assumptions.lifeExpectancy - assumptions.retirementAge)

  for (const growth of growthRates) {
    for (const spending of spendingLevels) {
      const modifiedAssumptions = {
        ...assumptions,
        growthRate: growth,
        annualSpendingNeeds: spending,
      }
      const projections = calculateRetirementProjections(assets, modifiedAssumptions)

      results.push({
        growth,
        spending,
        yearsLasts: projections.yearsMoneyLasts,
        successRate: projections.yearsMoneyLasts >= yearsInRetirement ? 100 : (projections.yearsMoneyLasts / yearsInRetirement) * 100,
      })
    }
  }

  return results
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format input value for display
 */
export function formatInputValue(value: number): string {
  if (value === 0) return ''
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

/**
 * Parse input value
 */
export function parseInputValue(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return Math.round(parseFloat(cleaned) || 0)
}
