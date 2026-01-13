import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            organization: {
              include: {
                users: {
                  where: { user: { authId: user.id } },
                },
              },
            },
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { status, deferredUntil, deferralReason } = body

    // Verify user has access
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            organization: {
              include: {
                users: {
                  where: { user: { authId: user.id } },
                },
              },
            },
          },
        },
      },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (existingTask.company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
      } else if (status === 'DEFERRED') {
        updateData.deferredUntil = deferredUntil ? new Date(deferredUntil) : null
        updateData.deferralReason = deferralReason
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify user has access
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            organization: {
              include: {
                users: {
                  where: { user: { authId: user.id }, role: 'ADMIN' },
                },
              },
            },
          },
        },
      },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (existingTask.company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await prisma.task.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
