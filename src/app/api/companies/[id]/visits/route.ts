import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

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

const visitLogSchema = z.object({
  briScore: z.coerce.number().finite().min(0).max(100).optional(),
  valuation: z.coerce.number().finite().min(0).optional(),
  tasksCompleted: z.coerce.number().int().min(0).default(0),
  criticalTasksCompleted: z.coerce.number().int().min(0).default(0),
})

// POST - Log a new visit
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId } = await context.params

    // SECURITY FIX (SEC-040): Verify workspace membership to prevent IDOR
    const authResult = await checkPermission('COMPANY_UPDATE', companyId)
    if (isAuthError(authResult)) return authResult.error

    const dbUser = authResult.auth.user

    const validation = await validateRequestBody(request, visitLogSchema)
    if (!validation.success) return validation.error

    const { briScore, valuation, tasksCompleted, criticalTasksCompleted } = validation.data

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
          briScore: briScore ?? recentVisit.briScore,
          valuation: valuation ?? recentVisit.valuation,
          tasksCompleted: tasksCompleted ?? recentVisit.tasksCompleted,
          criticalTasksCompleted: criticalTasksCompleted ?? recentVisit.criticalTasksCompleted,
        },
      })

      return NextResponse.json({ success: true, updated: true })
    }

    // Create a new visit log
    await prisma.companyVisitLog.create({
      data: {
        companyId,
        userId: dbUser.id,
        briScore,
        valuation,
        tasksCompleted,
        criticalTasksCompleted,
      },
    })

    return NextResponse.json({ success: true, created: true })
  } catch (error) {
    console.error('Error logging visit:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
