import { createSignal } from './create-signal'
import { EXTERNAL_SIGNAL_TYPES, type ExternalSignalType } from './external-signal-types'
import type { BriCategory, SignalSeverity } from '@prisma/client'

interface CreateExternalSignalInput {
  companyId: string
  sourceType: ExternalSignalType
  title: string
  description?: string
  severity?: SignalSeverity
  category?: BriCategory | null
  estimatedValueImpact?: number | null
  rawData?: Record<string, unknown>
}

export async function createExternalSignal(input: CreateExternalSignalInput) {
  const typeConfig = EXTERNAL_SIGNAL_TYPES[input.sourceType]
  if (!typeConfig) {
    throw new Error(`Unknown external signal type: ${input.sourceType}`)
  }

  return createSignal({
    companyId: input.companyId,
    channel: 'EXTERNAL',
    category: input.category ?? typeConfig.category,
    eventType: `external_${input.sourceType.toLowerCase()}`,
    severity: input.severity ?? typeConfig.defaultSeverity,
    confidence: 'SOMEWHAT_CONFIDENT',
    title: input.title,
    description: input.description ?? typeConfig.description,
    estimatedValueImpact: input.estimatedValueImpact ?? null,
    rawData: input.rawData ?? null,
    sourceType: input.sourceType,
  })
}
