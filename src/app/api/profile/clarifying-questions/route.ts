import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateClarifyingQuestions } from '@/lib/ai/profile'
import { prisma } from '@/lib/prisma'
import { applyRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'

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

  try {
    const body = await request.json()
    const { businessDescription, industry, revenueRange } = body

    if (!businessDescription) {
      return NextResponse.json(
        { error: 'Business description is required' },
        { status: 400 }
      )
    }

    const { data, usage } = await generateClarifyingQuestions(
      businessDescription,
      industry || '',
      revenueRange || ''
    )

    // Log AI usage (non-blocking)
    prisma.aIGenerationLog.create({
      data: {
        generationType: 'clarifying_questions',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        modelUsed: 'claude-haiku',
        inputData: { businessDescription: businessDescription.substring(0, 500), industry, revenueRange },
        outputData: JSON.parse(JSON.stringify(data)),
      }
    }).catch(err => console.error('Failed to log AI usage:', err))

    return NextResponse.json({ questions: data.questions })
  } catch (error) {
    console.error('Error generating clarifying questions:', error)
    // SECURITY FIX (PROD-060): Removed error.message from response to prevent leaking internal details
    const message = error instanceof Error ? error.message : 'Failed to generate questions'
    if (message.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service not configured. Please contact support.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}
