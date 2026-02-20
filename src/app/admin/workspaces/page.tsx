import { prisma } from '@/lib/prisma'
import { WorkspaceTable } from '@/components/admin/WorkspaceTable'
import styles from '@/components/admin/admin-misc.module.css'

async function getWorkspaces() {
  const limit = 20
  const [workspaces, total] = await Promise.all([
    prisma.workspace.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            companies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.workspace.count(),
  ])

  return {
    workspaces: workspaces.map(workspace => ({
      ...workspace,
      createdAt: workspace.createdAt.toISOString(),
    })),
    pagination: {
      page: 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export default async function AdminWorkspacesPage() {
  const { workspaces, pagination } = await getWorkspaces()

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Workspaces</h1>
        <p className={styles.pageSubtitle}>Manage workspaces and their members</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderInner}>
            <p className={styles.cardTitle}>All Workspaces</p>
            <p className={styles.cardDescription}>
              {pagination.total} workspaces in the system
            </p>
          </div>
        </div>
        <div className={styles.cardContent}>
          <WorkspaceTable initialWorkspaces={workspaces} initialPagination={pagination} />
        </div>
      </div>
    </div>
  )
}
