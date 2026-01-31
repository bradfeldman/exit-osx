import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApprovalStatus } from '@prisma/client'
import {
  sanitizeBuyersForSeller,
  validateSellerAccess,
} from '@/lib/contact-system/seller-projection'

type RouteParams = Promise<{ dealId: string }>

/**
 * GET /api/seller/[dealId]/buyers
 * Get sanitized buyer list for seller view
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { dealId } = await params
    const searchParams = request.nextUrl.searchParams

    // TODO: Get actual user ID from auth
    const userId = request.headers.get('x-user-id') || 'seller-user'

    // Validate seller access
    const access = await validateSellerAccess(userId, dealId)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: access.error || 'Access denied' },
        { status: 403 }
      )
    }

    // Build filter
    const approvalFilter = searchParams.get('approvalStatus')
    const search = searchParams.get('search')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { dealId }

    if (approvalFilter && approvalFilter !== 'all') {
      where.approvalStatus = approvalFilter as ApprovalStatus
    }

    if (search) {
      where.canonicalCompany = {
        name: {
          contains: search,
          mode: 'insensitive',
        }
      }
    }

    // Get buyers (excluding internal data)
    const buyers = await prisma.dealBuyer.findMany({
      where,
      include: {
        canonicalCompany: {
          select: {
            name: true,
            companyType: true,
            industryName: true,
            headquarters: true,
            employeeCount: true,
          }
        }
      },
      orderBy: [
        { approvalStatus: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // Sanitize for seller view
    const sanitizedBuyers = sanitizeBuyersForSeller(
      buyers as Parameters<typeof sanitizeBuyersForSeller>[0]
    )

    return NextResponse.json({
      buyers: sanitizedBuyers,
      total: sanitizedBuyers.length,
    })
  } catch (error) {
    console.error('Error fetching seller buyers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch buyers' },
      { status: 500 }
    )
  }
}
