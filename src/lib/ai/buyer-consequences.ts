// PROD-058: AI-Powered Buyer Consequence Generation
// Generates buyer-framed consequence strings for tasks that lack them.
//
// Architecture:
//   Rules layer: deterministic fallback consequences by BRI category
//   AI layer: personalized buyer-framed consequences using company context
//   Integration: AI first, rules fallback on failure
//
// Usage: Called after template-based task generation to enrich tasks
// that don't have a buyerConsequence (AI-generated tasks already include them).

import { generateJSON } from '@/lib/ai/anthropic'
import { prisma } from '@/lib/prisma'
import type { BriCategory } from '@prisma/client'

// ─── Types ──────────────────────────────────────────────────────────────

export interface TaskForConsequence {
  id: string
  title: string
  description: string
  briCategory: string
  issueTier: string | null
  buyerConsequence: string | null
}

export interface CompanyContext {
  name: string
  industry: string
  subSector: string
  annualRevenue: number
  annualEbitda: number
  businessDescription: string | null
}

interface AIConsequenceResult {
  consequences: Array<{
    taskId: string
    buyerConsequence: string
  }>
}

// ─── Rules-Based Fallback ───────────────────────────────────────────────

const CATEGORY_FALLBACKS: Record<string, string> = {
  FINANCIAL:
    'A buyer will see unresolved financial gaps as a valuation risk, potentially discounting the offer or requiring escrow holdbacks.',
  TRANSFERABILITY:
    'A buyer will worry the business cannot operate without the current owner, increasing perceived transition risk.',
  OPERATIONAL:
    'A buyer will view operational weaknesses as hidden costs that erode post-acquisition margins.',
  MARKET:
    'A buyer will question market defensibility, reducing their confidence in sustainable revenue growth.',
  LEGAL_TAX:
    'A buyer will flag unresolved legal or tax issues as potential liabilities that could delay or kill the deal.',
  PERSONAL:
    'A buyer will sense misalignment on exit readiness, creating concern about deal certainty and timeline.',
}

const TIER_MODIFIERS: Record<string, string> = {
  CRITICAL: 'This is likely a deal-breaker issue that buyers will surface in early due diligence.',
  SIGNIFICANT: 'Buyers will use this to negotiate a lower price or demand protective terms.',
  OPTIMIZATION: 'Sophisticated buyers will note this as a post-close improvement opportunity, slightly discounting value.',
}

/**
 * Generate a deterministic fallback consequence when AI is unavailable.
 * Combines category-specific buyer framing with tier severity.
 */
export function generateFallbackConsequence(
  briCategory: string,
  issueTier: string | null
): string {
  const categoryText = CATEGORY_FALLBACKS[briCategory] ?? CATEGORY_FALLBACKS.FINANCIAL
  const tierText = issueTier ? TIER_MODIFIERS[issueTier] : ''

  // Combine but keep under 200 chars
  const combined = tierText ? `${categoryText} ${tierText}` : categoryText
  return combined.slice(0, 200)
}

// ─── AI Consequence Generation ──────────────────────────────────────────

const SYSTEM_PROMPT = `You are an M&A advisor generating buyer-perspective consequence statements for business improvement tasks.

Each consequence should:
- Be written from the BUYER'S perspective: "A buyer will see this as..." or "Buyers will..."
- Be specific to the task and the company's situation
- Explain the valuation or deal impact if the issue is NOT resolved
- Be concise: maximum 180 characters
- Be professional but direct — this is for a business owner preparing for exit

Return JSON:
{
  "consequences": [
    { "taskId": "string", "buyerConsequence": "string (max 180 chars)" }
  ]
}`

function buildConsequencePrompt(
  tasks: TaskForConsequence[],
  context: CompanyContext
): string {
  const parts: string[] = []

  parts.push(`COMPANY: ${context.name}`)
  parts.push(`Industry: ${context.industry} > ${context.subSector}`)
  parts.push(`Revenue: $${context.annualRevenue.toLocaleString()}, EBITDA: $${context.annualEbitda.toLocaleString()}`)
  if (context.businessDescription) {
    parts.push(`Description: ${context.businessDescription}`)
  }

  parts.push(`\nTASKS NEEDING BUYER CONSEQUENCES:`)

  for (const task of tasks) {
    parts.push(`\n- ID: ${task.id}`)
    parts.push(`  Title: ${task.title}`)
    parts.push(`  Category: ${task.briCategory}, Tier: ${task.issueTier ?? 'OPTIMIZATION'}`)
    parts.push(`  Description: ${task.description.slice(0, 200)}`)
  }

  parts.push(`\nGenerate a buyer-perspective consequence for each task. Maximum 180 characters each.`)

  return parts.join('\n')
}

/**
 * Generate AI-powered buyer consequences for tasks that lack them.
 *
 * - Fetches company context from the dossier or directly from DB
 * - Batches up to 15 tasks per AI call for efficiency
 * - Falls back to rule-based consequences if AI fails
 * - Logs to AIGenerationLog
 *
 * @returns Count of tasks updated
 */
