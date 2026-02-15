import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronAuth } from '@/lib/security/cron-auth'
import { EmailType } from '@/lib/email/types'
import { sendTrialWelcomeEmail } from '@/lib/email/send-trial-welcome-email'
import { sendTrialMidpointEmail } from '@/lib/email/send-trial-midpoint-email'
import { sendTrialEndingSoonEmail } from '@/lib/email/send-trial-ending-soon-email'
import { sendTrialLastDayEmail } from '@/lib/email/send-trial-last-day-email'
import { sendTrialExpiredEmail } from '@/lib/email/send-trial-expired-email'
import { sendTrialWinback14Email } from '@/lib/email/send-trial-winback-14-email'
import { sendTrialWinback30Email } from '@/lib/email/send-trial-winback-30-email'

/**
 * Trial Drip Email Cron
 *
 * Schedule: Daily at 9 AM UTC
 *
 * Sends a sequence of 7 emails over a 30-day window:
 * Day 1:  TRIAL_WELCOME       — Orientation, feature checklist
 * Day 3:  TRIAL_MIDPOINT      — Engagement, risk breakdown, value gap
 * Day 5:  TRIAL_ENDING_SOON   — Loss-framed, what you'll lose
 * Day 6:  TRIAL_LAST_DAY      — High urgency, upgrade CTA
 * Day 8:  TRIAL_EXPIRED       — What changed, reactivate
 * Day 14: TRIAL_WINBACK_14    — Drift risk, social proof
 * Day 30: TRIAL_WINBACK_30    — Warm close, last check-in
 */

interface DripScheduleEntry {
  day: number
  emailType: EmailType
  phase: 'trial' | 'post'
}

const DRIP_SCHEDULE: DripScheduleEntry[] = [
  { day: 1, emailType: 'TRIAL_WELCOME', phase: 'trial' },
  { day: 3, emailType: 'TRIAL_MIDPOINT', phase: 'trial' },
  { day: 5, emailType: 'TRIAL_ENDING_SOON', phase: 'trial' },
  { day: 6, emailType: 'TRIAL_LAST_DAY', phase: 'trial' },
  { day: 8, emailType: 'TRIAL_EXPIRED', phase: 'post' },
  { day: 14, emailType: 'TRIAL_WINBACK_14', phase: 'post' },
  { day: 30, emailType: 'TRIAL_WINBACK_30', phase: 'post' },
]

