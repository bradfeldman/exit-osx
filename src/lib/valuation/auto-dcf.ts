/**
 * Auto-DCF Calculator
 *
 * Automatically calculates a DCF valuation using financial data
 * the user has already entered (FinancialPeriods with CashFlowStatements,
 * IncomeStatements, and BalanceSheets).
 *
 * This runs inside the snapshot pipeline — no user input required.
 */

import { prisma } from '@/lib/prisma'
import { PeriodType } from '@prisma/client'
import { calculateWACC, calculateDCF } from './dcf-calculator'
import type { WACCInputs, DCFInputs } from './dcf-calculator'

// Market constants
const RISK_FREE_RATE = 0.0425
const MARKET_RISK_PREMIUM = 0.055
const DEFAULT_BETA = 1.0
const DEFAULT_COST_OF_DEBT = 0.06
const DEFAULT_TAX_RATE = 0.25
const DEFAULT_DEBT_WEIGHT = 0.20
const DEFAULT_EQUITY_WEIGHT = 0.80
const TERMINAL_GROWTH_RATE = 0.025
const DEFAULT_GROWTH_RATES = [0.05, 0.05, 0.04, 0.03, 0.025]

// Size risk premium by revenue category
const SIZE_RISK_PREMIUM: Record<string, number> = {
  UNDER_500K: 0.06,
  FROM_500K_TO_1M: 0.06,
  FROM_1M_TO_3M: 0.06,
  FROM_3M_TO_10M: 0.04,
  FROM_10M_TO_25M: 0.04,
  OVER_25M: 0.025,
}

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
}

export interface AutoDCFFailure {
  success: false
  reason: string
}

export type AutoDCFResult = AutoDCFOutcome | AutoDCFFailure

/**
 * Calculate DCF valuation automatically from a company's financial data.
 */
export async function calculateAutoDCF(companyId: string): Promise<AutoDCFResult> {
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

    // 3. Get company data for size risk premium
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { coreFactors: true },
    })

    const revenueSizeCategory = company?.coreFactors?.revenueSizeCategory ?? null
    const sizeRiskPremium = revenueSizeCategory
      ? (SIZE_RISK_PREMIUM[revenueSizeCategory] ?? 0.04)
      : 0.04

    // 4. Derive cost of debt and tax rate from financial data
    let costOfDebt = DEFAULT_COST_OF_DEBT
    let taxRate = DEFAULT_TAX_RATE

    if (latestPeriod.incomeStatement && latestPeriod.balanceSheet) {
      const is = latestPeriod.incomeStatement
      const bs = latestPeriod.balanceSheet

      // Cost of debt = interest expense / total debt
      const interestExpense = is.interestExpense ? Number(is.interestExpense) : 0
      const totalDebt = Number(bs.longTermDebt) + Number(bs.currentPortionLtd)
      if (interestExpense > 0 && totalDebt > 0) {
        const derivedCostOfDebt = interestExpense / totalDebt
        // Sanity check: cost of debt between 1% and 20%
        if (derivedCostOfDebt >= 0.01 && derivedCostOfDebt <= 0.20) {
          costOfDebt = derivedCostOfDebt
        }
      }

      // Tax rate = tax expense / EBT
      const taxExpense = is.taxExpense ? Number(is.taxExpense) : 0
      const ebitda = Number(is.ebitda)
      const depreciation = is.depreciation ? Number(is.depreciation) : 0
      const amortization = is.amortization ? Number(is.amortization) : 0
      const ebt = ebitda - depreciation - amortization - interestExpense
      if (taxExpense > 0 && ebt > 0) {
        const derivedTaxRate = taxExpense / ebt
        // Sanity check: tax rate between 5% and 50%
        if (derivedTaxRate >= 0.05 && derivedTaxRate <= 0.50) {
          taxRate = derivedTaxRate
        }
      }
    }

    // 5. Derive capital structure from balance sheet
    let debtWeight = DEFAULT_DEBT_WEIGHT
    let equityWeight = DEFAULT_EQUITY_WEIGHT

    if (latestPeriod.balanceSheet) {
      const bs = latestPeriod.balanceSheet
      const totalDebt = Number(bs.longTermDebt) + Number(bs.currentPortionLtd)
      const totalEquity = Number(bs.totalEquity)
      const totalCapital = totalDebt + totalEquity
      if (totalCapital > 0 && totalEquity > 0) {
        debtWeight = totalDebt / totalCapital
        equityWeight = totalEquity / totalCapital
        // Sanity: cap debt weight at 80%
        if (debtWeight > 0.80) {
          debtWeight = 0.80
          equityWeight = 0.20
        }
      }
    }

    // 6. Calculate WACC
    const waccInputs: WACCInputs = {
      riskFreeRate: RISK_FREE_RATE,
      marketRiskPremium: MARKET_RISK_PREMIUM,
      beta: DEFAULT_BETA,
      sizeRiskPremium,
      costOfDebt,
      taxRate,
      debtWeight,
      equityWeight,
    }

    const wacc = calculateWACC(waccInputs)

    // Guard: WACC must be > terminal growth rate
    if (wacc <= TERMINAL_GROWTH_RATE) {
      return { success: false, reason: 'wacc_below_terminal_growth' }
    }

    // 7. Derive growth rates from historical FCF
    let growthRates = [...DEFAULT_GROWTH_RATES]

    if (periods.length >= 2) {
      // Calculate YoY growth rates from historical FCF
      const historicalRates: number[] = []
      for (let i = 0; i < periods.length - 1; i++) {
        const currentFCF = Number(periods[i].cashFlowStatement!.freeCashFlow)
        const priorFCF = Number(periods[i + 1].cashFlowStatement!.freeCashFlow)
        if (priorFCF > 0 && currentFCF > 0) {
          historicalRates.push((currentFCF - priorFCF) / priorFCF)
        }
      }

      if (historicalRates.length > 0) {
        // Use median rate (more robust than average)
        historicalRates.sort((a, b) => a - b)
        const medianIdx = Math.floor(historicalRates.length / 2)
        let medianRate = historicalRates.length % 2 === 0
          ? (historicalRates[medianIdx - 1] + historicalRates[medianIdx]) / 2
          : historicalRates[medianIdx]

        // Cap between 0% and 25%
        medianRate = Math.max(0, Math.min(0.25, medianRate))

        // Taper over 5 years toward terminal growth rate
        growthRates = [
          medianRate,
          medianRate * 0.85 + TERMINAL_GROWTH_RATE * 0.15,
          medianRate * 0.60 + TERMINAL_GROWTH_RATE * 0.40,
          medianRate * 0.35 + TERMINAL_GROWTH_RATE * 0.65,
          TERMINAL_GROWTH_RATE,
        ]
      }
    }

    // 8. Run DCF calculation
    const dcfInputs: DCFInputs = {
      baseFCF,
      growthRates,
      wacc,
      terminalMethod: 'gordon',
      perpetualGrowthRate: TERMINAL_GROWTH_RATE,
      netDebt,
    }

    // Get adjusted EBITDA for implied multiple calculation
    let adjustedEbitda: number | null = null
    if (latestPeriod.incomeStatement) {
      adjustedEbitda = Number(latestPeriod.incomeStatement.ebitda)
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
      perpetualGrowthRate: TERMINAL_GROWTH_RATE,
      netDebt,
      impliedMultiple: dcfResult.impliedEbitdaMultiple ?? null,
      adjustedEbitda,
    }
  } catch (error) {
    console.error(`[AUTO-DCF] Error calculating for company ${companyId}:`, error)
    return { success: false, reason: 'calculation_error' }
  }
}
