import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeDealAccess } from '@/lib/deal-tracker/deal-auth'
import { BuyerContactRole } from '@prisma/client'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

type RouteParams = Promise<{ dealId: string; buyerId: string; contactId: string }>

const putSchema = z.object({
  role: z.enum(['PRIMARY', 'DECISION_MAKER', 'DEAL_LEAD', 'DILIGENCE', 'LEGAL', 'FINANCE', 'OPERATIONS'] as const satisfies readonly BuyerContactRole[]).optional(),
  isPrimary: z.boolean().optional(),
})

/**
 * GET /api/deals/[dealId]/buyers/[buyerId]/contacts/[contactId]
 * Get a single contact
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { dealId, buyerId, contactId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_VIEW')
  if (authResult instanceof NextResponse) return authResult

  try {

    const contact = await prisma.dealContact.findUnique({
      where: { id: contactId },
      include: {
        canonicalPerson: {
          include: {
            currentCompany: true
          }
        },
        dataRoomAccess: true,
        dealBuyer: true
      }
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Verify contact belongs to the specified buyer and deal
    if (contact.dealBuyer.id !== buyerId || contact.dealBuyer.dealId !== dealId) {
      return NextResponse.json(
        { error: 'Contact does not belong to this buyer or deal' },
        { status: 400 }
      )
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error fetching contact:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/deals/[dealId]/buyers/[buyerId]/contacts/[contactId]
 * Update a contact's role or primary status
 *
 * Body:
 * - role?: BuyerContactRole
 * - isPrimary?: boolean
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { dealId, buyerId, contactId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_UPDATE')
  if (authResult instanceof NextResponse) return authResult

  try {
    const validation = await validateRequestBody(request, putSchema)
    if (!validation.success) return validation.error
    const { role, isPrimary } = validation.data

    // Verify contact exists and belongs to the buyer
    const existingContact = await prisma.dealContact.findUnique({
      where: { id: contactId },
      include: {
        dealBuyer: true
      }
    })

    if (!existingContact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    if (existingContact.dealBuyer.id !== buyerId || existingContact.dealBuyer.dealId !== dealId) {
      return NextResponse.json(
        { error: 'Contact does not belong to this buyer or deal' },
        { status: 400 }
      )
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    if (role !== undefined) updateData.role = role
    if (isPrimary !== undefined) updateData.isPrimary = isPrimary

    // If setting as primary, unset other primaries first
    if (isPrimary === true) {
      await prisma.dealContact.updateMany({
        where: {
          dealBuyerId: buyerId,
          id: { not: contactId },
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      })
    }

    // Update contact
    const updatedContact = await prisma.dealContact.update({
      where: { id: contactId },
      data: updateData,
      include: {
        canonicalPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ contact: updatedContact })
  } catch (error) {
    console.error('Error updating contact:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/deals/[dealId]/buyers/[buyerId]/contacts/[contactId]
 * Remove a contact from a buyer
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { dealId, buyerId, contactId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_UPDATE')
  if (authResult instanceof NextResponse) return authResult

  try {

    // Verify contact exists and belongs to the buyer
    const existingContact = await prisma.dealContact.findUnique({
      where: { id: contactId },
      include: {
        dealBuyer: true
      }
    })

    if (!existingContact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    if (existingContact.dealBuyer.id !== buyerId || existingContact.dealBuyer.dealId !== dealId) {
      return NextResponse.json(
        { error: 'Contact does not belong to this buyer or deal' },
        { status: 400 }
      )
    }

    // Delete the contact
    await prisma.dealContact.delete({
      where: { id: contactId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
}
