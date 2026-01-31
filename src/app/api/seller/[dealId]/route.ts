import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createSellerDealSummary,
  validateSellerAccess,
} from '@/lib/contact-system/seller-projection'

type RouteParams = Promise<{ dealId: string }>

/**
 * GET /api/seller/[dealId]
 * Get deal summary for seller view (sanitized)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { dealId } = await params

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

    // Get deal with buyers
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        company: {
          select: { name: true }
        },
        buyers: {
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
          }
        }
      }
    })

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    // Create sanitized summary
    const summary = createSellerDealSummary(deal, deal.buyers as Parameters<typeof createSellerDealSummary>[1])

    return NextResponse.json({
      deal: summary,
      companyName: deal.company.name,
      accessRole: access.role,
    })
  } catch (error) {
    console.error('Error fetching seller deal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deal' },
      { status: 500 }
    )
  }
}
