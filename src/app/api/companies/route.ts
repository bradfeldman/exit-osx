import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getUserAccessibleCompanies } from '@/lib/access'

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
  const result = await checkPermission('COMPANY_CREATE')
  if (isAuthError(result)) return result.error

  const { auth } = result

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

    // Create the company in the user's organization
    const company = await prisma.company.create({
      data: {
        organizationId: auth.organizationUser.organizationId,
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
        userId: auth.user.id,
        isSubscribingOwner: true,
        ownershipPercent: 100,
        status: 'ACTIVE',
      }
    })

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
