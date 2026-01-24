import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { UserRole, FunctionalCategory } from '@prisma/client'

// GET - List organization members
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params
  const result = await checkPermission('ORG_VIEW')
  if (isAuthError(result)) return result.error

  const { auth } = result

  try {
    // Verify user is member of this organization
    const membership = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: auth.user.id,
        }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const members = await prisma.organizationUser.findMany({
      where: { organizationId },
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
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}

// PATCH - Update member role and/or functional categories
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params
  const result = await checkPermission('ORG_UPDATE_ROLES')
  if (isAuthError(result)) return result.error

  const { auth } = result

  try {
    const { userId, role, functionalCategories } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Build update data object
    const updateData: { role?: UserRole; functionalCategories?: FunctionalCategory[] } = {}

    // Validate and add role if provided
    if (role !== undefined) {
      const validRoles: UserRole[] = ['ADMIN', 'TEAM_LEADER', 'MEMBER', 'VIEWER']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        )
      }

      // Prevent changing your own role
      if (userId === auth.user.id) {
        return NextResponse.json(
          { error: 'You cannot change your own role' },
          { status: 400 }
        )
      }

      updateData.role = role
    }

    // Validate and add functionalCategories if provided
    if (functionalCategories !== undefined) {
      const validCategories: FunctionalCategory[] = [
        'OWNER', 'FINANCE', 'OPERATIONS', 'HR', 'LEGAL', 'SALES_MARKETING', 'IT', 'EXTERNAL'
      ]

      if (!Array.isArray(functionalCategories)) {
        return NextResponse.json(
          { error: 'functionalCategories must be an array' },
          { status: 400 }
        )
      }

      const invalidCategories = functionalCategories.filter(c => !validCategories.includes(c))
      if (invalidCategories.length > 0) {
        return NextResponse.json(
          { error: `Invalid categories: ${invalidCategories.join(', ')}` },
          { status: 400 }
        )
      }

      updateData.functionalCategories = functionalCategories
    }

    // Ensure we have something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Either role or functionalCategories must be provided' },
        { status: 400 }
      )
    }

    // Update member
    const updated = await prisma.organizationUser.update({
      where: {
        organizationId_userId: {
          organizationId,
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
    console.error('Error updating member:', error)
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    )
  }
}

// DELETE - Remove member from organization
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params
  const result = await checkPermission('ORG_MANAGE_MEMBERS')
  if (isAuthError(result)) return result.error

  const { auth } = result

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Prevent removing yourself
    if (userId === auth.user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the organization' },
        { status: 400 }
      )
    }

    // Check that there will still be at least one admin
    const admins = await prisma.organizationUser.count({
      where: {
        organizationId,
        role: 'ADMIN',
        userId: { not: userId }
      }
    })

    if (admins === 0) {
      return NextResponse.json(
        { error: 'Organization must have at least one admin' },
        { status: 400 }
      )
    }

    await prisma.organizationUser.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
