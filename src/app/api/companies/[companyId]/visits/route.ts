import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ companyId: string }>
}

// GET - Retrieve the last visit for the current user
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const authId = user.id

    const { companyId } = await context.params

    // Get the user from database
    const dbUser = await prisma.user.findUnique({
      where: { authId },
      select: { id: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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
    console.error('Error fetching last visit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Log a new visit
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const authId = user.id

    const { companyId } = await context.params
    const body = await request.json()

    // Get the user from database
    const dbUser = await prisma.user.findUnique({
      where: { authId },
      select: { id: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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
    console.error('Error logging visit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
