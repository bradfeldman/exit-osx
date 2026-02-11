// Temporary debug endpoint to check questions in database
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireDevEndpoint, logDevEndpointAccess } from '@/lib/security'

export async function GET() {
  // SECURITY: Block debug endpoints in production
  const devCheck = requireDevEndpoint()
  if (devCheck) return devCheck

  logDevEndpointAccess('GET /api/debug/questions')

  try {
    const projectQuestionsCount = await prisma.projectQuestion.count()

    let sample = null
    if (projectQuestionsCount > 0) {
      sample = await prisma.projectQuestion.findMany({
        take: 3,
        select: {
          moduleId: true,
          questionText: true,
          briCategory: true,
        }
      })
    }

    const initialQuestionsCount = await prisma.question.count()

    // Check a recent company's question priorities
    const recentCompany = await prisma.company.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true }
    })

    let companyInfo = null
    if (recentCompany) {
      const priorities = await prisma.companyQuestionPriority.count({
        where: { companyId: recentCompany.id }
      })
      const asked = await prisma.companyQuestionPriority.count({
        where: { companyId: recentCompany.id, hasBeenAsked: true }
      })
      companyInfo = {
        name: recentCompany.name,
        totalPriorities: priorities,
        questionsAsked: asked,
      }
    }

    return NextResponse.json({
      projectQuestionsCount,
      initialQuestionsCount,
      sampleProjectQuestions: sample,
      recentCompany: companyInfo,
    })
  } catch (error) {
    console.error('Error checking questions:', error)
    // SECURITY FIX (PROD-060): Removed String(error) to prevent leaking stack traces
    return NextResponse.json({ error: 'Failed to check questions' }, { status: 500 })
  }
}
