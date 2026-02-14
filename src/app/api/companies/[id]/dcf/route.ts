import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

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
      return NextResponse.json({ assumptions: null, financials, workingCapital })
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
    console.error('Error fetching DCF assumptions:', error)
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
    console.error('Error saving DCF assumptions:', error)
    return NextResponse.json(
      { error: 'Failed to save DCF assumptions' },
      { status: 500 }
    )
  }
}
