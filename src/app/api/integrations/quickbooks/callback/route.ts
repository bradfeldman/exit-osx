import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { exchangeCodeForTokens, getCompanyInfo } from '@/lib/integrations/quickbooks'
import { syncQuickBooksData } from '@/lib/integrations/quickbooks/sync'
import { verifySignedOAuthState } from '@/lib/security/oauth-state'
import { encryptToken } from '@/lib/security/token-encryption'

// GET - OAuth callback handler
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const realmId = searchParams.get('realmId')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      // User cancelled - just redirect back silently without showing an error
      if (error === 'access_denied') {
        return NextResponse.redirect(new URL('/dashboard/financials', request.url))
      }

      // SEC-083: Log details server-side but don't forward raw error_description to client
      const errorDescription = searchParams.get('error_description') || 'unknown'
      console.error('QuickBooks OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL('/dashboard/financials?qb_error=authorization_failed', request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/financials?qb_error=Missing authorization code', request.url)
      )
    }

    // SECURITY: Verify HMAC-signed state to prevent tampering attacks
    // This ensures the companyId hasn't been modified by an attacker
    const stateResult = verifySignedOAuthState(state)
    if (!stateResult.valid) {
      console.error('QuickBooks OAuth state validation failed:', stateResult.error)
      return NextResponse.redirect(
        new URL('/dashboard/financials?qb_error=Invalid or expired authorization', request.url)
      )
    }

    const companyId = stateResult.data.companyId
    if (!companyId) {
      return NextResponse.redirect(
        new URL('/dashboard/financials?qb_error=Invalid state parameter', request.url)
      )
    }

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
      return NextResponse.redirect(
        new URL('/dashboard/financials?qb_error=Access denied', request.url)
      )
    }

    // Exchange code for tokens
    const callbackUrl = request.url
    const tokens = await exchangeCodeForTokens(callbackUrl)

    // Check for existing integration
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        companyId,
        provider: 'QUICKBOOKS_ONLINE',
      },
    })

    let integration
    if (existingIntegration) {
      // Update existing integration (reconnect) — clear stale sync status
      integration = await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: {
          accessToken: encryptToken(tokens.accessToken),
          refreshToken: encryptToken(tokens.refreshToken),
          tokenExpiresAt: tokens.tokenExpiresAt,
          realmId: tokens.realmId || realmId,
          disconnectedAt: null,
          connectedAt: new Date(),
          lastSyncStatus: 'IDLE',
          lastSyncError: null,
          lastSyncAt: null,
        },
      })
    } else {
      // Create new integration
      integration = await prisma.integration.create({
        data: {
          companyId,
          provider: 'QUICKBOOKS_ONLINE',
          accessToken: encryptToken(tokens.accessToken),
          refreshToken: encryptToken(tokens.refreshToken),
          tokenExpiresAt: tokens.tokenExpiresAt,
          realmId: tokens.realmId || realmId,
        },
      })
    }

    // Get company name from QuickBooks and update
    try {
      const qbCompanyInfo = await getCompanyInfo(integration.id)
      await prisma.integration.update({
        where: { id: integration.id },
        data: { providerCompanyName: qbCompanyInfo.companyName },
      })
    } catch (e) {
      // SECURITY FIX (PROD-091 #6): Only log error message, not full object
      const companyInfoErrMsg = e instanceof Error ? e.message : 'Unknown error'
      console.error('[QuickBooks] Failed to get company info:', companyInfoErrMsg)
    }

    // Trigger initial sync as fire-and-forget (don't await)
    // Client-side will also poll for sync completion
    syncQuickBooksData(integration.id, 'initial').catch((err) => {
      // SECURITY FIX (PROD-091 #6): Only log error message, not full object
      const syncErrMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[QuickBooks] Background initial sync failed:', syncErrMsg)
    })

    // Redirect back to financials page with success flag
    return NextResponse.redirect(
      new URL('/dashboard/financials/statements?tab=pnl&qb_connected=true', request.url)
    )
  } catch (error) {
    // SECURITY FIX (PROD-091 #6): Only log error message, not full object
    // which may contain token data from the OAuth exchange.
    console.error('[QuickBooks] Callback error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.redirect(
      new URL('/dashboard/financials?qb_error=connection_failed', request.url)
    )
  }
}
