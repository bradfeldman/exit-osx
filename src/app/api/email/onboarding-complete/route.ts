import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendOnboardingCompleteEmail } from '@/lib/email/send-onboarding-complete-email'
import { prisma } from '@/lib/prisma'
import { generateReportToken } from '@/lib/report-token'
import { z } from 'zod'
import { validateRequestBody, uuidSchema, financialAmount } from '@/lib/security/validation'

const postSchema = z.object({
  companyId: uuidSchema,
  currentValue: financialAmount.optional(),
  potentialValue: financialAmount.optional(),
  valueGap: financialAmount.optional(),
  briScore: z.coerce.number().finite().min(0).max(100).optional(),
  topRisks: z.array(z.object({
    category: z.string().max(100),
    label: z.string().max(200),
    score: z.coerce.number().finite().min(0).max(100),
  })).max(10).optional(),
  topTask: z.object({
    title: z.string().max(500),
    category: z.string().max(100),
    estimatedImpact: z.coerce.number().finite(),
  }).optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const validation = await validateRequestBody(request, postSchema)
    if (!validation.success) return validation.error
    const { companyId, currentValue, potentialValue, valueGap, briScore, topRisks, topTask } = validation.data

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

    // Generate shareable report token (BF-025)
    const reportToken = generateReportToken(companyId)

    // Send the email
    const result = await sendOnboardingCompleteEmail({
      email: user.email!,
      name: user.user_metadata?.full_name as string | undefined,
      companyName: company.name,
      companyId,
      currentValue: currentValue || 0,
      potentialValue: potentialValue || 0,
      valueGap: valueGap || 0,
      briScore: briScore || 0,
      topRisk,
      topTask: topTask || null,
      reportToken,
    })

    if (!result.success) {
      console.error('[API] Failed to send onboarding email:', result.error)
      // Don't fail the request - email is non-critical
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error in onboarding-complete email:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
