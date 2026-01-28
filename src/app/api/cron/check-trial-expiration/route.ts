import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Vercel cron jobs send a specific header for authentication
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')

  // In production, verify the cron secret
  if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const now = new Date()

    // Find all organizations with expired trials
    const expiredTrials = await prisma.organization.findMany({
      where: {
        subscriptionStatus: 'TRIALING',
        trialEndsAt: {
          lt: now // Trial end date is in the past
        },
        // Don't downgrade if they have an active Stripe subscription
        stripeSubscriptionId: null
      },
      select: {
        id: true,
        name: true,
        trialEndsAt: true,
      }
    })

    if (expiredTrials.length === 0) {
      return NextResponse.json({
        message: 'No expired trials found',
        processed: 0
      })
    }

    // Downgrade expired trials to Foundation
    const result = await prisma.organization.updateMany({
      where: {
        id: {
          in: expiredTrials.map(org => org.id)
        }
      },
      data: {
        planTier: 'FOUNDATION',
        subscriptionStatus: 'ACTIVE',
        billingCycle: null,
        // Keep trial dates for historical reference
      }
    })

    console.log(`[Cron] Downgraded ${result.count} organizations from trial to Foundation:`,
      expiredTrials.map(org => ({ id: org.id, name: org.name, trialEndsAt: org.trialEndsAt }))
    )

    return NextResponse.json({
      message: `Downgraded ${result.count} expired trials to Foundation`,
      processed: result.count,
      organizations: expiredTrials.map(org => org.name)
    })

  } catch (error) {
    console.error('[Cron] Error checking trial expiration:', error)
    return NextResponse.json(
      { error: 'Failed to process trial expirations' },
      { status: 500 }
    )
  }
}
