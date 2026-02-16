// DCF (Discounted Cash Flow) Valuation Calculator
// Core calculation logic for DCF valuation

export interface DCFInputs {
  baseFCF: number
  growthRates: number[] // 5 years of growth rates (as decimals, e.g., 0.05 for 5%)
  wacc: number // Weighted average cost of capital (as decimal)
  terminalMethod: 'gordon' | 'exit_multiple'
  perpetualGrowthRate: number // For Gordon growth model (as decimal)
  exitMultiple?: number // For exit multiple method
  netDebt: number // Debt minus cash
  // VAL-002 FIX: Separate EBITDA growth rates for exit multiple method
  ebitdaGrowthRates?: number[] // Optional separate EBITDA growth rates
  fcfToEbitdaRatio?: number // FCF to EBITDA conversion ratio (typically 0.6-0.8)
  useMidYearConvention?: boolean // Mid-year discounting (default: true)
}

export interface DCFResults {
  projectedFCF: number[] // FCF for years 1-5
  presentValueFCF: number[] // PV of each year's FCF
  terminalValue: number // Terminal value (undiscounted)
  presentValueTerminal: number // PV of terminal value
  enterpriseValue: number // Sum of all PVs
  equityValue: number // Enterprise value minus net debt
  impliedEbitdaMultiple?: number // If EBITDA provided
}

export interface WACCInputs {
  riskFreeRate: number
  marketRiskPremium: number
  beta: number
  sizeRiskPremium: number
  companySpecificRisk?: number // CSR premium from BRI score (defaults to 0 for backwards compat)
  costOfDebt: number
  taxRate: number
  debtWeight: number // Percentage of capital structure that is debt
  equityWeight: number // Percentage of capital structure that is equity
}

/**
 * Calculate Cost of Equity using CAPM + Build-Up
 * Re = Rf + beta * (Rm - Rf) + Size Premium + Company-Specific Risk
 */
export function calculateCostOfEquity(
  riskFreeRate: number,
  marketRiskPremium: number,
  beta: number,
  sizeRiskPremium: number,
  companySpecificRisk: number = 0
): number {
  return riskFreeRate + beta * marketRiskPremium + sizeRiskPremium + companySpecificRisk
}

/**
 * Calculate WACC (Weighted Average Cost of Capital)
 * WACC = E/(E+D) * Re + D/(E+D) * Rd * (1 - T)
 */
export function calculateWACC(inputs: WACCInputs): number {
  const costOfEquity = calculateCostOfEquity(
    inputs.riskFreeRate,
    inputs.marketRiskPremium,
    inputs.beta,
    inputs.sizeRiskPremium,
    inputs.companySpecificRisk ?? 0
  )

  const afterTaxCostOfDebt = inputs.costOfDebt * (1 - inputs.taxRate)

  return inputs.equityWeight * costOfEquity + inputs.debtWeight * afterTaxCostOfDebt
}

/**
 * Calculate projected FCF for each year
 */
export function calculateProjectedFCF(baseFCF: number, growthRates: number[]): number[] {
  const projectedFCF: number[] = []
  let currentFCF = baseFCF

  for (const rate of growthRates) {
    currentFCF = currentFCF * (1 + rate)
    projectedFCF.push(currentFCF)
  }

  return projectedFCF
}

/**
 * Calculate present value of a future cash flow.
 * Mid-year convention discounts at (n - 0.5) instead of n,
 * reflecting that cash flows arrive throughout the year.
 */
export function calculatePresentValue(
  futureValue: number,
  discountRate: number,
  years: number,
  midYear: boolean = false
): number {
  const period = midYear ? years - 0.5 : years
  return futureValue / Math.pow(1 + discountRate, period)
}

/**
 * Calculate terminal value using Gordon Growth Model
 * TV = FCF_n * (1 + g) / (WACC - g)
 */
export function calculateTerminalValueGordon(
  finalFCF: number,
  perpetualGrowthRate: number,
  wacc: number
): number {
  // Guard against division by zero or negative denominator
  if (wacc <= perpetualGrowthRate) {
    throw new Error('WACC must be greater than perpetual growth rate')
  }
  return (finalFCF * (1 + perpetualGrowthRate)) / (wacc - perpetualGrowthRate)
}

/**
 * Calculate terminal value using Exit Multiple method
 * TV = EBITDA_n * Exit Multiple
 */
export function calculateTerminalValueExitMultiple(
  finalEBITDA: number,
  exitMultiple: number
): number {
  return finalEBITDA * exitMultiple
}

