// AI-powered task generation for AI-generated BRI questions
// Unlike template-based generation (which matches seed question text),
// this uses Claude to generate contextual tasks based on the actual
// question content, the user's answer, and the company context.

import { prisma } from '@/lib/prisma'
import { generateJSON } from '@/lib/ai/anthropic'
import { calculateTaskPriorityFromAttributes, initializeActionPlan } from '@/lib/tasks/action-plan'

type IssueTier = 'CRITICAL' | 'SIGNIFICANT' | 'OPTIMIZATION'

const TIER_ALLOCATION: Record<IssueTier, number> = {
  CRITICAL: 0.60,
  SIGNIFICANT: 0.30,
  OPTIMIZATION: 0.10,
}

function getEffectiveTier(questionTier: IssueTier, answerScore: number): IssueTier {
  if (questionTier === 'CRITICAL') {
    if (answerScore <= 0.33) return 'CRITICAL'
    if (answerScore <= 0.66) return 'SIGNIFICANT'
    return 'OPTIMIZATION'
  }
  if (questionTier === 'SIGNIFICANT') {
    if (answerScore <= 0.50) return 'SIGNIFICANT'
    return 'OPTIMIZATION'
  }
  return 'OPTIMIZATION'
}

function getEffortMultiplier(effort: string): number {
  const multipliers: Record<string, number> = {
    MINIMAL: 0.5,
    LOW: 1,
    MODERATE: 2,
    HIGH: 4,
    MAJOR: 8,
  }
  return multipliers[effort] || 2
}

interface AITaskResult {
  title: string
  description: string
  actionType: string
  effortLevel: string
  complexity: string
  estimatedHours: number
  buyerConsequence: string
}

interface AITasksResponse {
  tasks: AITaskResult[]
}

const SYSTEM_PROMPT = `You are a business exit readiness expert generating actionable improvement tasks.

You will receive assessment questions where a business owner scored below perfect, along with their answers and the company's BRI category scores. Generate ONE specific, actionable task per question that will help move the owner's answer to the next level.

Think like a team of experts: investment banker, M&A buyer, accountant, tax advisor, estate planner, and corporate lawyer.

For each question, generate a task with:
- title: Action-oriented (start with verb), specific to the issue (max 80 chars)
- description: 2-3 sentences. What to do, why it matters for exit value, what the deliverable is.
- actionType: One of TYPE_I_EVIDENCE, TYPE_II_DOCUMENTATION, TYPE_III_OPERATIONAL, TYPE_IV_INSTITUTIONALIZE, TYPE_V_RISK_REDUCTION, TYPE_VI_ALIGNMENT, TYPE_VII_READINESS, TYPE_VIII_SIGNALING
- effortLevel: MINIMAL (< 1hr), LOW (1-4hr), MODERATE (4-16hr), HIGH (16-40hr), MAJOR (40+hr)
- complexity: SIMPLE, MODERATE, COMPLEX, STRATEGIC
- estimatedHours: Integer
- buyerConsequence: One sentence explaining what a buyer would think if this isn't addressed (max 150 chars)

Rules:
- ONE task per question (the most impactful next step)
- Tasks should move the score from current level to the NEXT level up
- Be specific to the company's situation, not generic advice
- Focus on what produces tangible evidence a buyer can verify
- Order by value impact

Return JSON: { "tasks": [...] }
Keep tasks array in the SAME ORDER as the questions provided.`

/**
 * Generate AI-powered tasks for company-specific (AI-generated) BRI questions.
 * Called after assessment completion when AI questions have responses below 1.0.
 */
