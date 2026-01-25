/**
 * Timing-Safe Response Utilities
 * Prevents user enumeration through timing analysis
 *
 * SECURITY: Attackers can determine if a user exists by measuring response times.
 * If checking a non-existent user returns faster than checking an existing user,
 * attackers can enumerate valid usernames/emails.
 *
 * These utilities ensure consistent response times regardless of the outcome.
 */

import { timingSafeEqual } from 'crypto'

/**
 * Minimum response time in milliseconds
 * This should be longer than any typical database query
 */
const MIN_RESPONSE_TIME_MS = 200

/**
 * Add random jitter to prevent precise timing analysis
 * Returns a random number between 0 and maxJitter
 */
function getRandomJitter(maxJitter: number = 50): number {
  return Math.floor(Math.random() * maxJitter)
}

/**
 * Ensure a minimum response time to prevent timing attacks
 *
 * @param startTime - The time the operation started (from Date.now())
 * @returns Promise that resolves after ensuring minimum time has passed
 *
 * @example
 * ```typescript
 * const startTime = Date.now()
 * const user = await findUserByEmail(email)
 * await ensureMinimumResponseTime(startTime)
 * if (!user) {
 *   return { error: 'Invalid credentials' }
 * }
 * ```
 */
export async function ensureMinimumResponseTime(startTime: number): Promise<void> {
  const elapsed = Date.now() - startTime
  const remaining = MIN_RESPONSE_TIME_MS - elapsed + getRandomJitter()

  if (remaining > 0) {
    await new Promise(resolve => setTimeout(resolve, remaining))
  }
}

/**
 * Execute a function with timing-safe response
 * Ensures the function takes at least MIN_RESPONSE_TIME_MS to complete
 *
 * @param fn - The async function to execute
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const result = await withTimingSafeResponse(async () => {
 *   const user = await findUserByEmail(email)
 *   if (!user) return { error: 'Invalid credentials' }
 *   const valid = await verifyPassword(password, user.passwordHash)
 *   if (!valid) return { error: 'Invalid credentials' }
 *   return { success: true, user }
 * })
 * ```
 */
export async function withTimingSafeResponse<T>(fn: () => Promise<T>): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await fn()
    await ensureMinimumResponseTime(startTime)
    return result
  } catch (error) {
    await ensureMinimumResponseTime(startTime)
    throw error
  }
}

/**
 * Compare two strings in constant time
 * Prevents timing attacks when comparing secrets
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function constantTimeCompare(a: string, b: string): boolean {
  // Pad strings to same length to prevent length-based timing attacks
  const maxLength = Math.max(a.length, b.length)
  const aPadded = a.padEnd(maxLength, '\0')
  const bPadded = b.padEnd(maxLength, '\0')

  const bufA = Buffer.from(aPadded, 'utf-8')
  const bufB = Buffer.from(bPadded, 'utf-8')

  // Use Node's built-in timing-safe comparison
  return timingSafeEqual(bufA, bufB) && a.length === b.length
}

/**
 * Generate a fake delay similar to a database lookup
 * Use this when you want to simulate work for non-existent resources
 *
 * @example
 * ```typescript
 * const user = await findUserByEmail(email)
 * if (!user) {
 *   await simulateDatabaseLookup()
 *   return { error: 'Invalid credentials' }
 * }
 * ```
 */
export async function simulateDatabaseLookup(): Promise<void> {
  const delay = 50 + getRandomJitter(100) // 50-150ms
  await new Promise(resolve => setTimeout(resolve, delay))
}
