import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { analyzeEbitdaBridge } from '@/lib/ai/ebitda-bridge'
import { applyUserRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'
import { prisma } from '@/lib/prisma'

export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error

    // SEC-034: Rate limit AI endpoints
    const rl = await applyUserRateLimit(request, result.auth.user.id, RATE_LIMIT_CONFIGS.AI)
    if (!rl.success) return createRateLimitResponse(rl)

    // Pre-validate: company must have revenue and EBITDA data
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { annualRevenue: true, annualEbitda: true },
    })
    if (!company || (Number(company.annualRevenue) === 0 && Number(company.annualEbitda) === 0)) {
      return NextResponse.json(
        { error: 'Enter revenue and EBITDA data before running AI analysis.' },
        { status: 422 }
      )
    }

    const analysis = await analyzeEbitdaBridge(companyId)

    return NextResponse.json({ analysis })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error generating EBITDA bridge analysis:', message)

    // Surface actionable messages for known failure modes
    if (message.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service is not configured. Please contact support.' },
        { status: 503 }
      )
    }
    if (message.includes('No JSON found')) {
      return NextResponse.json(
        { error: 'AI returned an unexpected response. Please try again.' },
        { status: 502 }
      )
    }
    if (message.includes('truncated')) {
      return NextResponse.json(
        { error: 'AI response was too long. Please try again.' },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    )
  }
}
