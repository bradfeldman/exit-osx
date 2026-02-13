'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies, headers } from 'next/headers'
import {
  isAccountLocked,
  recordFailedAttempt,
  clearLockout,
  getFailedAttemptCount,
  withTimingSafeResponse,
  securityLogger,
} from '@/lib/security'
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from '@/lib/security/constants'
import { serverAnalytics } from '@/lib/analytics/server'

interface LoginResult {
  success: boolean
  error?: string
  attemptsRemaining?: number
  lockedUntilMs?: number
  requiresCaptcha?: boolean
  requiresTwoFactor?: boolean
  twoFactorEmail?: string
}

// Show CAPTCHA after this many failed attempts
const CAPTCHA_THRESHOLD = 3

/**
 * Server action for secure login with account lockout protection
 */
export async function secureLogin(
  email: string,
  password: string,
  captchaToken?: string,
  twoFactorCode?: string
): Promise<LoginResult> {
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  return withTimingSafeResponse(async () => {
    // Check if account is locked
    const lockStatus = await isAccountLocked(email)
    if (lockStatus.locked) {
      securityLogger.warn('auth.locked_attempt', `Login attempt on locked account`, {
        userEmail: email,
        ipAddress,
        metadata: { remainingMs: lockStatus.remainingMs },
      })
      return {
        success: false,
        error: lockStatus.reason || 'Account temporarily locked. Please try again later.',
        lockedUntilMs: lockStatus.remainingMs,
      }
    }

    // Check if CAPTCHA is required
    const failedAttempts = await getFailedAttemptCount(email)
    if (failedAttempts >= CAPTCHA_THRESHOLD) {
      // Verify CAPTCHA if required
      if (!captchaToken) {
        return {
          success: false,
          error: 'Please complete the CAPTCHA verification',
          requiresCaptcha: true,
          attemptsRemaining: 5 - failedAttempts,
        }
      }

      // Verify the CAPTCHA token
      const captchaValid = await verifyCaptcha(captchaToken)
      if (!captchaValid) {
        return {
          success: false,
          error: 'CAPTCHA verification failed. Please try again.',
          requiresCaptcha: true,
          attemptsRemaining: 5 - failedAttempts,
        }
      }
    }

    // Import 2FA functions lazily to avoid circular deps
    const { checkTwoFactorRequired, verifyTwoFactorCode } = await import('./two-factor')

    // Check if 2FA is required for this user
    const needs2FA = await checkTwoFactorRequired(email)

    // If 2FA is required but no code provided, we need to verify password first
    // then prompt for 2FA code
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const result = await recordFailedAttempt(email, { ipAddress, userAgent })

      securityLogger.authAttempt(false, {
        email,
        ipAddress,
        userAgent,
        reason: error.message,
      })

      if (result.locked) {
        return {
          success: false,
          error: 'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.',
          attemptsRemaining: 0,
          lockedUntilMs: result.lockoutDurationMs,
        }
      }

      return {
        success: false,
        // Generic error message to prevent user enumeration
        error: 'Invalid email or password',
        attemptsRemaining: result.attemptsRemaining,
        requiresCaptcha: result.attemptsRemaining <= 2, // Show CAPTCHA when 2 or fewer attempts remain
      }
    }

    // Password is correct, now check 2FA
    if (needs2FA) {
      if (!twoFactorCode) {
        // Sign out since we need 2FA verification
        await supabase.auth.signOut()

        return {
          success: false,
          requiresTwoFactor: true,
          twoFactorEmail: email,
        }
      }

      // Verify 2FA code
      const twoFactorResult = await verifyTwoFactorCode(email, twoFactorCode)
      if (!twoFactorResult.success) {
        // Sign out since 2FA failed
        await supabase.auth.signOut()

        securityLogger.warn('auth.2fa_failed', '2FA verification failed', {
          userEmail: email,
          ipAddress,
        })

        return {
          success: false,
          error: twoFactorResult.error || 'Invalid verification code',
          requiresTwoFactor: true,
          twoFactorEmail: email,
        }
      }
    }

    // Successful login - clear any lockout state
    await clearLockout(email)

    // Record the session for session management
    const { recordSession } = await import('./sessions')
    await recordSession().catch(() => {
      // Non-blocking - don't fail login if session recording fails
    })

    securityLogger.authAttempt(true, {
      email,
      ipAddress,
      userAgent,
    })

    // Set last_activity cookie so middleware doesn't treat this as a stale session.
    // Without this, the redirect to /dashboard would hit the stale-session check
    // (sb- cookies exist but last_activity expired) and bounce back to /login.
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, String(Date.now()), {
      path: '/',
      maxAge: SESSION_COOKIE_MAX_AGE,
      sameSite: 'lax',
    })

    // Track successful login (non-blocking)
    serverAnalytics.auth.loginSuccess({
      userId: '', // Will be populated after user sync
      email,
      method: 'email',
    }).catch(() => {})

    return { success: true }
  })
}

