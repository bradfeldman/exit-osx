import { trackProductEvent } from './track-product-event'

/**
 * Playbook interaction analytics events.
 * Fired during Focus Mode playbook sessions and from contextual surfaces.
 *
 * Event schema matches PLAYBOOK-INTEGRATION-SPEC.md Appendix B.
 */

const CATEGORY = 'playbook' as const

export type PlaybookSource =
  | 'dashboard'
  | 'action-center'
  | 'signal'
  | 'ai-coach'
  | 'library'
  | 'hub'
  | 'diagnosis'
  | 'assessment'
  | 'direct'

export type PlaybookExitMethod = 'back' | 'close' | 'breadcrumb' | 'browser-back'

export function trackPlaybookOpened(
  userId: string,
  metadata: { playbookId: string; source: PlaybookSource; isResume: boolean }
) {
  trackProductEvent({
    userId,
    eventName: 'playbook.opened',
    eventCategory: CATEGORY,
    page: `/playbook/${metadata.playbookId}`,
    metadata,
  })
}

export function trackPlaybookSectionCompleted(
  userId: string,
  metadata: {
    playbookId: string
    sectionId: string
    sectionNumber: number
    totalSections: number
    timeSpentSeconds: number
  }
) {
  trackProductEvent({
    userId,
    eventName: 'playbook.section_completed',
    eventCategory: CATEGORY,
    page: `/playbook/${metadata.playbookId}/${metadata.sectionId}`,
    metadata,
  })
}

export function trackPlaybookSectionNavigated(
  userId: string,
  metadata: {
    playbookId: string
    sectionId: string
    direction: 'forward' | 'back' | 'jump'
  }
) {
  trackProductEvent({
    userId,
    eventName: 'playbook.section_navigated',
    eventCategory: CATEGORY,
    page: `/playbook/${metadata.playbookId}/${metadata.sectionId}`,
    metadata,
  })
}

export function trackPlaybookScoreUpdated(
  userId: string,
  metadata: {
    playbookId: string
    previousScore: number
    newScore: number
    delta: number
  }
) {
  trackProductEvent({
    userId,
    eventName: 'playbook.score_updated',
    eventCategory: CATEGORY,
    page: `/playbook/${metadata.playbookId}`,
    metadata,
  })
}

export function trackPlaybookCompleted(
  userId: string,
  metadata: {
    playbookId: string
    compositeScore: number
    totalTimeMinutes: number
    daysFromStart: number
  }
) {
  trackProductEvent({
    userId,
    eventName: 'playbook.completed',
    eventCategory: CATEGORY,
    page: `/playbook/${metadata.playbookId}`,
    metadata,
  })
}

export function trackPlaybookExited(
  userId: string,
  metadata: {
    playbookId: string
    exitMethod: PlaybookExitMethod
    percentComplete: number
  }
) {
  trackProductEvent({
    userId,
    eventName: 'playbook.exited',
    eventCategory: CATEGORY,
    page: `/playbook/${metadata.playbookId}`,
    metadata,
  })
}

export function trackPlaybookExported(
  userId: string,
  metadata: {
    playbookId: string
    exportFormat: 'text' | 'print'
  }
) {
  trackProductEvent({
    userId,
    eventName: 'playbook.exported',
    eventCategory: CATEGORY,
    page: `/playbook/${metadata.playbookId}`,
    metadata,
  })
}

export function trackPlaybookRecommendedClicked(
  userId: string,
  metadata: {
    playbookId: string
    surface: PlaybookSource
  }
) {
  trackProductEvent({
    userId,
    eventName: 'playbook.recommended_clicked',
    eventCategory: CATEGORY,
    metadata,
  })
}

export function trackPlaybookUpgradePrompted(
  userId: string,
  metadata: {
    playbookId: string
    sectionReached: number
  }
) {
  trackProductEvent({
    userId,
    eventName: 'playbook.upgrade_prompted',
    eventCategory: CATEGORY,
    page: `/playbook/${metadata.playbookId}`,
    metadata,
  })
}

export function trackPlaybookUpgradeConverted(
  userId: string,
  metadata: {
    playbookId: string
    previousPlan: string
  }
) {
  trackProductEvent({
    userId,
    eventName: 'playbook.upgrade_converted',
    eventCategory: CATEGORY,
    page: `/playbook/${metadata.playbookId}`,
    metadata,
  })
}
