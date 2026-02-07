import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { OrgDetailClient } from './OrgDetailClient'

async function getOrganization(id: string) {
  const organization = await prisma.organization.findUnique({
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

  return organization
}

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const organization = await getOrganization(id)

  if (!organization) {
    notFound()
  }

  // Serialize dates for client component
  const serializedOrg = {
    ...organization,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    trialEndsAt: organization.trialEndsAt?.toISOString() ?? null,
    users: organization.users.map(ou => ({
      ...ou,
      joinedAt: ou.joinedAt.toISOString(),
    })),
    companies: organization.companies.map(company => ({
      ...company,
      annualRevenue: company.annualRevenue.toString(),
      createdAt: company.createdAt.toISOString(),
    })),
  }

  return <OrgDetailClient organization={serializedOrg} />
}
