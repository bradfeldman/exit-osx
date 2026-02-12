import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { CompanyRole } from '@prisma/client'

// GET - Get all team members for a company (from CompanyMember)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get company and verify access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: {
              where: { user: { authId: user.id } },
            },
          },
        },
      },
    })

    if (!company || company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the current user's WorkspaceMember record for role checking
    const currentUserMembership = company.workspace.members[0]
    const currentDbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { id: true },
    })

    if (!currentDbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if current user is a company member (to determine if they can see the team)
    const currentUserCompanyMember = await prisma.companyMember.findUnique({
      where: {
        companyId_userId: { companyId, userId: currentDbUser.id },
      },
    })

    // Only workspace admins or company members can view the team
    if (!currentUserCompanyMember && !['OWNER', 'ADMIN'].includes(currentUserMembership.workspaceRole)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all company team members
    const teamMembers = await prisma.companyMember.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    })

    return NextResponse.json({
      members: teamMembers.map(tm => ({
        id: tm.id,
        userId: tm.user.id,
        role: tm.role,
        user: tm.user,
        assignedBy: tm.assignedBy,
        createdAt: tm.createdAt,
      })),
      currentUserRole: currentUserCompanyMember?.role || null,
    })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}

// POST - Add a member to the company team
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userId, role = 'CONTRIBUTOR' } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Validate role
    const validRoles: CompanyRole[] = ['LEAD', 'CONTRIBUTOR', 'VIEWER']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Get current user
    const currentDbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        workspaces: {
          include: {
            workspace: {
              include: {
                companies: {
                  where: { id: companyId },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    })

    if (!currentDbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify current user has access to this company
    const hasAccess = currentDbUser.workspaces.some(
      wm => wm.workspace.companies && wm.workspace.companies.length > 0
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if current user is a LEAD on this company (or workspace admin)
    const currentUserCompanyMember = await prisma.companyMember.findUnique({
      where: {
        companyId_userId: { companyId, userId: currentDbUser.id },
      },
    })

    const currentUserWorkspace = currentDbUser.workspaces[0]
    const isWorkspaceAdmin = ['OWNER', 'ADMIN'].includes(currentUserWorkspace.workspaceRole)
    const isCompanyLead = currentUserCompanyMember?.role === 'LEAD'

    if (!isWorkspaceAdmin && !isCompanyLead) {
      return NextResponse.json(
        { error: 'Only workspace admins or company leads can add team members' },
        { status: 403 }
      )
    }

    // Verify target user exists and is in the same workspace
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaces: {
          where: { workspaceId: currentUserWorkspace.workspaceId },
        },
      },
    })

    if (!targetUser || targetUser.workspaces.length === 0) {
      return NextResponse.json(
        { error: 'User not found in workspace' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMember = await prisma.companyMember.findUnique({
      where: {
        companyId_userId: { companyId, userId },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this company' },
        { status: 400 }
      )
    }

    // Create company member
    const companyMember = await prisma.companyMember.create({
      data: {
        companyId,
        userId,
        role,
        assignedById: currentDbUser.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      member: {
        id: companyMember.id,
        userId: companyMember.userId,
        role: companyMember.role,
        user: companyMember.user,
        createdAt: companyMember.createdAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error adding team member:', error)
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    )
  }
}

// PATCH - Update a member's role
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId, role } = await request.json()

    if (!memberId || !role) {
      return NextResponse.json(
        { error: 'memberId and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles: CompanyRole[] = ['LEAD', 'CONTRIBUTOR', 'VIEWER']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Get current user
    const currentDbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        workspaces: true,
      },
    })

    if (!currentDbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if current user is a LEAD on this company (or workspace admin)
    const currentUserCompanyMember = await prisma.companyMember.findUnique({
      where: {
        companyId_userId: { companyId, userId: currentDbUser.id },
      },
    })

    const currentUserWorkspace = currentDbUser.workspaces[0]
    const isWorkspaceAdmin = currentUserWorkspace && ['OWNER', 'ADMIN'].includes(currentUserWorkspace.workspaceRole)
    const isCompanyLead = currentUserCompanyMember?.role === 'LEAD'

    if (!isWorkspaceAdmin && !isCompanyLead) {
      return NextResponse.json(
        { error: 'Only workspace admins or company leads can change roles' },
        { status: 403 }
      )
    }

    // Update the member
    const updatedMember = await prisma.companyMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      member: {
        id: updatedMember.id,
        userId: updatedMember.userId,
        role: updatedMember.role,
        user: updatedMember.user,
      },
    })
  } catch (error) {
    console.error('Error updating team member:', error)
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a member from the company team
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
    }

    // Get current user
    const currentDbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        workspaces: true,
      },
    })

    if (!currentDbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if current user is a LEAD on this company (or workspace admin)
    const currentUserCompanyMember = await prisma.companyMember.findUnique({
      where: {
        companyId_userId: { companyId, userId: currentDbUser.id },
      },
    })

    const currentUserWorkspace = currentDbUser.workspaces[0]
    const isWorkspaceAdmin = currentUserWorkspace && ['OWNER', 'ADMIN'].includes(currentUserWorkspace.workspaceRole)
    const isCompanyLead = currentUserCompanyMember?.role === 'LEAD'

    if (!isWorkspaceAdmin && !isCompanyLead) {
      return NextResponse.json(
        { error: 'Only workspace admins or company leads can remove team members' },
        { status: 403 }
      )
    }

    // Verify the member exists and belongs to this company
    const member = await prisma.companyMember.findUnique({
      where: { id: memberId },
    })

    if (!member || member.companyId !== companyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Don't allow removing the last LEAD
    if (member.role === 'LEAD') {
      const leadCount = await prisma.companyMember.count({
        where: {
          companyId,
          role: 'LEAD',
        },
      })

      if (leadCount === 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last Lead. Transfer ownership first.' },
          { status: 400 }
        )
      }
    }

    // Delete the member
    await prisma.companyMember.delete({
      where: { id: memberId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing team member:', error)
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    )
  }
}
