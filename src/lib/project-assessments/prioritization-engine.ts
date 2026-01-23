/**
 * Question Prioritization Engine
 *
 * Determines which questions to include in the next Project Assessment.
 * Prioritizes questions by:
 * 1. Impact on buyer risk perception (questionImpact, buyerSensitivity)
 * 2. Relevance to company's weak BRI areas
 * 3. Category balance (mix of focused + sampling)
 * 4. Questions not yet asked
 */

import { prisma } from '@/lib/prisma'
import type { BriCategory, QuestionImpact, BuyerSensitivity } from '@prisma/client'

// Configuration for prioritization weights
const PRIORITY_WEIGHTS = {
  impact: 0.35,      // Base impact from questionImpact
  sensitivity: 0.25, // Buyer sensitivity weight
  relevance: 0.25,   // Relevance to weak BRI categories
  balance: 0.15,     // Category balance bonus
}

// Impact scores
const IMPACT_SCORES: Record<QuestionImpact, number> = {
  CRITICAL: 100,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
}

// Sensitivity scores
const SENSITIVITY_SCORES: Record<BuyerSensitivity, number> = {
  CRITICAL: 100,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
}

// Default BRI weights
const DEFAULT_BRI_WEIGHTS: Record<BriCategory, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

// Questions only applicable to SaaS/subscription businesses
// These will be filtered out for non-SaaS companies
const SAAS_ONLY_PATTERNS = [
  'MOD-FIN-RECURRING',
  'MOD-RQ-RR',  // Revenue Quality - Recurring Revenue
  'MOD-FN-RQ',  // Financial - Revenue Quality (recurring focused)
]

// Keywords that indicate a question is SaaS/subscription specific
const SAAS_KEYWORDS = [
  'recurring revenue',
  'subscription-based',
  'subscription revenue',
  'net revenue retention',
  'MRR',
  'ARR',
  'SaaS',
]

// Industries that typically have recurring/subscription revenue
const RECURRING_REVENUE_INDUSTRIES = [
  'SOFTWARE_AND_COMPUTER_SERVICES',
  'MEDIA',
  'TELECOMMUNICATIONS',
]

// Sub-sectors that are SaaS/subscription focused
const SAAS_SUB_SECTORS = [
  'SOFTWARE',
  'COMPUTER_SERVICES',
  'INTERNET',
]

interface PrioritizedQuestion {
  questionId: string
  moduleId: string
  questionText: string
  briCategory: BriCategory
  subCategory: string
  impactScore: number
  relevanceScore: number
  balanceBonus: number
  totalScore: number
  selectionReason: string
}

interface CompanyBriScores {
  briFinancial: number
  briTransferability: number
  briOperational: number
  briMarket: number
  briLegalTax: number
  briPersonal: number
}

/**
 * Calculate priority scores for all unasked questions for a company
 */
