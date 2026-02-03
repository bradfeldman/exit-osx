import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTasks } from '@/lib/ai/diagnosis'
import { generateOnboardingTasks } from '@/lib/ai/onboarding-tasks'
import { prisma } from '@/lib/prisma'
import type { BusinessProfile, Subcategory, IdentifiedDriver } from '@/lib/ai/types'
import { DiagnosisSubcategory, BriCategory } from '@prisma/client'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()

    // Check if this is an onboarding task generation request (has riskResults)
    if (body.riskResults) {
      return handleOnboardingTaskGeneration(body)
    }

    // Otherwise, handle the subcategory-based task generation (original flow)
    const { companyId, subcategory, valueAtStake } = body as {
      companyId: string
      subcategory: Subcategory
      valueAtStake?: number
    }

    if (!companyId || !subcategory) {
      return NextResponse.json(
        { error: 'Company ID and subcategory are required' },
        { status: 400 }
      )
    }

    // Get company profile and diagnostic responses
    const [company, diagnosticResponses] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { businessProfile: true, annualRevenue: true }
      }),
      prisma.companyDiagnosticResponses.findFirst({
        where: {
          companyId,
          subcategory: subcategory as DiagnosisSubcategory,
        },
        orderBy: { createdAt: 'desc' }
      })
    ])

    if (!company || !company.businessProfile) {
      return NextResponse.json(
        { error: 'Company profile not found' },
        { status: 404 }
      )
    }

    if (!diagnosticResponses) {
      return NextResponse.json(
        { error: 'Diagnostic responses not found. Complete diagnosis first.' },
        { status: 400 }
      )
    }

    const profile = company.businessProfile as unknown as BusinessProfile
    const identifiedDrivers = diagnosticResponses.identifiedDrivers as unknown as IdentifiedDriver[]

    // Calculate value at stake (default to 5% of annual revenue if not provided)
    const revenue = company.annualRevenue?.toNumber() || 0
    const calculatedValueAtStake = valueAtStake || Math.round(revenue * 0.05)

    const { data, usage } = await generateTasks(
      profile,
      subcategory,
      identifiedDrivers,
      calculatedValueAtStake
    )

    // Log AI usage
    await prisma.aIGenerationLog.create({
      data: {
        companyId,
        generationType: 'tasks',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        modelUsed: 'claude-sonnet',
        inputData: { subcategory, drivers: identifiedDrivers.map(d => d.id) },
        outputData: JSON.parse(JSON.stringify(data)),
      }
    })

    // Get or create current week's progress
    const now = new Date()
    const weekNumber = Math.ceil(
      (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000
    )

    let weekProgress = await prisma.companyWeeklyProgress.findFirst({
      where: {
        companyId,
        weekNumber,
      }
    })

    if (!weekProgress) {
      weekProgress = await prisma.companyWeeklyProgress.create({
        data: {
          companyId,
          weekNumber,
          subcategory: subcategory as DiagnosisSubcategory,
          status: 'TASKS',
          tasksGeneratedAt: new Date(),
        }
      })
    } else {
      weekProgress = await prisma.companyWeeklyProgress.update({
        where: { id: weekProgress.id },
        data: {
          status: 'TASKS',
          tasksGeneratedAt: new Date(),
        }
      })
    }

    // Create task records
    const tasks = await Promise.all(
      data.tasks.map((task, index) =>
        prisma.companyOperationsTask.create({
          data: {
            companyId,
            subcategory: subcategory as DiagnosisSubcategory,
            weekNumber,
            displayOrder: index + 1,
            title: task.title,
            description: task.description,
            doneDefinition: task.doneDefinition,
            benchmarkTarget: task.benchmarkTarget,
            delegateTo: task.delegateTo,
            estimatedEffort: task.estimatedEffort,
            improvesDrivers: task.improvesDrivers,
            whyThisMatters: task.whyThisMatters,
            status: 'NOT_STARTED',
          }
        })
      )
    )

    return NextResponse.json({
      tasks,
      weekProgress,
    })
  } catch (error) {
    console.error('Error generating tasks:', error)
    return NextResponse.json(
      { error: 'Failed to generate tasks' },
      { status: 500 }
    )
  }
}

