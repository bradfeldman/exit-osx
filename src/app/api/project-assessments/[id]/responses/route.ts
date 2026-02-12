/**
 * Project Assessment Responses API
 *
 * POST /api/project-assessments/[id]/responses - Save a response to a question
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { ConfidenceLevel } from '@prisma/client'

/**
 * POST /api/project-assessments/[id]/responses
 * Save a response to a question
 *
 * Body: {
 *   questionId: string
 *   selectedOptionId: string
 *   confidenceLevel: ConfidenceLevel
 *   notes?: string
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
  const body = await request.json()
  const { questionId, selectedOptionId, confidenceLevel, notes } = body

  if (!questionId || !selectedOptionId) {
    return NextResponse.json(
      { error: 'questionId and selectedOptionId are required' },
      { status: 400 }
    )
  }

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

  // Get the selected option to capture score
  const option = await prisma.projectQuestionOption.findUnique({
    where: { id: selectedOptionId },
    select: { scoreValue: true }
  })

  if (!option) {
    return NextResponse.json({ error: 'Invalid option' }, { status: 400 })
  }

  // Upsert the response (create or update)
  const response = await prisma.projectAssessmentResponse.upsert({
    where: {
      assessmentId_questionId: { assessmentId, questionId }
    },
    update: {
      selectedOptionId,
      effectiveOptionId: selectedOptionId,
      confidenceLevel: (confidenceLevel as ConfidenceLevel) || 'CONFIDENT',
      notes,
      actualScore: option.scoreValue,
    },
    create: {
      assessmentId,
      questionId,
      selectedOptionId,
      effectiveOptionId: selectedOptionId,
      confidenceLevel: (confidenceLevel as ConfidenceLevel) || 'CONFIDENT',
      notes,
      actualScore: option.scoreValue,
    }
  })

  return NextResponse.json({ response, saved: true })
}
