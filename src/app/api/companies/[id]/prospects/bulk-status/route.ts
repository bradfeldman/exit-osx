import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { ProspectApprovalStatus } from '@prisma/client'

/**
 * PATCH /api/companies/[id]/prospects/bulk-status
 * Bulk update approval status for multiple prospects
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { prospectIds, approvalStatus, denialReason } = body

    if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json(
        { error: 'prospectIds array is required' },
        { status: 400 }
      )
    }

    if (!approvalStatus) {
      return NextResponse.json(
        { error: 'approvalStatus is required' },
        { status: 400 }
      )
    }

    const validStatuses: ProspectApprovalStatus[] = ['APPROVED', 'DENIED', 'UNDECIDED']
    if (!validStatuses.includes(approvalStatus)) {
      return NextResponse.json(
        { error: 'Invalid approval status. Must be APPROVED, DENIED, or UNDECIDED' },
        { status: 400 }
      )
    }

    // Verify all prospects belong to this company
    const prospects = await prisma.buyerProspect.findMany({
      where: {
        id: { in: prospectIds },
        companyId,
      },
      select: { id: true, approvalStatus: true },
    })

    if (prospects.length !== prospectIds.length) {
      return NextResponse.json(
        { error: 'Some prospects not found or do not belong to this company' },
        { status: 400 }
      )
    }

    // Only update prospects whose status is actually changing
    const idsToUpdate = prospects
      .filter((p) => p.approvalStatus !== approvalStatus)
      .map((p) => p.id)

    if (idsToUpdate.length === 0) {
      return NextResponse.json({ updated: 0 })
    }

    const updateData: Record<string, unknown> = {
      approvalStatus,
      statusChangedAt: new Date(),
      statusChangedBy: result.auth.user.id,
    }

    // Add denial reason if denying
    if (approvalStatus === 'DENIED' && denialReason) {
      updateData.denialReason = denialReason.trim()
    }

    // Clear denial reason if not denying
    if (approvalStatus !== 'DENIED') {
      updateData.denialReason = null
    }

    const updated = await prisma.buyerProspect.updateMany({
      where: {
        id: { in: idsToUpdate },
        companyId,
      },
      data: updateData,
    })

    return NextResponse.json({ updated: updated.count })
  } catch (error) {
    console.error('Error bulk updating prospects:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
