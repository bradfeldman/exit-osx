import { prisma } from '@/lib/prisma'
import { generateJSON } from '@/lib/ai/anthropic'
import { getCurrentDossier } from './build-dossier'
import type { CompanyDossierContent, TaskGenerationResult } from './types'
import type { BriCategory } from '@prisma/client'
import { calculateTaskPriorityFromAttributes, initializeActionPlan } from '@/lib/tasks/action-plan'
import { enrichTasksWithContext } from '@/lib/tasks/enrich-task-context'

// Same tier allocations as the template-based system
const TIER_ALLOCATION: Record<string, number> = {
  CRITICAL: 0.60,
  SIGNIFICANT: 0.30,
  OPTIMIZATION: 0.10,
}

const EFFORT_MULTIPLIERS: Record<string, number> = {
  MINIMAL: 0.5,
  LOW: 1,
  MODERATE: 2,
  HIGH: 4,
  MAJOR: 8,
}

interface AssessmentResponseForTasks {
  questionId: string
  selectedOptionId: string
  question: {
    id: string
    questionText: string
    briCategory: string
    issueTier: string
    maxImpactPoints: { toString(): string }
  }
  selectedOption: {
    id: string
    scoreValue: { toString(): string }
  }
}

interface SnapshotForTasks {
  valueGap: { toString(): string }
  briScore: { toString(): string }
}

function buildTaskSystemPrompt(): string {
  return `You are a task generation engine for Exit OSx, a platform that helps business owners prepare for a company exit or sale.

Given a company's dossier and their BRI assessment responses, generate specific, actionable improvement tasks. Each task should upgrade the company's answer from their current option to a better one.

RULES:
1. Only generate tasks for questions where scoreValue < 1.0 (not already perfect)
2. Each task must specify upgradeFromScore (current) and upgradeToScore (target) — these MUST be exact values from {0.00, 0.33, 0.67, 1.00}
3. upgradeToScore must be exactly one step above upgradeFromScore (0.00→0.33, 0.33→0.67, 0.67→1.00)
4. Tasks should be SPECIFIC to the company — reference their industry, size, and situation
5. Include practical steps the owner can take
6. Each task needs:
   - actionType: one of TYPE_I_EVIDENCE, TYPE_II_DOCUMENTATION, TYPE_III_OPERATIONAL, TYPE_IV_INSTITUTIONALIZE, TYPE_V_RISK_REDUCTION, TYPE_VI_ALIGNMENT, TYPE_VII_READINESS, TYPE_VIII_SIGNALING, TYPE_IX_OPTIONS, TYPE_X_DEFER
   - effortLevel: MINIMAL, LOW, MODERATE, HIGH, MAJOR
   - complexity: SIMPLE, MODERATE, COMPLEX, STRATEGIC
   - issueTier: CRITICAL, SIGNIFICANT, OPTIMIZATION
   - buyerConsequence: what happens if this ISN'T fixed (max 200 chars)
7. Focus on highest-impact improvements first
8. Generate 1 task per question that needs improvement (score < 1.0)

Return valid JSON:
{
  "tasks": [
    {
      "title": "string (imperative, concise)",
      "description": "string (2-3 sentences with specific steps)",
      "actionType": "string",
      "briCategory": "FINANCIAL|TRANSFERABILITY|OPERATIONAL|MARKET|LEGAL_TAX|PERSONAL",
      "linkedQuestionId": "string (the question ID this task improves)",
      "upgradeFromScore": 0.00|0.33|0.67,
      "upgradeToScore": 0.33|0.67|1.00,
      "effortLevel": "string",
      "complexity": "string",
      "estimatedHours": number|null,
      "issueTier": "string",
      "buyerConsequence": "string (max 200 chars)"
    }
  ],
  "reasoning": "Brief explanation of task prioritization strategy"
}`
}

