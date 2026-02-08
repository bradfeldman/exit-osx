import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { UserDetailClient } from './UserDetailClient'

async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      organizations: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              _count: {
                select: { users: true, companies: true },
              },
            },
          },
        },
      },
      auditLogs: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          createdAt: true,
        },
      },
      impersonationsAsTarget: {
        take: 10,
        orderBy: { startedAt: 'desc' },
        include: {
          admin: {
            select: { email: true, name: true },
          },
        },
      },
      ticketsCreated: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      },
    },
  })

  return user
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getUser(id)

  if (!user) {
    notFound()
  }

  // Serialize dates for client component
  const serializedUser = {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    auditLogs: user.auditLogs.map(log => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
    impersonationsAsTarget: user.impersonationsAsTarget.map(session => ({
      ...session,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() || null,
    })),
    ticketsCreated: user.ticketsCreated.map(ticket => ({
      ...ticket,
      createdAt: ticket.createdAt.toISOString(),
    })),
    organizations: user.organizations.map(ou => ({
      ...ou,
      joinedAt: ou.joinedAt.toISOString(),
    })),
  }

  return <UserDetailClient user={serializedUser} />
}
