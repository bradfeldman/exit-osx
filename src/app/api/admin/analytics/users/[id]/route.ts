import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, isAdminError } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      userType: true,
      exposureState: true,
      emailVerified: true,
      isSuperAdmin: true,
      workspaces: {
        select: {
          workspace: {
            select: {
              id: true,
              name: true,
              planTier: true,
              trialEndsAt: true,
              subscriptionStatus: true,
              companies: {
                select: {
                  id: true,
                  name: true,
                  _count: {
                    select: {
                      tasks: true,
                      assessments: true,
                    },
                  },
                },
                take: 1,
              },
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
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Get recent events for timeline
  const recentEvents = await prisma.productEvent.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Get device breakdown from events
  const deviceBreakdown = await prisma.productEvent.groupBy({
    by: ['deviceType'],
    where: { userId: id, deviceType: { not: null } },
    _count: true,
  })

  const browserBreakdown = await prisma.productEvent.groupBy({
    by: ['browser'],
    where: { userId: id, browser: { not: null } },
    _count: true,
  })

  // Get company state if they have one
  const company = user.workspaces[0]?.workspace?.companies?.[0]
  let companyState = null
  if (company) {
    const [latestSnapshot, completedTasks, totalTasks] = await Promise.all([
      prisma.valuationSnapshot.findFirst({
        where: { companyId: company.id },
        orderBy: { createdAt: 'desc' },
        select: {
          briScore: true,
          currentValue: true,
          potentialValue: true,
          createdAt: true,
        },
      }),
      prisma.task.count({
        where: { companyId: company.id, status: 'COMPLETED' },
      }),
      prisma.task.count({
        where: { companyId: company.id },
      }),
    ])

    companyState = {
      id: company.id,
      name: company.name,
      assessmentCount: company._count.assessments,
      taskCount: totalTasks,
      completedTaskCount: completedTasks,
      briScore: latestSnapshot ? Number(latestSnapshot.briScore) : null,
      currentValue: latestSnapshot ? Number(latestSnapshot.currentValue) : null,
      potentialValue: latestSnapshot ? Number(latestSnapshot.potentialValue) : null,
      lastSnapshotAt: latestSnapshot?.createdAt?.toISOString() || null,
    }
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      userType: user.userType,
      exposureState: user.exposureState,
      emailVerified: user.emailVerified,
      isSuperAdmin: user.isSuperAdmin,
      planTier: user.workspaces[0]?.workspace?.planTier || null,
      trialEndsAt: user.workspaces[0]?.workspace?.trialEndsAt?.toISOString() || null,
      subscriptionStatus: user.workspaces[0]?.workspace?.subscriptionStatus || null,
      eventCount: user._count.productEvents,
      sessionCount: user._count.sessions,
    },
    recentEvents: recentEvents.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    deviceBreakdown: deviceBreakdown.map((d) => ({
      deviceType: d.deviceType,
      count: d._count,
    })),
    browserBreakdown: browserBreakdown.map((b) => ({
      browser: b.browser,
      count: b._count,
    })),
    companyState,
  })
}
