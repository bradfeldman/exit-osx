import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// POST - Cancel a deletion request
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
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    })

    if (!deletionRequest) {
      return NextResponse.json(
        { error: 'No active deletion request found' },
        { status: 404 }
      )
    }

    // Cancel the deletion request
    const updatedRequest = await prisma.dataDeletionRequest.update({
      where: { id: deletionRequest.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        cancelledAt: true,
      },
    })

    return NextResponse.json({
      message: 'Deletion request cancelled successfully.',
      deletionRequest: updatedRequest,
    })
  } catch (error) {
    console.error('Error cancelling deletion request:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to cancel deletion request' },
      { status: 500 }
    )
  }
}
