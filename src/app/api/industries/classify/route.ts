import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  classifyBusiness,
  ClassificationError,
} from '@/lib/ai/business-classifier'
import { applyRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'
import { z } from 'zod'
import { validateRequestBody, uuidSchema } from '@/lib/security/validation'

const classifySchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  companyId: uuidSchema.optional(),
})

/**
 * POST /api/industries/classify
 *
 * AI-powered business classification from freeform description.
 * Replaces the OpenAI-based /api/industries/match endpoint with
 * a Claude-based classifier that returns richer results.
 *
 * Request: { description: string, companyId?: string }
 * Response: ClassificationResult
 *
 * Auth: Required (user must be logged in)
 * Rate limiting: SEC-034 — 10 requests/minute per IP
 */
export async function POST(request: Request) {
  // SEC-034: Rate limit AI endpoints
  const rl = await applyRateLimit(request, RATE_LIMIT_CONFIGS.AI)
  if (!rl.success) return createRateLimitResponse(rl)

  // ── Auth check ─────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'You must be logged in to classify a business' },
      { status: 401 }
    )
  }

  // ── Parse and validate request ─────────────────────────────────────
  const validation = await validateRequestBody(request, classifySchema)
  if (!validation.success) return validation.error
  const { description, companyId } = validation.data

  // ── Classify ───────────────────────────────────────────────────────
  try {
    const result = await classifyBusiness(description, companyId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof ClassificationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 }
      )
    }

    console.error('[/api/industries/classify] Unexpected error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json(
      { error: 'Failed to classify business description' },
      { status: 500 }
    )
  }
}
