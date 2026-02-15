import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBusinessProfile } from '@/lib/ai/profile'
import { prisma } from '@/lib/prisma'
import type { ClarifyingQuestion } from '@/lib/ai/types'
import { applyRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const schema = z.object({
  businessDescription: z.string().min(1).max(5000),
  industry: z.string().max(500).optional().nullable(),
  revenueRange: z.string().max(200).optional().nullable(),
  answers: z.record(z.string(), z.string().max(5000)),
  questions: z.array(z.any()).max(50),
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
  const { businessDescription, industry, revenueRange, answers, questions } = validation.data

  try {

    const { data, usage } = await generateBusinessProfile(
      businessDescription,
      industry || '',
      revenueRange || '',
      answers,
      questions
    )

    // Log AI usage (non-blocking)
    prisma.aIGenerationLog.create({
      data: {
        generationType: 'business_profile',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        modelUsed: 'claude-sonnet',
        inputData: { businessDescription: businessDescription.substring(0, 500), industry, revenueRange },
        outputData: JSON.parse(JSON.stringify(data)),
      }
    }).catch(err => console.error('Failed to log AI usage:', err instanceof Error ? err.message : String(err)))

    return NextResponse.json({ profile: data })
  } catch (error) {
    console.error('Error generating business profile:', error instanceof Error ? error.message : String(error))
    // SECURITY FIX (PROD-060): Removed error.message from response to prevent leaking internal details
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service not configured. Please contact support.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to generate profile' },
      { status: 500 }
    )
  }
}