function buildTaskUserPrompt(
  dossier: CompanyDossierContent,
  responses: AssessmentResponseForTasks[],
  valueGap: number,
  enrichedFinancials?: EnrichedFinancialData | null
): string {
  const parts: string[] = []

  parts.push(`COMPANY: ${dossier.identity.name} (${dossier.identity.industry} > ${dossier.identity.subSector})`)
  parts.push(`Revenue: $${dossier.financials.annualRevenue.toLocaleString()}, EBITDA: $${dossier.financials.annualEbitda.toLocaleString()}`)

  // Include detailed P&L data if available
  if (enrichedFinancials?.incomeStatement) {
    const is = enrichedFinancials.incomeStatement
    parts.push(`COGS: $${is.cogs.toLocaleString()} (Gross Margin: ${(is.grossMarginPct * 100).toFixed(1)}%)`)
    parts.push(`EBITDA Margin: ${(is.ebitdaMarginPct * 100).toFixed(1)}%`)
  } else if (dossier.financials.ebitdaMarginPct) {
    parts.push(`EBITDA Margin: ${dossier.financials.ebitdaMarginPct.toFixed(1)}%`)
  }

  // Include industry benchmarks if available
  if (enrichedFinancials?.benchmarks) {
    const b = enrichedFinancials.benchmarks
    parts.push(`Industry EBITDA Margin Range: ${(b.ebitdaMarginLow * 100).toFixed(1)}-${(b.ebitdaMarginHigh * 100).toFixed(1)}%`)
    parts.push(`Industry EBITDA Multiple Range: ${b.ebitdaMultipleLow}x-${b.ebitdaMultipleHigh}x`)
    parts.push(`Industry Revenue Multiple Range: ${b.revenueMultipleLow}x-${b.revenueMultipleHigh}x`)
  }

  parts.push(`Value Gap: $${valueGap.toLocaleString()}`)

  // Include all core factors (not just revenueModel and ownerInvolvement)
  if (dossier.identity.coreFactors) {
    const cf = dossier.identity.coreFactors
    parts.push(`\nCORE FACTORS:`)
    parts.push(`  Revenue Model: ${cf.revenueModel}`)
    parts.push(`  Owner Involvement: ${cf.ownerInvolvement}`)
    parts.push(`  Labor Intensity: ${cf.laborIntensity}`)
    parts.push(`  Asset Intensity: ${cf.assetIntensity}`)
    parts.push(`  Gross Margin Proxy: ${cf.grossMarginProxy}`)
  }

  // Include business description if available
  if (dossier.identity.businessDescription) {
    parts.push(`\nBusiness: ${dossier.identity.businessDescription.slice(0, 300)}`)
  }

  parts.push(`\nASSESSMENT RESPONSES (questions needing improvement):`)

  const needsImprovement = responses.filter(
    r => Number(r.selectedOption.scoreValue) < 1.0
  )

  for (const r of needsImprovement) {
    const score = Number(r.selectedOption.scoreValue)
    parts.push(`- [${r.question.briCategory}/${r.question.issueTier}] Q: "${r.question.questionText}" → Current score: ${score.toFixed(2)} (ID: ${r.questionId})`)
  }

  parts.push(`\nGenerate one task per question listed above. Each task should upgrade the answer by one step. Reference specific financial data and industry benchmarks where relevant.`)

  return parts.join('\n')
}

// Enriched financial data for richer AI task generation prompts
interface EnrichedFinancialData {
  incomeStatement: {
    cogs: number
    grossMarginPct: number
    ebitdaMarginPct: number
  } | null
  benchmarks: {
    ebitdaMarginLow: number
    ebitdaMarginHigh: number
    ebitdaMultipleLow: number
    ebitdaMultipleHigh: number
    revenueMultipleLow: number
    revenueMultipleHigh: number
  } | null
}

