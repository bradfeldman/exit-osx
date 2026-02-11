import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncQuickBooksData } from '@/lib/integrations/quickbooks/sync'
import { createSignalWithLedgerEntry } from '@/lib/signals/create-signal'
import { verifyCronAuth } from '@/lib/security/cron-auth'

/**
 * PROD-056: QuickBooks Scheduled Sync Cron
 *
 * Schedule: Daily at 2am
 *
 * Logic:
 * 1. Find all companies with active QuickBooks integrations
 * 2. For each, trigger sync using syncQuickBooksData()
 * 3. Log sync status per company
 * 4. Create signal if sync fails (so user is aware)
 * 5. Don't sync if last sync was < 12 hours ago (prevent over-syncing)
 * 6. Token refresh is handled automatically by the sync logic
 */
export async function GET(request: Request) {
  // SECURITY FIX (PROD-060): Uses verifyCronAuth which fails closed when CRON_SECRET is not set.
  const authError = verifyCronAuth(request)
  if (authError) return authError

  try {
    const now = new Date()
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)

    // Find all active QuickBooks integrations
    const integrations = await prisma.integration.findMany({
      where: {
        provider: 'QUICKBOOKS_ONLINE',
        autoSyncEnabled: true,
        disconnectedAt: null,
        company: {
          deletedAt: null,
        },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (integrations.length === 0) {
      console.log('[SyncQuickBooks] No active integrations found')
      return NextResponse.json({
        success: true,
        message: 'No active QuickBooks integrations found',
        integrationsChecked: 0,
        synced: 0,
        skipped: 0,
        failed: 0,
      })
    }

    let synced = 0
    let skipped = 0
    let failed = 0
    const results: Array<{
      companyId: string
      companyName: string
      status: 'synced' | 'skipped' | 'failed'
      periodsCreated?: number
      periodsUpdated?: number
      error?: string
    }> = []

    for (const integration of integrations) {
      try {
        // Skip if synced recently (within last 12 hours)
        if (integration.lastSyncAt && integration.lastSyncAt > twelveHoursAgo) {
          console.log(
            `[SyncQuickBooks] Skipping ${integration.company.name} - synced ${Math.round((now.getTime() - integration.lastSyncAt.getTime()) / (1000 * 60 * 60))} hours ago`
          )
          skipped++
          results.push({
            companyId: integration.companyId,
            companyName: integration.company.name,
            status: 'skipped',
          })
          continue
        }

        console.log(`[SyncQuickBooks] Starting sync for ${integration.company.name}`)

        // Trigger sync
        const syncResult = await syncQuickBooksData(integration.id, 'auto')

        if (syncResult.success) {
          synced++
          results.push({
            companyId: integration.companyId,
            companyName: integration.company.name,
            status: 'synced',
            periodsCreated: syncResult.periodsCreated,
            periodsUpdated: syncResult.periodsUpdated,
          })
          console.log(
            `[SyncQuickBooks] Successfully synced ${integration.company.name}: ${syncResult.periodsCreated} created, ${syncResult.periodsUpdated} updated`
          )
        } else {
          failed++
          results.push({
            companyId: integration.companyId,
            companyName: integration.company.name,
            status: 'failed',
            error: syncResult.error,
          })
          console.error(
            `[SyncQuickBooks] Failed to sync ${integration.company.name}: ${syncResult.error}`
          )

          // Create signal to alert user of sync failure
          // Check for existing unresolved sync failure signal
          const existingSignal = await prisma.signal.findFirst({
            where: {
              companyId: integration.companyId,
              eventType: 'quickbooks_sync_failed',
              resolutionStatus: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
            },
          })

          if (!existingSignal) {
            await createSignalWithLedgerEntry({
              companyId: integration.companyId,
              channel: 'EXTERNAL',
              eventType: 'quickbooks_sync_failed',
              category: 'FINANCIAL',
              severity: 'MEDIUM',
              confidence: 'CONFIDENT',
              title: 'QuickBooks sync failed',
              description: `Automatic sync failed: ${syncResult.error || 'Unknown error'}. Your financial data may be out of date.`,
              rawData: {
                integrationId: integration.id,
                error: syncResult.error,
                lastSuccessfulSync: integration.lastSyncAt?.toISOString() || null,
              },
              sourceType: 'integration',
              sourceId: integration.id,
              ledgerEventType: 'DRIFT_DETECTED',
              narrativeSummary: 'QuickBooks integration sync failed during scheduled update',
            })
            console.log(`[SyncQuickBooks] Created sync failure signal for ${integration.company.name}`)
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[SyncQuickBooks] Error processing integration for ${integration.company.name}:`, errorMessage)
        failed++
        results.push({
          companyId: integration.companyId,
          companyName: integration.company.name,
          status: 'failed',
          error: errorMessage,
        })
      }
    }

    console.log(
      `[SyncQuickBooks] Cron complete: ${synced} synced, ${skipped} skipped, ${failed} failed`
    )

    return NextResponse.json({
      success: true,
      integrationsChecked: integrations.length,
      synced,
      skipped,
      failed,
      results,
    })
  } catch (error) {
    // SECURITY FIX (PROD-091 #6): Only log error message, not full object
    const cronErrorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[SyncQuickBooks] Cron error:', cronErrorMessage)
    return NextResponse.json(
      // SECURITY FIX (PROD-060): Removed String(error) details from response
      { error: 'Failed to run QuickBooks sync cron' },
      { status: 500 }
    )
  }
}
