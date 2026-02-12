import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

// GET - List user's workspaces
export async function GET() {
  const result = await checkPermission('ORG_VIEW')
  if (isAuthError(result)) return result.error

  const { auth } = result

  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: { some: { userId: auth.user.id } }
      },
      include: {
        members: {
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
    const workspacesWithRoles = workspaces.map(workspace => {
      const currentMember = workspace.members.find(m => m.userId === auth.user.id)
      return {
        ...workspace,
        currentUserRole: currentMember?.workspaceRole, // Legacy
        currentUserWorkspaceRole: currentMember?.workspaceRole, // New
        currentUserId: auth.user.id,
      }
    })

    return NextResponse.json({ workspaces: workspacesWithRoles })
  } catch (error) {
    console.error('Error fetching workspaces:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    )
  }
}
