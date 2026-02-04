import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: companyId } = await params

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
    shouldUseSnapshotValues: !hasFinancials && !useDCF && !hasMultipleOverride,
    conditions: {
      hasFinancials,
      useDCF,
      hasMultipleOverride,
    },
  })
}
