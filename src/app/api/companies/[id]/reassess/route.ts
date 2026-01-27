import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { ConfidenceLevel } from '@prisma/client'
import { NextResponse } from 'next/server'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'

// GET - Fetch questions and current responses for reassessment
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const category = url.searchParams.get('category') // Optional filter by BRI category

  try {
    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        organization: {
          include: {
            users: {
              where: { user: { authId: user.id } }
            }
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the latest completed assessment for this company
    const latestAssessment = await prisma.assessment.findFirst({
      where: {
        companyId,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
    })

    if (!latestAssessment) {
      return NextResponse.json(
        { error: 'No completed assessment found. Please complete an initial assessment first.' },
        { status: 404 }
      )
    }

    // Get questions with optional category filter
    const whereClause: Record<string, unknown> = { isActive: true }
    if (category) {
      whereClause.briCategory = category
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
      orderBy: [
        { briCategory: 'asc' },
        { displayOrder: 'asc' }
      ],
      include: {
        options: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    })

    // Get current responses for the latest assessment
    const responses = await prisma.assessmentResponse.findMany({
      where: {
        assessmentId: latestAssessment.id,
        questionId: { in: questions.map(q => q.id) }
      }
    })

    // Create a map of questionId -> response
    const responseMap: Record<string, { selectedOptionId: string | null; confidenceLevel: string; notes: string | null }> = {}
    for (const response of responses) {
      responseMap[response.questionId] = {
        selectedOptionId: response.selectedOptionId,
        confidenceLevel: response.confidenceLevel,
        notes: response.notes
      }
    }

    // Group questions by category
    const categories: Record<string, Array<{
      id: string
      questionText: string
      helpText: string | null
      maxImpactPoints: number
      options: Array<{ id: string; optionText: string; scoreValue: number; displayOrder: number }>
      currentResponse: { selectedOptionId: string | null; confidenceLevel: string; notes: string | null } | null
    }>> = {}

    for (const question of questions) {
      const cat = question.briCategory
      if (!categories[cat]) {
        categories[cat] = []
      }
      categories[cat].push({
        id: question.id,
        questionText: question.questionText,
        helpText: question.helpText,
        maxImpactPoints: Number(question.maxImpactPoints),
        options: question.options.map(o => ({
          id: o.id,
          optionText: o.optionText,
          scoreValue: Number(o.scoreValue),
          displayOrder: o.displayOrder
        })),
        currentResponse: responseMap[question.id] || null
      })
    }

    return NextResponse.json({
      assessmentId: latestAssessment.id,
      categories
    })
  } catch (error) {
    console.error('Error fetching reassessment data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessment data' },
      { status: 500 }
    )
  }
}

// POST - Update responses and recalculate snapshot
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { responses } = body as {
      responses: Array<{
        questionId: string
        selectedOptionId: string
        confidenceLevel?: string
        notes?: string
      }>
    }

    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json(
        { error: 'No responses provided' },
        { status: 400 }
      )
    }

    // Verify user has access and get database user ID
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        organization: {
          include: {
            users: {
              where: { user: { authId: user.id } },
              include: {
                user: { select: { id: true } }
              }
            }
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const dbUserId = company.organization.users[0].user.id

    // Get the latest completed assessment
    const latestAssessment = await prisma.assessment.findFirst({
      where: {
        companyId,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
    })

    if (!latestAssessment) {
      return NextResponse.json(
        { error: 'No completed assessment found' },
        { status: 404 }
      )
    }

    // Update each response
    // Initialize effectiveOptionId = selectedOptionId for Answer Upgrade System
    const updatedResponses = []
    for (const resp of responses) {
      const updated = await prisma.assessmentResponse.upsert({
        where: {
          assessmentId_questionId: {
            assessmentId: latestAssessment.id,
            questionId: resp.questionId,
          }
        },
        update: {
          selectedOptionId: resp.selectedOptionId,
          effectiveOptionId: resp.selectedOptionId, // Reset effective to selected when user changes answer
          confidenceLevel: (resp.confidenceLevel || 'CONFIDENT') as ConfidenceLevel,
          notes: resp.notes || null,
        },
        create: {
          assessmentId: latestAssessment.id,
          questionId: resp.questionId,
          selectedOptionId: resp.selectedOptionId,
          effectiveOptionId: resp.selectedOptionId, // Initialize effective = selected
          confidenceLevel: (resp.confidenceLevel || 'CONFIDENT') as ConfidenceLevel,
          notes: resp.notes || null,
        }
      })
      updatedResponses.push(updated)
    }

    // Recalculate snapshot with updated BRI scores
    const snapshotResult = await recalculateSnapshotForCompany(
      companyId,
      'Risk assessment updated',
      dbUserId
    )

    return NextResponse.json({
      updated: updatedResponses.length,
      snapshotUpdated: snapshotResult.success,
      snapshotId: snapshotResult.snapshotId,
    })
  } catch (error) {
    console.error('Error updating reassessment:', error)
    return NextResponse.json(
      { error: 'Failed to update assessment' },
      { status: 500 }
    )
  }
}
