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
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            workspace: {
              include: {
                users: {
                  where: { user: { authId: user.id } },
                },
              },
            },
          },
        },
        responses: {
          include: {
            question: {
              include: {
                options: {
                  orderBy: { displayOrder: 'asc' },
                },
              },
            },
            selectedOption: true,
          },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    if (assessment.company.workspace.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all questions for progress tracking
    const allQuestions = await prisma.question.findMany({
      where: { isActive: true },
      orderBy: [
        { briCategory: 'asc' },
        { displayOrder: 'asc' },
      ],
    })

    const answeredQuestionIds = new Set(assessment.responses.map(r => r.questionId))
    const progress = {
      total: allQuestions.length,
      answered: answeredQuestionIds.size,
      percentage: Math.round((answeredQuestionIds.size / allQuestions.length) * 100),
    }

    return NextResponse.json({
      assessment,
      progress,
    })
  } catch (error) {
    console.error('Error fetching assessment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessment' },
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
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            organization: {
              include: {
                users: {
                  where: { user: { authId: user.id }, role: 'ADMIN' },
                },
              },
            },
          },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    if (assessment.company.workspace.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await prisma.assessment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting assessment:', error)
    return NextResponse.json(
      { error: 'Failed to delete assessment' },
      { status: 500 }
    )
  }
}
