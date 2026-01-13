import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const questions = await prisma.question.findMany({
      where: { isActive: true },
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
