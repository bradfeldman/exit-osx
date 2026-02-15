import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/service'
import { EmailType } from '@/lib/email/types'
import { verifyCronAuth } from '@/lib/security/cron-auth'
import { z } from 'zod'
import { validateRequestBody, emailSchema, uuidSchema } from '@/lib/security/validation'

const postSchema = z.object({
  userId: uuidSchema,
  companyId: uuidSchema.optional(),
  emailType: z.enum([
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
  ]),
  to: emailSchema,
  subject: z.string().min(1).max(500),
  html: z.string().min(1).max(100000),
  skipPreferenceCheck: z.boolean().default(false),
})

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

  const validation = await validateRequestBody(request, postSchema)
  if (!validation.success) return validation.error
  const { userId, companyId, emailType, to, subject, html, skipPreferenceCheck } = validation.data

  try {

    // Send the email
    const result = await sendEmail({
      userId,
      companyId,
      emailType,
      to,
      subject,
      html,
      skipPreferenceCheck,
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
