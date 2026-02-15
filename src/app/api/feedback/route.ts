import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

function generateTicketNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `TKT-${year}${month}-${random}`
}

const VALID_CATEGORIES = ['bug', 'feature', 'improvement', 'other'] as const

const postSchema = z.object({
  category: z.enum(VALID_CATEGORIES).default('other'),
  description: z.string().min(5, 'Description must be at least 5 characters').max(5000),
  currentPage: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = await validateRequestBody(request, postSchema)
  if (!validation.success) return validation.error
  const { category, description, currentPage } = validation.data

  try {

    // Look up the DB user
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { id: true, email: true, name: true },
    })

    const userEmail = dbUser?.email || user.email || 'unknown'
    const userName = dbUser?.name || 'User'
    const feedbackCategory = category

    // Build a descriptive subject line
    const categoryLabel = feedbackCategory === 'bug' ? 'Bug Report'
      : feedbackCategory === 'feature' ? 'Feature Request'
      : feedbackCategory === 'improvement' ? 'Improvement'
      : 'Feedback'

    const subject = `[Beta ${categoryLabel}] ${description.trim().slice(0, 80)}`

    // Map feedback categories to ticket priorities
    const priority = feedbackCategory === 'bug' ? 'high' : 'normal'

    // Create the support ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: generateTicketNumber(),
        userId: dbUser?.id,
        userEmail,
        subject,
        category: feedbackCategory,
        priority,
      },
    })

    // Add the initial message with full context
    const messageContent = [
      description.trim(),
      '',
      '---',
      `Submitted by: ${userName} (${userEmail})`,
      `Category: ${categoryLabel}`,
      currentPage ? `Page: ${currentPage}` : null,
      `User Agent: ${(request.headers.get('user-agent') || 'unknown').slice(0, 150).replace(/[<>]/g, '')}`,
    ].filter(Boolean).join('\n')

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: dbUser?.id,
        authorEmail: userEmail,
        content: messageContent,
      },
    })

    return NextResponse.json(
      { success: true, ticketNumber: ticket.ticketNumber },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating feedback ticket:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
