import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, isAuthError } from '@/lib/auth/check-permission'

/**
 * PATCH /api/task-refinement-events/:id
 * Dismiss a refinement event (sets dismissedAt)
 */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth.error

  try {
    await prisma.taskRefinementEvent.update({
      where: { id },
      data: { dismissedAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
