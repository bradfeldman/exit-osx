/**
 * Auto-DCF Calculator
 *
 * Automatically calculates a DCF valuation using financial data
 * the user has already entered (FinancialPeriods with CashFlowStatements,
 * IncomeStatements, and BalanceSheets).
 *
 * This runs inside the snapshot pipeline — no user input required.
 *
 * Uses the WACC defaults engine (wacc-defaults.ts) for market-calibrated
 * discount rates. BRI score flows into Company-Specific Risk premium.
 */

import { prisma } from '@/lib/prisma'
import { PeriodType } from '@prisma/client'
import { calculateWACC, calculateDCF } from './dcf-calculator'
import type { WACCInputs, DCFInputs } from './dcf-calculator'
import {
  calculateWACCDefaults,
  DEFAULT_TERMINAL_GROWTH_RATE,
  DEFAULT_GROWTH_RATES,
} from './wacc-defaults'

export interface AutoDCFOutcome {
  success: true
  enterpriseValue: number
  equityValue: number
  wacc: number
  baseFcf: number
  growthRates: number[]
  terminalMethod: string
  perpetualGrowthRate: number
  netDebt: number
  impliedMultiple: number | null
  adjustedEbitda: number | null
  companySpecificRisk: number
}

export interface AutoDCFFailure {
  success: false
  reason: string
}

export type AutoDCFResult = AutoDCFOutcome | AutoDCFFailure

/**
 * Calculate DCF valuation automatically from a company's financial data.
 *
 * @param companyId - The company to calculate for
 * @param briScore - BRI score on 0-1 scale (drives Company-Specific Risk in WACC)
 * @param ebitdaOverride - Optional EBITDA override (e.g., adjusted EBITDA from snapshot pipeline)
 */
