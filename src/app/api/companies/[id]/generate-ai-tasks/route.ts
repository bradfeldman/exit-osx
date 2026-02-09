import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { generateAITasksForCompany } from '@/lib/playbook/generate-ai-tasks'

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

  try {
    const taskResult = await generateAITasksForCompany(companyId)

    return NextResponse.json({
      success: true,
      tasksGenerated: taskResult.created,
      skipped: taskResult.skipped,
    })
  } catch (error) {
    console.error('[generate-ai-tasks] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate tasks'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
