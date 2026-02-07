import { NextResponse } from 'next/server'
import { requireSuperAdmin, isAdminError } from '@/lib/admin'
import { createExternalSignal } from '@/lib/signals/create-external-signal'
import { EXTERNAL_SIGNAL_TYPES, type ExternalSignalType } from '@/lib/signals/external-signal-types'

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

interface ExternalSignalPayload {
  companyId: string
  sourceType: string
  title: string
  description?: string
  severity?: string
  estimatedValueImpact?: number
  rawData?: Record<string, unknown>
}

function validatePayload(payload: ExternalSignalPayload): string | null {
  if (!payload.companyId) return 'companyId is required'
  if (!payload.sourceType) return 'sourceType is required'
  if (!payload.title) return 'title is required'
  if (!(payload.sourceType in EXTERNAL_SIGNAL_TYPES)) {
    return `Invalid sourceType: ${payload.sourceType}. Valid types: ${Object.keys(EXTERNAL_SIGNAL_TYPES).join(', ')}`
  }
  return null
}

export async function POST(request: Request) {
  const isAuthed = await authenticateRequest(request)
  if (!isAuthed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()

  // Support batch mode: { signals: [...] } or single: { companyId, ... }
  const payloads: ExternalSignalPayload[] = Array.isArray(body.signals) ? body.signals : [body]
  const results: Array<{ success: boolean; signalId?: string; error?: string }> = []

  for (const payload of payloads) {
    const validationError = validatePayload(payload)
    if (validationError) {
      results.push({ success: false, error: validationError })
      continue
    }

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
      results.push({ success: false, error: String(error) })
    }
  }

  const succeeded = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return NextResponse.json({
    results,
    summary: { total: results.length, succeeded, failed },
  }, { status: failed === results.length ? 400 : 201 })
}
