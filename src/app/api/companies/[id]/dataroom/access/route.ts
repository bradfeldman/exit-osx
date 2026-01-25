import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/dataroom'
import {
  validateRequestBody,
  dataRoomAccessGrantSchema,
  dataRoomAccessUpdateSchema,
  handleApiError,
} from '@/lib/security'

/**
 * GET /api/companies/[id]/dataroom/access
 * Get all access grants for the data room
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    const accessGrants = await prisma.dataRoomAccess.findMany({
      where: { dataRoomId: dataRoom.id },
      orderBy: { createdAt: 'desc' },
    })

    // Get invited by user info
    const inviterIds = [...new Set(accessGrants.map((a) => a.invitedById).filter(Boolean))] as string[]
    const inviters = inviterIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: inviterIds } },
          select: { id: true, name: true, email: true },
        })
      : []
    const inviterMap = new Map(inviters.map((u) => [u.id, u]))

    // Get activity summary for each user
    const activityByEmail = accessGrants.length > 0
      ? await prisma.dataRoomActivity.groupBy({
          by: ['userEmail'],
          where: {
            dataRoomId: dataRoom.id,
            userEmail: { in: accessGrants.map((a) => a.email) },
          },
          _count: true,
          _max: { createdAt: true },
        })
      : []

    const activityMap = new Map(activityByEmail.map((a) => [a.userEmail, { count: a._count, lastActive: a._max.createdAt }]))

    const accessWithActivity = accessGrants.map((grant) => ({
      ...grant,
      invitedBy: grant.invitedById ? inviterMap.get(grant.invitedById) : null,
      activity: activityMap.get(grant.email) || { count: 0, lastActive: null },
    }))

    return NextResponse.json({ accessGrants: accessWithActivity })
  } catch (error) {
    return handleApiError(error, 'fetching access grants')
  }
}

/**
 * POST /api/companies/[id]/dataroom/access
 * Grant access to an external user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    // SECURITY: Validate and sanitize input with Zod schema
    const validation = await validateRequestBody(request, dataRoomAccessGrantSchema)
    if (!validation.success) {
      return validation.error
    }

    const { email, accessLevel, maxStage, expiresAt, folderIds } = validation.data

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    // Check if access already exists
    const existing = await prisma.dataRoomAccess.findUnique({
      where: {
        dataRoomId_email: {
          dataRoomId: dataRoom.id,
          email, // Already lowercased by schema
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'Access already granted to this email' }, { status: 400 })
    }

    // Validate folder IDs if provided
    if (folderIds && folderIds.length > 0) {
      const folders = await prisma.dataRoomFolder.findMany({
        where: { id: { in: folderIds }, dataRoomId: dataRoom.id },
      })
      if (folders.length !== folderIds.length) {
        return NextResponse.json({ error: 'Invalid folder IDs' }, { status: 400 })
      }
    }

    const access = await prisma.dataRoomAccess.create({
      data: {
        dataRoomId: dataRoom.id,
        email, // Already validated and lowercased
        accessLevel, // Validated enum
        maxStage, // Validated enum
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        folderIds: folderIds || [],
        invitedById: result.auth.user.id,
      },
    })

    // Log activity
    await logActivity({
      dataRoomId: dataRoom.id,
      userId: result.auth.user.id,
      userEmail: result.auth.user.email,
      action: 'GRANTED_ACCESS',
      metadata: {
        grantedTo: email,
        accessLevel,
        maxStage,
      },
    })

    return NextResponse.json({ access }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'granting access')
  }
}

/**
 * PUT /api/companies/[id]/dataroom/access
 * Update an access grant
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    // SECURITY: Validate and sanitize input with Zod schema
    const validation = await validateRequestBody(request, dataRoomAccessUpdateSchema)
    if (!validation.success) {
      return validation.error
    }

    const { accessId, accessLevel, maxStage, expiresAt, folderIds, notes } = validation.data

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    const access = await prisma.dataRoomAccess.findUnique({
      where: { id: accessId },
    })

    if (!access || access.dataRoomId !== dataRoom.id) {
      return NextResponse.json({ error: 'Access grant not found' }, { status: 404 })
    }

    // SECURITY: Only include validated fields in update
    const updateData: Record<string, unknown> = {}
    if (accessLevel !== undefined) updateData.accessLevel = accessLevel
    if (maxStage !== undefined) updateData.maxStage = maxStage
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    if (folderIds !== undefined) updateData.folderIds = folderIds
    if (notes !== undefined) updateData.notes = notes

    const updated = await prisma.dataRoomAccess.update({
      where: { id: accessId },
      data: updateData,
    })

    // Log activity
    await logActivity({
      dataRoomId: dataRoom.id,
      userId: result.auth.user.id,
      userEmail: result.auth.user.email,
      action: 'GRANTED_ACCESS',
      metadata: {
        updatedAccess: access.email,
        changes: Object.keys(updateData),
      },
    })

    return NextResponse.json({ access: updated })
  } catch (error) {
    return handleApiError(error, 'updating access')
  }
}

/**
 * DELETE /api/companies/[id]/dataroom/access
 * Revoke access from an external user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const accessId = searchParams.get('accessId')

    if (!accessId) {
      return NextResponse.json({ error: 'Access ID is required' }, { status: 400 })
    }

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    const access = await prisma.dataRoomAccess.findUnique({
      where: { id: accessId },
    })

    if (!access || access.dataRoomId !== dataRoom.id) {
      return NextResponse.json({ error: 'Access grant not found' }, { status: 404 })
    }

    await prisma.dataRoomAccess.delete({
      where: { id: accessId },
    })

    // Log activity
    await logActivity({
      dataRoomId: dataRoom.id,
      userId: result.auth.user.id,
      userEmail: result.auth.user.email,
      action: 'REVOKED_ACCESS',
      metadata: { revokedFrom: access.email },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'revoking access')
  }
}
