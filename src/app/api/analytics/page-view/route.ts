import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { trackProductEvent } from '@/lib/analytics/track-product-event'

export async function POST(request: NextRequest) {
  try {
    const { page } = await request.json()
    if (!page || typeof page !== 'string') {
      return NextResponse.json({ error: 'Invalid page' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { id: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    trackProductEvent({
      userId: dbUser.id,
      eventName: 'page_view',
      eventCategory: 'navigation',
      page,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
