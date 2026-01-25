import { NextResponse } from 'next/server'
import { requireSuperAdmin, isAdminError, endImpersonation } from '@/lib/admin'

export async function POST() {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const endResult = await endImpersonation(result.admin)

  if (!endResult.success) {
    return NextResponse.json(
      { error: 'Failed', message: endResult.error },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true })
}
