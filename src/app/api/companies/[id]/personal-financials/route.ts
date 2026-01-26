// Personal Financials API
// GET/PUT personal financial data for an organization (shared across all companies)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { requireGranularPermission } from '@/lib/auth/check-granular-permission'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get personal financials
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: companyId } = await params

    // Check basic auth first
    const auth = await checkPermission('COMPANY_VIEW')
    if (isAuthError(auth)) {
      return auth.error
    }

    // Check granular permission
    try {
      await requireGranularPermission('personal.retirement:view', companyId)
    } catch {
      // Try net worth view as fallback
      try {
        await requireGranularPermission('personal.net_worth:view', companyId)
      } catch {
        return NextResponse.json(
          { error: 'You do not have permission to view personal financials' },
          { status: 403 }
        )
      }
    }

    // Verify company exists and user has access, get organizationId
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
        organization: {
          users: {
            some: { userId: auth.auth.user.id }
          }
        }
      },
      select: { organizationId: true }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const { organizationId } = company

    // Get personal financials (now organization-level)
    const personalFinancials = await prisma.personalFinancials.findUnique({
      where: { organizationId }
    })

    return NextResponse.json({
      personalFinancials: personalFinancials || {
        id: null,
        organizationId,
        retirementAccounts: [],
        totalRetirement: null,
        personalAssets: [],
        personalLiabilities: [],
        netWorth: null,
        exitGoalAmount: null,
        retirementAge: null,
        notes: null,
      }
    })
  } catch (error) {
    console.error('Failed to get personal financials:', error)
    return NextResponse.json(
      { error: 'Failed to get personal financials' },
      { status: 500 }
    )
  }
}

// PUT - Update personal financials
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id: companyId } = await params

    // Check basic auth first
    const auth = await checkPermission('COMPANY_UPDATE')
    if (isAuthError(auth)) {
      return auth.error
    }

    // Check granular permission
    try {
      await requireGranularPermission('personal.retirement:edit', companyId)
    } catch {
      try {
        await requireGranularPermission('personal.net_worth:edit', companyId)
      } catch {
        return NextResponse.json(
          { error: 'You do not have permission to edit personal financials' },
          { status: 403 }
        )
      }
    }

    // Verify company exists and user has access, get organizationId
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
        organization: {
          users: {
            some: { userId: auth.auth.user.id }
          }
        }
      },
      select: { organizationId: true }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const { organizationId } = company
    const body = await request.json()

    // Validate and extract data
    const {
      retirementAccounts,
      totalRetirement,
      personalAssets,
      personalLiabilities,
      netWorth,
      exitGoalAmount,
      retirementAge,
      notes,
    } = body

    // Upsert personal financials (now organization-level)
    const personalFinancials = await prisma.personalFinancials.upsert({
      where: { organizationId },
      update: {
        retirementAccounts: retirementAccounts || null,
        totalRetirement: totalRetirement !== undefined ? totalRetirement : null,
        personalAssets: personalAssets || null,
        personalLiabilities: personalLiabilities || null,
        netWorth: netWorth !== undefined ? netWorth : null,
        exitGoalAmount: exitGoalAmount !== undefined ? exitGoalAmount : null,
        retirementAge: retirementAge !== undefined ? retirementAge : null,
        notes: notes || null,
      },
      create: {
        organizationId,
        retirementAccounts: retirementAccounts || null,
        totalRetirement: totalRetirement !== undefined ? totalRetirement : null,
        personalAssets: personalAssets || null,
        personalLiabilities: personalLiabilities || null,
        netWorth: netWorth !== undefined ? netWorth : null,
        exitGoalAmount: exitGoalAmount !== undefined ? exitGoalAmount : null,
        retirementAge: retirementAge !== undefined ? retirementAge : null,
        notes: notes || null,
      },
    })

    return NextResponse.json({ personalFinancials })
  } catch (error) {
    console.error('Failed to update personal financials:', error)
    return NextResponse.json(
      { error: 'Failed to update personal financials' },
      { status: 500 }
    )
  }
}
