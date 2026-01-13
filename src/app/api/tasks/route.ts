import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('companyId')
  const status = searchParams.get('status')
  const category = searchParams.get('category')

  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  try {
    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        organization: {
          include: {
            users: {
              where: { user: { authId: user.id } },
            },
          },
        },
      },
    })

    if (!company || company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build filter
    const where: Record<string, unknown> = { companyId }
    if (status) {
      where.status = status
    }
    if (category) {
      where.briCategory = category
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { normalizedValue: 'desc' },
        { createdAt: 'asc' },
      ],
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

    // Calculate summary stats
    const allTasks = await prisma.task.findMany({
      where: { companyId },
      select: { status: true, rawImpact: true },
    })

    const stats = {
      total: allTasks.length,
      pending: allTasks.filter(t => t.status === 'PENDING').length,
      inProgress: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: allTasks.filter(t => t.status === 'COMPLETED').length,
      totalValue: allTasks.reduce((sum, t) => sum + Number(t.rawImpact), 0),
      completedValue: allTasks
        .filter(t => t.status === 'COMPLETED')
        .reduce((sum, t) => sum + Number(t.rawImpact), 0),
    }

    return NextResponse.json({ tasks, stats })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
