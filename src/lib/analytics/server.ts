/**
 * Server-Side Analytics
 * For tracking events from Server Actions and API Routes
 *
 * Uses Google Analytics Measurement Protocol for server-side events
 * @see https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */

import { headers } from 'next/headers'

// =============================================================================
// CONFIGURATION
// =============================================================================

const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
const GA4_API_SECRET = process.env.GA4_API_SECRET
const MEASUREMENT_PROTOCOL_URL = 'https://www.google-analytics.com/mp/collect'

const isProduction = process.env.NODE_ENV === 'production'

// =============================================================================
// TYPES
// =============================================================================

interface ServerEventParams {
  userId?: string
  sessionId?: string
  clientId?: string
  [key: string]: unknown
}

interface MeasurementProtocolEvent {
  name: string
  params: Record<string, unknown>
}

interface MeasurementProtocolPayload {
  client_id: string
  user_id?: string
  events: MeasurementProtocolEvent[]
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get client information from request headers
 */
async function getClientInfo(): Promise<{
  ipAddress: string | null
  userAgent: string | null
}> {
  try {
    const headersList = await headers()
    return {
      ipAddress: headersList.get('x-forwarded-for')?.split(',')[0] ||
                 headersList.get('x-real-ip') ||
                 null,
      userAgent: headersList.get('user-agent') || null,
    }
  } catch {
    return { ipAddress: null, userAgent: null }
  }
}

/**
 * Generate a client ID for anonymous tracking
 */
function generateClientId(): string {
  return `server.${Date.now()}.${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Log event for debugging
 */
function debugLog(eventName: string, params: Record<string, unknown>): void {
  if (!isProduction) {
    console.log(
      `%c[Server Analytics] ${eventName}`,
      'color: #10b981; font-weight: bold;',
      params
    )
  }
}

// =============================================================================
// MEASUREMENT PROTOCOL
// =============================================================================

/**
 * Send event to GA4 via Measurement Protocol
 */
async function sendToMeasurementProtocol(
  eventName: string,
  params: ServerEventParams
): Promise<void> {
  // Skip if not configured
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) {
    debugLog(`${eventName} (skipped - not configured)`, params)
    return
  }

  const clientInfo = await getClientInfo()

  const payload: MeasurementProtocolPayload = {
    client_id: params.clientId || generateClientId(),
    user_id: params.userId,
    events: [
      {
        name: eventName,
        params: {
          ...params,
          engagement_time_msec: 1, // Required for events
          session_id: params.sessionId,
          ip_override: clientInfo.ipAddress, // Note: GA4 may not use this
          user_agent: clientInfo.userAgent,
          timestamp_micros: Date.now() * 1000,
        },
      },
    ],
  }

  const url = `${MEASUREMENT_PROTOCOL_URL}?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`[Server Analytics] Failed to send event: ${response.status}`)
    } else {
      debugLog(eventName, params)
    }
  } catch (error) {
    console.error('[Server Analytics] Error sending event:', error)
  }
}

// =============================================================================
// SERVER EVENTS
// =============================================================================

/**
 * Track server-side event
 */
export async function trackServerEvent(
  eventName: string,
  params: ServerEventParams = {}
): Promise<void> {
  await sendToMeasurementProtocol(eventName, {
    ...params,
    event_source: 'server',
  })
}

// =============================================================================
// AUTH EVENTS
// =============================================================================

/**
 * Track signup initiated (server action)
 */
export async function trackSignupInitiated(params: {
  email: string  // Will be hashed
  method: 'email' | 'google' | 'github' | 'magic_link'
}): Promise<void> {
  // Hash email for privacy
  const hashedEmail = await hashEmail(params.email)

  await trackServerEvent('signup_initiated', {
    email_hash: hashedEmail,
    signup_method: params.method,
  })
}

/**
 * Track email verification
 */
export async function trackEmailVerified(params: {
  userId: string
  email: string
  timeFromSignup?: number
}): Promise<void> {
  const hashedEmail = await hashEmail(params.email)

  await trackServerEvent('email_verified', {
    userId: params.userId,
    email_hash: hashedEmail,
    time_from_signup: params.timeFromSignup,
  })
}

/**
 * Track user created (Prisma record)
 */
export async function trackUserCreated(params: {
  userId: string
  authId: string
}): Promise<void> {
  await trackServerEvent('user_created', {
    userId: params.userId,
    auth_id: params.authId,
  })
}

