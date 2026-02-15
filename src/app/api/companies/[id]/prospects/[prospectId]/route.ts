import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { BuyerType, ProspectApprovalStatus } from '@prisma/client'

/**
 * GET /api/companies/[id]/prospects/[prospectId]
 * Get a single buyer prospect
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prospectId: string }> }
) {
  const { id: companyId, prospectId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const prospect = await prisma.buyerProspect.findFirst({
      where: {
        id: prospectId,
        companyId,
      },
      include: {
        buyers: {
          select: {
            id: true,
            name: true,
            currentStage: true,
            stageUpdatedAt: true,
          },
        },
        importBatch: {
          select: {
            id: true,
            filename: true,
            createdAt: true,
          },
        },
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    return NextResponse.json({ prospect })
  } catch (error) {
    console.error('Error fetching prospect:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/companies/[id]/prospects/[prospectId]
 * Update a buyer prospect
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prospectId: string }> }
) {
  const { id: companyId, prospectId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const {
      name,
      buyerType,
      relevanceDescription,
      website,
      headquartersLocation,
      notes,
      approvalStatus,
      denialReason,
    } = body

    // Verify prospect exists and belongs to company
    const existing = await prisma.buyerProspect.findFirst({
      where: { id: prospectId, companyId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      updateData.name = name.trim()
      // Check for duplicate name
      const duplicate = await prisma.buyerProspect.findFirst({
        where: {
          companyId,
          name: name.trim(),
          id: { not: prospectId },
        },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'A prospect with this name already exists' },
          { status: 400 }
        )
      }
    }

    if (buyerType !== undefined) {
      const validTypes: BuyerType[] = ['STRATEGIC', 'FINANCIAL', 'OTHER']
      if (!validTypes.includes(buyerType)) {
        return NextResponse.json(
          { error: 'Invalid buyer type' },
          { status: 400 }
        )
      }
      updateData.buyerType = buyerType
    }

    if (relevanceDescription !== undefined) {
      updateData.relevanceDescription = relevanceDescription?.trim() || null
    }

    if (website !== undefined) {
      updateData.website = website?.trim() || null
      // Update domain
      if (website) {
        try {
          const url = new URL(website.startsWith('http') ? website : `https://${website}`)
          updateData.domain = url.hostname.toLowerCase().replace(/^www\./, '')
        } catch {
          updateData.domain = null
        }
      } else {
        updateData.domain = null
      }
    }

    if (headquartersLocation !== undefined) {
      updateData.headquartersLocation = headquartersLocation?.trim() || null
    }

    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null
    }

    // Handle approval status change
    if (approvalStatus !== undefined) {
      const validStatuses: ProspectApprovalStatus[] = ['APPROVED', 'DENIED', 'UNDECIDED']
      if (!validStatuses.includes(approvalStatus)) {
        return NextResponse.json(
          { error: 'Invalid approval status' },
          { status: 400 }
        )
      }

      // Only update status tracking if status actually changed
      if (approvalStatus !== existing.approvalStatus) {
        updateData.approvalStatus = approvalStatus
        updateData.statusChangedAt = new Date()
        updateData.statusChangedBy = result.auth.user.id
      }
    }

    if (denialReason !== undefined) {
      updateData.denialReason = denialReason?.trim() || null
    }

    const prospect = await prisma.buyerProspect.update({
      where: { id: prospectId },
      data: updateData,
      include: {
        buyers: {
          select: { id: true, name: true, currentStage: true },
        },
      },
    })

    return NextResponse.json({ prospect })
  } catch (error) {
    console.error('Error updating prospect:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/companies/[id]/prospects/[prospectId]
 * Delete a buyer prospect
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prospectId: string }> }
) {
  const { id: companyId, prospectId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    // Verify prospect exists and belongs to company
    const existing = await prisma.buyerProspect.findFirst({
      where: { id: prospectId, companyId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    await prisma.buyerProspect.delete({
      where: { id: prospectId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting prospect:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
