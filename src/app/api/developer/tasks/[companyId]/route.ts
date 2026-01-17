import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import type { Prisma } from '@prisma/client'

// GET - Fetch all tasks for a company with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    // Get company name
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true }
    })

    if (!company) {
      return NextResponse.json({ message: 'Company not found' }, { status: 404 })
    }

    // Build filter - use type assertion for enum fields
    const where: Prisma.TaskWhereInput = { companyId }

    if (status && status !== 'ALL') {
      where.status = status as Prisma.TaskWhereInput['status']
    }
    if (category && category !== 'ALL') {
      where.briCategory = category as Prisma.TaskWhereInput['briCategory']
    }

    // Fetch tasks with related data including upgrade path
    const tasks = await prisma.task.findMany({
      where,
      include: {
        sprint: {
          select: {
            name: true
          }
        },
        upgradesFromOption: {
          select: {
            id: true,
            optionText: true,
            scoreValue: true
          }
        },
        upgradesToOption: {
          select: {
            id: true,
            optionText: true,
            scoreValue: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { normalizedValue: 'desc' }
      ]
    })

    // Fetch linked questions for tasks that have them with full details
    const questionIds = tasks
      .map(t => t.linkedQuestionId)
      .filter((id): id is string => id !== null)

    const questions = questionIds.length > 0
      ? await prisma.question.findMany({
          where: { id: { in: questionIds } },
          include: {
            options: {
              orderBy: { displayOrder: 'asc' },
              select: {
                id: true,
                optionText: true,
                scoreValue: true,
                displayOrder: true
              }
            }
          }
        })
      : []

    // Get the latest assessment for this company to find user's responses
    const latestAssessment = await prisma.assessment.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        responses: {
          select: {
            questionId: true,
            selectedOptionId: true
          }
        }
      }
    })

    // Map question ID to user's selected option ID
    const userResponseMap = new Map(
      latestAssessment?.responses.map(r => [r.questionId, r.selectedOptionId]) || []
    )

    // Build question details map with user's response
    const questionDetailsMap = new Map(questions.map(q => {
      const selectedOptionId = userResponseMap.get(q.id)
      const selectedOption = q.options.find(o => o.id === selectedOptionId)

      return [q.id, {
        questionText: q.questionText,
        helpText: q.helpText,
        category: q.briCategory,
        options: q.options.map(o => ({
          id: o.id,
          text: o.optionText,
          score: Number(o.scoreValue),
          isSelected: o.id === selectedOptionId
        })),
        selectedResponse: selectedOption ? {
          text: selectedOption.optionText,
          score: Number(selectedOption.scoreValue)
        } : null
      }]
    }))

    // Calculate summary stats
    const allTasks = await prisma.task.findMany({
      where: { companyId },
      select: { status: true, rawImpact: true }
    })

    const stats = {
      total: allTasks.length,
      pending: allTasks.filter(t => t.status === 'PENDING').length,
      inProgress: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: allTasks.filter(t => t.status === 'COMPLETED').length,
      deferred: allTasks.filter(t => t.status === 'DEFERRED').length,
      blocked: allTasks.filter(t => t.status === 'BLOCKED').length,
      cancelled: allTasks.filter(t => t.status === 'CANCELLED').length,
      totalValue: allTasks.reduce((sum, t) => sum + Number(t.rawImpact), 0),
      completedValue: allTasks
        .filter(t => t.status === 'COMPLETED')
        .reduce((sum, t) => sum + Number(t.rawImpact), 0),
      recoverableValue: allTasks
        .filter(t => !['COMPLETED', 'CANCELLED'].includes(t.status))
        .reduce((sum, t) => sum + Number(t.rawImpact), 0),
    }

    return NextResponse.json({
      company: { id: company.id, name: company.name },
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        actionType: t.actionType,
        briCategory: t.briCategory,
        rawImpact: Number(t.rawImpact),
        normalizedValue: Number(t.normalizedValue),
        effortLevel: t.effortLevel,
        complexity: t.complexity,
        estimatedHours: t.estimatedHours,
        deferredUntil: t.deferredUntil,
        completedAt: t.completedAt,
        linkedQuestionId: t.linkedQuestionId,
        linkedQuestionDetails: t.linkedQuestionId ? questionDetailsMap.get(t.linkedQuestionId) || null : null,
        upgradePath: t.upgradesFromOption && t.upgradesToOption ? {
          from: {
            id: t.upgradesFromOption.id,
            text: t.upgradesFromOption.optionText,
            score: Number(t.upgradesFromOption.scoreValue)
          },
          to: {
            id: t.upgradesToOption.id,
            text: t.upgradesToOption.optionText,
            score: Number(t.upgradesToOption.scoreValue)
          }
        } : null,
        sprintName: t.sprint?.name || null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      })),
      stats,
      filters: {
        status: status || 'ALL',
        category: category || 'ALL'
      }
    })
  } catch (error) {
    console.error('[TASK_ENGINE] Error fetching tasks:', error)
    return NextResponse.json(
      { message: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
