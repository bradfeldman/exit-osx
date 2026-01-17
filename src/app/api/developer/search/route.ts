import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET - Search questions and answers by keywords
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const category = searchParams.get('category')

    if (!query || query.length < 2) {
      return NextResponse.json({
        questions: [],
        message: 'Search query must be at least 2 characters'
      })
    }

    // Search questions by text content
    const questions = await prisma.question.findMany({
      where: {
        isActive: true,
        AND: [
          category ? { briCategory: category as never } : {},
          {
            OR: [
              { questionText: { contains: query, mode: 'insensitive' } },
              { helpText: { contains: query, mode: 'insensitive' } },
              {
                options: {
                  some: {
                    optionText: { contains: query, mode: 'insensitive' }
                  }
                }
              }
            ]
          }
        ]
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
      take: 20, // Limit results
    })

    // Format results with match highlighting info
    const results = questions.map(q => {
      const matchingOptions = q.options.filter(opt =>
        opt.optionText.toLowerCase().includes(query.toLowerCase())
      )

      const questionMatches = q.questionText.toLowerCase().includes(query.toLowerCase())
      const helpTextMatches = q.helpText?.toLowerCase().includes(query.toLowerCase()) || false

      return {
        id: q.id,
        category: q.briCategory,
        questionText: q.questionText,
        helpText: q.helpText,
        displayOrder: q.displayOrder,
        maxImpactPoints: q.maxImpactPoints,
        matchType: questionMatches ? 'question' : helpTextMatches ? 'helpText' : 'answer',
        options: q.options.map(opt => ({
          id: opt.id,
          text: opt.optionText,
          score: opt.scoreValue,
          displayOrder: opt.displayOrder,
          matches: opt.optionText.toLowerCase().includes(query.toLowerCase())
        })),
        matchingOptionsCount: matchingOptions.length,
      }
    })

    return NextResponse.json({
      questions: results,
      totalCount: results.length,
      query,
    })
  } catch (error) {
    console.error('[TASK_ENGINE] Error searching questions:', error)
    return NextResponse.json(
      { message: 'Failed to search questions' },
      { status: 500 }
    )
  }
}
