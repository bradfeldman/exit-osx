import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTasks } from '@/lib/ai/diagnosis'
import { generateOnboardingTasks } from '@/lib/ai/onboarding-tasks'
import { prisma } from '@/lib/prisma'
import { applyRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'
import type { BusinessProfile, Subcategory, IdentifiedDriver } from '@/lib/ai/types'
import { DiagnosisSubcategory, BriCategory } from '@prisma/client'
import { calculateValuation } from '@/lib/valuation/calculate-valuation'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

// Default category weights for BRI calculation (must match improve-snapshot-for-task.ts)
const DEFAULT_CATEGORY_WEIGHTS: Record<string, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

const subcategoryTaskGenSchema = z.object({
  companyId: z.string().uuid(),
  subcategory: z.string().max(100),
  valueAtStake: z.coerce.number().finite().optional(),
})

const onboardingTaskGenSchema = z.object({
  companyId: z.string().uuid(),
  riskResults: z.object({
    briScore: z.coerce.number().finite().min(0).max(100),
    categoryScores: z.record(z.string(), z.coerce.number().finite()),
    valueGapByCategory: z.record(z.string(), z.coerce.number().finite()),
  }),
  riskQuestionAnswers: z.record(z.string(), z.string()).optional(),
})

export async function POST(request: Request) {
  // SEC-034: Rate limit AI endpoints
  const rl = await applyRateLimit(request, RATE_LIMIT_CONFIGS.AI)
  if (!rl.success) return createRateLimitResponse(rl)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const bodyRaw = await request.json()

    // Check if this is an onboarding task generation request (has riskResults)
    if (bodyRaw.riskResults) {
      const validation = onboardingTaskGenSchema.safeParse(bodyRaw)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues },
          { status: 400 }
        )
      }
      return handleOnboardingTaskGeneration(validation.data)
    }

    // Otherwise, handle the subcategory-based task generation (original flow)
    const validation = subcategoryTaskGenSchema.safeParse(bodyRaw)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }
    const { companyId, subcategory, valueAtStake } = validation.data

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
    console.error('Error generating tasks:', error instanceof Error ? error.message : String(error))
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
    // Get company details and latest snapshot for accurate value calculation
    const [company, latestSnapshot] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          businessDescription: true,
          icbSubSector: true,
          annualRevenue: true,
        }
      }),
      prisma.valuationSnapshot.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      })
    ])

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
    }).catch(err => console.error('Failed to log AI usage:', err instanceof Error ? err.message : String(err)))

    // Get or create current week's progress
    const now = new Date()
    const _weekNumber = Math.ceil(
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

    // Calculate expected value impact using the actual valuation formula
    // This replaces the AI's guess with the real expected dollar impact
    function calculateExpectedValueImpact(
      briCategory: string,
      taskCount: number,
      totalTasksInCategory: number
    ): number {
      if (!latestSnapshot) return 0

      // Get current category score from snapshot
      const categoryFieldMap: Record<string, string> = {
        FINANCIAL: 'briFinancial',
        TRANSFERABILITY: 'briTransferability',
        OPERATIONAL: 'briOperational',
        MARKET: 'briMarket',
        LEGAL_TAX: 'briLegalTax',
        PERSONAL: 'briPersonal',
      }
      const categoryField = categoryFieldMap[briCategory]
      if (!categoryField) return 0

      const currentCategoryScore = Number(latestSnapshot[categoryField as keyof typeof latestSnapshot]) || 0
      const gapToClose = 1.0 - currentCategoryScore

      // Calculate improvement ratio (same logic as improve-snapshot-for-task.ts)
      // Assume equal distribution among tasks in this category
      let improvementRatio = totalTasksInCategory > 0 ? 1 / totalTasksInCategory : 0.1
      improvementRatio = Math.max(0.05, Math.min(0.25, improvementRatio))

      const improvement = gapToClose * improvementRatio
      const newCategoryScore = Math.min(1.0, currentCategoryScore + improvement)

      // Calculate new BRI with improved category
      const categoryScores: Record<string, number> = {
        FINANCIAL: Number(latestSnapshot.briFinancial),
        TRANSFERABILITY: Number(latestSnapshot.briTransferability),
        OPERATIONAL: Number(latestSnapshot.briOperational),
        MARKET: Number(latestSnapshot.briMarket),
        LEGAL_TAX: Number(latestSnapshot.briLegalTax),
        PERSONAL: Number(latestSnapshot.briPersonal),
      }
      categoryScores[briCategory] = newCategoryScore

      let newBriScore = 0
      for (const [category, score] of Object.entries(categoryScores)) {
        const weight = DEFAULT_CATEGORY_WEIGHTS[category] || 0
        newBriScore += score * weight
      }

      // Calculate new valuation
      const adjustedEbitda = Number(latestSnapshot.adjustedEbitda)
      const coreScore = Number(latestSnapshot.coreScore)
      const industryMultipleLow = Number(latestSnapshot.industryMultipleLow)
      const industryMultipleHigh = Number(latestSnapshot.industryMultipleHigh)
      const currentBriScore = Number(latestSnapshot.briScore)

      const currentValuation = calculateValuation({
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
        coreScore,
        briScore: currentBriScore,
      })

      const newValuation = calculateValuation({
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
        coreScore,
        briScore: newBriScore,
      })

      // Return the actual expected value increase
      return Math.round(newValuation.currentValue - currentValuation.currentValue)
    }

    // Count tasks per category for accurate impact calculation
    const tasksByCategory: Record<string, number> = {}
    for (const task of data.tasks) {
      const category = normalizeBriCategory(task.category)
      tasksByCategory[category] = (tasksByCategory[category] || 0) + 1
    }

    // Create task records in the database
    const tasksWithIds = await Promise.all(
      data.tasks.map(async (task, index) => {
        // Create as a general task (not tied to a specific diagnosis subcategory)
        const briCategory = normalizeBriCategory(task.category)

        // Calculate the actual expected value impact using the valuation formula
        // This replaces the AI's guess with the real dollar impact
        const calculatedValue = calculateExpectedValueImpact(
          briCategory,
          1, // This task
          tasksByCategory[briCategory] || 1
        )

        // Use calculated value if we have snapshot data, otherwise fall back to AI estimate
        const estimatedValue = calculatedValue > 0 ? calculatedValue : (task.estimatedValue ? Math.round(task.estimatedValue) : 0)

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
            inActionPlan: true, // Show in action plan immediately after onboarding
            priorityRank: index + 1, // Priority based on generation order (first = highest)
          }
        })

        return {
          id: createdTask.id,
          title: task.title,
          description: task.description,
          category: task.category,
          estimatedValue,
          estimatedHours: task.estimatedHours || 2,
        }
      })
    )

    return NextResponse.json({
      tasks: tasksWithIds,
    })
  } catch (error) {
    console.error('Error generating onboarding tasks:', error instanceof Error ? error.message : String(error))
    // SECURITY FIX (PROD-060): Don't expose internal error messages to the client
    return NextResponse.json(
      { error: 'Failed to generate tasks' },
      { status: 500 }
    )
  }
}