/**
 * Check if an email is currently locked (for UI feedback)
 */
export async function checkLockStatus(email: string): Promise<{
  locked: boolean
  remainingMs?: number
  requiresCaptcha?: boolean
}> {
  const status = await isAccountLocked(email)
  const failedAttempts = await getFailedAttemptCount(email)

  return {
    locked: status.locked,
    remainingMs: status.remainingMs,
    requiresCaptcha: failedAttempts >= CAPTCHA_THRESHOLD,
  }
}

interface SignupResult {
  success: boolean
  error?: string
  passwordWarning?: string
}

/**
 * Server action for secure signup with password breach checking
 * @param redirectTo - Optional URL to redirect to after email confirmation
 * @param selectedPlan - Optional plan tier selected during signup (for trial setup)
 */
export async function secureSignup(
  name: string,
  email: string,
  password: string,
  redirectTo?: string,
  selectedPlan?: string
): Promise<SignupResult> {
  const { validatePassword, getPasswordWarning } = await import('@/lib/security')
  const { sendAccountExistsEmail } = await import('@/lib/email/send-account-exists-email')

  // Validate password strength and check for breaches
  const validationError = await validatePassword(password)
  if (validationError) {
    return {
      success: false,
      error: validationError,
    }
  }

  // Build the email confirmation redirect URL
  // The auth/callback route will read the 'next' parameter and redirect there
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const emailRedirectTo = redirectTo
    ? `${baseUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`
    : `${baseUrl}/auth/callback`

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        selected_plan: selectedPlan || 'foundation', // Store selected plan in user metadata
      },
      emailRedirectTo,
    },
  })

  if (error) {
    // If user already registered, send helpful email instead of generic error
    if (error.message.includes('already registered')) {
      // Send account exists email (non-blocking for security - always return success)
      sendAccountExistsEmail({ email, name }).catch((err) => {
        console.error('[Auth] Failed to send account exists email:', err)
      })

      // Return success to prevent email enumeration
      // User will receive an email explaining they already have an account
      return {
        success: true,
      }
    }
    return {
      success: false,
      error: error.message,
    }
  }

  // Check if user already exists (Supabase returns user with identities: null for existing users)
  // In this case, Supabase doesn't send a confirmation email, so we send our helpful email
  if (data?.user && data.user.identities && data.user.identities.length === 0) {
    // User already exists - send account exists email
    sendAccountExistsEmail({ email, name }).catch((err) => {
      console.error('[Auth] Failed to send account exists email:', err)
    })

    // Return success to prevent email enumeration
    return {
      success: true,
    }
  }

  // Track signup initiated (non-blocking)
  serverAnalytics.auth.signupInitiated({
    email,
    method: 'email',
  }).catch(() => {})

  // Check for password warning (non-blocking)
  const warning = await getPasswordWarning(password)

  return {
    success: true,
    passwordWarning: warning || undefined,
  }
}

interface MagicLinkResult {
  success: boolean
  error?: string
}

/**
 * Server action for magic-link signup.
 * Uses Supabase admin.generateLink() to create a magic link token, then sends
 * a branded email via Resend with links through our own domain (app.exitosx.com).
 *
 * This avoids Supabase's built-in email which links to supabase.co, causing
 * Gmail to auto-delete emails due to sender/link domain mismatch.
 *
 * SECURITY:
 * - Uses timing-safe responses to prevent email enumeration
 * - Existing users receive an "account exists" email instead of an error
 * - Rate limited at middleware level (AUTH tier: 5/min)
 * - Selected plan is stored in user_metadata for trial setup during sync
 */
