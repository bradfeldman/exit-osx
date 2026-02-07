import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET — Validate invite token
export async function GET(
  request: Request,
  { params }: { params: Promise<{ inviteToken: string }> }
) {
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

// POST — Accept invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteToken: string }> }
) {
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

  const body = await request.json().catch(() => ({}))

  await prisma.accountabilityPartner.update({
    where: { inviteToken },
    data: {
      acceptedAt: new Date(),
      name: body.name || partner.name,
    },
  })

  return NextResponse.json({
    success: true,
    accessToken: partner.accessToken,
  })
}
