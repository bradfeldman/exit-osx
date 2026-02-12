// Audit logging helpers for admin dashboard
// All significant actions are logged for compliance and debugging

import { prisma } from '@/lib/prisma'
import { AdminContext } from './require-admin'

export type AuditAction =
  // User actions
  | 'user.view'
  | 'user.update'
  | 'user.disable'
  | 'user.enable'
  | 'user.password_reset'
  | 'user.force_logout'
  | 'user.delete'
  // Organization actions (legacy — kept for existing audit logs)
  | 'organization.view'
  | 'organization.update'
  | 'organization.member_add'
  | 'organization.member_remove'
  // Workspace actions
  | 'workspace.view'
  | 'workspace.update'
  | 'workspace.member_add'
  | 'workspace.member_remove'
  // Impersonation actions
  | 'impersonate.start'
  | 'impersonate.end'
  // Ticket actions
  | 'ticket.create'
  | 'ticket.update'
  | 'ticket.assign'
  | 'ticket.message'
  | 'ticket.resolve'
  | 'ticket.close'
  // Admin actions
  | 'admin.login'
  | 'admin.export_data'

export type TargetType =
  | 'User'
  | 'Organization'
  | 'Workspace'
  | 'SupportTicket'
  | 'ImpersonationSession'
  | 'System'

export interface AuditLogEntry {
  actorId: string
  actorEmail: string
  action: AuditAction
  targetType: TargetType
  targetId?: string | null
  metadata?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
  // SECURITY: Track impersonation context for accountability
  impersonationContext?: {
    /** The admin who is impersonating */
    adminId: string
    adminEmail: string
    /** The original user being impersonated (actorId is effective user) */
    impersonatedUserId: string
    impersonatedUserEmail: string
    /** Impersonation session ID for correlation */
    sessionId?: string
  } | null
}

/**
 * Create an audit log entry
 * SECURITY: If impersonation context is provided, it's included in metadata
 * This ensures all actions during impersonation are traceable to both
 * the admin performing the impersonation and the effective user
 */
export async function createAuditLog(entry: AuditLogEntry) {
  // Merge impersonation context into metadata if present
  let metadata = entry.metadata || {}
  if (entry.impersonationContext) {
    metadata = {
      ...metadata,
      _impersonation: {
        adminId: entry.impersonationContext.adminId,
        adminEmail: entry.impersonationContext.adminEmail,
        impersonatedUserId: entry.impersonationContext.impersonatedUserId,
        impersonatedUserEmail: entry.impersonationContext.impersonatedUserEmail,
        sessionId: entry.impersonationContext.sessionId,
        warning: 'This action was performed during an impersonation session',
      },
    }
  }

  return prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      actorEmail: entry.actorEmail,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: metadata as object | undefined,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    },
  })
}

/**
 * Create audit log from admin context
 * Convenience wrapper that extracts IP and user agent from context
 */
export async function logAdminAction(
  admin: AdminContext,
  action: AuditAction,
  targetType: TargetType,
  targetId?: string | null,
  metadata?: Record<string, unknown> | null
) {
  return createAuditLog({
    actorId: admin.user.id,
    actorEmail: admin.user.email,
    action,
    targetType,
    targetId,
    metadata,
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  })
}

/**
 * Get audit logs with filtering and pagination
 */
export interface AuditLogFilters {
  actorId?: string
  action?: AuditAction | string
  targetType?: TargetType
  targetId?: string
  startDate?: Date
  endDate?: Date
}

export interface AuditLogOptions {
  filters?: AuditLogFilters
  page?: number
  limit?: number
}

export async function getAuditLogs(options: AuditLogOptions = {}) {
  const { filters = {} } = options
  // SECURITY: Enforce pagination limits
  const page = Math.max(1, options.page || 1)
  const limit = Math.min(100, Math.max(1, options.limit || 50))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (filters.actorId) {
    where.actorId = filters.actorId
  }

  if (filters.action) {
    where.action = filters.action
  }

  if (filters.targetType) {
    where.targetType = filters.targetType
  }

  if (filters.targetId) {
    where.targetId = filters.targetId
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) {
      (where.createdAt as Record<string, Date>).gte = filters.startDate
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, Date>).lte = filters.endDate
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Export audit logs to CSV format
 */
export async function exportAuditLogsToCSV(filters: AuditLogFilters = {}) {
  // Set date range to 90 days if not specified
  const endDate = filters.endDate || new Date()
  const startDate = filters.startDate || new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)

  const logs = await prisma.auditLog.findMany({
    where: {
      actorId: filters.actorId,
      action: filters.action,
      targetType: filters.targetType,
      targetId: filters.targetId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      actor: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Build CSV
  const headers = ['Timestamp', 'Actor Email', 'Actor Name', 'Action', 'Target Type', 'Target ID', 'IP Address', 'User Agent', 'Metadata']
  const rows = logs.map((log: { createdAt: Date; actorEmail: string; actor: { name: string | null }; action: string; targetType: string; targetId: string | null; ipAddress: string | null; userAgent: string | null; metadata: unknown }) => [
    log.createdAt.toISOString(),
    log.actorEmail,
    log.actor.name || '',
    log.action,
    log.targetType,
    log.targetId || '',
    log.ipAddress || '',
    log.userAgent || '',
    log.metadata ? JSON.stringify(log.metadata) : '',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row: string[]) => row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  return csvContent
}
