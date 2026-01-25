import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import {
  isQuickBooksConfigured,
  getAuthorizationUrl,
  syncQuickBooksData,
} from '@/lib/integrations/quickbooks'
import { createSignedOAuthState } from '@/lib/security/oauth-state'

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
    console.error('Error getting QuickBooks status:', error)
    return NextResponse.json({ error: 'Failed to get integration status' }, { status: 500 })
  }
}

// POST - Start QuickBooks OAuth flow or trigger sync
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, companyId } = body

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in QuickBooks POST:', error)
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

    // Mark integration as disconnected (soft delete to preserve history)
    await prisma.integration.updateMany({
      where: {
        companyId,
        provider: 'QUICKBOOKS_ONLINE',
        disconnectedAt: null,
      },
      data: {
        disconnectedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting QuickBooks:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
