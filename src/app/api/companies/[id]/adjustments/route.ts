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
    // Parse optional periodId filter from query params
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get('periodId')

    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: {
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

    if (company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch adjustments with optional period filter
    const adjustments = await prisma.ebitdaAdjustment.findMany({
      where: {
        companyId,
        ...(periodId ? { periodId } : {})
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ adjustments })
  } catch (error) {
    console.error('Error fetching adjustments:', error instanceof Error ? error.message : String(error))
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
    const { description, amount, type, periodId, frequency = 'ANNUAL', category, aiSuggested } = body

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

    if (!['MONTHLY', 'ANNUAL'].includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency' },
        { status: 400 }
      )
    }

    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: {
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

    if (company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // If periodId provided, verify it belongs to this company
    if (periodId) {
      const period = await prisma.financialPeriod.findUnique({
        where: { id: periodId }
      })
      if (!period || period.companyId !== companyId) {
        return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
      }
    }

    const adjustment = await prisma.ebitdaAdjustment.create({
      data: {
        companyId,
        description,
        amount,
        type,
        frequency,
        periodId: periodId || null,
        ...(category && { category }),
        ...(aiSuggested !== undefined && { aiSuggested: Boolean(aiSuggested) }),
      }
    })

    return NextResponse.json({ adjustment }, { status: 201 })
  } catch (error) {
    console.error('Error creating adjustment:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to create adjustment' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const { searchParams } = new URL(request.url)
    const adjustmentId = searchParams.get('adjustmentId')

    if (!adjustmentId) {
      return NextResponse.json(
        { error: 'Missing adjustmentId' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { amount, description, type, frequency, category } = body

    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: {
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

    if (company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify adjustment belongs to this company
    const existing = await prisma.ebitdaAdjustment.findUnique({
      where: { id: adjustmentId }
    })

    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: 'Adjustment not found' }, { status: 404 })
    }

    // Update the adjustment
    const adjustment = await prisma.ebitdaAdjustment.update({
      where: { id: adjustmentId },
      data: {
        ...(amount !== undefined && { amount }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(frequency !== undefined && { frequency }),
        ...(category !== undefined && { category }),
      }
    })

    return NextResponse.json({ adjustment })
  } catch (error) {
    console.error('Error updating adjustment:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update adjustment' },
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
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const adjustmentId = searchParams.get('adjustmentId')

    if (!adjustmentId) {
      return NextResponse.json(
        { error: 'Missing adjustmentId' },
        { status: 400 }
      )
    }

    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: {
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

    if (company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete the adjustment (use deleteMany to avoid error if already deleted)
    const result = await prisma.ebitdaAdjustment.deleteMany({
      where: { id: adjustmentId }
    })

    return NextResponse.json({ success: true, deleted: result.count })
  } catch (error) {
    console.error('Error deleting adjustment:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to delete adjustment' },
      { status: 500 }
    )
  }
}
