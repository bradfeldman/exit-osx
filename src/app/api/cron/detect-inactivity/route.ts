import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSignalWithLedgerEntry } from '@/lib/signals/create-signal'
import { sendInactivityNudgeEmail } from '@/lib/email/send-inactivity-nudge-email'
import { verifyCronAuth } from '@/lib/security/cron-auth'

/**
 * PROD-055: Inactivity Signal Generation Cron
 *
 * Schedule: Daily
 *
 * Logic:
 * 1. Find users with no login in 21+ days (check UserSession.lastActiveAt)
 * 2. For each inactive user, create an INACTIVITY signal
 *    - Severity: MEDIUM (21-45 days), HIGH (45+ days)
 *    - Confidence: CONFIDENT
 *    - Title: "No activity detected in X days"
 *    - Category: PERSONAL
 * 3. Trigger email nudge: "Your Exit Readiness may be slipping"
 * 4. Don't create duplicate signals (check for existing OPEN inactivity signal)
 * 5. Signal auto-resolves on next login (handled separately in middleware/auth)
 */
export async function GET(request: Request) {
  // SECURITY FIX (PROD-060): Uses verifyCronAuth which fails closed when CRON_SECRET is not set.
  const authError = verifyCronAuth(request)
  if (authError) return authError

  try {
    const now = new Date()
    const inactivityThreshold = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000) // 21 days ago

    // Find users who haven't had an active session in 21+ days
    // Group by userId to get the most recent session for each user
    const recentSessions = await prisma.userSession.groupBy({
      by: ['userId'],
      _max: {
        lastActiveAt: true,
      },
      having: {
        lastActiveAt: {
          _max: {
            lt: inactivityThreshold,
          },
        },
      },
    })

    if (recentSessions.length === 0) {
      console.log('[DetectInactivity] No inactive users found')
      return NextResponse.json({
        success: true,
        message: 'No inactive users found',
        usersChecked: 0,
        signalsCreated: 0,
        emailsSent: 0,
      })
    }

    // Fetch full user data with their companies
    const inactiveUserIds = recentSessions.map(s => s.userId)
    const inactiveUsers = await prisma.user.findMany({
      where: {
        id: { in: inactiveUserIds },
      },
      include: {
        companyOwnerships: {
          where: {
            isSubscribingOwner: true,
          },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                deletedAt: true,
              },
            },
          },
          take: 1,
        },
      },
    })

    let signalsCreated = 0
    let emailsSent = 0
    let skipped = 0

    for (const user of inactiveUsers) {
      try {
        const company = user.companyOwnerships[0]?.company

        // Skip users without an active company
        if (!company || company.deletedAt) {
          skipped++
          continue
        }

        // Get the user's most recent session to calculate days inactive
        const lastSession = await prisma.userSession.findFirst({
          where: { userId: user.id },
          orderBy: { lastActiveAt: 'desc' },
        })

        if (!lastSession) {
          skipped++
          continue
        }

        const daysSinceLastLogin = Math.floor(
          (now.getTime() - lastSession.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Only process users inactive for 21+ days
        if (daysSinceLastLogin < 21) {
          skipped++
          continue
        }

        // Check for existing unresolved inactivity signal
        const existingSignal = await prisma.signal.findFirst({
          where: {
            companyId: company.id,
            eventType: 'user_inactivity',
            resolutionStatus: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
          },
        })

        if (existingSignal) {
          console.log(`[DetectInactivity] Skipping ${user.email} - existing inactivity signal found`)
          skipped++
          continue
        }

        // Determine severity based on inactivity duration
        const severity = daysSinceLastLogin >= 45 ? 'HIGH' : 'MEDIUM'
        const weeksSinceLogin = Math.round(daysSinceLastLogin / 7)

        // Create signal
        await createSignalWithLedgerEntry({
          companyId: company.id,
          channel: 'TIME_DECAY',
          eventType: 'user_inactivity',
          category: 'PERSONAL',
          severity,
          confidence: 'CONFIDENT',
          title: `No activity detected in ${weeksSinceLogin} weeks`,
          description: `User has not logged in for ${daysSinceLastLogin} days. Continuous monitoring is critical for maintaining exit readiness.`,
          rawData: {
            userId: user.id,
            userEmail: user.email,
            daysSinceLastLogin,
            lastActiveAt: lastSession.lastActiveAt.toISOString(),
          },
          sourceType: 'user_session',
          sourceId: lastSession.id,
          ledgerEventType: 'DRIFT_DETECTED',
          narrativeSummary: `User inactivity detected: ${daysSinceLastLogin} days since last login`,
        })

        signalsCreated++
        console.log(`[DetectInactivity] Created ${severity} signal for ${user.email} (${daysSinceLastLogin} days inactive)`)

        // Send inactivity nudge email
        // Get company stats for email
        const [latestSnapshot, pendingTasksCount] = await Promise.all([
          prisma.valuationSnapshot.findFirst({
            where: { companyId: company.id },
            orderBy: { createdAt: 'desc' },
            select: { briScore: true },
          }),
          prisma.task.count({
            where: {
              companyId: company.id,
              status: { in: ['PENDING', 'IN_PROGRESS'] },
            },
          }),
        ])

        const emailResult = await sendInactivityNudgeEmail({
          userId: user.id,
          email: user.email,
          name: user.name || undefined,
          companyId: company.id,
          companyName: company.name,
          daysSinceLastLogin,
          briScore: latestSnapshot?.briScore ? Number(latestSnapshot.briScore) : 0,
          tasksPending: pendingTasksCount,
        })

        if (emailResult.success) {
          emailsSent++
          console.log(`[DetectInactivity] Sent inactivity nudge email to ${user.email}`)
        } else {
          console.warn(`[DetectInactivity] Failed to send email to ${user.email}: ${emailResult.error}`)
        }
      } catch (error) {
        console.error(`[DetectInactivity] Error processing user ${user.email}:`, error instanceof Error ? error.message : String(error))
      }
    }

    console.log(
      `[DetectInactivity] Cron complete: ${signalsCreated} signals created, ${emailsSent} emails sent, ${skipped} skipped`
    )

    return NextResponse.json({
      success: true,
      usersChecked: inactiveUsers.length,
      signalsCreated,
      emailsSent,
      skipped,
    })
  } catch (error) {
    console.error('[DetectInactivity] Cron error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      // SECURITY FIX (PROD-060): Removed String(error) details from response
      { error: 'Failed to run inactivity detection cron' },
      { status: 500 }
    )
  }
}
