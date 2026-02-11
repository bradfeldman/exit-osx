import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    let questions

    if (companyId) {
      // Fetch both company-specific AI questions and global seed questions
      const [aiQuestions, globalQuestions] = await Promise.all([
        prisma.question.findMany({
          where: { companyId, isActive: true },
          include: {
            options: { orderBy: { displayOrder: 'asc' } },
          },
          orderBy: [{ briCategory: 'asc' }, { displayOrder: 'asc' }],
        }),
        prisma.question.findMany({
          where: { companyId: null, isActive: true },
          include: {
            options: { orderBy: { displayOrder: 'asc' } },
          },
          orderBy: [{ briCategory: 'asc' }, { displayOrder: 'asc' }],
        }),
      ])

      // PROD-014: Include BOTH seed and AI questions. Seed (foundational) questions
      // are shown first within each category, followed by AI (adaptive) questions.
      // This enforces the Initial -> Adaptive flow ordering.
      questions = [...globalQuestions, ...aiQuestions]
    } else {
      // No companyId — return all global seed questions (backward compatible)
      questions = await prisma.question.findMany({
        where: { isActive: true, companyId: null },
        include: {
          options: { orderBy: { displayOrder: 'asc' } },
        },
        orderBy: [{ briCategory: 'asc' }, { displayOrder: 'asc' }],
      })
    }

    // PROD-014: Sort by category, then seed questions first (companyId === null),
    // then AI questions (companyId !== null), then by displayOrder within each group.
    questions.sort((a, b) => {
      if (a.briCategory !== b.briCategory) {
        return a.briCategory.localeCompare(b.briCategory)
      }
      // Seed questions (companyId === null) come before AI questions
      const aIsSeed = a.companyId === null ? 0 : 1
      const bIsSeed = b.companyId === null ? 0 : 1
      if (aIsSeed !== bIsSeed) return aIsSeed - bIsSeed
      return a.displayOrder - b.displayOrder
    })

    // Group questions by category
    const questionsByCategory = questions.reduce((acc, question) => {
      const category = question.briCategory
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(question)
      return acc
    }, {} as Record<string, typeof questions>)

    return NextResponse.json({
      questions,
      questionsByCategory,
      totalQuestions: questions.length,
    })
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}
