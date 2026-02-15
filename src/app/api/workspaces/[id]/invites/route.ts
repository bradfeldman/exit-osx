import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { WorkspaceRole, FunctionalCategory } from '@prisma/client'
import { GRANULAR_PERMISSIONS } from '@/lib/auth/permissions'
import { Resend } from 'resend'
import { z } from 'zod'
import { validateRequestBody, emailSchema, uuidSchema } from '@/lib/security/validation'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// GET - List pending invites
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params
  const result = await checkPermission('ORG_INVITE_USERS')
  if (isAuthError(result)) return result.error

  const { auth } = result

  try {
    // Verify user is member of this workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: auth.user.id,
        }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const invites = await prisma.workspaceInvite.findMany({
      where: {
        workspaceId,
        acceptedAt: null,
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
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
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Error fetching invites:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    )
  }
}

const postSchema = z.object({
  email: emailSchema,
  role: z.nativeEnum(WorkspaceRole).default('MEMBER'),
  functionalCategories: z.array(z.nativeEnum(FunctionalCategory)).max(50).default([]),
  roleTemplateId: uuidSchema.optional().nullable(),
  customPermissions: z.array(z.object({
    permission: z.string().max(100),
    granted: z.boolean(),
  })).max(100).optional().nullable(),
  isExternalAdvisor: z.boolean().default(false),
})

