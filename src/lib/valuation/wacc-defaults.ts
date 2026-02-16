/**
 * WACC Defaults Engine — Single Source of Truth
 *
 * Produces market-calibrated WACC component defaults based on:
 *   - EBITDA size tier (not revenue)
 *   - BRI score → Company-Specific Risk premium
 *   - Derived financial data (when available)
 *
 * Replaces hardcoded constants previously scattered across:
 *   - auto-dcf.ts (lines 17-35)
 *   - dcf/route.ts (lines 8-15)
 *   - valuation/page.tsx (DEFAULT_ASSUMPTIONS)
 *
 * Benchmark sources:
 *   - Duff & Phelps / Kroll Cost of Capital Navigator (2025-2026)
 *   - Pepperdine Private Capital Markets Report
 *   - BVR DealStats median transaction data
 *
 * Last validated: 2026-02-15
 */

// ---------------------------------------------------------------------------
// Market constants
// ---------------------------------------------------------------------------

/** 10-Year US Treasury yield. Source: FRED, Feb 2026. Update quarterly. */
export const RISK_FREE_RATE = 0.041

/** Equity Risk Premium. Source: Duff & Phelps / Kroll 2026 supply-side ERP. */
export const EQUITY_RISK_PREMIUM = 0.050

/** Default unlevered beta. 1.0 is standard for undiversified private businesses. */
export const DEFAULT_BETA = 1.0

/** Federal (21%) + blended state (~4%) corporate tax rate. */
export const DEFAULT_TAX_RATE = 0.25

/** Long-term nominal GDP growth — floor for terminal growth rate. */
export const DEFAULT_TERMINAL_GROWTH_RATE = 0.025

/** Default growth rates when no historical data is available. */
export const DEFAULT_GROWTH_RATES = [0.05, 0.05, 0.04, 0.03, 0.025]

// ---------------------------------------------------------------------------
// EBITDA tier definitions
// ---------------------------------------------------------------------------

export interface EbitdaTier {
  label: string
  ebitdaMin: number
  ebitdaMax: number
  sizeRiskPremium: { low: number; high: number }
  companySpecificRisk: { low: number; high: number }
  preTaxCostOfDebt: { low: number; high: number }
  typicalDebtWeight: number
}

export const EBITDA_TIERS: EbitdaTier[] = [
  {
    label: 'Micro',
    ebitdaMin: 0,
    ebitdaMax: 500_000,
    sizeRiskPremium: { low: 0.065, high: 0.080 },
    companySpecificRisk: { low: 0.060, high: 0.120 },
    preTaxCostOfDebt: { low: 0.110, high: 0.140 },
    typicalDebtWeight: 0.15,
  },
  {
    label: 'Small',
    ebitdaMin: 500_000,
    ebitdaMax: 2_000_000,
    sizeRiskPremium: { low: 0.055, high: 0.070 },
    companySpecificRisk: { low: 0.050, high: 0.100 },
    preTaxCostOfDebt: { low: 0.100, high: 0.120 },
    typicalDebtWeight: 0.20,
  },
  {
    label: 'Lower-Mid',
    ebitdaMin: 2_000_000,
    ebitdaMax: 5_000_000,
    sizeRiskPremium: { low: 0.040, high: 0.055 },
    companySpecificRisk: { low: 0.030, high: 0.060 },
    preTaxCostOfDebt: { low: 0.085, high: 0.100 },
    typicalDebtWeight: 0.25,
  },
  {
    label: 'Mid-Market',
    ebitdaMin: 5_000_000,
    ebitdaMax: 10_000_000,
    sizeRiskPremium: { low: 0.030, high: 0.045 },
    companySpecificRisk: { low: 0.020, high: 0.050 },
    preTaxCostOfDebt: { low: 0.080, high: 0.095 },
    typicalDebtWeight: 0.30,
  },
  {
    label: 'Upper-Mid',
    ebitdaMin: 10_000_000,
    ebitdaMax: 25_000_000,
    sizeRiskPremium: { low: 0.020, high: 0.035 },
    companySpecificRisk: { low: 0.010, high: 0.030 },
    preTaxCostOfDebt: { low: 0.075, high: 0.090 },
    typicalDebtWeight: 0.35,
  },
  {
    label: 'Large',
    ebitdaMin: 25_000_000,
    ebitdaMax: 50_000_000,
    sizeRiskPremium: { low: 0.015, high: 0.025 },
    companySpecificRisk: { low: 0.005, high: 0.020 },
    preTaxCostOfDebt: { low: 0.070, high: 0.085 },
    typicalDebtWeight: 0.35,
  },
  {
    label: 'Enterprise',
    ebitdaMin: 50_000_000,
    ebitdaMax: Infinity,
    sizeRiskPremium: { low: 0.010, high: 0.020 },
    companySpecificRisk: { low: 0.000, high: 0.015 },
    preTaxCostOfDebt: { low: 0.065, high: 0.080 },
    typicalDebtWeight: 0.40,
  },
]

