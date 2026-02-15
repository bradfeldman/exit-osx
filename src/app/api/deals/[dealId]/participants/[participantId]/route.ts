import { NextRequest, NextResponse } from 'next/server'
import { authorizeDealAccess } from '@/lib/deal-tracker/deal-auth'
import { prisma } from '@/lib/prisma'
import { ParticipantSide, ParticipantRole } from '@prisma/client'
import { deriveSideRoleFromCategory, inferCategoryFromSideRole } from '@/lib/contact-system/constants'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const patchSchema = z.object({
  category: z.enum(['PROSPECT', 'MANAGEMENT', 'ADVISOR', 'OTHER']).optional(),
  description: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  role: z.enum(['DEAL_LEAD', 'DECISION_MAKER', 'ADVISOR', 'LEGAL', 'FINANCE', 'OPERATIONS', 'OTHER']).optional(),
  side: z.enum(['BUYER', 'SELLER', 'NEUTRAL']).optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  dealBuyerId: z.string().uuid().nullable().optional(),
})

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
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_VIEW')
  if (authResult instanceof NextResponse) return authResult

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
    console.error('Error fetching participant:', error instanceof Error ? error.message : String(error))
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
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_UPDATE')
  if (authResult instanceof NextResponse) return authResult
  const { auth } = authResult

  try {
    const existing = await prisma.dealParticipant.findUnique({
      where: { id: participantId },
      select: { id: true, dealId: true },
    })
    if (!existing || existing.dealId !== dealId) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    const validation = await validateRequestBody(request, patchSchema)
    if (!validation.success) return validation.error
    const body = validation.data

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
            createdByUserId: auth.user.id,
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
            performedByUserId: auth.user.id,
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
    console.error('Error updating participant:', error instanceof Error ? error.message : String(error))
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
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_UPDATE')
  if (authResult instanceof NextResponse) return authResult
  const { auth } = authResult

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
        performedByUserId: auth.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting participant:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
