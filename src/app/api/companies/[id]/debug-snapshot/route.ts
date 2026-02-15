import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY FIX (SEC-039): Block debug endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { id: companyId } = await params

  // SECURITY FIX (SEC-039): Verify workspace membership even in dev
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  // Get latest snapshot
  const latestSnapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  })

  // Get company
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      annualRevenue: true,
      financialPeriods: {
        include: { incomeStatement: true },
      },
    },
  })

  // Get DCF settings
  const dcfAssumptions = await prisma.dCFAssumptions.findUnique({
    where: { companyId },
    select: {
      useDCFValue: true,
      ebitdaMultipleLowOverride: true,
      ebitdaMultipleHighOverride: true,
    },
  })

  const hasFinancials = company?.financialPeriods.some(p => p.incomeStatement)
  const useDCF = dcfAssumptions?.useDCFValue
  const hasMultipleOverride = dcfAssumptions?.ebitdaMultipleLowOverride != null

  return NextResponse.json({
    companyId,
    companyName: company?.name,
    hasSnapshot: !!latestSnapshot,
    snapshot: latestSnapshot ? {
      id: latestSnapshot.id,
      createdAt: latestSnapshot.createdAt,
      currentValue: Number(latestSnapshot.currentValue),
      potentialValue: Number(latestSnapshot.potentialValue),
      valueGap: Number(latestSnapshot.valueGap),
      briScore: Number(latestSnapshot.briScore),
      adjustedEbitda: Number(latestSnapshot.adjustedEbitda),
      snapshotReason: latestSnapshot.snapshotReason,
    } : null,
    // PROD-062: shouldUseSnapshotValues removed — dashboard always recalculates fresh
    conditions: {
      hasFinancials,
      useDCF,
      hasMultipleOverride,
    },
  })
}
