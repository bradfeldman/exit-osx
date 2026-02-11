// Valuation Method Auto-Selector
// PROD-012: Automatically recommends the best valuation methodology
// based on company financials, maturity, and data availability.
//
// This reduces the technical burden on users by selecting the most
// appropriate method and explaining the rationale in plain English.
//
// The three methods:
//   1. EBITDA Multiple: Standard for profitable SMBs with 1-2+ years of data
//   2. Revenue Multiple: For pre-profit, high-growth, or negative-EBITDA companies
//   3. DCF (Discounted Cash Flow): For mature businesses with 3+ years of
//      detailed financial data (income statements + cash flow statements)
//
// Method hierarchy:
//   - DCF is the most rigorous but requires the most data
//   - EBITDA multiple is the standard M&A approach for profitable businesses
//   - Revenue multiple is the fallback for companies without positive earnings

import type { ValuationMethod } from './industry-multiples'

/**
 * Company financial profile used to determine the best valuation method.
 * All monetary values are in the same currency (typically USD).
 */
export interface CompanyFinancialProfile {
  /** Most recent annual revenue. 0 if pre-revenue. */
  revenue: number
  /** Most recent adjusted EBITDA. Can be negative. */
  ebitda: number
  /** Number of complete fiscal years of financial data available. 0 = no data. */
  yearsOfFinancialData: number
  /** Whether the company has cash flow statements filed (needed for DCF). */
  hasCashFlowStatements: boolean
  /** Whether the company has positive free cash flow in the most recent period. */
  hasPositiveFreeCashFlow: boolean
  /** Year-over-year revenue growth rate as a decimal (e.g., 0.30 = 30%). null if unavailable. */
  revenueGrowthRate: number | null
  /** Whether the company's revenue is primarily recurring (subscriptions, contracts). */
  isRecurringRevenue: boolean
  /** Industry classification (ICB sub-sector) for context in explanations. */
  industryName?: string
}

/**
 * Result of the auto-selection process.
 * Includes the recommended method, a plain-English explanation,
 * and any alternative methods that may also be appropriate.
 */
export interface MethodSelectionResult {
  /** The recommended primary valuation method. */
  primaryMethod: ValuationMethod
  /** Plain-English explanation of why this method was chosen. */
  explanation: string
  /** Short label suitable for a badge or tag (e.g., "EBITDA Multiple"). */
  methodLabel: string
  /** Alternative methods the user could switch to, with rationale. */
  alternativeMethods: AlternativeMethod[]
  /** Confidence level in the recommendation. */
  confidence: 'high' | 'medium' | 'low'
  /** Specific reasons that influenced the selection (for audit trail). */
  reasons: string[]
}

export interface AlternativeMethod {
  method: ValuationMethod
  label: string
  reason: string
}

/** Human-readable labels for each method. */
const METHOD_LABELS: Record<ValuationMethod, string> = {
  ebitda: 'EBITDA Multiple',
  revenue: 'Revenue Multiple',
  hybrid: 'Blended (EBITDA + Revenue)',
}

/**
 * Minimum years of financial data required for DCF to be meaningful.
 * DCF requires projecting future cash flows, so historical data is essential
 * for deriving reasonable growth rate assumptions.
 */
const MIN_YEARS_FOR_DCF = 3

/**
 * Revenue growth rate threshold above which a company is considered "high-growth"
 * and revenue-based valuation becomes more appropriate.
 * 30% is a widely accepted threshold in M&A practice.
 */
const HIGH_GROWTH_THRESHOLD = 0.30

/**
 * EBITDA margin threshold below which the company's earnings may be too thin
 * to support a reliable EBITDA-based valuation.
 */
const LOW_MARGIN_THRESHOLD = 0.10

/**
 * EBITDA margin threshold below which a recurring-revenue company should
 * use revenue-based valuation. SaaS companies investing heavily in growth
 * often have suppressed margins but high revenue quality.
 */