export async function calculateAutoDCF(
  companyId: string,
  briScore: number = 0.5,
  ebitdaOverride?: number
): Promise<AutoDCFResult> {
  try {
    // Fetch up to 5 most recent ANNUAL periods that have a CashFlowStatement
    const periods = await prisma.financialPeriod.findMany({
      where: {
        companyId,
        periodType: PeriodType.ANNUAL,
        cashFlowStatement: { isNot: null },
      },
      orderBy: { fiscalYear: 'desc' },
      take: 5,
      include: {
        cashFlowStatement: true,
        incomeStatement: true,
        balanceSheet: true,
      },
    })

    if (periods.length === 0) {
      return { success: false, reason: 'no_cash_flow_data' }
    }

    // Most recent period is first (desc order)
    const latestPeriod = periods[0]
    const latestCFS = latestPeriod.cashFlowStatement!

    // 1. Extract base FCF
    const baseFCF = Number(latestCFS.freeCashFlow)
    if (baseFCF <= 0) {
      return { success: false, reason: 'negative_fcf' }
    }

    // 2. Extract net debt from latest balance sheet
    let netDebt = 0
    if (latestPeriod.balanceSheet) {
      const bs = latestPeriod.balanceSheet
      const totalDebt = Number(bs.longTermDebt) + Number(bs.currentPortionLtd)
      const cash = Number(bs.cash)
      netDebt = totalDebt - cash
    }

    // 3. Determine EBITDA for tier selection
    let adjustedEbitda: number | null = null
    if (ebitdaOverride && ebitdaOverride > 0) {
      adjustedEbitda = ebitdaOverride
    } else if (latestPeriod.incomeStatement) {
      adjustedEbitda = Number(latestPeriod.incomeStatement.ebitda)
    }

    // 4. Derive financial data for WACC defaults
    let derivedCostOfDebt: number | null = null
    let derivedTaxRate: number | null = null
    let derivedDebtWeight: number | null = null

    if (latestPeriod.incomeStatement && latestPeriod.balanceSheet) {
      const is = latestPeriod.incomeStatement
      const bs = latestPeriod.balanceSheet

      // Cost of debt = interest expense / total debt
      const interestExpense = is.interestExpense ? Number(is.interestExpense) : 0
      const totalDebt = Number(bs.longTermDebt) + Number(bs.currentPortionLtd)
      if (interestExpense > 0 && totalDebt > 0) {
        const derived = interestExpense / totalDebt
        if (derived >= 0.03 && derived <= 0.20) {
          derivedCostOfDebt = derived
        }
      }

      // Tax rate = tax expense / EBT
      const taxExpense = is.taxExpense ? Number(is.taxExpense) : 0
      const ebitda = Number(is.ebitda)
      const depreciation = is.depreciation ? Number(is.depreciation) : 0
      const amortization = is.amortization ? Number(is.amortization) : 0
      const ebt = ebitda - depreciation - amortization - interestExpense
      if (taxExpense > 0 && ebt > 0) {
        const derived = taxExpense / ebt
        if (derived >= 0.05 && derived <= 0.50) {
          derivedTaxRate = derived
        }
      }
    }

    // Capital structure from balance sheet
    if (latestPeriod.balanceSheet) {
      const bs = latestPeriod.balanceSheet
      const totalDebt = Number(bs.longTermDebt) + Number(bs.currentPortionLtd)
      const totalEquity = Number(bs.totalEquity)
      const totalCapital = totalDebt + totalEquity
      if (totalCapital > 0 && totalEquity > 0) {
        let dw = totalDebt / totalCapital
        if (dw > 0.80) dw = 0.80
        derivedDebtWeight = dw
      }
    }

    // 5. Get calibrated WACC defaults from the engine
    const defaults = calculateWACCDefaults({
      adjustedEbitda: adjustedEbitda && adjustedEbitda > 0 ? adjustedEbitda : baseFCF / 0.7,
      briScore,
      derivedCostOfDebt,
      derivedTaxRate,
      derivedDebtWeight,
    })

    // 6. Calculate WACC
    const waccInputs: WACCInputs = {
      riskFreeRate: defaults.riskFreeRate,
      marketRiskPremium: defaults.equityRiskPremium,
      beta: defaults.beta,
      sizeRiskPremium: defaults.sizeRiskPremium,
      companySpecificRisk: defaults.companySpecificRisk,
      costOfDebt: defaults.preTaxCostOfDebt,
      taxRate: defaults.taxRate,
      debtWeight: defaults.debtWeight,
      equityWeight: defaults.equityWeight,
    }

    const wacc = calculateWACC(waccInputs)

    // Guard: WACC must be > terminal growth rate
    if (wacc <= DEFAULT_TERMINAL_GROWTH_RATE) {
      return { success: false, reason: 'wacc_below_terminal_growth' }
    }

    // 7. Derive growth rates from historical FCF
    let growthRates = [...DEFAULT_GROWTH_RATES]

    if (periods.length >= 2) {
      const historicalRates: number[] = []
      for (let i = 0; i < periods.length - 1; i++) {
        const currentFCF = Number(periods[i].cashFlowStatement!.freeCashFlow)
        const priorFCF = Number(periods[i + 1].cashFlowStatement!.freeCashFlow)
        if (priorFCF > 0 && currentFCF > 0) {
          historicalRates.push((currentFCF - priorFCF) / priorFCF)
        }
      }

      if (historicalRates.length > 0) {
        historicalRates.sort((a, b) => a - b)
        const medianIdx = Math.floor(historicalRates.length / 2)
        let medianRate = historicalRates.length % 2 === 0
          ? (historicalRates[medianIdx - 1] + historicalRates[medianIdx]) / 2
          : historicalRates[medianIdx]

        medianRate = Math.max(0, Math.min(0.25, medianRate))

        growthRates = [
          medianRate,
          medianRate * 0.85 + DEFAULT_TERMINAL_GROWTH_RATE * 0.15,
          medianRate * 0.60 + DEFAULT_TERMINAL_GROWTH_RATE * 0.40,
          medianRate * 0.35 + DEFAULT_TERMINAL_GROWTH_RATE * 0.65,
          DEFAULT_TERMINAL_GROWTH_RATE,
        ]
      }
    }

    // 8. Run DCF calculation with mid-year convention
    const dcfInputs: DCFInputs = {
      baseFCF,
      growthRates,
      wacc,
      terminalMethod: 'gordon',
      perpetualGrowthRate: DEFAULT_TERMINAL_GROWTH_RATE,
      netDebt,
      useMidYearConvention: true,
    }

    const dcfResult = calculateDCF(dcfInputs, adjustedEbitda ?? undefined)

    return {
      success: true,
      enterpriseValue: dcfResult.enterpriseValue,
      equityValue: dcfResult.equityValue,
      wacc,
      baseFcf: baseFCF,
      growthRates,
      terminalMethod: 'gordon',
      perpetualGrowthRate: DEFAULT_TERMINAL_GROWTH_RATE,
      netDebt,
      impliedMultiple: dcfResult.impliedEbitdaMultiple ?? null,
      adjustedEbitda,
      companySpecificRisk: defaults.companySpecificRisk,
    }
  } catch (error) {
    console.error(`[AUTO-DCF] Error calculating for company ${companyId}:`, error)
    return { success: false, reason: 'calculation_error' }
  }
}
