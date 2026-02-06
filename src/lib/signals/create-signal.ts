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
import { sendSignalAlertEmail } from '@/lib/email/send-signal-alert-email'

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
  const signal = await prisma.signal.create({
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

  // Fire email alert for CRITICAL signals (non-blocking)
  const effectiveSeverity = input.severity ?? 'MEDIUM'
  if (effectiveSeverity === 'CRITICAL') {
    triggerCriticalSignalEmail(signal.id, input).catch((err) => {
      console.error('[Signal] Failed to send critical signal alert email:', err)
    })
  }

  return signal
}

/**
 * Sends an alert email for a CRITICAL signal.
 * De-duplicates: max 1 CRITICAL email per company per 24 hours.
 */
async function triggerCriticalSignalEmail(
  signalId: string,
  input: CreateSignalInput
) {
  // Check for any CRITICAL signal created in the last 24 hours for this company
  // (excluding the one we just created) to enforce 1/day limit
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentCritical = await prisma.signal.findFirst({
    where: {
      companyId: input.companyId,
      severity: 'CRITICAL',
      createdAt: { gte: twentyFourHoursAgo },
      id: { not: signalId },
    },
  })

  if (recentCritical) {
    console.log(`[Signal] Skipping CRITICAL alert email — already sent one for company ${input.companyId} in last 24h`)
    return
  }

  // Look up the company's subscribing owner
  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    include: {
      ownerships: {
        where: { isSubscribingOwner: true },
        include: {
          user: { select: { email: true, name: true } },
        },
        take: 1,
      },
    },
  })

  if (!company) {
    console.log(`[Signal] Company not found: ${input.companyId}`)
    return
  }

  const owner = company.ownerships[0]?.user
  if (!owner?.email) {
    console.log(`[Signal] No subscribing owner email found for company ${input.companyId}`)
    return
  }

  await sendSignalAlertEmail({
    email: owner.email,
    name: owner.name || undefined,
    companyName: company.name,
    signalTitle: input.title,
    signalDescription: input.description || 'A critical signal has been detected for your company.',
    severity: 'CRITICAL',
    estimatedValueImpact: input.estimatedValueImpact ?? null,
    category: input.category ?? null,
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
