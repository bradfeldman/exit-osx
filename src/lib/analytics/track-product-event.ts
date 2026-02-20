import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { parseUserAgent } from '@/lib/utils/parse-user-agent'
import type { Prisma } from '@prisma/client'

type EventCategory = 'auth' | 'navigation' | 'onboarding' | 'assessment' | 'task' | 'valuation' | 'subscription' | 'playbook'

interface TrackEventOptions {
  userId: string
  eventName: string
  eventCategory: EventCategory
  metadata?: Record<string, unknown>
  page?: string
}

/**
 * Fire-and-forget product event tracking.
 * Captures user actions locally for admin analytics.
 * Never throws — failures are silently logged so product flows are never affected.
 */
export function trackProductEvent(options: TrackEventOptions): void {
  // Fire and forget — don't await
  trackProductEventAsync(options).catch((err) => {
    console.error('[Analytics] Failed to track product event:', err instanceof Error ? err.message : String(err))
  })
}

async function trackProductEventAsync(options: TrackEventOptions): Promise<void> {
  const { userId, eventName, eventCategory, metadata, page } = options

  let deviceType: string | undefined
  let browser: string | undefined
  let os: string | undefined
  let ipAddress: string | undefined
  let sessionId: string | undefined

  try {
    const headersList = await headers()
    const userAgent = headersList.get('user-agent')
    ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined

    const deviceInfo = parseUserAgent(userAgent)
    deviceType = deviceInfo.deviceType
    browser = deviceInfo.browser
    os = deviceInfo.os

    // Try to get session token for session correlation
    const cookieHeader = headersList.get('cookie')
    if (cookieHeader) {
      const sbMatch = cookieHeader.match(/sb-[^=]+-auth-token[^=]*=([^;]+)/)
      if (sbMatch) {
        // Use first 12 chars as session identifier (not the full token)
        sessionId = sbMatch[1].substring(0, 12)
      }
    }
  } catch {
    // headers() may not be available in all contexts
  }

  await prisma.productEvent.create({
    data: {
      userId,
      eventName,
      eventCategory,
      metadata: (metadata || undefined) as Prisma.InputJsonValue | undefined,
      page,
      deviceType,
      browser,
      os,
      ipAddress,
      sessionId,
    },
  })
}
