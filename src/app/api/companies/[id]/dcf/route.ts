import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { validateRequestBody, dcfAssumptionsSchema } from '@/lib/security/validation'
import { getIndustryMultiples, estimateEbitdaFromRevenue } from '@/lib/valuation/industry-multiples'
import {
  calculateWACCDefaults,
  DEFAULT_TERMINAL_GROWTH_RATE,
} from '@/lib/valuation/wacc-defaults'

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

    // Fetch company data (needed for estimation fallback and suggestedDefaults)
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { coreFactors: true },
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

    let financials = latestPeriod
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

    // Fallback: estimate from company revenue/EBITDA when no financial periods exist
    if (!financials && company) {
      const revenue = company.annualRevenue ? Number(company.annualRevenue) : 0
      const companyEbitda = company.annualEbitda ? Number(company.annualEbitda) : 0

      if (companyEbitda > 0) {
        // Use EBITDA from company profile directly
        const estFCF = Math.round(companyEbitda * 0.70)
        financials = {
          freeCashFlow: null,
          estimatedFCF: estFCF,
          fcfIsEstimated: true,
          ebitda: companyEbitda,
          netDebt: null,
        }
      } else if (revenue > 0) {
        // Estimate EBITDA from revenue using industry multiples
        const multiples = await getIndustryMultiples(
          company.icbSubSector || '',
          company.icbSector || undefined,
          company.icbSuperSector || undefined,
          company.icbIndustry || undefined,
        )
        const estEbitda = estimateEbitdaFromRevenue(revenue, multiples)
        const estFCF = estEbitda > 0 ? Math.round(estEbitda * 0.70) : 0

        if (estFCF > 0) {
          financials = {
            freeCashFlow: null,
            estimatedFCF: estFCF,
            fcfIsEstimated: true,
            ebitda: estEbitda,
            netDebt: null,
          }
        }
      }
    }

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
      // Use WACC defaults engine for calibrated suggested defaults
      const adjustedEbitda = ebitda && ebitda > 0 ? ebitda : null
      const baseFCFEstimate = financials?.freeCashFlow ?? financials?.estimatedFCF ?? null

      // Derive financial inputs for WACC defaults
      let derivedCostOfDebt: number | null = null
      let derivedTaxRate: number | null = null
      let derivedDebtWeight: number | null = null

      if (latestPeriod?.incomeStatement && latestPeriod?.balanceSheet) {
        const is = latestPeriod.incomeStatement
        const bs = latestPeriod.balanceSheet
        const interestExpense = is.interestExpense ? Number(is.interestExpense) : 0
        const totalDebt = Number(bs.longTermDebt) + Number(bs.currentPortionLtd)
        if (interestExpense > 0 && totalDebt > 0) {
          const derived = interestExpense / totalDebt
          if (derived >= 0.03 && derived <= 0.20) derivedCostOfDebt = derived
        }
        const taxExpense = is.taxExpense ? Number(is.taxExpense) : 0
        const ebitdaVal = Number(is.ebitda)
        const depreciation = is.depreciation ? Number(is.depreciation) : 0
        const amortization = is.amortization ? Number(is.amortization) : 0
        const ebt = ebitdaVal - depreciation - amortization - interestExpense
        if (taxExpense > 0 && ebt > 0) {
          const derived = taxExpense / ebt
          if (derived >= 0.05 && derived <= 0.50) derivedTaxRate = derived
        }
      }
      if (latestPeriod?.balanceSheet) {
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

      // Fetch latest BRI score for CSR calculation
      const latestSnapshot = await prisma.valuationSnapshot.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        select: { briScore: true },
      })
      const briScore = latestSnapshot ? Number(latestSnapshot.briScore) : 0.5

      // Get calibrated defaults from the engine
      const ebitdaForTier = adjustedEbitda ?? (baseFCFEstimate ? baseFCFEstimate / 0.7 : 500_000)
      const defaults = calculateWACCDefaults({
        adjustedEbitda: ebitdaForTier,
        briScore,
        derivedCostOfDebt,
        derivedTaxRate,
        derivedDebtWeight,
      })

      const suggestedDefaults: Record<string, unknown> = {
        riskFreeRate: defaults.riskFreeRate,
        marketRiskPremium: defaults.equityRiskPremium,
        beta: defaults.beta,
        sizeRiskPremium: defaults.sizeRiskPremium,
        companySpecificRisk: defaults.companySpecificRisk,
        costOfDebt: defaults.preTaxCostOfDebt,
        taxRate: defaults.taxRate,
        debtWeight: defaults.debtWeight,
        equityWeight: defaults.equityWeight,
        computedWacc: defaults.computedWacc,
        ebitdaTier: defaults.ebitdaTier,
        useMidYearConvention: true,
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
            year2: Math.round((medianRate * 0.85 + DEFAULT_TERMINAL_GROWTH_RATE * 0.15) * 10000) / 10000,
            year3: Math.round((medianRate * 0.60 + DEFAULT_TERMINAL_GROWTH_RATE * 0.40) * 10000) / 10000,
            year4: Math.round((medianRate * 0.35 + DEFAULT_TERMINAL_GROWTH_RATE * 0.65) * 10000) / 10000,
            year5: DEFAULT_TERMINAL_GROWTH_RATE,
          }
        }
      }

      return NextResponse.json({
        assumptions: null,
        financials,
        workingCapital,
        suggestedDefaults,
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
        companySpecificRisk: dcfAssumptions.companySpecificRisk
          ? Number(dcfAssumptions.companySpecificRisk)
          : null,
        costOfDebtOverride: dcfAssumptions.costOfDebtOverride
          ? Number(dcfAssumptions.costOfDebtOverride)
          : null,
        taxRateOverride: dcfAssumptions.taxRateOverride
          ? Number(dcfAssumptions.taxRateOverride)
          : null,
        debtWeightOverride: dcfAssumptions.debtWeightOverride
          ? Number(dcfAssumptions.debtWeightOverride)
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
        useMidYearConvention: dcfAssumptions.useMidYearConvention,
        ebitdaTier: dcfAssumptions.ebitdaTier,
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

    const validation = await validateRequestBody(request, dcfAssumptionsSchema)
    if (!validation.success) return validation.error

    const {
      baseFCF,
      riskFreeRate,
      marketRiskPremium,
      beta,
      sizeRiskPremium,
      companySpecificRisk,
      costOfDebtOverride,
      taxRateOverride,
      debtWeightOverride,
      growthAssumptions,
      terminalMethod,
      perpetualGrowthRate,
      exitMultiple,
      calculatedWACC,
      enterpriseValue,
      equityValue,
      useMidYearConvention,
      ebitdaTier,
      useDCFValue,
      ebitdaMultipleLowOverride,
      ebitdaMultipleHighOverride,
    } = validation.data

    const dcfAssumptions = await prisma.dCFAssumptions.upsert({
      where: { companyId },
      create: {
        companyId,
        baseFCF: baseFCF ?? null,
        riskFreeRate,
        marketRiskPremium,
        beta,
        sizeRiskPremium,
        companySpecificRisk: companySpecificRisk ?? null,
        costOfDebtOverride: costOfDebtOverride ?? null,
        taxRateOverride: taxRateOverride ?? null,
        debtWeightOverride: debtWeightOverride ?? null,
        growthAssumptions: growthAssumptions || [10, 8, 6, 4, 3],
        terminalMethod: terminalMethod || 'gordon',
        perpetualGrowthRate: perpetualGrowthRate || 2.5,
        exitMultiple: exitMultiple ?? null,
        calculatedWACC: calculatedWACC ?? null,
        enterpriseValue: enterpriseValue ?? null,
        equityValue: equityValue ?? null,
        useMidYearConvention: useMidYearConvention ?? true,
        ebitdaTier: ebitdaTier ?? null,
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
        companySpecificRisk: companySpecificRisk ?? null,
        costOfDebtOverride: costOfDebtOverride ?? null,
        taxRateOverride: taxRateOverride ?? null,
        debtWeightOverride: debtWeightOverride ?? null,
        growthAssumptions: growthAssumptions || [10, 8, 6, 4, 3],
        terminalMethod: terminalMethod || 'gordon',
        perpetualGrowthRate: perpetualGrowthRate || 2.5,
        exitMultiple: exitMultiple ?? null,
        calculatedWACC: calculatedWACC ?? null,
        enterpriseValue: enterpriseValue ?? null,
        equityValue: equityValue ?? null,
        useMidYearConvention: useMidYearConvention ?? true,
        ebitdaTier: ebitdaTier ?? null,
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
        companySpecificRisk: dcfAssumptions.companySpecificRisk
          ? Number(dcfAssumptions.companySpecificRisk)
          : null,
        costOfDebtOverride: dcfAssumptions.costOfDebtOverride
          ? Number(dcfAssumptions.costOfDebtOverride)
          : null,
        taxRateOverride: dcfAssumptions.taxRateOverride
          ? Number(dcfAssumptions.taxRateOverride)
          : null,
        debtWeightOverride: dcfAssumptions.debtWeightOverride
          ? Number(dcfAssumptions.debtWeightOverride)
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
        useMidYearConvention: dcfAssumptions.useMidYearConvention,
        ebitdaTier: dcfAssumptions.ebitdaTier,
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
