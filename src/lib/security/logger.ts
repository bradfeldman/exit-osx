/**
 * Structured Security Logger
 * Provides consistent, structured logging for security events
 *
 * SECURITY: In production, these logs should be sent to a SIEM or log aggregator
 * for monitoring and alerting on security events
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security'

interface SecurityLogEntry {
  level: LogLevel
  event: string
  message: string
  userId?: string
  userEmail?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Format log entry for output
 */
function formatLogEntry(entry: SecurityLogEntry): string {
  if (isProduction) {
    // In production, output as JSON for log aggregators
    return JSON.stringify(entry)
  }

  // In development, output human-readable format
  const meta = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : ''
  return `[${entry.level.toUpperCase()}] [${entry.event}] ${entry.message}${meta}`
}

/**
 * Create a structured log entry
 */
function createLogEntry(
  level: LogLevel,
  event: string,
  message: string,
  context?: {
    userId?: string
    userEmail?: string
    ipAddress?: string
    userAgent?: string
    metadata?: Record<string, unknown>
  }
): SecurityLogEntry {
  return {
    level,
    event,
    message,
    userId: context?.userId,
    userEmail: context?.userEmail,
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
    metadata: context?.metadata,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Security logger with structured output
 */
export const securityLogger = {
  /**
   * Debug level - only in development
   */
  debug(event: string, message: string, context?: Parameters<typeof createLogEntry>[3]) {
    if (!isProduction) {
      const entry = createLogEntry('debug', event, message, context)
      console.debug(formatLogEntry(entry))
    }
  },

  /**
   * Info level - general security info
   */
  info(event: string, message: string, context?: Parameters<typeof createLogEntry>[3]) {
    const entry = createLogEntry('info', event, message, context)
    console.info(formatLogEntry(entry))
  },

  /**
   * Warning level - suspicious activity
   */
  warn(event: string, message: string, context?: Parameters<typeof createLogEntry>[3]) {
    const entry = createLogEntry('warn', event, message, context)
    console.warn(formatLogEntry(entry))
  },

  /**
   * Error level - security errors
   */
  error(event: string, message: string, context?: Parameters<typeof createLogEntry>[3]) {
    const entry = createLogEntry('error', event, message, context)
    console.error(formatLogEntry(entry))
  },

  /**
   * Security level - critical security events (always logged)
   */
  security(event: string, message: string, context?: Parameters<typeof createLogEntry>[3]) {
    const entry = createLogEntry('security', event, message, context)
    // In production, this could also send to a security alert system
    console.error(formatLogEntry(entry))
  },

  /**
   * Log authentication attempt
   */
  authAttempt(success: boolean, context: {
    email?: string
    ipAddress?: string
    userAgent?: string
    reason?: string
  }) {
    const event = success ? 'auth.success' : 'auth.failure'
    const message = success
      ? `Authentication successful for ${context.email}`
      : `Authentication failed for ${context.email}: ${context.reason || 'unknown'}`

    const entry = createLogEntry(success ? 'info' : 'warn', event, message, {
      userEmail: context.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { reason: context.reason },
    })

    if (success) {
      console.info(formatLogEntry(entry))
    } else {
      console.warn(formatLogEntry(entry))
    }
  },

  /**
   * Log rate limit event
   */
  rateLimited(context: {
    ipAddress?: string
    endpoint?: string
    userId?: string
  }) {
    const entry = createLogEntry('warn', 'rate_limit.exceeded', 'Rate limit exceeded', {
      userId: context.userId,
      ipAddress: context.ipAddress,
      metadata: { endpoint: context.endpoint },
    })
    console.warn(formatLogEntry(entry))
  },

  /**
   * Log access denied event
   */
  accessDenied(context: {
    userId?: string
    userEmail?: string
    resource?: string
    reason?: string
    ipAddress?: string
  }) {
    const entry = createLogEntry('warn', 'access.denied', `Access denied to ${context.resource}`, {
      userId: context.userId,
      userEmail: context.userEmail,
      ipAddress: context.ipAddress,
      metadata: { resource: context.resource, reason: context.reason },
    })
    console.warn(formatLogEntry(entry))
  },

  /**
   * Log impersonation event
   */
  impersonation(action: 'start' | 'end', context: {
    adminId: string
    adminEmail: string
    targetUserId: string
    targetUserEmail: string
    reason?: string
    ipAddress?: string
  }) {
    const event = action === 'start' ? 'impersonation.start' : 'impersonation.end'
    const message = action === 'start'
      ? `Admin ${context.adminEmail} started impersonating ${context.targetUserEmail}`
      : `Admin ${context.adminEmail} ended impersonation of ${context.targetUserEmail}`

    const entry = createLogEntry('security', event, message, {
      userId: context.adminId,
      userEmail: context.adminEmail,
      ipAddress: context.ipAddress,
      metadata: {
        targetUserId: context.targetUserId,
        targetUserEmail: context.targetUserEmail,
        reason: context.reason,
      },
    })
    console.error(formatLogEntry(entry)) // Security events always error level
  },
}
