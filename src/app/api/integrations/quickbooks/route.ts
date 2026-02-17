import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import {
  isQuickBooksConfigured,
  getAuthorizationUrl,
  syncQuickBooksData,
  revokeTokens,
} from '@/lib/integrations/quickbooks'
import { createSignedOAuthState } from '@/lib/security/oauth-state'
import { decryptToken, isEncrypted } from '@/lib/security/token-encryption'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

// Sync can make 12+ API calls to QuickBooks — needs extended timeout
export const maxDuration = 60

// GET - Get QuickBooks integration status for a company
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = request.nextUrl.searchParams.get('companyId')
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Check if QuickBooks is configured
    if (!isQuickBooksConfigured()) {
      return NextResponse.json({
        configured: false,
        connected: false,
        message: 'QuickBooks integration is not configured',
      })
    }

    // Get integration status
    const integration = await prisma.integration.findFirst({
      where: {
        companyId,
        provider: 'QUICKBOOKS_ONLINE',
        disconnectedAt: null,
      },
      select: {
        id: true,
        providerCompanyName: true,
        autoSyncEnabled: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        lastSyncError: true,
        connectedAt: true,
      },
    })

    return NextResponse.json({
      configured: true,
      connected: !!integration,
      integration: integration || null,
    })
  } catch (error) {
    // SECURITY FIX (PROD-091 #6): Only log the error message, not the full object
    // which may contain DB query details or integration tokens.
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[QuickBooks] Error getting status:', errorMessage)
    return NextResponse.json({ error: 'Failed to get integration status' }, { status: 500 })
  }
}

const postSchema = z.object({
  action: z.enum(['connect', 'sync', 'cancel-sync']),
  companyId: z.string().cuid('Invalid company ID format'),
})

// POST - Start QuickBooks OAuth flow or trigger sync
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const validation = await validateRequestBody(request, postSchema)
    if (!validation.success) return validation.error
    const { action, companyId } = validation.data

    // Verify user has access to this company
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        workspaces: {
          include: {
            workspace: {
              include: {
                companies: {
                  where: { id: companyId },
                },
              },
            },
          },
        },
      },
    })

    const hasAccess = dbUser?.workspaces.some(
      (wm) => wm.workspace.companies.length > 0
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (action === 'connect') {
      // Start OAuth flow
      if (!isQuickBooksConfigured()) {
        return NextResponse.json({ error: 'QuickBooks not configured' }, { status: 400 })
      }

      // SECURITY: Create HMAC-signed state to prevent tampering
      // This prevents attackers from modifying companyId to link QuickBooks to unauthorized companies
      const state = createSignedOAuthState({ companyId })
      const authUrl = getAuthorizationUrl(state)

      return NextResponse.json({ authUrl })
    }

    if (action === 'sync') {
      // Trigger manual sync
      const integration = await prisma.integration.findFirst({
        where: {
          companyId,
          provider: 'QUICKBOOKS_ONLINE',
          disconnectedAt: null,
        },
      })

      if (!integration) {
        return NextResponse.json({ error: 'QuickBooks not connected' }, { status: 400 })
      }

      // Run sync
      const result = await syncQuickBooksData(integration.id, 'manual')

      if (result.success) {
        return NextResponse.json({
          success: true,
          periodsCreated: result.periodsCreated,
          periodsUpdated: result.periodsUpdated,
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.error,
        }, { status: 500 })
      }
    }

    if (action === 'cancel-sync') {
      // Reset stuck sync or failed status
      await prisma.integration.updateMany({
        where: {
          companyId,
          provider: 'QUICKBOOKS_ONLINE',
          lastSyncStatus: { in: ['SYNCING', 'FAILED'] },
        },
        data: {
          lastSyncStatus: 'IDLE',
          lastSyncError: null,
        },
      })
      return NextResponse.json({ success: true })
    }

    // This shouldn't be reached due to Zod validation
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    // SECURITY FIX (PROD-091 #6): Only log the error message, not the full object
    // which may contain financial data from QuickBooks sync operations.
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[QuickBooks] Error in POST:', errorMsg)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}

// DELETE - Disconnect QuickBooks integration
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = request.nextUrl.searchParams.get('companyId')
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Find the active integration to revoke its tokens
    const integration = await prisma.integration.findFirst({
      where: {
        companyId,
        provider: 'QUICKBOOKS_ONLINE',
        disconnectedAt: null,
      },
    })

    if (integration?.refreshToken) {
      // Revoke token at Intuit before disconnecting
      try {
        const refreshToken = isEncrypted(integration.refreshToken)
          ? decryptToken(integration.refreshToken)
          : integration.refreshToken
        await revokeTokens(refreshToken)
      } catch (e) {
        // Log but don't block disconnect if revocation fails
        // SECURITY FIX (PROD-091 #6): Only log the error message — the full error
        // object from Intuit's revocation endpoint may contain token fragments.
        const revokeErrMsg = e instanceof Error ? e.message : 'Unknown error'
        console.error('[QuickBooks] Failed to revoke token:', revokeErrMsg)
      }
    }

    // Mark as disconnected and clear tokens from DB
    await prisma.integration.updateMany({
      where: {
        companyId,
        provider: 'QUICKBOOKS_ONLINE',
        disconnectedAt: null,
      },
      data: {
        disconnectedAt: new Date(),
        accessToken: '',
        refreshToken: '',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // SECURITY FIX (PROD-091 #6): Only log the error message, not the full object.
    const disconnectErrMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[QuickBooks] Error disconnecting:', disconnectErrMsg)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