export async function sendMagicLink(
  email: string,
  selectedPlan?: string
): Promise<MagicLinkResult> {
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  return withTimingSafeResponse(async () => {
    // Normalize email
    const normalizedEmail = email.trim().toLowerCase()

    // Basic email validation (server-side defense in depth)
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { success: false, error: 'Please enter a valid email address.' }
    }

    const { sendAccountExistsEmail } = await import('@/lib/email/send-account-exists-email')
    const { sendMagicLinkEmail } = await import('@/lib/email/send-magic-link-email')
    const { createServiceClient } = await import('@/lib/supabase/server')

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'

    // Use admin API to generate a magic link without sending an email.
    // This gives us the token so we can send our own branded email via Resend
    // with links through our domain (avoiding Gmail spam filters).
    const adminClient = createServiceClient()
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        data: {
          selected_plan: selectedPlan || 'foundation',
          signup_method: 'magic_link',
        },
        redirectTo: `${baseUrl}/auth/callback?next=/activate`,
      },
    })

    if (error) {
      // Check if user already exists with a password
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        sendAccountExistsEmail({ email: normalizedEmail }).catch((err) => {
          console.error('[Auth] Failed to send account exists email:', err)
        })
        return { success: true }
      }

      const errorDetails = error as unknown as { message: string; code?: string; status?: number }
      securityLogger.error('auth.magic_link_failed', `Magic link generate failed: ${error.message}`, {
        ipAddress,
        metadata: { error: error.message, errorCode: errorDetails.code, errorStatus: errorDetails.status },
      })
      console.error('[Auth] admin.generateLink failed:', { message: error.message, code: errorDetails.code, status: errorDetails.status })

      return { success: false, error: 'Unable to send verification email. Please try again.' }
    }

    // Build verification URL through our own domain.
    // We use the hashed_token (not raw token) so the confirm page can call
    // supabase.auth.verifyOtp() directly on the client, avoiding the redirect
    // through Supabase's /auth/v1/verify which uses implicit flow (tokens in
    // URL hash fragments that server-side routes can't read).
    const hashedToken = data.properties?.hashed_token
    if (!hashedToken) {
      console.error('[Auth] generateLink returned no hashed_token:', JSON.stringify(data.properties))
      return { success: false, error: 'Unable to send verification email. Please try again.' }
    }

    const magicLinkUrl = `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink&next=/activate`

    // Send branded email via Resend (all links point to app.exitosx.com)
    const emailResult = await sendMagicLinkEmail({ email: normalizedEmail, magicLinkUrl })
    if (!emailResult.success) {
      console.error('[Auth] Failed to send magic link email via Resend:', emailResult.error)
      return { success: false, error: 'Unable to send verification email. Please try again.' }
    }

    // Track signup initiated (non-blocking)
    serverAnalytics.auth.signupInitiated({
      email: normalizedEmail,
      method: 'magic_link',
    }).catch(() => {})

    return { success: true }
  })
}

/**
 * Server action to set a password for a magic-link user who has verified their email.
 * Called from the /activate page after the user clicks the magic link.
 *
 * SECURITY:
 * - Requires an active Supabase session (user must have clicked the magic link)
 * - Password is validated for strength and breach checking
 * - Session cookie is set after password creation
 */
export async function setPasswordForMagicLink(
  password: string
): Promise<{ success: boolean; error?: string; passwordWarning?: string }> {
  const { validatePassword, getPasswordWarning } = await import('@/lib/security')

  // Validate password strength and check for breaches
  const validationError = await validatePassword(password)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const supabase = await createClient()

  // Verify there is an active session (user clicked magic link and was redirected)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      success: false,
      error: 'Your session has expired. Please request a new signup link.',
    }
  }

  // Set the password on the existing user
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return {
      success: false,
      error: error.message || 'Failed to set password. Please try again.',
    }
  }

  // Set last_activity cookie so middleware doesn't treat this as a stale session
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, String(Date.now()), {
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
    sameSite: 'lax',
  })

  // Check for password warning (non-blocking)
  const warning = await getPasswordWarning(password)

  return {
    success: true,
    passwordWarning: warning || undefined,
  }
}

/**
 * Verify hCaptcha or reCAPTCHA token
 */
async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY

  if (!secret) {
    // If no CAPTCHA secret is configured, skip verification in development
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Security] CAPTCHA verification skipped - no secret key configured')
      return true
    }
    return false
  }

  try {
    // Determine which service to use based on which secret is configured
    const isHCaptcha = !!process.env.HCAPTCHA_SECRET_KEY
    const verifyUrl = isHCaptcha
      ? 'https://hcaptcha.com/siteverify'
      : 'https://www.google.com/recaptcha/api/siteverify'

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
    })

    const data = await response.json()
    return data.success === true
  } catch (error) {
    securityLogger.error('captcha.verification_failed', 'CAPTCHA verification request failed', {
      metadata: { error: String(error) },
    })
    return false
  }
}

/**
 * Server action to mark the session as active after client-side auth completes.
 * Sets the SESSION_COOKIE_NAME so middleware doesn't treat the session as stale
 * when the user navigates to a protected route.
 */
export async function completeAuthCallback() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, String(Date.now()), {
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  })
}
