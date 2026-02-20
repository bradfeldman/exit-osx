import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  applyRateLimit,
  RATE_LIMIT_CONFIGS,
  createRateLimitResponse,
  getClientIdentifier,
} from '@/lib/security/rate-limit'
import { sendDay0Email } from '@/lib/email/assess-drip'

const emailCaptureSchema = z.object({
  email: z.string().email('Invalid email').transform(val => val.toLowerCase().trim()),
  assessmentData: z.object({
    briScore: z.coerce.number().finite().min(0).max(100).optional(),
    currentValue: z.coerce.number().finite().min(0).optional(),
    potentialValue: z.coerce.number().finite().min(0).optional(),
    topRisk: z.string().max(200).optional(),
  }).optional(),
})

/**
 * POST /api/assess/email
 *
 * Stores a lead email from the soft email capture on the results page.
 * No auth required. Rate limited to 5/hour per IP.
 */
export async function POST(request: Request) {
  // Rate limit: 5/hour per IP (use AUTH config: 5/min is stricter but fine for lead capture)
  const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.AUTH)
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = emailCaptureSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    )
  }

  const { email, assessmentData } = parsed.data
  const ipAddress = getClientIdentifier(request)

  try {
    // Check if email already belongs to a User
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json({ success: true, hasAccount: true })
    }

    // Store the lead
    const lead = await prisma.assessmentLead.create({
      data: {
        email,
        briScore: assessmentData?.briScore ? Math.round(assessmentData.briScore) : null,
        currentValue: assessmentData?.currentValue ?? null,
        potentialValue: assessmentData?.potentialValue ?? null,
        topRisk: assessmentData?.topRisk ?? null,
        ipAddress,
      },
    })

    // Fire Day 0 drip email (non-blocking — don't fail the request if email fails)
    sendDay0Email({
      id: lead.id,
      email: lead.email,
      briScore: lead.briScore,
      currentValue: lead.currentValue,
      potentialValue: lead.potentialValue,
      topRisk: lead.topRisk,
    })
      .then((sent) => {
        if (sent) {
          prisma.assessmentLead
            .update({ where: { id: lead.id }, data: { day0SentAt: new Date() } })
            .catch(() => {})
        }
      })
      .catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[assess/email] Error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Failed to save email' }, { status: 500 })
  }
}
