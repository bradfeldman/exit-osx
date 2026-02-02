import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { id: taskId } = await params
    const body = await request.json()
    const { status, completionNotes, notApplicableReason } = body as {
      status: 'IN_PROGRESS' | 'COMPLETED' | 'NOT_APPLICABLE'
      completionNotes?: string
      notApplicableReason?: string
    }

    if (!taskId || !status) {
      return NextResponse.json(
        { error: 'Task ID and status are required' },
        { status: 400 }
      )
    }

    // Get the task
    const task = await prisma.companyOperationsTask.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Update task status
    const updatedTask = await prisma.companyOperationsTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        completionNotes: completionNotes || null,
        naReason: status === 'NOT_APPLICABLE' ? notApplicableReason : null,
      }
    })

    // Check if all tasks for the week are done
    const weekTasks = await prisma.companyOperationsTask.findMany({
      where: {
        companyId: task.companyId,
        weekNumber: task.weekNumber,
      }
    })

    const allDone = weekTasks.every(
      t => t.status === 'COMPLETED' || t.status === 'NOT_APPLICABLE'
    )
    const allNotApplicable = weekTasks.every(t => t.status === 'NOT_APPLICABLE')

    if (allDone) {
      await prisma.companyWeeklyProgress.updateMany({
        where: {
          companyId: task.companyId,
          weekNumber: task.weekNumber,
        },
        data: {
          status: allNotApplicable ? 'SKIPPED' : 'COMPLETED',
          tasksCompletedAt: new Date(),
        }
      })
    }

    return NextResponse.json({
      task: updatedTask,
      weekComplete: allDone,
      weekSkipped: allNotApplicable,
    })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}
