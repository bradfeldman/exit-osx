import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { generateJSON } from '@/lib/ai/anthropic'
import { getCurrentDossier } from './build-dossier'
import type {
  CompanyDossierContent,
  QuestionGenerationResult,
  AIGeneratedQuestion,
} from './types'
import type { BriCategory } from '@prisma/client'

// Question distribution matching BRI weights
const QUESTIONS_PER_CATEGORY: Record<string, number> = {
  FINANCIAL: 7,
  TRANSFERABILITY: 6,
  OPERATIONAL: 6,
  MARKET: 5,
  LEGAL_TAX: 3,
  PERSONAL: 3,
}

const IMPACT_RANGES: Record<string, { min: number; max: number }> = {
  CRITICAL: { min: 12, max: 15 },
  SIGNIFICANT: { min: 8, max: 12 },
  OPTIMIZATION: { min: 5, max: 8 },
}

function buildSystemPrompt(): string {
  return `You are a Business Readiness Index (BRI) question generator for Exit OSx, a platform that helps business owners prepare for a company exit or sale.

Your job is to generate exactly 30 assessment questions tailored to a specific company based on its dossier data. These questions are used to calculate a BRI score across 6 categories: FINANCIAL, TRANSFERABILITY, OPERATIONAL, MARKET, LEGAL_TAX, PERSONAL.

RULES:
1. Generate questions distributed as follows: FINANCIAL=7, TRANSFERABILITY=6, OPERATIONAL=6, MARKET=5, LEGAL_TAX=3, PERSONAL=3 (total=30)
2. Each question MUST have exactly 4 answer options
3. Option scoreValues MUST be exactly: 0.00, 0.33, 0.67, 1.00 (worst to best)
4. Options must be mutually exclusive and collectively exhaustive
5. Options must progress from worst case to best case
6. Questions must be SPECIFIC to the company's industry, size, and situation
7. Do NOT ask about things the dossier already clearly answers — probe areas of weakness, gaps, or uncertainty
8. Prioritize the weakest BRI categories for harder/more revealing questions
9. Each question needs an issueTier: CRITICAL (deal-killers), SIGNIFICANT (major value drivers), or OPTIMIZATION (nice-to-have)
10. maxImpactPoints range: CRITICAL=12-15, SIGNIFICANT=8-12, OPTIMIZATION=5-8
11. Include a buyerLogic field (max 200 chars) explaining why a buyer cares about this
12. Include a riskDriverName (short label for the risk dimension being assessed)
13. Include a helpText explaining what the question is really asking and why it matters

Return valid JSON matching this exact structure:
{
  "questions": [
    {
      "questionText": "string",
      "helpText": "string",
      "buyerLogic": "string (max 200 chars)",
      "briCategory": "FINANCIAL|TRANSFERABILITY|OPERATIONAL|MARKET|LEGAL_TAX|PERSONAL",
      "issueTier": "CRITICAL|SIGNIFICANT|OPTIMIZATION",
      "maxImpactPoints": number,
      "riskDriverName": "string",
      "displayOrder": number,
      "options": [
        { "optionText": "string", "scoreValue": 0.00, "displayOrder": 1 },
        { "optionText": "string", "scoreValue": 0.33, "displayOrder": 2 },
        { "optionText": "string", "scoreValue": 0.67, "displayOrder": 3 },
        { "optionText": "string", "scoreValue": 1.00, "displayOrder": 4 }
      ]
    }
  ],
  "reasoning": "Brief explanation of the question strategy"
}`
}

function buildUserPrompt(dossier: CompanyDossierContent): string {
  const { identity, financials, assessment, valuation, tasks, evidence, signals, engagement, aiContext } = dossier

  const parts: string[] = []

  parts.push(`COMPANY DOSSIER:`)
  parts.push(`Company: ${identity.name}`)
  parts.push(`Industry: ${identity.industry} > ${identity.subSector}`)
  if (identity.businessDescription) {
    parts.push(`Description: ${identity.businessDescription}`)
  }
  if (identity.coreFactors) {
    parts.push(`Revenue Model: ${identity.coreFactors.revenueModel}`)
    parts.push(`Owner Involvement: ${identity.coreFactors.ownerInvolvement}`)
    parts.push(`Labor Intensity: ${identity.coreFactors.laborIntensity}`)
  }

  parts.push(`\nFINANCIALS:`)
  parts.push(`Revenue: $${financials.annualRevenue.toLocaleString()}`)
  parts.push(`EBITDA: $${financials.annualEbitda.toLocaleString()}`)
  if (financials.revenueGrowthYoY !== null) {
    parts.push(`Revenue Growth YoY: ${(financials.revenueGrowthYoY * 100).toFixed(1)}%`)
  }
  if (financials.ebitdaMarginPct !== null) {
    parts.push(`EBITDA Margin: ${(financials.ebitdaMarginPct * 100).toFixed(1)}%`)
  }
  parts.push(`Financial Data Completeness: ${financials.dataCompleteness}`)

  if (assessment.hasCompletedAssessment) {
    parts.push(`\nASSESSMENT (previous):`)
    for (const [cat, score] of Object.entries(assessment.categoryScores)) {
      parts.push(`  ${cat}: ${(score * 100).toFixed(0)}/100`)
    }
    if (assessment.weakestCategories.length > 0) {
      parts.push(`Weakest categories: ${assessment.weakestCategories.join(', ')}`)
    }
    if (assessment.weakestDrivers.length > 0) {
      parts.push(`Weakest risk drivers:`)
      for (const d of assessment.weakestDrivers.slice(0, 5)) {
        parts.push(`  - ${d.riskDriverName ?? d.questionText} (${d.category}: ${(d.scoreValue * 100).toFixed(0)}%)`)
      }
    }
  }

  if (valuation.currentValue !== null) {
    parts.push(`\nVALUATION:`)
    parts.push(`Current: $${valuation.currentValue.toLocaleString()}`)
    parts.push(`Potential: $${valuation.potentialValue!.toLocaleString()}`)
    parts.push(`Gap: $${valuation.valueGap!.toLocaleString()}`)
    parts.push(`BRI Score: ${((valuation.briScore ?? 0) * 100).toFixed(0)}/100`)
  }

  parts.push(`\nTASKS: ${tasks.completedCount} completed, ${tasks.pendingCount} pending`)
  parts.push(`EVIDENCE: ${evidence.totalDocuments} documents, gaps in: ${evidence.categoryGaps.join(', ') || 'none'}`)
  parts.push(`SIGNALS: ${signals.openSignalsCount} open (${Object.entries(signals.severitySummary).map(([k,v]) => `${k}:${v}`).join(', ') || 'none'})`)
  parts.push(`ENGAGEMENT: ${engagement.daysSinceLastActivity} days since last activity, ${engagement.checkInStreak} check-in streak`)

  if (aiContext.focusAreas.length > 0) {
    parts.push(`\nFOCUS AREAS (weakest BRI categories): ${aiContext.focusAreas.join(', ')}`)
  }
  if (aiContext.identifiedRisks.length > 0) {
    parts.push(`IDENTIFIED RISKS: ${aiContext.identifiedRisks.slice(0, 5).join('; ')}`)
  }

  parts.push(`\nGenerate 30 BRI assessment questions tailored to this company. Focus on probing weaknesses and gaps.`)

  return parts.join('\n')
}

