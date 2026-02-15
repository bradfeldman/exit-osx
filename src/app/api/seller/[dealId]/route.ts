import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
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
    console.error('Error fetching seller deal:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch deal' },
      { status: 500 }
    )
  }
}