const RECURRING_LOW_MARGIN_THRESHOLD = 0.15

/**
 * Automatically select the best valuation methodology based on company financials.
 *
 * Decision tree:
 * 1. If EBITDA <= 0 or revenue <= 0 with no EBITDA -> Revenue multiple
 * 2. If high-growth (>30% YoY) -> Revenue multiple
 * 3. If recurring revenue + low margin (<15%) -> Revenue multiple
 * 4. If low margin (<10%) but positive EBITDA -> Hybrid
 * 5. If 3+ years data + cash flows + positive FCF -> DCF primary, EBITDA cross-check
 * 6. Default -> EBITDA multiple
 *
 * @param profile - The company's financial profile
 * @returns Method selection with explanation and alternatives
 */
export function selectValuationMethod(
  profile: CompanyFinancialProfile
): MethodSelectionResult {
  const {
    revenue,
    ebitda,
    yearsOfFinancialData,
    hasCashFlowStatements,
    hasPositiveFreeCashFlow,
    revenueGrowthRate,
    isRecurringRevenue,
    industryName,
  } = profile

  const reasons: string[] = []
  const alternatives: AlternativeMethod[] = []

  // Calculate margin for decision-making (guard against zero revenue)
  const ebitdaMargin = revenue > 0 ? ebitda / revenue : 0

  // Whether DCF is feasible (sufficient data)
  const dcfFeasible =
    yearsOfFinancialData >= MIN_YEARS_FOR_DCF &&
    hasCashFlowStatements &&
    hasPositiveFreeCashFlow

  // ----- Decision 1: Negative or zero EBITDA -> Revenue -----
  if (ebitda <= 0) {
    reasons.push('EBITDA is negative or zero, making earnings-based multiples unreliable')

    if (revenue > 0) {
      reasons.push('Revenue is positive, supporting a revenue-based approach')
    }

    // Still offer EBITDA as alternative if margin is only slightly negative
    // (could turn positive with adjustments)
    if (ebitda > -revenue * 0.05 && revenue > 0) {
      alternatives.push({
        method: 'ebitda',
        label: METHOD_LABELS.ebitda,
        reason:
          'EBITDA is near breakeven. If owner adjustments (add-backs, excess compensation) bring EBITDA positive, an earnings multiple may be appropriate.',
      })
    }

    return {
      primaryMethod: 'revenue',
      explanation: buildExplanation(
        'revenue',
        'Your company currently has negative or zero EBITDA, so we are valuing it based on revenue multiples. ' +
          'This is common for growing businesses that are investing in scale. ' +
          'As profitability improves, the valuation can transition to an earnings-based approach.',
        industryName
      ),
      methodLabel: METHOD_LABELS.revenue,
      alternativeMethods: alternatives,
      confidence: revenue > 0 ? 'medium' : 'low',
      reasons,
    }
  }

  // ----- Decision 2: High growth -> Revenue -----
  if (revenueGrowthRate !== null && revenueGrowthRate > HIGH_GROWTH_THRESHOLD) {
    reasons.push(
      `Revenue growth rate is ${(revenueGrowthRate * 100).toFixed(0)}%, above the ${(HIGH_GROWTH_THRESHOLD * 100).toFixed(0)}% high-growth threshold`
    )

    alternatives.push({
      method: 'ebitda',
      label: METHOD_LABELS.ebitda,
      reason:
        'Your EBITDA is positive, so an earnings-based valuation can serve as a floor valuation.',
    })

    if (dcfFeasible) {
      alternatives.push({
        method: 'ebitda', // DCF isn't a ValuationMethod type, so we note it
        label: 'DCF (Advanced)',
        reason:
          'You have enough financial history for a DCF analysis. This can model the transition from high growth to steady state.',
      })
    }

    return {
      primaryMethod: 'revenue',
      explanation: buildExplanation(
        'revenue',
        `Your company is growing at ${(revenueGrowthRate * 100).toFixed(0)}% year-over-year, which is considered high-growth. ` +
          'Buyers of fast-growing businesses typically value them on revenue multiples rather than current earnings, ' +
          'because today\'s EBITDA understates the company\'s future earnings potential.',
        industryName
      ),
      methodLabel: METHOD_LABELS.revenue,
      alternativeMethods: alternatives,
      confidence: 'high',
      reasons,
    }
  }

  // ----- Decision 3: Recurring revenue + low margin -> Revenue -----
  if (isRecurringRevenue && ebitdaMargin < RECURRING_LOW_MARGIN_THRESHOLD) {
    reasons.push('Company has recurring revenue model (SaaS/subscription)')
    reasons.push(
      `EBITDA margin is ${(ebitdaMargin * 100).toFixed(1)}%, below the ${(RECURRING_LOW_MARGIN_THRESHOLD * 100).toFixed(0)}% threshold for recurring-revenue businesses`
    )

    alternatives.push({
      method: 'ebitda',
      label: METHOD_LABELS.ebitda,
      reason:
        'EBITDA is positive. As margins expand, an earnings-based multiple will better reflect the business value.',
    })

    alternatives.push({
      method: 'hybrid',
      label: METHOD_LABELS.hybrid,
      reason:
        'A blended approach can capture both the revenue quality (recurring) and current profitability.',
    })

    return {
      primaryMethod: 'revenue',
      explanation: buildExplanation(
        'revenue',
        'Your business has recurring revenue, which buyers value highly. ' +
          `However, your current EBITDA margin of ${(ebitdaMargin * 100).toFixed(1)}% is relatively low, ` +
          'likely because you are investing in growth. Revenue multiples better capture the value of your predictable income stream.',
        industryName
      ),
      methodLabel: METHOD_LABELS.revenue,
      alternativeMethods: alternatives,
      confidence: 'high',
      reasons,
    }
  }

  // ----- Decision 4: Low margin (< 10%) but positive EBITDA -> Hybrid -----
  if (ebitdaMargin < LOW_MARGIN_THRESHOLD) {
    reasons.push(
      `EBITDA margin is ${(ebitdaMargin * 100).toFixed(1)}%, below the ${(LOW_MARGIN_THRESHOLD * 100).toFixed(0)}% threshold`
    )
    reasons.push('Positive EBITDA supports earnings-based approach, but thin margins add uncertainty')

    alternatives.push({
      method: 'ebitda',
      label: METHOD_LABELS.ebitda,
      reason:
        'Earnings are positive, so a pure EBITDA multiple is viable if margins are expected to remain stable.',
    })

    alternatives.push({
      method: 'revenue',
      label: METHOD_LABELS.revenue,
      reason:
        'Revenue multiples avoid the volatility of thin margins and may better reflect the business\'s top-line strength.',
    })

    return {
      primaryMethod: 'hybrid',
      explanation: buildExplanation(
        'hybrid',
        `Your company is profitable but has a thin EBITDA margin of ${(ebitdaMargin * 100).toFixed(1)}%. ` +
          'We use a blended approach that combines both earnings and revenue multiples to give a more stable valuation. ' +
          'This accounts for the fact that small margin changes can significantly swing an earnings-only valuation.',
        industryName
      ),
      methodLabel: METHOD_LABELS.hybrid,
      alternativeMethods: alternatives,
      confidence: 'medium',
      reasons,
    }
  }

  // ----- Decision 5: Mature business with data -> EBITDA (with DCF cross-check if feasible) -----
  if (dcfFeasible) {
    reasons.push(`${yearsOfFinancialData} years of financial data available`)
    reasons.push('Cash flow statements and positive free cash flow present')
    reasons.push('Sufficient data for DCF cross-check')

    // Primary is still EBITDA multiple (the standard for SMB M&A),
    // but we note DCF is available as a cross-check
    alternatives.push({
      method: 'revenue',
      label: METHOD_LABELS.revenue,
      reason:
        'Revenue multiples can provide a useful floor or ceiling check against the EBITDA-based valuation.',
    })

    alternatives.push({
      method: 'ebitda', // placeholder — DCF is handled separately in the platform
      label: 'DCF (Advanced)',
      reason:
        'Your financial data supports a full DCF analysis. This is available on the Valuation page for detailed modeling.',
    })

    return {
      primaryMethod: 'ebitda',
      explanation: buildExplanation(
        'ebitda',
        'We are using EBITDA multiples because your company has strong positive earnings ' +
          `and an EBITDA margin of ${(ebitdaMargin * 100).toFixed(1)}%. ` +
          'This is the most widely used valuation method for profitable businesses in your revenue range. ' +
          'You also have enough financial history to run a DCF analysis as a cross-check on the Valuation page.',
        industryName
      ),
      methodLabel: METHOD_LABELS.ebitda,
      alternativeMethods: alternatives,
      confidence: 'high',
      reasons,
    }
  }

  // ----- Decision 6: Default -> EBITDA multiple -----
  reasons.push('Positive EBITDA with adequate margin supports earnings-based valuation')
  if (yearsOfFinancialData < MIN_YEARS_FOR_DCF) {
    reasons.push(
      `Only ${yearsOfFinancialData} year(s) of data available (need ${MIN_YEARS_FOR_DCF}+ for DCF)`
    )
  }

  alternatives.push({
    method: 'revenue',
    label: METHOD_LABELS.revenue,
    reason:
      'Revenue multiples can serve as a sanity check or alternative perspective on value.',
  })

  return {
    primaryMethod: 'ebitda',
    explanation: buildExplanation(
      'ebitda',
      'We are using EBITDA multiples because your company has strong positive earnings. ' +
        'This is the most common method for businesses in your revenue range. ' +
        'Industry-standard multiples are applied to your adjusted EBITDA to determine enterprise value.',
      industryName
    ),
    methodLabel: METHOD_LABELS.ebitda,
    alternativeMethods: alternatives,
    confidence: yearsOfFinancialData >= 2 ? 'high' : 'medium',
    reasons,
  }
}

