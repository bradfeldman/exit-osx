import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Fetch task to get companyId for permission check
    const task = await prisma.task.findUnique({
      where: { id },
      select: { companyId: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const result = await checkPermission('TASK_VIEW', task.companyId)
    if (isAuthError(result)) return result.error

    // Fetch all notes for this task
    const notes = await prisma.taskNote.findMany({
      where: { taskId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Error fetching task notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task notes' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { content, noteType = 'GENERAL' } = body as {
      content: string
      noteType?: string
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      )
    }

    // Fetch task to get companyId for permission check
    const task = await prisma.task.findUnique({
      where: { id },
      select: { companyId: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const result = await checkPermission('TASK_UPDATE', task.companyId)
    if (isAuthError(result)) return result.error

    const { auth } = result

    // Create the note
    const note = await prisma.taskNote.create({
      data: {
        taskId: id,
        userId: auth.user.id,
        content: content.trim(),
        noteType,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error('Error creating task note:', error)
    return NextResponse.json(
      { error: 'Failed to create task note' },
      { status: 500 }
    )
  }
}
