/**
 * POST /api/playbook-progress
 *
 * Persists playbook progress from the Focus Mode iframe.
 * Upserts CompanyPlaybook record with score data.
 * If playbook is completed (percentComplete >= 100) with score >= 70,
 * triggers BRI category boost and snapshot recalculation.
 */

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getPlaybookDefinition } from '@/lib/playbook/playbook-registry'
import { getPlaybookPrimaryBriCategory } from '@/lib/playbook/playbook-surface-mapping'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'
import { createLedgerEntryForTaskCompletion } from '@/lib/value-ledger/create-entry'

// BRI bonus calculation: playbook depth (section count) × relevance weight
// Range: +3 to +8 points on the 0-100 BRI category scale
function calculateBriBonus(sectionCount: number, compositeScore: number): number {
  // Base: 3 points for a short playbook (≤5 sections), up to 6 for long (≥12)
  const depthBase = Math.min(6, Math.max(3, Math.floor(sectionCount / 2)))
  // Performance multiplier: score 70 → 1.0x, score 100 → 1.33x
  const perfMultiplier = 0.7 + (compositeScore / 100) * 0.63
  return Math.min(8, Math.max(3, Math.round(depthBase * perfMultiplier)))
}

interface ProgressBody {
  playbookSlug: string
  companyId: string
  compositeScore?: number
  sectionScores?: Record<string, number>
  completedSections: number
  totalSections: number
  percentComplete: number
}

export async function POST(request: Request) {
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error
  const userId = result.auth.user.id

  let body: ProgressBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { playbookSlug, companyId, compositeScore, sectionScores, completedSections, totalSections, percentComplete } = body

  if (!playbookSlug || !companyId) {
    return NextResponse.json({ error: 'playbookSlug and companyId are required' }, { status: 400 })
  }

  // Verify company access
  const permResult = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(permResult)) return permResult.error

  // Find the Playbook DB record by slug
  const playbook = await prisma.playbook.findUnique({
    where: { slug: playbookSlug.toLowerCase() },
  })

  if (!playbook) {
    return NextResponse.json({ error: `Playbook not found: ${playbookSlug}` }, { status: 404 })
  }

  // Fetch existing record to track score changes
  const existing = await prisma.companyPlaybook.findUnique({
    where: { companyId_playbookId: { companyId, playbookId: playbook.id } },
  })

  const previousScore = existing?.compositeScore ?? null
  const isNewlyCompleted = percentComplete >= 100 && existing?.status !== 'COMPLETED'
  const now = new Date()

  // Determine status
  let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'IN_PROGRESS'
  if (percentComplete >= 100) status = 'COMPLETED'
  else if (percentComplete <= 0 && !compositeScore) status = 'NOT_STARTED'

  // Upsert the CompanyPlaybook record
  const upserted = await prisma.companyPlaybook.upsert({
    where: { companyId_playbookId: { companyId, playbookId: playbook.id } },
    create: {
      companyId,
      playbookId: playbook.id,
      status,
      startedAt: now,
      completedAt: isNewlyCompleted ? now : null,
      compositeScore: compositeScore ?? null,
      previousCompositeScore: null,
      sectionScores: sectionScores ?? Prisma.JsonNull,
      completedSections,
      totalSections,
      percentComplete,
      lastActivityAt: now,
    },
    update: {
      status,
      completedAt: isNewlyCompleted ? now : existing?.completedAt,
      previousCompositeScore: previousScore,
      compositeScore: compositeScore ?? existing?.compositeScore,
      sectionScores: sectionScores ?? (existing?.sectionScores as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      completedSections,
      totalSections,
      percentComplete,
      lastActivityAt: now,
      // Set startedAt on first real activity
      ...((!existing?.startedAt && (compositeScore || completedSections > 0)) ? { startedAt: now } : {}),
    },
  })

  // BRI feedback: if newly completed with score >= 70, apply category boost + auto-complete tasks
  let briFeedback: { category: string; bonus: number; snapshotRecalculated: boolean; autoCompletedTasks: number } | null = null

  if (isNewlyCompleted && compositeScore != null && compositeScore >= 70) {
    const definition = getPlaybookDefinition(playbookSlug)
    if (definition) {
      const primaryCategory = getPlaybookPrimaryBriCategory(definition)
      const bonus = calculateBriBonus(definition.phases.length, compositeScore)

      // Store BRI feedback on the CompanyPlaybook
      await prisma.companyPlaybook.update({
        where: { id: upserted.id },
        data: {
          briCategoryBoosted: primaryCategory,
          briBonusApplied: bonus,
        },
      })

      // Auto-complete pending/in-progress tasks in the same BRI category
      let autoCompletedTasks = 0
      try {
        const relatedTasks = await prisma.task.findMany({
          where: {
            companyId,
            briCategory: primaryCategory as never,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          select: { id: true, title: true, briCategory: true, normalizedValue: true },
        })

        if (relatedTasks.length > 0) {
          const completionNote = `Addressed via ${definition.title} program (score: ${compositeScore}/100)`

          await prisma.task.updateMany({
            where: { id: { in: relatedTasks.map(t => t.id) } },
            data: {
              status: 'COMPLETED',
              completedAt: now,
              completionNotes: completionNote,
              completedValue: relatedTasks[0].normalizedValue, // updateMany applies same value; ledger entries handle per-task
            },
          })

          // Set per-task completedValue and create ledger entries
          for (const task of relatedTasks) {
            await prisma.task.update({
              where: { id: task.id },
              data: { completedValue: task.normalizedValue },
            })
            try {
              await createLedgerEntryForTaskCompletion({
                companyId,
                taskId: task.id,
                taskTitle: task.title,
                briCategory: task.briCategory,
                completedValue: Number(task.normalizedValue),
                briImpact: null,
                valueBefore: null,
                valueAfter: null,
              })
            } catch (err) {
              console.error(`[PlaybookProgress] Ledger entry failed for task ${task.id}:`, err)
            }
          }
          autoCompletedTasks = relatedTasks.length
        }
      } catch (err) {
        console.error('[PlaybookProgress] Auto-complete tasks failed:', err)
      }

      // Trigger snapshot recalculation to incorporate the boost
      try {
        await recalculateSnapshotForCompany(
          companyId,
          `Playbook completed: ${definition.title} (score: ${compositeScore})`,
          userId
        )
        briFeedback = { category: primaryCategory, bonus, snapshotRecalculated: true, autoCompletedTasks }
      } catch (err) {
        console.error('[PlaybookProgress] Snapshot recalculation failed:', err)
        briFeedback = { category: primaryCategory, bonus, snapshotRecalculated: false, autoCompletedTasks }
      }
    }
  }

  return NextResponse.json({
    success: true,
    id: upserted.id,
    status: upserted.status,
    compositeScore: upserted.compositeScore,
    percentComplete: upserted.percentComplete,
    isNewlyCompleted,
    briFeedback,
  })
}
