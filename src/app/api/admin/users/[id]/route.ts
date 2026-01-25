import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin, isAdminError, logAdminAction } from '@/lib/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      organizations: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      auditLogs: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          createdAt: true,
        },
      },
      impersonationsAsTarget: {
        take: 10,
        orderBy: { startedAt: 'desc' },
        include: {
          admin: {
            select: { email: true, name: true },
          },
        },
      },
      ticketsCreated: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json(
      { error: 'Not found', message: 'User not found' },
      { status: 404 }
    )
  }

  // Log the view action
  await logAdminAction(result.admin, 'user.view', 'User', user.id)

  return NextResponse.json({ user })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const { id } = await params
  const body = await request.json()

  // Validate fields that can be updated
  const allowedFields = ['name', 'email', 'isSuperAdmin']
  const updateData: Record<string, unknown> = {}
  const changes: Record<string, { from: unknown; to: unknown }> = {}

  // Get current user state
  const currentUser = await prisma.user.findUnique({
    where: { id },
    select: { name: true, email: true, isSuperAdmin: true },
  })

  if (!currentUser) {
    return NextResponse.json(
      { error: 'Not found', message: 'User not found' },
      { status: 404 }
    )
  }

  for (const field of allowedFields) {
    if (field in body && body[field] !== currentUser[field as keyof typeof currentUser]) {
      updateData[field] = body[field]
      changes[field] = {
        from: currentUser[field as keyof typeof currentUser],
        to: body[field],
      }
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ user: currentUser, message: 'No changes made' })
  }

  // Prevent removing own super admin status
  if (
    'isSuperAdmin' in updateData &&
    updateData.isSuperAdmin === false &&
    id === result.admin.user.id
  ) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Cannot remove your own super admin status' },
      { status: 403 }
    )
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      isSuperAdmin: true,
      updatedAt: true,
    },
  })

  // Log the update action
  await logAdminAction(result.admin, 'user.update', 'User', user.id, { changes })

  return NextResponse.json({ user })
}
