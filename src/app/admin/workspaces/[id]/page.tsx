import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { WorkspaceDetailClient } from './WorkspaceDetailClient'

async function getWorkspace(id: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      members: {
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
    members: workspace.members.map(wm => ({
      ...wm,
      joinedAt: wm.joinedAt.toISOString(),
    })),
    companies: workspace.companies.map(company => ({
      ...company,
      annualRevenue: company.annualRevenue.toString(),
      createdAt: company.createdAt.toISOString(),
    })),
  }

  return <WorkspaceDetailClient workspace={serializedWorkspace} />
}
