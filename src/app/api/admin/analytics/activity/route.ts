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

  // Build filters
  const where: Record<string, unknown> = {}

  const eventCategory = searchParams.get('eventCategory')
  if (eventCategory) where.eventCategory = eventCategory

  const eventName = searchParams.get('eventName')
  if (eventName) where.eventName = { contains: eventName, mode: 'insensitive' }

  const userId = searchParams.get('userId')
  if (userId) where.userId = userId

  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate + 'T23:59:59.999Z') } : {}),
    }
  }

  const [events, total] = await Promise.all([
    prisma.productEvent.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.productEvent.count({ where }),
  ])

  return NextResponse.json({
    events: events.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
