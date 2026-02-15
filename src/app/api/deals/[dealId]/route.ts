import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { DealStatus } from '@prisma/client'
import { validateRequestBody, dealUpdateSchema } from '@/lib/security/validation'

/**
 * GET /api/deals/[dealId]
 * Get a single deal with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params

  try {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            icbIndustry: true,
            icbSector: true,
            annualRevenue: true,
            annualEbitda: true,
          },
        },
        buyers: {
          include: {
            canonicalCompany: {
              select: {
                id: true,
                name: true,
                companyType: true,
                website: true,
              },
            },
            contacts: {
              where: { isActive: true },
              include: {
                canonicalPerson: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    currentTitle: true,
                  },
                },
              },
            },
            _count: {
              select: {
                stageHistory: true,
                activities: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { performedAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            buyers: true,
            activities: true,
          },
        },
      },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // SECURITY FIX: Verify user has access to this deal's company
    const result = await checkPermission('COMPANY_VIEW', deal.companyId)
    if (isAuthError(result)) return result.error

    // Get stage distribution
    const stageDistribution = await prisma.dealBuyer.groupBy({
      by: ['currentStage'],
      where: { dealId },
      _count: true,
    })

    // Get approval status distribution
    const approvalDistribution = await prisma.dealBuyer.groupBy({
      by: ['approvalStatus'],
      where: { dealId },
      _count: true,
    })

    return NextResponse.json({
      deal,
      analytics: {
        stageDistribution,
        approvalDistribution,
      },
    })
  } catch (error) {
    console.error('Error fetching deal:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/deals/[dealId]
 * Update a deal
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params

  try {
    const existing = await prisma.deal.findUnique({
      where: { id: dealId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // SECURITY FIX: Verify user has access to this deal's company
    const result = await checkPermission('COMPANY_UPDATE', existing.companyId)
    if (isAuthError(result)) return result.error

    const validation = await validateRequestBody(request, dealUpdateSchema)
    if (!validation.success) return validation.error

    const {
      codeName,
      description,
      status,
      targetCloseDate,
      requireSellerApproval,
    } = validation.data

    const updateData: Record<string, unknown> = {}

    if (codeName !== undefined) {
      // Check for duplicate code name
      const duplicate = await prisma.deal.findFirst({
        where: {
          companyId: existing.companyId,
          codeName: codeName.trim(),
          id: { not: dealId },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'A deal with this code name already exists' },
          { status: 400 }
        )
      }

      updateData.codeName = codeName.trim()
    }

    if (description !== undefined) updateData.description = description?.trim() || null
    if (status !== undefined) {
      updateData.status = status as DealStatus

      // Set closed/terminated dates
      if (status === 'CLOSED' && !existing.closedAt) {
        updateData.closedAt = new Date()
      } else if (status === 'TERMINATED' && !existing.terminatedAt) {
        updateData.terminatedAt = new Date()
      }
    }
    if (targetCloseDate !== undefined) {
      updateData.targetCloseDate = targetCloseDate ? new Date(targetCloseDate) : null
    }
    if (requireSellerApproval !== undefined) {
      updateData.requireSellerApproval = requireSellerApproval
    }

    const deal = await prisma.deal.update({
      where: { id: dealId },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { buyers: true } },
      },
    })

    return NextResponse.json({ deal })
  } catch (error) {
    console.error('Error updating deal:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/deals/[dealId]
 * Delete a deal (only if no active buyers)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params

  try {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        _count: { select: { buyers: true } },
      },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // SECURITY FIX: Verify user has access to this deal's company
    const result = await checkPermission('COMPANY_UPDATE', deal.companyId)
    if (isAuthError(result)) return result.error

    if (deal._count.buyers > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete deal with active buyers. Remove buyers first or terminate the deal.',
          buyerCount: deal._count.buyers,
        },
        { status: 400 }
      )
    }

    await prisma.deal.delete({ where: { id: dealId } })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Error deleting deal:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
