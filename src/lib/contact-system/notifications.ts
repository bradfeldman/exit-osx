/**
 * Contact System Notifications
 *
 * Handles notification triggers for the approval workflow.
 * Currently logs notifications - integrate with email/SMS/Slack as needed.
 */

import { ApprovalStatus } from '@prisma/client'

export type NotificationType =
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'APPROVAL_HOLD'
  | 'BUYER_ADDED'
  | 'STAGE_CHANGED'
  | 'VDR_ACCESS_GRANTED'

export interface NotificationPayload {
  type: NotificationType
  dealId: string
  dealName: string
  buyerId?: string
  buyerName?: string
  recipientIds: string[]
  recipientEmails?: string[]
  metadata?: Record<string, unknown>
}

export interface NotificationResult {
  success: boolean
  notificationId?: string
  error?: string
}

/**
 * Send a notification.
 * Currently logs to console - extend to integrate with email/SMS/webhook services.
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  try {
    // Log notification for now
    console.log('[Notification]', {
      type: payload.type,
      deal: payload.dealName,
      buyer: payload.buyerName,
      recipients: payload.recipientIds,
      timestamp: new Date().toISOString(),
    })

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // TODO: Integrate with Slack webhook
    // TODO: Store in notifications table for in-app notifications

    return {
      success: true,
      notificationId: `notif_${Date.now()}`,
    }
  } catch (error) {
    console.error('[Notification Error]', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send approval-related notifications.
 */
export async function notifyApprovalChange(params: {
  dealId: string
  dealName: string
  buyerId: string
  buyerName: string
  previousStatus: ApprovalStatus
  newStatus: ApprovalStatus
  changedByUserId: string
  note?: string
  recipientUserIds: string[]
}): Promise<NotificationResult> {
  let type: NotificationType

  switch (params.newStatus) {
    case ApprovalStatus.APPROVED:
      type = 'APPROVAL_GRANTED'
      break
    case ApprovalStatus.DENIED:
      type = 'APPROVAL_DENIED'
      break
    case ApprovalStatus.HOLD:
      type = 'APPROVAL_HOLD'
      break
    default:
      type = 'APPROVAL_REQUESTED'
  }

  return sendNotification({
    type,
    dealId: params.dealId,
    dealName: params.dealName,
    buyerId: params.buyerId,
    buyerName: params.buyerName,
    recipientIds: params.recipientUserIds,
    metadata: {
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      changedByUserId: params.changedByUserId,
      note: params.note,
    },
  })
}

/**
 * Notify when a new buyer is added to a deal.
 */
export async function notifyBuyerAdded(params: {
  dealId: string
  dealName: string
  buyerId: string
  buyerName: string
  addedByUserId: string
  recipientUserIds: string[]
}): Promise<NotificationResult> {
  return sendNotification({
    type: 'BUYER_ADDED',
    dealId: params.dealId,
    dealName: params.dealName,
    buyerId: params.buyerId,
    buyerName: params.buyerName,
    recipientIds: params.recipientUserIds,
    metadata: {
      addedByUserId: params.addedByUserId,
    },
  })
}

/**
 * Notify when a buyer's stage changes.
 */
export async function notifyStageChange(params: {
  dealId: string
  dealName: string
  buyerId: string
  buyerName: string
  previousStage: string
  newStage: string
  changedByUserId: string
  recipientUserIds: string[]
}): Promise<NotificationResult> {
  return sendNotification({
    type: 'STAGE_CHANGED',
    dealId: params.dealId,
    dealName: params.dealName,
    buyerId: params.buyerId,
    buyerName: params.buyerName,
    recipientIds: params.recipientUserIds,
    metadata: {
      previousStage: params.previousStage,
      newStage: params.newStage,
      changedByUserId: params.changedByUserId,
    },
  })
}

/**
 * Notify when VDR access is granted.
 */
export async function notifyVDRAccessGranted(params: {
  dealId: string
  dealName: string
  buyerId: string
  buyerName: string
  accessLevel: string
  recipientUserIds: string[]
  contactEmails?: string[]
}): Promise<NotificationResult> {
  return sendNotification({
    type: 'VDR_ACCESS_GRANTED',
    dealId: params.dealId,
    dealName: params.dealName,
    buyerId: params.buyerId,
    buyerName: params.buyerName,
    recipientIds: params.recipientUserIds,
    recipientEmails: params.contactEmails,
    metadata: {
      accessLevel: params.accessLevel,
    },
  })
}

/**
 * Email templates for approval notifications.
 */
export const EMAIL_TEMPLATES = {
  APPROVAL_REQUESTED: {
    subject: 'New Buyer Awaiting Approval: {{buyerName}}',
    body: `
A new buyer has been added to {{dealName}} and requires your approval.

Buyer: {{buyerName}}
Added by: {{addedBy}}
Date: {{date}}

Please review and approve or deny this buyer in the approval queue.

{{approvalLink}}
    `.trim(),
  },

  APPROVAL_GRANTED: {
    subject: 'Buyer Approved: {{buyerName}} for {{dealName}}',
    body: `
The following buyer has been approved for outreach:

Deal: {{dealName}}
Buyer: {{buyerName}}
Approved by: {{approvedBy}}
Date: {{date}}

The team can now proceed with contacting this buyer.
    `.trim(),
  },

  APPROVAL_DENIED: {
    subject: 'Buyer Denied: {{buyerName}} for {{dealName}}',
    body: `
The following buyer has been denied:

Deal: {{dealName}}
Buyer: {{buyerName}}
Denied by: {{deniedBy}}
Reason: {{reason}}
Date: {{date}}

No further outreach should be made to this buyer for this deal.
    `.trim(),
  },

  APPROVAL_HOLD: {
    subject: 'Buyer on Hold: {{buyerName}} for {{dealName}}',
    body: `
The following buyer has been placed on hold:

Deal: {{dealName}}
Buyer: {{buyerName}}
Updated by: {{updatedBy}}
Note: {{note}}
Date: {{date}}

Please do not proceed with outreach until the hold is lifted.
    `.trim(),
  },
} as const

/**
 * Render an email template with variables.
 */
export function renderEmailTemplate(
  templateKey: keyof typeof EMAIL_TEMPLATES,
  variables: Record<string, string>
): { subject: string; body: string } {
  const template = EMAIL_TEMPLATES[templateKey]

  const render = (text: string) => {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '')
  }

  return {
    subject: render(template.subject),
    body: render(template.body),
  }
}
