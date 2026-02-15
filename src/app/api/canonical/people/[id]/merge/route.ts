import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { mergePeople } from '@/lib/contact-system/identity-resolution'

/**
 * POST /api/canonical/people/[id]/merge
 * Merge other people into this one (this becomes the surviving record)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: primaryId } = await params
  // SECURITY FIX (SEC-032): Merge is a destructive admin operation
  const result = await checkPermission('ORG_MANAGE_MEMBERS')
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { duplicateIds } = body

    if (!duplicateIds || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return NextResponse.json(
        { error: 'duplicateIds array is required' },
        { status: 400 }
      )
    }

    if (duplicateIds.includes(primaryId)) {
      return NextResponse.json(
        { error: 'Cannot merge a person into themselves' },
        { status: 400 }
      )
    }

    const mergeResult = await mergePeople(
      primaryId,
      duplicateIds,
      result.auth.user.id
    )

    return NextResponse.json({
      success: true,
      ...mergeResult,
      message: `Successfully merged ${duplicateIds.length} person record(s) into the primary record`,
    })
  } catch (error) {
    console.error('Error merging people:', error instanceof Error ? error.message : String(error))

    if (error instanceof Error && error.message.includes('not found or already merged')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
