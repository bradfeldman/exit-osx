import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { DealStage, ApprovalStatus } from '@prisma/client'
import { PAGINATION } from '@/lib/contact-system/constants'

/**
 * GET /api/deals/[dealId]/buyers
 * Get all buyers for a deal with filtering and pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  try {
    // Verify deal exists
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage') as DealStage | 'all' | null
    const approvalStatus = searchParams.get('approvalStatus') as ApprovalStatus | 'all' | null
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || String(PAGINATION.DEFAULT_PAGE))
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT)),
      PAGINATION.MAX_LIMIT
    )

    // Build filter
    const where: Record<string, unknown> = { dealId }

    if (stage && stage !== 'all') {
      where.currentStage = stage
    }

    if (approvalStatus && approvalStatus !== 'all') {
      where.approvalStatus = approvalStatus
    }

    if (search) {
      where.canonicalCompany = {
        name: { contains: search, mode: 'insensitive' },
      }
    }

    const [buyers, total] = await Promise.all([
      prisma.dealBuyer.findMany({
        where,
        include: {
          canonicalCompany: {
            select: {
              id: true,
              name: true,
              companyType: true,
              website: true,
              linkedInUrl: true,
            },
          },
          contacts: {
            where: { isActive: true },
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
            orderBy: { isPrimary: 'desc' },
          },
          _count: {
            select: {
              activities: true,
              stageHistory: true,
              contacts: true,
            },
          },
        },
        orderBy: [
          { currentStage: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dealBuyer.count({ where }),
    ])

    // Get stage distribution for this deal
    const stageDistribution = await prisma.dealBuyer.groupBy({
      by: ['currentStage'],
      where: { dealId },
      _count: true,
    })

    // Get approval distribution
    const approvalDistribution = await prisma.dealBuyer.groupBy({
      by: ['approvalStatus'],
      where: { dealId },
      _count: true,
    })

    return NextResponse.json({
      buyers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      analytics: {
        stageDistribution,
        approvalDistribution,
      },
    })
  } catch (error) {
    console.error('Error fetching deal buyers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/deals/[dealId]/buyers
 * Add a buyer to a deal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params
  const result = await checkPermission('COMPANY_UPDATE')
  if (isAuthError(result)) return result.error

  try {
    // Verify deal exists and is active
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    if (deal.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot add buyers to a non-active deal' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      canonicalCompanyId,
      initialStage = DealStage.IDENTIFIED,
      notes,
      requireSellerApproval,
    } = body

    if (!canonicalCompanyId) {
      return NextResponse.json(
        { error: 'Canonical company ID is required' },
        { status: 400 }
      )
    }

    // Verify canonical company exists
    const canonicalCompany = await prisma.canonicalCompany.findUnique({
      where: { id: canonicalCompanyId },
    })

    if (!canonicalCompany) {
      return NextResponse.json(
        { error: 'Canonical company not found' },
        { status: 404 }
      )
    }

    // Check for duplicate
    const existing = await prisma.dealBuyer.findUnique({
      where: {
        dealId_canonicalCompanyId: { dealId, canonicalCompanyId },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This buyer is already added to the deal' },
        { status: 400 }
      )
    }

    // Determine if seller approval is needed
    const needsApproval = requireSellerApproval ?? deal.requireSellerApproval
    const approvalStatus = needsApproval
      ? ApprovalStatus.PENDING
      : ApprovalStatus.APPROVED

    // Create buyer
    const buyer = await prisma.dealBuyer.create({
      data: {
        dealId,
        canonicalCompanyId,
        currentStage: needsApproval ? DealStage.IDENTIFIED : initialStage,
        approvalStatus,
        internalNotes: notes,
        createdByUserId: result.auth.user.id,
      },
      include: {
        canonicalCompany: {
          select: {
            id: true,
            name: true,
            companyType: true,
          },
        },
      },
    })

    // Create initial stage history
    await prisma.dealStageHistory2.create({
      data: {
        dealBuyerId: buyer.id,
        fromStage: DealStage.IDENTIFIED,
        toStage: buyer.currentStage,
        note: 'Buyer added to deal',
        changedByUserId: result.auth.user.id,
      },
    })

    // Create activity log
    await prisma.dealActivity2.create({
      data: {
        dealId,
        dealBuyerId: buyer.id,
        activityType: 'NOTE_ADDED',
        subject: `Buyer ${canonicalCompany.name} added to deal`,
        description: notes,
        performedByUserId: result.auth.user.id,
      },
    })

    return NextResponse.json({ buyer }, { status: 201 })
  } catch (error) {
    console.error('Error adding deal buyer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
