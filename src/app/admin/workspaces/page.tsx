import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OrgTable } from '@/components/admin/OrgTable'

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
            users: true,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workspaces</h1>
        <p className="text-muted-foreground">
          Manage workspaces and their members
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Workspaces</CardTitle>
          <CardDescription>
            {pagination.total} workspaces in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgTable initialOrganizations={workspaces} initialPagination={pagination} />
        </CardContent>
      </Card>
    </div>
  )
}
