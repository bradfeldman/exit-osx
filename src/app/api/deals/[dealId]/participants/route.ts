import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { ParticipantSide, ParticipantRole } from '@prisma/client'

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
 * GET /api/deals/[dealId]/participants
 * List all participants for a deal with optional filtering.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  try {
    const url = new URL(request.url)
    const side = url.searchParams.get('side') as ParticipantSide | null
    const buyerId = url.searchParams.get('buyerId')
    const role = url.searchParams.get('role') as ParticipantRole | null
    const search = url.searchParams.get('search')

    // Verify deal exists
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { id: true },
    })
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Build where clause
    const where: Record<string, unknown> = { dealId, isActive: true }
    if (side) where.side = side
    if (buyerId) where.dealBuyerId = buyerId
    if (role) where.role = role
    if (search) {
      where.canonicalPerson = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    }

    const participants = await prisma.dealParticipant.findMany({
      where,
      include: {
        canonicalPerson: { select: PERSON_SELECT },
        dealBuyer: {
          select: {
            id: true,
            canonicalCompany: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { side: 'asc' }, { createdAt: 'asc' }],
    })

    // Count by side
    const counts = await prisma.dealParticipant.groupBy({
      by: ['side'],
      where: { dealId, isActive: true },
      _count: true,
    })

    const countMap = { BUYER: 0, SELLER: 0, NEUTRAL: 0 }
    for (const c of counts) {
      countMap[c.side] = c._count
    }

    return NextResponse.json({
      participants,
      total: participants.length,
      counts: countMap,
    })
  } catch (error) {
    console.error('Error fetching deal participants:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/deals/[dealId]/participants
 * Add a participant to a deal.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params
  const result = await checkPermission('COMPANY_UPDATE')
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const {
      canonicalPersonId,
      side = 'SELLER' as ParticipantSide,
      role = 'OTHER' as ParticipantRole,
      dealBuyerId = null,
      isPrimary = false,
    } = body

    if (!canonicalPersonId) {
      return NextResponse.json(
        { error: 'Canonical person ID is required' },
        { status: 400 }
      )
    }

    // Verify deal exists and is active
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { id: true, status: true },
    })
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }
    if (deal.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot add participants to a non-active deal' },
        { status: 400 }
      )
    }

    // Buyer-side requires dealBuyerId
    if (side === 'BUYER' && !dealBuyerId) {
      return NextResponse.json(
        { error: 'Buyer-side participants require a dealBuyerId' },
        { status: 400 }
      )
    }

    // Verify person exists
    const person = await prisma.canonicalPerson.findUnique({
      where: { id: canonicalPersonId },
      select: { id: true, firstName: true, lastName: true },
    })
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    // Verify buyer if provided
    if (dealBuyerId) {
      const buyer = await prisma.dealBuyer.findUnique({
        where: { id: dealBuyerId },
        select: { id: true, dealId: true },
      })
      if (!buyer || buyer.dealId !== dealId) {
        return NextResponse.json({ error: 'Buyer not found in this deal' }, { status: 404 })
      }
    }

    // Check for duplicate
    const existing = await prisma.dealParticipant.findUnique({
      where: {
        dealId_dealBuyerId_canonicalPersonId: {
          dealId,
          dealBuyerId: dealBuyerId || '',
          canonicalPersonId,
        },
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'This person is already a participant in this deal' },
        { status: 400 }
      )
    }

    const participant = await prisma.dealParticipant.create({
      data: {
        dealId,
        dealBuyerId: dealBuyerId || null,
        canonicalPersonId,
        side: side as ParticipantSide,
        role: role as ParticipantRole,
        isPrimary,
      },
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

    // Log activity
    await prisma.dealActivity2.create({
      data: {
        dealId,
        dealBuyerId: dealBuyerId || undefined,
        activityType: 'NOTE_ADDED',
        subject: `${person.firstName} ${person.lastName} added as ${side.toLowerCase()} participant`,
        performedByUserId: result.auth.user.id,
      },
    })

    return NextResponse.json({ participant }, { status: 201 })
  } catch (error) {
    console.error('Error adding deal participant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
