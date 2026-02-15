import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getAnthropicClient } from '@/lib/ai/anthropic'
import { buildCoachContext } from '@/lib/ai-coach/build-context'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const schema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(5000),
  })).min(1).max(20),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const validation = await validateRequestBody(request, schema)
  if (!validation.success) return validation.error
  const { messages } = validation.data

  // Rate limit: max 20 messages/day per company
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentCount = await prisma.aIGenerationLog.count({
    where: {
      companyId,
      generationType: 'ai_coach',
      createdAt: { gte: twentyFourHoursAgo },
    },
  })

  if (recentCount >= 20) {
    return NextResponse.json(
      { error: 'Daily limit reached. You can send up to 20 messages per day.' },
      { status: 429 }
    )
  }

  try {
    const systemPrompt = await buildCoachContext(companyId)
    const client = getAnthropicClient()

    // Only send last 10 messages to keep context manageable
    const recentMessages = messages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const startTime = Date.now()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: recentMessages,
    })
    const latencyMs = Date.now() - startTime

    const textContent = response.content.find(c => c.type === 'text')
    const message = textContent?.type === 'text' ? textContent.text : 'I wasn\'t able to generate a response. Please try again.'

    // Log to AIGenerationLog (non-blocking)
    prisma.aIGenerationLog.create({
      data: {
        companyId,
        generationType: 'ai_coach',
        inputData: { messageCount: messages.length },
        outputData: { messageLength: message.length },
        modelUsed: 'claude-sonnet-4-20250514',
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs,
      },
    }).catch(err => console.error('[AICoach] Failed to log:', err instanceof Error ? err.message : String(err)))

    return NextResponse.json({ message })
  } catch (error) {
    console.error('[AICoach] Error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}
