import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'

/**
 * POST - Trigger BRI recalculation after inline category assessment updates
 * This creates a new ValuationSnapshot with updated scores based on current responses.
 * Task generation is handled separately via /api/companies/[id]/generate-ai-tasks.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  // SEC-077: Use standard checkPermission instead of ad-hoc auth
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const dbUserId = result.auth.user.id

    // Recalculate snapshot with current BRI scores
    const recalcResult = await recalculateSnapshotForCompany(
      companyId,
      'Category assessment updated',
      dbUserId
    )

    if (!recalcResult.success) {
      return NextResponse.json(
        { error: recalcResult.error || 'Failed to recalculate' },
        { status: 500 }
      )
    }

    // Get the new snapshot to return updated scores
    const snapshot = await prisma.valuationSnapshot.findUnique({
      where: { id: recalcResult.snapshotId },
      select: {
        briScore: true,
        briFinancial: true,
        briTransferability: true,
        briOperational: true,
        briMarket: true,
        briLegalTax: true,
        briPersonal: true,
        currentValue: true,
        potentialValue: true,
        valueGap: true,
      }
    })

    return NextResponse.json({
      success: true,
      snapshotId: recalcResult.snapshotId,
      scores: snapshot ? {
        briScore: Math.round(Number(snapshot.briScore) * 100),
        categories: {
          financial: Math.round(Number(snapshot.briFinancial) * 100),
          transferability: Math.round(Number(snapshot.briTransferability) * 100),
          operational: Math.round(Number(snapshot.briOperational) * 100),
          market: Math.round(Number(snapshot.briMarket) * 100),
          legalTax: Math.round(Number(snapshot.briLegalTax) * 100),
          personal: Math.round(Number(snapshot.briPersonal) * 100),
        },
        currentValue: Math.round(Number(snapshot.currentValue)),
        potentialValue: Math.round(Number(snapshot.potentialValue)),
        valueGap: Math.round(Number(snapshot.valueGap)),
      } : null
    })
  } catch (error) {
    console.error('Error recalculating BRI:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to recalculate BRI' },
      { status: 500 }
    )
  }
}
