import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'
import { generateAITasksForCompany } from '@/lib/playbook/generate-ai-tasks'
import { generateTasksForCompany } from '@/lib/playbook/generate-tasks'

/**
 * POST - Trigger BRI recalculation after inline category assessment updates
 * This creates a new ValuationSnapshot with updated scores based on current responses
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify user has access and get database user ID
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        organization: {
          include: {
            users: {
              where: { user: { authId: user.id } },
              include: {
                user: { select: { id: true } }
              }
            }
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const dbUserId = company.organization.users[0].user.id

    // Recalculate snapshot with current BRI scores
    const result = await recalculateSnapshotForCompany(
      companyId,
      'Category assessment updated',
      dbUserId
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to recalculate' },
        { status: 500 }
      )
    }

    // Get the new snapshot to return updated scores
    const snapshot = await prisma.valuationSnapshot.findUnique({
      where: { id: result.snapshotId },
      select: {
        briScore: true,
        briFinancial: true,
        briTransferability: true,
        briOperational: true,
        briMarket: true,
        briLegalTax: true,
        briPersonal: true,
        currentValue: true,
        potentialValue: true,
        valueGap: true,
      }
    })

    // Generate tasks if none exist yet for this company
    // Only runs once after all categories are assessed (or first time through)
    let taskResult = { created: 0, skipped: 0 }
    try {
      // Check if there are already pending tasks — if so, skip generation
      const existingPendingTasks = await prisma.task.count({
        where: {
          companyId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      })

      if (existingPendingTasks === 0 && snapshot) {
        // No active tasks — generate them
        const aiQuestionCount = await prisma.question.count({
          where: { companyId, isActive: true },
        })

        if (aiQuestionCount > 0) {
          // Use AI-powered task generation for AI questions
          taskResult = await generateAITasksForCompany(companyId)
          console.log(`[recalculate-bri] AI task generation: ${taskResult.created} created, ${taskResult.skipped} skipped`)
        } else {
          // Fallback: use template-based generation for seed questions
          const assessment = await prisma.assessment.findFirst({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: {
              responses: {
                where: { selectedOptionId: { not: null } },
                include: {
                  question: true,
                  selectedOption: true,
                },
              },
            },
          })

          if (assessment && assessment.responses.length > 0) {
            const responses = assessment.responses
              .filter(r => r.selectedOption && !r.question.companyId) // Seed questions only
              .map(r => ({
                questionId: r.questionId,
                selectedOptionId: r.selectedOptionId!,
                question: {
                  id: r.question.id,
                  questionText: r.question.questionText,
                  briCategory: r.question.briCategory,
                  issueTier: (r.question.issueTier || 'OPTIMIZATION') as 'CRITICAL' | 'SIGNIFICANT' | 'OPTIMIZATION',
                  maxImpactPoints: r.question.maxImpactPoints,
                },
                selectedOption: {
                  id: r.selectedOption!.id,
                  scoreValue: r.selectedOption!.scoreValue,
                },
              }))

            taskResult = await generateTasksForCompany(companyId, responses, {
              valueGap: snapshot.valueGap,
              briScore: snapshot.briScore,
            })
            console.log(`[recalculate-bri] Template task generation: ${taskResult.created} created, ${taskResult.skipped} skipped`)
          }
        }
      }
    } catch (taskError) {
      // Don't fail the recalculation if task generation fails
      console.error('[recalculate-bri] Task generation error (non-fatal):', taskError)
    }

    return NextResponse.json({
      success: true,
      snapshotId: result.snapshotId,
      tasksGenerated: taskResult.created,
      scores: snapshot ? {
        briScore: Math.round(Number(snapshot.briScore) * 100),
        categories: {
          financial: Math.round(Number(snapshot.briFinancial) * 100),
          transferability: Math.round(Number(snapshot.briTransferability) * 100),
          operational: Math.round(Number(snapshot.briOperational) * 100),
          market: Math.round(Number(snapshot.briMarket) * 100),
          legalTax: Math.round(Number(snapshot.briLegalTax) * 100),
          personal: Math.round(Number(snapshot.briPersonal) * 100),
        },
        currentValue: Math.round(Number(snapshot.currentValue)),
        potentialValue: Math.round(Number(snapshot.potentialValue)),
        valueGap: Math.round(Number(snapshot.valueGap)),
      } : null
    })
  } catch (error) {
    console.error('Error recalculating BRI:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate BRI' },
      { status: 500 }
    )
  }
}
