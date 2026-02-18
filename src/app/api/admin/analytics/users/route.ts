import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, isAdminError } from '@/lib/admin'
import { sanitizePagination } from '@/lib/security/validation'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const searchParams = request.nextUrl.searchParams
  const { page, limit, skip } = sanitizePagination({
    page: searchParams.get('page'),
    limit: searchParams.get('limit') || '50',
  })

  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const sortBy = searchParams.get('sortBy') || 'lastActive'

  // Build user filter
  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        userType: true,
        exposureState: true,
        emailVerified: true,
        workspaces: {
          select: {
            workspace: {
              select: {
                planTier: true,
                trialEndsAt: true,
              },
            },
          },
          take: 1,
        },
        _count: {
          select: {
            productEvents: true,
            sessions: true,
          },
        },
        productEvents: {
          select: {
            createdAt: true,
            deviceType: true,
            browser: true,
            os: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        sessions: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: sortBy === 'created' ? { createdAt: 'desc' } : { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  const now = new Date()

  const enrichedUsers = users.map((u) => {
    const lastEvent = u.productEvents[0]
    const lastSession = u.sessions[0]
    const lastActiveAt = lastEvent?.createdAt || lastSession?.createdAt || u.updatedAt

    // Status: Active (<3 days), Stalled (3-14 days), Dormant (>14 days)
    const daysSinceActive = (now.getTime() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
    let engagementStatus: 'active' | 'stalled' | 'dormant' = 'active'
    if (daysSinceActive > 14) engagementStatus = 'dormant'
    else if (daysSinceActive > 3) engagementStatus = 'stalled'

    return {
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt.toISOString(),
      userType: u.userType,
      exposureState: u.exposureState,
      emailVerified: u.emailVerified,
      planTier: u.workspaces[0]?.workspace?.planTier || null,
      trialEndsAt: u.workspaces[0]?.workspace?.trialEndsAt?.toISOString() || null,
      eventCount: u._count.productEvents,
      sessionCount: u._count.sessions,
      lastActiveAt: lastActiveAt.toISOString(),
      lastDevice: lastEvent?.deviceType || null,
      lastBrowser: lastEvent?.browser || null,
      lastOs: lastEvent?.os || null,
      engagementStatus,
    }
  })

  // Filter by status after enrichment (can't do this in DB query)
  const filteredUsers = status
    ? enrichedUsers.filter((u) => u.engagementStatus === status)
    : enrichedUsers

  // Re-sort by lastActive if needed
  if (sortBy === 'lastActive') {
    filteredUsers.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
  }

  return NextResponse.json({
    users: filteredUsers,
    pagination: {
      page,
      limit,
      total: status ? filteredUsers.length : total,
      totalPages: Math.ceil((status ? filteredUsers.length : total) / limit),
    },
  })
}
