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

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
      companies: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          icbIndustry: true,
          annualRevenue: true,
          createdAt: true,
        },
      },
    },
  })

  if (!organization) {
    return NextResponse.json(
      { error: 'Not found', message: 'Organization not found' },
      { status: 404 }
    )
  }

  // Log the view action
  await logAdminAction(result.admin, 'organization.view', 'Organization', organization.id)

  return NextResponse.json({ organization })
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
  const allowedFields = ['name']
  const updateData: Record<string, unknown> = {}
  const changes: Record<string, { from: unknown; to: unknown }> = {}

  // Get current org state
  const currentOrg = await prisma.organization.findUnique({
    where: { id },
    select: { name: true },
  })

  if (!currentOrg) {
    return NextResponse.json(
      { error: 'Not found', message: 'Organization not found' },
      { status: 404 }
    )
  }

  for (const field of allowedFields) {
    if (field in body && body[field] !== currentOrg[field as keyof typeof currentOrg]) {
      updateData[field] = body[field]
      changes[field] = {
        from: currentOrg[field as keyof typeof currentOrg],
        to: body[field],
      }
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ organization: currentOrg, message: 'No changes made' })
  }

  const organization = await prisma.organization.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      updatedAt: true,
    },
  })

  // Log the update action
  await logAdminAction(result.admin, 'organization.update', 'Organization', organization.id, { changes })

  return NextResponse.json({ organization })
}
