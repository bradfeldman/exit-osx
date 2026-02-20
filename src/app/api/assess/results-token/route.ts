import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyResultsToken } from '@/lib/email/assess-drip'

/**
 * GET /api/assess/results-token?token=xxx
 *
 * Verifies a signed results token from a drip email and returns
 * the lead's assessment data. No auth required (token is the auth).
 * Token expires after 7 days.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const leadId = verifyResultsToken(token)
  if (!leadId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  try {
    const lead = await prisma.assessmentLead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        email: true,
        briScore: true,
        currentValue: true,
        potentialValue: true,
        topRisk: true,
        convertedAt: true,
        createdAt: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({
      email: lead.email,
      briScore: lead.briScore,
      currentValue: lead.currentValue,
      potentialValue: lead.potentialValue,
      topRisk: lead.topRisk,
      converted: !!lead.convertedAt,
      createdAt: lead.createdAt.toISOString(),
    })
  } catch (err) {
    console.error(
      '[assess/results-token] Error:',
      err instanceof Error ? err.message : String(err)
    )
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
