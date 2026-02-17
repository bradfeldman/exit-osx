// Task Context Enrichment — AI-Powered Personalization
// Follows the generateBuyerConsequences pattern: batched AI calls,
// rule-based fallback, stores in richDescription.companyContext.

import { generateJSON } from '@/lib/ai/anthropic'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { gatherTaskPersonalizationContext, type PersonalizationContext } from './personalization-context'
import type { CompanyContextData } from '@/lib/playbook/rich-task-description'

// ─── Types ──────────────────────────────────────────────────────────────

interface TaskForEnrichment {
  id: string
  title: string
  description: string
  briCategory: string
  richDescription: unknown
}

interface AIContextResult {
  contexts: Array<{
    taskId: string
    yourSituation: { metric: string; value: string; source: string }
    industryBenchmark: { range: string; source: string } | null
    financialImpact: {
      gapDescription: string
      dollarImpact: string
      enterpriseValueImpact: string
      calculation: string
    } | null
    contextNote: string
  }>
}

// ─── System Prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a $500/hour M&A consultant personalizing exit preparation tasks for a business owner.

For each task, generate a companyContext block that makes the task feel like it came from someone who read the founder's books.

RULES:
1. Lead with the founder's actual number + source label (e.g., "Your COGS: $1.36M (68% of revenue) — From your 2025 P&L")
2. Show industry benchmark as a RANGE (e.g., "Industry range: 42-55%")
3. Calculate dollar impact with TRANSPARENT math that the founder can verify
4. Include a contextNote that acknowledges the founder's situation (not generic advice)
5. Be specific, numeric, and honest — never round aggressively or hide calculations
6. If the task doesn't relate to a specific financial metric, focus on the most relevant metric from the data provided