export async function calculateQuestionPriorities(
  companyId: string
): Promise<void> {
  // Get company's current BRI scores from latest snapshot
  const snapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      briFinancial: true,
      briTransferability: true,
      briOperational: true,
      briMarket: true,
      briLegalTax: true,
      briPersonal: true,
    }
  })

  const briScores: CompanyBriScores = snapshot ? {
    briFinancial: Number(snapshot.briFinancial),
    briTransferability: Number(snapshot.briTransferability),
    briOperational: Number(snapshot.briOperational),
    briMarket: Number(snapshot.briMarket),
    briLegalTax: Number(snapshot.briLegalTax),
    briPersonal: Number(snapshot.briPersonal),
  } : {
    briFinancial: 0.5,
    briTransferability: 0.5,
    briOperational: 0.5,
    briMarket: 0.5,
    briLegalTax: 0.5,
    briPersonal: 0.5,
  }

  // Get all project questions
  const questions = await prisma.projectQuestion.findMany({
    where: { isActive: true },
    select: {
      id: true,
      moduleId: true,
      briCategory: true,
      questionImpact: true,
      buyerSensitivity: true,
    }
  })

  // Get already-asked question IDs for this company
  const askedQuestions = await prisma.companyQuestionPriority.findMany({
    where: { companyId, hasBeenAsked: true },
    select: { questionId: true }
  })
  const askedIds = new Set(askedQuestions.map(q => q.questionId))

  // Calculate priorities for each question
  for (const question of questions) {
    const impactScore = IMPACT_SCORES[question.questionImpact] * PRIORITY_WEIGHTS.impact
    const sensitivityScore = SENSITIVITY_SCORES[question.buyerSensitivity] * PRIORITY_WEIGHTS.sensitivity

    // Calculate relevance based on category's BRI score (lower BRI = higher relevance)
    const categoryBriScore = getCategoryBriScore(question.briCategory, briScores)
    const relevanceScore = (1 - categoryBriScore) * 100 * PRIORITY_WEIGHTS.relevance

    // Urgency score (could be based on time-sensitivity, for now default to 50)
    const urgencyScore = 50

    // Combined priority
    const priorityScore = impactScore + sensitivityScore + relevanceScore

    // Upsert the priority record
    await prisma.companyQuestionPriority.upsert({
      where: {
        companyId_questionId: { companyId, questionId: question.id }
      },
      update: {
        impactScore,
        relevanceScore,
        urgencyScore,
        priorityScore,
      },
      create: {
        companyId,
        questionId: question.id,
        impactScore,
        relevanceScore,
        urgencyScore,
        priorityScore,
        hasBeenAsked: askedIds.has(question.id),
      }
    })
  }
}

/**
 * Check if a company has a SaaS/subscription business model
 */
async function isRecurringRevenueCompany(companyId: string): Promise<boolean> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      icbIndustry: true,
      icbSuperSector: true,
      icbSector: true,
      icbSubSector: true,
    }
  })

  if (!company) return false

  // Check if company is in a SaaS/recurring revenue industry
  if (RECURRING_REVENUE_INDUSTRIES.some(ind =>
    company.icbIndustry.toUpperCase().includes(ind) ||
    company.icbSuperSector.toUpperCase().includes(ind) ||
    company.icbSector.toUpperCase().includes(ind)
  )) {
    return true
  }

  // Check if company is in a SaaS sub-sector
  if (SAAS_SUB_SECTORS.some(sub =>
    company.icbSubSector.toUpperCase().includes(sub)
  )) {
    return true
  }

  return false
}

/**
 * Check if a question is only applicable to SaaS/subscription businesses
 */
function isSaasOnlyQuestion(moduleId: string, questionText: string): boolean {
  // Check module ID patterns
  if (SAAS_ONLY_PATTERNS.some(pattern => moduleId.startsWith(pattern))) {
    return true
  }

  // Check question text for SaaS keywords
  const lowerText = questionText.toLowerCase()
  if (SAAS_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
    return true
  }

  return false
}

/**
 * Get subCategories that have been addressed by completed tasks
 * This helps avoid asking questions about risks that have already been mitigated
 */
async function getResolvedSubCategories(companyId: string): Promise<Set<string>> {
  // Get completed tasks with their linked questions
  const completedTasks = await prisma.task.findMany({
    where: {
      companyId,
      status: 'COMPLETED',
      linkedQuestionId: { not: null },
      upgradesToOptionId: { not: null }, // Only tasks that actually upgraded an answer
    },
    select: {
      briCategory: true,
      linkedQuestionId: true,
    }
  })

  // Build a set of category keys that have been addressed
  // Format: "CATEGORY" (we use category level since initial questions don't have subCategory)
  const resolvedCategories = new Set<string>()

  for (const task of completedTasks) {
    // Add the category as partially resolved
    resolvedCategories.add(task.briCategory)
  }

  return resolvedCategories
}

/**
 * Select questions for the next Project Assessment
 */
