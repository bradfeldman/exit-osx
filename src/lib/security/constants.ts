/**
 * Security Constants
 * Centralized security-related configuration values
 */

// =============================================================================
// URL & Token Lifetimes
// =============================================================================

/**
 * Signed URL expiry for file downloads (in seconds)
 * SECURITY: Reduced from 3600 (1 hour) to limit exposure window
 * 5 minutes is sufficient for immediate download
 */
export const SIGNED_URL_EXPIRY_SECONDS = 300 // 5 minutes

/**
 * Signed URL expiry for previews (in seconds)
 * Slightly longer to allow for document viewing
 */
export const SIGNED_URL_PREVIEW_EXPIRY_SECONDS = 600 // 10 minutes

/**
 * Impersonation session lifetime (in minutes)
 */
export const IMPERSONATION_EXPIRY_MINUTES = 30

/**
 * Admin verification cookie lifetime (in seconds)
 */
export const ADMIN_COOKIE_EXPIRY_SECONDS = 15 * 60 // 15 minutes

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * Rate limit for authentication endpoints (requests per minute)
 */
export const AUTH_RATE_LIMIT = 5

/**
 * Rate limit for sensitive operations (requests per minute)
 */
export const SENSITIVE_RATE_LIMIT = 10

/**
 * Rate limit for general API endpoints (requests per minute)
 */
export const API_RATE_LIMIT = 60

// =============================================================================
// Pagination
// =============================================================================

/**
 * Default page size for list endpoints
 */
export const DEFAULT_PAGE_SIZE = 20

/**
 * Maximum page size to prevent DoS via large queries
 */
export const MAX_PAGE_SIZE = 100

// =============================================================================
// File Upload
// =============================================================================

/**
 * Maximum file upload size in bytes (50MB)
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

/**
 * Maximum request body size (1MB)
 */
export const MAX_BODY_SIZE_BYTES = 1 * 1024 * 1024

// =============================================================================
// Session Timeout
// =============================================================================

/**
 * Total inactivity timeout before auto-logout (30 minutes)
 */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000

/**
 * Time before timeout when warning dialog appears (25 minutes)
 * Gives user a 5-minute window to stay signed in
 */
export const SESSION_WARNING_MS = 25 * 60 * 1000

/**
 * Throttle interval for user activity events (30 seconds)
 * Prevents excessive timer resets from rapid mouse/key events
 */
export const ACTIVITY_THROTTLE_MS = 30 * 1000

/**
 * Cookie name for server-side session activity tracking
 * Browser auto-deletes this cookie after SESSION_COOKIE_MAX_AGE seconds of inactivity
 */
export const SESSION_COOKIE_NAME = 'last_activity'

/**
 * Max-age for the last_activity cookie (in seconds)
 * Matches SESSION_TIMEOUT_MS (30 minutes) — when this expires, middleware treats the session as stale
 */
export const SESSION_COOKIE_MAX_AGE = 1800
