import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAuditLogs } from '@/lib/admin'
import { ActivityFeed } from '@/components/admin/ActivityFeed'

export default async function AdminActivityPage() {
  const { logs, pagination } = await getAuditLogs({ page: 1, limit: 50 })

  const serializedLogs = logs.map((log: { id: string; actorEmail: string; action: string; targetType: string; targetId: string | null; ipAddress: string | null; createdAt: Date; actor: { id: string; email: string; name: string | null } }) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="text-muted-foreground">
          Audit trail of all admin actions across the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Filter, search, and export audit logs (90-day retention)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed initialLogs={serializedLogs} initialPagination={pagination} />
        </CardContent>
      </Card>
    </div>
  )
}
