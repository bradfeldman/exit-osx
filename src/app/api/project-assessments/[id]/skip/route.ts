/**
 * Project Assessment Skip Question API
 *
 * POST /api/project-assessments/[id]/skip - Skip a question
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const schema = z.object({
  questionId: z.string().uuid(),
})

/**
 * POST /api/project-assessments/[id]/skip
 * Skip a question (mark it for future assessments)
 *
 * Body: {
 *   questionId: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: assessmentId } = await params
  const validation = await validateRequestBody(request, schema)
  if (!validation.success) return validation.error
  const { questionId } = validation.data

  // Get the assessment to verify access and status
  const assessment = await prisma.projectAssessment.findUnique({
    where: { id: assessmentId },
    select: { companyId: true, status: true }
  })

  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  if (assessment.status === 'COMPLETED') {
    return NextResponse.json(
      { error: 'Cannot modify a completed assessment' },
      { status: 400 }
    )
  }

  // Verify user has access to this company
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: {
      workspaces: {
        include: {
          workspace: {
            include: { companies: { where: { id: assessment.companyId } } }
          }
        }
      }
    }
  })

  const hasAccess = dbUser?.workspaces.some(
    ws => ws.workspace.companies.length > 0
  )

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Mark the question as skipped in this assessment
  const assessmentQuestion = await prisma.projectAssessmentQuestion.updateMany({
    where: {
      assessmentId,
      questionId,
    },
    data: {
      skipped: true,
      skippedAt: new Date(),
    }
  })

  if (assessmentQuestion.count === 0) {
    return NextResponse.json(
      { error: 'Question not found in this assessment' },
      { status: 404 }
    )
  }

  // Mark question as NOT asked in company priorities (so it can appear again)
  await prisma.companyQuestionPriority.updateMany({
    where: {
      companyId: assessment.companyId,
      questionId,
    },
    data: {
      hasBeenAsked: false,
      askedAt: null,
    }
  })

  return NextResponse.json({ skipped: true })
}
