/**
 * Advisor Signal Confirmation & Dismissal
 *
 * When an advisor confirms a signal:
 *   - Confidence is upgraded (UNCERTAIN -> CONFIDENT, etc.)
 *   - Signal is marked as acknowledged
 *   - Value Ledger entry records the confirmation and any value impact change
 *
 * When an advisor dismisses/denies a signal:
 *   - Confidence is downgraded (CONFIDENT -> UNCERTAIN, etc.)
 *   - Signal is marked as dismissed (not resolved -- dismissed means advisor disagrees)
 *   - Value Ledger entry records the dismissal with reason
 *   - If the signal had estimated value impact, the downgraded confidence
 *     reduces its effective weight in the system
 */

import { prisma } from '@/lib/prisma'
import { createLedgerEntry } from '@/lib/value-ledger/create-entry'
import {
  getUpgradedConfidence,
  getDowngradedConfidence,
  applyConfidenceWeight,
} from './confidence-scoring'

export async function confirmSignal(signalId: string, confirmedByUserId: string) {
  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
  })

  if (!signal) throw new Error('Signal not found')

  const previousConfidence = signal.confidence
  const upgradedConfidence = getUpgradedConfidence(signal.confidence)

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

  // Calculate the value impact change from confidence upgrade
  const rawImpact = signal.estimatedValueImpact ? Number(signal.estimatedValueImpact) : 0
  const previousWeightedImpact = applyConfidenceWeight(rawImpact, previousConfidence)
  const newWeightedImpact = applyConfidenceWeight(rawImpact, upgradedConfidence)
  const deltaValueRecovered = Math.max(0, newWeightedImpact - previousWeightedImpact)

  // Create ledger entry for audit trail
  await createLedgerEntry({
    companyId: signal.companyId,
    eventType: 'SIGNAL_CONFIRMED',
    category: signal.category,
    signalId: signal.id,
    confidenceLevel: upgradedConfidence,
    deltaValueRecovered,
    deltaValueAtRisk: 0,
    narrativeSummary: `Signal "${signal.title}" confirmed by advisor. Confidence upgraded from ${previousConfidence} to ${upgradedConfidence}.${deltaValueRecovered > 0 ? ` Effective value impact increased by $${Math.round(deltaValueRecovered).toLocaleString()}.` : ''}`,
  })

  return updated
}

export async function dismissSignal(signalId: string, dismissedByUserId: string, reason: string) {
  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
  })

  if (!signal) throw new Error('Signal not found')

  const previousConfidence = signal.confidence
  const downgradedConfidence = getDowngradedConfidence(signal.confidence)

  const updated = await prisma.signal.update({
    where: { id: signalId },
    data: {
      confidence: downgradedConfidence,
      resolutionStatus: 'DISMISSED',
      resolvedAt: new Date(),
      resolvedByUserId: dismissedByUserId,
      resolutionNotes: reason,
    },
  })

  // Calculate the value impact change from confidence downgrade
  const rawImpact = signal.estimatedValueImpact ? Number(signal.estimatedValueImpact) : 0
  const previousWeightedImpact = applyConfidenceWeight(rawImpact, previousConfidence)
  const newWeightedImpact = applyConfidenceWeight(rawImpact, downgradedConfidence)
  const deltaValueAtRisk = Math.max(0, previousWeightedImpact - newWeightedImpact)

  // Create ledger entry for audit trail
  await createLedgerEntry({
    companyId: signal.companyId,
    eventType: 'SIGNAL_CONFIRMED', // Reusing event type -- the narrative distinguishes confirm vs dismiss
    category: signal.category,
    signalId: signal.id,
    confidenceLevel: downgradedConfidence,
    deltaValueRecovered: 0,
    deltaValueAtRisk,
    narrativeSummary: `Signal "${signal.title}" dismissed by advisor: "${reason}". Confidence downgraded from ${previousConfidence} to ${downgradedConfidence}.`,
  })

  return updated
}
