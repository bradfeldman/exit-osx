import { prisma } from '@/lib/prisma'
import { EmailType, EmailFrequency, EmailPreferences } from './types'
import { randomBytes } from 'crypto'

/**
 * Check if a user can receive a specific type of email.
 * Respects unsubscribe status and email type preferences.
 */
export async function canSendEmail(userId: string, emailType: EmailType): Promise<boolean> {
  const prefs = await prisma.emailPreference.findUnique({
    where: { userId },
  })

  // No preferences = default to allowing all emails
  if (!prefs) {
    return true
  }

  // If globally unsubscribed, block all
  if (prefs.unsubscribedAt) {
    console.log(`[Email] User ${userId} has globally unsubscribed`)
    return false
  }

  // Check if this specific email type is enabled
  const enabledTypes = prefs.enabledTypes as EmailType[]
  if (!enabledTypes.includes(emailType)) {
    console.log(`[Email] User ${userId} has disabled ${emailType} emails`)
    return false
  }

  // Check frequency limits
  if (prefs.frequency === 'NEVER') {
    return false
  }

  return true
}

/**
 * Get user's email preferences. Creates default preferences if none exist.
 */
export async function getUserEmailPreferences(userId: string): Promise<EmailPreferences> {
  let prefs = await prisma.emailPreference.findUnique({
    where: { userId },
  })

  if (!prefs) {
    // Create default preferences - all emails enabled, weekly frequency
    const unsubscribeToken = randomBytes(32).toString('hex')
    prefs = await prisma.emailPreference.create({
      data: {
        userId,
        frequency: 'WEEKLY',
        enabledTypes: [
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
        ],
        unsubscribeToken,
      },
    })
  }

  return {
    userId: prefs.userId,
    frequency: prefs.frequency as EmailFrequency,
    enabledTypes: prefs.enabledTypes as EmailType[],
    unsubscribedAt: prefs.unsubscribedAt,
    unsubscribeToken: prefs.unsubscribeToken,
  }
}

/**
 * Update user's email preferences.
 */
export async function updateEmailPreferences(
  userId: string,
  updates: {
    frequency?: EmailFrequency
    enabledTypes?: EmailType[]
  }
): Promise<EmailPreferences> {
  const prefs = await prisma.emailPreference.upsert({
    where: { userId },
    update: updates,
    create: {
      userId,
      frequency: updates.frequency || 'WEEKLY',
      enabledTypes: updates.enabledTypes || [],
      unsubscribeToken: randomBytes(32).toString('hex'),
    },
  })

  return {
    userId: prefs.userId,
    frequency: prefs.frequency as EmailFrequency,
    enabledTypes: prefs.enabledTypes as EmailType[],
    unsubscribedAt: prefs.unsubscribedAt,
    unsubscribeToken: prefs.unsubscribeToken,
  }
}

/**
 * Globally unsubscribe a user from all emails.
 */
export async function unsubscribeUser(userId: string): Promise<void> {
  await prisma.emailPreference.upsert({
    where: { userId },
    update: {
      unsubscribedAt: new Date(),
      enabledTypes: [],
    },
    create: {
      userId,
      frequency: 'NEVER',
      enabledTypes: [],
      unsubscribedAt: new Date(),
      unsubscribeToken: randomBytes(32).toString('hex'),
    },
  })
}

/**
 * Re-subscribe a user to emails.
 */
export async function resubscribeUser(userId: string): Promise<void> {
  await prisma.emailPreference.update({
    where: { userId },
    data: {
      unsubscribedAt: null,
      frequency: 'WEEKLY',
      enabledTypes: [
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
      ],
    },
  })
}

/**
 * Find user by unsubscribe token.
 */
export async function getUserByUnsubscribeToken(token: string): Promise<{ userId: string; email: string } | null> {
  const prefs = await prisma.emailPreference.findUnique({
    where: { unsubscribeToken: token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  })

  if (!prefs) {
    return null
  }

  return {
    userId: prefs.user.id,
    email: prefs.user.email,
  }
}
