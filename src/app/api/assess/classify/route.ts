import { NextResponse } from 'next/server'
import {
  classifyBusiness,
  ClassificationError,
} from '@/lib/ai/business-classifier'
import {
  applyRateLimit,
  RATE_LIMIT_CONFIGS,
  createRateLimitResponse,
} from '@/lib/security/rate-limit'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const schema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be 2000 characters or less'),
  annualRevenue: z.coerce.number().finite().positive().optional(),
})

/**
 * POST /api/assess/classify
 *
 * Public (no auth) endpoint for ICB/GICS classification from business description.
 * Accepts optional annualRevenue for revenue-aware classification.
 * Rate-limited to prevent abuse.
 */
export async function POST(request: Request) {
  // Rate limit: 10 requests per minute per IP
  const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.SENSITIVE)
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }

  const validation = await validateRequestBody(request, schema)
  if (!validation.success) return validation.error
  const { description, annualRevenue } = validation.data

  try {
    const result = await classifyBusiness(description, undefined, annualRevenue)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof ClassificationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 })
    }
    console.error('[/api/assess/classify] Error:', err instanceof Error ? err.message : 'Classification failed')
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 })
  }
}
