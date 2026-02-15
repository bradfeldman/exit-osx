import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { FunctionalCategory, WorkspaceRole } from '@prisma/client'
import { z } from 'zod'
import { validateRequestBody, uuidSchema } from '@/lib/security/validation'

// GET - List workspace members
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params
  const result = await checkPermission('ORG_VIEW')
  if (isAuthError(result)) return result.error

  const { auth } = result

  try {
    // Verify user is member of this workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: auth.user.id,
        }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          }
        }
      },
      orderBy: { joinedAt: 'asc' }
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error fetching members:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}

const patchSchema = z.object({
  userId: uuidSchema,
  workspaceRole: z.nativeEnum(WorkspaceRole).optional(),
  functionalCategories: z.array(z.nativeEnum(FunctionalCategory)).max(50).optional(),
})

// PATCH - Update member role and/or functional categories
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params
  const result = await checkPermission('ORG_UPDATE_ROLES')
  if (isAuthError(result)) return result.error

  const { auth } = result

  const validation = await validateRequestBody(request, patchSchema)
  if (!validation.success) return validation.error
  const { userId, workspaceRole, functionalCategories } = validation.data

  try {
    // Build update data object
    const updateData: {
      workspaceRole?: WorkspaceRole
      functionalCategories?: FunctionalCategory[]
    } = {}

    // Validate and add workspaceRole if provided
    if (workspaceRole !== undefined) {

      // Prevent changing your own role
      if (userId === auth.user.id) {
        return NextResponse.json(
          { error: 'You cannot change your own role' },
          { status: 400 }
        )
      }

      // Prevent removing the last OWNER
      if (workspaceRole !== 'OWNER') {
        const targetMember = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId, userId },
          },
        })

        if (targetMember?.workspaceRole === 'OWNER') {
          const ownerCount = await prisma.workspaceMember.count({
            where: {
              workspaceId,
              workspaceRole: 'OWNER',
            },
          })

          if (ownerCount === 1) {
            return NextResponse.json(
              { error: 'Workspace must have at least one Owner. Transfer ownership first.' },
              { status: 400 }
            )
          }
        }
      }

      updateData.workspaceRole = workspaceRole
    }

    // Add functionalCategories if provided
    if (functionalCategories !== undefined) {
      updateData.functionalCategories = functionalCategories
    }

    // Ensure we have something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'At least one field must be provided' },
        { status: 400 }
      )
    }

    // Update member
    const updated = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        }
      },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          }
        }
      }
    })

    return NextResponse.json({ member: updated })
  } catch (error) {
    console.error('Error updating member:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    )
  }
}

// DELETE - Remove member from workspace (or leave if removing self)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    )
  }

  // Check if user is leaving (removing self) or removing another member
  const isLeavingTeam = await checkIfLeavingTeam(userId)

  if (isLeavingTeam) {
    // User is leaving - just need to be authenticated
    const result = await checkPermission('ORG_VIEW')
    if (isAuthError(result)) return result.error

    const { auth } = result

    // Verify they're actually removing themselves
    if (userId !== auth.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    try {
      // Check that there will still be at least one owner/admin if user is one
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId }
        }
      })

      if (membership?.workspaceRole === 'OWNER' || membership?.workspaceRole === 'ADMIN') {
        const remainingAdmins = await prisma.workspaceMember.count({
          where: {
            workspaceId,
            workspaceRole: { in: ['OWNER', 'ADMIN'] },
            userId: { not: userId }
          }
        })

        if (remainingAdmins === 0) {
          return NextResponse.json(
            { error: 'You cannot leave as the only owner/admin. Please promote another member first.' },
            { status: 400 }
          )
        }
      }

      await prisma.workspaceMember.delete({
        where: {
          workspaceId_userId: { workspaceId, userId }
        }
      })

      return NextResponse.json({ success: true, left: true })
    } catch (error) {
      console.error('Error leaving workspace:', error instanceof Error ? error.message : String(error))
      return NextResponse.json(
        { error: 'Failed to leave workspace' },
        { status: 500 }
      )
    }
  } else {
    // Admin removing another member
    const result = await checkPermission('ORG_MANAGE_MEMBERS')
    if (isAuthError(result)) return result.error

    const { auth } = result

    try {
      // Prevent removing yourself through this path (use leave instead)
      if (userId === auth.user.id) {
        return NextResponse.json(
          { error: 'Use the Leave option to remove yourself' },
          { status: 400 }
        )
      }

      // Check that there will still be at least one owner/admin
      const admins = await prisma.workspaceMember.count({
        where: {
          workspaceId,
          workspaceRole: { in: ['OWNER', 'ADMIN'] },
          userId: { not: userId }
        }
      })

      if (admins === 0) {
        return NextResponse.json(
          { error: 'Workspace must have at least one owner or admin' },
          { status: 400 }
        )
      }

      await prisma.workspaceMember.delete({
        where: {
          workspaceId_userId: { workspaceId, userId }
        }
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error removing member:', error instanceof Error ? error.message : String(error))
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      )
    }
  }
}

// Helper to check if the request is for the user to leave (removing themselves)
async function checkIfLeavingTeam(userId: string): Promise<boolean> {
  // We need to check auth without requiring specific permission
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  // Get the database user ID
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { id: true }
  })

  return dbUser?.id === userId
}
