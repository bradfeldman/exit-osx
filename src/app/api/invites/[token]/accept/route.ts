import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import {
  applyRateLimit,
  RATE_LIMIT_CONFIGS,
  createRateLimitResponse,
} from '@/lib/security'

// POST - Accept an invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { token } = await params

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Please log in to accept the invite' },
      { status: 401 }
    )
  }

  try {
    // Find the invite
    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            companies: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: { name: true }
            }
          }
        },
        roleTemplate: { select: { id: true, slug: true, name: true } }
      }
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: 'This invite has already been accepted' },
        { status: 400 }
      )
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 400 }
      )
    }

    // Get or create the user in our database
    let dbUser = await prisma.user.findUnique({
      where: { authId: user.id }
    })

    if (!dbUser) {
      // Create user if they don't exist yet
      dbUser = await prisma.user.create({
        data: {
          authId: user.id,
          email: user.email!,
          name: user.user_metadata?.name || null,
          avatarUrl: user.user_metadata?.avatar_url || null,
        }
      })
    }

    // Verify the invite email matches the logged-in user
    if (invite.email.toLowerCase() !== dbUser.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: 'Email mismatch',
          message: `This invite was sent to ${invite.email}. Please log in with that email address.`
        },
        { status: 403 }
      )
    }

    // Check if user is already a member
    const existingMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: dbUser.id,
        }
      }
    })

    if (existingMembership) {
      // Mark invite as accepted and return
      await prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() }
      })

      return NextResponse.json({
        success: true,
        message: 'You are already a member of this workspace',
        workspace: invite.workspace,
      })
    }

    // Add user to workspace and mark invite as accepted
    // First create the workspace member
    const workspaceMember = await prisma.workspaceMember.create({
      data: {
        workspaceId: invite.workspaceId,
        userId: dbUser.id,
        role: invite.role,
        functionalCategories: invite.functionalCategories,
        roleTemplateId: invite.roleTemplateId,
        isExternalAdvisor: invite.isExternalAdvisor,
      }
    })

    // Apply custom permissions if any were configured in the invite
    if (invite.customPermissions && Array.isArray(invite.customPermissions)) {
      const customPerms = invite.customPermissions as Array<{ permission: string; granted: boolean }>
      if (customPerms.length > 0) {
        await prisma.memberPermission.createMany({
          data: customPerms.map((p) => ({
            workspaceMemberId: workspaceMember.id,
            permission: p.permission,
            granted: p.granted,
          })),
        })
      }
    }

    // Mark invite as accepted
    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() }
    })

    // Create advisor profile if this is an external advisor
    if (invite.isExternalAdvisor) {
      // Check if advisor profile already exists
      const existingProfile = await prisma.advisorProfile.findUnique({
        where: { userId: dbUser.id }
      })
      if (!existingProfile) {
        await prisma.advisorProfile.create({
          data: {
            userId: dbUser.id,
            specialty: invite.roleTemplate?.name || null,
          }
        })
      }
    }

    // Use company name if available for better UX
    const displayName = invite.workspace.companies[0]?.name || invite.workspace.name

    return NextResponse.json({
      success: true,
      message: `You have joined ${displayName}`,
      workspace: invite.workspace,
    })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    )
  }
}

// GET - Get invite details (for display before accepting)
// SECURITY: Rate limited to prevent token enumeration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // SECURITY: Apply rate limiting to prevent invite token enumeration
  // Using SENSITIVE config (10/min) instead of TOKEN (3/min) to allow reasonable page refreshes
  const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.SENSITIVE)
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }

  const { token } = await params

  // DEBUG: Log token lookup for troubleshooting
  console.log('[Invite API] Looking up token:', token?.substring(0, 10) + '...')

  try {
    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            name: true,
            companies: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: { name: true }
            }
          }
        },
        inviter: { select: { name: true, email: true } },
        roleTemplate: { select: { name: true, icon: true } }
      }
    })

    // DEBUG: Log result
    console.log('[Invite API] Invite found:', !!invite, invite ? `(workspace: ${invite.workspace.name})` : '')

    // SECURITY: Return generic error to prevent token enumeration
    // Don't reveal whether token exists, is expired, or was already used
    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    // SECURITY: Check expiration and acceptance before revealing details
    if (new Date() > invite.expiresAt || invite.acceptedAt) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    // Check if invited email already has an account
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email.toLowerCase() },
      select: { id: true }
    })

    // Get the primary company name (first company in workspace) for better UX
    const primaryCompanyName = invite.workspace.companies[0]?.name

    return NextResponse.json({
      invite: {
        // SECURITY: Only reveal minimal info needed for the acceptance flow
        // Don't expose full email to prevent info leakage
        emailHint: invite.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        role: invite.role,
        workspaceName: invite.workspace.name,
        // Show company name if available, otherwise fall back to workspace name
        companyName: primaryCompanyName || null,
        inviterName: invite.inviter.name || 'A team member',
        roleTemplate: invite.roleTemplate ? { name: invite.roleTemplate.name, icon: invite.roleTemplate.icon } : null,
        isExternalAdvisor: invite.isExternalAdvisor,
        // Let the UI know if user needs to create account or just sign in
        hasExistingAccount: !!existingUser,
      }
    })
  } catch (error) {
    console.error('Error fetching invite:', error)
    return NextResponse.json(
      { error: 'Invalid or expired invitation' },
      { status: 404 }
    )
  }
}
