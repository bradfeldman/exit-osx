import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { DealStatus } from '@prisma/client'
import { PAGINATION } from '@/lib/contact-system/constants'

/**
 * GET /api/deals
 * Get all deals the user has access to
 */
export async function GET(request: NextRequest) {
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status') as DealStatus | 'all' | null
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || String(PAGINATION.DEFAULT_PAGE))
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT)),
      PAGINATION.MAX_LIMIT
    )

    // Build filter
    const where: Record<string, unknown> = {}

    if (companyId) {
      where.companyId = companyId
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { codeName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: {
          company: {
            select: { id: true, name: true },
          },
          _count: {
            select: { buyers: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deal.count({ where }),
    ])

    // Get summary by status
    const statusCounts = await prisma.deal.groupBy({
      by: ['status'],
      _count: true,
    })

    const summary = {
      active: 0,
      closed: 0,
      terminated: 0,
      onHold: 0,
    }
    statusCounts.forEach((s) => {
      if (s.status === 'ACTIVE') summary.active = s._count
      if (s.status === 'CLOSED') summary.closed = s._count
      if (s.status === 'TERMINATED') summary.terminated = s._count
      if (s.status === 'ON_HOLD') summary.onHold = s._count
    })

    return NextResponse.json({
      deals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    })
  } catch (error) {
    console.error('Error fetching deals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/deals
 * Create a new deal
 */
export async function POST(request: NextRequest) {
  const result = await checkPermission('COMPANY_UPDATE')
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const {
      companyId,
      codeName,
      description,
      targetCloseDate,
      requireSellerApproval = true,
    } = body

    if (!companyId || !codeName) {
      return NextResponse.json(
        { error: 'Company ID and code name are required' },
        { status: 400 }
      )
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Check for duplicate code name
    const existing = await prisma.deal.findUnique({
      where: {
        companyId_codeName: { companyId, codeName },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A deal with this code name already exists for this company' },
        { status: 400 }
      )
    }

    const deal = await prisma.deal.create({
      data: {
        companyId,
        codeName: codeName.trim(),
        description: description?.trim() || null,
        status: 'ACTIVE',
        targetCloseDate: targetCloseDate ? new Date(targetCloseDate) : null,
        requireSellerApproval,
        createdByUserId: result.auth.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ deal }, { status: 201 })
  } catch (error) {
    console.error('Error creating deal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