export async function GET(request: Request) {
  const authError = verifyCronAuth(request)
  if (authError) return authError

  try {
    const now = new Date()
    const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000)

    // Find all workspaces with a trial started in the last 31 days that haven't converted
    const workspaces = await prisma.workspace.findMany({
      where: {
        trialStartedAt: {
          gte: thirtyOneDaysAgo,
          not: null,
        },
        stripeSubscriptionId: null,
      },
      include: {
        members: {
          where: {
            workspaceRole: 'OWNER',
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
          take: 1,
        },
        companies: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
          take: 1,
        },
      },
    })

    let emailsSent = 0
    let skipped = 0
    let errors = 0
    const details: Array<{ workspace: string; email: string; type: string; result: string }> = []

    for (const workspace of workspaces) {
      const owner = workspace.members[0]?.user
      const company = workspace.companies[0]

      // Skip workspaces without owner or company
      if (!owner || !company) {
        skipped++
        continue
      }

      // Calculate days since trial start
      const daysSinceTrialStart = Math.floor(
        (now.getTime() - workspace.trialStartedAt!.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Find the matching drip entry for today
      const dripEntry = DRIP_SCHEDULE.find(entry => entry.day === daysSinceTrialStart)
      if (!dripEntry) {
        skipped++
        continue
      }

      // Phase validation:
      // Trial-phase emails should skip if trial already expired
      // Post-phase emails should skip if trial is still active
      const trialExpired = workspace.subscriptionStatus !== 'TRIALING'
      if (dripEntry.phase === 'trial' && trialExpired) {
        skipped++
        continue
      }
      if (dripEntry.phase === 'post' && !trialExpired) {
        skipped++
        continue
      }

      // Check EmailLog for existing send of this type to this user (dedup)
      const existingLog = await prisma.emailLog.findFirst({
        where: {
          userId: owner.id,
          emailType: dripEntry.emailType,
          success: true,
        },
      })

      if (existingLog) {
        skipped++
        continue
      }

      try {
        // Fetch enrichment data for templates that need it
        const [latestSnapshot, pendingTasksCount] = await Promise.all([
          prisma.valuationSnapshot.findFirst({
            where: { companyId: company.id },
            orderBy: { createdAt: 'desc' },
            select: { briScore: true, valueGap: true },
          }),
          prisma.task.count({
            where: {
              companyId: company.id,
              status: { in: ['PENDING', 'IN_PROGRESS'] },
            },
          }),
        ])

        const briScore = latestSnapshot?.briScore ? Number(latestSnapshot.briScore) : 0
        const valueGap = latestSnapshot?.valueGap ? Number(latestSnapshot.valueGap) : 0
        const trialEndsAt = workspace.trialEndsAt || new Date(workspace.trialStartedAt!.getTime() + 7 * 24 * 60 * 60 * 1000)

        let result

        switch (dripEntry.emailType) {
          case 'TRIAL_WELCOME':
            result = await sendTrialWelcomeEmail({
              userId: owner.id,
              email: owner.email,
              name: owner.name || undefined,
              companyName: company.name,
              trialEndsAt,
            })
            break

          case 'TRIAL_MIDPOINT':
            result = await sendTrialMidpointEmail({
              userId: owner.id,
              email: owner.email,
              name: owner.name || undefined,
              companyName: company.name,
              briScore,
              valueGap,
              tasksPending: pendingTasksCount,
              trialEndsAt,
            })
            break

          case 'TRIAL_ENDING_SOON':
            result = await sendTrialEndingSoonEmail({
              userId: owner.id,
              email: owner.email,
              name: owner.name || undefined,
              companyName: company.name,
              briScore,
              valueGap,
              tasksPending: pendingTasksCount,
              trialEndsAt,
            })
            break

          case 'TRIAL_LAST_DAY':
            result = await sendTrialLastDayEmail({
              userId: owner.id,
              email: owner.email,
              name: owner.name || undefined,
              companyName: company.name,
              briScore,
              valueGap,
              tasksPending: pendingTasksCount,
              trialEndsAt,
            })
            break

          case 'TRIAL_EXPIRED':
            result = await sendTrialExpiredEmail({
              userId: owner.id,
              email: owner.email,
              name: owner.name || undefined,
              companyName: company.name,
              briScore,
              valueGap,
              tasksPending: pendingTasksCount,
            })
            break

          case 'TRIAL_WINBACK_14':
            result = await sendTrialWinback14Email({
              userId: owner.id,
              email: owner.email,
              name: owner.name || undefined,
              companyName: company.name,
              briScore,
              valueGap,
              tasksPending: pendingTasksCount,
            })
            break

          case 'TRIAL_WINBACK_30':
            result = await sendTrialWinback30Email({
              userId: owner.id,
              email: owner.email,
              name: owner.name || undefined,
              companyName: company.name,
              briScore,
            })
            break
        }

        if (result?.success) {
          emailsSent++
          details.push({ workspace: workspace.name, email: owner.email, type: dripEntry.emailType, result: 'sent' })
          console.log(`[TrialDrip] Sent ${dripEntry.emailType} to ${owner.email} (day ${daysSinceTrialStart})`)
        } else {
          errors++
          details.push({ workspace: workspace.name, email: owner.email, type: dripEntry.emailType, result: result?.error || 'unknown error' })
          console.warn(`[TrialDrip] Failed ${dripEntry.emailType} to ${owner.email}: ${result?.error}`)
        }
      } catch (error) {
        errors++
        const errorMessage = error instanceof Error ? error.message : String(error)
        details.push({ workspace: workspace.name, email: owner.email, type: dripEntry.emailType, result: errorMessage })
        console.error(`[TrialDrip] Error sending ${dripEntry.emailType} to ${owner.email}:`, error instanceof Error ? error.message : String(error))
      }
    }

    console.log(`[TrialDrip] Cron complete: ${emailsSent} sent, ${skipped} skipped, ${errors} errors`)

    return NextResponse.json({
      success: true,
      workspacesChecked: workspaces.length,
      emailsSent,
      skipped,
      errors,
      details,
    })
  } catch (error) {
    console.error('[TrialDrip] Cron error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to run trial drip cron' },
      { status: 500 }
    )
  }
}
