import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { createLedgerEntry } from '@/lib/value-ledger/create-entry'
import { generateNarrative } from '@/lib/value-ledger/narrative-templates'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; signalId: string }> }
) {
  const { id: companyId, signalId } = await params

  const result = await checkPermission('TASK_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { action, dismissalReason, adjustedImpact } = body as {
      action: 'confirm' | 'dismiss'
      dismissalReason?: string
      adjustedImpact?: number
    }

    if (!action || !['confirm', 'dismiss'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "confirm" or "dismiss"' },
        { status: 400 }
      )
    }

    const signal = await prisma.signal.findUnique({
      where: { id: signalId, companyId },
    })

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
    }

    const now = new Date()

    if (action === 'confirm') {
      const updatedSignal = await prisma.signal.update({
        where: { id: signalId },
        data: {
          userConfirmed: true,
          confirmedAt: now,
          resolutionStatus: 'RESOLVED',
          resolvedAt: now,
          estimatedValueImpact:
            adjustedImpact != null ? adjustedImpact : signal.estimatedValueImpact,
        },
      })

      const impact = adjustedImpact ?? (signal.estimatedValueImpact ? Number(signal.estimatedValueImpact) : 0)
      const isPositive = signal.severity === 'INFO' || signal.severity === 'LOW'

      const ledgerEntry = await createLedgerEntry({
        companyId,
        eventType: 'SIGNAL_CONFIRMED',
        category: signal.category,
        signalId: signal.id,
        deltaValueRecovered: isPositive ? impact : 0,
        deltaValueAtRisk: !isPositive ? impact : 0,
        narrativeSummary: generateNarrative({
          eventType: 'SIGNAL_CONFIRMED',
          description: signal.title,
          deltaValueRecovered: isPositive ? impact : 0,
          deltaValueAtRisk: !isPositive ? impact : 0,
        }),
      })

      return NextResponse.json({ signal: updatedSignal, ledgerEntry })
    } else {
      // Dismiss
      const updatedSignal = await prisma.signal.update({
        where: { id: signalId },
        data: {
          resolutionStatus: 'DISMISSED',
          resolvedAt: now,
          resolutionNotes: dismissalReason ?? null,
        },
      })

      return NextResponse.json({ signal: updatedSignal })
    }
  } catch (error) {
    console.error('[Signals] Error updating signal:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update signal' },
      { status: 500 }
    )
  }
}
