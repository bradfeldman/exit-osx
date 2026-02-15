import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aggregateDrivers } from '@/lib/ai/diagnosis'
import { prisma } from '@/lib/prisma'
import type { Subcategory, DiagnosticQuestion } from '@/lib/ai/types'
import { DiagnosisSubcategory } from '@prisma/client'
import { applyRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const schema = z.object({
  companyId: z.string().uuid(),
  subcategory: z.string().max(200),
  responses: z.array(z.object({
    questionId: z.string().max(100),
    selectedOptionId: z.string().max(100),
  })).max(100),
})

export async function POST(request: Request) {
  // SEC-034: Rate limit AI endpoints
  const rl = await applyRateLimit(request, RATE_LIMIT_CONFIGS.AI)
  if (!rl.success) return createRateLimitResponse(rl)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const validation = await validateRequestBody(request, schema)
  if (!validation.success) return validation.error
  const { companyId, subcategory, responses } = validation.data

  try {

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
    console.error('Error submitting diagnostic responses:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to submit responses' },
      { status: 500 }
    )
  }
}
