/**
 * Error Sanitization Module
 * Prevents information leakage through verbose error messages
 *
 * SECURITY: Detailed errors aid reconnaissance attacks
 * - Show generic messages to clients
 * - Log detailed errors server-side
 */

import { NextResponse } from 'next/server'

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Generic error messages for common scenarios
 * These reveal nothing about system internals
 */
export const GENERIC_ERRORS = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Invalid request',
  CONFLICT: 'Operation could not be completed',
  RATE_LIMITED: 'Too many requests',
  INTERNAL: 'An error occurred',
  VALIDATION: 'Invalid input',
  EXPIRED: 'This link has expired',
  INVALID_TOKEN: 'Invalid or expired token',
} as const

export type GenericErrorType = keyof typeof GENERIC_ERRORS

/**
 * Create a sanitized error response
 * In development, includes detailed error info
 * In production, shows only generic message
 */
export function createSanitizedError(
  type: GenericErrorType,
  status: number,
  internalMessage?: string,
  internalDetails?: unknown
): NextResponse {
  // Always log detailed error server-side
  if (internalMessage) {
    console.error(`[Security] ${type}: ${internalMessage}`, internalDetails || '')
  }

  const responseBody: Record<string, unknown> = {
    error: GENERIC_ERRORS[type],
  }

  // In development, include details for debugging
  if (isDevelopment && internalMessage) {
    responseBody._debug = {
      message: internalMessage,
      details: internalDetails,
    }
  }

  return NextResponse.json(responseBody, { status })
}

/**
 * Sanitize error for client response
 * Strips sensitive information like stack traces, SQL queries, etc.
 */
export function sanitizeErrorForClient(error: unknown): string {
  // In development, show the actual error
  if (isDevelopment && error instanceof Error) {
    return error.message
  }

  // In production, always return generic message
  return GENERIC_ERRORS.INTERNAL
}

/**
 * Check if error message contains sensitive patterns
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /credential/i,
  /api[-_]?key/i,
  /auth/i,
  /bearer/i,
  /connection.*string/i,
  /database/i,
  /sql/i,
  /query/i,
  /postgres/i,
  /mysql/i,
  /mongo/i,
  /redis/i,
  /supabase/i,
  /prisma/i,
  /stack/i,
  /trace/i,
  /\.ts:/i,
  /\.js:/i,
  /node_modules/i,
  /at\s+\w+\s+\(/i, // Stack trace pattern
]

export function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(message))
}

/**
 * Safe error wrapper for try-catch blocks
 */
export function handleApiError(
  error: unknown,
  context: string
): NextResponse {
  // Log full error server-side
  console.error(`[API Error] ${context}:`, error)

  // Check for specific error types
  if (error instanceof Error) {
    // Prisma errors
    if (error.message.includes('Unique constraint')) {
      return createSanitizedError('CONFLICT', 409, error.message)
    }

    if (error.message.includes('Record to update not found') ||
        error.message.includes('Record not found')) {
      return createSanitizedError('NOT_FOUND', 404, error.message)
    }

    // Foreign key constraint
    if (error.message.includes('Foreign key constraint')) {
      return createSanitizedError('BAD_REQUEST', 400, error.message)
    }
  }

  // Default to internal error
  return createSanitizedError(
    'INTERNAL',
    500,
    error instanceof Error ? error.message : 'Unknown error'
  )
}

/**
 * Middleware to ensure no sensitive data leaks in responses
 * Use in API routes before returning responses
 */
export function ensureSafeResponse(response: NextResponse): NextResponse {
  // In production, we could add additional checks here
  // For now, just return the response
  return response
}
