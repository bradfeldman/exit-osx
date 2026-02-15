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

/**
 * POST /api/assess/classify
 *
 * Public (no auth) endpoint for ICB classification from business description.
 * Rate-limited to prevent abuse.
 */
export async function POST(request: Request) {
  // Rate limit: 10 requests per minute per IP
  const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.SENSITIVE)
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }

  let body: { description?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { description } = body

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return NextResponse.json(
      { error: 'Description must be at least 10 characters' },
      { status: 400 }
    )
  }

  try {
    const result = await classifyBusiness(description)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof ClassificationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 })
    }
    console.error('[/api/assess/classify] Error:', err)
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 })
  }
}
