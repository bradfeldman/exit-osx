import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { ConsentType, ConsentAction } from '@prisma/client'

// GET - Get consent history
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

    // Get all consents for this user
    const consents = await prisma.userConsent.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        consentType: true,
        action: true,
        version: true,
        createdAt: true,
      },
    })

    // Get current consent status for each type
    const consentTypes = Object.values(ConsentType)
    const currentConsents: Record<string, { granted: boolean; lastUpdated: Date | null }> = {}

    for (const type of consentTypes) {
      const latestConsent = consents.find((c) => c.consentType === type)
      currentConsents[type] = {
        granted: latestConsent?.action === 'GRANTED',
        lastUpdated: latestConsent?.createdAt || null,
      }
    }

    return NextResponse.json({
      currentConsents,
      consentHistory: consents,
    })
  } catch (error) {
    console.error('Error fetching consents:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch consents' },
      { status: 500 }
    )
  }
}

// POST - Record a new consent
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { consentType, action, version } = body

    // Validate consent type
    if (!Object.values(ConsentType).includes(consentType)) {
      return NextResponse.json(
        { error: 'Invalid consent type' },
        { status: 400 }
      )
    }

    // Validate action
    if (!Object.values(ConsentAction).includes(action)) {
      return NextResponse.json(
        { error: 'Invalid consent action' },
        { status: 400 }
      )
    }

    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get IP and user agent from request headers
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    // Record the consent
    const consent = await prisma.userConsent.create({
      data: {
        userId: dbUser.id,
        consentType: consentType as ConsentType,
        action: action as ConsentAction,
        version,
        ipAddress,
        userAgent,
      },
      select: {
        id: true,
        consentType: true,
        action: true,
        version: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      message: 'Consent recorded successfully',
      consent,
    })
  } catch (error) {
    console.error('Error recording consent:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to record consent' },
      { status: 500 }
    )
  }
}

// PUT - Batch update multiple consents (for cookie settings)
export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { consents } = body // Array of { consentType, granted }

    if (!Array.isArray(consents)) {
      return NextResponse.json(
        { error: 'Consents must be an array' },
        { status: 400 }
      )
    }

    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get IP and user agent from request headers
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    // Record all consents
    const createdConsents = await prisma.$transaction(
      consents.map(({ consentType, granted }) =>
        prisma.userConsent.create({
          data: {
            userId: dbUser.id,
            consentType: consentType as ConsentType,
            action: granted ? 'GRANTED' : 'WITHDRAWN',
            ipAddress,
            userAgent,
          },
          select: {
            id: true,
            consentType: true,
            action: true,
            createdAt: true,
          },
        })
      )
    )

    return NextResponse.json({
      message: 'Consents updated successfully',
      consents: createdConsents,
    })
  } catch (error) {
    console.error('Error updating consents:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update consents' },
      { status: 500 }
    )
  }
}
