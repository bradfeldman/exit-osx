import { generateJSON } from './anthropic'
import type { BusinessProfile, ClarifyingQuestionsResult } from './types'

const CLARIFYING_QUESTIONS_SYSTEM = `You are building a business profile to create a personalized improvement plan for small businesses preparing for sale or seeking to increase their value.

Your job is to:
1. Analyze what's already clear from the user's business description
2. Generate 3-5 multiple choice questions to fill in the gaps

Key information needed:
- Biggest operational pain point
- Documentation/process maturity
- Owner dependency level
- Team structure and dynamics
- Technology they use
- Primary goal (growth, profitability, exit readiness)

Rules:
- Skip questions if already answered in the description
- Keep questions conversational, not corporate
- Each question should have 3-4 options plus ability for "Something else"
- Maximum 5 questions
- Questions should feel relevant to THEIR specific business type`

const PROFILE_GENERATION_SYSTEM = `You are building a structured business profile from a business description and Q&A responses.

Create a complete, accurate profile that captures:
- Business type and characteristics
- Team structure and owner involvement
- Services offered
- Technology in use
- Pain points and constraints
- Primary goals

Be specific and accurate based on the information provided. Don't make assumptions beyond what's stated.`

export async function generateClarifyingQuestions(
  businessDescription: string,
  industry: string,
  revenueRange: string
): Promise<{ data: ClarifyingQuestionsResult; usage: { inputTokens: number; outputTokens: number } }> {
  const prompt = `User's business description:
"${businessDescription}"

Industry: ${industry}
Revenue range: ${revenueRange}

Analyze what's already clear from their description, then generate 3-5 multiple choice questions to fill in the gaps.

Return JSON in this exact format:
{
  "alreadyKnown": {
    "teamSize": <number or null>,
    "services": [<array of services mentioned>],
    "techMentioned": [<any technology mentioned>],
    "ownerRole": "<if mentioned>"
  },
  "questions": [
    {
      "id": "q1",
      "question": "<conversational question>",
      "options": [
        {"id": "a", "text": "<option text>"},
        {"id": "b", "text": "<option text>"},
        {"id": "c", "text": "<option text>"},
        {"id": "d", "text": "Something else"}
      ],
      "allowsOther": true,
      "mapsToProfileField": "<which profile field this answers: painPoints, documentationLevel, ownerDependency, techStack, primaryGoal, team>"
    }
  ]
}`

  return generateJSON<ClarifyingQuestionsResult>(prompt, CLARIFYING_QUESTIONS_SYSTEM, {
    model: 'claude-haiku',
    temperature: 0.7,
  })
}

export async function generateBusinessProfile(
  businessDescription: string,
  industry: string,
  revenueRange: string,
  clarifyingAnswers: Record<string, string>,
  clarifyingQuestions: ClarifyingQuestionsResult['questions']
): Promise<{ data: BusinessProfile; usage: { inputTokens: number; outputTokens: number } }> {
  // Format Q&A for the prompt
  const qaFormatted = clarifyingQuestions
    .map((q) => {
      const answer = clarifyingAnswers[q.id]
      const selectedOption = q.options.find((o) => o.id === answer)
      return `Q: ${q.question}\nA: ${selectedOption?.text || answer || 'Not answered'}`
    })
    .join('\n\n')

  const prompt = `Original business description:
"${businessDescription}"

Industry: ${industry}
Revenue range: ${revenueRange}

Clarifying Q&A:
${qaFormatted}

Build a complete business profile from this information.

Return JSON in this exact format:
{
  "businessType": "<specific type like 'fast-casual restaurant', 'full-service bar', 'food truck'>",
  "cuisine": "<if applicable>",
  "locationType": "<urban, suburban, rural, mall, etc.>",
  "seatingCapacity": <number or null>,
  "team": {
    "total": <number>,
    "ownerWorking": <true/false>,
    "fullTime": <number>,
    "partTime": <number>,
    "keyRoles": ["<role1>", "<role2>"]
  },
  "services": ["<service1>", "<service2>"],
  "hours": "<description of hours>",
  "techStack": {
    "pos": "<system name or null>",
    "inventory": "<system name or null>",
    "scheduling": "<system name or null>",
    "delivery": "<platforms or null>"
  },
  "yearsInBusiness": <number or null>,
  "painPoints": ["<pain1>", "<pain2>"],
  "documentationLevel": "<none|minimal|partial|good|excellent>",
  "ownerDependency": "<critical|high|moderate|low>",
  "primaryGoal": "<their main goal>",
  "constraints": ["<constraint1>", "<constraint2>"],
  "uniqueFactors": ["<unique1>", "<unique2>"]
}`

  return generateJSON<BusinessProfile>(prompt, PROFILE_GENERATION_SYSTEM, {
    model: 'claude-sonnet',
    temperature: 0.5,
  })
}