export async function selectQuestionsForAssessment(
  companyId: string,
  targetCount: number = 10,  // Default to 10 questions (10 in 10)
  focusCategory?: BriCategory
): Promise<PrioritizedQuestion[]> {
  // Ensure priorities are calculated
  await calculateQuestionPriorities(companyId)

  // Get categories that have been addressed by completed tasks
  const resolvedCategories = await getResolvedSubCategories(companyId)

  // Check if company is SaaS/subscription based
  const isSaasCompany = await isRecurringRevenueCompany(companyId)

  // Get company's current BRI scores
  const snapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      briFinancial: true,
      briTransferability: true,
      briOperational: true,
      briMarket: true,
      briLegalTax: true,
      briPersonal: true,
    }
  })

  const briScores: CompanyBriScores = snapshot ? {
    briFinancial: Number(snapshot.briFinancial),
    briTransferability: Number(snapshot.briTransferability),
    briOperational: Number(snapshot.briOperational),
    briMarket: Number(snapshot.briMarket),
    briLegalTax: Number(snapshot.briLegalTax),
    briPersonal: Number(snapshot.briPersonal),
  } : {
    briFinancial: 0.5,
    briTransferability: 0.5,
    briOperational: 0.5,
    briMarket: 0.5,
    briLegalTax: 0.5,
    briPersonal: 0.5,
  }

  // Find the weakest category if no focus specified
  const targetCategory = focusCategory || findWeakestCategory(briScores)
  const isFocusRequested = !!focusCategory

  // Get unasked questions sorted by priority
  const priorities = await prisma.companyQuestionPriority.findMany({
    where: {
      companyId,
      hasBeenAsked: false,
    },
    orderBy: { priorityScore: 'desc' },
    include: {
      question: {
        select: {
          id: true,
          moduleId: true,
          questionText: true,
          briCategory: true,
          subCategory: true,
          questionImpact: true,
          buyerSensitivity: true,
        }
      }
    }
  })

  // Filter out questions that don't apply to this company's business model
  const applicablePriorities = priorities.filter(p => {
    // If company is not SaaS, filter out SaaS-only questions
    if (!isSaasCompany && isSaasOnlyQuestion(p.question.moduleId, p.question.questionText)) {
      return false
    }
    return true
  })

  // Apply penalty to questions in categories that have completed tasks
  // This deprioritizes questions about risks that may have been mitigated
  const COMPLETED_TASK_PENALTY = 15 // Reduce priority score for categories with completed tasks
  const adjustedPriorities = applicablePriorities.map(p => {
    const hasCompletedTasks = resolvedCategories.has(p.question.briCategory)
    const adjustedScore = hasCompletedTasks
      ? Number(p.priorityScore) - COMPLETED_TASK_PENALTY
      : Number(p.priorityScore)
    return {
      ...p,
      adjustedPriorityScore: adjustedScore,
      hasCompletedTasksInCategory: hasCompletedTasks,
    }
  })

  // Sort by adjusted priority
  adjustedPriorities.sort((a, b) => b.adjustedPriorityScore - a.adjustedPriorityScore)

  // Select questions with category balancing
  const selectedQuestions: PrioritizedQuestion[] = []
  const categoryCount: Record<string, number> = {}

  // First, ensure we get some questions from the focus/weakest category
  const focusQuestions = adjustedPriorities.filter(p => p.question.briCategory === targetCategory)
  const minFocusCount = Math.min(Math.ceil(targetCount * 0.5), focusQuestions.length)

  for (let i = 0; i < minFocusCount && i < focusQuestions.length; i++) {
    const priority = focusQuestions[i]
    const question = priority.question

    let selectionReason = isFocusRequested
      ? `Selected focus: ${targetCategory}`
      : `Priority area: ${targetCategory} (needs improvement)`

    // Note if some tasks in this category have been completed
    if (priority.hasCompletedTasksInCategory) {
      selectionReason += ' (some risks mitigated by completed tasks)'
    }

    selectedQuestions.push({
      questionId: question.id,
      moduleId: question.moduleId,
      questionText: question.questionText,
      briCategory: question.briCategory,
      subCategory: question.subCategory,
      impactScore: Number(priority.impactScore),
      relevanceScore: Number(priority.relevanceScore),
      balanceBonus: 0,
      totalScore: priority.adjustedPriorityScore,
      selectionReason,
    })

    categoryCount[question.briCategory] = (categoryCount[question.briCategory] || 0) + 1
  }

  // Fill remaining slots with highest priority unasked questions from other categories
  const _remaining = targetCount - selectedQuestions.length
  const selectedIds = new Set(selectedQuestions.map(q => q.questionId))

  for (const priority of adjustedPriorities) {
    if (selectedQuestions.length >= targetCount) break
    if (selectedIds.has(priority.question.id)) continue

    const question = priority.question
    const currentCategoryCount = categoryCount[question.briCategory] || 0

    // Apply category balance bonus (encourage diversity)
    let balanceBonus = 0
    if (currentCategoryCount === 0) {
      balanceBonus = 10 // Bonus for new category
    } else if (currentCategoryCount >= 3) {
      balanceBonus = -5 // Penalty for over-represented category
    }

    const adjustedScore = priority.adjustedPriorityScore + balanceBonus

    let selectionReason = currentCategoryCount === 0
      ? `High impact, new category coverage`
      : `High impact question`

    // Note if tasks in this category have been completed
    if (priority.hasCompletedTasksInCategory) {
      selectionReason += ' (some risks mitigated)'
    }

    selectedQuestions.push({
      questionId: question.id,
      moduleId: question.moduleId,
      questionText: question.questionText,
      briCategory: question.briCategory,
      subCategory: question.subCategory,
      impactScore: Number(priority.impactScore),
      relevanceScore: Number(priority.relevanceScore),
      balanceBonus,
      totalScore: adjustedScore,
      selectionReason,
    })

    categoryCount[question.briCategory] = currentCategoryCount + 1
    selectedIds.add(question.id)
  }

  // Sort final selection by total score
  selectedQuestions.sort((a, b) => b.totalScore - a.totalScore)

  return selectedQuestions
}

