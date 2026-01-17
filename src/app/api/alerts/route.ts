import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface Alert {
  id: string
  type: 'NO_ASSESSMENT' | 'STALE_ASSESSMENT' | 'QUARTERLY_REMINDER'
  title: string
  message: string
  actionUrl: string
  companyId: string
  companyName: string
  severity: 'info' | 'warning' | 'urgent'
  createdAt: string
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
        organization: {
          users: {
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
          actionUrl: '/dashboard/assessment',
          companyId: company.id,
          companyName: company.name,
          severity: 'urgent',
          createdAt: company.createdAt.toISOString(),
        })
        continue // Skip other alerts if no assessment exists
      }

      // Alert 2: Stale assessment (older than 90 days)
      const snapshotAge = Math.floor((now.getTime() - latestSnapshot.createdAt.getTime()) / (1000 * 60 * 60 * 24))

      if (snapshotAge >= STALE_THRESHOLD_DAYS) {
        alerts.push({
          id: `stale-assessment-${company.id}`,
          type: 'STALE_ASSESSMENT',
          title: 'Update Your Assessment',
          message: `${company.name}'s assessment is ${snapshotAge} days old. Update it to keep your valuation current.`,
          actionUrl: '/dashboard/assessment',
          companyId: company.id,
          companyName: company.name,
          severity: snapshotAge >= STALE_THRESHOLD_DAYS * 2 ? 'urgent' : 'warning',
          createdAt: latestSnapshot.createdAt.toISOString(),
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
            actionUrl: '/dashboard/assessment/company',
            companyId: company.id,
            companyName: company.name,
            severity: 'info',
            createdAt: latestAssessment.updatedAt.toISOString(),
          })
        }
      }
    }

    // Sort alerts by severity (urgent first) then by date
    const severityOrder = { urgent: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityDiff !== 0) return severityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json({
      alerts,
      count: alerts.length,
      urgentCount: alerts.filter(a => a.severity === 'urgent').length,
    })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}
