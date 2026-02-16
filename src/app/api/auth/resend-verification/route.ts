import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email/send-welcome-email'

/**
 * POST /api/auth/resend-verification
 *
 * Resends the verification email to the currently authenticated user.
 * Generates a new magic link and sends the welcome verification email.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if already verified
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { id: true, email: true, emailVerified: true },
  })

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (dbUser.emailVerified) {
    return NextResponse.json({ alreadyVerified: true })
  }

  // Generate a new magic link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const adminClient = createServiceClient()

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: dbUser.email,
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
    },
  })

  if (linkError) {
    console.error('[resend-verification] generateLink error:', linkError.message)
    return NextResponse.json({ error: 'Failed to generate verification link' }, { status: 500 })
  }

  const hashedToken = linkData?.properties?.hashed_token
  if (!hashedToken) {
    console.error('[resend-verification] No hashed_token from generateLink')
    return NextResponse.json({ error: 'Failed to generate verification link' }, { status: 500 })
  }

  const verifyType = linkData.properties?.verification_type === 'magiclink'
    ? 'email'
    : (linkData.properties?.verification_type ?? 'email')
  const magicLinkUrl = `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=${verifyType}&next=/dashboard`

  // Send welcome email
  const emailResult = await sendWelcomeEmail({ email: dbUser.email, magicLinkUrl })

  if (!emailResult.success) {
    console.error('[resend-verification] Email send failed:', emailResult.error)
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
