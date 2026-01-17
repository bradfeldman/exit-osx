/**
 * Action Center API
 *
 * GET /api/companies/[id]/action-center
 * Returns:
 * - Up to 3 playbooks (focused task plans for weak BRI categories)
 * - Next recommended assessment
 * - High-priority tasks
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { BriCategory } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Map BRI categories to user-friendly names
const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

// Playbook descriptions by category
const PLAYBOOK_DESCRIPTIONS: Record<string, string> = {
  FINANCIAL: 'Strengthen financial metrics, reporting, and cash flow management',
  TRANSFERABILITY: 'Reduce owner dependency and build transferable systems',
  OPERATIONAL: 'Document and optimize operational processes',
  MARKET: 'Improve market position and competitive differentiation',
  LEGAL_TAX: 'Address legal structure, compliance, and tax optimization',
  PERSONAL: 'Prepare for ownership transition and personal readiness',
}

// Issue tier priority: CRITICAL > SIGNIFICANT > OPTIMIZATION
const TIER_PRIORITY: Record<string, number> = {
  CRITICAL: 3,
  SIGNIFICANT: 2,
  OPTIMIZATION: 1,
}

// Calculate priority score: higher = better
// First by tier (CRITICAL > SIGNIFICANT > OPTIMIZATION), then by effort (low effort first)
function calculatePriorityScore(issueTier: string | null, effortLevel: string): number {
  // Tier score (1-3): CRITICAL is highest priority
  const tierScore = TIER_PRIORITY[issueTier || 'OPTIMIZATION'] || 1

  // Effort penalty (1-5): lower is better
  const effortPenalty: Record<string, number> = {
    MINIMAL: 1,
    LOW: 2,
    MODERATE: 3,
    HIGH: 4,
    MAJOR: 5,
  }
  const penalty = effortPenalty[effortLevel] || 3

  // Priority = tier * 10 - effort (range: 5 to 29)
  // CRITICAL / Minimal Effort = 29 (best)
  // OPTIMIZATION / Major Effort = 5 (worst)
  return tierScore * 10 - penalty
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: companyId } = await params

  // Verify user has access to this company
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      organization: {
        include: {
          users: { where: { user: { authId: user.id } } }
        }
      }
    }
  })

  if (!company || company.organization.users.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get latest valuation snapshot for BRI scores
  const snapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  })

  if (!snapshot) {
    return NextResponse.json({
      playbooks: [],
      recommendedAssessment: null,
      needsInitialAssessment: true,
      tasks: [],
    })
  }

  // Get category scores and sort by weakest
  const categoryScores = [
    { category: 'FINANCIAL' as BriCategory, score: Number(snapshot.briFinancial), label: CATEGORY_LABELS.FINANCIAL },
    { category: 'TRANSFERABILITY' as BriCategory, score: Number(snapshot.briTransferability), label: CATEGORY_LABELS.TRANSFERABILITY },
    { category: 'OPERATIONAL' as BriCategory, score: Number(snapshot.briOperational), label: CATEGORY_LABELS.OPERATIONAL },
    { category: 'MARKET' as BriCategory, score: Number(snapshot.briMarket), label: CATEGORY_LABELS.MARKET },
    { category: 'LEGAL_TAX' as BriCategory, score: Number(snapshot.briLegalTax), label: CATEGORY_LABELS.LEGAL_TAX },
    { category: 'PERSONAL' as BriCategory, score: Number(snapshot.briPersonal), label: CATEGORY_LABELS.PERSONAL },
  ].sort((a, b) => a.score - b.score)

  // Top 3 weakest categories become playbooks
  const weakestCategories = categoryScores.slice(0, 3)

  // Get existing tasks grouped by category
  const tasksUnsorted = await prisma.task.findMany({
    where: {
      companyId,
      status: { in: ['PENDING', 'IN_PROGRESS'] }
    },
    select: {
      id: true,
      title: true,
      briCategory: true,
      status: true,
      effortLevel: true,
      estimatedHours: true,
      rawImpact: true,
      normalizedValue: true,
      issueTier: true,
      createdAt: true,
    }
  })

  // Sort by priority: CRITICAL tier first, then by low effort
  const existingTasks = tasksUnsorted.sort((a, b) => {
    const priorityA = calculatePriorityScore(a.issueTier, a.effortLevel)
    const priorityB = calculatePriorityScore(b.issueTier, b.effortLevel)
    if (priorityB !== priorityA) return priorityB - priorityA
    // Secondary sort by raw impact (higher value first within same priority)
    const impactDiff = Number(b.rawImpact) - Number(a.rawImpact)
    if (impactDiff !== 0) return impactDiff
    // Tertiary sort by creation date
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  // Get project question counts by category for assessment recommendations
  const questionCounts = await prisma.projectQuestion.groupBy({
    by: ['briCategory'],
    where: { isActive: true },
    _count: { id: true }
  })

  // Check for recent project assessments
  const recentAssessments = await prisma.projectAssessment.findMany({
    where: {
      companyId,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    },
    select: {
      id: true,
      assessmentNumber: true,
      primaryCategory: true,
      status: true,
      startedAt: true,
      completedAt: true,
      _count: {
        select: {
          questions: true,
          responses: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Build current assessment info
  const inProgressAssessment = recentAssessments.find(a => a.status === 'IN_PROGRESS')
  let currentAssessment = null
  if (inProgressAssessment) {
    currentAssessment = {
      id: inProgressAssessment.id,
      assessmentNumber: inProgressAssessment.assessmentNumber,
      status: inProgressAssessment.status,
      questionsAnswered: inProgressAssessment._count.responses,
      totalQuestions: inProgressAssessment._count.questions,
      startedAt: inProgressAssessment.startedAt.toISOString(),
    }
  }

  // Check if an assessment was completed recently (within last 4 hours = current session)
  const SESSION_HOURS = 4
  const sessionStart = new Date(Date.now() - SESSION_HOURS * 60 * 60 * 1000)
  const recentlyCompleted = recentAssessments.some(
    a => a.status === 'COMPLETED' && a.completedAt && a.completedAt >= sessionStart
  )

  // Build playbooks (up to 3)
  const playbooks = await Promise.all(weakestCategories.map(async (cat, index) => {
    // Get tasks for this category
    const categoryTasks = existingTasks.filter(t => t.briCategory === cat.category)

    // Get question count for this category
    const questionInfo = questionCounts.find(q => q.briCategory === cat.category)
    const availableQuestions = questionInfo?._count.id || 0

    // Check if there's an in-progress assessment for this category
    const activeAssessment = recentAssessments.find(
      a => a.primaryCategory === cat.category && a.status === 'IN_PROGRESS'
    )

    // Sum of all task values in this category (consistent with individual task display)
    const categoryTaskValueSum = categoryTasks.reduce(
      (sum, t) => sum + (Number(t.rawImpact) || 0),
      0
    )

    return {
      id: `playbook-${cat.category.toLowerCase()}`,
      category: cat.category,
      label: cat.label,
      description: PLAYBOOK_DESCRIPTIONS[cat.category],
      score: Math.round(cat.score * 100),
      rank: index + 1,
      tasks: categoryTasks.slice(0, 5).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        effortLevel: t.effortLevel,
        estimatedHours: t.estimatedHours,
        valueImpact: Number(t.rawImpact) || 0,
        issueTier: t.issueTier,
      })),
      taskCount: categoryTasks.length,
      availableQuestions,
      hasActiveAssessment: !!activeAssessment,
      activeAssessmentId: activeAssessment?.id,
      potentialValueRecovery: Math.round(categoryTaskValueSum),
    }
  }))

  // Determine recommended next assessment
  let recommendedAssessment = null

  if (inProgressAssessment) {
    // Continue existing assessment
    recommendedAssessment = {
      type: 'continue',
      assessmentId: inProgressAssessment.id,
      category: inProgressAssessment.primaryCategory,
      label: CATEGORY_LABELS[inProgressAssessment.primaryCategory || ''] || 'Assessment',
      message: 'Continue your in-progress assessment',
    }
  } else {
    // Find the weakest category without a recent completed assessment
    const completedCategories = recentAssessments
      .filter(a => a.status === 'COMPLETED')
      .map(a => a.primaryCategory)

    const needsAssessment = weakestCategories.find(
      cat => !completedCategories.includes(cat.category)
    )

    if (needsAssessment) {
      recommendedAssessment = {
        type: 'new',
        category: needsAssessment.category,
        label: needsAssessment.label,
        score: Math.round(needsAssessment.score * 100),
        message: `Deep dive into ${needsAssessment.label} to uncover improvement opportunities`,
      }
    }
  }

  // Get top priority tasks across all categories
  const topTasks = existingTasks.slice(0, 5).map(t => ({
    id: t.id,
    title: t.title,
    category: t.briCategory,
    categoryLabel: CATEGORY_LABELS[t.briCategory],
    status: t.status,
    effortLevel: t.effortLevel,
    estimatedHours: t.estimatedHours,
    valueImpact: Number(t.rawImpact) || 0,
  }))

  // Check if initial BRI assessment is complete
  const hasInitialAssessment = await prisma.assessment.findFirst({
    where: {
      companyId,
      assessmentType: 'INITIAL',
      completedAt: { not: null }
    }
  })

  // Calculate summary based only on tasks in displayed playbooks
  const displayedCategories = weakestCategories.map(c => c.category)
  const displayedTasks = existingTasks.filter(t => displayedCategories.includes(t.briCategory))

  return NextResponse.json({
    playbooks,
    currentAssessment,
    recentlyCompleted,
    needsInitialAssessment: !hasInitialAssessment,
    tasks: topTasks,
    summary: {
      totalTasks: displayedTasks.length,
      totalValueAtStake: displayedTasks.reduce((sum, t) => sum + (Number(t.rawImpact) || 0), 0),
      briScore: Math.round(Number(snapshot.briScore) * 100),
      valueGap: Number(snapshot.valueGap),
    }
  })
}
