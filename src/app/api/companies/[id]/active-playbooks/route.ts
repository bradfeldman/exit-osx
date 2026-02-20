/**
 * GET /api/companies/[id]/active-playbooks
 *
 * Returns in-progress playbooks for the ActivePlaybooksRow on the dashboard.
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

  const activePlaybooks = await prisma.companyPlaybook.findMany({
    where: {
      companyId,
      status: 'IN_PROGRESS',
    },
    include: {
      playbook: { select: { title: true, category: true, slug: true } },
    },
    orderBy: { lastActivityAt: 'desc' },
    take: 10,
  })

  const playbooks = activePlaybooks.map(cp => ({
    id: cp.playbook.slug,
    title: cp.playbook.title,
    percentComplete: Math.round(cp.percentComplete),
    category: cp.playbook.category,
  }))

  return NextResponse.json({ playbooks })
}
