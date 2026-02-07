import { prisma } from '@/lib/prisma'
import { createLedgerEntry } from '@/lib/value-ledger/create-entry'
import type { ConfidenceLevel } from '@prisma/client'

const CONFIDENCE_UPGRADE_MAP: Partial<Record<ConfidenceLevel, ConfidenceLevel>> = {
  UNCERTAIN: 'CONFIDENT',
  SOMEWHAT_CONFIDENT: 'VERIFIED',
  CONFIDENT: 'VERIFIED',
}

export async function confirmSignal(signalId: string, confirmedByUserId: string) {
  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
  })

  if (!signal) throw new Error('Signal not found')

  const upgradedConfidence = CONFIDENCE_UPGRADE_MAP[signal.confidence] ?? signal.confidence

  const updated = await prisma.signal.update({
    where: { id: signalId },
    data: {
      userConfirmed: true,
      confirmedAt: new Date(),
      confirmedByUserId,
      confidence: upgradedConfidence,
      resolutionStatus: signal.resolutionStatus === 'OPEN' ? 'ACKNOWLEDGED' : signal.resolutionStatus,
    },
  })

  // Create ledger entry for audit trail
  await createLedgerEntry({
    companyId: signal.companyId,
    eventType: 'SIGNAL_CONFIRMED',
    category: signal.category,
    signalId: signal.id,
    deltaValueRecovered: 0,
    deltaValueAtRisk: 0,
    narrativeSummary: `Signal "${signal.title}" confirmed by advisor. Confidence upgraded to ${upgradedConfidence}.`,
  })

  return updated
}

export async function dismissSignal(signalId: string, dismissedByUserId: string, reason: string) {
  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
  })

  if (!signal) throw new Error('Signal not found')

  return prisma.signal.update({
    where: { id: signalId },
    data: {
      resolutionStatus: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedByUserId: dismissedByUserId,
      resolutionNotes: reason,
    },
  })
}
