import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { isUserSubscribingOwner, getCompanySubscribingOwner, PERSONAL_FEATURES } from '@/lib/access'
import { createAccessRequestAlert } from '@/lib/alerts'

// GET - List access requests for a company (owner only)
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
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'PENDING' | 'APPROVED' | 'DENIED' | 'all'

    // Get the current user
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is subscribing owner
    const isOwner = await isUserSubscribingOwner(dbUser.id, companyId)
    if (!isOwner) {
      return NextResponse.json({ error: 'Only the subscribing owner can view access requests' }, { status: 403 })
    }

    // Build query
    const whereClause: Record<string, unknown> = { companyId }
    if (status && status !== 'all') {
      whereClause.status = status
    }

    const requests = await prisma.accessRequest.findMany({
      where: whereClause,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      requests: requests.map(req => ({
        id: req.id,
        featureKey: req.featureKey,
        status: req.status,
        reason: req.reason,
        requester: req.requester,
        respondedAt: req.respondedAt?.toISOString(),
        expiresAt: req.expiresAt.toISOString(),
        createdAt: req.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching access requests:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch access requests' },
      { status: 500 }
    )
  }
}

// POST - Create access request (staff only)
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
    const body = await request.json()
    const { featureKey, reason } = body

    // Validate feature key
    if (!featureKey || !PERSONAL_FEATURES.includes(featureKey)) {
      return NextResponse.json(
        { error: 'Invalid feature key. Must be one of: pfs, retirement, loans' },
        { status: 400 }
      )
    }

    // Get the current user
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is staff (not owner)
    const ownership = await prisma.companyOwnership.findUnique({
      where: {
        companyId_userId: { companyId, userId: dbUser.id },
      },
    })

    if (ownership) {
      return NextResponse.json({ error: 'Owners do not need to request access' }, { status: 400 })
    }

    const staffAccess = await prisma.companyStaffAccess.findUnique({
      where: {
        companyId_userId: { companyId, userId: dbUser.id },
      },
    })

    if (!staffAccess || staffAccess.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'You do not have staff access to this company' }, { status: 403 })
    }

    // Check if user already has this access
    const featureField = featureKey === 'pfs' ? 'hasPFSAccess'
      : featureKey === 'retirement' ? 'hasRetirementAccess'
      : 'hasLoansAccess'

    if (staffAccess[featureField]) {
      return NextResponse.json({ error: 'You already have access to this feature' }, { status: 400 })
    }

    // Check for existing pending request
    const existingRequest = await prisma.accessRequest.findFirst({
      where: {
        companyId,
        requesterId: dbUser.id,
        featureKey,
        status: 'PENDING',
      },
    })

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending request for this feature' }, { status: 400 })
    }

    // Get subscribing owner
    const subscribingOwner = await getCompanySubscribingOwner(companyId)
    if (!subscribingOwner) {
      return NextResponse.json({ error: 'Company has no subscribing owner' }, { status: 400 })
    }

    // Get company name
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    })

    // Create access request (expires in 30 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const accessRequest = await prisma.accessRequest.create({
      data: {
        companyId,
        requesterId: dbUser.id,
        ownerId: subscribingOwner.id,
        featureKey,
        reason: reason || null,
        expiresAt,
      },
    })

    // Create alert for owner
    await createAccessRequestAlert(
      subscribingOwner.id,
      dbUser.name || dbUser.email,
      featureKey,
      company?.name || 'Unknown Company',
      accessRequest.id
    )

    return NextResponse.json({
      request: {
        id: accessRequest.id,
        featureKey: accessRequest.featureKey,
        status: accessRequest.status,
        expiresAt: accessRequest.expiresAt.toISOString(),
        createdAt: accessRequest.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error creating access request:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to create access request' },
      { status: 500 }
    )
  }
}
