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

const ONBOARDING_TASKS_SYSTEM = `You are a business exit readiness expert creating actionable improvement tasks.

You will receive:
1. A business description
2. Industry classification
3. Risk assessment results (BRI scores and value gaps by category)
4. Answers to follow-up risk questions (if provided)

Your task is to generate 3-5 specific, actionable tasks that:
- Target the categories with LOWEST scores and HIGHEST value gaps
- Are achievable in 1-3 hours each
- Have clear, measurable outcomes
- Are specific to the business type when possible
- Show estimated value impact based on the category's value gap

For each task, provide:
- A clear, action-oriented title (start with a verb)
- A detailed description of what to do
- The BRI category it addresses
- Estimated value impact (portion of that category's value gap)
- Estimated time in hours (1-3)

Return a JSON object with this structure:
{
  "tasks": [
    {
      "title": "Document your top 5 customer relationships",
      "description": "Create a document listing your top 5 customers, their annual value, tenure, key contacts, and any risk factors. This reduces buyer concern about customer concentration.",
      "category": "FINANCIAL",
      "estimatedValue": 25000,
      "estimatedHours": 2
    }
  ]
}

Rules:
- Generate exactly 3-5 tasks
- Focus on LOW-SCORING categories (below 70)
- Make tasks specific and actionable
- Each task should take 1-3 hours
- Value impact should be realistic (5-20% of the category's value gap)
- Titles should start with action verbs: Document, Create, Review, Update, Implement, etc.
- Order tasks by potential value impact (highest first)`

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

Generate 3-5 actionable tasks for this week that will have the biggest impact on business value.`

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
