import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the user's organization
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                companies: {
                  include: {
                    coreFactors: true,
                    ebitdaAdjustments: true,
                    valuationSnapshots: {
                      orderBy: { createdAt: 'desc' },
                      take: 1
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get companies from all user's organizations
    const companies = dbUser.organizations.flatMap(
      org => org.organization.companies
    )

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Get the user's primary organization
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        organizations: {
          where: { role: 'ADMIN' },
          take: 1
        }
      }
    })

    if (!dbUser || dbUser.organizations.length === 0) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      )
    }

    const organizationId = dbUser.organizations[0].organizationId

    // Create the company
    const company = await prisma.company.create({
      data: {
        organizationId,
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
