import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { OrgDetailClient } from './OrgDetailClient'

async function getWorkspace(id: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      users: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
      companies: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          icbIndustry: true,
          annualRevenue: true,
          createdAt: true,
        },
      },
    },
  })

  return workspace
}

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const workspace = await getWorkspace(id)

  if (!workspace) {
    notFound()
  }

  // Serialize dates for client component
  const serializedWorkspace = {
    ...workspace,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
    trialEndsAt: workspace.trialEndsAt?.toISOString() ?? null,
    users: workspace.users.map(wu => ({
      ...wu,
      joinedAt: wu.joinedAt.toISOString(),
    })),
    companies: workspace.companies.map(company => ({
      ...company,
      annualRevenue: company.annualRevenue.toString(),
      createdAt: company.createdAt.toISOString(),
    })),
  }

  return <OrgDetailClient organization={serializedWorkspace} />
}
