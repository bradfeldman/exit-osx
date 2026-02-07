import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { sendPartnerInviteEmail } from '@/lib/email/send-partner-invite-email'

// GET — Get current accountability partner
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const partner = await prisma.accountabilityPartner.findUnique({
    where: { companyId },
    select: {
      id: true,
      email: true,
      name: true,
      acceptedAt: true,
      isActive: true,
      createdAt: true,
      lastEmailSentAt: true,
    },
  })

  return NextResponse.json({ partner })
}

// POST — Invite an accountability partner
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const body = await request.json()
  const { email, name } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Check if partner already exists
  const existing = await prisma.accountabilityPartner.findUnique({
    where: { companyId },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'An accountability partner already exists. Remove them first.' },
      { status: 409 }
    )
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  })

  const partner = await prisma.accountabilityPartner.create({
    data: {
      companyId,
      email,
      name: name || null,
      invitedByUserId: result.auth.user.id,
    },
  })

  // Send invite email (non-blocking)
  sendPartnerInviteEmail({
    email,
    partnerName: name || undefined,
    inviterName: result.auth.user.name || result.auth.user.email,
    companyName: company?.name || 'the company',
    inviteToken: partner.inviteToken,
  }).catch(err => console.error('[Partner] Failed to send invite email:', err))

  return NextResponse.json({ partner: { id: partner.id, email: partner.email, name: partner.name } }, { status: 201 })
}

// DELETE — Remove accountability partner
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const existing = await prisma.accountabilityPartner.findUnique({
    where: { companyId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'No partner found' }, { status: 404 })
  }

  await prisma.accountabilityPartner.delete({
    where: { companyId },
  })

  return NextResponse.json({ success: true })
}
