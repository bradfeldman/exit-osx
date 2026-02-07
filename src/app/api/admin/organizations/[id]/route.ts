import { NextRequest, NextResponse } from 'next/server'
import { PlanTier, SubscriptionStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin, isAdminError, logAdminAction } from '@/lib/admin'

const VALID_PLAN_TIERS = new Set(Object.values(PlanTier))
const VALID_SUBSCRIPTION_STATUSES = new Set(Object.values(SubscriptionStatus))

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

  // Get current org state
  const currentOrg = await prisma.organization.findUnique({
    where: { id },
    select: {
      name: true,
      planTier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
    },
  })

  if (!currentOrg) {
    return NextResponse.json(
      { error: 'Not found', message: 'Organization not found' },
      { status: 404 }
    )
  }

  const updateData: Record<string, unknown> = {}
  const changes: Record<string, { from: unknown; to: unknown }> = {}

  // Simple string fields
  if ('name' in body && body.name !== currentOrg.name) {
    updateData.name = body.name
    changes.name = { from: currentOrg.name, to: body.name }
  }

  // Plan tier (validated against enum)
  if ('planTier' in body && body.planTier !== currentOrg.planTier) {
    if (!VALID_PLAN_TIERS.has(body.planTier)) {
      return NextResponse.json(
        { error: 'Invalid value', message: `planTier must be one of: ${[...VALID_PLAN_TIERS].join(', ')}` },
        { status: 400 }
      )
    }
    updateData.planTier = body.planTier
    changes.planTier = { from: currentOrg.planTier, to: body.planTier }
  }

  // Subscription status (validated against enum)
  if ('subscriptionStatus' in body && body.subscriptionStatus !== currentOrg.subscriptionStatus) {
    if (!VALID_SUBSCRIPTION_STATUSES.has(body.subscriptionStatus)) {
      return NextResponse.json(
        { error: 'Invalid value', message: `subscriptionStatus must be one of: ${[...VALID_SUBSCRIPTION_STATUSES].join(', ')}` },
        { status: 400 }
      )
    }
    updateData.subscriptionStatus = body.subscriptionStatus
    changes.subscriptionStatus = { from: currentOrg.subscriptionStatus, to: body.subscriptionStatus }
  }

  // Trial end date (null to clear, ISO string to set)
  if ('trialEndsAt' in body) {
    const newVal = body.trialEndsAt ? new Date(body.trialEndsAt) : null
    if (body.trialEndsAt && isNaN(newVal!.getTime())) {
      return NextResponse.json(
        { error: 'Invalid value', message: 'trialEndsAt must be a valid ISO date string or null' },
        { status: 400 }
      )
    }
    updateData.trialEndsAt = newVal
    changes.trialEndsAt = { from: currentOrg.trialEndsAt, to: newVal }
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
      planTier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      updatedAt: true,
    },
  })

  // Log the update action
  await logAdminAction(result.admin, 'organization.update', 'Organization', organization.id, { changes })

  return NextResponse.json({ organization })
}
