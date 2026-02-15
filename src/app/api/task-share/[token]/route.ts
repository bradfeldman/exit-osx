import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTaskShareToken } from '@/lib/task-share-token'
import {
  applyRateLimit,
  RATE_LIMIT_CONFIGS,
  createRateLimitResponse,
} from '@/lib/security/rate-limit'
import { z } from 'zod'
import { validateRequestBody, uuidSchema } from '@/lib/security/validation'

/**
 * GET /api/task-share/[token]
 * Public endpoint: view a shared task (no auth required)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const taskId = verifyTaskShareToken(token)

  if (!taskId) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      richDescription: true,
      briCategory: true,
      status: true,
      effortLevel: true,
      normalizedValue: true,
      completedAt: true,
      dueDate: true,
      buyerConsequence: true,
      subSteps: {
        select: { id: true, title: true, order: true, completed: true },
        orderBy: { order: 'asc' },
      },
      company: {
        select: { name: true },
      },
    },
  })

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  return NextResponse.json({
    task: {
      ...task,
      companyName: task.company.name,
      normalizedValue: task.normalizedValue ? Number(task.normalizedValue) : null,
    },
  })
}

const postSchema = z.object({
  completionNotes: z.string().max(5000).optional(),
  subStepId: uuidSchema.optional(),
})

/**
 * POST /api/task-share/[token]
 * Public endpoint: mark a shared task as complete (no auth required)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // SECURITY: Rate limit public write endpoint to prevent abuse
  const rateLimitResult = await applyRateLimit(request, RATE_LIMIT_CONFIGS.TOKEN)
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult)
  }

  const { token } = await params
  const taskId = verifyTaskShareToken(token)

  if (!taskId) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
  }

  const validation = await validateRequestBody(request, postSchema)
  if (!validation.success) return validation.error
  const { completionNotes, subStepId } = validation.data

  // Toggle a sub-step
  if (subStepId) {
    const subStep = await prisma.taskSubStep.findFirst({
      where: { id: subStepId, taskId },
    })
    if (!subStep) {
      return NextResponse.json({ error: 'Sub-step not found' }, { status: 404 })
    }

    await prisma.taskSubStep.update({
      where: { id: subStepId },
      data: {
        completed: !subStep.completed,
        completedAt: !subStep.completed ? new Date() : null,
      },
    })

    return NextResponse.json({ success: true })
  }

  // Complete the task
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { status: true },
  })

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  if (task.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Task already completed' }, { status: 400 })
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      completionNotes: completionNotes || 'Completed via shared link',
    },
  })

  return NextResponse.json({ success: true })
}