/**
 * Build a user-facing explanation string with optional industry context.
 */
function buildExplanation(
  method: ValuationMethod,
  baseExplanation: string,
  industryName?: string
): string {
  if (industryName) {
    return `${baseExplanation} This approach is well-established for companies in the ${industryName} sector.`
  }
  return baseExplanation
}

/**
 * Build a CompanyFinancialProfile from raw data typically available
 * from the company record and its financial periods.
 *
 * This is a convenience function for server-side code that has access
 * to the company, coreFactors, and financial periods.
 *
 * @param company - Company record with annualRevenue, annualEbitda
 * @param financialPeriodCount - Number of ANNUAL financial periods
 * @param hasCashFlowStatements - Whether any periods have cash flow statements
 * @param hasPositiveFreeCashFlow - Whether the most recent period has positive FCF
 * @param revenueGrowthRate - Computed YoY revenue growth rate, or null
 * @param revenueModel - CoreFactors.revenueModel value (e.g., 'SUBSCRIPTION_SAAS')
 * @param industryName - Human-readable industry name
 */
export function buildFinancialProfile(
  company: { annualRevenue: number | string; annualEbitda: number | string },
  financialPeriodCount: number,
  hasCashFlowStatements: boolean,
  hasPositiveFreeCashFlow: boolean,
  revenueGrowthRate: number | null,
  revenueModel?: string | null,
  industryName?: string
): CompanyFinancialProfile {
  const isRecurring =
    revenueModel === 'SUBSCRIPTION_SAAS' || revenueModel === 'RECURRING_CONTRACTS'

  return {
    revenue: Number(company.annualRevenue),
    ebitda: Number(company.annualEbitda),
    yearsOfFinancialData: financialPeriodCount,
    hasCashFlowStatements,
    hasPositiveFreeCashFlow,
    revenueGrowthRate,
    isRecurringRevenue: isRecurring,
    industryName,
  }
}
