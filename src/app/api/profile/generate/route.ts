import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBusinessProfile } from '@/lib/ai/profile'
import { prisma } from '@/lib/prisma'
import type { ClarifyingQuestion } from '@/lib/ai/types'

export async function POST(request: Request) {
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
    const {
      businessDescription,
      industry,
      revenueRange,
      answers,
      questions
    } = body as {
      businessDescription: string
      industry?: string
      revenueRange?: string
      answers: Record<string, string>
      questions: ClarifyingQuestion[]
    }

    if (!businessDescription) {
      return NextResponse.json(
        { error: 'Business description is required' },
        { status: 400 }
      )
    }

    const { data, usage } = await generateBusinessProfile(
      businessDescription,
      industry || '',
      revenueRange || '',
      answers,
      questions
    )

    // Log AI usage (non-blocking)
    prisma.aIGenerationLog.create({
      data: {
        generationType: 'business_profile',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        modelUsed: 'claude-sonnet',
        inputData: { businessDescription: businessDescription.substring(0, 500), industry, revenueRange },
        outputData: JSON.parse(JSON.stringify(data)),
      }
    }).catch(err => console.error('Failed to log AI usage:', err))

    return NextResponse.json({ profile: data })
  } catch (error) {
    console.error('Error generating business profile:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate profile', details: message },
      { status: 500 }
    )
  }
}
