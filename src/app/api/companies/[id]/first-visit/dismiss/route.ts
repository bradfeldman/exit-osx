/**
 * POST /api/companies/[id]/first-visit/dismiss
 *
 * Records that the user dismissed the welcome banner.
 * Uses a product event to track this (the first-visit GET endpoint
 * already uses visit count + task activity to determine state).
 */

import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { trackProductEvent } from '@/lib/analytics/track-product-event'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  // Fire analytics event (non-blocking)
  trackProductEvent({
    userId: result.auth.user.id,
    eventName: 'first_visit_welcome_dismissed',
    eventCategory: 'navigation',
    metadata: { companyId },
  })

  return NextResponse.json({ success: true })
}
