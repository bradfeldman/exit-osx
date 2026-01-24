import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { DealStage, BuyerType, BuyerTier } from '@prisma/client'
import { ACTIVITY_TYPES } from '@/lib/deal-tracker/constants'

/**
 * GET /api/companies/[id]/deal-tracker
 * Get deal tracker overview with all prospective buyers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage') as DealStage | null
    const type = searchParams.get('type') as BuyerType | null
    const tier = searchParams.get('tier') as BuyerTier | null
    const search = searchParams.get('search')

    // Build filter
    const where: Record<string, unknown> = { companyId }
    if (stage) where.currentStage = stage
    if (type) where.buyerType = type
    if (tier) where.tier = tier
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ]
    }

    const buyers = await prisma.prospectiveBuyer.findMany({
      where,
      include: {
        contacts: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        prospect: {
          select: {
            id: true,
            name: true,
            approvalStatus: true,
            relevanceDescription: true,
          },
        },
        _count: {
          select: {
            documents: true,
            meetings: true,
            activities: true,
          },
        },
      },
      orderBy: [
        { stageUpdatedAt: 'desc' },
      ],
    })

    // Get stage counts for filter
    const stageCounts = await prisma.prospectiveBuyer.groupBy({
      by: ['currentStage'],
      where: { companyId },
      _count: true,
    })

    return NextResponse.json({
      buyers,
      stageCounts: Object.fromEntries(
        stageCounts.map(s => [s.currentStage, s._count])
      ),
    })
  } catch (error) {
    console.error('Error fetching deal tracker:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/companies/[id]/deal-tracker
 * Create a new prospective buyer (must be linked to an approved prospect)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const {
      prospectId,
      name,
      buyerType,
      tier = 'B_TIER',
      website,
      description,
      industry,
      location,
      internalNotes,
      tags = [],
      contacts = [],
    } = body

    // Prospect linking is required
    if (!prospectId) {
      return NextResponse.json(
        { error: 'prospectId is required. Buyers must be linked to an approved prospect.' },
        { status: 400 }
      )
    }

    // Verify prospect exists, belongs to company, and is approved
    const prospect = await prisma.buyerProspect.findFirst({
      where: {
        id: prospectId,
        companyId,
      },
    })

    if (!prospect) {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      )
    }

    if (prospect.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        {
          error: 'Prospect must be approved before adding to deal tracker',
          approvalStatus: prospect.approvalStatus,
        },
        { status: 400 }
      )
    }

    // Check if prospect is already linked to a buyer
    const existingBuyer = await prisma.prospectiveBuyer.findFirst({
      where: { prospectId },
    })

    if (existingBuyer) {
      return NextResponse.json(
        { error: 'This prospect is already linked to a buyer in the deal tracker' },
        { status: 400 }
      )
    }

    // Use prospect data as defaults
    const buyerName = name || prospect.name
    const buyerWebsite = website || prospect.website
    const buyerDescription = description || prospect.relevanceDescription
    const buyerLocation = location || prospect.headquartersLocation
    const buyerBuyerType = buyerType || prospect.buyerType

    // Check for duplicate name
    const existing = await prisma.prospectiveBuyer.findUnique({
      where: {
        companyId_name: { companyId, name: buyerName },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A buyer with this name already exists' },
        { status: 400 }
      )
    }

    // Create buyer with contacts, linked to prospect
    const buyer = await prisma.prospectiveBuyer.create({
      data: {
        companyId,
        prospectId, // Link to the prospect
        name: buyerName,
        buyerType: buyerBuyerType as BuyerType,
        tier: tier as BuyerTier,
        website: buyerWebsite,
        description: buyerDescription,
        industry,
        location: buyerLocation,
        internalNotes,
        tags,
        createdById: result.auth.user.id,
        contacts: {
          create: contacts.map((contact: {
            email: string
            firstName: string
            lastName: string
            title?: string
            phone?: string
            role?: string
            isPrimary?: boolean
          }, index: number) => ({
            email: contact.email.toLowerCase(),
            firstName: contact.firstName,
            lastName: contact.lastName,
            title: contact.title,
            phone: contact.phone,
            role: contact.role || 'DEAL_LEAD',
            isPrimary: index === 0 || contact.isPrimary || false,
          })),
        },
      },
      include: {
        contacts: true,
        prospect: true,
      },
    })

    // Create initial stage history entry
    await prisma.dealStageHistory.create({
      data: {
        buyerId: buyer.id,
        fromStage: null,
        toStage: DealStage.IDENTIFIED,
        changedById: result.auth.user.id,
      },
    })

    // Log activity
    await prisma.dealActivity.create({
      data: {
        buyerId: buyer.id,
        activityType: ACTIVITY_TYPES.STAGE_CHANGED,
        description: `Buyer created and set to Identified`,
        metadata: {
          toStage: DealStage.IDENTIFIED,
          contactsAdded: contacts.length,
        },
        performedById: result.auth.user.id,
      },
    })

    return NextResponse.json({ buyer }, { status: 201 })
  } catch (error) {
    console.error('Error creating buyer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
