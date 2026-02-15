import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// POST - Confirm a deletion request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { token } = await params

    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the deletion request
    const deletionRequest = await prisma.dataDeletionRequest.findFirst({
      where: {
        confirmationToken: token,
        userId: dbUser.id,
        status: 'PENDING',
      },
    })

    if (!deletionRequest) {
      return NextResponse.json(
        { error: 'Invalid or expired confirmation token' },
        { status: 404 }
      )
    }

    // Confirm the deletion request
    const updatedRequest = await prisma.dataDeletionRequest.update({
      where: { id: deletionRequest.id },
      data: {
        confirmedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        confirmedAt: true,
        scheduledFor: true,
      },
    })

    return NextResponse.json({
      message: 'Deletion request confirmed. Your account will be deleted on the scheduled date.',
      deletionRequest: updatedRequest,
    })
  } catch (error) {
    console.error('Error confirming deletion request:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to confirm deletion request' },
      { status: 500 }
    )
  }
}
