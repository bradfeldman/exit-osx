/**
 * GET /api/companies/[id]/playbook-boosts
 *
 * Returns BRI category boosts from completed playbooks.
 * Used by the Diagnosis page to show delta badges.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const completedPlaybooks = await prisma.companyPlaybook.findMany({
    where: {
      companyId,
      status: 'COMPLETED',
      briCategoryBoosted: { not: null },
      briBonusApplied: { not: null, gt: 0 },
    },
    include: {
      playbook: { select: { title: true } },
    },
  })

  const boosts = completedPlaybooks.map(cp => ({
    category: cp.briCategoryBoosted!,
    points: cp.briBonusApplied!,
    playbookTitle: cp.playbook.title,
    compositeScore: cp.compositeScore,
    completedAt: cp.completedAt,
  }))

  return NextResponse.json({ boosts })
}
