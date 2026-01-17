import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

export async function GET() {
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  const { auth } = result

  try {
    // Get active (non-deleted) companies from the user's organization
    const companies = await prisma.company.findMany({
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

    return NextResponse.json({ company }, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}
