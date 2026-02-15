import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { markAsRead } from '@/lib/alerts'

// POST - Mark a single alert as read
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: alertId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const success = await markAsRead(alertId, dbUser.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Alert not found or already read' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking alert as read:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to mark alert as read' },
      { status: 500 }
    )
  }
}
