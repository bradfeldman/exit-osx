import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// DEBUG ENDPOINT - Remove after troubleshooting
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  console.log('[Debug] Checking invite token:', token)

  try {
    // Try to find the invite
    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
      }
    })

    // Also count total invites to verify DB connection
    const totalInvites = await prisma.organizationInvite.count()

    console.log('[Debug] Invite found:', !!invite, 'Total invites:', totalInvites)

    return NextResponse.json({
      found: !!invite,
      invite: invite ? {
        id: invite.id,
        emailHint: invite.email.substring(0, 3) + '***',
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        accepted: !!invite.acceptedAt,
      } : null,
      totalInvites,
      tokenSearched: token,
    })
  } catch (error) {
    console.error('[Debug] Database error:', error)
    return NextResponse.json({
      error: 'Database error',
      message: String(error),
    }, { status: 500 })
  }
}
