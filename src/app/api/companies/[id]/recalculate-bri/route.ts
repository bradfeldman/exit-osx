import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify user has access and get database user ID
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: {
              where: { user: { authId: user.id } },
              include: {
                user: { select: { id: true } }
              }
            }
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const dbUserId = company.workspace.members[0].user.id

    // Recalculate snapshot with current BRI scores
    const result = await recalculateSnapshotForCompany(
      companyId,
      'Category assessment updated',
      dbUserId
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to recalculate' },
        { status: 500 }
      )
    }

    // Get the new snapshot to return updated scores
    const snapshot = await prisma.valuationSnapshot.findUnique({
      where: { id: result.snapshotId },
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
      snapshotId: result.snapshotId,
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
    console.error('Error recalculating BRI:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate BRI' },
      { status: 500 }
    )
  }
}