/**
 * Track login success
 */
export async function trackLoginSuccess(params: {
  userId: string
  email: string
  method: 'email' | 'google' | 'github'
}): Promise<void> {
  const hashedEmail = await hashEmail(params.email)

  await trackServerEvent('login_success', {
    userId: params.userId,
    email_hash: hashedEmail,
    login_method: params.method,
  })
}

/**
 * Track login failure
 */
export async function trackLoginFailure(params: {
  email: string
  reason: string
}): Promise<void> {
  const hashedEmail = await hashEmail(params.email)

  await trackServerEvent('login_failure', {
    email_hash: hashedEmail,
    failure_reason: params.reason,
  })
}

// =============================================================================
// COMPANY EVENTS
// =============================================================================

/**
 * Track company created
 */
export async function trackCompanyCreated(params: {
  userId: string
  companyId: string
  industry?: string
}): Promise<void> {
  await trackServerEvent('company_created', {
    userId: params.userId,
    company_id: params.companyId,
    industry: params.industry,
  })
}

// =============================================================================
// ASSESSMENT EVENTS
// =============================================================================

/**
 * Track assessment submitted (server-side validation)
 */
export async function trackAssessmentSubmitted(params: {
  userId: string
  companyId: string
  assessmentType: 'company' | 'risk' | 'personal_readiness'
  questionsAnswered: number
}): Promise<void> {
  await trackServerEvent('assessment_submitted', {
    userId: params.userId,
    company_id: params.companyId,
    assessment_type: params.assessmentType,
    questions_answered: params.questionsAnswered,
  })
}

/**
 * Track BRI score calculated
 */
export async function trackBriScoreCalculated(params: {
  userId: string
  companyId: string
  score: number
  previousScore?: number
}): Promise<void> {
  await trackServerEvent('bri_score_calculated', {
    userId: params.userId,
    company_id: params.companyId,
    bri_score: params.score,
    previous_score: params.previousScore,
    score_change: params.previousScore ? params.score - params.previousScore : undefined,
  })
}

// =============================================================================
// SUBSCRIPTION EVENTS
// =============================================================================

/**
 * Track subscription created/upgraded
 */
export async function trackSubscriptionChange(params: {
  userId: string
  previousTier?: string
  newTier: string
  action: 'created' | 'upgraded' | 'downgraded' | 'cancelled'
}): Promise<void> {
  await trackServerEvent('subscription_change', {
    userId: params.userId,
    previous_tier: params.previousTier,
    new_tier: params.newTier,
    change_action: params.action,
  })
}

// =============================================================================
// DEAL EVENTS
// =============================================================================

/**
 * Track deal stage change
 */
export async function trackDealStageChange(params: {
  userId: string
  companyId: string
  dealId: string
  fromStage: string
  toStage: string
}): Promise<void> {
  await trackServerEvent('deal_stage_change', {
    userId: params.userId,
    company_id: params.companyId,
    deal_id: params.dealId,
    from_stage: params.fromStage,
    to_stage: params.toStage,
  })
}

/**
 * Track deal won (exit completed)
 */
export async function trackDealWon(params: {
  userId: string
  companyId: string
  dealId: string
  dealValue?: number
}): Promise<void> {
  await trackServerEvent('deal_won', {
    userId: params.userId,
    company_id: params.companyId,
    deal_id: params.dealId,
    deal_value: params.dealValue,
  })
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Hash email for privacy-safe tracking
 */
async function hashEmail(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim()

  // Use Web Crypto API
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(normalized)
    const hash = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hash))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Fallback for environments without crypto.subtle
  // This is a simple hash - in production, use a proper crypto library
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `fallback_${Math.abs(hash).toString(16)}`
}

// =============================================================================
// EXPORT
// =============================================================================

export const serverAnalytics = {
  track: trackServerEvent,
  auth: {
    signupInitiated: trackSignupInitiated,
    emailVerified: trackEmailVerified,
    userCreated: trackUserCreated,
    loginSuccess: trackLoginSuccess,
    loginFailure: trackLoginFailure,
  },
  company: {
    created: trackCompanyCreated,
  },
  assessment: {
    submitted: trackAssessmentSubmitted,
    briCalculated: trackBriScoreCalculated,
  },
  subscription: {
    changed: trackSubscriptionChange,
  },
  deal: {
    stageChanged: trackDealStageChange,
    won: trackDealWon,
  },
}
