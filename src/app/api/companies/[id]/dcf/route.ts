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

    if (!dcfAssumptions) {
      return NextResponse.json({ assumptions: null })
    }

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
