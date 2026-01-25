// PATCH /api/organizations/[id]/members/[memberId]/permissions - Update member permissions
// Allows setting role template and custom permission overrides

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { resolveUserPermissions } from '@/lib/auth/check-granular-permission'
import { GRANULAR_PERMISSIONS } from '@/lib/auth/permissions'

interface RouteParams {
  params: Promise<{
    id: string
    memberId: string
  }>
}

// GET - Get member's current permissions
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const result = await checkPermission('ORG_VIEW')
    if (isAuthError(result)) return result.error

    const { id: organizationId, memberId } = await params

    // Verify the member belongs to this organization
    const orgUser = await prisma.organizationUser.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        roleTemplate: true,
        customPermissions: true,
      },
    })

    if (!orgUser) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Resolve their permissions
    const resolved = await resolveUserPermissions(memberId)

    return NextResponse.json({
      memberId: orgUser.id,
      user: orgUser.user,
      role: orgUser.role,
      isExternalAdvisor: orgUser.isExternalAdvisor,
      roleTemplate: orgUser.roleTemplate
        ? {
            id: orgUser.roleTemplate.id,
            slug: orgUser.roleTemplate.slug,
            name: orgUser.roleTemplate.name,
          }
        : null,
      customPermissions: orgUser.customPermissions.map((p) => ({
        permission: p.permission,
        granted: p.granted,
      })),
      resolvedPermissions: resolved.permissions,
    })
  } catch (error) {
    console.error('Failed to get member permissions:', error)
    return NextResponse.json(
      { error: 'Failed to get member permissions' },
      { status: 500 }
    )
  }
}

// PATCH - Update member's permissions
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const result = await checkPermission('ORG_MANAGE_MEMBERS')
    if (isAuthError(result)) return result.error

    const { id: organizationId, memberId } = await params
    const body = await request.json()

    // Verify the member belongs to this organization
    const orgUser = await prisma.organizationUser.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
    })

    if (!orgUser) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const {
      roleTemplateId,
      isExternalAdvisor,
      customPermissions,
    }: {
      roleTemplateId?: string | null
      isExternalAdvisor?: boolean
      customPermissions?: Array<{ permission: string; granted: boolean }>
    } = body

    // Validate role template if provided
    if (roleTemplateId !== undefined && roleTemplateId !== null) {
      const template = await prisma.roleTemplate.findUnique({
        where: { id: roleTemplateId },
      })
      if (!template) {
        return NextResponse.json({ error: 'Role template not found' }, { status: 400 })
      }
    }

    // Validate custom permissions if provided
    if (customPermissions) {
      const validPermissions = Object.keys(GRANULAR_PERMISSIONS)
      for (const perm of customPermissions) {
        if (!validPermissions.includes(perm.permission)) {
          return NextResponse.json(
            { error: `Invalid permission: ${perm.permission}` },
            { status: 400 }
          )
        }
      }
    }

    // Update organization user
    const updateData: {
      roleTemplateId?: string | null
      isExternalAdvisor?: boolean
    } = {}

    if (roleTemplateId !== undefined) {
      updateData.roleTemplateId = roleTemplateId
    }

    if (isExternalAdvisor !== undefined) {
      updateData.isExternalAdvisor = isExternalAdvisor
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.organizationUser.update({
        where: { id: memberId },
        data: updateData,
      })
    }

    // Update custom permissions
    if (customPermissions) {
      // Delete existing custom permissions
      await prisma.memberPermission.deleteMany({
        where: { organizationUserId: memberId },
      })

      // Create new custom permissions
      if (customPermissions.length > 0) {
        await prisma.memberPermission.createMany({
          data: customPermissions.map((p) => ({
            organizationUserId: memberId,
            permission: p.permission,
            granted: p.granted,
          })),
        })
      }
    }

    // Return updated permissions
    const resolved = await resolveUserPermissions(memberId)

    const updatedOrgUser = await prisma.organizationUser.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        roleTemplate: true,
        customPermissions: true,
      },
    })

    return NextResponse.json({
      memberId: updatedOrgUser!.id,
      user: updatedOrgUser!.user,
      role: updatedOrgUser!.role,
      isExternalAdvisor: updatedOrgUser!.isExternalAdvisor,
      roleTemplate: updatedOrgUser!.roleTemplate
        ? {
            id: updatedOrgUser!.roleTemplate.id,
            slug: updatedOrgUser!.roleTemplate.slug,
            name: updatedOrgUser!.roleTemplate.name,
          }
        : null,
      customPermissions: updatedOrgUser!.customPermissions.map((p) => ({
        permission: p.permission,
        granted: p.granted,
      })),
      resolvedPermissions: resolved.permissions,
    })
  } catch (error) {
    console.error('Failed to update member permissions:', error)
    return NextResponse.json(
      { error: 'Failed to update member permissions' },
      { status: 500 }
    )
  }
}

// DELETE - Remove all custom permissions (revert to template defaults)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const result = await checkPermission('ORG_MANAGE_MEMBERS')
    if (isAuthError(result)) return result.error

    const { id: organizationId, memberId } = await params

    // Verify the member belongs to this organization
    const orgUser = await prisma.organizationUser.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
    })

    if (!orgUser) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Delete all custom permissions
    await prisma.memberPermission.deleteMany({
      where: { organizationUserId: memberId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reset member permissions:', error)
    return NextResponse.json(
      { error: 'Failed to reset member permissions' },
      { status: 500 }
    )
  }
}
