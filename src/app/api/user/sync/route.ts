import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                companies: true
              }
            }
          }
        }
      }
    })

    if (existingUser) {
      return NextResponse.json({
        user: existingUser,
        isNew: false
      })
    }

    // Create new user with a default organization
    const newUser = await prisma.user.create({
      data: {
        authId: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        avatarUrl: user.user_metadata?.avatar_url,
        organizations: {
          create: {
            role: 'ADMIN',
            organization: {
              create: {
                name: user.user_metadata?.name
                  ? `${user.user_metadata.name}'s Organization`
                  : 'My Organization'
              }
            }
          }
        }
      },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                companies: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      user: newUser,
      isNew: true
    })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}
