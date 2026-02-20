import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getAnthropicClient } from '@/lib/ai/anthropic'
import { buildCoachContext } from '@/lib/ai-coach/build-context'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const messageSchema = z.object({
  content: z.string().min(1).max(5000),
})

type RouteParams = { params: Promise<{ id: string; conversationId: string }> }

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  const { id: companyId, conversationId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const validation = await validateRequestBody(request, messageSchema)
  if (!validation.success) return validation.error
  const { content } = validation.data

  // Verify conversation belongs to company
  const conversation = await prisma.coachConversation.findFirst({
    where: { id: conversationId, companyId },
    select: { id: true, title: true },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // Plan check: Foundation gets 3 free messages total, Growth+ unlimited
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { workspace: { select: { planTier: true } } },
  })

  const isFoundation = company?.workspace?.planTier === 'FOUNDATION'

  if (isFoundation) {
    const totalMessages = await prisma.coachMessage.count({
      where: {
        conversation: { companyId },
        role: 'user',
      },
    })
    if (totalMessages >= 3) {
      return NextResponse.json(
        { error: 'Free message limit reached. Upgrade to Growth for unlimited AI coaching.' },
        { status: 403 }
      )
    }
  }

  // Rate limit: 20 messages/day per company
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

  // Save user message
  await prisma.coachMessage.create({
    data: {
      conversationId,
      role: 'user',
      content,
    },
  })

  // Build context and load message history
  const [coachContext, history] = await Promise.all([
    buildCoachContext(companyId),
    prisma.coachMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { role: true, content: true },
    }),
  ])

  const { systemPrompt, contextSources } = coachContext

  // Format messages for Claude
  const claudeMessages = history.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Stream response
  const encoder = new TextEncoder()
  const client = getAnthropicClient()
  const startTime = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullResponse = ''

        const response = client.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          temperature: 0.7,
          system: systemPrompt,
          messages: claudeMessages,
        })

        response.on('text', (text) => {
          fullResponse += text
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: text })}\n\n`))
        })

        const finalMessage = await response.finalMessage()
        const latencyMs = Date.now() - startTime

        // Save assistant message
        await prisma.coachMessage.create({
          data: {
            conversationId,
            role: 'assistant',
            content: fullResponse,
            contextSources,
          },
        })

        // Auto-title from first user message if still default
        if (conversation.title === 'New conversation') {
          const title = content.length > 50 ? content.slice(0, 47) + '...' : content
          prisma.coachConversation.update({
            where: { id: conversationId },
            data: { title },
          }).catch(() => {})
        }

        // Log to AIGenerationLog (non-blocking)
        prisma.aIGenerationLog.create({
          data: {
            companyId,
            generationType: 'ai_coach',
            inputData: { conversationId, messageCount: claudeMessages.length },
            outputData: { messageLength: fullResponse.length },
            modelUsed: 'claude-sonnet-4-20250514',
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
            latencyMs,
          },
        }).catch(err => console.error('[AICoach] Failed to log:', err instanceof Error ? err.message : String(err)))

        // Send final event with context sources
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, contextSources })}\n\n`))
        controller.close()
      } catch (error) {
        console.error('[AICoach] Stream error:', error instanceof Error ? error.message : String(error))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
