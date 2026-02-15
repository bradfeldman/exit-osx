import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { mergeCompanies } from '@/lib/contact-system/identity-resolution'
import { validateRequestBody, uuidSchema } from '@/lib/security/validation'

const mergeCompaniesSchema = z.object({
  duplicateIds: z.array(uuidSchema).min(1).max(50),
})

/**
 * POST /api/canonical/companies/[id]/merge
 * Merge other companies into this one (this becomes the surviving record)
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
    const validation = await validateRequestBody(request, mergeCompaniesSchema)
    if (!validation.success) return validation.error

    const { duplicateIds } = validation.data

    // Ensure primary ID is not in the duplicates list
    if (duplicateIds.includes(primaryId)) {
      return NextResponse.json(
        { error: 'Cannot merge a company into itself' },
        { status: 400 }
      )
    }

    // Perform the merge
    const mergeResult = await mergeCompanies(
      primaryId,
      duplicateIds,
      result.auth.user.id
    )

    return NextResponse.json({
      success: true,
      ...mergeResult,
      message: `Successfully merged ${duplicateIds.length} company record(s) into the primary record`,
    })
  } catch (error) {
    console.error('Error merging companies:', error instanceof Error ? error.message : String(error))

    if (error instanceof Error && error.message.includes('not found or already merged')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
