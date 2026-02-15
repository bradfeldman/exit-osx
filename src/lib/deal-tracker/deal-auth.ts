import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError, type AuthContext } from '@/lib/auth/check-permission'
import type { Permission } from '@/lib/auth/permissions'

interface DealAuthSuccess {
  companyId: string
  auth: AuthContext
}

/**
 * Authorize access to a deal by loading it and verifying company-level permission.
 * Returns the companyId and auth context on success, or a NextResponse error.
 *
 * Usage:
 *   const authResult = await authorizeDealAccess(dealId, 'COMPANY_VIEW')
 *   if (authResult instanceof NextResponse) return authResult
 *   const { companyId, auth } = authResult
 */
export async function authorizeDealAccess(
  dealId: string,
  permission: Permission
): Promise<DealAuthSuccess | NextResponse> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { companyId: true },
  })

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  const result = await checkPermission(permission, deal.companyId)
  if (isAuthError(result)) return result.error

  return { companyId: deal.companyId, auth: result.auth }
}
