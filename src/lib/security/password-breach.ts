/**
 * Password Breach Checking via HaveIBeenPwned API
 *
 * Uses the k-Anonymity model to check passwords securely:
 * 1. Hash password with SHA-1
 * 2. Send only first 5 characters of hash to API
 * 3. Check if full hash exists in returned list
 *
 * SECURITY: The full password hash is never sent to the API
 */

import { createHash } from 'crypto'
import { securityLogger } from './logger'

interface BreachCheckResult {
  breached: boolean
  count?: number
  error?: string
}

/**
 * Check if a password has been exposed in known data breaches
 * Uses the HaveIBeenPwned Passwords API with k-Anonymity
 *
 * @param password - The plaintext password to check
 * @returns Object with breached status and count of times seen
 */
export async function checkPasswordBreach(password: string): Promise<BreachCheckResult> {
  try {
    // Hash the password with SHA-1 (required by HIBP API)
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase()

    // Get first 5 characters (prefix) and the rest (suffix)
    const prefix = hash.substring(0, 5)
    const suffix = hash.substring(5)

    // Query the HIBP API with the prefix
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'ExitOSx-Security-Check',
        'Add-Padding': 'true', // Adds padding to prevent response size analysis
      },
    })

    if (!response.ok) {
      securityLogger.error('password_breach.api_error', 'HIBP API request failed', {
        metadata: { status: response.status },
      })
      return { breached: false, error: 'Unable to check password security' }
    }

    const data = await response.text()

    // Parse the response - each line is SUFFIX:COUNT
    const lines = data.split('\n')
    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':')
      if (hashSuffix.trim() === suffix) {
        const count = parseInt(countStr.trim(), 10)
        return { breached: true, count }
      }
    }

    return { breached: false }
  } catch (error) {
    securityLogger.error('password_breach.check_failed', 'Password breach check failed', {
      metadata: { error: String(error) },
    })
    // Don't block registration/password change if the check fails
    return { breached: false, error: 'Unable to verify password security' }
  }
}

/**
 * Get a user-friendly message about the breach
 */
export function getBreachMessage(count: number): string {
  if (count >= 1000000) {
    return `This password has been exposed in data breaches over ${Math.floor(count / 1000000)} million times. Please choose a different password.`
  } else if (count >= 1000) {
    return `This password has been exposed in data breaches over ${Math.floor(count / 1000)}k times. Please choose a different password.`
  } else if (count > 100) {
    return `This password has been found in ${count} data breaches. Please choose a different password.`
  } else if (count > 1) {
    return `This password has been found in ${count} data breaches. Consider using a different password.`
  }
  return 'This password has been exposed in a data breach. Please choose a different password.'
}

/**
 * Validate password strength and check for breaches
 * Returns null if password is acceptable, otherwise returns an error message
 */
export async function validatePassword(password: string): Promise<string | null> {
  // Basic strength requirements
  if (password.length < 8) {
    return 'Password must be at least 8 characters long'
  }

  if (password.length > 128) {
    return 'Password must be less than 128 characters'
  }

  // Check for common patterns
  const commonPatterns = [
    /^(.)\1+$/, // All same character (e.g., "aaaaaaaa")
    /^(012|123|234|345|456|567|678|789|890)+$/i, // Sequential numbers
    /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i, // Sequential letters
    /^password/i,
    /^qwerty/i,
    /^letmein/i,
    /^welcome/i,
    /^admin/i,
  ]

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      return 'Password is too common. Please choose a more unique password.'
    }
  }

  // Check for breaches
  const breachResult = await checkPasswordBreach(password)
  if (breachResult.breached && breachResult.count) {
    // Only warn for passwords seen more than 10 times
    if (breachResult.count > 10) {
      return getBreachMessage(breachResult.count)
    }
  }

  return null
}

/**
 * Check password asynchronously and return a warning (non-blocking)
 * Use this for optional warnings that don't prevent registration
 */
export async function getPasswordWarning(password: string): Promise<string | null> {
  const breachResult = await checkPasswordBreach(password)

  if (breachResult.breached && breachResult.count) {
    if (breachResult.count > 100) {
      return getBreachMessage(breachResult.count)
    } else if (breachResult.count > 0) {
      return 'This password has been seen in a small number of data breaches. Consider using a different password for better security.'
    }
  }

  return null
}
