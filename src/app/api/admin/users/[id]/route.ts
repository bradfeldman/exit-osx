import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin, isAdminError, logAdminAction } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase/server'

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

  const body = await request.json()
  const { confirmEmail, reason } = body

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

  // Find orgs where this user is the sole member — these become orphaned after deletion
  const userOrgs = await prisma.organization.findMany({
    where: {
      users: { some: { userId: id } },
    },
    select: {
      id: true,
      name: true,
      _count: { select: { users: true } },
    },
  })
  const orgsToDelete = userOrgs.filter(org => org._count.users === 1)

  try {
    // Log before deletion (so we capture the user info)
    await logAdminAction(result.admin, 'user.delete', 'User', user.id, {
      deletedEmail: user.email,
      deletedName: user.name,
      reason: reason || null,
      deletedOrganizations: orgsToDelete.map(o => ({ id: o.id, name: o.name })),
    })

    // Delete from Supabase Auth first (using service role client)
    const supabase = createServiceClient()
    const { error: authError } = await supabase.auth.admin.deleteUser(user.authId)

    if (authError) {
      console.error('Failed to delete Supabase auth user:', authError)
      return NextResponse.json(
        { error: 'Failed to delete user authentication', message: authError.message },
        { status: 500 }
      )
    }

    // Delete from database (cascades will handle related records like OrganizationUser)
    await prisma.user.delete({
      where: { id },
    })

    // Delete orphaned orgs (sole-member orgs now have zero members)
    // Organization → Company has onDelete: Cascade, so companies are auto-deleted
    if (orgsToDelete.length > 0) {
      await prisma.organization.deleteMany({
        where: { id: { in: orgsToDelete.map(o => o.id) } },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