function validateQuestions(questions: AIGeneratedQuestion[]): string | null {
  if (questions.length !== 30) {
    return `Expected 30 questions, got ${questions.length}`
  }

  // Check category distribution
  const catCounts: Record<string, number> = {}
  for (const q of questions) {
    catCounts[q.briCategory] = (catCounts[q.briCategory] || 0) + 1
  }

  for (const [cat, expected] of Object.entries(QUESTIONS_PER_CATEGORY)) {
    if ((catCounts[cat] || 0) !== expected) {
      return `Category ${cat}: expected ${expected} questions, got ${catCounts[cat] || 0}`
    }
  }

  // Check each question
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (q.options.length !== 4) {
      return `Question ${i + 1}: expected 4 options, got ${q.options.length}`
    }
    const scores = q.options.map(o => o.scoreValue).sort((a, b) => a - b)
    if (scores[0] !== 0 || scores[3] !== 1) {
      return `Question ${i + 1}: invalid score range [${scores.join(', ')}]`
    }

    const range = IMPACT_RANGES[q.issueTier]
    if (!range) {
      return `Question ${i + 1}: unknown issueTier "${q.issueTier}"`
    }
    if (q.maxImpactPoints < range.min || q.maxImpactPoints > range.max) {
      return `Question ${i + 1}: maxImpactPoints ${q.maxImpactPoints} out of range [${range.min}-${range.max}] for tier ${q.issueTier}`
    }
  }

  return null
}

/**
 * Generate AI-tailored BRI questions for a company based on its dossier.
 * Deactivates old AI questions and creates new ones.
 */
export async function generateQuestionsForCompany(companyId: string) {
  const dossier = await getCurrentDossier(companyId)
  if (!dossier) {
    throw new Error(`No dossier found for company ${companyId}`)
  }

  const content = dossier.content as unknown as CompanyDossierContent
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(content)

  const startTime = Date.now()

  const { data, usage } = await generateJSON<QuestionGenerationResult>(
    userPrompt,
    systemPrompt,
    { model: 'claude-sonnet', maxTokens: 16384, temperature: 0.7 }
  )

  const latencyMs = Date.now() - startTime

  // Validate output
  const validationError = validateQuestions(data.questions)
  if (validationError) {
    // Log the failure with specific reason
    await prisma.aIGenerationLog.create({
      data: {
        companyId,
        generationType: 'dossier_bri_questions',
        inputData: { dossierVersion: dossier.version },
        outputData: data as unknown as Prisma.InputJsonValue,
        modelUsed: 'claude-sonnet',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs,
        errorMessage: `Validation failed: ${validationError}`,
      },
    })
    throw new Error(`AI question generation failed validation: ${validationError}`)
  }

  // Deactivate old AI questions for this company
  await prisma.question.updateMany({
    where: { companyId, isActive: true },
    data: { isActive: false },
  })

  // Create new questions with options
  const createdQuestionIds: string[] = []

  for (const q of data.questions) {
    const question = await prisma.question.create({
      data: {
        companyId,
        briCategory: q.briCategory as BriCategory,
        issueTier: q.issueTier,
        questionText: q.questionText,
        helpText: q.helpText,
        buyerLogic: q.buyerLogic.slice(0, 200),
        displayOrder: q.displayOrder,
        maxImpactPoints: q.maxImpactPoints,
        isActive: true,
        riskDriverName: q.riskDriverName,
        options: {
          create: q.options.map(o => ({
            optionText: o.optionText,
            scoreValue: o.scoreValue,
            displayOrder: o.displayOrder,
          })),
        },
      },
    })
    createdQuestionIds.push(question.id)
  }

  // Log success
  await prisma.aIGenerationLog.create({
    data: {
      companyId,
      generationType: 'dossier_bri_questions',
      inputData: { dossierVersion: dossier.version },
      outputData: { questionCount: createdQuestionIds.length, reasoning: data.reasoning },
      modelUsed: 'claude-sonnet',
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      latencyMs,
    },
  })

  return { questionIds: createdQuestionIds, reasoning: data.reasoning }
}
