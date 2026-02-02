import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTasks } from '@/lib/ai/diagnosis'
import { prisma } from '@/lib/prisma'
import type { BusinessProfile, Subcategory, IdentifiedDriver } from '@/lib/ai/types'
import { DiagnosisSubcategory } from '@prisma/client'

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
