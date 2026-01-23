import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getGravatarUrl } from '@/lib/utils/gravatar'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if user already exists by authId
    let existingUser = await prisma.user.findUnique({
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

    // If not found by authId, check by email (user may have signed up with different auth method)
    if (!existingUser && user.email) {
      existingUser = await prisma.user.findUnique({
        where: { email: user.email },
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

      // If found by email, update the authId to link this auth method
      if (existingUser) {
        existingUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: { authId: user.id },
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
          user: existingUser,
          isNew: false
        })
      }
    }

    if (existingUser) {
      // Update avatar URL if missing
      if (!existingUser.avatarUrl) {
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            avatarUrl: user.user_metadata?.avatar_url || getGravatarUrl(user.email!, { size: 200 })
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
          user: updatedUser,
          isNew: false
        })
      }

      return NextResponse.json({
        user: existingUser,
        isNew: false
      })
    }

    // Create new user with a default organization
    // Use OAuth avatar if available, otherwise generate Gravatar URL
    const avatarUrl = user.user_metadata?.avatar_url || getGravatarUrl(user.email!, { size: 200 })

    const newUser = await prisma.user.create({
      data: {
        authId: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        avatarUrl,
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
