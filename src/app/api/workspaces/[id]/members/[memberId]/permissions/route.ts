// PATCH /api/workspaces/[id]/members/[memberId]/permissions - Update member permissions
// Allows setting role template and custom permission overrides

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { resolveUserPermissions } from '@/lib/auth/check-granular-permission'
import { GRANULAR_PERMISSIONS } from '@/lib/auth/permissions'
import { z } from 'zod'
import { validateRequestBody, uuidSchema } from '@/lib/security/validation'

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

    const { id: workspaceId, memberId } = await params

    // Verify the member belongs to this workspace
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
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

    if (!workspaceMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Resolve their permissions
    const resolved = await resolveUserPermissions(memberId)

    return NextResponse.json({
      memberId: workspaceMember.id,
      user: workspaceMember.user,
      role: workspaceMember.workspaceRole,
      isExternalAdvisor: workspaceMember.isExternalAdvisor,
      roleTemplate: workspaceMember.roleTemplate
        ? {
            id: workspaceMember.roleTemplate.id,
            slug: workspaceMember.roleTemplate.slug,
            name: workspaceMember.roleTemplate.name,
          }
        : null,
      customPermissions: workspaceMember.customPermissions.map((p) => ({
        permission: p.permission,
        granted: p.granted,
      })),
      resolvedPermissions: resolved.permissions,
    })
  } catch (error) {
    console.error('Failed to get member permissions:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to get member permissions' },
      { status: 500 }
    )
  }
}

const patchSchema = z.object({
  roleTemplateId: uuidSchema.nullable().optional(),
  isExternalAdvisor: z.boolean().optional(),
  customPermissions: z.array(z.object({
    permission: z.string().max(100),
    granted: z.boolean(),
  })).max(100).optional(),
})

// PATCH - Update member's permissions
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const result = await checkPermission('ORG_MANAGE_MEMBERS')
    if (isAuthError(result)) return result.error

    const { id: workspaceId, memberId } = await params

    const validation = await validateRequestBody(request, patchSchema)
    if (!validation.success) return validation.error
    const {
      roleTemplateId,
      isExternalAdvisor,
      customPermissions,
    } = validation.data

    // Verify the member belongs to this workspace
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

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

    // Update workspace member
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
      await prisma.workspaceMember.update({
        where: { id: memberId },
        data: updateData,
      })
    }

    // Update custom permissions
    if (customPermissions) {
      // Delete existing custom permissions
      await prisma.memberPermission.deleteMany({
        where: { workspaceMemberId: memberId },
      })

      // Create new custom permissions
      if (customPermissions.length > 0) {
        await prisma.memberPermission.createMany({
          data: customPermissions.map((p) => ({
            workspaceMemberId: memberId,
            permission: p.permission,
            granted: p.granted,
          })),
        })
      }
    }

    // Return updated permissions
    const resolved = await resolveUserPermissions(memberId)

    const updatedWorkspaceMember = await prisma.workspaceMember.findUnique({
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
      memberId: updatedWorkspaceMember!.id,
      user: updatedWorkspaceMember!.user,
      role: updatedWorkspaceMember!.workspaceRole,
      isExternalAdvisor: updatedWorkspaceMember!.isExternalAdvisor,
      roleTemplate: updatedWorkspaceMember!.roleTemplate
        ? {
            id: updatedWorkspaceMember!.roleTemplate.id,
            slug: updatedWorkspaceMember!.roleTemplate.slug,
            name: updatedWorkspaceMember!.roleTemplate.name,
          }
        : null,
      customPermissions: updatedWorkspaceMember!.customPermissions.map((p) => ({
        permission: p.permission,
        granted: p.granted,
      })),
      resolvedPermissions: resolved.permissions,
    })
  } catch (error) {
    console.error('Failed to update member permissions:', error instanceof Error ? error.message : String(error))
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

    const { id: workspaceId, memberId } = await params

    // Verify the member belongs to this workspace
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Delete all custom permissions
    await prisma.memberPermission.deleteMany({
      where: { workspaceMemberId: memberId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reset member permissions:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to reset member permissions' },
      { status: 500 }
    )
  }
}
