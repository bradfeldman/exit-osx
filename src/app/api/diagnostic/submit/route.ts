import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aggregateDrivers } from '@/lib/ai/diagnosis'
import { prisma } from '@/lib/prisma'
import type { Subcategory, DiagnosticQuestion } from '@/lib/ai/types'
import { DiagnosisSubcategory } from '@prisma/client'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { companyId, subcategory, responses } = body as {
      companyId: string
      subcategory: Subcategory
      responses: Array<{
        questionId: string
        selectedOptionId: string
      }>
    }

    if (!companyId || !subcategory || !responses) {
      return NextResponse.json(
        { error: 'Company ID, subcategory, and responses are required' },
        { status: 400 }
      )
    }

    // Get the stored questions to validate responses
    const storedQuestions = await prisma.companyDiagnosticQuestions.findUnique({
      where: {
        companyId_subcategory: {
          companyId,
          subcategory: subcategory as DiagnosisSubcategory,
        }
      }
    })

    if (!storedQuestions) {
      return NextResponse.json(
        { error: 'Questions not found' },
        { status: 404 }
      )
    }

    const questions = storedQuestions.questions as unknown as DiagnosticQuestion[]

    // Build response data with driver info
    const responsesWithDrivers = responses.map((r) => {
      const question = questions.find((q) => q.id === r.questionId)
      const option = question?.options.find((o) => o.id === r.selectedOptionId)
      return {
        questionId: r.questionId,
        selectedOptionId: r.selectedOptionId,
        drivers: option?.drivers || [],
        severity: option?.severity || 'low',
        scoreImpact: option?.scoreImpact || 0,
      }
    })

    // Calculate average score impact
    const averageScore = responsesWithDrivers.reduce(
      (sum, r) => sum + r.scoreImpact,
      0
    ) / responsesWithDrivers.length

    // Aggregate drivers
    const identifiedDrivers = aggregateDrivers(
      responsesWithDrivers.map((r) => ({
        drivers: r.drivers,
        severity: r.severity as 'high' | 'medium' | 'low',
      }))
    )

    // Store responses
    await prisma.companyDiagnosticResponses.create({
      data: {
        companyId,
        questionSetId: storedQuestions.id,
        subcategory: subcategory as DiagnosisSubcategory,
        responses: JSON.parse(JSON.stringify(responsesWithDrivers)),
        identifiedDrivers: JSON.parse(JSON.stringify(identifiedDrivers)),
        scoreBefore: Math.round(averageScore),
      }
    })

    return NextResponse.json({
      score: Math.round(averageScore),
      identifiedDrivers,
    })
  } catch (error) {
    console.error('Error submitting diagnostic responses:', error)
    return NextResponse.json(
      { error: 'Failed to submit responses' },
      { status: 500 }
    )
  }
}
