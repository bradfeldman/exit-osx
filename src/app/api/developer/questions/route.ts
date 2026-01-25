import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { requireDevEndpoint, logDevEndpointAccess } from '@/lib/security'

// POST - Create a new question with options
export async function POST(request: NextRequest) {
  // SECURITY: Block developer endpoints in production
  const devCheck = requireDevEndpoint()
  if (devCheck) return devCheck

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    logDevEndpointAccess('POST /api/developer/questions', user.id)

    const body = await request.json()
    const {
      category,
      subCategory,
      questionText,
      helpText,
      buyerLogic,
      answers,
    } = body

    // Validate required fields (2-5 answers allowed)
    if (!category || !questionText || !buyerLogic || !answers || answers.length < 2 || answers.length > 5) {
      return NextResponse.json(
        { message: 'Missing required fields: category, questionText, buyerLogic, and 2-5 answers are required' },
        { status: 400 }
      )
    }

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
    console.error('[TASK_ENGINE] Error creating question:', error)
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
    console.error('[TASK_ENGINE] Error listing questions:', error)
    return NextResponse.json(
      { message: 'Failed to list questions' },
      { status: 500 }
    )
  }
}
