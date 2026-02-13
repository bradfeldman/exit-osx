import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { generateDisclosurePromptSet } from '@/lib/disclosures/generate-prompt'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const now = new Date()

    // Don't show disclosures for companies less than 7 days old
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { createdAt: true },
    })
    if (company) {
      const daysSinceCreation = (now.getTime() - new Date(company.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceCreation < 7) {
        return NextResponse.json({ promptSet: null })
      }
    }

    // Find active (non-expired, non-completed, non-skipped) prompt set
    let promptSet = await prisma.disclosurePromptSet.findFirst({
      where: {
        companyId,
        completedAt: null,
        skippedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { scheduledFor: 'desc' },
      include: {
        responses: {
          select: {
            questionKey: true,
            answer: true,
            followUpAnswer: true,
          },
        },
      },
    })

    // If none exists, check if 30+ days since last and auto-generate
    if (!promptSet) {
      const lastSet = await prisma.disclosurePromptSet.findFirst({
        where: { companyId },
        orderBy: { scheduledFor: 'desc' },
        select: { scheduledFor: true },
      })

      const daysSinceLast = lastSet
        ? (now.getTime() - lastSet.scheduledFor.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity

      if (daysSinceLast >= 30) {
        const newSet = await generateDisclosurePromptSet(companyId)
        if (newSet) {
          promptSet = {
            ...newSet,
            responses: [],
          }
        }
      }
    }

    if (!promptSet) {
      return NextResponse.json({ promptSet: null })
    }

    return NextResponse.json({ promptSet })
  } catch (error) {
    console.error('[Disclosures] Error fetching current prompt:', error)
    return NextResponse.json(
      { error: 'Failed to fetch disclosure prompt' },
      { status: 500 }
    )
  }
}
