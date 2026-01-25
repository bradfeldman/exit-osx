import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, isAdminError, startImpersonation } from '@/lib/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const { id } = await params
  const body = await request.json()
  const { reason } = body

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
