import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/user/profile - Get current user's profile from database
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { authId: authUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user profile:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}

// PUT /api/user/profile - Update current user's profile in database
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    // SECURITY: Validate and sanitize name input
    const rawName = body.name
    const name = typeof rawName === 'string' ? rawName.trim().slice(0, 200) : undefined

    if (name !== undefined && name.length === 0) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { authId: authUser.id },
      data: { ...(name !== undefined && { name }) },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user profile:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    )
  }
}
