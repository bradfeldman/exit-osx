import { generateJSON } from './anthropic'

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial Health',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

interface OnboardingTask {
  title: string
  description: string
  category: string
  estimatedValue: number
  estimatedHours: number
}

interface OnboardingTasksResult {
  tasks: OnboardingTask[]
}

const ONBOARDING_TASKS_SYSTEM = `You are a business exit readiness expert creating the first month's actionable improvement tasks.

The theme for this month is: "Understand what your business is worth."

You will receive:
1. A business description
2. Industry classification
3. Risk assessment results (BRI scores and value gaps by category)
4. Answers to follow-up risk questions (if provided)

You MUST generate exactly these 5 curated first-month tasks, in this order. Personalize the descriptions to the specific business and industry when possible, but keep the titles and structure:

1. Upload last 3 years of financial statements
   - category: FINANCIAL
   - description: Upload your P&L statements, balance sheets, and tax returns for the last 3 fiscal years to the Evidence Room. These are the foundation of any business valuation and the first thing a buyer or advisor will request.
   - estimatedHours: 2

2. Connect QuickBooks
   - category: FINANCIAL
   - description: Connect your QuickBooks account to automatically sync your financial data. This saves hours of manual data entry and keeps your financials up to date for accurate, real-time valuations.
   - estimatedHours: 1

3. Complete baseline category assessments
   - category: OPERATIONAL
   - description: Complete the diagnostic assessments across all six BRI categories (Financial, Transferability, Operations, Market, Legal & Tax, Personal Readiness). This establishes your baseline scores and identifies the highest-impact areas to improve.
   - estimatedHours: 2

4. Review retirement readiness
   - category: PERSONAL
   - description: Complete the Personal Financial Statement and run the Retirement Calculator to understand your post-exit financial needs. Knowing your "number" helps determine your minimum acceptable deal structure.
   - estimatedHours: 1

5. Set your exit timeline goal
   - category: PERSONAL
   - description: Define your target exit date, minimum acceptable price, and preferred deal structure. This anchors every recommendation and task prioritization to your personal goals.
   - estimatedHours: 1

For each task, estimate the value impact based on the business's value gap in that category (5-20% of the category's value gap).

Return a JSON object with this structure:
{
  "tasks": [
    {
      "title": "Upload last 3 years of financial statements",
      "description": "Upload your P&L statements...",
      "category": "FINANCIAL",
      "estimatedValue": 25000,
      "estimatedHours": 2
    }
  ]
}

Rules:
- Generate exactly 5 tasks in the order shown above
- Keep the titles exactly as specified
- Personalize descriptions to the business type and industry
- Value impact should be realistic (5-20% of the category's value gap)
- IMPORTANT: category MUST be exactly one of: FINANCIAL, TRANSFERABILITY, OPERATIONAL, MARKET, LEGAL_TAX, PERSONAL`

export async function generateOnboardingTasks(
  businessDescription: string,
  industry: string,
  riskResults: {
    briScore: number
    categoryScores: Record<string, number>
    valueGapByCategory: Record<string, number>
  },
  riskQuestionAnswers: Record<string, string>
): Promise<{ data: OnboardingTasksResult; usage: { inputTokens: number; outputTokens: number } }> {
  // Sort categories by value gap (highest first) and filter to low-scoring ones
  const prioritizedCategories = Object.entries(riskResults.categoryScores)
    .map(([category, score]) => ({
      category,
      label: CATEGORY_LABELS[category] || category,
      score: Math.round(score),
      valueGap: riskResults.valueGapByCategory[category] || 0,
    }))
    .filter(c => c.score < 70)
    .sort((a, b) => b.valueGap - a.valueGap)

  // Build the prompt
  const prompt = `Business Description:
${businessDescription || 'Not provided'}

Industry: ${industry || 'Not specified'}

Overall BRI Score: ${Math.round(riskResults.briScore)}

Risk Categories (sorted by value impact):
${Object.entries(riskResults.categoryScores)
  .map(([category, score]) => {
    const valueGap = riskResults.valueGapByCategory[category] || 0
    return `- ${CATEGORY_LABELS[category] || category}: Score ${Math.round(score)}/100, Value Gap: $${valueGap.toLocaleString()}`
  })
  .sort((a, b) => {
    const gapA = parseInt(a.match(/\$[\d,]+/)?.[0]?.replace(/[$,]/g, '') || '0')
    const gapB = parseInt(b.match(/\$[\d,]+/)?.[0]?.replace(/[$,]/g, '') || '0')
    return gapB - gapA
  })
  .join('\n')}

Priority Categories (need attention):
${prioritizedCategories.length > 0
  ? prioritizedCategories.map(c => `- ${c.label}: Score ${c.score}, Value Gap $${c.valueGap.toLocaleString()}`).join('\n')
  : 'All categories scoring well'}

${Object.keys(riskQuestionAnswers).length > 0 ? `
Risk Question Responses:
${Object.entries(riskQuestionAnswers).map(([qId, answer]) => `Q${qId}: ${answer}`).join('\n')}
` : ''}

Generate the 5 curated first-month tasks. Personalize descriptions to this specific business. Theme: "This month: Understand what your business is worth."`

  const result = await generateJSON<OnboardingTasksResult>(
    prompt,
    ONBOARDING_TASKS_SYSTEM,
    {
      model: 'claude-sonnet',
      temperature: 0.6,
      maxTokens: 2048,
    }
  )

  // Validate and ensure proper structure
  const validatedTasks = (result.data.tasks || []).map(task => ({
    title: task.title || 'Improvement Task',
    description: task.description || '',
    category: task.category || 'OPERATIONAL',
    estimatedValue: task.estimatedValue || 0,
    estimatedHours: task.estimatedHours || 2,
  }))

  return {
    data: { tasks: validatedTasks },
    usage: result.usage,
  }
}