// Handle onboarding task generation based on risk results (not subcategory)
async function handleOnboardingTaskGeneration(body: {
  companyId: string
  riskResults: {
    briScore: number
    categoryScores: Record<string, number>
    valueGapByCategory: Record<string, number>
  }
  riskQuestionAnswers?: Record<string, string>
}) {
  const { companyId, riskResults, riskQuestionAnswers } = body

  if (!companyId) {
    return NextResponse.json(
      { error: 'Company ID is required' },
      { status: 400 }
    )
  }

  try {
    // Get company details
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        businessDescription: true,
        icbSubSector: true,
        annualRevenue: true,
      }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Generate tasks using AI based on risk results
    const { data, usage } = await generateOnboardingTasks(
      company.businessDescription || '',
      company.icbSubSector || '',
      riskResults,
      riskQuestionAnswers || {}
    )

    // Log AI usage (non-blocking)
    prisma.aIGenerationLog.create({
      data: {
        companyId,
        generationType: 'onboarding_tasks',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        modelUsed: 'claude-sonnet',
        inputData: {
          briScore: riskResults.briScore,
          categoryScores: riskResults.categoryScores,
        },
        outputData: JSON.parse(JSON.stringify(data)),
      }
    }).catch(err => console.error('Failed to log AI usage:', err))

    // Get or create current week's progress
    const now = new Date()
    const weekNumber = Math.ceil(
      (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000
    )

    // Map AI-generated category names to valid BriCategory enum values
    const normalizeBriCategory = (category: string): BriCategory => {
      const mapping: Record<string, BriCategory> = {
        'FINANCIAL': 'FINANCIAL',
        'TRANSFERABILITY': 'TRANSFERABILITY',
        'OPERATIONAL': 'OPERATIONAL',
        'OPERATIONS': 'OPERATIONAL', // AI sometimes returns this variant
        'MARKET': 'MARKET',
        'LEGAL_TAX': 'LEGAL_TAX',
        'LEGAL': 'LEGAL_TAX',
        'TAX': 'LEGAL_TAX',
        'PERSONAL': 'PERSONAL',
      }
      return mapping[category.toUpperCase()] || 'OPERATIONAL'
    }

    // Create task records in the database
    const tasksWithIds = await Promise.all(
      data.tasks.map(async (task, index) => {
        // Create as a general task (not tied to a specific diagnosis subcategory)
        const estimatedValue = task.estimatedValue ? Math.round(task.estimatedValue) : 0
        const briCategory = normalizeBriCategory(task.category)
        const createdTask = await prisma.task.create({
          data: {
            companyId,
            briCategory,
            title: task.title,
            description: task.description,
            actionType: 'TYPE_III_OPERATIONAL',
            rawImpact: estimatedValue,
            normalizedValue: estimatedValue,
            effortLevel: task.estimatedHours && task.estimatedHours <= 1 ? 'MINIMAL' : task.estimatedHours && task.estimatedHours <= 2 ? 'LOW' : 'MODERATE',
            complexity: 'SIMPLE',
            estimatedHours: task.estimatedHours || 2,
            sprintPriority: index === 0 ? 'BIG_ROCK' : index < 3 ? 'SAND' : 'WATER',
          }
        })

        return {
          id: createdTask.id,
          title: task.title,
          description: task.description,
          category: task.category,
          estimatedValue: task.estimatedValue || 0,
          estimatedHours: task.estimatedHours || 2,
        }
      })
    )

    return NextResponse.json({
      tasks: tasksWithIds,
    })
  } catch (error) {
    console.error('Error generating onboarding tasks:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate tasks'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
