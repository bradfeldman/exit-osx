import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { generateTaskShareToken } from '@/lib/task-share-token'

/**
 * POST /api/tasks/[id]/share-link
 * Generate a shareable link for a task (authenticated).
 * SEC-071: Verifies the task belongs to a company the user has access to.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await checkPermission('TASK_VIEW')
  if (isAuthError(result)) return result.error

  // SEC-071: Verify task exists AND belongs to a company the user has access to
  const task = await prisma.task.findFirst({
    where: {
      id,
      company: {
        deletedAt: null,
        workspace: {
          members: {
            some: { userId: result.auth.user.id }
          }
        }
      }
    },
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
