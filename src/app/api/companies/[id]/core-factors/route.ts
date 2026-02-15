import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'
import type { Prisma } from '@prisma/client'

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
    console.error('Error fetching core factors:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch core factors' },
      { status: 500 }
    )
  }
}

const coreFactorsUpdateSchema = z.object({
  revenueSizeCategory: z.enum(['UNDER_500K', 'FROM_500K_TO_1M', 'FROM_1M_TO_3M', 'FROM_3M_TO_10M', 'FROM_10M_TO_25M', 'OVER_25M']).optional(),
  revenueModel: z.enum(['PROJECT_BASED', 'TRANSACTIONAL', 'RECURRING_CONTRACTS', 'SUBSCRIPTION_SAAS']).optional(),
  grossMarginProxy: z.enum(['LOW', 'MODERATE', 'GOOD', 'EXCELLENT']).optional(),
  laborIntensity: z.enum(['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']).optional(),
  assetIntensity: z.enum(['ASSET_LIGHT', 'MODERATE', 'ASSET_HEAVY']).optional(),
  ownerInvolvement: z.enum(['MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional(),
})

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

  const validation = await validateRequestBody(request, coreFactorsUpdateSchema)
  if (!validation.success) return validation.error

  const {
    revenueSizeCategory,
    revenueModel,
    grossMarginProxy,
    laborIntensity,
    assetIntensity,
    ownerInvolvement
  } = validation.data

  try {

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

    // Check if core factors already exist
    const existingFactors = await prisma.coreFactors.findUnique({
      where: { companyId }
    })

    let coreFactors
    if (existingFactors) {
      // Update existing record with provided fields
      const updateData: Prisma.CoreFactorsUpdateInput = {}
      if (revenueSizeCategory) updateData.revenueSizeCategory = revenueSizeCategory
      if (revenueModel) updateData.revenueModel = revenueModel
      if (grossMarginProxy) updateData.grossMarginProxy = grossMarginProxy
      if (laborIntensity) updateData.laborIntensity = laborIntensity
      if (assetIntensity) updateData.assetIntensity = assetIntensity
      if (ownerInvolvement) updateData.ownerInvolvement = ownerInvolvement

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
    console.error('Error updating core factors:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update core factors' },
      { status: 500 }
    )
  }
}