// POST - Create invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params
  const result = await checkPermission('ORG_INVITE_USERS')
  if (isAuthError(result)) return result.error

  const { auth } = result

  const validation = await validateRequestBody(request, postSchema)
  if (!validation.success) return validation.error
  const {
    email,
    role,
    functionalCategories,
    roleTemplateId,
    customPermissions,
    isExternalAdvisor,
  } = validation.data

  try {
    // Validate role template if provided
    if (roleTemplateId) {
      const template = await prisma.roleTemplate.findUnique({
        where: { id: roleTemplateId },
      })
      if (!template) {
        return NextResponse.json(
          { error: 'Role template not found' },
          { status: 400 }
        )
      }
    }

    // Validate custom permissions if provided
    if (customPermissions) {
      const validPermissions = Object.keys(GRANULAR_PERMISSIONS)
      for (const perm of customPermissions) {
        if (!validPermissions.includes(perm.permission)) {
          return NextResponse.json(
            { error: `Invalid permission: ${perm.permission}` },
            { status: 400 }
          )
        }
      }
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        workspaces: {
          where: { workspaceId }
        }
      }
    })

    if (existingUser && existingUser.workspaces.length > 0) {
      return NextResponse.json(
        { error: 'User is already a member of this workspace' },
        { status: 400 }
      )
    }

    // Check if there's already a pending invite
    const existingInvite = await prisma.workspaceInvite.findUnique({
      where: {
        workspaceId_email: {
          workspaceId,
          email: email.toLowerCase(),
        }
      }
    })

    if (existingInvite && !existingInvite.acceptedAt) {
      return NextResponse.json(
        { error: 'An invite has already been sent to this email' },
        { status: 400 }
      )
    }

    // Create invite (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: email.toLowerCase(),
        role,
        functionalCategories: functionalCategories as FunctionalCategory[],
        invitedBy: auth.user.id,
        expiresAt,
        roleTemplateId: roleTemplateId || null,
        ...(customPermissions ? { customPermissions } : {}),
        isExternalAdvisor,
      },
      include: {
        workspace: { select: { name: true } },
        inviter: { select: { name: true, email: true } },
        roleTemplate: { select: { id: true, slug: true, name: true } }
      }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
    const inviteUrl = `${baseUrl}/invite/${invite.token}`

    // Get primary company name for better UX in email
    const primaryCompany = await prisma.company.findFirst({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      select: { name: true },
    })
    const displayName = primaryCompany?.name || invite.workspace.name

    // Send email notification with invite link
    let emailSent = false
    let emailError: string | null = null

    if (resend) {
      try {
        const inviterName = invite.inviter.name || invite.inviter.email
        const roleName = invite.role.replace('_', ' ').toLowerCase()
        const expiresDate = new Date(invite.expiresAt).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })

        const result = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
          to: invite.email,
          subject: `You've been invited to join ${displayName} on Exit OSx`,
          html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've Been Invited - Exit OSx</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <span style="font-size: 28px; font-weight: 700; color: #3D3D3D; letter-spacing: -0.5px;">Exit OS<span style="color: #B87333;">x</span></span>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Icon -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 30px auto;">
                <tr>
                  <td style="width: 64px; height: 64px; background-color: #FFF7F0; border-radius: 50%; text-align: center; vertical-align: middle;">
                    <span style="font-size: 28px;">&#127881;</span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #3D3D3D; text-align: center; letter-spacing: -0.5px;">
                You've Been Invited!
              </h1>

              <!-- Subheading -->
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 24px; color: #6B7280; text-align: center;">
                <strong>${inviterName}</strong> has invited you to join <strong>${displayName}</strong> on Exit OSx as a <strong>${roleName}</strong>.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 32px auto;">
                <tr>
                  <td style="background-color: #B87333; border-radius: 8px;">
                    <a href="${inviteUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #9CA3AF; text-align: center;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 32px 0; font-size: 13px; color: #B87333; text-align: center; word-break: break-all;">
                ${inviteUrl}
              </p>

              <!-- Divider -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                <tr>
                  <td style="border-top: 1px solid #f0f0f0;"></td>
                </tr>
              </table>

              <!-- What's Next Section -->
              <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #3D3D3D; text-align: center;">
                What You'll Get Access To
              </h2>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 12px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 32px; height: 32px; background-color: #E8F5ED; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="color: #2D7A4F; font-size: 14px;">&#10003;</span>
                        </td>
                        <td style="padding-left: 16px; font-size: 15px; color: #4B5563;">
                          Collaborate with your team on exit planning
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 32px; height: 32px; background-color: #E8F5ED; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="color: #2D7A4F; font-size: 14px;">&#10003;</span>
                        </td>
                        <td style="padding-left: 16px; font-size: 15px; color: #4B5563;">
                          Track tasks and playbook progress together
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 32px; height: 32px; background-color: #E8F5ED; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="color: #2D7A4F; font-size: 14px;">&#10003;</span>
                        </td>
                        <td style="padding-left: 16px; font-size: 15px; color: #4B5563;">
                          Access shared company data and insights
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #FAFAFA; border-top: 1px solid #f0f0f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #9CA3AF; text-align: center;">
                This invitation expires on ${expiresDate}.
              </p>
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #9CA3AF; text-align: center;">
                If you weren't expecting this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>

        <!-- Bottom Links -->
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                <a href="https://exitosx.com" style="color: #6B7280; text-decoration: none;">Website</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="https://exitosx.com/privacy" style="color: #6B7280; text-decoration: none;">Privacy Policy</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="https://exitosx.com/terms" style="color: #6B7280; text-decoration: none;">Terms of Service</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`,
        })
        emailSent = true
        console.log('[Invite Email] Sent successfully to:', invite.email, 'Resend ID:', result.data?.id)
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'Unknown error'
        console.error('[Invite Email] Failed to send to:', invite.email, 'Error:', emailError)
        // Don't fail the invite creation if email fails
      }
    } else {
      console.warn('[Invite Email] Resend not configured - RESEND_API_KEY missing')
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        functionalCategories: invite.functionalCategories,
        expiresAt: invite.expiresAt,
        inviteUrl,
        roleTemplate: invite.roleTemplate,
        customPermissions: invite.customPermissions,
        isExternalAdvisor: invite.isExternalAdvisor,
        // Email delivery status for user feedback
        emailSent,
        emailError,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating invite:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel invite
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params
  const result = await checkPermission('ORG_INVITE_USERS')
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('inviteId')

    if (!inviteId) {
      return NextResponse.json(
        { error: 'inviteId is required' },
        { status: 400 }
      )
    }

    // Verify invite belongs to this workspace
    const invite = await prisma.workspaceInvite.findFirst({
      where: {
        id: inviteId,
        workspaceId,
      }
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    await prisma.workspaceInvite.delete({
      where: { id: inviteId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error canceling invite:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to cancel invite' },
      { status: 500 }
    )
  }
}
