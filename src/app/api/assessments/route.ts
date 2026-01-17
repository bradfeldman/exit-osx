import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('companyId')

  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  try {
    // Verify user has access to this company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        organization: {
          include: {
            users: {
              where: { user: { authId: user.id } },
            },
          },
        },
      },
    })

    if (!company || company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const assessments = await prisma.assessment.findMany({
      where: { companyId },
      include: {
        responses: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ assessments })
  } catch (error) {
    console.error('Error fetching assessments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
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
    const { companyId, assessmentType = 'INITIAL' } = body

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Verify user has access to this company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        organization: {
          include: {
            users: {
              where: { user: { authId: user.id } },
            },
          },
        },
      },
    })

    if (!company || company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // First check for a completed assessment - if exists, return it to trigger redirect
    const completedAssessment = await prisma.assessment.findFirst({
      where: {
        companyId,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
    })

    if (completedAssessment) {
      return NextResponse.json({
        assessment: completedAssessment,
        isExisting: true,
        isCompleted: true,
      })
    }

    // Check for existing incomplete assessment to continue
    const incompleteAssessment = await prisma.assessment.findFirst({
      where: {
        companyId,
        completedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (incompleteAssessment) {
      return NextResponse.json({
        assessment: incompleteAssessment,
        isExisting: true,
        isCompleted: false,
      })
    }

    // Create new assessment
    const assessment = await prisma.assessment.create({
      data: {
        companyId,
        assessmentType,
      },
    })

    return NextResponse.json({ assessment, isExisting: false }, { status: 201 })
  } catch (error) {
    console.error('Error creating assessment:', error)
    return NextResponse.json(
      { error: 'Failed to create assessment' },
      { status: 500 }
    )
  }
}
