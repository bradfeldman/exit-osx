import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type {
  SignalChannel,
  SignalSeverity,
  BriCategory,
  ConfidenceLevel,
  LedgerEventType,
} from '@prisma/client'
import { createLedgerEntry } from '@/lib/value-ledger/create-entry'

interface CreateSignalInput {
  companyId: string
  channel: SignalChannel
  category?: BriCategory | null
  eventType: string
  severity?: SignalSeverity
  confidence?: ConfidenceLevel
  title: string
  description?: string | null
  rawData?: Record<string, unknown> | null
  estimatedValueImpact?: number | null
  estimatedBriImpact?: number | null
  sourceType?: string | null
  sourceId?: string | null
  expiresAt?: Date | null
}

interface CreateSignalWithLedgerInput extends CreateSignalInput {
  ledgerEventType: LedgerEventType
  deltaValueRecovered?: number
  deltaValueAtRisk?: number
  narrativeSummary?: string
}

export async function createSignal(input: CreateSignalInput) {
  return prisma.signal.create({
    data: {
      companyId: input.companyId,
      channel: input.channel,
      category: input.category ?? undefined,
      eventType: input.eventType,
      severity: input.severity ?? 'MEDIUM',
      confidence: input.confidence ?? 'UNCERTAIN',
      title: input.title,
      description: input.description,
      rawData: (input.rawData as Prisma.InputJsonValue) ?? undefined,
      estimatedValueImpact: input.estimatedValueImpact,
      estimatedBriImpact: input.estimatedBriImpact,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      expiresAt: input.expiresAt,
    },
  })
}

export async function createSignalWithLedgerEntry(input: CreateSignalWithLedgerInput) {
  const signal = await createSignal(input)

  const ledgerEntry = await createLedgerEntry({
    companyId: input.companyId,
    eventType: input.ledgerEventType,
    category: input.category,
    signalId: signal.id,
    deltaValueRecovered: input.deltaValueRecovered ?? 0,
    deltaValueAtRisk: input.deltaValueAtRisk ?? 0,
    narrativeSummary: input.narrativeSummary,
  })

  return { signal, ledgerEntry }
}
