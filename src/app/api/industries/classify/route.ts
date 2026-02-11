import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  classifyBusiness,
  ClassificationError,
} from '@/lib/ai/business-classifier'

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
 * Rate limiting: Inherent via AI call cost
 */
export async function POST(request: Request) {
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

  // ── Parse request ──────────────────────────────────────────────────
  let body: { description?: string; companyId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  const { description, companyId } = body

  if (!description || typeof description !== 'string') {
    return NextResponse.json(
      { error: 'description is required and must be a string' },
      { status: 400 }
    )
  }

  if (description.trim().length < 10) {
    return NextResponse.json(
      { error: 'Description must be at least 10 characters' },
      { status: 400 }
    )
  }

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

    console.error('[/api/industries/classify] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Failed to classify business description' },
      { status: 500 }
    )
  }
}