Return JSON:
{
  "contexts": [
    {
      "taskId": "string",
      "yourSituation": {
        "metric": "string (e.g., 'COGS' or 'EBITDA Margin')",
        "value": "string (e.g., '$1.36M (68% of revenue)')",
        "source": "string (e.g., 'From your 2025 P&L')"
      },
      "industryBenchmark": {
        "range": "string (e.g., '42-55% of revenue')",
        "source": "string (e.g., 'Based on Technology Services sector data')"
      } | null,
      "financialImpact": {
        "gapDescription": "string (e.g., 'You are 13-26 points above industry COGS range')",
        "dollarImpact": "string (e.g., '$260K-$520K/year in excess costs')",
        "enterpriseValueImpact": "string (e.g., '$650K-$2.6M in enterprise value at 2.5-5.0x EBITDA')",
        "calculation": "string (e.g., 'Gap: 68% - 55% = 13pts × $2M revenue = $260K; at 2.5-5.0x = $650K-$1.3M')"
      } | null,
      "contextNote": "string (1-2 sentences acknowledging the founder's specific situation)"
    }
  ]
}`

// ─── Prompt Builder ─────────────────────────────────────────────────────

function buildEnrichmentPrompt(
  tasks: TaskForEnrichment[],
  ctx: PersonalizationContext
): string {
  const parts: string[] = []

  parts.push(`COMPANY: ${ctx.company.name} (${ctx.company.industry} > ${ctx.company.subSector})`)

  if (ctx.financials) {
    parts.push(`\nFINANCIALS (${ctx.financials.source}):`)
    parts.push(`  Revenue: $${ctx.financials.revenue.toLocaleString()}`)
    if (ctx.financials.cogs !== null) {
      parts.push(`  COGS: $${ctx.financials.cogs.toLocaleString()} (${ctx.financials.grossMarginPct?.toFixed(1)}% gross margin)`)
    }
    parts.push(`  EBITDA: $${ctx.financials.ebitda.toLocaleString()} (${ctx.financials.ebitdaMarginPct?.toFixed(1)}% margin)`)
  }

  if (ctx.benchmarks) {
    parts.push(`\nINDUSTRY BENCHMARKS (${ctx.benchmarks.matchLevel} match):`)
    parts.push(`  EBITDA Margin Range: ${ctx.benchmarks.ebitdaMarginLow.toFixed(1)}%-${ctx.benchmarks.ebitdaMarginHigh.toFixed(1)}%`)
    parts.push(`  EBITDA Multiple Range: ${ctx.benchmarks.ebitdaMultipleLow}x-${ctx.benchmarks.ebitdaMultipleHigh}x`)
    parts.push(`  Revenue Multiple Range: ${ctx.benchmarks.revenueMultipleLow}x-${ctx.benchmarks.revenueMultipleHigh}x`)
  }

  if (ctx.coreFactors) {
    parts.push(`\nCORE FACTORS:`)
    parts.push(`  Revenue Model: ${ctx.coreFactors.revenueModel}`)
    parts.push(`  Owner Involvement: ${ctx.coreFactors.ownerInvolvement}`)
    parts.push(`  Labor Intensity: ${ctx.coreFactors.laborIntensity}`)
    parts.push(`  Asset Intensity: ${ctx.coreFactors.assetIntensity}`)
    parts.push(`  Gross Margin Proxy: ${ctx.coreFactors.grossMarginProxy}`)
  }

  parts.push(`\nValue Gap: $${ctx.valueGap.toLocaleString()}`)

  if (ctx.businessDescription) {
    parts.push(`Business: ${ctx.businessDescription.slice(0, 300)}`)
  }

  parts.push(`\nTASKS TO ENRICH:`)
  for (const task of tasks) {
    parts.push(`\n- ID: ${task.id}`)
    parts.push(`  Title: ${task.title}`)
    parts.push(`  Category: ${task.briCategory}`)
    parts.push(`  Description: ${task.description.slice(0, 300)}`)
  }

  parts.push(`\nGenerate a companyContext for each task using the financial data provided. Show transparent math.`)

  return parts.join('\n')
}

// ─── Rule-Based Fallback ────────────────────────────────────────────────

function generateRuleBasedContext(
  ctx: PersonalizationContext
): CompanyContextData {
  if (ctx.tier === 'HIGH' && ctx.financials && ctx.benchmarks) {
    const margin = ctx.financials.ebitdaMarginPct ?? 0
    const benchLow = ctx.benchmarks.ebitdaMarginLow
    const benchHigh = ctx.benchmarks.ebitdaMarginHigh
    return {
      yourSituation: {
        metric: 'EBITDA Margin',
        value: `${margin.toFixed(1)}%`,
        source: ctx.financials.source,
      },
      industryBenchmark: {
        range: `${benchLow}-${benchHigh}%`,
        source: `${ctx.company.subSector} sector data`,
      },
      financialImpact: {
        gapDescription: margin < benchLow
          ? `Your margin is ${(benchLow - margin).toFixed(1)} points below the industry low`
          : margin > benchHigh
            ? `Your margin is ${(margin - benchHigh).toFixed(1)} points above the industry high`
            : `Your margin is within the industry range`,
        dollarImpact: `Value gap: $${ctx.valueGap.toLocaleString()}`,
        enterpriseValueImpact: `At ${ctx.benchmarks.ebitdaMultipleLow}x-${ctx.benchmarks.ebitdaMultipleHigh}x EBITDA`,
        calculation: `Margin: ${margin.toFixed(1)}% vs industry ${benchLow}-${benchHigh}%`,
      },
      contextNote: `Based on your ${ctx.company.subSector} financials and industry benchmarks.`,
      dataQuality: 'HIGH',
      addFinancialsCTA: false,
      financialSnapshot: {
        revenue: ctx.financials.revenue,
        ebitda: ctx.financials.ebitda,
        ebitdaMarginPct: ctx.financials.ebitdaMarginPct ?? 0,
        enrichedAt: new Date().toISOString(),
      },
      benchmarkSnapshot: {
        ebitdaMarginLow: ctx.benchmarks.ebitdaMarginLow,
        ebitdaMarginHigh: ctx.benchmarks.ebitdaMarginHigh,
        ebitdaMultipleLow: ctx.benchmarks.ebitdaMultipleLow,
        ebitdaMultipleHigh: ctx.benchmarks.ebitdaMultipleHigh,
        capturedAt: new Date().toISOString(),
      },
    }
  }

  if (ctx.tier === 'MODERATE') {
    return {
      yourSituation: {
        metric: 'Assessment',
        value: 'Based on your business profile',
        source: 'From your assessment data',
      },
      industryBenchmark: ctx.benchmarks ? {
        range: `${ctx.benchmarks.ebitdaMarginLow.toFixed(1)}-${ctx.benchmarks.ebitdaMarginHigh.toFixed(1)}% EBITDA margin typical`,
        source: `${ctx.company.subSector} sector data`,
      } : null,
      financialImpact: null,
      contextNote: 'Add your financials to see specific dollar impact for this task.',
      dataQuality: 'MODERATE',
      addFinancialsCTA: true,
    }
  }

  // LOW tier
  return {
    yourSituation: {
      metric: 'Assessment',
      value: 'Limited data available',
      source: 'From your assessment',
    },
    industryBenchmark: null,
    financialImpact: null,
    contextNote: 'Add your financials to unlock personalized insights and dollar impact.',
    dataQuality: 'LOW',
    addFinancialsCTA: true,
  }
}

// ─── Types ──────────────────────────────────────────────────────────────

interface EnrichOptions {
  taskIds?: string[]
  force?: boolean  // When true, re-enrich tasks that already have companyContext
}

// ─── Main Enrichment Function ───────────────────────────────────────────

export async function enrichTasksWithContext(
  companyId: string,
  options: EnrichOptions = {}
): Promise<{ updated: number; failed: number }> {
  const { taskIds, force = false } = options

  // Fetch tasks that need enrichment
  const tasks = await prisma.task.findMany({
    where: {
      companyId,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'] },
      ...(taskIds ? { id: { in: taskIds } } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      briCategory: true,
      richDescription: true,
    },
  })

  // Filter to tasks that don't already have companyContext (unless force=true)
  const needsEnrichment = force
    ? tasks
    : tasks.filter(t => {
        if (!t.richDescription || typeof t.richDescription !== 'object') return true
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return !(t.richDescription as any).companyContext
      })

  if (needsEnrichment.length === 0) {
    return { updated: 0, failed: 0 }
  }

  // Gather personalization context
  const ctx = await gatherTaskPersonalizationContext(companyId)

  if (!ctx) {
    return { updated: 0, failed: 0 }
  }

  // LOW tier: apply rule-based context directly (no AI needed)
  if (ctx.tier === 'LOW') {
    return applyRuleBasedContextToAll(needsEnrichment, ctx)
  }

  // HIGH/MODERATE: batch AI calls (groups of 10)
  const BATCH_SIZE = 10
  let totalUpdated = 0
  let totalFailed = 0

  for (let i = 0; i < needsEnrichment.length; i += BATCH_SIZE) {
    const batch = needsEnrichment.slice(i, i + BATCH_SIZE)
    const result = await enrichBatch(companyId, batch, ctx)
    totalUpdated += result.updated
    totalFailed += result.failed
  }

  return { updated: totalUpdated, failed: totalFailed }
}

async function enrichBatch(
  companyId: string,
  tasks: TaskForEnrichment[],
  ctx: PersonalizationContext
): Promise<{ updated: number; failed: number }> {
  const startTime = Date.now()
  let updated = 0
  let failed = 0

  try {
    const prompt = buildEnrichmentPrompt(tasks, ctx)
    const { data, usage } = await generateJSON<AIContextResult>(
      prompt,
      SYSTEM_PROMPT,
      { model: 'claude-haiku', maxTokens: 4096, temperature: 0.3 }
    )

    const latencyMs = Date.now() - startTime

    // Apply AI-generated contexts
    const contextMap = new Map(
      data.contexts.map(c => [c.taskId, c])
    )

    for (const task of tasks) {
      const aiContext = contextMap.get(task.id)

      const companyContext: CompanyContextData = aiContext
        ? {
            yourSituation: aiContext.yourSituation,
            industryBenchmark: aiContext.industryBenchmark,
            financialImpact: aiContext.financialImpact,
            contextNote: aiContext.contextNote,
            dataQuality: ctx.tier,
            addFinancialsCTA: ctx.tier !== 'HIGH',
            financialSnapshot: ctx.financials ? {
              revenue: ctx.financials.revenue,
              ebitda: ctx.financials.ebitda,
              ebitdaMarginPct: ctx.financials.ebitdaMarginPct ?? 0,
              enrichedAt: new Date().toISOString(),
            } : undefined,
            benchmarkSnapshot: ctx.benchmarks ? {
              ebitdaMarginLow: ctx.benchmarks.ebitdaMarginLow,
              ebitdaMarginHigh: ctx.benchmarks.ebitdaMarginHigh,
              ebitdaMultipleLow: ctx.benchmarks.ebitdaMultipleLow,
              ebitdaMultipleHigh: ctx.benchmarks.ebitdaMultipleHigh,
              capturedAt: new Date().toISOString(),
            } : undefined,
          }
        : generateRuleBasedContext(ctx)

      try {
        await saveCompanyContext(task.id, task.richDescription, companyContext)
        updated++
      } catch {
        failed++
      }
    }

    // Log the AI call
    await prisma.aIGenerationLog.create({
      data: {
        companyId,
        generationType: 'task_context_enrichment',
        inputData: { taskCount: tasks.length, tier: ctx.tier },
        outputData: { contextCount: data.contexts.length },
        modelUsed: 'claude-haiku',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs,
      },
    })
  } catch (error) {
    console.error('[TASK_CONTEXT] AI enrichment failed, using rule-based fallback:', error)

    // Log the failure
    await prisma.aIGenerationLog.create({
      data: {
        companyId,
        generationType: 'task_context_enrichment',
        inputData: { taskCount: tasks.length, tier: ctx.tier },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        modelUsed: 'claude-haiku',
        latencyMs: Date.now() - startTime,
      },
    })

    // Apply rule-based fallback for entire batch
    const fallbackResult = await applyRuleBasedContextToAll(tasks, ctx)
    updated = fallbackResult.updated
    failed = fallbackResult.failed
  }

  return { updated, failed }
}

async function applyRuleBasedContextToAll(
  tasks: TaskForEnrichment[],
  ctx: PersonalizationContext
): Promise<{ updated: number; failed: number }> {
  let updated = 0
  const fallbackContext = generateRuleBasedContext(ctx)

  for (const task of tasks) {
    try {
      await saveCompanyContext(task.id, task.richDescription, fallbackContext)
      updated++
    } catch {
      // Task may have been deleted
    }
  }

  return { updated, failed: 0 }
}

async function saveCompanyContext(
  taskId: string,
  existingRichDescription: unknown,
  companyContext: CompanyContextData
): Promise<void> {
  // Merge companyContext into existing richDescription (or create new object)
  const existing = (existingRichDescription && typeof existingRichDescription === 'object')
    ? existingRichDescription
    : {}

  // On re-enrichment, preserve the previous benchmarkSnapshot so we can show trends.
  // The first enrichment records current benchmarks as benchmarkSnapshot.
  // On re-enrichment, the OLD benchmarkSnapshot (from previous enrichment) is carried forward
  // so the UI can compare old vs new.
  const previousContext = (existing as Record<string, unknown>).companyContext as CompanyContextData | undefined
  if (previousContext?.benchmarkSnapshot && companyContext.benchmarkSnapshot) {
    companyContext.benchmarkSnapshot = previousContext.benchmarkSnapshot
  }

  const merged = { ...existing, companyContext }

  await prisma.task.update({
    where: { id: taskId },
    data: { richDescription: merged as unknown as Prisma.InputJsonValue },
  })
}

// ─── Re-enrichment Trigger (fire-and-forget) ────────────────────────────

/**
 * Fire-and-forget: re-enrich all tasks with latest financials and notify workspace members.
 * Call this after P&L data is saved.
 */
export function triggerTaskReEnrichment(companyId: string): void {
  reEnrichAndNotify(companyId).catch(err => {
    console.error('[TASK_CONTEXT] Re-enrichment failed:', err)
  })
}

async function reEnrichAndNotify(companyId: string): Promise<void> {
  const result = await enrichTasksWithContext(companyId, { force: true })
  console.log(`[TASK_CONTEXT] Re-enrichment: ${result.updated} updated, ${result.failed} failed`)
  if (result.updated === 0) return

  // Notify all workspace members
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      workspace: {
        select: {
          members: { select: { userId: true } }
        }
      }
    }
  })
  if (!company) return

  const { createActionPlanUpdatedAlert } = await import('@/lib/alerts/alert-service')
  for (const member of company.workspace.members) {
    await createActionPlanUpdatedAlert(member.userId, company.name, result.updated)
  }
}
