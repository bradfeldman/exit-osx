/**
 * Project Assessments API
 *
 * POST /api/project-assessments - Create a new Project Assessment
 * GET /api/project-assessments - List Project Assessments for a company
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import {
  selectQuestionsForAssessment,
  markQuestionsAsAsked,
  recommendNextAssessmentFocus,
} from '@/lib/project-assessments/prioritization-engine'
import type { BriCategory } from '@prisma/client'

/**
 * GET /api/project-assessments?companyId=xxx
 * List Project Assessments for a company
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const companyId = request.nextUrl.searchParams.get('companyId')
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
  }

  // Verify user has access to this company
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: {
      organizations: {
        include: {
          organization: {
            include: { companies: { where: { id: companyId } } }
          }
        }
      }
    }
  })

  const hasAccess = dbUser?.organizations.some(
    org => org.organization.companies.length > 0
  )

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get all Project Assessments for this company
  const assessments = await prisma.projectAssessment.findMany({
    where: { companyId },
    orderBy: { assessmentNumber: 'desc' },
    include: {
      questions: {
        include: {
          question: {
            select: {
              moduleId: true,
              questionText: true,
              briCategory: true,
              subCategory: true,
            }
          }
        },
        orderBy: { displayOrder: 'asc' }
      },
      responses: {
        include: {
          selectedOption: true,
        }
      },
      _count: {
        select: { responses: true, questions: true }
      }
    }
  })

  // Get recommendation for next assessment
  const recommendation = await recommendNextAssessmentFocus(companyId)

  return NextResponse.json({
    assessments,
    recommendation,
    totalAssessments: assessments.length,
    completedAssessments: assessments.filter(a => a.status === 'COMPLETED').length,
  })
}

/**
 * POST /api/project-assessments
 * Create a new Project Assessment
 *
 * Body: {
 *   companyId: string
 *   questionCount?: number (default 10)
 *   focusCategory?: BriCategory
 *   title?: string
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { companyId, questionCount = 10, focusCategory, title } = body

  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
  }

  // Verify user has access to this company
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: {
      organizations: {
        include: {
          organization: {
            include: { companies: { where: { id: companyId } } }
          }
        }
      }
    }
  })

  const hasAccess = dbUser?.organizations.some(
    org => org.organization.companies.length > 0
  )

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check for existing in-progress assessment
  const existingInProgress = await prisma.projectAssessment.findFirst({
    where: {
      companyId,
      status: 'IN_PROGRESS',
    },
    include: {
      questions: {
        include: {
          question: {
            include: { options: true }
          }
        },
        orderBy: { displayOrder: 'asc' }
      },
      responses: true,
    }
  })

  if (existingInProgress) {
    return NextResponse.json({
      assessment: existingInProgress,
      message: 'Returning existing in-progress assessment',
      isExisting: true,
    })
  }

  // Get current BRI score before creating assessment
  const latestSnapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: { briScore: true }
  })

  // Get next assessment number
  const maxAssessment = await prisma.projectAssessment.aggregate({
    where: { companyId },
    _max: { assessmentNumber: true }
  })
  const assessmentNumber = (maxAssessment._max.assessmentNumber || 0) + 1

  // Select questions using prioritization engine
  const selectedQuestions = await selectQuestionsForAssessment(
    companyId,
    Math.min(Math.max(questionCount, 8), 15), // Clamp to 8-15
    focusCategory as BriCategory | undefined
  )

  if (selectedQuestions.length === 0) {
    return NextResponse.json({
      error: 'No unasked questions available. All questions have been answered.',
      allQuestionsAnswered: true,
    }, { status: 400 })
  }

  // Determine primary category (most represented in selection)
  const categoryCount: Record<string, number> = {}
  for (const q of selectedQuestions) {
    categoryCount[q.briCategory] = (categoryCount[q.briCategory] || 0) + 1
  }
  const primaryCategory = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])[0][0] as BriCategory

  // Create the assessment with selected questions
  const assessment = await prisma.projectAssessment.create({
    data: {
      companyId,
      assessmentNumber,
      primaryCategory,
      title: title || `Assessment #${assessmentNumber}`,
      status: 'IN_PROGRESS',
      briScoreBefore: latestSnapshot?.briScore,
      questions: {
        create: selectedQuestions.map((q, index) => ({
          questionId: q.questionId,
          displayOrder: index + 1,
          selectionReason: q.selectionReason,
          priorityScore: q.totalScore,
        }))
      }
    },
    include: {
      questions: {
        include: {
          question: {
            include: { options: { orderBy: { displayOrder: 'asc' } } }
          }
        },
        orderBy: { displayOrder: 'asc' }
      }
    }
  })

  // Mark questions as asked
  await markQuestionsAsAsked(
    companyId,
    selectedQuestions.map(q => q.questionId)
  )

  return NextResponse.json({
    assessment,
    message: 'Project Assessment created',
    isExisting: false,
    questionCount: selectedQuestions.length,
    primaryCategory,
  })
}

function _formatCategoryName(category: BriCategory): string {
  const names: Record<BriCategory, string> = {
    FINANCIAL: 'Financial',
    TRANSFERABILITY: 'Transferability',
    OPERATIONAL: 'Operational',
    MARKET: 'Market',
    LEGAL_TAX: 'Legal & Tax',
    PERSONAL: 'Personal Readiness',
  }
  return names[category] || category
}