// ---------------------------------------------------------------------------
// Size premium anchor points for log-linear interpolation
// ---------------------------------------------------------------------------

const SIZE_PREMIUM_ANCHORS: Array<{ ebitda: number; premium: number }> = [
  { ebitda: 250_000, premium: 0.080 },
  { ebitda: 500_000, premium: 0.070 },
  { ebitda: 1_000_000, premium: 0.062 },
  { ebitda: 2_000_000, premium: 0.055 },
  { ebitda: 5_000_000, premium: 0.042 },
  { ebitda: 10_000_000, premium: 0.032 },
  { ebitda: 25_000_000, premium: 0.022 },
  { ebitda: 50_000_000, premium: 0.015 },
]

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Find the EBITDA tier for a given EBITDA amount.
 */
export function findEbitdaTier(ebitda: number): EbitdaTier {
  for (const tier of EBITDA_TIERS) {
    if (ebitda >= tier.ebitdaMin && ebitda < tier.ebitdaMax) {
      return tier
    }
  }
  // Fallback: last tier (Enterprise)
  return EBITDA_TIERS[EBITDA_TIERS.length - 1]
}

/**
 * Interpolate size risk premium using log-linear interpolation between anchor points.
 * Log scale reflects the empirical observation that size-risk is approximately log-linear.
 */
export function interpolateSizeRiskPremium(ebitda: number): number {
  if (ebitda <= 0) return SIZE_PREMIUM_ANCHORS[0].premium

  const anchors = SIZE_PREMIUM_ANCHORS

  if (ebitda <= anchors[0].ebitda) return anchors[0].premium
  if (ebitda >= anchors[anchors.length - 1].ebitda) return anchors[anchors.length - 1].premium

  const logEbitda = Math.log(ebitda)

  for (let i = 0; i < anchors.length - 1; i++) {
    if (ebitda >= anchors[i].ebitda && ebitda < anchors[i + 1].ebitda) {
      const logLow = Math.log(anchors[i].ebitda)
      const logHigh = Math.log(anchors[i + 1].ebitda)
      const t = (logEbitda - logLow) / (logHigh - logLow)
      const premium = anchors[i].premium + t * (anchors[i + 1].premium - anchors[i].premium)
      return Math.round(premium * 10000) / 10000
    }
  }

  return 0.04 // Safety fallback
}

/**
 * Map BRI score (0-1) to Company-Specific Risk premium within a tier's range.
 *
 * Linear inverse: high BRI = low CSR, low BRI = high CSR.
 * Linear because CSR is an additive rate component (not multiplicative like BRI→multiple).
 */
export function calculateCSRFromBRI(
  briScore: number,
  csrLow: number,
  csrHigh: number
): number {
  const clamped = Math.max(0, Math.min(1, briScore))
  const csr = csrHigh - clamped * (csrHigh - csrLow)
  return Math.round(csr * 10000) / 10000
}

// ---------------------------------------------------------------------------
// Main defaults engine
// ---------------------------------------------------------------------------

export interface WACCDefaultsInput {
  adjustedEbitda: number
  briScore: number
  derivedCostOfDebt?: number | null
  derivedTaxRate?: number | null
  derivedDebtWeight?: number | null
}

export interface WACCDefaults {
  riskFreeRate: number
  equityRiskPremium: number
  beta: number
  sizeRiskPremium: number
  companySpecificRisk: number
  preTaxCostOfDebt: number
  taxRate: number
  debtWeight: number
  equityWeight: number
  computedWacc: number
  ebitdaTier: string
}

/**
 * Generate calibrated WACC component defaults.
 *
 * This is the single source of truth for WACC defaults across the platform.
 * Users can override any component; this provides the starting point.
 */
