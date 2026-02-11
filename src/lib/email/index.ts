/**
 * Email notification system - centralized exports
 */

// Core service and types
export { sendEmail, getUnsubscribeLink } from './service'
export type { SendEmailOptions } from './service'
export type { EmailType, EmailFrequency, EmailPreferences, EmailLog, EmailContext, SendEmailResult } from './types'

// Preference management
export {
  canSendEmail,
  getUserEmailPreferences,
  updateEmailPreferences,
  unsubscribeUser,
  resubscribeUser,
  getUserByUnsubscribeToken,
} from './preferences'

// Email template functions
export { sendOnboardingCompleteEmail } from './send-onboarding-complete-email'
export { sendDriftReportEmail } from './send-drift-report-email'
export { sendSignalAlertEmail } from './send-signal-alert-email'
export { sendWeeklyDigestEmail } from './send-weekly-digest-email'
export { sendWeeklyCheckinEmail } from './send-weekly-checkin-email'
export { sendInactivityNudgeEmail } from './send-inactivity-nudge-email'
export { sendTaskReminderEmail } from './send-task-reminder-email'
export { sendTaskDelegationEmail } from './send-task-delegation-email'
export { sendPartnerInviteEmail } from './send-partner-invite-email'
export { sendPartnerMonthlySummaryEmail } from './send-partner-monthly-summary-email'
export { sendPartnerNudgeEmail } from './send-partner-nudge-email'
export { sendAccountExistsEmail } from './send-account-exists-email'
