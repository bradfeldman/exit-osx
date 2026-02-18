import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { AnalyticsUserTable } from '@/components/admin/analytics/AnalyticsUserTable'
import { computeEngagementStatus } from '@/lib/analytics/engagement-status'

export default async function AnalyticsUsersPage() {
  let users
  let total

  try {
    users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        userType: true,
        exposureState: true,
        emailVerified: true,
        workspaces: {
          select: {
            workspace: {
              select: {
                planTier: true,
                trialEndsAt: true,
              },
            },
          },
          take: 1,
        },
        _count: {
          select: {
            productEvents: true,
            sessions: true,
          },
        },
        productEvents: {
          select: {
            createdAt: true,
            deviceType: true,
            browser: true,
            os: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        sessions: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })

    total = await prisma.user.count()
  } catch (error) {
    console.error('[Analytics Users] Query failed:', error instanceof Error ? error.message : String(error))
    throw error
  }

  const serializedUsers = users.map((u) => {
    const lastEvent = u.productEvents[0]
    const lastSession = u.sessions[0]
    const lastActiveAt = lastEvent?.createdAt || lastSession?.createdAt || u.updatedAt

    return {
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt.toISOString(),
      userType: u.userType,
      exposureState: u.exposureState,
      emailVerified: u.emailVerified,
      planTier: u.workspaces[0]?.workspace?.planTier || null,
      trialEndsAt: u.workspaces[0]?.workspace?.trialEndsAt?.toISOString() || null,
      eventCount: u._count.productEvents,
      sessionCount: u._count.sessions,
      lastActiveAt: lastActiveAt.toISOString(),
      lastDevice: lastEvent?.deviceType || null,
      lastBrowser: lastEvent?.browser || null,
      lastOs: lastEvent?.os || null,
      engagementStatus: computeEngagementStatus(lastActiveAt),
    }
  })

  // Sort by last active
  serializedUsers.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Analytics</h1>
        <p className="text-muted-foreground">
          All users with engagement data, status, and device info
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Active, Stalled ({'>'} 3 days), Dormant ({'>'} 14 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsUserTable
            initialUsers={serializedUsers}
            initialPagination={{
              page: 1,
              limit: 50,
              total,
              totalPages: Math.ceil(total / 50),
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
