import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { BuyerContactRole } from '@prisma/client'
import {
  grantContactVDRAccess,
  revokeContactVDRAccess,
  getVDRAccessConfig,
} from '@/lib/deal-tracker/vdr-sync'
import { ACTIVITY_TYPES } from '@/lib/deal-tracker/constants'

/**
 * GET /api/companies/[id]/deal-tracker/buyers/[buyerId]/contacts
 * Get all contacts for a buyer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    // Verify buyer belongs to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const contacts = await prisma.buyerContact.findMany({
      where: { buyerId },
      include: {
        dataRoomAccess: {
          select: {
            id: true,
            maxStage: true,
            accessLevel: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error('Error fetching contacts:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/companies/[id]/deal-tracker/buyers/[buyerId]/contacts
 * Add a contact to a buyer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const {
      email,
      firstName,
      lastName,
      title,
      phone,
      role = 'DEAL_LEAD',
      isPrimary = false,
      grantVDRAccess = true,
    } = body

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      )
    }

    // Verify buyer belongs to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    // Check for duplicate email
    const existing = await prisma.buyerContact.findUnique({
      where: {
        buyerId_email: {
          buyerId,
          email: email.toLowerCase(),
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A contact with this email already exists for this buyer' },
        { status: 400 }
      )
    }

    // If setting as primary, unset other primaries
    if (isPrimary) {
      await prisma.buyerContact.updateMany({
        where: { buyerId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    // Create contact
    const contact = await prisma.buyerContact.create({
      data: {
        buyerId,
        email: email.toLowerCase(),
        firstName,
        lastName,
        title,
        phone,
        role: role as BuyerContactRole,
        isPrimary,
      },
    })

    // Grant VDR access if buyer stage qualifies and flag is set
    if (grantVDRAccess) {
      const accessConfig = getVDRAccessConfig(buyer.currentStage)
      if (accessConfig.shouldHaveAccess) {
        try {
          await grantContactVDRAccess(contact.id, result.auth.user.id)
        } catch (e) {
          // Log but don't fail the contact creation
          console.error('Failed to grant VDR access:', e)
        }
      }
    }

    // Log activity
    await prisma.dealActivity.create({
      data: {
        buyerId,
        activityType: ACTIVITY_TYPES.CONTACT_ADDED,
        description: `Added contact: ${firstName} ${lastName}`,
        metadata: {
          contactId: contact.id,
          email,
          role,
          isPrimary,
        },
        performedById: result.auth.user.id,
      },
    })

    // Fetch contact with relations
    const contactWithAccess = await prisma.buyerContact.findUnique({
      where: { id: contact.id },
      include: {
        dataRoomAccess: {
          select: {
            id: true,
            maxStage: true,
            accessLevel: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json({ contact: contactWithAccess }, { status: 201 })
  } catch (error) {
    console.error('Error adding contact:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/companies/[id]/deal-tracker/buyers/[buyerId]/contacts
 * Update a contact
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const {
      contactId,
      email,
      firstName,
      lastName,
      title,
      phone,
      role,
      isPrimary,
      isActive,
    } = body

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }

    // Verify buyer and contact belong to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const contact = await prisma.buyerContact.findFirst({
      where: { id: contactId, buyerId },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (email !== undefined) updateData.email = email.toLowerCase()
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (title !== undefined) updateData.title = title
    if (phone !== undefined) updateData.phone = phone
    if (role !== undefined) updateData.role = role as BuyerContactRole
    if (isActive !== undefined) updateData.isActive = isActive

    // Handle primary flag
    if (isPrimary === true && !contact.isPrimary) {
      // Unset other primaries first
      await prisma.buyerContact.updateMany({
        where: { buyerId, isPrimary: true },
        data: { isPrimary: false },
      })
      updateData.isPrimary = true
    } else if (isPrimary === false) {
      updateData.isPrimary = false
    }

    // If deactivating, revoke VDR access
    if (isActive === false && contact.isActive && contact.dataRoomAccessId) {
      await revokeContactVDRAccess(contactId, result.auth.user.id)
    }

    const updatedContact = await prisma.buyerContact.update({
      where: { id: contactId },
      data: updateData,
      include: {
        dataRoomAccess: {
          select: {
            id: true,
            maxStage: true,
            accessLevel: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json({ contact: updatedContact })
  } catch (error) {
    console.error('Error updating contact:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/companies/[id]/deal-tracker/buyers/[buyerId]/contacts
 * Delete a contact
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId')

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }

    // Verify buyer and contact belong to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const contact = await prisma.buyerContact.findFirst({
      where: { id: contactId, buyerId },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Revoke VDR access first
    if (contact.dataRoomAccessId) {
      await revokeContactVDRAccess(contactId, result.auth.user.id)
    }

    // Delete contact
    await prisma.buyerContact.delete({
      where: { id: contactId },
    })

    // Log activity
    await prisma.dealActivity.create({
      data: {
        buyerId,
        activityType: ACTIVITY_TYPES.CONTACT_REMOVED,
        description: `Removed contact: ${contact.firstName} ${contact.lastName}`,
        metadata: {
          contactId,
          email: contact.email,
        },
        performedById: result.auth.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
