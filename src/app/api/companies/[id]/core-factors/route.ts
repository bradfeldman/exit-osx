import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'

export async function GET(
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
    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: {
              where: { user: { authId: user.id } }
            }
          }
        },
        coreFactors: true
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ coreFactors: company.coreFactors })
  } catch (error) {
    console.error('Error fetching core factors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch core factors' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const body = await request.json()
    const {
      revenueSizeCategory,
      revenueModel,
      grossMarginProxy,
      laborIntensity,
      assetIntensity,
      ownerInvolvement
    } = body

    // Verify user has access and get database user ID
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: {
              where: {
                user: { authId: user.id }
              },
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

    // Build update object with only defined values
    const updateData: Record<string, string> = {}
    if (revenueSizeCategory) updateData.revenueSizeCategory = revenueSizeCategory
    if (revenueModel) updateData.revenueModel = revenueModel
    if (grossMarginProxy) updateData.grossMarginProxy = grossMarginProxy
    if (laborIntensity) updateData.laborIntensity = laborIntensity
    if (assetIntensity) updateData.assetIntensity = assetIntensity
    if (ownerInvolvement) updateData.ownerInvolvement = ownerInvolvement

    // Check if core factors already exist
    const existingFactors = await prisma.coreFactors.findUnique({
      where: { companyId }
    })

    let coreFactors
    if (existingFactors) {
      // Update existing record with provided fields
      coreFactors = await prisma.coreFactors.update({
        where: { companyId },
        data: updateData
      })
    } else {
      // Create new record - requires core onboarding fields (grossMarginProxy is set later in Baseline Assessment)
      if (!revenueSizeCategory || !revenueModel || !laborIntensity || !assetIntensity || !ownerInvolvement) {
        return NextResponse.json(
          { error: 'Core factor fields are required for initial setup' },
          { status: 400 }
        )
      }
      coreFactors = await prisma.coreFactors.create({
        data: {
          companyId,
          revenueSizeCategory,
          revenueModel,
          grossMarginProxy: grossMarginProxy || 'MODERATE', // Default until set in Baseline Assessment
          laborIntensity,
          assetIntensity,
          ownerInvolvement
        }
      })
    }

    // Recalculate snapshot with updated core score
    const snapshotResult = await recalculateSnapshotForCompany(
      companyId,
      'Core factors updated',
      dbUserId
    )

    return NextResponse.json({
      coreFactors,
      snapshotUpdated: snapshotResult.success,
      snapshotId: snapshotResult.snapshotId,
    })
  } catch (error) {
    console.error('Error updating core factors:', error)
    return NextResponse.json(
      { error: 'Failed to update core factors' },
      { status: 500 }
    )
  }
}
