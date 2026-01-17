/**
 * Skip Question API
 *
 * POST /api/project-assessments/[id]/skip
 * Mark a question as skipped - it goes back to the question pool for future assessments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: assessmentId } = await params
  const body = await request.json()
  const { questionId } = body

  if (!questionId) {
    return NextResponse.json({ error: 'questionId is required' }, { status: 400 })
  }

  // Get the assessment and verify access
  const assessment = await prisma.projectAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      company: {
        select: {
          organization: {
            include: {
              users: { where: { user: { authId: user.id } } }
            }
          }
        }
      },
      questions: {
        where: { questionId },
      }
    }
  })

  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  if (assessment.company.organization.users.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (assessment.status !== 'IN_PROGRESS') {
    return NextResponse.json({ error: 'Assessment is not in progress' }, { status: 400 })
  }

  // Find the assessment question
  const assessmentQuestion = assessment.questions[0]
  if (!assessmentQuestion) {
    return NextResponse.json({ error: 'Question not found in this assessment' }, { status: 404 })
  }

  // Mark the question as skipped
  await prisma.projectAssessmentQuestion.update({
    where: { id: assessmentQuestion.id },
    data: {
      skipped: true,
      skippedAt: new Date(),
    }
  })

  // Reset the question's priority status so it can be asked again
  await prisma.companyQuestionPriority.updateMany({
    where: {
      companyId: assessment.companyId,
      questionId,
    },
    data: {
      hasBeenAsked: false, // Reset so it can be selected again
      askedAt: null,
    }
  })

  return NextResponse.json({
    success: true,
    message: 'Question skipped and returned to question pool',
  })
}
