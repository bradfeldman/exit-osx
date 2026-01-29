import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getUserAccessibleCompanies } from '@/lib/access'
import { createClient } from '@/lib/supabase/server'
import { serverAnalytics } from '@/lib/analytics/server'

export async function GET() {
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  const { auth } = result

  try {
    // Get active (non-deleted) companies from the user's organization (legacy)
    const orgCompanies = await prisma.company.findMany({
      where: {
        deletedAt: null, // Exclude soft-deleted companies
        organization: {
          users: {
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
    const companies = orgCompanies.map(company => {
      const accessInfo = accessibleCompanies.find(c => c.id === company.id)
      return {
        ...company,
        role: accessInfo?.role,
        isSubscribingOwner: accessInfo?.isSubscribingOwner,
        ownershipPercent: accessInfo?.ownershipPercent,
      }
    })

    // Also include companies from new ownership model that might not be in org
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
      ownerCompensation = 0
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
        organizations: {
          include: { organization: true }
        }
      }
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find an organization where user has ADMIN or SUPER_ADMIN role (can create companies)
    let targetOrg = dbUser.organizations.find(
      ou => ou.role === 'ADMIN' || ou.role === 'SUPER_ADMIN'
    )

    // If user doesn't have an org where they can create companies, create one for them
    if (!targetOrg) {
      // Create a new personal organization for this user
      const newOrg = await prisma.organization.create({
        data: {
          name: dbUser.name
            ? `${dbUser.name}'s Organization`
            : 'My Organization',
          planTier: 'FOUNDATION',
          subscriptionStatus: 'ACTIVE',
          users: {
            create: {
              userId: dbUser.id,
              role: 'ADMIN',
            }
          }
        }
      })

      // Fetch the org user relationship we just created
      const newOrgUser = await prisma.organizationUser.findFirst({
        where: {
          organizationId: newOrg.id,
          userId: dbUser.id,
        },
        include: { organization: true }
      })

      if (!newOrgUser) {
        throw new Error('Failed to create organization membership')
      }

      targetOrg = newOrgUser
    }

    // Create the company in the target organization
    const company = await prisma.company.create({
      data: {
        organizationId: targetOrg.organizationId,
        name,
        icbIndustry,
        icbSuperSector,
        icbSector,
        icbSubSector,
        annualRevenue,
        annualEbitda,
        ownerCompensation
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
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}
