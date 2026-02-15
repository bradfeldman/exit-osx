import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDiagnosticQuestions } from '@/lib/ai/diagnosis'
import { prisma } from '@/lib/prisma'
import type { BusinessProfile, Subcategory } from '@/lib/ai/types'
import { DiagnosisSubcategory } from '@prisma/client'
import { applyRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'

export async function POST(request: Request) {
  // SEC-034: Rate limit AI endpoints
  const rl = await applyRateLimit(request, RATE_LIMIT_CONFIGS.AI)
  if (!rl.success) return createRateLimitResponse(rl)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { companyId, subcategory, initialAnswer, initialScore } = body as {
      companyId: string
      subcategory: Subcategory
      initialAnswer: string
      initialScore: number
    }

    if (!companyId || !subcategory) {
      return NextResponse.json(
        { error: 'Company ID and subcategory are required' },
        { status: 400 }
      )
    }

    // Get company and profile
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { businessProfile: true, name: true }
    })

    if (!company || !company.businessProfile) {
      return NextResponse.json(
        { error: 'Company profile not found' },
        { status: 404 }
      )
    }

    const profile = company.businessProfile as unknown as BusinessProfile

    const { data, usage } = await generateDiagnosticQuestions(
      profile,
      subcategory,
      initialAnswer || 'Low score in this category',
      initialScore || 50
    )

    // Log AI usage
    await prisma.aIGenerationLog.create({
      data: {
        companyId,
        generationType: 'diagnostic_questions',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        modelUsed: 'claude-sonnet',
        inputData: { subcategory, initialAnswer },
        outputData: JSON.parse(JSON.stringify(data)),
      }
    })

    // Store questions in database
    const questionsJson = JSON.parse(JSON.stringify(data.questions))
    await prisma.companyDiagnosticQuestions.upsert({
      where: {
        companyId_subcategory: {
          companyId,
          subcategory: subcategory as DiagnosisSubcategory,
        }
      },
      create: {
        companyId,
        subcategory: subcategory as DiagnosisSubcategory,
        questions: questionsJson,
      },
      update: {
        questions: questionsJson,
      }
    })

    return NextResponse.json({ questions: data.questions })
  } catch (error) {
    console.error('Error generating diagnostic questions:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}
