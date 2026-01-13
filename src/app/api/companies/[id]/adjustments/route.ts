import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
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
        ebitdaAdjustments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ adjustments: company.ebitdaAdjustments })
  } catch (error) {
    console.error('Error fetching adjustments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch adjustments' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { description, amount, type } = body

    // Validate
    if (!description || amount === undefined || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['ADD_BACK', 'DEDUCTION'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid adjustment type' },
        { status: 400 }
      )
    }

    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
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

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const adjustment = await prisma.ebitdaAdjustment.create({
      data: {
        companyId,
        description,
        amount,
        type
      }
    })

    return NextResponse.json({ adjustment }, { status: 201 })
  } catch (error) {
    console.error('Error creating adjustment:', error)
    return NextResponse.json(
      { error: 'Failed to create adjustment' },
      { status: 500 }
    )
  }
}
