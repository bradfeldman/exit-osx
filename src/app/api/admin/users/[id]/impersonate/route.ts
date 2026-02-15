import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, isAdminError, startImpersonation } from '@/lib/admin'
import { validateRequestBody, shortText } from '@/lib/security/validation'

const impersonateSchema = z.object({
  reason: shortText.optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const { id } = await params

  const validation = await validateRequestBody(request, impersonateSchema)
  if (!validation.success) return validation.error
  const { reason } = validation.data

  const impersonationResult = await startImpersonation(result.admin, id, reason)

  if (!impersonationResult.success) {
    return NextResponse.json(
      { error: 'Failed', message: impersonationResult.error },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    session: impersonationResult.session,
  })
}
