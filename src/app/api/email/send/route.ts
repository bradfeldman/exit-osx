import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/service'
import { EmailType } from '@/lib/email/types'
import { verifyCronAuth } from '@/lib/security/cron-auth'

/**
 * Internal API endpoint for triggering emails.
 * SECURITY: Restricted to cron jobs / internal services via CRON_SECRET.
 * Regular users cannot call this endpoint.
 *
 * Expected body:
 * {
 *   userId: string
 *   companyId?: string
 *   emailType: EmailType
 *   to: string
 *   subject: string
 *   html: string
 *   skipPreferenceCheck?: boolean
 * }
 */
export async function POST(request: Request) {
  // SECURITY FIX (SEC-031): Lock to cron/internal service auth only.
  // Previously any authenticated user could send arbitrary emails to any address.
  const authError = verifyCronAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, companyId, emailType, to, subject, html, skipPreferenceCheck } = body

    // Validate required fields
    if (!userId || !emailType || !to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, emailType, to, subject, html' },
        { status: 400 }
      )
    }

    // Validate email type
    const validEmailTypes: EmailType[] = [
      'ONBOARDING_COMPLETE',
      'DRIFT_REPORT',
      'SIGNAL_ALERT',
      'WEEKLY_CHECKIN',
      'WEEKLY_DIGEST',
      'INACTIVITY_NUDGE',
      'TASK_REMINDER',
      'TASK_DELEGATION',
      'PARTNER_INVITE',
      'PARTNER_MONTHLY_SUMMARY',
      'PARTNER_NUDGE',
      'ACCOUNT_EXISTS',
    ]

    if (!validEmailTypes.includes(emailType)) {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

    // Send the email
    const result = await sendEmail({
      userId,
      companyId,
      emailType,
      to,
      subject,
      html,
      skipPreferenceCheck: skipPreferenceCheck || false,
    })

    if (!result.success) {
      console.error('[API] Failed to send email:', result.error)
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          logId: result.logId,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      logId: result.logId,
    })
  } catch (error) {
    console.error('[API] Error in email/send:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