export async function generateAITasksForCompany(
  companyId: string
): Promise<{ created: number; skipped: number }> {
  // Get latest assessment with responses for AI questions only
  const assessment = await prisma.assessment.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    include: {
      responses: {
        include: {
          question: {
            include: { options: { orderBy: { scoreValue: 'asc' } } },
          },
          selectedOption: true,
          effectiveOption: true,
        },
      },
    },
  })

  if (!assessment) return { created: 0, skipped: 0 }

  // Filter to AI questions (companyId not null) with score < 1.0
  const aiResponses = assessment.responses.filter(r => {
    if (!r.question.companyId) return false // Not an AI question
    if (!r.selectedOption) return false
    if (r.confidenceLevel === 'NOT_APPLICABLE') return false
    const effectiveOption = r.effectiveOption || r.selectedOption
    return Number(effectiveOption.scoreValue) < 1.0
  })

  if (aiResponses.length === 0) return { created: 0, skipped: 0 }

  // Get latest valuation snapshot
  const snapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  })
  const valueGap = snapshot ? Number(snapshot.valueGap) : 0

  // Get company info for context
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      businessDescription: true,
      icbSubSector: true,
      workspaceId: true,
    },
  })

  // Check for single user (auto-assign)
  let defaultAssigneeId: string | null = null
  if (company) {
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId: company.workspaceId },
      select: { userId: true },
    })
    if (workspaceMembers.length === 1) {
      defaultAssigneeId = workspaceMembers[0].userId
    }
  }

  // Delete existing PENDING tasks linked to AI questions for this company
  // (regenerate fresh set each time)
  const aiQuestionIds = aiResponses.map(r => r.questionId)
  await prisma.task.deleteMany({
    where: {
      companyId,
      linkedQuestionId: { in: aiQuestionIds },
      status: 'PENDING',
    },
  })

  // Build prompt with questions and answers
  const questionEntries = aiResponses.map(r => {
    const effectiveOption = r.effectiveOption || r.selectedOption
    const currentScore = Number(effectiveOption!.scoreValue)
    const options = r.question.options
    const nextOption = options.find(o => Number(o.scoreValue) > currentScore)

    return {
      questionId: r.questionId,
      questionText: r.question.questionText,
      category: r.question.briCategory,
      issueTier: r.question.issueTier || 'OPTIMIZATION',
      currentAnswer: effectiveOption!.optionText,
      currentScore,
      nextLevelAnswer: nextOption?.optionText || 'Best practice',
      nextLevelScore: nextOption ? Number(nextOption.scoreValue) : 1.0,
      buyerLogic: r.question.buyerLogic,
      riskDriverName: r.question.riskDriverName,
    }
  })

  // Get category scores for context
  const categoryScores: Record<string, number> = {}
  if (snapshot) {
    categoryScores.FINANCIAL = Math.round(Number(snapshot.briFinancial) * 100)
    categoryScores.TRANSFERABILITY = Math.round(Number(snapshot.briTransferability) * 100)
    categoryScores.OPERATIONAL = Math.round(Number(snapshot.briOperational) * 100)
    categoryScores.MARKET = Math.round(Number(snapshot.briMarket) * 100)
    categoryScores.LEGAL_TAX = Math.round(Number(snapshot.briLegalTax) * 100)
    categoryScores.PERSONAL = Math.round(Number(snapshot.briPersonal) * 100)
  }

  const userPrompt = `Company: ${company?.businessDescription || 'Not provided'}
Industry: ${company?.icbSubSector || 'Not specified'}
BRI Category Scores: ${Object.entries(categoryScores).map(([k, v]) => `${k}: ${v}/100`).join(', ')}
Value Gap: $${valueGap.toLocaleString()}

Questions to generate tasks for (${questionEntries.length} questions):

${questionEntries.map((q, i) => `${i + 1}. [${q.category}] ${q.questionText}
   Current answer (score ${q.currentScore.toFixed(2)}): "${q.currentAnswer}"
   Target answer (score ${q.nextLevelScore.toFixed(2)}): "${q.nextLevelAnswer}"
   Risk: ${q.buyerLogic || 'Not specified'}
   Issue tier: ${q.issueTier}`).join('\n\n')}

Generate one task per question above. Return tasks in the same order.`

  let aiTasks: AITaskResult[]
  try {
    const { data } = await generateJSON<AITasksResponse>(
      userPrompt,
      SYSTEM_PROMPT,
      { model: 'claude-sonnet', maxTokens: 8192, temperature: 0.5 }
    )
    aiTasks = data.tasks || []
  } catch (error) {
    console.error('[AI_TASK_ENGINE] Failed to generate AI tasks:', error)
    // Fallback: generate basic tasks without AI
    aiTasks = questionEntries.map(q => ({
      title: `Improve: ${q.riskDriverName || q.category}`,
      description: `Address the ${q.category.toLowerCase()} issue: "${q.questionText}"\n\nCurrent: ${q.currentAnswer}\nTarget: ${q.nextLevelAnswer}`,
      actionType: 'TYPE_III_OPERATIONAL',
      effortLevel: 'MODERATE',
      complexity: 'MODERATE',
      estimatedHours: 8,
      buyerConsequence: q.buyerLogic || 'Buyers discount businesses with unresolved risk areas.',
    }))
  }

  // Count questions by effective tier
  const tierCounts: Record<IssueTier, number> = { CRITICAL: 0, SIGNIFICANT: 0, OPTIMIZATION: 0 }
  for (const q of questionEntries) {
    const effectiveTier = getEffectiveTier(q.issueTier as IssueTier, q.currentScore)
    tierCounts[effectiveTier]++
  }

  let created = 0
  let skipped = 0

  for (let i = 0; i < Math.min(aiTasks.length, questionEntries.length); i++) {
    const task = aiTasks[i]
    const question = questionEntries[i]
    const response = aiResponses[i]
    const options = response.question.options

    // Find upgrade-from and upgrade-to options
    const fromOption = options.find(
      o => Math.abs(Number(o.scoreValue) - question.currentScore) <= 0.05
    )
    const toOption = options.find(
      o => Math.abs(Number(o.scoreValue) - question.nextLevelScore) <= 0.05
    )

    const effectiveTier = getEffectiveTier(question.issueTier as IssueTier, question.currentScore)
    const tierAllocation = TIER_ALLOCATION[effectiveTier]
    const questionsInTier = tierCounts[effectiveTier] || 1
    const scoreImprovement = question.nextLevelScore - question.currentScore
    const estimatedValueImpact = (tierAllocation * valueGap / questionsInTier) * scoreImprovement

    const effortLevel = task.effortLevel || 'MODERATE'
    const effortMultiplier = getEffortMultiplier(effortLevel)
    const normalizedValue = estimatedValueImpact / effortMultiplier

    const { impactLevel, difficultyLevel, priorityRank } = calculateTaskPriorityFromAttributes(
      question.currentScore,
      effortLevel,
      task.estimatedHours
    )

    try {
      await prisma.task.create({
        data: {
          companyId,
          title: task.title,
          description: task.description,
          actionType: (task.actionType || 'TYPE_III_OPERATIONAL') as never,
          briCategory: question.category as never,
          linkedQuestionId: question.questionId,
          upgradesFromOptionId: fromOption?.id || null,
          upgradesToOptionId: toOption?.id || null,
          rawImpact: estimatedValueImpact,
          normalizedValue,
          issueTier: effectiveTier,
          effortLevel: effortLevel as never,
          complexity: (task.complexity || 'MODERATE') as never,
          estimatedHours: task.estimatedHours || 8,
          impactLevel,
          difficultyLevel,
          priorityRank,
          inActionPlan: false,
          buyerConsequence: task.buyerConsequence || null,
          status: 'PENDING',
          ...(defaultAssigneeId && { primaryAssigneeId: defaultAssigneeId }),
        },
      })
      created++
    } catch (error) {
      console.error('[AI_TASK_ENGINE] Error creating task:', error)
      skipped++
    }
  }

  // Initialize action plan with top priority tasks
  if (created > 0) {
    const actionPlanResult = await initializeActionPlan(companyId)
    console.log(`[AI_TASK_ENGINE] Action plan: ${actionPlanResult.initialized} tasks, Queue: ${actionPlanResult.queued} tasks`)
  }

  console.log(`[AI_TASK_ENGINE] Generated ${created} AI tasks for company ${companyId}, skipped ${skipped}`)

  return { created, skipped }
}
