import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { ACTIVITY_TYPES } from '@/lib/deal-tracker/constants'

/**
 * GET /api/companies/[id]/deal-tracker/buyers/[buyerId]/activities
 * Get activity timeline for a buyer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const activityType = searchParams.get('type')

    // Verify buyer belongs to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { buyerId }
    if (activityType) where.activityType = activityType

    const [activities, total] = await Promise.all([
      prisma.dealActivity.findMany({
        where,
        orderBy: { performedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.dealActivity.count({ where }),
    ])

    // Fetch user names for performed by
    const userIds = [...new Set(activities.map(a => a.performedById).filter(Boolean))] as string[]
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : []
    const userMap = new Map(users.map(u => [u.id, u]))

    const activitiesWithUsers = activities.map(activity => ({
      ...activity,
      performedBy: activity.performedById ? userMap.get(activity.performedById) : null,
    }))

    return NextResponse.json({
      activities: activitiesWithUsers,
      total,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/companies/[id]/deal-tracker/buyers/[buyerId]/activities
 * Add a note/activity
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
    const { description, metadata } = body

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    // Verify buyer belongs to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const activity = await prisma.dealActivity.create({
      data: {
        buyerId,
        activityType: ACTIVITY_TYPES.NOTE_ADDED,
        description,
        metadata: metadata || {},
        performedById: result.auth.user.id,
      },
    })

    return NextResponse.json({ activity }, { status: 201 })
  } catch (error) {
    console.error('Error adding activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
