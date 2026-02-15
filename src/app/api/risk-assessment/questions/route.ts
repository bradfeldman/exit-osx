import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateRiskFocusedQuestions } from '@/lib/ai/risk-questions'
import { prisma } from '@/lib/prisma'
import { applyRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const schema = z.object({
  companyId: z.string().uuid(),
  businessDescription: z.string().max(5000).optional().nullable(),
  riskResults: z.object({
    briScore: z.coerce.number().finite().min(0).max(100),
    categoryScores: z.record(z.string(), z.coerce.number().finite()),
    valueGapByCategory: z.record(z.string(), z.coerce.number().finite()),
  }),
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
  const { companyId, businessDescription, riskResults } = validation.data

  try {

    // Get company to verify ownership
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, icbSubSector: true }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Generate risk-focused questions using AI
    const { data, usage } = await generateRiskFocusedQuestions(
      businessDescription || '',
      company.icbSubSector || '',
      riskResults
    )

    // Log AI usage (non-blocking)
    prisma.aIGenerationLog.create({
      data: {
        companyId,
        generationType: 'risk_focused_questions',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        modelUsed: 'claude-haiku',
        inputData: {
          businessDescription: businessDescription?.substring(0, 500),
          industry: company.icbSubSector,
          briScore: riskResults.briScore,
        },
        outputData: JSON.parse(JSON.stringify(data)),
      }
    }).catch(err => console.error('Failed to log AI usage:', err instanceof Error ? err.message : String(err)))

    return NextResponse.json({ questions: data.questions })
  } catch (error) {
    console.error('Error generating risk-focused questions:', error instanceof Error ? error.message : String(error))
    const message = error instanceof Error ? error.message : 'Failed to generate questions'

    if (message.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service not configured. Please contact support.' },
        { status: 503 }
      )
    }

    // SECURITY FIX (PROD-060): Removed error.message from response to prevent leaking internal details
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}
