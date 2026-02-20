import { getAuditLogs } from '@/lib/admin'
import { ActivityFeed } from '@/components/admin/ActivityFeed'
import styles from '@/components/admin/admin-misc.module.css'

export default async function AdminActivityPage() {
  const { logs, pagination } = await getAuditLogs({ page: 1, limit: 50 })

  const serializedLogs = logs.map((log: { id: string; actorEmail: string; action: string; targetType: string; targetId: string | null; ipAddress: string | null; createdAt: Date; actor: { id: string; email: string; name: string | null } }) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }))

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Activity Log</h1>
        <p className={styles.pageSubtitle}>
          Audit trail of all admin actions across the system
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderInner}>
            <p className={styles.cardTitle}>Recent Activity</p>
            <p className={styles.cardDescription}>
              Filter, search, and export audit logs (90-day retention)
            </p>
          </div>
        </div>
        <div className={styles.cardContent}>
          <ActivityFeed initialLogs={serializedLogs} initialPagination={pagination} />
        </div>
      </div>
    </div>
  )
}
