import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { exchangeCodeForTokens, syncQuickBooksData, getCompanyInfo } from '@/lib/integrations/quickbooks'

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
      const errorDescription = searchParams.get('error_description') || 'Authorization failed'
      console.error('QuickBooks OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/dashboard/financials/pnl?qb_error=${encodeURIComponent(errorDescription)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/financials/pnl?qb_error=Missing authorization code', request.url)
      )
    }

    // Decode state to get company ID
    let companyId: string
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      companyId = stateData.companyId
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/financials/pnl?qb_error=Invalid state parameter', request.url)
      )
    }

    // Verify user has access to this company
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        organizations: {
          include: {
            organization: {
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

    const hasAccess = dbUser?.organizations.some(
      (ou) => ou.organization.companies.length > 0
    )

    if (!hasAccess) {
      return NextResponse.redirect(
        new URL('/dashboard/financials/pnl?qb_error=Access denied', request.url)
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
      // Update existing integration (reconnect)
      integration = await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.tokenExpiresAt,
          realmId: tokens.realmId || realmId,
          disconnectedAt: null,
          connectedAt: new Date(),
        },
      })
    } else {
      // Create new integration
      integration = await prisma.integration.create({
        data: {
          companyId,
          provider: 'QUICKBOOKS_ONLINE',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
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
      console.error('Failed to get QuickBooks company info:', e)
    }

    // Trigger initial sync in background
    syncQuickBooksData(integration.id, 'initial').catch((e) => {
      console.error('Background sync failed:', e)
    })

    // Redirect back to financials page with success message
    return NextResponse.redirect(
      new URL('/dashboard/financials/pnl?qb_connected=true', request.url)
    )
  } catch (error) {
    console.error('QuickBooks callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(`/dashboard/financials/pnl?qb_error=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }
}
