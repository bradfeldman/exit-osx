import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

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
    console.error('Failed to fetch exposure state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { exposureState } = body

    if (!['LEARNING', 'VIEWING', 'ACTING'].includes(exposureState)) {
      return NextResponse.json({ error: 'Invalid exposure state' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { authId: user.id },
      data: { exposureState },
      select: { exposureState: true },
    })

    return NextResponse.json({ exposureState: updatedUser.exposureState })
  } catch (error) {
    console.error('Failed to update exposure state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
