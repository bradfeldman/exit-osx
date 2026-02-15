import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin, isAdminError, logAdminAction } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase/server'
import { validateRequestBody, emailSchema, shortText } from '@/lib/security/validation'

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
      workspaces: {
        include: {
          workspace: {
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

const userUpdateSchema = z.object({
  name: shortText.optional(),
  email: emailSchema.optional(),
  isSuperAdmin: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const { id } = await params

  const validation = await validateRequestBody(request, userUpdateSchema)
  if (!validation.success) return validation.error
  const body = validation.data

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

  const allowedFields: (keyof typeof body)[] = ['name', 'email', 'isSuperAdmin']
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

const userDeleteSchema = z.object({
  confirmEmail: emailSchema,
  reason: shortText.optional(),
})

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const { id } = await params

  // Prevent deleting yourself
  if (id === result.admin.user.id) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Cannot delete your own account' },
      { status: 403 }
    )
  }

  const validation = await validateRequestBody(request, userDeleteSchema)
  if (!validation.success) return validation.error
  const { confirmEmail, reason } = validation.data

  // Find the user
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, authId: true, name: true },
  })

  if (!user) {
    return NextResponse.json(
      { error: 'Not found', message: 'User not found' },
      { status: 404 }
    )
  }

  // Require email confirmation
  if (confirmEmail !== user.email) {
    return NextResponse.json(
      { error: 'Bad request', message: 'Email confirmation does not match' },
      { status: 400 }
    )
  }

  // Find workspaces where this user is the sole member — these become orphaned after deletion
  const userWorkspaces = await prisma.workspace.findMany({
    where: {
      members: { some: { userId: id } },
    },
    select: {
      id: true,
      name: true,
      _count: { select: { members: true } },
    },
  })
  const workspacesToDelete = userWorkspaces.filter(ws => ws._count.members === 1)

  try {
    // Log before deletion (so we capture the user info)
    await logAdminAction(result.admin, 'user.delete', 'User', user.id, {
      deletedEmail: user.email,
      deletedName: user.name,
      reason: reason || null,
      deletedWorkspaces: workspacesToDelete.map(ws => ({ id: ws.id, name: ws.name })),
    })

    // Delete from Supabase Auth first (using service role client)
    const supabase = createServiceClient()
    const { error: authError } = await supabase.auth.admin.deleteUser(user.authId)

    if (authError) {
      console.error('Failed to delete Supabase auth user:', authError)
      return NextResponse.json(
        // SECURITY FIX (PROD-060): Removed authError.message from response
        { error: 'Failed to delete user authentication' },
        { status: 500 }
      )
    }

    // Delete from database (cascades will handle related records like OrganizationUser)
    await prisma.user.delete({
      where: { id },
    })

    // Delete orphaned workspaces (sole-member workspaces now have zero members)
    // Workspace → Company has onDelete: Cascade, so companies are auto-deleted
    if (workspacesToDelete.length > 0) {
      await prisma.workspace.deleteMany({
        where: { id: { in: workspacesToDelete.map(ws => ws.id) } },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
