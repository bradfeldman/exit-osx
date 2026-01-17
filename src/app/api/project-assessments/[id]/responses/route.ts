/**
 * Project Assessment Responses API
 *
 * POST /api/project-assessments/[id]/responses - Save a response
 * GET /api/project-assessments/[id]/responses - Get all responses
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { ConfidenceLevel } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/project-assessments/[id]/responses
 * Get all responses for a Project Assessment
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: assessmentId } = await params

  // Get assessment and verify access
  const assessment = await prisma.projectAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      company: {
        include: {
          organization: {
            include: {
              users: { where: { user: { authId: user.id } } }
            }
          }
        }
      }
    }
  })

  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  if (assessment.company.organization.users.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get responses with question and option details
  const responses = await prisma.projectAssessmentResponse.findMany({
    where: { assessmentId },
    include: {
      question: {
        select: {
          moduleId: true,
          questionText: true,
          briCategory: true,
          subCategory: true,
        }
      },
      selectedOption: true,
      effectiveOption: true,
    }
  })

  // Get assessment questions to calculate progress
  const totalQuestions = await prisma.projectAssessmentQuestion.count({
    where: { assessmentId }
  })

  return NextResponse.json({
    responses,
    progress: {
      answered: responses.length,
      total: totalQuestions,
      percentComplete: totalQuestions > 0 ? Math.round((responses.length / totalQuestions) * 100) : 0,
    }
  })
}

/**
 * POST /api/project-assessments/[id]/responses
 * Save a response to a Project Assessment question
 *
 * Body: {
 *   questionId: string
 *   selectedOptionId: string
 *   confidenceLevel: ConfidenceLevel
 *   notes?: string
 *   evidenceUrls?: string[]
 * }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: assessmentId } = await params
  const body = await request.json()
  const {
    questionId,
    selectedOptionId,
    confidenceLevel = 'CONFIDENT',
    notes,
    evidenceUrls = [],
  } = body

  if (!questionId || !selectedOptionId) {
    return NextResponse.json(
      { error: 'questionId and selectedOptionId are required' },
      { status: 400 }
    )
  }

  // Get assessment and verify access
  const assessment = await prisma.projectAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      company: {
        include: {
          organization: {
            include: {
              users: { where: { user: { authId: user.id } } }
            }
          }
        }
      }
    }
  })

  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  if (assessment.company.organization.users.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (assessment.status === 'COMPLETED') {
    return NextResponse.json(
      { error: 'Assessment is already completed' },
      { status: 400 }
    )
  }

  // Verify the question is part of this assessment
  const assessmentQuestion = await prisma.projectAssessmentQuestion.findUnique({
    where: {
      assessmentId_questionId: { assessmentId, questionId }
    }
  })

  if (!assessmentQuestion) {
    return NextResponse.json(
      { error: 'Question is not part of this assessment' },
      { status: 400 }
    )
  }

  // Get the selected option to get its score
  const selectedOption = await prisma.projectQuestionOption.findUnique({
    where: { id: selectedOptionId }
  })

  if (!selectedOption) {
    return NextResponse.json({ error: 'Invalid option' }, { status: 400 })
  }

  // Get estimated score (based on Initial BRI category score)
  // This will be used to show the user how their response differed from expectations
  const latestSnapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId: assessment.companyId },
    orderBy: { createdAt: 'desc' }
  })

  const question = await prisma.projectQuestion.findUnique({
    where: { id: questionId },
    select: { briCategory: true }
  })

  let estimatedScore: number | null = null
  if (latestSnapshot && question) {
    // Use the category's BRI score as the estimated score
    const categoryScoreMap: Record<string, keyof typeof latestSnapshot> = {
      'FINANCIAL': 'briFinancial',
      'TRANSFERABILITY': 'briTransferability',
      'OPERATIONAL': 'briOperational',
      'MARKET': 'briMarket',
      'LEGAL_TAX': 'briLegalTax',
      'PERSONAL': 'briPersonal',
    }
    const scoreField = categoryScoreMap[question.briCategory]
    if (scoreField && latestSnapshot[scoreField]) {
      estimatedScore = Number(latestSnapshot[scoreField])
    }
  }

  const actualScore = Number(selectedOption.scoreValue)
  const scoreImpact = estimatedScore !== null ? actualScore - estimatedScore : null

  // Upsert the response
  const response = await prisma.projectAssessmentResponse.upsert({
    where: {
      assessmentId_questionId: { assessmentId, questionId }
    },
    update: {
      selectedOptionId,
      effectiveOptionId: selectedOptionId, // Initially same as selected
      confidenceLevel: confidenceLevel as ConfidenceLevel,
      notes,
      evidenceUrls,
      estimatedScore,
      actualScore,
      scoreImpact,
    },
    create: {
      assessmentId,
      questionId,
      selectedOptionId,
      effectiveOptionId: selectedOptionId,
      confidenceLevel: confidenceLevel as ConfidenceLevel,
      notes,
      evidenceUrls,
      estimatedScore,
      actualScore,
      scoreImpact,
    },
    include: {
      question: {
        select: {
          moduleId: true,
          questionText: true,
          briCategory: true,
        }
      },
      selectedOption: true,
    }
  })

  // Calculate progress
  const totalQuestions = await prisma.projectAssessmentQuestion.count({
    where: { assessmentId }
  })
  const answeredQuestions = await prisma.projectAssessmentResponse.count({
    where: { assessmentId }
  })

  // Build feedback message
  let feedback = ''
  if (scoreImpact !== null) {
    if (scoreImpact > 0.1) {
      feedback = 'Better than expected! This response positively impacts your BRI.'
    } else if (scoreImpact < -0.1) {
      feedback = 'This indicates a risk area that may need attention.'
    } else {
      feedback = 'This aligns with the expected score for this category.'
    }
  }

  return NextResponse.json({
    response,
    progress: {
      answered: answeredQuestions,
      total: totalQuestions,
      percentComplete: Math.round((answeredQuestions / totalQuestions) * 100),
      isComplete: answeredQuestions >= totalQuestions,
    },
    scoreImpact: {
      estimated: estimatedScore,
      actual: actualScore,
      difference: scoreImpact,
      feedback,
    }
  })
}
