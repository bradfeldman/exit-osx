import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { BuyerType, ApprovalStatus, DealStage } from '@prisma/client'

type RouteParams = Promise<{ dealId: string }>

// Human-readable buyer type labels
const _BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  [BuyerType.STRATEGIC]: 'Strategic',
  [BuyerType.FINANCIAL]: 'Financial',
  [BuyerType.INDIVIDUAL]: 'Individual',
  [BuyerType.MANAGEMENT]: 'Management',
  [BuyerType.ESOP]: 'ESOP',
  [BuyerType.OTHER]: 'Hybrid / Other',
}

// Group buyer types for simplified analysis
function getSimplifiedType(type: BuyerType): string {
  switch (type) {
    case BuyerType.STRATEGIC:
      return 'Strategic'
    case BuyerType.FINANCIAL:
      return 'Financial'
    default:
      return 'Hybrid / Other'
  }
}

// Exit stages
const EXIT_STAGES: DealStage[] = [
  DealStage.PASSED,
  DealStage.WITHDRAWN,
  DealStage.TERMINATED,
  DealStage.DECLINED,
  DealStage.IOI_DECLINED,
]

/**
 * GET /api/deals/[dealId]/analytics/buyer-mix
 * Get buyer type breakdown for a deal.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  // SECURITY FIX (PROD-060): Was completely unauthenticated — anyone could access deal analytics.
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  try {
    const { dealId } = await params

    // Get all buyers with their company type
    const buyers = await prisma.dealBuyer.findMany({
      where: {
        dealId,
        approvalStatus: ApprovalStatus.APPROVED,
      },
      select: {
        id: true,
        currentStage: true,
        canonicalCompany: {
          select: {
            companyType: true,
          },
        },
      },
    })

    const totalBuyers = buyers.length

    // Group by simplified type
    const typeGroups = new Map<string, { total: number; active: number }>()

    for (const buyer of buyers) {
      const type = getSimplifiedType(buyer.canonicalCompany.companyType)
      const existing = typeGroups.get(type) || { total: 0, active: 0 }
      existing.total++

      // Check if buyer is still active (not in exit stage)
      const isActive = !EXIT_STAGES.includes(buyer.currentStage)
      if (isActive) {
        existing.active++
      }

      typeGroups.set(type, existing)
    }

    // Convert to array and calculate percentages
    const mix = Array.from(typeGroups.entries())
      .map(([type, data]) => ({
        type,
        count: data.total,
        percentage: totalBuyers > 0 ? Math.round((data.total / totalBuyers) * 100) : 0,
        activeCount: data.active,
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      mix,
      totalBuyers,
    })
  } catch (error) {
    console.error('Error fetching buyer mix data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch buyer mix data' },
      { status: 500 }
    )
  }
}