export function calculateWACCDefaults(input: WACCDefaultsInput): WACCDefaults {
  const tier = findEbitdaTier(input.adjustedEbitda)

  // Size risk premium — log-interpolated from anchor points
  const sizeRiskPremium = interpolateSizeRiskPremium(input.adjustedEbitda)

  // Company-Specific Risk — driven by BRI within tier range
  const companySpecificRisk = calculateCSRFromBRI(
    input.briScore,
    tier.companySpecificRisk.low,
    tier.companySpecificRisk.high
  )

  // Cost of debt — prefer derived from financials, fall back to tier midpoint
  let preTaxCostOfDebt: number
  if (
    input.derivedCostOfDebt != null &&
    input.derivedCostOfDebt >= 0.03 &&
    input.derivedCostOfDebt <= 0.20
  ) {
    preTaxCostOfDebt = input.derivedCostOfDebt
  } else {
    preTaxCostOfDebt = (tier.preTaxCostOfDebt.low + tier.preTaxCostOfDebt.high) / 2
  }

  // Tax rate
  const taxRate =
    input.derivedTaxRate != null &&
    input.derivedTaxRate >= 0.05 &&
    input.derivedTaxRate <= 0.50
      ? input.derivedTaxRate
      : DEFAULT_TAX_RATE

  // Capital structure
  let debtWeight: number
  let equityWeight: number
  if (
    input.derivedDebtWeight != null &&
    input.derivedDebtWeight >= 0 &&
    input.derivedDebtWeight <= 0.80
  ) {
    debtWeight = input.derivedDebtWeight
    equityWeight = 1 - debtWeight
  } else {
    debtWeight = tier.typicalDebtWeight
    equityWeight = 1 - debtWeight
  }

  // Compute WACC
  const costOfEquity =
    RISK_FREE_RATE +
    DEFAULT_BETA * EQUITY_RISK_PREMIUM +
    sizeRiskPremium +
    companySpecificRisk

  const afterTaxCostOfDebt = preTaxCostOfDebt * (1 - taxRate)
  const computedWacc = equityWeight * costOfEquity + debtWeight * afterTaxCostOfDebt

  return {
    riskFreeRate: RISK_FREE_RATE,
    equityRiskPremium: EQUITY_RISK_PREMIUM,
    beta: DEFAULT_BETA,
    sizeRiskPremium,
    companySpecificRisk,
    preTaxCostOfDebt,
    taxRate,
    debtWeight,
    equityWeight,
    computedWacc,
    ebitdaTier: tier.label,
  }
}

// ---------------------------------------------------------------------------
// Implied WACC solver
// ---------------------------------------------------------------------------

/**
 * Reverse-engineer the WACC that makes a DCF equal a target enterprise value.
 * Uses bisection method — guaranteed convergence, no derivative needed.
 *
 * Returns null if no solution exists within bounds.
 */
export function solveImpliedWACC(
  targetEV: number,
  baseFCF: number,
  growthRates: number[],
  terminalGrowthRate: number,
  useMidYear: boolean = true
): number | null {
  if (targetEV <= 0 || baseFCF <= 0) return null

  const computeEV = (wacc: number): number | null => {
    const fcfs: number[] = []
    let currentFCF = baseFCF
    for (const rate of growthRates) {
      currentFCF = currentFCF * (1 + rate)
      fcfs.push(currentFCF)
    }

    let pvFCF = 0
    for (let i = 0; i < fcfs.length; i++) {
      const period = useMidYear ? i + 0.5 : i + 1
      pvFCF += fcfs[i] / Math.pow(1 + wacc, period)
    }

    const finalFCF = fcfs[fcfs.length - 1]
    if (wacc <= terminalGrowthRate) return null
    const tv = (finalFCF * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate)
    const pvTV = tv / Math.pow(1 + wacc, growthRates.length)

    return pvFCF + pvTV
  }

  let lo = terminalGrowthRate + 0.001
  let hi = 0.50

  const evAtLo = computeEV(lo)
  const evAtHi = computeEV(hi)
  if (evAtLo === null || evAtHi === null) return null
  if (evAtLo < targetEV) return null // Even lowest WACC can't reach target
  if (evAtHi > targetEV) return null // Even highest WACC produces more than target

  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2
    const evAtMid = computeEV(mid)
    if (evAtMid === null) {
      lo = mid
      continue
    }

    if (Math.abs(evAtMid - targetEV) / targetEV < 0.0001) {
      return Math.round(mid * 10000) / 10000
    }

    if (evAtMid > targetEV) {
      lo = mid // EV too high → need higher WACC
    } else {
      hi = mid // EV too low → need lower WACC
    }
  }

  return Math.round(((lo + hi) / 2) * 10000) / 10000
}
