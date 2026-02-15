import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, isAdminError } from '@/lib/admin'
import { createExternalSignal } from '@/lib/signals/create-external-signal'
import { EXTERNAL_SIGNAL_TYPES, type ExternalSignalType } from '@/lib/signals/external-signal-types'
import { validateRequestBody, uuidSchema, shortText, longText } from '@/lib/security/validation'

const CRON_SECRET = process.env.CRON_SECRET

async function authenticateRequest(request: Request): Promise<boolean> {
  // Allow CRON_SECRET for automated ingestion
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
    return true
  }

  // Otherwise require super admin
  const result = await requireSuperAdmin()
  return !isAdminError(result)
}

const externalSignalPayloadSchema = z.object({
  companyId: uuidSchema,
  sourceType: z.enum(Object.keys(EXTERNAL_SIGNAL_TYPES) as [string, ...string[]]),
  title: shortText.min(1),
  description: longText.optional().nullable(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().nullable(),
  estimatedValueImpact: z.coerce.number().finite().optional().nullable(),
  rawData: z.record(z.string(), z.any()).optional().nullable(),
})

const externalSignalBatchSchema = z.union([
  externalSignalPayloadSchema,
  z.object({ signals: z.array(externalSignalPayloadSchema).max(100) }),
])

export async function POST(request: Request) {
  const isAuthed = await authenticateRequest(request)
  if (!isAuthed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const validation = await validateRequestBody(request, externalSignalBatchSchema)
  if (!validation.success) return validation.error

  // Support batch mode: { signals: [...] } or single: { companyId, ... }
  const payloads = 'signals' in validation.data ? validation.data.signals : [validation.data]
  const results: Array<{ success: boolean; signalId?: string; error?: string }> = []

  for (const payload of payloads) {

    try {
      const signal = await createExternalSignal({
        companyId: payload.companyId,
        sourceType: payload.sourceType as ExternalSignalType,
        title: payload.title,
        description: payload.description,
        severity: payload.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined,
        estimatedValueImpact: payload.estimatedValueImpact ?? null,
        rawData: payload.rawData,
      })
      results.push({ success: true, signalId: signal.id })
    } catch (error) {
      // SECURITY FIX (PROD-060): Removed String(error) to prevent leaking stack traces
      console.error('Error creating external signal:', error instanceof Error ? error.message : String(error))
      results.push({ success: false, error: 'Failed to create signal' })
    }
  }

  const succeeded = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return NextResponse.json({
    results,
    summary: { total: results.length, succeeded, failed },
  }, { status: failed === results.length ? 400 : 201 })
}
