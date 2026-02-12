import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkAssessmentTriggers } from '@/lib/assessment/assessment-triggers'
import { getUserAlerts, markAllAsRead } from '@/lib/alerts'

// Combined alert types
type AssessmentAlertType = 'NO_ASSESSMENT' | 'STALE_ASSESSMENT' | 'QUARTERLY_REMINDER' | 'OPEN_ASSESSMENT' | 'ASSESSMENT_AVAILABLE'
type SystemAlertType = 'ACCESS_REQUEST' | 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'STAFF_PAUSED' | 'OWNERSHIP_TRANSFER' | 'TRIAL_ENDING' | 'TRIAL_EXPIRED'

interface Alert {
  id: string
  type: AssessmentAlertType | SystemAlertType
  title: string
  message: string
  actionUrl: string | null
  companyId?: string
  companyName?: string
  severity: 'info' | 'warning' | 'urgent'
  isRead?: boolean
  createdAt: string
  source: 'computed' | 'database'
}

// Assessment is considered stale after 90 days (quarterly)
const STALE_THRESHOLD_DAYS = 90

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all active companies for the user
    const companies = await prisma.company.findMany({
      where: {
        deletedAt: null,
        workspace: {
          members: {
            some: { user: { authId: user.id } }
          }
        }
      },
      include: {
        valuationSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        assessments: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      }
    })

    const alerts: Alert[] = []
    const now = new Date()

    for (const company of companies) {
      const latestSnapshot = company.valuationSnapshots[0]
      const latestAssessment = company.assessments[0]

      // Alert 1: No BRI assessment completed
      if (!latestSnapshot) {
        alerts.push({
          id: `no-assessment-${company.id}`,
          type: 'NO_ASSESSMENT',
          title: 'Complete Your Assessment',
          message: `${company.name} needs an initial assessment to calculate your Buyer Readiness Index and valuation.`,
          actionUrl: '/dashboard/diagnosis',
          companyId: company.id,
          companyName: company.name,
          severity: 'urgent',
          createdAt: company.createdAt.toISOString(),
          source: 'computed',
        })
        continue // Skip other alerts if no assessment exists
      }

      // Alert for 10-Minute Assessment (open OR available, never both)
      // Check for open assessment first - this takes priority
      const openAssessment = await prisma.projectAssessment.findFirst({
        where: {
          companyId: company.id,
          status: 'IN_PROGRESS'
        }
      })

      if (openAssessment) {
        // There's an incomplete assessment - show that alert only
        alerts.push({
          id: `open-assessment-${company.id}`,
          type: 'OPEN_ASSESSMENT',
          title: 'Complete Your Risk Assessment',
          message: `${company.name} has an incomplete 10-minute assessment waiting.`,
          actionUrl: '/dashboard/diagnosis',
          companyId: company.id,
          companyName: company.name,
          severity: 'warning',
          createdAt: new Date().toISOString(),
          source: 'computed',
        })
      } else {
        // No open assessment - check if conditions warrant offering a new one
        const triggerResult = await checkAssessmentTriggers(company.id)
        if (triggerResult.shouldCreate) {
          alerts.push({
            id: `assessment-available-${company.id}`,
            type: 'ASSESSMENT_AVAILABLE',
            title: 'New Assessment Available',
            message: triggerResult.message || 'A new 10-minute assessment is ready for you.',
            actionUrl: '/dashboard/diagnosis',
            companyId: company.id,
            companyName: company.name,
            severity: 'info',
            createdAt: new Date().toISOString(),
            source: 'computed',
          })
        }
      }

      // Alert 2: Stale assessment (older than 90 days)
      const snapshotAge = Math.floor((now.getTime() - latestSnapshot.createdAt.getTime()) / (1000 * 60 * 60 * 24))

      if (snapshotAge >= STALE_THRESHOLD_DAYS) {
        alerts.push({
          id: `stale-assessment-${company.id}`,
          type: 'STALE_ASSESSMENT',
          title: 'Update Your Assessment',
          message: `${company.name}'s assessment is ${snapshotAge} days old. Update it to keep your valuation current.`,
          actionUrl: '/dashboard/diagnosis',
          companyId: company.id,
          companyName: company.name,
          severity: snapshotAge >= STALE_THRESHOLD_DAYS * 2 ? 'urgent' : 'warning',
          createdAt: latestSnapshot.createdAt.toISOString(),
          source: 'computed',
        })
      }

      // Alert 3: Quarterly reminder for company assessment
      if (latestAssessment) {
        const assessmentAge = Math.floor((now.getTime() - latestAssessment.updatedAt.getTime()) / (1000 * 60 * 60 * 24))

        if (assessmentAge >= STALE_THRESHOLD_DAYS && snapshotAge < STALE_THRESHOLD_DAYS) {
          // Only show this if the main assessment isn't already flagged as stale
          alerts.push({
            id: `quarterly-reminder-${company.id}`,
            type: 'QUARTERLY_REMINDER',
            title: 'Quarterly Review Due',
            message: `It's been ${assessmentAge} days since ${company.name}'s last company assessment review.`,
            actionUrl: '/dashboard/diagnosis',
            companyId: company.id,
            companyName: company.name,
            severity: 'info',
            createdAt: latestAssessment.updatedAt.toISOString(),
            source: 'computed',
          })
        }
      }
    }

    // Get database-stored alerts for the user
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (dbUser) {
      const dbAlerts = await getUserAlerts(dbUser.id, { limit: 50 })

      // Map database alerts to the unified format
      for (const dbAlert of dbAlerts) {
        const severityMap: Record<string, 'info' | 'warning' | 'urgent'> = {
          'ACCESS_REQUEST': 'warning',
          'ACCESS_GRANTED': 'info',
          'ACCESS_DENIED': 'info',
          'STAFF_PAUSED': 'warning',
          'OWNERSHIP_TRANSFER': 'info',
          'TRIAL_ENDING': 'urgent',
          'TRIAL_EXPIRED': 'urgent',
        }

        alerts.push({
          id: dbAlert.id,
          type: dbAlert.type as SystemAlertType,
          title: dbAlert.title,
          message: dbAlert.message,
          actionUrl: dbAlert.actionUrl,
          severity: severityMap[dbAlert.type] || 'info',
          isRead: dbAlert.isRead,
          createdAt: dbAlert.createdAt.toISOString(),
          source: 'database',
        })
      }
    }

    // Sort alerts by severity (urgent first) then by date
    const severityOrder = { urgent: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityDiff !== 0) return severityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const unreadCount = alerts.filter(a => a.source === 'database' && !a.isRead).length
    const computedCount = alerts.filter(a => a.source === 'computed').length

    return NextResponse.json({
      alerts,
      count: alerts.length,
      urgentCount: alerts.filter(a => a.severity === 'urgent').length,
      unreadCount: unreadCount + computedCount, // Computed alerts are always "unread"
    })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

// POST - Mark all alerts as read
export async function POST(_request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const count = await markAllAsRead(dbUser.id)

    return NextResponse.json({
      success: true,
      markedCount: count,
    })
  } catch (error) {
    console.error('Error marking alerts as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark alerts as read' },
      { status: 500 }
    )
  }
}
