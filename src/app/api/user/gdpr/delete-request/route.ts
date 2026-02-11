import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import {
  applyRateLimit,
  RATE_LIMIT_CONFIGS,
  createRateLimitResponse,
} from '@/lib/security'

// GET - Get current deletion request status
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get active deletion request
    const deletionRequest = await prisma.dataDeletionRequest.findFirst({
      where: {
        userId: dbUser.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        scheduledFor: true,
        confirmedAt: true,
      },
    })

    return NextResponse.json({ deletionRequest })
  } catch (error) {
    console.error('Error fetching deletion request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deletion request' },
      { status: 500 }
    )
  }
}

// POST - Create a new deletion request
// SECURITY FIX (PROD-060): Added per-route rate limiting for sensitive GDPR operation
export async function POST(request: NextRequest) {
  const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.SENSITIVE)
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { reason } = body

    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for existing pending request
    const existingRequest = await prisma.dataDeletionRequest.findFirst({
      where: {
        userId: dbUser.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A deletion request is already pending' },
        { status: 400 }
      )
    }

    // Create deletion request with 30-day grace period
    const scheduledFor = new Date()
    scheduledFor.setDate(scheduledFor.getDate() + 30)

    const confirmationToken = randomBytes(32).toString('hex')

    const deletionRequest = await prisma.dataDeletionRequest.create({
      data: {
        userId: dbUser.id,
        reason,
        scheduledFor,
        confirmationToken,
      },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        scheduledFor: true,
        confirmationToken: true,
      },
    })

    // TODO: Send confirmation email with the token

    // SECURITY FIX (PROD-060): Removed confirmationToken from API response.
    // The token should only be delivered via email to prevent token leakage.
    return NextResponse.json({
      message: 'Deletion request created. Please check your email for the confirmation link.',
      deletionRequest: {
        id: deletionRequest.id,
        status: deletionRequest.status,
        requestedAt: deletionRequest.requestedAt,
        scheduledFor: deletionRequest.scheduledFor,
      },
    })
  } catch (error) {
    console.error('Error creating deletion request:', error)
    return NextResponse.json(
      { error: 'Failed to create deletion request' },
      { status: 500 }
    )
  }
}
