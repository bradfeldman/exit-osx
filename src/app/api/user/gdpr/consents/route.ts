import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { ConsentType, ConsentAction } from '@prisma/client'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

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

const postSchema = z.object({
  consentType: z.nativeEnum(ConsentType),
  action: z.nativeEnum(ConsentAction),
  version: z.string().max(100).optional(),
})

// POST - Record a new consent
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = await validateRequestBody(request, postSchema)
  if (!validation.success) return validation.error
  const { consentType, action, version } = validation.data

  try {

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

const putSchema = z.object({
  consents: z.array(z.object({
    consentType: z.nativeEnum(ConsentType),
    granted: z.boolean(),
  })).max(100),
})

// PUT - Batch update multiple consents (for cookie settings)
export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = await validateRequestBody(request, putSchema)
  if (!validation.success) return validation.error
  const { consents } = validation.data

  try {

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
