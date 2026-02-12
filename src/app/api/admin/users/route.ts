import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin, isAdminError } from '@/lib/admin'
import { sanitizePagination } from '@/lib/security/validation'

export async function GET(request: NextRequest) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''
  // SECURITY: Validate and sanitize pagination to prevent DoS via large queries
  const { page, limit, skip } = sanitizePagination({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  })

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
        workspaces: {
          select: {
            workspace: {
              select: {
                planTier: true,
                subscriptionStatus: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
