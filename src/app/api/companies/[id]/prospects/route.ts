import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { BuyerType, ProspectApprovalStatus } from '@prisma/client'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

/**
 * GET /api/companies/[id]/prospects
 * Get all buyer prospects for a company
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
    const status = searchParams.get('status') as ProspectApprovalStatus | 'all' | null
    const buyerType = searchParams.get('buyerType') as BuyerType | null
    const search = searchParams.get('search')
    const sortField = searchParams.get('sort') || 'createdAt'
    const sortOrder = searchParams.get('order') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    // Build filter
    const where: Record<string, unknown> = { companyId }
    if (status && status !== 'all') {
      where.approvalStatus = status
    }
    if (buyerType) {
      where.buyerType = buyerType
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { relevanceDescription: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Build sort
    const orderBy: Record<string, string> = {}
    if (sortField === 'company_name' || sortField === 'name') {
      orderBy.name = sortOrder
    } else if (sortField === 'status_changed_at' || sortField === 'statusChangedAt') {
      orderBy.statusChangedAt = sortOrder
    } else {
      orderBy.createdAt = sortOrder
    }

    // Get prospects with pagination
    const [prospects, total] = await Promise.all([
      prisma.buyerProspect.findMany({
        where,
        include: {
          buyers: {
            select: { id: true, name: true, currentStage: true },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.buyerProspect.count({ where }),
    ])

    // Get summary counts
    const statusCounts = await prisma.buyerProspect.groupBy({
      by: ['approvalStatus'],
      where: { companyId },
      _count: true,
    })

    const summary = {
      approved: 0,
      denied: 0,
      undecided: 0,
    }
    statusCounts.forEach((s) => {
      const key = s.approvalStatus.toLowerCase() as keyof typeof summary
      summary[key] = s._count
    })

    return NextResponse.json({
      prospects,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    })
  } catch (error) {
    console.error('Error fetching prospects:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const postProspectSchema = z.object({
  name: z.string().min(1).max(500),
  buyerType: z.enum(['STRATEGIC', 'FINANCIAL', 'OTHER']),
  relevanceDescription: z.string().max(5000).optional().nullable(),
  website: z.string().max(2000).optional().nullable(),
  headquartersLocation: z.string().max(500).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})

/**
 * POST /api/companies/[id]/prospects
 * Create a new buyer prospect
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const validation = await validateRequestBody(request, postProspectSchema)
    if (!validation.success) return validation.error
    const {
      name,
      buyerType,
      relevanceDescription,
      website,
      headquartersLocation,
      notes,
    } = validation.data

    // Check for duplicate
    const existing = await prisma.buyerProspect.findUnique({
      where: {
        companyId_name: { companyId, name },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A prospect with this name already exists' },
        { status: 400 }
      )
    }

    // Extract domain from website for matching
    let domain: string | null = null
    if (website) {
      try {
        const url = new URL(website.startsWith('http') ? website : `https://${website}`)
        domain = url.hostname.toLowerCase().replace(/^www\./, '')
      } catch {
        // Invalid URL, domain stays null
      }
    }

    const prospect = await prisma.buyerProspect.create({
      data: {
        companyId,
        name: name.trim(),
        buyerType: buyerType as BuyerType,
        relevanceDescription: relevanceDescription?.trim() || null,
        website: website?.trim() || null,
        headquartersLocation: headquartersLocation?.trim() || null,
        notes: notes?.trim() || null,
        domain,
        source: 'MANUAL',
        createdById: result.auth.user.id,
      },
    })

    return NextResponse.json({ prospect }, { status: 201 })
  } catch (error) {
    console.error('Error creating prospect:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const deleteProspectsSchema = z.object({
  prospectIds: z.array(z.string().uuid()).min(1).max(100),
})

/**
 * DELETE /api/companies/[id]/prospects
 * Delete multiple prospects
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const validation = await validateRequestBody(request, deleteProspectsSchema)
    if (!validation.success) return validation.error
    const { prospectIds } = validation.data

    // Verify all prospects belong to this company
    const prospects = await prisma.buyerProspect.findMany({
      where: {
        id: { in: prospectIds },
        companyId,
      },
      select: { id: true },
    })

    if (prospects.length !== prospectIds.length) {
      return NextResponse.json(
        { error: 'Some prospects not found or do not belong to this company' },
        { status: 400 }
      )
    }

    const deleted = await prisma.buyerProspect.deleteMany({
      where: {
        id: { in: prospectIds },
        companyId,
      },
    })

    return NextResponse.json({ deleted: deleted.count })
  } catch (error) {
    console.error('Error deleting prospects:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
