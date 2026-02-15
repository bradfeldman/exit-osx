import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ActivityType } from '@prisma/client'
import { authorizeDealAccess } from '@/lib/deal-tracker/deal-auth'

type RouteParams = Promise<{ dealId: string; buyerId: string }>

/**
 * GET /api/deals/[dealId]/buyers/[buyerId]/activities
 * Fetch activity history for a buyer.
 *
 * Query params:
 * - types: comma-separated list of activity types to filter (optional)
 * - limit: max number of activities (default 50)
 * - offset: pagination offset (default 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { dealId, buyerId } = await params
    const authResult = await authorizeDealAccess(dealId, 'COMPANY_VIEW')
    if (authResult instanceof NextResponse) return authResult

    const searchParams = request.nextUrl.searchParams

    const typesParam = searchParams.get('types')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Verify buyer belongs to deal
    const buyer = await prisma.dealBuyer.findUnique({
      where: { id: buyerId },
      select: { dealId: true }
    })

    if (!buyer) {
      return NextResponse.json(
        { error: 'Buyer not found' },
        { status: 404 }
      )
    }

    if (buyer.dealId !== dealId) {
      return NextResponse.json(
        { error: 'Buyer does not belong to this deal' },
        { status: 400 }
      )
    }

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      dealBuyerId: buyerId,
    }

    // Filter by activity types if provided
    if (typesParam) {
      const types = typesParam.split(',').filter((t) =>
        Object.values(ActivityType).includes(t as ActivityType)
      )
      if (types.length > 0) {
        where.activityType = { in: types }
      }
    }

    // Fetch activities
    const [activities, total] = await Promise.all([
      prisma.dealActivity2.findMany({
        where,
        orderBy: { performedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          activityType: true,
          subject: true,
          description: true,
          metadata: true,
          performedByUserId: true,
          performedAt: true,
        }
      }),
      prisma.dealActivity2.count({ where })
    ])

    return NextResponse.json({
      activities,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + activities.length < total,
      }
    })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/deals/[dealId]/buyers/[buyerId]/activities
 * Log a new activity for a buyer.
 *
 * Body:
 * - activityType: ActivityType
 * - subject: string
 * - description?: string
 * - metadata?: object
 */
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { dealId, buyerId } = await params
    const authResult = await authorizeDealAccess(dealId, 'COMPANY_UPDATE')
    if (authResult instanceof NextResponse) return authResult
    const { auth } = authResult
    const userId = auth.user.id

    const body = await request.json()
    const { activityType, subject, description, metadata } = body

    // Validate required fields
    if (!activityType || !subject) {
      return NextResponse.json(
        { error: 'activityType and subject are required' },
        { status: 400 }
      )
    }

    // Validate activity type
    if (!Object.values(ActivityType).includes(activityType)) {
      return NextResponse.json(
        { error: 'Invalid activity type' },
        { status: 400 }
      )
    }

    // Verify buyer exists and belongs to deal
    const buyer = await prisma.dealBuyer.findUnique({
      where: { id: buyerId },
      select: { dealId: true }
    })

    if (!buyer) {
      return NextResponse.json(
        { error: 'Buyer not found' },
        { status: 404 }
      )
    }

    if (buyer.dealId !== dealId) {
      return NextResponse.json(
        { error: 'Buyer does not belong to this deal' },
        { status: 400 }
      )
    }

    // Create activity
    const activity = await prisma.dealActivity2.create({
      data: {
        dealId,
        dealBuyerId: buyerId,
        activityType,
        subject,
        description,
        metadata: metadata || {},
        performedByUserId: userId || 'system',
      },
      select: {
        id: true,
        activityType: true,
        subject: true,
        description: true,
        metadata: true,
        performedByUserId: true,
        performedAt: true,
      }
    })

    return NextResponse.json({ activity }, { status: 201 })
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}
