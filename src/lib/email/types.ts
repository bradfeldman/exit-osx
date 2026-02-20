/**
 * Email notification types and interfaces
 */

export type EmailType =
  | 'ONBOARDING_COMPLETE'
  | 'DRIFT_REPORT'
  | 'SIGNAL_ALERT'
  | 'WEEKLY_CHECKIN'
  | 'WEEKLY_DIGEST'
  | 'INACTIVITY_NUDGE'
  | 'TASK_REMINDER'
  | 'TASK_DELEGATION'
  | 'PARTNER_INVITE'
  | 'PARTNER_MONTHLY_SUMMARY'
  | 'PARTNER_NUDGE'
  | 'ACCOUNT_EXISTS'
  | 'WELCOME_VERIFICATION'
  | 'VERIFICATION_CONGRATS'
  | 'TRIAL_WELCOME'
  | 'TRIAL_MIDPOINT'
  | 'TRIAL_ENDING_SOON'
  | 'TRIAL_LAST_DAY'
  | 'TRIAL_EXPIRED'
  | 'TRIAL_WINBACK_14'
  | 'TRIAL_WINBACK_30'
  | 'ASSESS_DRIP_DAY_0'
  | 'ASSESS_DRIP_DAY_2'
  | 'ASSESS_DRIP_DAY_5'

export type EmailFrequency = 'REALTIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NEVER'

export interface EmailPreferences {
  userId: string
  frequency: EmailFrequency
  enabledTypes: EmailType[]
  unsubscribedAt?: Date | null
  unsubscribeToken?: string | null
}

export interface EmailLog {
  id: string
  userId: string
  companyId?: string | null
  emailType: EmailType
  recipientEmail: string
  subject: string
  success: boolean
  error?: string | null
  sentAt: Date
}

export interface SendEmailResult {
  success: boolean
  error?: string
  logId?: string
}

export interface EmailContext {
  userId: string
  email: string
  name?: string
  companyId?: string
  companyName?: string
}

// Re-export to avoid circular dependency issues
export interface SendEmailResult {
  success: boolean
  error?: string
  logId?: string
}
