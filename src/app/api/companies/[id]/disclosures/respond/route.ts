import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { createSignal } from '@/lib/signals/create-signal'
import type { BriCategory } from '@prisma/client'

interface ResponseInput {
  questionKey: string
  answer: boolean
  followUpAnswer?: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const result = await checkPermission('TASK_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { promptSetId, responses, isComplete } = body as {
      promptSetId: string
      responses: ResponseInput[]
      isComplete: boolean
    }

    if (!promptSetId || !responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'promptSetId and responses array are required' },
        { status: 400 }
      )
    }

    const promptSet = await prisma.disclosurePromptSet.findUnique({
      where: { id: promptSetId, companyId },
    })

    if (!promptSet) {
      return NextResponse.json(
        { error: 'Prompt set not found' },
        { status: 404 }
      )
    }

    const questions = promptSet.questions as Array<{
      key: string
      text: string
      briCategory: string
      followUpText: string
      signalType: 'positive' | 'negative'
    }>

    const signalsCreated: string[] = []

    for (const resp of responses) {
      const question = questions.find((q) => q.key === resp.questionKey)
      if (!question) continue

      const shouldCreateSignal = resp.answer === true

      // Save the response
      await prisma.disclosureResponse.create({
        data: {
          promptSetId,
          companyId,
          questionKey: resp.questionKey,
          questionText: question.text,
          briCategory: question.briCategory as BriCategory,
          answer: resp.answer,
          followUpAnswer: resp.followUpAnswer ?? null,
          signalCreated: shouldCreateSignal,
        },
      })

      // Create signal for "Yes" answers
      if (shouldCreateSignal) {
        const signal = await createSignal({
          companyId,
          channel: 'PROMPTED_DISCLOSURE',
          category: question.briCategory as BriCategory,
          eventType: `disclosure_${resp.questionKey}`,
          severity: question.signalType === 'negative' ? 'MEDIUM' : 'LOW',
          title: question.text,
          description: resp.followUpAnswer ?? undefined,
          rawData: {
            promptSetId,
            questionKey: resp.questionKey,
            questionText: question.text,
            followUpAnswer: resp.followUpAnswer,
          },
        })
        signalsCreated.push(signal.id)
      }
    }

    // Mark prompt set as completed if all done
    if (isComplete) {
      await prisma.disclosurePromptSet.update({
        where: { id: promptSetId },
        data: { completedAt: new Date() },
      })
    }

    return NextResponse.json({
      signalsCreated: signalsCreated.length,
      signalIds: signalsCreated,
      completed: isComplete,
    })
  } catch (error) {
    console.error('[Disclosures] Error processing responses:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to process disclosure responses' },
      { status: 500 }
    )
  }
}
