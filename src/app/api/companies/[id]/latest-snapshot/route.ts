import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    // Check for specific snapshot ID in query params
    const { searchParams } = new URL(request.url)
    const snapshotId = searchParams.get('snapshotId')

    let snapshot
    if (snapshotId) {
      // Fetch specific snapshot by ID (must belong to this company)
      snapshot = await prisma.valuationSnapshot.findFirst({
        where: { id: snapshotId, companyId },
      })
    } else {
      // Fetch latest snapshot
      snapshot = await prisma.valuationSnapshot.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      })
    }

    if (!snapshot) {
      return NextResponse.json({ snapshot: null })
    }

    return NextResponse.json({
      snapshot: {
        id: snapshot.id,
        companyId: snapshot.companyId,
        createdAt: snapshot.createdAt.toISOString(),
        snapshotReason: snapshot.snapshotReason,
        // Financial inputs
        adjustedEbitda: Number(snapshot.adjustedEbitda),
        // Industry multiples
        industryMultipleLow: Number(snapshot.industryMultipleLow),
        industryMultipleHigh: Number(snapshot.industryMultipleHigh),
        // Core Score
        coreScore: Number(snapshot.coreScore),
        // BRI scores
        briScore: Number(snapshot.briScore),
        briFinancial: Number(snapshot.briFinancial),
        briTransferability: Number(snapshot.briTransferability),
        briOperational: Number(snapshot.briOperational),
        briMarket: Number(snapshot.briMarket),
        briLegalTax: Number(snapshot.briLegalTax),
        briPersonal: Number(snapshot.briPersonal),
        // Multiple calculation
        alphaConstant: Number(snapshot.alphaConstant),
        baseMultiple: Number(snapshot.baseMultiple),
        discountFraction: Number(snapshot.discountFraction),
        finalMultiple: Number(snapshot.finalMultiple),
        // Valuation outputs
        currentValue: Number(snapshot.currentValue),
        potentialValue: Number(snapshot.potentialValue),
        valueGap: Number(snapshot.valueGap),
        // V2 scores
        businessQualityScore: snapshot.businessQualityScore != null ? Number(snapshot.businessQualityScore) : null,
        dealReadinessScore: snapshot.dealReadinessScore != null ? Number(snapshot.dealReadinessScore) : null,
        riskSeverityScore: snapshot.riskSeverityScore != null ? Number(snapshot.riskSeverityScore) : null,
        // V2 multiples
        industryMedianMultiple: snapshot.industryMedianMultiple != null ? Number(snapshot.industryMedianMultiple) : null,
        qualityAdjustedMultiple: snapshot.qualityAdjustedMultiple != null ? Number(snapshot.qualityAdjustedMultiple) : null,
        riskAdjustedMultiple: snapshot.riskAdjustedMultiple != null ? Number(snapshot.riskAdjustedMultiple) : null,
        // V2 EV range
        evLow: snapshot.evLow != null ? Number(snapshot.evLow) : null,
        evMid: snapshot.evMid != null ? Number(snapshot.evMid) : null,
        evHigh: snapshot.evHigh != null ? Number(snapshot.evHigh) : null,
        spreadFactor: snapshot.spreadFactor != null ? Number(snapshot.spreadFactor) : null,
        // V2 risk details
        dlomRate: snapshot.dlomRate != null ? Number(snapshot.dlomRate) : null,
        dlomAmount: snapshot.dlomAmount != null ? Number(snapshot.dlomAmount) : null,
        riskDiscounts: snapshot.riskDiscounts ?? null,
        qualityAdjustments: snapshot.qualityAdjustments ?? null,
        totalQualityAdjustment: snapshot.totalQualityAdjustment != null ? Number(snapshot.totalQualityAdjustment) : null,
        // V2 gap decomposition
        addressableGap: snapshot.addressableGap != null ? Number(snapshot.addressableGap) : null,
        structuralGap: snapshot.structuralGap != null ? Number(snapshot.structuralGap) : null,
        aspirationalGap: snapshot.aspirationalGap != null ? Number(snapshot.aspirationalGap) : null,
      },
    })
  } catch (error) {
    console.error('Error fetching latest snapshot:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch latest snapshot' },
      { status: 500 }
    )
  }
}