/**
 * Run full DCF valuation
 */
export function calculateDCF(inputs: DCFInputs, finalEBITDA?: number): DCFResults {
  const useMidYear = inputs.useMidYearConvention ?? true

  // Calculate projected FCF for years 1-5
  const projectedFCF = calculateProjectedFCF(inputs.baseFCF, inputs.growthRates)

  // Calculate present value of each year's FCF
  const presentValueFCF = projectedFCF.map((fcf, index) =>
    calculatePresentValue(fcf, inputs.wacc, index + 1, useMidYear)
  )

  // Calculate terminal value
  let terminalValue: number
  const finalFCF = projectedFCF[projectedFCF.length - 1]

  if (inputs.terminalMethod === 'gordon') {
    terminalValue = calculateTerminalValueGordon(
      finalFCF,
      inputs.perpetualGrowthRate,
      inputs.wacc
    )
  } else {
    if (!inputs.exitMultiple || !finalEBITDA) {
      throw new Error('Exit multiple and EBITDA required for exit multiple method')
    }
    // VAL-002 FIX: Use separate EBITDA growth rates or derive from FCF with conversion ratio
    let terminalEBITDA: number
    if (inputs.ebitdaGrowthRates && inputs.ebitdaGrowthRates.length >= 5) {
      // Use explicit EBITDA growth rates if provided
      const projectedEBITDA = calculateProjectedFCF(finalEBITDA, inputs.ebitdaGrowthRates)
      terminalEBITDA = projectedEBITDA[projectedEBITDA.length - 1]
    } else if (inputs.fcfToEbitdaRatio && inputs.fcfToEbitdaRatio > 0) {
      // Derive terminal EBITDA from terminal FCF using conversion ratio
      // FCF = EBITDA * ratio, so EBITDA = FCF / ratio
      terminalEBITDA = finalFCF / inputs.fcfToEbitdaRatio
    } else {
      // Fallback: Project EBITDA using FCF growth rates (legacy behavior)
      // Note: This assumes EBITDA and FCF grow at similar rates
      const projectedEBITDA = calculateProjectedFCF(finalEBITDA, inputs.growthRates)
      terminalEBITDA = projectedEBITDA[projectedEBITDA.length - 1]
    }
    terminalValue = calculateTerminalValueExitMultiple(
      terminalEBITDA,
      inputs.exitMultiple
    )
  }

  // Present value of terminal value (discounted from the final projection year)
  const presentValueTerminal = calculatePresentValue(terminalValue, inputs.wacc, inputs.growthRates.length)

  // Enterprise Value = sum of PV of FCF + PV of Terminal Value
  const enterpriseValue = presentValueFCF.reduce((sum, pv) => sum + pv, 0) + presentValueTerminal

  // Equity Value = Enterprise Value - Net Debt
  const equityValue = enterpriseValue - inputs.netDebt

  // Calculate implied EBITDA multiple if EBITDA provided
  let impliedEbitdaMultiple: number | undefined
  if (finalEBITDA && finalEBITDA > 0) {
    impliedEbitdaMultiple = enterpriseValue / finalEBITDA
  }

  return {
    projectedFCF,
    presentValueFCF,
    terminalValue,
    presentValueTerminal,
    enterpriseValue,
    equityValue,
    impliedEbitdaMultiple,
  }
}

/**
 * Generate sensitivity table for WACC vs Terminal Growth Rate
 */
export function generateSensitivityTable(
  baseInputs: DCFInputs,
  waccValues: number[],
  terminalGrowthValues: number[],
  finalEBITDA?: number
): { wacc: number; growth: number; enterpriseValue: number }[] {
  const results: { wacc: number; growth: number; enterpriseValue: number }[] = []

  for (const wacc of waccValues) {
    for (const growth of terminalGrowthValues) {
      try {
        const inputs: DCFInputs = {
          ...baseInputs,
          wacc,
          perpetualGrowthRate: growth,
        }
        const dcfResult = calculateDCF(inputs, finalEBITDA)
        results.push({
          wacc,
          growth,
          enterpriseValue: dcfResult.enterpriseValue,
        })
      } catch {
        // Skip invalid combinations (e.g., WACC <= growth)
        results.push({
          wacc,
          growth,
          enterpriseValue: 0,
        })
      }
    }
  }

  return results
}

// Re-export formatCurrency from canonical source
export { formatCurrency } from '@/lib/utils/currency'

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`
}
