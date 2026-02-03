import { generateJSON } from './anthropic'

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial Health',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  FINANCIAL: 'revenue consistency, profit margins, financial records, and cash flow management',
  TRANSFERABILITY: 'owner dependency, business documentation, key person risk, and succession planning',
  OPERATIONAL: 'processes, systems, technology, employee training, and scalability',
  MARKET: 'competitive positioning, customer concentration, market trends, and growth potential',
  LEGAL_TAX: 'contracts, compliance, intellectual property, regulatory requirements, and tax efficiency',
  PERSONAL: 'owner readiness, retirement planning, life after exit, and family considerations',
}

interface RiskQuestion {
  id: string
  category: string
  question: string
  options: { id: string; text: string }[]
  riskContext: string
}

interface RiskQuestionsResult {
  questions: RiskQuestion[]
}

const RISK_QUESTIONS_SYSTEM = `You are a business exit readiness expert helping assess specific risks in a business.

You will receive:
1. A business description (what the business does)
2. The industry classification
3. Risk assessment results showing BRI (Buyer Readiness Index) scores by category and value gaps

Your task is to generate 3-5 targeted multiple-choice questions that:
- Focus on the categories with LOW scores (below 70) and HIGH value gaps
- Help understand HOW the identified risks specifically manifest in THIS business
- Are relevant to the business type/industry
- Lead to actionable insights for creating improvement tasks
- Feel conversational and business-owner friendly, not corporate/stiff

For each question:
- Link it to a specific risk category
- Provide context on why this matters for business value
- Include 4 options ranging from "this is a problem" to "we've got this covered"
- Make options specific to the risk, not generic

Return a JSON object with this structure:
{
  "questions": [
    {
      "id": "q1",
      "category": "FINANCIAL",
      "question": "How do you currently track and forecast cash flow?",
      "options": [
        { "id": "a", "text": "We don't track it systematically" },
        { "id": "b", "text": "Basic spreadsheet, updated occasionally" },
        { "id": "c", "text": "Regular tracking in accounting software" },
        { "id": "d", "text": "Detailed forecasting with weekly reviews" }
      ],
      "riskContext": "Buyers value predictable cash flow. Poor tracking makes it hard to demonstrate financial stability."
    }
  ]
}

Rules:
- Only ask about categories with scores BELOW 70
- Maximum 5 questions total
- Minimum 3 questions if there are enough low-scoring categories
- If all scores are above 70, return 0-1 questions about optimization
- Make questions specific to the business type when possible
- Options should reveal the severity of the risk`

export async function generateRiskFocusedQuestions(
  businessDescription: string,
  industry: string,
  riskResults: {
    briScore: number
    categoryScores: Record<string, number>
    valueGapByCategory: Record<string, number>
  }
): Promise<{ data: RiskQuestionsResult; usage: { inputTokens: number; outputTokens: number } }> {
  // Identify low-scoring categories (below 70)
  const lowScoringCategories = Object.entries(riskResults.categoryScores)
    .filter(([_, score]) => score < 70)
    .sort((a, b) => {
      // Sort by value gap (highest first)
      const gapA = riskResults.valueGapByCategory[a[0]] || 0
      const gapB = riskResults.valueGapByCategory[b[0]] || 0
      return gapB - gapA
    })
    .map(([category, score]) => ({
      category,
      label: CATEGORY_LABELS[category] || category,
      description: CATEGORY_DESCRIPTIONS[category] || '',
      score: Math.round(score),
      valueGap: riskResults.valueGapByCategory[category] || 0,
    }))

  // Build the prompt
  const prompt = `Business Description:
${businessDescription || 'Not provided'}

Industry: ${industry || 'Not specified'}

Overall BRI Score: ${Math.round(riskResults.briScore)}

Risk Assessment Results:
${Object.entries(riskResults.categoryScores)
  .map(([category, score]) => {
    const valueGap = riskResults.valueGapByCategory[category] || 0
    return `- ${CATEGORY_LABELS[category] || category}: Score ${Math.round(score)}/100${valueGap > 0 ? ` (value gap: $${valueGap.toLocaleString()})` : ''}`
  })
  .join('\n')}

Categories Needing Attention (score < 70):
${lowScoringCategories.length > 0
  ? lowScoringCategories.map(c => `- ${c.label} (${c.score}/100): ${c.description}`).join('\n')
  : 'All categories are scoring well (70+)'}

Generate targeted questions to understand how these risks manifest in this specific business.`

  const result = await generateJSON<RiskQuestionsResult>(
    prompt,
    RISK_QUESTIONS_SYSTEM,
    {
      model: 'claude-haiku',
      temperature: 0.7,
      maxTokens: 2048,
    }
  )

  // Ensure each question has the required structure
  const validatedQuestions = (result.data.questions || []).map((q, index) => ({
    id: q.id || `q${index + 1}`,
    category: q.category || 'OPERATIONAL',
    question: q.question || '',
    options: (q.options || []).map((opt, optIndex) => ({
      id: opt.id || String.fromCharCode(97 + optIndex), // a, b, c, d
      text: opt.text || '',
    })),
    riskContext: q.riskContext || '',
  }))

  return {
    data: { questions: validatedQuestions },
    usage: result.usage,
  }
}
