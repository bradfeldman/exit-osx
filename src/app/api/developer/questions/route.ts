import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { requireDevEndpoint, logDevEndpointAccess } from '@/lib/security'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const postQuestionSchema = z.object({
  category: z.string().max(100),
  subCategory: z.string().max(100).optional().nullable(),
  questionText: z.string().min(1).max(500),
  helpText: z.string().max(1000).optional().nullable(),
  buyerLogic: z.string().max(500),
  answers: z.array(
    z.object({
      text: z.string().max(500),
      riskLevel: z.string().max(50),
      score: z.string().max(20),
      buyerInterpretation: z.string().max(1000),
    })
  ).min(2).max(5),
})

// POST - Create a new question with options
export async function POST(request: NextRequest) {
  // SECURITY: Block developer endpoints in production
  const devCheck = requireDevEndpoint()
  if (devCheck) return devCheck

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  logDevEndpointAccess('POST /api/developer/questions', user.id)

  const validation = await validateRequestBody(request, postQuestionSchema)
  if (!validation.success) return validation.error
  const { category, subCategory, questionText, helpText, buyerLogic, answers } = validation.data

  try {

    // Get the max display order for this category
    const maxOrderResult = await prisma.question.aggregate({
      where: { briCategory: category },
      _max: { displayOrder: true },
    })
    const nextDisplayOrder = (maxOrderResult._max.displayOrder || 0) + 1

    // Default max impact points (equal weighting within category)
    const maxImpactPoints = 0.25

    // Create the question with options in a transaction
    const question = await prisma.question.create({
      data: {
        briCategory: category,
        questionText,
        helpText: helpText || null,
        buyerLogic: buyerLogic ? buyerLogic.slice(0, 200) : null,
        displayOrder: nextDisplayOrder,
        maxImpactPoints,
        isActive: true,
        options: {
          create: answers.map((answer: {
            text: string
            riskLevel: string
            score: string
            buyerInterpretation: string
          }, index: number) => ({
            optionText: answer.text,
            scoreValue: parseFloat(answer.score),
            displayOrder: index + 1,
          })),
        },
      },
      include: {
        options: true,
      },
    })

    // Log the creation for audit
    console.log(`[TASK_ENGINE] Question created by ${user.id}:`, {
      questionId: question.id,
      category,
      subCategory,
      questionText: questionText.substring(0, 50) + '...',
      optionCount: question.options.length,
      buyerLogic: buyerLogic.substring(0, 50) + '...',
    })

    return NextResponse.json({
      success: true,
      question: {
        id: question.id,
        category,
        subCategory,
        questionText,
        optionCount: question.options.length,
      },
    })
  } catch (error) {
    console.error('[TASK_ENGINE] Error creating question:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { message: 'Failed to create question' },
      { status: 500 }
    )
  }
}

// GET - List all questions (for reference when mapping tasks)
export async function GET(request: NextRequest) {
  // SECURITY: Block developer endpoints in production
  const devCheck = requireDevEndpoint()
  if (devCheck) return devCheck

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    logDevEndpointAccess('GET /api/developer/questions', user.id)

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const questions = await prisma.question.findMany({
      where: {
        isActive: true,
        ...(category ? { briCategory: category as never } : {}),
      },
      include: {
        options: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: [
        { briCategory: 'asc' },
        { displayOrder: 'asc' },
      ],
    })

    // Group by category
    const grouped = questions.reduce((acc, q) => {
      if (!acc[q.briCategory]) {
        acc[q.briCategory] = []
      }
      acc[q.briCategory].push(q)
      return acc
    }, {} as Record<string, typeof questions>)

    return NextResponse.json({
      questions: grouped,
      totalCount: questions.length,
    })
  } catch (error) {
    console.error('[TASK_ENGINE] Error listing questions:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { message: 'Failed to list questions' },
      { status: 500 }
    )
  }
}
