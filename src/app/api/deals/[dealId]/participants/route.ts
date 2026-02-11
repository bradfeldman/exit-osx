import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { ParticipantSide, ParticipantRole } from '@prisma/client'
import { inferCategoryFromSideRole, deriveSideRoleFromCategory } from '@/lib/contact-system/constants'

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
    const category = url.searchParams.get('category')
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
    if (category) where.category = category
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

    // Enrich with computed category for rows that don't have one
    const enriched = participants.map(p => ({
      ...p,
      category: p.category ?? inferCategoryFromSideRole(p.side, p.role),
      description: p.description ?? null,
    }))

    // If filtering by category client-side (for inferred categories)
    const filtered = category
      ? enriched.filter(p => p.category === category)
      : enriched

    // Count by side (legacy)
    const counts = await prisma.dealParticipant.groupBy({
      by: ['side'],
      where: { dealId, isActive: true },
      _count: true,
    })

    const countMap = { BUYER: 0, SELLER: 0, NEUTRAL: 0 }
    for (const c of counts) {
      countMap[c.side] = c._count
    }

    // Count by category (always count all participants, not just filtered)
    const categoryCounts: Record<string, number> = { PROSPECT: 0, MANAGEMENT: 0, ADVISOR: 0, OTHER: 0 }
    for (const p of enriched) {
      const cat = p.category ?? 'OTHER'
      if (categoryCounts[cat] !== undefined) {
        categoryCounts[cat]++
      }
    }

    return NextResponse.json({
      participants: filtered,
      total: filtered.length,
      counts: countMap,
      categoryCounts,
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
      category,
      description,
      notes,
      dealBuyerId = null,
      isPrimary = false,
    } = body

    // Accept explicit side/role or derive from category
    let side = body.side as ParticipantSide | undefined
    let role = body.role as ParticipantRole | undefined

    if (category && !side) {
      const derived = deriveSideRoleFromCategory(category)
      side = derived.side as ParticipantSide
      role = derived.role as ParticipantRole
    }

    if (!side) side = 'SELLER' as ParticipantSide
    if (!role) role = 'OTHER' as ParticipantRole

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
        category: category || null,
        description: description || null,
        notes: notes || null,
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
        subject: `${person.firstName} ${person.lastName} added as ${category ? category.toLowerCase() : side.toLowerCase()} participant`,
        performedByUserId: result.auth.user.id,
      },
    })

    return NextResponse.json({
      participant: {
        ...participant,
        category: participant.category ?? inferCategoryFromSideRole(participant.side, participant.role),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error adding deal participant:', error)
    // SECURITY FIX (PROD-060): Removed error.message from response to prevent leaking internal details
    return NextResponse.json({ error: 'Failed to add participant' }, { status: 500 })
  }
}
