import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { EmailType } from './types'
import { canSendEmail, getUserEmailPreferences } from './preferences'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface SendEmailOptions {
  userId: string
  companyId?: string
  emailType: EmailType
  to: string
  subject: string
  html: string
  skipPreferenceCheck?: boolean // For critical emails like password reset
}

export interface SendEmailResult {
  success: boolean
  error?: string
  logId?: string
}

/**
 * Rate limiting: Check if we've sent this email type to this user recently.
 * Prevents email spam and respects user preferences.
 */
async function checkRateLimit(userId: string, emailType: EmailType): Promise<boolean> {
  const rateLimits: Record<EmailType, number> = {
    SIGNAL_ALERT: 24 * 60 * 60 * 1000, // 24 hours
    DRIFT_REPORT: 30 * 24 * 60 * 60 * 1000, // 30 days
    WEEKLY_CHECKIN: 7 * 24 * 60 * 60 * 1000, // 7 days
    WEEKLY_DIGEST: 7 * 24 * 60 * 60 * 1000, // 7 days
    INACTIVITY_NUDGE: 21 * 24 * 60 * 60 * 1000, // 21 days
    TASK_REMINDER: 3 * 24 * 60 * 60 * 1000, // 3 days
    TASK_DELEGATION: 0, // No limit
    PARTNER_INVITE: 0, // No limit
    PARTNER_MONTHLY_SUMMARY: 30 * 24 * 60 * 60 * 1000, // 30 days
    PARTNER_NUDGE: 7 * 24 * 60 * 60 * 1000, // 7 days
    ONBOARDING_COMPLETE: 0, // No limit
    ACCOUNT_EXISTS: 0, // No limit
  }

  const limit = rateLimits[emailType]
  if (limit === 0) {
    return true // No rate limit
  }

  const cutoff = new Date(Date.now() - limit)
  const recentEmail = await prisma.emailLog.findFirst({
    where: {
      userId,
      emailType,
      sentAt: { gte: cutoff },
      success: true,
    },
    orderBy: { sentAt: 'desc' },
  })

  if (recentEmail) {
    console.log(
      `[Email] Rate limit hit for ${emailType} to user ${userId}. Last sent: ${recentEmail.sentAt.toISOString()}`
    )
    return false
  }

  return true
}

/**
 * Log email send attempt to database.
 */
async function logEmail(
  userId: string,
  companyId: string | undefined,
  emailType: EmailType,
  to: string,
  subject: string,
  success: boolean,
  error?: string
): Promise<string> {
  const log = await prisma.emailLog.create({
    data: {
      userId,
      companyId: companyId || null,
      emailType,
      recipientEmail: to,
      subject,
      success,
      error: error || null,
      sentAt: new Date(),
    },
  })

  return log.id
}

/**
 * Core email sending function.
 * Handles preference checking, rate limiting, sending via Resend, and logging.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { userId, companyId, emailType, to, subject, html, skipPreferenceCheck = false } = options

  // Check if Resend is configured
  if (!resend) {
    console.warn('[Email] Resend not configured, skipping email')
    const logId = await logEmail(userId, companyId, emailType, to, subject, false, 'Resend not configured')
    return { success: false, error: 'Email service not configured', logId }
  }

  // Check user preferences (unless skipped for critical emails)
  if (!skipPreferenceCheck) {
    const canSend = await canSendEmail(userId, emailType)
    if (!canSend) {
      const logId = await logEmail(userId, companyId, emailType, to, subject, false, 'User preference blocked')
      return { success: false, error: 'User has disabled this email type', logId }
    }

    // Check rate limit
    const withinRateLimit = await checkRateLimit(userId, emailType)
    if (!withinRateLimit) {
      const logId = await logEmail(userId, companyId, emailType, to, subject, false, 'Rate limit exceeded')
      return { success: false, error: 'Rate limit exceeded', logId }
    }
  }

  // Send the email
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
      to,
      subject,
      html,
    })

    console.log(`[Email] Successfully sent ${emailType} to ${to}`)
    const logId = await logEmail(userId, companyId, emailType, to, subject, true)
    return { success: true, logId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Email] Failed to send ${emailType} to ${to}:`, errorMessage)
    const logId = await logEmail(userId, companyId, emailType, to, subject, false, errorMessage)
    return { success: false, error: errorMessage, logId }
  }
}

/**
 * Generate unsubscribe link for email footers.
 */
export async function getUnsubscribeLink(userId: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const prefs = await getUserEmailPreferences(userId)
  if (!prefs.unsubscribeToken) {
    return `${baseUrl}/settings/notifications`
  }
  return `${baseUrl}/unsubscribe?token=${prefs.unsubscribeToken}`
}
