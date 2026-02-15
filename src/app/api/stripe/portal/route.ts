import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user's workspace
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: {
        workspaces: {
          select: {
            workspace: {
              select: {
                id: true,
                stripeCustomerId: true,
              }
            }
          }
        }
      }
    })

    if (!dbUser || !dbUser.workspaces[0]) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const workspace = dbUser.workspaces[0].workspace

    if (!workspace.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Subscribe to a plan first.' },
        { status: 400 }
      )
    }

    const origin = request.headers.get('origin') || 'https://app.exitosx.com'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeCustomerId,
      return_url: `${origin}/dashboard/settings?tab=billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Error creating portal session:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
}
