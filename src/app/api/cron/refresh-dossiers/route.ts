import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { updateDossier } from '@/lib/dossier/build-dossier'
import { verifyCronAuth } from '@/lib/security/cron-auth'

/**
 * Weekly cron job to refresh stale dossiers.
 * Rebuilds any dossier older than 7 days, or creates one for companies without a dossier.
 * Protected by CRON_SECRET header.
 */
export async function POST(request: Request) {
  // SECURITY FIX (PROD-060): Uses verifyCronAuth which fails closed when CRON_SECRET is not set.
  const authError = verifyCronAuth(request)
  if (authError) return authError

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Find companies that either have no dossier or have a stale one
    const companiesWithStaleDossier = await prisma.company.findMany({
      where: {
        deletedAt: null,
        OR: [
          // No current dossier
          { dossiers: { none: { isCurrent: true } } },
          // Current dossier is older than 7 days
          {
            dossiers: {
              some: {
                isCurrent: true,
                createdAt: { lt: sevenDaysAgo },
              },
            },
          },
        ],
      },
      select: { id: true },
    })

    let refreshed = 0
    let errors = 0

    for (const company of companiesWithStaleDossier) {
      try {
        await updateDossier(company.id, 'manual_rebuild', 'cron_weekly')
        refreshed++
      } catch (err) {
        console.error(`[Cron] Failed to refresh dossier for company ${company.id}:`, err)
        errors++
      }
    }

    return NextResponse.json({
      companiesFound: companiesWithStaleDossier.length,
      refreshed,
      errors,
    })
  } catch (error) {
    console.error('[Cron] Failed to refresh dossiers:', error)
    return NextResponse.json(
      { error: 'Failed to refresh dossiers' },
      { status: 500 }
    )
  }
}
