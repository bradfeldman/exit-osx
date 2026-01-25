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
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.company.count({ where }),
  ])

  return NextResponse.json({
    companies,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
