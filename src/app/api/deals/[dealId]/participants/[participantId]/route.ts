import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { ParticipantSide, ParticipantRole } from '@prisma/client'
import { deriveSideRoleFromCategory, inferCategoryFromSideRole } from '@/lib/contact-system/constants'

const PERSON_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  currentTitle: true,
  linkedInUrl: true,
  currentCompany: {
    select: { id: true, name: true },
  },
} as const

/**
 * GET /api/deals/[dealId]/participants/[participantId]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ dealId: string; participantId: string }> }
) {
  const { dealId, participantId } = await params
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  try {
    const participant = await prisma.dealParticipant.findUnique({
      where: { id: participantId },
      include: {
        canonicalPerson: { select: PERSON_SELECT },
        dealBuyer: {
          select: {
            id: true,
            canonicalCompany: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!participant || participant.dealId !== dealId) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    return NextResponse.json({
      participant: {
        ...participant,
        category: participant.category ?? inferCategoryFromSideRole(participant.side, participant.role),
      },
    })
  } catch (error) {
    console.error('Error fetching participant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/deals/[dealId]/participants/[participantId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string; participantId: string }> }
) {
  const { dealId, participantId } = await params
  const result = await checkPermission('COMPANY_UPDATE')
  if (isAuthError(result)) return result.error

  try {
    const existing = await prisma.dealParticipant.findUnique({
      where: { id: participantId },
      select: { id: true, dealId: true },
    })
    if (!existing || existing.dealId !== dealId) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    const body = await request.json()
    const data: Record<string, unknown> = {}

    // Handle category change — re-derive side/role
    if (body.category !== undefined) {
      data.category = body.category
      const derived = deriveSideRoleFromCategory(body.category)
      data.side = derived.side as ParticipantSide
      data.role = derived.role as ParticipantRole
    }

    if (body.description !== undefined) data.description = body.description
    if (body.notes !== undefined) data.notes = body.notes
    if (body.role !== undefined) data.role = body.role as ParticipantRole
    if (body.side !== undefined) data.side = body.side as ParticipantSide
    if (body.isPrimary !== undefined) data.isPrimary = body.isPrimary
    if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.dealBuyerId !== undefined) data.dealBuyerId = body.dealBuyerId || null

    const participant = await prisma.dealParticipant.update({
      where: { id: participantId },
      data,
      include: {
        canonicalPerson: { select: PERSON_SELECT },
        dealBuyer: {
          select: {
            id: true,
            canonicalCompany: { select: { id: true, name: true } },
          },
        },
      },
    })

    // BF-014: Auto-add prospect's company to pipeline
    if (body.category === 'PROSPECT' && participant.canonicalPerson.currentCompany && !participant.dealBuyerId) {
      const companyId = participant.canonicalPerson.currentCompany.id
      const existingBuyer = await prisma.dealBuyer.findFirst({
        where: { dealId, canonicalCompanyId: companyId },
      })

      if (!existingBuyer) {
        const newBuyer = await prisma.dealBuyer.create({
          data: {
            dealId,
            canonicalCompanyId: companyId,
            currentStage: 'IDENTIFIED',
            createdByUserId: result.auth.user.id,
          },
        })

        // Link participant to the new buyer
        await prisma.dealParticipant.update({
          where: { id: participantId },
          data: { dealBuyerId: newBuyer.id },
        })

        // Log activity
        await prisma.dealActivity2.create({
          data: {
            dealId,
            dealBuyerId: newBuyer.id,
            activityType: 'NOTE_ADDED',
            subject: `${participant.canonicalPerson.currentCompany.name} auto-added to pipeline`,
            performedByUserId: result.auth.user.id,
          },
        })
      } else if (!participant.dealBuyerId) {
        // Company already in pipeline, just link the participant
        await prisma.dealParticipant.update({
          where: { id: participantId },
          data: { dealBuyerId: existingBuyer.id },
        })
      }
    }

    return NextResponse.json({
      participant: {
        ...participant,
        category: participant.category ?? inferCategoryFromSideRole(participant.side, participant.role),
      },
    })
  } catch (error) {
    console.error('Error updating participant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/deals/[dealId]/participants/[participantId]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ dealId: string; participantId: string }> }
) {
  const { dealId, participantId } = await params
  const result = await checkPermission('COMPANY_UPDATE')
  if (isAuthError(result)) return result.error

  try {
    const existing = await prisma.dealParticipant.findUnique({
      where: { id: participantId },
      include: {
        canonicalPerson: { select: { firstName: true, lastName: true } },
      },
    })
    if (!existing || existing.dealId !== dealId) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    await prisma.dealParticipant.delete({ where: { id: participantId } })

    // Log activity
    await prisma.dealActivity2.create({
      data: {
        dealId,
        dealBuyerId: existing.dealBuyerId || undefined,
        activityType: 'NOTE_ADDED',
        subject: `${existing.canonicalPerson.firstName} ${existing.canonicalPerson.lastName} removed as participant`,
        performedByUserId: result.auth.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting participant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
