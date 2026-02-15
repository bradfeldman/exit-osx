import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { exposureState: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ exposureState: dbUser.exposureState })
  } catch (error) {
    console.error('Failed to fetch exposure state:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const patchSchema = z.object({
  exposureState: z.enum(['LEARNING', 'VIEWING', 'ACTING']),
})

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = await validateRequestBody(request, patchSchema)
  if (!validation.success) return validation.error
  const { exposureState } = validation.data

  try {

    const updatedUser = await prisma.user.update({
      where: { authId: user.id },
      data: { exposureState },
      select: { exposureState: true },
    })

    return NextResponse.json({ exposureState: updatedUser.exposureState })
  } catch (error) {
    console.error('Failed to update exposure state:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
