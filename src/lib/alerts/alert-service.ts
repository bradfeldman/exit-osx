import { prisma } from '@/lib/prisma'
import { AlertType, Prisma } from '@prisma/client'

export interface CreateAlertData {
  recipientId: string
  type: AlertType
  title: string
  message: string
  actionUrl?: string
  metadata?: Record<string, unknown>
}

export interface AlertListOptions {
  unreadOnly?: boolean
  limit?: number
  offset?: number
  types?: AlertType[]
}

export interface AlertWithMeta {
  id: string
  type: AlertType
  title: string
  message: string
  actionUrl: string | null
  metadata: Record<string, unknown> | null
  isRead: boolean
  readAt: Date | null
  createdAt: Date
}

/**
 * Create a new alert for a user
 */
export async function createAlert(data: CreateAlertData): Promise<AlertWithMeta> {
  const alert = await prisma.alert.create({
    data: {
      recipientId: data.recipientId,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      metadata: data.metadata as Prisma.InputJsonValue | undefined,
    },
  })

  return {
    id: alert.id,
    type: alert.type,
    title: alert.title,
    message: alert.message,
    actionUrl: alert.actionUrl,
    metadata: alert.metadata as Record<string, unknown> | null,
    isRead: alert.isRead,
    readAt: alert.readAt,
    createdAt: alert.createdAt,
  }
}

/**
 * Get alerts for a user
 */
export async function getUserAlerts(
  userId: string,
  options: AlertListOptions = {}
): Promise<AlertWithMeta[]> {
  const { unreadOnly = false, limit = 50, offset = 0, types } = options

  const alerts = await prisma.alert.findMany({
    where: {
      recipientId: userId,
      ...(unreadOnly && { isRead: false }),
      ...(types && { type: { in: types } }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return alerts.map(alert => ({
    id: alert.id,
    type: alert.type,
    title: alert.title,
    message: alert.message,
    actionUrl: alert.actionUrl,
    metadata: alert.metadata as Record<string, unknown> | null,
    isRead: alert.isRead,
    readAt: alert.readAt,
    createdAt: alert.createdAt,
  }))
}

/**
 * Mark a single alert as read
 */
export async function markAsRead(alertId: string, userId: string): Promise<boolean> {
  const result = await prisma.alert.updateMany({
    where: {
      id: alertId,
      recipientId: userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  return result.count > 0
}

/**
 * Mark all alerts as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.alert.updateMany({
    where: {
      recipientId: userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  return result.count
}

/**
 * Get unread alert count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.alert.count({
    where: {
      recipientId: userId,
      isRead: false,
    },
  })
}

/**
 * Delete old read alerts (for cleanup)
 */
export async function deleteOldAlerts(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const result = await prisma.alert.deleteMany({
    where: {
      isRead: true,
      createdAt: { lt: cutoffDate },
    },
  })

  return result.count
}

// ============================================
// Alert Creation Helpers
// ============================================

/**
 * Create an access request alert for the owner
 */
export async function createAccessRequestAlert(
  ownerId: string,
  requesterName: string,
  featureKey: string,
  companyName: string,
  requestId: string
): Promise<AlertWithMeta> {
  const featureNames: Record<string, string> = {
    'pfs': 'Personal Financial Statements',
    'retirement': 'Retirement Calculator',
    'loans': 'Business Loans',
  }

  const featureName = featureNames[featureKey] || featureKey

  return createAlert({
    recipientId: ownerId,
    type: 'ACCESS_REQUEST',
    title: 'Access Request',
    message: `${requesterName} has requested access to ${featureName} for ${companyName}`,
    actionUrl: `/dashboard/settings/company?tab=access-requests`,
    metadata: { requestId, featureKey, requesterName, companyName },
  })
}

/**
 * Create an access granted alert for staff
 */
export async function createAccessGrantedAlert(
  staffId: string,
  featureKey: string,
  companyName: string
): Promise<AlertWithMeta> {
  const featureNames: Record<string, string> = {
    'pfs': 'Personal Financial Statements',
    'retirement': 'Retirement Calculator',
    'loans': 'Business Loans',
  }

  const featureName = featureNames[featureKey] || featureKey

  return createAlert({
    recipientId: staffId,
    type: 'ACCESS_GRANTED',
    title: 'Access Granted',
    message: `Your request for ${featureName} access on ${companyName} has been approved`,
    metadata: { featureKey, companyName },
  })
}

/**
 * Create an access denied alert for staff
 */
export async function createAccessDeniedAlert(
  staffId: string,
  featureKey: string,
  companyName: string
): Promise<AlertWithMeta> {
  const featureNames: Record<string, string> = {
    'pfs': 'Personal Financial Statements',
    'retirement': 'Retirement Calculator',
    'loans': 'Business Loans',
  }

  const featureName = featureNames[featureKey] || featureKey

  return createAlert({
    recipientId: staffId,
    type: 'ACCESS_DENIED',
    title: 'Access Denied',
    message: `Your request for ${featureName} access on ${companyName} was not approved`,
    metadata: { featureKey, companyName },
  })
}

/**
 * Create a staff paused alert
 */
export async function createStaffPausedAlert(
  staffId: string,
  companyName: string,
  reason: string
): Promise<AlertWithMeta> {
  return createAlert({
    recipientId: staffId,
    type: 'STAFF_PAUSED',
    title: 'Access Paused',
    message: `Your access to ${companyName} has been paused: ${reason}`,
    metadata: { companyName, reason },
  })
}

/**
 * Create ownership transfer alert
 */
export async function createOwnershipTransferAlert(
  newOwnerId: string,
  companyName: string,
  previousOwnerName: string
): Promise<AlertWithMeta> {
  return createAlert({
    recipientId: newOwnerId,
    type: 'OWNERSHIP_TRANSFER',
    title: 'Ownership Transferred',
    message: `You are now the subscribing owner of ${companyName} (transferred from ${previousOwnerName})`,
    actionUrl: `/dashboard`,
    metadata: { companyName, previousOwnerName },
  })
}

/**
 * Create trial ending soon alert
 */
export async function createTrialEndingAlert(
  userId: string,
  daysRemaining: number
): Promise<AlertWithMeta> {
  return createAlert({
    recipientId: userId,
    type: 'TRIAL_ENDING',
    title: 'Trial Ending Soon',
    message: `Your trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Subscribe to keep your Exit-Ready features.`,
    actionUrl: `/dashboard/settings/organization?tab=billing`,
    metadata: { daysRemaining },
  })
}

/**
 * Create trial expired alert
 */
export async function createTrialExpiredAlert(userId: string): Promise<AlertWithMeta> {
  return createAlert({
    recipientId: userId,
    type: 'TRIAL_EXPIRED',
    title: 'Trial Expired',
    message: 'Your trial has ended. Subscribe to regain access to premium features.',
    actionUrl: `/dashboard/settings/organization?tab=billing`,
  })
}