async function fetchEnrichedFinancials(companyId: string): Promise<EnrichedFinancialData | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { icbSubSector: true, icbSector: true, icbSuperSector: true, icbIndustry: true },
  })
  if (!company) return null

  const [period, benchmarks] = await Promise.all([
    prisma.financialPeriod.findFirst({
      where: { companyId },
      orderBy: { endDate: 'desc' },
      include: { incomeStatement: true },
    }),
    company.icbSubSector
      ? (await import('@/lib/valuation/industry-multiples')).getIndustryMultiples(
          company.icbSubSector,
          company.icbSector ?? undefined,
          company.icbSuperSector ?? undefined,
          company.icbIndustry ?? undefined
        )
      : null,
  ])

  return {
    incomeStatement: period?.incomeStatement
      ? {
          cogs: Number(period.incomeStatement.cogs),
          grossMarginPct: Number(period.incomeStatement.grossMarginPct),
          ebitdaMarginPct: Number(period.incomeStatement.ebitdaMarginPct),
        }
      : null,
    benchmarks: benchmarks && !benchmarks.isDefault
      ? {
          ebitdaMarginLow: benchmarks.ebitdaMarginLow ?? 0,
          ebitdaMarginHigh: benchmarks.ebitdaMarginHigh ?? 0,
          ebitdaMultipleLow: benchmarks.ebitdaMultipleLow,
          ebitdaMultipleHigh: benchmarks.ebitdaMultipleHigh,
          revenueMultipleLow: benchmarks.revenueMultipleLow,
          revenueMultipleHigh: benchmarks.revenueMultipleHigh,
        }
      : null,
  }
}

/**
 * Generate AI-powered tasks for a company based on dossier + assessment responses.
 * Replaces template-based task generation for companies with AI questions.
 */
