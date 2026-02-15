import { NextRequest, NextResponse } from 'next/server'
import { authorizeDealAccess } from '@/lib/deal-tracker/deal-auth'
import { prisma } from '@/lib/prisma'
import { BuyerContactRole } from '@prisma/client'
import { syncVDRAccessForBuyer } from '@/lib/contact-system/stage-service'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const postSchema = z.object({
  canonicalPersonId: z.string().uuid(),
  role: z.enum(['DEAL_LEAD', 'ADVISOR', 'LEGAL', 'FINANCIAL', 'OPERATIONS', 'OTHER'] as const satisfies readonly BuyerContactRole[]).default('DEAL_LEAD'),
  isPrimary: z.boolean().default(false),
})

/**
 * GET /api/deals/[dealId]/buyers/[buyerId]/contacts
 * Get all contacts for a buyer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string; buyerId: string }> }
) {
  const { dealId, buyerId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_VIEW')
  if (authResult instanceof NextResponse) return authResult

  try {
    // Verify buyer exists and belongs to deal
    const buyer = await prisma.dealBuyer.findUnique({
      where: { id: buyerId },
      select: { id: true, dealId: true },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    if (buyer.dealId !== dealId) {
      return NextResponse.json({ error: 'Buyer not found in this deal' }, { status: 404 })
    }

    const contacts = await prisma.dealContact.findMany({
      where: { dealBuyerId: buyerId },
      include: {
        canonicalPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            currentTitle: true,
            linkedInUrl: true,
            currentCompanyId: true,
          },
        },
        dataRoomAccess: {
          select: {
            id: true,
            accessLevel: true,
            maxStage: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({
      contacts,
      totalCount: contacts.length,
      primaryContact: contacts.find((c) => c.isPrimary),
    })
  } catch (error) {
    console.error('Error fetching buyer contacts:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/deals/[dealId]/buyers/[buyerId]/contacts
 * Add a contact to a buyer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string; buyerId: string }> }
) {
  const { dealId, buyerId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_UPDATE')
  if (authResult instanceof NextResponse) return authResult
  const { auth } = authResult

  try {
    // Verify buyer exists and belongs to deal
    const buyer = await prisma.dealBuyer.findUnique({
      where: { id: buyerId },
      include: {
        deal: { select: { status: true } },
        contacts: { select: { isPrimary: true } },
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    if (buyer.dealId !== dealId) {
      return NextResponse.json({ error: 'Buyer not found in this deal' }, { status: 404 })
    }

    if (buyer.deal.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot add contacts to a buyer on a non-active deal' },
        { status: 400 }
      )
    }

    const validation = await validateRequestBody(request, postSchema)
    if (!validation.success) return validation.error
    const {
      canonicalPersonId,
      role,
      isPrimary,
    } = validation.data

    // Verify canonical person exists
    const person = await prisma.canonicalPerson.findUnique({
      where: { id: canonicalPersonId },
    })

    if (!person) {
      return NextResponse.json(
        { error: 'Canonical person not found' },
        { status: 404 }
      )
    }

    // Check for duplicate
    const existing = await prisma.dealContact.findUnique({
      where: {
        dealBuyerId_canonicalPersonId: { dealBuyerId: buyerId, canonicalPersonId },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This contact is already associated with this buyer' },
        { status: 400 }
      )
    }

    // If setting as primary, unset other primaries
    if (isPrimary && buyer.contacts.some((c) => c.isPrimary)) {
      await prisma.dealContact.updateMany({
        where: { dealBuyerId: buyerId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    // Create contact
    const contact = await prisma.dealContact.create({
      data: {
        dealBuyerId: buyerId,
        canonicalPersonId,
        role,
        isPrimary: isPrimary || buyer.contacts.length === 0, // First contact is primary
      },
      include: {
        canonicalPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            currentTitle: true,
          },
        },
      },
    })

    // Sync VDR access for the buyer (will grant access to new contact based on stage)
    await syncVDRAccessForBuyer(buyerId, buyer.currentStage, auth.user.id)

    // Log activity
    await prisma.dealActivity2.create({
      data: {
        dealId,
        dealBuyerId: buyerId,
        activityType: 'NOTE_ADDED',
        subject: `Contact ${person.firstName} ${person.lastName} added`,
        performedByUserId: auth.user.id,
      },
    })

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error('Error adding buyer contact:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
