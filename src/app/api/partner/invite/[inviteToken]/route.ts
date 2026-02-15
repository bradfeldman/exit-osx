import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import {
  applyRateLimit,
  RATE_LIMIT_CONFIGS,
  createRateLimitResponse,
} from '@/lib/security'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

// GET — Validate invite token
// SECURITY FIX (PROD-060): Added rate limiting to prevent token enumeration
export async function GET(
  request: Request,
  { params }: { params: Promise<{ inviteToken: string }> }
) {
  const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.TOKEN)
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }
  const { inviteToken } = await params

  const partner = await prisma.accountabilityPartner.findUnique({
    where: { inviteToken },
    include: {
      company: { select: { name: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  })

  if (!partner || !partner.isActive) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
  }

  return NextResponse.json({
    companyName: partner.company.name,
    inviterName: partner.invitedBy.name || partner.invitedBy.email,
    alreadyAccepted: !!partner.acceptedAt,
  })
}

const postSchema = z.object({
  name: z.string().max(200).optional(),
})

// POST — Accept invite
// SECURITY FIX (PROD-060): Added rate limiting
export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteToken: string }> }
) {
  const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.TOKEN)
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }
  const { inviteToken } = await params

  const partner = await prisma.accountabilityPartner.findUnique({
    where: { inviteToken },
  })

  if (!partner || !partner.isActive) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
  }

  if (partner.acceptedAt) {
    return NextResponse.json({ error: 'Already accepted' }, { status: 400 })
  }

  const validation = await validateRequestBody(request, postSchema)
  if (!validation.success) return validation.error
  const { name } = validation.data

  await prisma.accountabilityPartner.update({
    where: { inviteToken },
    data: {
      acceptedAt: new Date(),
      name: name || partner.name,
    },
  })

  return NextResponse.json({
    success: true,
    accessToken: partner.accessToken,
  })
}
