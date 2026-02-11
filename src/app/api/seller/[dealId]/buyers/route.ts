import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
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

    // SECURITY FIX (PROD-060): Was reading user ID from spoofable x-user-id header.
    // Now uses proper Supabase auth to get the authenticated user.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to access this resource' },
        { status: 401 }
      )
    }
    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } })
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found', message: 'Your user account could not be found' },
        { status: 404 }
      )
    }
    const userId = dbUser.id

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
