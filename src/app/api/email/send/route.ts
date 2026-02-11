import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/service'
import { EmailType } from '@/lib/email/types'

/**
 * Internal API endpoint for triggering emails.
 * This is used by cron jobs, signal pipelines, and other internal services.
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
  try {
    // Auth check - only authenticated users or internal services
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // For now, require authentication. In future, add internal service token check.
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    console.error('[API] Error in email/send:', error)
    return NextResponse.json(
      // SECURITY FIX (PROD-060): Removed String(error) from response to prevent leaking stack traces
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