/**
 * Mark questions as asked (after assessment creation)
 */
export async function markQuestionsAsAsked(
  companyId: string,
  questionIds: string[]
): Promise<void> {
  const now = new Date()

  await prisma.companyQuestionPriority.updateMany({
    where: {
      companyId,
      questionId: { in: questionIds }
    },
    data: {
      hasBeenAsked: true,
      askedAt: now,
    }
  })
}

/**
 * Get BRI score for a specific category
 */
function getCategoryBriScore(
  category: BriCategory,
  scores: CompanyBriScores
): number {
  switch (category) {
    case 'FINANCIAL': return scores.briFinancial
    case 'TRANSFERABILITY': return scores.briTransferability
    case 'OPERATIONAL': return scores.briOperational
    case 'MARKET': return scores.briMarket
    case 'LEGAL_TAX': return scores.briLegalTax
    case 'PERSONAL': return scores.briPersonal
    default: return 0.5
  }
}

/**
 * Find the weakest BRI category
 */
function findWeakestCategory(scores: CompanyBriScores): BriCategory {
  const categories: { category: BriCategory; score: number; weight: number }[] = [
    { category: 'FINANCIAL', score: scores.briFinancial, weight: DEFAULT_BRI_WEIGHTS.FINANCIAL },
    { category: 'TRANSFERABILITY', score: scores.briTransferability, weight: DEFAULT_BRI_WEIGHTS.TRANSFERABILITY },
    { category: 'OPERATIONAL', score: scores.briOperational, weight: DEFAULT_BRI_WEIGHTS.OPERATIONAL },
    { category: 'MARKET', score: scores.briMarket, weight: DEFAULT_BRI_WEIGHTS.MARKET },
    { category: 'LEGAL_TAX', score: scores.briLegalTax, weight: DEFAULT_BRI_WEIGHTS.LEGAL_TAX },
    { category: 'PERSONAL', score: scores.briPersonal, weight: DEFAULT_BRI_WEIGHTS.PERSONAL },
  ]

  // Find category with lowest weighted score (impact = score * weight)
  // Lower score in higher-weight category is more impactful to address
  let weakest = categories[0]
  let lowestWeightedScore = categories[0].score * categories[0].weight

  for (const cat of categories) {
    const weightedScore = cat.score * cat.weight
    if (weightedScore < lowestWeightedScore) {
      lowestWeightedScore = weightedScore
      weakest = cat
    }
  }

  return weakest.category
}

