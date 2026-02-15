// Advisor Profile API
// GET/PUT advisor profile data

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { isExternalAdvisor } from '@/lib/auth/check-granular-permission'
import { validateRequestBody, shortText } from '@/lib/security/validation'

// GET - Get advisor profile
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error } = await supabase.auth.getUser()

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { authId: authUser.id },
      include: {
        advisorProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isAdvisor = await isExternalAdvisor(user.id)
    if (!isAdvisor) {
      return NextResponse.json({ error: 'Not an advisor' }, { status: 403 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      profile: user.advisorProfile,
    })
  } catch (error) {
    console.error('Failed to get advisor profile:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to get advisor profile' },
      { status: 500 }
    )
  }
}

const advisorProfileSchema = z.object({
  firmName: shortText.optional().nullable(),
  specialty: shortText.optional().nullable(),
})

// PUT - Update advisor profile
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error } = await supabase.auth.getUser()

    if (error || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { authId: authUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isAdvisor = await isExternalAdvisor(user.id)
    if (!isAdvisor) {
      return NextResponse.json({ error: 'Not an advisor' }, { status: 403 })
    }

    const validation = await validateRequestBody(request, advisorProfileSchema)
    if (!validation.success) return validation.error

    const { firmName, specialty } = validation.data

    const profile = await prisma.advisorProfile.upsert({
      where: { userId: user.id },
      update: {
        firmName: firmName || null,
        specialty: specialty || null,
      },
      create: {
        userId: user.id,
        firmName: firmName || null,
        specialty: specialty || null,
      },
    })

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Failed to update advisor profile:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update advisor profile' },
      { status: 500 }
    )
  }
}
