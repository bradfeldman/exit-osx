import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Get current week number
    const now = new Date()
    const weekNumber = Math.ceil(
      (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000
    )

    // Get current week's progress
    const weekProgress = await prisma.companyWeeklyProgress.findFirst({
      where: {
        companyId,
        weekNumber,
      }
    })

    // Get tasks for current week
    const currentTasks = await prisma.companyOperationsTask.findMany({
      where: {
        companyId,
        weekNumber,
      },
      orderBy: { displayOrder: 'asc' }
    })

    // Get all diagnostic responses for the company
    const diagnosticResponses = await prisma.companyDiagnosticResponses.findMany({
      where: { companyId }
    })

    // Get previous weeks' progress
    const previousWeeks = await prisma.companyWeeklyProgress.findMany({
      where: {
        companyId,
        weekNumber: { lt: weekNumber }
      },
      orderBy: { weekNumber: 'desc' },
      take: 4,
    })

    // Get tasks for previous weeks
    const previousWeekNumbers = previousWeeks.map(w => w.weekNumber)
    const previousTasks = previousWeekNumbers.length > 0
      ? await prisma.companyOperationsTask.findMany({
          where: {
            companyId,
            weekNumber: { in: previousWeekNumbers },
          },
          orderBy: { displayOrder: 'asc' }
        })
      : []

    // Group previous tasks by week
    const previousWeeksWithTasks = previousWeeks.map(week => ({
      ...week,
      tasks: previousTasks.filter(t => t.weekNumber === week.weekNumber)
    }))

    return NextResponse.json({
      currentWeek: weekProgress
        ? { ...weekProgress, tasks: currentTasks }
        : null,
      diagnostics: diagnosticResponses,
      previousWeeks: previousWeeksWithTasks,
    })
  } catch (error) {
    console.error('Error fetching current tasks:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