/**
 * Get statistics about question coverage for a company
 */
export async function getQuestionCoverageStats(companyId: string): Promise<{
  totalQuestions: number
  questionsAsked: number
  questionsByCategory: Record<string, { total: number; asked: number }>
}> {
  const totalQuestions = await prisma.projectQuestion.count({
    where: { isActive: true }
  })

  const questionsAsked = await prisma.companyQuestionPriority.count({
    where: { companyId, hasBeenAsked: true }
  })

  // Get breakdown by category
  const allByCategory = await prisma.projectQuestion.groupBy({
    by: ['briCategory'],
    where: { isActive: true },
    _count: { id: true }
  })

  const askedByCategory = await prisma.companyQuestionPriority.findMany({
    where: { companyId, hasBeenAsked: true },
    include: { question: { select: { briCategory: true } } }
  })

  const categoryStats: Record<string, { total: number; asked: number }> = {}

  for (const cat of allByCategory) {
    categoryStats[cat.briCategory] = {
      total: cat._count.id,
      asked: 0
    }
  }

  for (const asked of askedByCategory) {
    const cat = asked.question.briCategory
    if (categoryStats[cat]) {
      categoryStats[cat].asked++
    }
  }

  return {
    totalQuestions,
    questionsAsked,
    questionsByCategory: categoryStats,
  }
}

/**
 * Recommend next assessment focus based on company state
 */
export async function recommendNextAssessmentFocus(companyId: string): Promise<{
  recommendedCategory: BriCategory
  reason: string
  estimatedImpact: string
}> {
  const snapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      briFinancial: true,
      briTransferability: true,
      briOperational: true,
      briMarket: true,
      briLegalTax: true,
      briPersonal: true,
      valueGap: true,
    }
  })

  if (!snapshot) {
    return {
      recommendedCategory: 'FINANCIAL',
      reason: 'No assessment data available. Financial factors have the highest impact on valuation.',
      estimatedImpact: 'Complete Initial BRI Assessment first',
    }
  }

  const briScores: CompanyBriScores = {
    briFinancial: Number(snapshot.briFinancial),
    briTransferability: Number(snapshot.briTransferability),
    briOperational: Number(snapshot.briOperational),
    briMarket: Number(snapshot.briMarket),
    briLegalTax: Number(snapshot.briLegalTax),
    briPersonal: Number(snapshot.briPersonal),
  }

  const targetCategory = findWeakestCategory(briScores)
  const categoryScore = getCategoryBriScore(targetCategory, briScores)
  const categoryWeight = DEFAULT_BRI_WEIGHTS[targetCategory]
  const valueGap = Number(snapshot.valueGap)

  // Estimate potential impact of improving this category
  const potentialScoreImprovement = Math.min(0.2, 1 - categoryScore) // Assume 20% max improvement
  const estimatedValueImpact = valueGap * categoryWeight * potentialScoreImprovement

  const categoryNames: Record<BriCategory, string> = {
    FINANCIAL: 'Financial Performance',
    TRANSFERABILITY: 'Business Transferability',
    OPERATIONAL: 'Operational Excellence',
    MARKET: 'Market Position',
    LEGAL_TAX: 'Legal & Tax Structure',
    PERSONAL: 'Personal Readiness',
  }

  return {
    recommendedCategory: targetCategory,
    reason: `${categoryNames[targetCategory]} has your lowest BRI score (${(categoryScore * 100).toFixed(0)}%) and represents ${(categoryWeight * 100).toFixed(0)}% of your overall BRI.`,
    estimatedImpact: `Improving this area could reduce your value gap by up to $${(estimatedValueImpact / 1000).toFixed(0)}K`,
  }
}
