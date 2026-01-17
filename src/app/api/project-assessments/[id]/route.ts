/**
 * Single Project Assessment API
 *
 * GET /api/project-assessments/[id] - Get a specific Project Assessment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/project-assessments/[id]
 * Get a specific Project Assessment with questions and responses
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Get the assessment with all related data
  const assessment = await prisma.projectAssessment.findUnique({
    where: { id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          organization: {
            include: {
              users: { where: { user: { authId: user.id } } }
            }
          }
        }
      },
      questions: {
        include: {
          question: {
            include: {
              options: { orderBy: { displayOrder: 'asc' } }
            }
          }
        },
        orderBy: { displayOrder: 'asc' }
      },
      responses: {
        include: {
          selectedOption: true
        }
      }
    }
  })

  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  // Verify user has access to this company
  if (assessment.company.organization.users.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    assessment: {
      id: assessment.id,
      assessmentNumber: assessment.assessmentNumber,
      title: assessment.title,
      status: assessment.status,
      primaryCategory: assessment.primaryCategory,
      briScoreBefore: assessment.briScoreBefore,
      briScoreAfter: assessment.briScoreAfter,
      createdAt: assessment.createdAt,
      completedAt: assessment.completedAt,
      questions: assessment.questions.map(q => ({
        id: q.id,
        questionId: q.questionId,
        displayOrder: q.displayOrder,
        selectionReason: q.selectionReason,
        priorityScore: q.priorityScore,
        question: {
          id: q.question.id,
          moduleId: q.question.moduleId,
          questionText: q.question.questionText,
          helpText: q.question.helpText,
          briCategory: q.question.briCategory,
          subCategory: q.question.subCategory,
          options: q.question.options.map(o => ({
            id: o.id,
            optionText: o.optionText,
            scoreValue: Number(o.scoreValue),
            displayOrder: o.displayOrder,
          }))
        }
      })),
      responses: assessment.responses.map(r => ({
        questionId: r.questionId,
        selectedOptionId: r.selectedOptionId,
      })),
      company: {
        id: assessment.company.id,
        name: assessment.company.name,
      }
    }
  })
}
