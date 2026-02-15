/**
 * Assessment Cadence API (PROD-017)
 *
 * GET  — Returns cadence preference + per-category cadence status
 * PUT  — Updates cadence preference (weekly | monthly | manual)
 * POST — Records that a cadence prompt was shown (for weekly limit tracking)
 */

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import {
  evaluateBatchCadence,
  type CadenceInput,
  type CadencePreference,
} from '@/lib/assessment/cadence-rules'
import { detectAllMaterialChanges } from '@/lib/assessment/material-change-detector'
import { BRI_CATEGORY_LABELS, type BRICategory } from '@/lib/constants/bri-categories'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const VALID_CADENCES: CadencePreference[] = ['weekly', 'monthly', 'manual']
const CATEGORY_KEYS = ['FINANCIAL', 'TRANSFERABILITY', 'OPERATIONAL', 'MARKET', 'LEGAL_TAX', 'PERSONAL']

// ---------------------------------------------------------------------------
// GET — Fetch cadence preference and per-category cadence evaluation
// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        assessmentCadence: true,
        cadencePromptsShownAt: true,
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const cadencePreference = company.assessmentCadence as CadencePreference

    // Count prompts shown this week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const promptsShownThisWeek = company.cadencePromptsShownAt.filter(
      (d) => d >= oneWeekAgo,
    ).length

    // Get per-category last assessment dates from responses
    const allResponses = await prisma.assessmentResponse.findMany({
      where: {
        assessment: { companyId },
        selectedOptionId: { not: null },
      },
      include: {
        question: { select: { briCategory: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const categoryLastAssessed = new Map<string, Date | null>()
    for (const cat of CATEGORY_KEYS) {
      categoryLastAssessed.set(cat, null)
    }
    for (const r of allResponses) {
      const cat = r.question.briCategory
      const existing = categoryLastAssessed.get(cat)
      if (!existing || r.updatedAt > existing) {
        categoryLastAssessed.set(cat, r.updatedAt)
      }
    }

    // Get per-category last task completion dates
    const completedTasks = await prisma.task.findMany({
      where: {
        companyId,
        status: 'COMPLETED',
        completedAt: { not: null },
      },
      select: {
        briCategory: true,
        completedAt: true,
      },
      orderBy: { completedAt: 'desc' },
    })

    const categoryLastTaskCompleted = new Map<string, Date | null>()
    for (const cat of CATEGORY_KEYS) {
      categoryLastTaskCompleted.set(cat, null)
    }
    for (const t of completedTasks) {
      const cat = t.briCategory
      const existing = categoryLastTaskCompleted.get(cat)
      if (!existing && t.completedAt) {
        categoryLastTaskCompleted.set(cat, t.completedAt)
      }
    }

    // Detect material changes
    const materialChanges = await detectAllMaterialChanges(companyId, categoryLastAssessed)

    // Build cadence inputs
    const cadenceInputs: CadenceInput[] = CATEGORY_KEYS.map((cat) => ({
      categoryId: cat,
      lastAssessedAt: categoryLastAssessed.get(cat) ?? null,
      lastTaskCompletedAt: categoryLastTaskCompleted.get(cat) ?? null,
      materialChangeDetected: materialChanges.get(cat)?.detected ?? false,
      materialChangeDescription: materialChanges.get(cat)?.description,
      userCadencePreference: cadencePreference,
      promptsShownThisWeek,
    }))

    // Evaluate cadence rules
    const batchResult = evaluateBatchCadence({ categories: cadenceInputs })

    // Build response
    const categoryResults = CATEGORY_KEYS.map((cat) => {
      const result = batchResult.results.get(cat)
      return {
        categoryId: cat,
        categoryLabel: BRI_CATEGORY_LABELS[cat as BRICategory] || cat,
        shouldPrompt: result?.shouldPrompt ?? false,
        reason: result?.reason ?? '',
        urgency: result?.urgency ?? 'low',
        canDefer: result?.canDefer ?? true,
        nextPromptDate: result?.nextPromptDate?.toISOString() ?? null,
        matchedRule: result?.matchedRule ?? 'NO_PROMPT',
        lastAssessedAt: categoryLastAssessed.get(cat)?.toISOString() ?? null,
        materialChange: materialChanges.get(cat) ?? { detected: false, changes: [], description: '' },
      }
    })

    return NextResponse.json({
      cadencePreference,
      promptsShownThisWeek,
      topPrompt: batchResult.topPrompt
        ? {
            categoryId: batchResult.topPrompt.categoryId,
            categoryLabel:
              BRI_CATEGORY_LABELS[batchResult.topPrompt.categoryId as BRICategory] ||
              batchResult.topPrompt.categoryId,
            reason: batchResult.topPrompt.result.reason,
            urgency: batchResult.topPrompt.result.urgency,
          }
        : null,
      categories: categoryResults,
    })
  } catch (error) {
    console.error('Error fetching assessment cadence:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch assessment cadence' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// PUT — Update cadence preference
// ---------------------------------------------------------------------------

const putCadenceSchema = z.object({
  cadence: z.enum(['weekly', 'monthly', 'manual']),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const validation = await validateRequestBody(request, putCadenceSchema)
    if (!validation.success) return validation.error
    const { cadence } = validation.data

    await prisma.company.update({
      where: { id: companyId },
      data: { assessmentCadence: cadence },
    })

    return NextResponse.json({ success: true, cadence })
  } catch (error) {
    console.error('Error updating assessment cadence:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update assessment cadence' },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// POST — Record that a cadence prompt was shown
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    // Append current timestamp to the prompts array
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { cadencePromptsShownAt: true },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Keep only prompts from the last 30 days (cleanup old entries)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentPrompts = company.cadencePromptsShownAt.filter(
      (d) => d >= thirtyDaysAgo,
    )
    recentPrompts.push(new Date())

    await prisma.company.update({
      where: { id: companyId },
      data: { cadencePromptsShownAt: recentPrompts },
    })

    return NextResponse.json({ success: true, promptCount: recentPrompts.length })
  } catch (error) {
    console.error('Error recording cadence prompt:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to record cadence prompt' },
      { status: 500 },
    )
  }
}
