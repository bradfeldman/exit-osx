import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { generateAITasksForCompany } from '@/lib/playbook/generate-ai-tasks'
import { applyUserRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'

export const maxDuration = 60 // Allow up to 60s for Claude API call

/**
 * POST - Generate AI-powered tasks from AI-generated BRI question responses.
 * This calls Claude to create contextual tasks, so it can take 15-30s.
 * Separated from recalculate-bri to keep assessment completion fast.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  // SEC-034: Rate limit AI endpoints
  const rl = await applyUserRateLimit(request, result.auth.user.id, RATE_LIMIT_CONFIGS.AI)
  if (!rl.success) return createRateLimitResponse(rl)

  try {
    const taskResult = await generateAITasksForCompany(companyId)

    return NextResponse.json({
      success: true,
      tasksGenerated: taskResult.created,
      skipped: taskResult.skipped,
    })
  } catch (error) {
    console.error('[generate-ai-tasks] Error:', error)
    // SECURITY FIX (PROD-060): Don't expose internal error messages to the client
    return NextResponse.json(
      { error: 'Failed to generate tasks' },
      { status: 500 }
    )
  }
}
