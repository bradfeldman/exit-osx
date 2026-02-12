import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: assessmentId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      questionId,
      selectedOptionId,
      confidenceLevel = 'CONFIDENT',
      notes,
    } = body

    // For NOT_APPLICABLE, we don't require a selectedOptionId
    const isNotApplicable = confidenceLevel === 'NOT_APPLICABLE'

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID required' },
        { status: 400 }
      )
    }

    if (!isNotApplicable && !selectedOptionId) {
      return NextResponse.json(
        { error: 'Selected option ID required (unless marking as Not Applicable)' },
        { status: 400 }
      )
    }

    // Verify user has access to this assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
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
      },
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    if (assessment.company.workspace.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Allow updating responses on completed assessments for category re-assessment
    // The inline assessment flow in Diagnosis mode needs this to work

    // Upsert the response (update if exists, create if not)
    // Initialize effectiveOptionId = selectedOptionId for Answer Upgrade System
    // For NOT_APPLICABLE responses, selectedOptionId is null
    const optionId = isNotApplicable ? null : selectedOptionId

    const response = await prisma.assessmentResponse.upsert({
      where: {
        assessmentId_questionId: {
          assessmentId,
          questionId,
        },
      },
      update: {
        selectedOptionId: optionId,
        effectiveOptionId: optionId, // Reset to selected when user changes answer
        confidenceLevel,
        notes,
      },
      create: {
        assessmentId,
        questionId,
        selectedOptionId: optionId,
        effectiveOptionId: optionId, // Initialize effective = selected
        confidenceLevel,
        notes,
      },
      include: {
        question: true,
        selectedOption: true,
      },
    })

    // Get updated progress
    const allQuestions = await prisma.question.count({ where: { isActive: true } })
    const answeredQuestions = await prisma.assessmentResponse.count({
      where: { assessmentId },
    })

    return NextResponse.json({
      response,
      progress: {
        total: allQuestions,
        answered: answeredQuestions,
        percentage: Math.round((answeredQuestions / allQuestions) * 100),
      },
    })
  } catch (error) {
    console.error('Error saving response:', error)
    return NextResponse.json(
      { error: 'Failed to save response' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: assessmentId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify user has access
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
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
      },
    })

    if (!assessment || assessment.company.workspace.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const responses = await prisma.assessmentResponse.findMany({
      where: { assessmentId },
      include: {
        question: true,
        selectedOption: true,
      },
    })

    return NextResponse.json({ responses })
  } catch (error) {
    console.error('Error fetching responses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch responses' },
      { status: 500 }
    )
  }
}
