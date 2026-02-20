import { trackProductEvent } from './track-product-event'

/**
 * Assessment funnel analytics events.
 * Fired during the /assess unauthenticated onboarding flow.
 *
 * Note: For pre-auth events (no userId), pass 'anonymous' as userId.
 * The admin analytics can filter these separately.
 */

const CATEGORY = 'assessment' as const

export function trackAssessStarted(userId: string, metadata?: { referrer?: string }) {
  trackProductEvent({
    userId,
    eventName: 'assess_started',
    eventCategory: CATEGORY,
    page: '/assess',
    metadata,
  })
}

export function trackBusinessBasicsCompleted(
  userId: string,
  metadata: { revenueBand: string; hasDescription: boolean }
) {
  trackProductEvent({
    userId,
    eventName: 'assess_business_basics_completed',
    eventCategory: CATEGORY,
    page: '/assess',
    metadata,
  })
}

export function trackIndustryClassified(
  userId: string,
  metadata: { icbCode: string; confidence: number }
) {
  trackProductEvent({
    userId,
    eventName: 'assess_industry_classified',
    eventCategory: CATEGORY,
    page: '/assess',
    metadata,
  })
}

export function trackProfileCompleted(
  userId: string,
  metadata: { revenueModel: string; ownerRole: string }
) {
  trackProductEvent({
    userId,
    eventName: 'assess_profile_completed',
    eventCategory: CATEGORY,
    page: '/assess',
    metadata,
  })
}

export function trackScanQuestionAnswered(
  userId: string,
  metadata: { questionNumber: number; answer: string; category: string }
) {
  trackProductEvent({
    userId,
    eventName: 'assess_scan_question_answered',
    eventCategory: CATEGORY,
    page: '/assess',
    metadata,
  })
}

export function trackScanCompleted(
  userId: string,
  metadata: { timeSpentSeconds: number }
) {
  trackProductEvent({
    userId,
    eventName: 'assess_scan_completed',
    eventCategory: CATEGORY,
    page: '/assess',
    metadata,
  })
}

export function trackReviewCompleted(userId: string) {
  trackProductEvent({
    userId,
    eventName: 'assess_review_completed',
    eventCategory: CATEGORY,
    page: '/assess',
  })
}

export function trackResultsViewed(
  userId: string,
  metadata: { briScore: number; currentValue: number; potentialValue: number }
) {
  trackProductEvent({
    userId,
    eventName: 'assess_results_viewed',
    eventCategory: CATEGORY,
    page: '/assess/results',
    metadata,
  })
}

export function trackEmailCaptured(userId: string) {
  trackProductEvent({
    userId,
    eventName: 'assess_email_captured',
    eventCategory: CATEGORY,
    page: '/assess/results',
  })
}

export function trackEmailSkipped(userId: string) {
  trackProductEvent({
    userId,
    eventName: 'assess_email_skipped',
    eventCategory: CATEGORY,
    page: '/assess/results',
  })
}

export function trackAccountCreated(
  userId: string,
  metadata: { method: 'email' | 'google'; briScore: number }
) {
  trackProductEvent({
    userId,
    eventName: 'assess_account_created',
    eventCategory: CATEGORY,
    page: '/assess/results',
    metadata,
  })
}

export function trackAssessAbandoned(
  userId: string,
  metadata: { lastStep: number; timeSpentSeconds: number }
) {
  trackProductEvent({
    userId,
    eventName: 'assess_abandoned',
    eventCategory: CATEGORY,
    page: '/assess',
    metadata,
  })
}

export function trackDashboardFirstVisit(userId: string) {
  trackProductEvent({
    userId,
    eventName: 'dashboard_first_visit',
    eventCategory: CATEGORY,
    page: '/dashboard',
  })
}

export function trackFirstMoveStarted(
  userId: string,
  metadata: { taskId: string; category: string }
) {
  trackProductEvent({
    userId,
    eventName: 'first_move_started',
    eventCategory: CATEGORY,
    page: '/dashboard',
    metadata,
  })
}
