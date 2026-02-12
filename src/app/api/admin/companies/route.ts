import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin, isAdminError } from '@/lib/admin'
import { sanitizePagination } from '@/lib/security/validation'

export async function GET(request: NextRequest) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''
  // SECURITY: Validate pagination to prevent DoS (max 100 items)
  const { page, limit, skip } = sanitizePagination({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  })

  const where = search
    ? {
        name: { contains: search, mode: 'insensitive' as const },
      }
    : {}

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            planTier: true,
            subscriptionStatus: true,
            members: {
              select: {
                user: {
                  select: {
                    sessions: {
                      select: { lastActiveAt: true },
                      orderBy: { lastActiveAt: 'desc' as const },
                      where: { revokedAt: null },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        integrations: {
          where: {
            provider: 'QUICKBOOKS_ONLINE',
            disconnectedAt: null,
          },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.company.count({ where }),
  ])

  // Compute member count and last login from nested data
  const enriched = companies.map((company) => {
    const workspaceMembers = company.workspace.members
    const memberCount = workspaceMembers.length

    // Find the most recent session across all workspace members
    let lastLogin: string | null = null
    for (const member of workspaceMembers) {
      const session = member.user.sessions[0]
      if (session) {
        if (!lastLogin || session.lastActiveAt.toISOString() > lastLogin) {
          lastLogin = session.lastActiveAt.toISOString()
        }
      }
    }

    return {
      id: company.id,
      name: company.name,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
      workspace: {
        id: company.workspace.id,
        name: company.workspace.name,
        planTier: company.workspace.planTier,
        subscriptionStatus: company.workspace.subscriptionStatus,
      },
      memberCount,
      lastLogin,
      qbConnected: company.integrations.length > 0,
    }
  })

  return NextResponse.json({
    companies: enriched,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