export async function generateBuyerConsequences(
  companyId: string,
  tasks: TaskForConsequence[]
): Promise<{ updated: number; failed: number }> {
  // Filter to tasks without consequences
  const needsConsequence = tasks.filter(t => !t.buyerConsequence)

  if (needsConsequence.length === 0) {
    return { updated: 0, failed: 0 }
  }

  // Get company context
  const context = await getCompanyContext(companyId)

  if (!context) {
    // No context available — use fallbacks for all
    return applyFallbackConsequences(needsConsequence)
  }

  // Batch in groups of 15 to keep prompts manageable
  const BATCH_SIZE = 15
  let totalUpdated = 0
  let totalFailed = 0

  for (let i = 0; i < needsConsequence.length; i += BATCH_SIZE) {
    const batch = needsConsequence.slice(i, i + BATCH_SIZE)
    const result = await generateConsequenceBatch(companyId, batch, context)
    totalUpdated += result.updated
    totalFailed += result.failed
  }

  return { updated: totalUpdated, failed: totalFailed }
}

async function generateConsequenceBatch(
  companyId: string,
  tasks: TaskForConsequence[],
  context: CompanyContext
): Promise<{ updated: number; failed: number }> {
  const startTime = Date.now()
  let updated = 0
  let failed = 0

  try {
    const prompt = buildConsequencePrompt(tasks, context)
    const { data, usage } = await generateJSON<AIConsequenceResult>(
      prompt,
      SYSTEM_PROMPT,
      { model: 'claude-haiku', maxTokens: 2048, temperature: 0.5 }
    )

    const latencyMs = Date.now() - startTime

    // Apply AI-generated consequences
    const consequenceMap = new Map(
      data.consequences.map(c => [c.taskId, c.buyerConsequence])
    )

    for (const task of tasks) {
      const consequence = consequenceMap.get(task.id)
      if (consequence) {
        await prisma.task.update({
          where: { id: task.id },
          data: { buyerConsequence: consequence.slice(0, 200) },
        })
        updated++
      } else {
        // AI didn't return a consequence for this task — use fallback
        const fallback = generateFallbackConsequence(task.briCategory, task.issueTier)
        await prisma.task.update({
          where: { id: task.id },
          data: { buyerConsequence: fallback },
        })
        failed++
      }
    }

    // Log the AI call
    await prisma.aIGenerationLog.create({
      data: {
        companyId,
        generationType: 'buyer_consequences',
        inputData: { taskCount: tasks.length },
        outputData: { consequenceCount: data.consequences.length },
        modelUsed: 'claude-haiku',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs,
      },
    })
  } catch (error) {
    console.error('[BUYER_CONSEQUENCE] AI generation failed, using fallbacks:', error)

    // Log the failure
    await prisma.aIGenerationLog.create({
      data: {
        companyId,
        generationType: 'buyer_consequences',
        inputData: { taskCount: tasks.length },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        modelUsed: 'claude-haiku',
        latencyMs: Date.now() - startTime,
      },
    })

    // Apply fallbacks for the entire batch
    const result = await applyFallbackConsequences(tasks)
    updated = result.updated
    failed = result.failed
  }

  return { updated, failed }
}

async function applyFallbackConsequences(
  tasks: TaskForConsequence[]
): Promise<{ updated: number; failed: number }> {
  let updated = 0

  for (const task of tasks) {
    try {
      const fallback = generateFallbackConsequence(task.briCategory, task.issueTier)
      await prisma.task.update({
        where: { id: task.id },
        data: { buyerConsequence: fallback },
      })
      updated++
    } catch {
      // Task update failed — likely task was deleted between generation and update
    }
  }

  return { updated, failed: 0 }
}

async function getCompanyContext(companyId: string): Promise<CompanyContext | null> {
  // Try dossier first (richest context)
  const dossier = await prisma.companyDossier.findFirst({
    where: { companyId, isCurrent: true },
  })

  if (dossier) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = dossier.content as any
    if (content?.identity && content?.financials) {
      return {
        name: content.identity.name,
        industry: content.identity.industry,
        subSector: content.identity.subSector,
        annualRevenue: content.financials.annualRevenue,
        annualEbitda: content.financials.annualEbitda,
        businessDescription: content.identity.businessDescription,
      }
    }
  }

  // Fallback: query company directly
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      icbIndustry: true,
      icbSubSector: true,
      businessDescription: true,
    },
  })

  if (!company) return null

  // Get latest financial data
  const latestFinancial = await prisma.financialPeriod.findFirst({
    where: { companyId },
    orderBy: { periodEnd: 'desc' },
    select: { revenue: true, adjustedEbitda: true },
  })

  return {
    name: company.name,
    industry: company.icbIndustry ?? 'Unknown',
    subSector: company.icbSubSector ?? 'Unknown',
    annualRevenue: latestFinancial ? Number(latestFinancial.revenue) : 0,
    annualEbitda: latestFinancial ? Number(latestFinancial.adjustedEbitda) : 0,
    businessDescription: company.businessDescription,
  }
}
