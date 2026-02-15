import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSignalWithLedgerEntry } from '@/lib/signals/create-signal'
import { getDefaultConfidenceForChannel } from '@/lib/signals/confidence-scoring'
import { generateNarrative } from '@/lib/value-ledger/narrative-templates'
import { verifyCronAuth } from '@/lib/security/cron-auth'
import type { TimeDecayData } from '@/lib/signals/types'

export async function GET(request: Request) {
  // SECURITY FIX (PROD-060): Uses verifyCronAuth which fails closed when CRON_SECRET is not set.
  const authError = verifyCronAuth(request)
  if (authError) return authError

  try {
    const now = new Date()

    // Find documents past their nextUpdateDue that aren't already OVERDUE
    const staleDocuments = await prisma.dataRoomDocument.findMany({
      where: {
        nextUpdateDue: { lt: now },
        status: { not: 'OVERDUE' },
      },
      select: {
        id: true,
        companyId: true,
        documentName: true,
        lastUpdatedAt: true,
        nextUpdateDue: true,
        category: true,
      },
    })

    let signalsCreated = 0

    for (const doc of staleDocuments) {
      // Check for existing unresolved signal for this document
      const existingSignal = await prisma.signal.findFirst({
        where: {
          companyId: doc.companyId,
          sourceType: 'document',
          sourceId: doc.id,
          resolutionStatus: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
        },
      })

      if (existingSignal) continue

      // Update document status to OVERDUE
      await prisma.dataRoomDocument.update({
        where: { id: doc.id },
        data: { status: 'OVERDUE' },
      })

      const daysSinceUpdate = doc.lastUpdatedAt
        ? Math.floor((now.getTime() - doc.lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0

      const rawData: TimeDecayData = {
        entityType: 'document',
        entityId: doc.id,
        entityName: doc.documentName,
        lastUpdated: doc.lastUpdatedAt?.toISOString() ?? 'never',
        daysSinceUpdate,
        thresholdDays: doc.nextUpdateDue
          ? Math.floor((doc.nextUpdateDue.getTime() - (doc.lastUpdatedAt?.getTime() ?? now.getTime())) / (1000 * 60 * 60 * 24))
          : 0,
      }

      // Escalate severity based on how overdue the document is
      const severity = daysSinceUpdate > 180 ? 'HIGH' as const
        : daysSinceUpdate > 90 ? 'MEDIUM' as const
        : 'LOW' as const

      await createSignalWithLedgerEntry({
        companyId: doc.companyId,
        channel: 'TIME_DECAY',
        eventType: 'document_overdue',
        severity,
        confidence: getDefaultConfidenceForChannel('TIME_DECAY'),
        title: `${doc.documentName} is overdue for update`,
        description: `Last updated ${daysSinceUpdate} days ago`,
        rawData: rawData as unknown as Record<string, unknown>,
        sourceType: 'document',
        sourceId: doc.id,
        ledgerEventType: 'DRIFT_DETECTED',
        narrativeSummary: generateNarrative({
          eventType: 'DRIFT_DETECTED',
          category: null,
          daysSinceUpdate,
          title: doc.documentName,
        }),
      })

      signalsCreated++
    }

    return NextResponse.json({
      message: `Processed ${staleDocuments.length} stale documents, created ${signalsCreated} signals`,
      documentsChecked: staleDocuments.length,
      signalsCreated,
    })
  } catch (error) {
    console.error('[Cron] Error detecting document decay:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to process document decay' },
      { status: 500 }
    )
  }
}
