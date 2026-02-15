import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const schema = z.object({
  questionId: z.string().uuid(),
  selectedOptionId: z.string().uuid().optional().nullable(),
  confidenceLevel: z.enum(['CONFIDENT', 'SOMEWHAT_CONFIDENT', 'UNCERTAIN', 'NOT_APPLICABLE']).default('CONFIDENT'),
  notes: z.string().max(5000).optional().nullable(),
})

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

  const validation = await validateRequestBody(request, schema)
  if (!validation.success) return validation.error
  const { questionId, selectedOptionId, confidenceLevel, notes } = validation.data

  // Allow null selectedOptionId for NOT_APPLICABLE and UNCERTAIN (I Don't Know)
  const allowNullOption = confidenceLevel === 'NOT_APPLICABLE' || confidenceLevel === 'UNCERTAIN'

  if (!allowNullOption && !selectedOptionId) {
    return NextResponse.json(
      { error: 'Selected option ID required' },
      { status: 400 }
    )
  }

  try {

    // Verify user has access to this assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        company: {
          include: {
            workspace: {
              include: {
                members: {
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

    if (assessment.company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Allow updating responses on completed assessments for category re-assessment
    // The inline assessment flow in Diagnosis mode needs this to work

    // Upsert the response (update if exists, create if not)
    // Initialize effectiveOptionId = selectedOptionId for Answer Upgrade System
    // For NOT_APPLICABLE and UNCERTAIN (I Don't Know) responses, selectedOptionId is null
    const optionId = allowNullOption && !selectedOptionId ? null : selectedOptionId

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
    console.error('Error saving response:', error instanceof Error ? error.message : String(error))
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
                members: {
                  where: { user: { authId: user.id } },
                },
              },
            },
          },
        },
      },
    })

    if (!assessment || assessment.company.workspace.members.length === 0) {
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
    console.error('Error fetching responses:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch responses' },
      { status: 500 }
    )
  }
}
