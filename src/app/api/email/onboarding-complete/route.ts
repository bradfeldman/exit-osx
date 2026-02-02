import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendOnboardingCompleteEmail } from '@/lib/email/send-onboarding-complete-email'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, currentValue, potentialValue, valueGap, briScore, topRisks, topTask } = body

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Get company details
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get the top risk (lowest score)
    const topRisk = topRisks && topRisks.length > 0
      ? topRisks[0]
      : { category: 'OPERATIONAL', label: 'Operations', score: 50 }

    // Send the email
    const result = await sendOnboardingCompleteEmail({
      email: user.email!,
      name: user.user_metadata?.full_name as string | undefined,
      companyName: company.name,
      currentValue: currentValue || 0,
      potentialValue: potentialValue || 0,
      valueGap: valueGap || 0,
      briScore: briScore || 0,
      topRisk,
      topTask: topTask || null,
    })

    if (!result.success) {
      console.error('[API] Failed to send onboarding email:', result.error)
      // Don't fail the request - email is non-critical
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error in onboarding-complete email:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
