import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getUserAccessibleCompanies } from '@/lib/access'
import { createClient } from '@/lib/supabase/server'
import { serverAnalytics } from '@/lib/analytics/server'
import { COMPANY_LIMITS, type PlanTier } from '@/lib/pricing'

export async function GET() {
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  const { auth } = result

  try {
    // Get active (non-deleted) companies from the user's workspace (legacy)
    const workspaceCompanies = await prisma.company.findMany({
      where: {
        deletedAt: null, // Exclude soft-deleted companies
        workspace: {
          members: {
            some: { userId: auth.user.id }
          }
        }
      },
      include: {
        coreFactors: true,
        ebitdaAdjustments: true,
        valuationSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    // Get company access roles for the user
    const accessibleCompanies = await getUserAccessibleCompanies(auth.user.id)

    // Merge role info into companies
    const companies = workspaceCompanies.map(company => {
      const accessInfo = accessibleCompanies.find(c => c.id === company.id)
      return {
        ...company,
        role: accessInfo?.role,
        isSubscribingOwner: accessInfo?.isSubscribingOwner,
        ownershipPercent: accessInfo?.ownershipPercent,
      }
    })

    // Also include companies from new ownership model that might not be in workspace
    for (const accessCompany of accessibleCompanies) {
      if (!companies.some(c => c.id === accessCompany.id)) {
        const company = await prisma.company.findUnique({
          where: { id: accessCompany.id },
          include: {
            coreFactors: true,
            ebitdaAdjustments: true,
            valuationSnapshots: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        })
        if (company && !company.deletedAt) {
          companies.push({
            ...company,
            role: accessCompany.role,
            isSubscribingOwner: accessCompany.isSubscribingOwner,
            ownershipPercent: accessCompany.ownershipPercent,
          })
        }
      }
    }

    return NextResponse.json({ companies })
  } catch (error) {
    console.error('Error fetching companies:', error)
    // SECURITY FIX (PROD-060): Removed error.message from response to prevent leaking internal details
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  // First, check if user is authenticated
  const supabase = await createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

  if (!supabaseUser) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'You must be logged in' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const {
      name,
      icbIndustry,
      icbSuperSector,
      icbSector,
      icbSubSector,
      annualRevenue,
      annualEbitda,
      ownerCompensation = 0,
      businessDescription,
      businessProfile,
      profileQuestionsAnswered,
    } = body

    // Validate required fields
    if (!name || !icbIndustry || !icbSuperSector || !icbSector || !icbSubSector) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the user from our database
    const dbUser = await prisma.user.findUnique({
      where: { authId: supabaseUser.id },
      include: {
        workspaces: {
          include: { workspace: true }
        }
      }
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find a workspace where user has ADMIN or SUPER_ADMIN role (can create companies)
    let targetWorkspace = dbUser.workspaces.find(
      wm => wm.role === 'ADMIN' || wm.role === 'SUPER_ADMIN'
    )

    // If user doesn't have a workspace where they can create companies, create one for them
    if (!targetWorkspace) {
      // Create a new personal workspace for this user
      const newWorkspace = await prisma.workspace.create({
        data: {
          name: dbUser.name
            ? `${dbUser.name}'s Workspace`
            : 'My Workspace',
          planTier: 'FOUNDATION',
          subscriptionStatus: 'ACTIVE',
          members: {
            create: {
              userId: dbUser.id,
              role: 'ADMIN',
            }
          }
        }
      })

      // Fetch the workspace member relationship we just created
      const newWorkspaceMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: newWorkspace.id,
          userId: dbUser.id,
        },
        include: { workspace: true }
      })

      if (!newWorkspaceMember) {
        throw new Error('Failed to create workspace membership')
      }

      targetWorkspace = newWorkspaceMember
    }

    // Enforce company limit based on workspace plan tier
    const workspacePlanTier = targetWorkspace.workspace
      ? targetWorkspace.workspace.planTier.toLowerCase().replace('_', '-') as PlanTier
      : 'foundation' as PlanTier
    const companyLimit = COMPANY_LIMITS[workspacePlanTier] ?? 1

    const activeCompanyCount = await prisma.company.count({
      where: {
        workspaceId: targetWorkspace.workspaceId,
        deletedAt: null,
      },
    })

    if (activeCompanyCount >= companyLimit) {
      return NextResponse.json(
        { error: 'Company limit reached for your plan' },
        { status: 403 }
      )
    }

    // Create the company in the target workspace
    const company = await prisma.company.create({
      data: {
        workspaceId: targetWorkspace.workspaceId,
        name,
        icbIndustry,
        icbSuperSector,
        icbSector,
        icbSubSector,
        annualRevenue,
        annualEbitda,
        ownerCompensation,
        businessDescription,
        businessProfile,
        profileQuestionsAnswered,
      },
      include: {
        coreFactors: true,
        ebitdaAdjustments: true
      }
    })

    // Create company ownership record - creator becomes subscribing owner
    await prisma.companyOwnership.create({
      data: {
        companyId: company.id,
        userId: dbUser.id,
        isSubscribingOwner: true,
        ownershipPercent: 100,
        status: 'ACTIVE',
      }
    })

    // Track company created (non-blocking)
    serverAnalytics.company.created({
      userId: dbUser.id,
      companyId: company.id,
      industry: icbSubSector,
    }).catch(() => {})

    return NextResponse.json({
      company: {
        ...company,
        role: 'subscribing_owner',
        isSubscribingOwner: true,
        ownershipPercent: 100,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    // SECURITY FIX (PROD-060): Removed error.message from response to prevent leaking internal details
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}
