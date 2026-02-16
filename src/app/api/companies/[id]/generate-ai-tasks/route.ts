import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { generateAITasksForCompany } from '@/lib/playbook/generate-ai-tasks'
import { applyUserRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'
import { prisma } from '@/lib/prisma'
import type { BriCategory } from '@prisma/client'

export const maxDuration = 60 // Allow up to 60s for Claude API call

/**
 * POST - Generate AI-powered tasks from AI-generated BRI question responses.
 * This calls Claude to create contextual tasks, so it can take 15-30s.
 * Separated from recalculate-bri to keep assessment completion fast.
 *
 * Optional body: { category: string } — when provided, creates a TaskRefinementEvent
 * by comparing new tasks against existing ONBOARDING_PRELIMINARY tasks in that category.
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

  // Parse optional category from body
  let category: string | null = null
  try {
    const body = await request.json().catch(() => null)
    if (body?.category && typeof body.category === 'string') {
      category = body.category
    }
  } catch {
    // No body or invalid JSON — that's fine
  }

  try {
    // Count existing preliminary tasks in this category before generation
    let preliminaryCountBefore = 0
    if (category) {
      preliminaryCountBefore = await prisma.task.count({
        where: {
          companyId,
          briCategory: category as BriCategory,
          sourceType: 'ONBOARDING_PRELIMINARY',
          status: { notIn: ['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'] },
        },
      })
    }

    const taskResult = await generateAITasksForCompany(companyId)

    // If category provided, supersede preliminary tasks and create refinement event
    if (category && taskResult.created > 0) {
      // Mark preliminary tasks in this category as NOT_APPLICABLE (superseded)
      const superseded = await prisma.task.updateMany({
        where: {
          companyId,
          briCategory: category as BriCategory,
          sourceType: 'ONBOARDING_PRELIMINARY',
          status: { notIn: ['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'] },
        },
        data: {
          status: 'NOT_APPLICABLE',
        },
      })

      // Create refinement event for the banner
      await prisma.taskRefinementEvent.create({
        data: {
          companyId,
          briCategory: category as BriCategory,
          tasksAdded: taskResult.created,
          tasksUpdated: 0,
          tasksRemoved: superseded.count,
          details: {
            preliminaryBefore: preliminaryCountBefore,
            aiGenerated: taskResult.created,
            superseded: superseded.count,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      tasksGenerated: taskResult.created,
      skipped: taskResult.skipped,
      refinement: category ? {
        category,
        tasksAdded: taskResult.created,
        tasksRemoved: preliminaryCountBefore,
      } : null,
    })
  } catch (error) {
    console.error('[generate-ai-tasks] Error:', error instanceof Error ? error.message : String(error))
    // SECURITY FIX (PROD-060): Don't expose internal error messages to the client
    return NextResponse.json(
      { error: 'Failed to generate tasks' },
      { status: 500 }
    )
  }
}
