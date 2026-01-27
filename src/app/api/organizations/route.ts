import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

// GET - List user's organizations
export async function GET() {
  const result = await checkPermission('ORG_VIEW')
  if (isAuthError(result)) return result.error

  const { auth } = result

  try {
    const organizations = await prisma.organization.findMany({
      where: {
        users: { some: { userId: auth.user.id } }
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              }
            },
            roleTemplate: {
              select: {
                id: true,
                slug: true,
                name: true,
                icon: true,
              }
            }
          }
        },
        companies: {
          select: {
            id: true,
            name: true,
          }
        },
        invites: {
          where: {
            acceptedAt: null,
            expiresAt: { gt: new Date() }
          },
          select: {
            id: true,
            token: true,
            email: true,
            role: true,
            functionalCategories: true,
            createdAt: true,
            expiresAt: true,
            isExternalAdvisor: true,
            roleTemplate: {
              select: {
                id: true,
                slug: true,
                name: true,
                icon: true,
              }
            }
          }
        }
      }
    })

    // Transform to include user role and user ID in response
    const orgsWithRoles = organizations.map(org => ({
      ...org,
      currentUserRole: org.users.find(u => u.userId === auth.user.id)?.role,
      currentUserId: auth.user.id,
    }))

    return NextResponse.json({ organizations: orgsWithRoles })
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}
