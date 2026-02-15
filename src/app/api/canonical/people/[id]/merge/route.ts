import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { mergePeople } from '@/lib/contact-system/identity-resolution'
import { validateRequestBody, uuidSchema } from '@/lib/security/validation'

const mergePeopleSchema = z.object({
  duplicateIds: z.array(uuidSchema).min(1).max(50),
})

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
    const validation = await validateRequestBody(request, mergePeopleSchema)
    if (!validation.success) return validation.error

    const { duplicateIds } = validation.data

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
