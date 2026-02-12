import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CompanyTable } from '@/components/admin/CompanyTable'

async function getCompanies() {
  const limit = 20
  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            planTier: true,
            subscriptionStatus: true,
            users: {
              select: {
                user: {
                  select: {
                    sessions: {
                      select: { lastActiveAt: true },
                      orderBy: { lastActiveAt: 'desc' as const },
                      where: { revokedAt: null },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        integrations: {
          where: {
            provider: 'QUICKBOOKS_ONLINE',
            disconnectedAt: null,
          },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
      take: limit,
    }),
    prisma.company.count(),
  ])

  const enriched = companies.map((company) => {
    const workspaceUsers = company.workspace.users
    const memberCount = workspaceUsers.length

    let lastLogin: string | null = null
    for (const wu of workspaceUsers) {
      const session = wu.user.sessions[0]
      if (session) {
        if (!lastLogin || session.lastActiveAt.toISOString() > lastLogin) {
          lastLogin = session.lastActiveAt.toISOString()
        }
      }
    }

    return {
      id: company.id,
      name: company.name,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
      workspace: {
        id: company.workspace.id,
        name: company.workspace.name,
        planTier: company.workspace.planTier,
        subscriptionStatus: company.workspace.subscriptionStatus,
      },
      memberCount,
      lastLogin,
      qbConnected: company.integrations.length > 0,
    }
  })

  return {
    companies: enriched,
    pagination: {
      page: 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export default async function AdminCompaniesPage() {
  const { companies, pagination } = await getCompanies()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Companies</h1>
        <p className="text-muted-foreground">
          View company accounts and their key metrics
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
          <CardDescription>
            {pagination.total} companies in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyTable initialCompanies={companies} initialPagination={pagination} />
        </CardContent>
      </Card>
    </div>
  )
}
