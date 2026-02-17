import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params

  try {
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error

    // Verify buyer belongs to an active deal for this company
    const buyer = await prisma.dealBuyer.findFirst({
      where: {
        id: buyerId,
        deal: { companyId, status: 'ACTIVE' },
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const participants = await prisma.dealParticipant.findMany({
      where: {
        dealBuyerId: buyerId,
        isActive: true,
      },
      include: {
        canonicalPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currentTitle: true,
            email: true,
          },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({
      participants: participants.map(p => ({
        id: p.id,
        canonicalPersonId: p.canonicalPerson.id,
        firstName: p.canonicalPerson.firstName,
        lastName: p.canonicalPerson.lastName,
        currentTitle: p.canonicalPerson.currentTitle,
        email: p.canonicalPerson.email,
        isPrimary: p.isPrimary,
        role: p.role,
        category: p.category,
      })),
    })
  } catch (error) {
    console.error('Error fetching buyer participants:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    )
  }
}

const patchSchema = z.object({
  participantId: z.string(),
  isPrimary: z.boolean(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params

  try {
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error

    const validation = await validateRequestBody(request, patchSchema)
    if (!validation.success) return validation.error
    const { participantId, isPrimary } = validation.data

    // Verify buyer belongs to an active deal for this company
    const buyer = await prisma.dealBuyer.findFirst({
      where: {
        id: buyerId,
        deal: { companyId, status: 'ACTIVE' },
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    if (isPrimary) {
      // Unset all other participants as primary for this buyer
      await prisma.dealParticipant.updateMany({
        where: {
          dealBuyerId: buyerId,
          id: { not: participantId },
        },
        data: { isPrimary: false },
      })
    }

    await prisma.dealParticipant.update({
      where: { id: participantId },
      data: { isPrimary },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating participant:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update participant' },
      { status: 500 }
    )
  }
}