export async function generateAITasksForCompany(
  companyId: string,
  responses: AssessmentResponseForTasks[],
  snapshot: SnapshotForTasks
): Promise<{ created: number; skipped: number }> {
  const valueGap = Number(snapshot.valueGap)
  const dossier = await getCurrentDossier(companyId)

  if (!dossier) {
    throw new Error(`No dossier found for company ${companyId}`)
  }

  const content = dossier.content as unknown as CompanyDossierContent

  // Clear existing pending tasks
  await prisma.task.deleteMany({
    where: { companyId, status: 'PENDING' },
  })

  // Check for single-user auto-assign
  let defaultAssigneeId: string | null = null
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { workspaceId: true },
  })
  if (company) {
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId: company.workspaceId },
      select: { userId: true },
    })
    if (workspaceMembers.length === 1) {
      defaultAssigneeId = workspaceMembers[0].userId
    }
  }

  // Only include responses scoring < 1.0
  const improvableResponses = responses.filter(
    r => Number(r.selectedOption.scoreValue) < 1.0
  )

  if (improvableResponses.length === 0) {
    return { created: 0, skipped: 0 }
  }

  // Fetch enriched financial data for richer prompts
  const enrichedFinancials = await fetchEnrichedFinancials(companyId)

  const systemPrompt = buildTaskSystemPrompt()
  const userPrompt = buildTaskUserPrompt(content, improvableResponses, valueGap, enrichedFinancials)

  const startTime = Date.now()

  const { data, usage } = await generateJSON<TaskGenerationResult>(
    userPrompt,
    systemPrompt,
    { model: 'claude-sonnet', maxTokens: 8192, temperature: 0.5 }
  )

  const latencyMs = Date.now() - startTime

  // Pre-fetch all options for the relevant questions
  const questionIds = improvableResponses.map(r => r.questionId)
  const allOptions = await prisma.questionOption.findMany({
    where: { questionId: { in: questionIds } },
    orderBy: { scoreValue: 'asc' },
  })

  const optionsByQuestionId = new Map<string, typeof allOptions>()
  for (const option of allOptions) {
    const existing = optionsByQuestionId.get(option.questionId) || []
    existing.push(option)
    optionsByQuestionId.set(option.questionId, existing)
  }

  // Count by tier for value allocation
  const tierCounts: Record<string, number> = { CRITICAL: 0, SIGNIFICANT: 0, OPTIMIZATION: 0 }
  for (const task of data.tasks) {
    tierCounts[task.issueTier] = (tierCounts[task.issueTier] || 0) + 1
  }

  let created = 0
  let skipped = 0

  for (const task of data.tasks) {
    try {
      // Find upgrade options
      const options = optionsByQuestionId.get(task.linkedQuestionId) || []
      const scoreTolerance = 0.05

      const fromOption = options.find(
        o => Math.abs(Number(o.scoreValue) - task.upgradeFromScore) <= scoreTolerance
      )
      const toOption = options.find(
        o => Math.abs(Number(o.scoreValue) - task.upgradeToScore) <= scoreTolerance
      )

      if (!fromOption || !toOption) {
        console.log(`[AI_TASK_ENGINE] Could not find upgrade options for: ${task.title}`)
        skipped++
        continue
      }

      // Calculate value using tier allocation
      const tierAllocation = TIER_ALLOCATION[task.issueTier] || 0.1
      const questionsInTier = tierCounts[task.issueTier] || 1
      const scoreImprovement = task.upgradeToScore - task.upgradeFromScore
      const rawImpact = (tierAllocation * valueGap / questionsInTier) * scoreImprovement

      const effortMultiplier = EFFORT_MULTIPLIERS[task.effortLevel] || 2
      const normalizedValue = rawImpact / effortMultiplier

      const scoreForPriority = Number(fromOption.scoreValue)
      const { impactLevel, difficultyLevel, priorityRank } = calculateTaskPriorityFromAttributes(
        scoreForPriority,
        task.effortLevel,
        task.estimatedHours ?? undefined
      )

      await prisma.task.create({
        data: {
          companyId,
          title: task.title,
          description: task.description,
          actionType: task.actionType as never,
          briCategory: task.briCategory as BriCategory as never,
          linkedQuestionId: task.linkedQuestionId,
          upgradesFromOptionId: fromOption.id,
          upgradesToOptionId: toOption.id,
          rawImpact,
          normalizedValue,
          issueTier: task.issueTier as never,
          effortLevel: task.effortLevel as never,
          complexity: task.complexity as never,
          estimatedHours: task.estimatedHours,
          impactLevel,
          difficultyLevel,
          priorityRank,
          buyerConsequence: task.buyerConsequence?.slice(0, 200) ?? null,
          inActionPlan: false,
          ...(defaultAssigneeId && { primaryAssigneeId: defaultAssigneeId }),
          status: 'PENDING',
        },
      })
      created++
    } catch (error) {
      console.error(`[AI_TASK_ENGINE] Error creating task: ${task.title}`, error)
      skipped++
    }
  }

  // Initialize action plan
  const actionPlanResult = await initializeActionPlan(companyId)

  // Enrich tasks with personalized company context (non-blocking)
  try {
    const enrichResult = await enrichTasksWithContext(companyId)
    console.log(`[AI_TASK_ENGINE] Context enrichment: ${enrichResult.updated} enriched, ${enrichResult.failed} failed`)
  } catch (error) {
    console.error('[AI_TASK_ENGINE] Context enrichment failed (non-blocking):', error)
  }

  // Log
  await prisma.aIGenerationLog.create({
    data: {
      companyId,
      generationType: 'dossier_tasks',
      inputData: { dossierVersion: dossier.version, responseCount: improvableResponses.length },
      outputData: { taskCount: created, reasoning: data.reasoning },
      modelUsed: 'claude-sonnet',
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      latencyMs,
    },
  })

  console.log(`[AI_TASK_ENGINE] Generated ${created} AI tasks for company ${companyId}`)
  console.log(`[AI_TASK_ENGINE] Action plan: ${actionPlanResult.initialized} tasks, Queue: ${actionPlanResult.queued} tasks`)

  return { created, skipped }
}
