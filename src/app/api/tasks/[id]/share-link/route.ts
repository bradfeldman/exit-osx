import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { generateTaskShareToken } from '@/lib/task-share-token'

/**
 * POST /api/tasks/[id]/share-link
 * Generate a shareable link for a task (authenticated).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await checkPermission('TASK_VIEW')
  if (isAuthError(result)) return result.error

  const task = await prisma.task.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const token = generateTaskShareToken(id)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
  const url = `${baseUrl}/task/${token}`

  return NextResponse.json({ url, token })
}
