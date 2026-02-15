import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Retrieve the last visit for the current user
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId } = await context.params

    // SECURITY FIX (SEC-040): Verify workspace membership to prevent IDOR
    const authResult = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(authResult)) return authResult.error

    const dbUser = authResult.auth.user

    // Get the most recent visit (excluding the current one by looking for visits > 1 hour ago)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const lastVisit = await prisma.companyVisitLog.findFirst({
      where: {
        companyId,
        userId: dbUser.id,
        visitedAt: {
          lt: oneHourAgo,
        },
      },
      orderBy: {
        visitedAt: 'desc',
      },
    })

    if (!lastVisit) {
      return NextResponse.json({ lastVisit: null })
    }

    const daysSinceVisit = Math.floor(
      (Date.now() - lastVisit.visitedAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    return NextResponse.json({
      lastVisit: {
        visitedAt: lastVisit.visitedAt.toISOString(),
        briScore: lastVisit.briScore,
        valuation: lastVisit.valuation,
        tasksCompleted: lastVisit.tasksCompleted,
        criticalTasksCompleted: lastVisit.criticalTasksCompleted,
        daysSinceVisit,
      },
    })
  } catch (error) {
    console.error('Error fetching last visit:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Log a new visit
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId } = await context.params

    // SECURITY FIX (SEC-040): Verify workspace membership to prevent IDOR
    const authResult = await checkPermission('COMPANY_UPDATE', companyId)
    if (isAuthError(authResult)) return authResult.error

    const dbUser = authResult.auth.user
    const body = await request.json()

    // Check if there's a recent visit (within last hour) to avoid duplicate logging
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentVisit = await prisma.companyVisitLog.findFirst({
      where: {
        companyId,
        userId: dbUser.id,
        visitedAt: {
          gte: oneHourAgo,
        },
      },
    })

    if (recentVisit) {
      // Update the existing visit with latest data
      await prisma.companyVisitLog.update({
        where: { id: recentVisit.id },
        data: {
          briScore: body.briScore ?? recentVisit.briScore,
          valuation: body.valuation ?? recentVisit.valuation,
          tasksCompleted: body.tasksCompleted ?? recentVisit.tasksCompleted,
          criticalTasksCompleted: body.criticalTasksCompleted ?? recentVisit.criticalTasksCompleted,
        },
      })

      return NextResponse.json({ success: true, updated: true })
    }

    // Create a new visit log
    await prisma.companyVisitLog.create({
      data: {
        companyId,
        userId: dbUser.id,
        briScore: body.briScore,
        valuation: body.valuation,
        tasksCompleted: body.tasksCompleted ?? 0,
        criticalTasksCompleted: body.criticalTasksCompleted ?? 0,
      },
    })

    return NextResponse.json({ success: true, created: true })
  } catch (error) {
    console.error('Error logging visit:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
