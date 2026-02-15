import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

// Size risk premium by revenue category (mirrors auto-dcf.ts)
const SIZE_RISK_PREMIUM: Record<string, number> = {
  UNDER_500K: 0.06,
  FROM_500K_TO_1M: 0.06,
  FROM_1M_TO_3M: 0.06,
  FROM_3M_TO_10M: 0.04,
  FROM_10M_TO_25M: 0.04,
  OVER_25M: 0.025,
}

const TERMINAL_GROWTH_RATE = 0.025

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error

    const dcfAssumptions = await prisma.dCFAssumptions.findUnique({
      where: { companyId },
    })

    // Fetch up to 4 annual periods for base FCF, EBITDA, net debt, and working capital
    const periods = await prisma.financialPeriod.findMany({
      where: { companyId, periodType: 'ANNUAL' },
      orderBy: { endDate: 'desc' },
      take: 4,
      include: { cashFlowStatement: true, incomeStatement: true, balanceSheet: true },
    })

    // Split into T12 and fiscal year periods
    const t12Period = periods.find((p) => p.label?.startsWith('T12'))
    const fyPeriods = periods.filter((p) => !p.label?.startsWith('T12'))

    // Use latest period (T12 if available, otherwise latest FY) for financials
    const latestPeriod = periods[0] || null

    const actualFCF = latestPeriod?.cashFlowStatement?.freeCashFlow
      ? Number(latestPeriod.cashFlowStatement.freeCashFlow)
      : null
    const ebitda = latestPeriod?.incomeStatement?.ebitda
      ? Number(latestPeriod.incomeStatement.ebitda)
      : null

    // If no actual FCF but we have EBITDA, estimate FCF using a 70% conversion ratio
    // FCF ≈ EBITDA × 0.70 (accounts for taxes, capex, and WC changes typical of SMBs)
    const estimatedFCF = !actualFCF && ebitda ? Math.round(ebitda * 0.70) : null

    const financials = latestPeriod
      ? {
          freeCashFlow: actualFCF,
          estimatedFCF,
          fcfIsEstimated: !actualFCF && !!estimatedFCF,
          ebitda,
          netDebt: latestPeriod.balanceSheet
            ? Number(latestPeriod.balanceSheet.longTermDebt) +
              Number(latestPeriod.balanceSheet.currentPortionLtd) -
              Number(latestPeriod.balanceSheet.cash)
            : null,
        }
      : null

    // Build working capital data
    const t12WorkingCapital = t12Period?.balanceSheet?.workingCapital != null
      ? Number(t12Period.balanceSheet.workingCapital)
      : null
    const lastFYWorkingCapital = fyPeriods[0]?.balanceSheet?.workingCapital != null
      ? Number(fyPeriods[0].balanceSheet.workingCapital)
      : null
    const threeYearWcValues = fyPeriods
      .slice(0, 3)
      .map((p) => p.balanceSheet?.workingCapital != null ? Number(p.balanceSheet.workingCapital) : null)
      .filter((v): v is number => v !== null)
    const threeYearAvgWorkingCapital = threeYearWcValues.length > 0
      ? threeYearWcValues.reduce((sum, v) => sum + v, 0) / threeYearWcValues.length
      : null

    const workingCapital = {
      t12: t12WorkingCapital,
      lastFY: lastFYWorkingCapital,
      threeYearAvg: threeYearAvgWorkingCapital,
    }

    if (!dcfAssumptions) {
      // Derive smart defaults from financial data when no saved assumptions exist
      const suggestedDefaults: Record<string, unknown> = {}

      // Size risk premium from revenue category
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { coreFactors: true },
      })
      const revenueSizeCategory = company?.coreFactors?.revenueSizeCategory ?? null
      if (revenueSizeCategory && SIZE_RISK_PREMIUM[revenueSizeCategory] != null) {
        suggestedDefaults.sizeRiskPremium = SIZE_RISK_PREMIUM[revenueSizeCategory]
      }

      // Derive cost of debt, tax rate, and capital structure from latest period
      if (latestPeriod?.incomeStatement && latestPeriod?.balanceSheet) {
        const is = latestPeriod.incomeStatement
        const bs = latestPeriod.balanceSheet

        // Cost of debt = interest expense / total debt
        const interestExpense = is.interestExpense ? Number(is.interestExpense) : 0
        const totalDebt = Number(bs.longTermDebt) + Number(bs.currentPortionLtd)
        if (interestExpense > 0 && totalDebt > 0) {
          const derivedCostOfDebt = interestExpense / totalDebt
          if (derivedCostOfDebt >= 0.01 && derivedCostOfDebt <= 0.20) {
            suggestedDefaults.costOfDebt = Math.round(derivedCostOfDebt * 10000) / 10000
          }
        }

        // Tax rate = tax expense / EBT
        const taxExpense = is.taxExpense ? Number(is.taxExpense) : 0
        const ebitdaVal = Number(is.ebitda)
        const depreciation = is.depreciation ? Number(is.depreciation) : 0
        const amortization = is.amortization ? Number(is.amortization) : 0
        const ebt = ebitdaVal - depreciation - amortization - interestExpense
        if (taxExpense > 0 && ebt > 0) {
          const derivedTaxRate = taxExpense / ebt
          if (derivedTaxRate >= 0.05 && derivedTaxRate <= 0.50) {
            suggestedDefaults.taxRate = Math.round(derivedTaxRate * 10000) / 10000
          }
        }
      }

      // Capital structure from balance sheet
      if (latestPeriod?.balanceSheet) {
        const bs = latestPeriod.balanceSheet
        const totalDebt = Number(bs.longTermDebt) + Number(bs.currentPortionLtd)
        const totalEquity = Number(bs.totalEquity)
        const totalCapital = totalDebt + totalEquity
        if (totalCapital > 0 && totalEquity > 0) {
          let debtWeight = totalDebt / totalCapital
          let equityWeight = totalEquity / totalCapital
          if (debtWeight > 0.80) {
            debtWeight = 0.80
            equityWeight = 0.20
          }
          suggestedDefaults.debtWeight = Math.round(debtWeight * 10000) / 10000
          suggestedDefaults.equityWeight = Math.round(equityWeight * 10000) / 10000
        }
      }

      // Growth rates from historical FCF YoY changes
      if (periods.length >= 2) {
        const historicalRates: number[] = []
        for (let i = 0; i < periods.length - 1; i++) {
          const currentFCF = periods[i].cashFlowStatement?.freeCashFlow
            ? Number(periods[i].cashFlowStatement!.freeCashFlow)
            : 0
          const priorFCF = periods[i + 1].cashFlowStatement?.freeCashFlow
            ? Number(periods[i + 1].cashFlowStatement!.freeCashFlow)
            : 0
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

          suggestedDefaults.growthAssumptions = {
            year1: Math.round(medianRate * 10000) / 10000,
            year2: Math.round((medianRate * 0.85 + TERMINAL_GROWTH_RATE * 0.15) * 10000) / 10000,
            year3: Math.round((medianRate * 0.60 + TERMINAL_GROWTH_RATE * 0.40) * 10000) / 10000,
            year4: Math.round((medianRate * 0.35 + TERMINAL_GROWTH_RATE * 0.65) * 10000) / 10000,
            year5: TERMINAL_GROWTH_RATE,
          }
        }
      }

      return NextResponse.json({
        assumptions: null,
        financials,
        workingCapital,
        ...(Object.keys(suggestedDefaults).length > 0 ? { suggestedDefaults } : {}),
      })
    }

    return NextResponse.json({
      financials,
      workingCapital,
      assumptions: {
        baseFCF: dcfAssumptions.baseFCF
          ? Number(dcfAssumptions.baseFCF)
          : null,
        riskFreeRate: Number(dcfAssumptions.riskFreeRate),
        marketRiskPremium: Number(dcfAssumptions.marketRiskPremium),
        beta: Number(dcfAssumptions.beta),
        sizeRiskPremium: Number(dcfAssumptions.sizeRiskPremium),
        costOfDebtOverride: dcfAssumptions.costOfDebtOverride
          ? Number(dcfAssumptions.costOfDebtOverride)
          : null,
        taxRateOverride: dcfAssumptions.taxRateOverride
          ? Number(dcfAssumptions.taxRateOverride)
          : null,
        growthAssumptions: dcfAssumptions.growthAssumptions,
        terminalMethod: dcfAssumptions.terminalMethod,
        perpetualGrowthRate: Number(dcfAssumptions.perpetualGrowthRate),
        exitMultiple: dcfAssumptions.exitMultiple
          ? Number(dcfAssumptions.exitMultiple)
          : null,
        calculatedWACC: dcfAssumptions.calculatedWACC
          ? Number(dcfAssumptions.calculatedWACC)
          : null,
        enterpriseValue: dcfAssumptions.enterpriseValue
          ? Number(dcfAssumptions.enterpriseValue)
          : null,
        equityValue: dcfAssumptions.equityValue
          ? Number(dcfAssumptions.equityValue)
          : null,
        useDCFValue: dcfAssumptions.useDCFValue,
        ebitdaMultipleLowOverride: dcfAssumptions.ebitdaMultipleLowOverride
          ? Number(dcfAssumptions.ebitdaMultipleLowOverride)
          : null,
        ebitdaMultipleHighOverride: dcfAssumptions.ebitdaMultipleHighOverride
          ? Number(dcfAssumptions.ebitdaMultipleHighOverride)
          : null,
      },
    })
  } catch (error) {
    console.error('Error fetching DCF assumptions:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch DCF assumptions' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error

    const body = await request.json()

    const {
      baseFCF,
      riskFreeRate,
      marketRiskPremium,
      beta,
      sizeRiskPremium,
      costOfDebtOverride,
      taxRateOverride,
      growthAssumptions,
      terminalMethod,
      perpetualGrowthRate,
      exitMultiple,
      calculatedWACC,
      enterpriseValue,
      equityValue,
      useDCFValue,
      ebitdaMultipleLowOverride,
      ebitdaMultipleHighOverride,
    } = body

    const dcfAssumptions = await prisma.dCFAssumptions.upsert({
      where: { companyId },
      create: {
        companyId,
        baseFCF: baseFCF ?? null,
        riskFreeRate,
        marketRiskPremium,
        beta,
        sizeRiskPremium,
        costOfDebtOverride: costOfDebtOverride ?? null,
        taxRateOverride: taxRateOverride ?? null,
        growthAssumptions: growthAssumptions || [10, 8, 6, 4, 3],
        terminalMethod: terminalMethod || 'gordon',
        perpetualGrowthRate: perpetualGrowthRate || 2.5,
        exitMultiple: exitMultiple ?? null,
        calculatedWACC: calculatedWACC ?? null,
        enterpriseValue: enterpriseValue ?? null,
        equityValue: equityValue ?? null,
        useDCFValue: useDCFValue ?? false,
        isManuallyConfigured: true, // Manual save = skip auto-DCF
        ebitdaMultipleLowOverride: ebitdaMultipleLowOverride ?? null,
        ebitdaMultipleHighOverride: ebitdaMultipleHighOverride ?? null,
      },
      update: {
        baseFCF: baseFCF ?? null,
        riskFreeRate,
        marketRiskPremium,
        beta,
        sizeRiskPremium,
        costOfDebtOverride: costOfDebtOverride ?? null,
        taxRateOverride: taxRateOverride ?? null,
        growthAssumptions: growthAssumptions || [10, 8, 6, 4, 3],
        terminalMethod: terminalMethod || 'gordon',
        perpetualGrowthRate: perpetualGrowthRate || 2.5,
        exitMultiple: exitMultiple ?? null,
        calculatedWACC: calculatedWACC ?? null,
        enterpriseValue: enterpriseValue ?? null,
        equityValue: equityValue ?? null,
        useDCFValue: useDCFValue ?? false,
        isManuallyConfigured: true, // Manual save = skip auto-DCF
        ebitdaMultipleLowOverride: ebitdaMultipleLowOverride ?? null,
        ebitdaMultipleHighOverride: ebitdaMultipleHighOverride ?? null,
      },
    })

    return NextResponse.json({
      assumptions: {
        baseFCF: dcfAssumptions.baseFCF
          ? Number(dcfAssumptions.baseFCF)
          : null,
        riskFreeRate: Number(dcfAssumptions.riskFreeRate),
        marketRiskPremium: Number(dcfAssumptions.marketRiskPremium),
        beta: Number(dcfAssumptions.beta),
        sizeRiskPremium: Number(dcfAssumptions.sizeRiskPremium),
        costOfDebtOverride: dcfAssumptions.costOfDebtOverride
          ? Number(dcfAssumptions.costOfDebtOverride)
          : null,
        taxRateOverride: dcfAssumptions.taxRateOverride
          ? Number(dcfAssumptions.taxRateOverride)
          : null,
        growthAssumptions: dcfAssumptions.growthAssumptions,
        terminalMethod: dcfAssumptions.terminalMethod,
        perpetualGrowthRate: Number(dcfAssumptions.perpetualGrowthRate),
        exitMultiple: dcfAssumptions.exitMultiple
          ? Number(dcfAssumptions.exitMultiple)
          : null,
        calculatedWACC: dcfAssumptions.calculatedWACC
          ? Number(dcfAssumptions.calculatedWACC)
          : null,
        enterpriseValue: dcfAssumptions.enterpriseValue
          ? Number(dcfAssumptions.enterpriseValue)
          : null,
        equityValue: dcfAssumptions.equityValue
          ? Number(dcfAssumptions.equityValue)
          : null,
        useDCFValue: dcfAssumptions.useDCFValue,
        ebitdaMultipleLowOverride: dcfAssumptions.ebitdaMultipleLowOverride
          ? Number(dcfAssumptions.ebitdaMultipleLowOverride)
          : null,
        ebitdaMultipleHighOverride: dcfAssumptions.ebitdaMultipleHighOverride
          ? Number(dcfAssumptions.ebitdaMultipleHighOverride)
          : null,
      },
    })
  } catch (error) {
    console.error('Error saving DCF assumptions:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to save DCF assumptions' },
      { status: 500 }
    )
  }
}
