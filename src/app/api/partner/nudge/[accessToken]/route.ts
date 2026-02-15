import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendPartnerNudgeEmail } from '@/lib/email/send-partner-nudge-email'
import {
  applyRateLimit,
  RATE_LIMIT_CONFIGS,
  createRateLimitResponse,
} from '@/lib/security'

// POST — Send a nudge to the founder
// SECURITY FIX (PROD-060): Added rate limiting to prevent abuse
export async function POST(
  request: Request,
  { params }: { params: Promise<{ accessToken: string }> }
) {
  const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.SENSITIVE)
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }
  const { accessToken } = await params

  const partner = await prisma.accountabilityPartner.findUnique({
    where: { accessToken },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          ownerships: {
            where: { isSubscribingOwner: true },
            include: {
              user: { select: { id: true, email: true, name: true } },
            },
            take: 1,
          },
        },
      },
    },
  })

  if (!partner || !partner.isActive || !partner.acceptedAt) {
    return NextResponse.json({ error: 'Invalid or inactive access' }, { status: 404 })
  }

  // Rate limit: max 1 nudge per 24 hours
  if (partner.lastNudgeAt && Date.now() - partner.lastNudgeAt.getTime() < 24 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: 'You can only send one nudge per day.' },
      { status: 429 }
    )
  }

  const owner = partner.company.ownerships[0]?.user
  if (!owner?.email) {
    return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
  }

  // Update last nudge time
  await prisma.accountabilityPartner.update({
    where: { accessToken },
    data: { lastNudgeAt: new Date() },
  })

  // Create an alert for the owner
  await prisma.alert.create({
    data: {
      recipientId: owner.id,
      type: 'PARTNER_NUDGE',
      title: 'Your accountability partner sent a nudge',
      message: `${partner.name || 'Your accountability partner'} wants to make sure you're staying on track with ${partner.company.name}.`,
      actionUrl: '/dashboard',
    },
  })

  // Send nudge email (non-blocking)
  sendPartnerNudgeEmail({
    email: owner.email,
    ownerName: owner.name || 'there',
    companyName: partner.company.name,
    partnerName: partner.name || undefined,
  }).catch(err => console.error('[Partner] Failed to send nudge email:', err instanceof Error ? err.message : String(err)))

  return NextResponse.json({ success: true })
}
