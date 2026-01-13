import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        organization: {
          include: {
            users: {
              where: {
                user: { authId: user.id }
              }
            }
          }
        },
        coreFactors: true,
        ebitdaAdjustments: true,
        valuationSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Verify user has access to this company
    if (company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Error fetching company:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Verify user has access
    const existingCompany = await prisma.company.findUnique({
      where: { id },
      include: {
        organization: {
          include: {
            users: {
              where: {
                user: { authId: user.id }
              }
            }
          }
        }
      }
    })

    if (!existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (existingCompany.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update company
    const company = await prisma.company.update({
      where: { id },
      data: {
        name: body.name,
        icbIndustry: body.icbIndustry,
        icbSuperSector: body.icbSuperSector,
        icbSector: body.icbSector,
        icbSubSector: body.icbSubSector,
        annualRevenue: body.annualRevenue,
        annualEbitda: body.annualEbitda,
        ownerCompensation: body.ownerCompensation
      },
      include: {
        coreFactors: true,
        ebitdaAdjustments: true
      }
    })

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify user has access and is admin
    const existingCompany = await prisma.company.findUnique({
      where: { id },
      include: {
        organization: {
          include: {
            users: {
              where: {
                user: { authId: user.id },
                role: 'ADMIN'
              }
            }
          }
        }
      }
    })

    if (!existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (existingCompany.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await prisma.company.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    )
  }
}
