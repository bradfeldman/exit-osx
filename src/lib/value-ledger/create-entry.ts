import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { LedgerEventType, BriCategory, ConfidenceLevel } from '@prisma/client'
import { generateNarrative } from './narrative-templates'
import { generateAINarrative } from './ai-narratives'

interface CreateLedgerEntryInput {
  companyId: string
  eventType: LedgerEventType
  category?: BriCategory | null
  narrativeSummary?: string
  deltaValueRecovered?: number
  deltaValueAtRisk?: number
  deltaBri?: number | null
  briScoreBefore?: number | null
  briScoreAfter?: number | null
  valuationBefore?: number | null
  valuationAfter?: number | null
  confidenceLevel?: ConfidenceLevel
  signalId?: string | null
  taskId?: string | null
  snapshotId?: string | null
  metadata?: Record<string, unknown> | null
  occurredAt?: Date
}

export async function createLedgerEntry(input: CreateLedgerEntryInput) {
  const narrative =
    input.narrativeSummary ??
    generateNarrative({
      eventType: input.eventType,
      category: input.category,
      deltaValueRecovered: input.deltaValueRecovered,
      deltaValueAtRisk: input.deltaValueAtRisk,
      briScoreBefore: input.briScoreBefore,
      briScoreAfter: input.briScoreAfter,
    })

  return prisma.valueLedgerEntry.create({
    data: {
      companyId: input.companyId,
      eventType: input.eventType,
      category: input.category ?? undefined,
      deltaValueRecovered: input.deltaValueRecovered ?? 0,
      deltaValueAtRisk: input.deltaValueAtRisk ?? 0,
      deltaBri: input.deltaBri,
      briScoreBefore: input.briScoreBefore,
      briScoreAfter: input.briScoreAfter,
      valuationBefore: input.valuationBefore,
      valuationAfter: input.valuationAfter,
      confidenceLevel: input.confidenceLevel ?? 'SOMEWHAT_CONFIDENT',
      narrativeSummary: narrative,
      signalId: input.signalId,
      taskId: input.taskId,
      snapshotId: input.snapshotId,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
      occurredAt: input.occurredAt ?? new Date(),
    },
  })
}

interface TaskCompletionInput {
  companyId: string
  taskId: string
  taskTitle: string
  briCategory: string
  completedValue: number
  briImpact: { previousScore: number; newScore: number; categoryChanged: string } | null
  valueBefore: number | null
  valueAfter: number | null
}

export async function createLedgerEntryForTaskCompletion(input: TaskCompletionInput) {
  const deltaValueRecovered =
    input.valueBefore != null && input.valueAfter != null
      ? Math.max(0, input.valueAfter - input.valueBefore)
      : input.completedValue

  const deltaBri =
    input.briImpact
      ? input.briImpact.newScore - input.briImpact.previousScore
      : null

  // PROD-059: Use AI narrative for task completion events (falls back to template)
  let narrative: string
  try {
    const aiResult = await generateAINarrative({
      companyId: input.companyId,
      eventType: 'TASK_COMPLETED',
      category: input.briCategory as BriCategory,
      title: input.taskTitle,
      deltaValueRecovered,
      briScoreBefore: input.briImpact?.previousScore ?? null,
      briScoreAfter: input.briImpact?.newScore ?? null,
      taskId: input.taskId,
    })
    narrative = aiResult.narrative
  } catch {
    // Graceful degradation: never let AI failure block ledger entry creation
    narrative = generateNarrative({
      eventType: 'TASK_COMPLETED',
      title: input.taskTitle,
      category: input.briCategory as BriCategory,
      deltaValueRecovered,
    })
  }

  return createLedgerEntry({
    companyId: input.companyId,
    eventType: 'TASK_COMPLETED',
    category: input.briCategory as BriCategory,
    narrativeSummary: narrative,
    deltaValueRecovered,
    deltaBri,
    briScoreBefore: input.briImpact?.previousScore ?? null,
    briScoreAfter: input.briImpact?.newScore ?? null,
    valuationBefore: input.valueBefore,
    valuationAfter: input.valueAfter,
    taskId: input.taskId,
  })
}
