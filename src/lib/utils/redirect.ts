// Redirect Parameter Utility
// Standardizes redirect parameter handling across the application

// Standardize on 'next' as the redirect parameter name
// (already used by auth/callback route)
export const REDIRECT_PARAM = 'next'

/**
 * Validate that a redirect URL is safe (internal path only)
 * Prevents open redirect vulnerabilities
 */
export function isValidRedirectUrl(url: string | null | undefined): boolean {
  if (!url) return false
  // Must start with / and not contain protocol or double slashes
  if (!url.startsWith('/')) return false
  if (url.includes('://')) return false
  if (url.startsWith('//')) return false
  // Prevent null byte injection
  if (url.includes('\0')) return false
  return true
}

/**
 * Get redirect URL from search params with fallback
 * Checks multiple common parameter names for backwards compatibility
 */
export function getRedirectUrl(
  searchParams: URLSearchParams | { get: (key: string) => string | null } | null,
  fallback: string = '/dashboard'
): string {
  if (!searchParams) return fallback

  // Check all common parameter names for backwards compatibility
  const redirectUrl =
    searchParams.get('next') ||
    searchParams.get('redirect') ||
    searchParams.get('returnUrl') ||
    null

  return isValidRedirectUrl(redirectUrl) ? redirectUrl! : fallback
}

/**
 * Build URL with redirect parameter
 * Only adds the parameter if redirectTo is different from the default
 */
export function buildUrlWithRedirect(basePath: string, redirectTo: string | null): string {
  if (!redirectTo || redirectTo === '/dashboard') return basePath
  if (!isValidRedirectUrl(redirectTo)) return basePath

  const params = new URLSearchParams({ [REDIRECT_PARAM]: redirectTo })
  return `${basePath}?${params.toString()}`
}

/**
 * Check if the redirect URL is for an invite flow
 */
export function isInviteRedirect(url: string | null | undefined): boolean {
  if (!url) return false
  return url.startsWith('/invite/')
}
