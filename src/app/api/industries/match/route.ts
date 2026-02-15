import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFlattenedIndustryOptions, type FlattenedIndustryOption } from '@/lib/data/industries'
import { applyRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'

// Get all industry options for matching
const allIndustries = getFlattenedIndustryOptions()

// Build a simplified list of industries for the AI prompt
function getIndustryListForAI(): string {
  // Group by sector for cleaner display
  const bySector = new Map<string, string[]>()

  for (const ind of allIndustries) {
    const existing = bySector.get(ind.industryLabel) || []
    existing.push(`${ind.subSectorLabel} (${ind.icbSubSector})`)
    bySector.set(ind.industryLabel, existing)
  }

  let result = ''
  for (const [sector, subSectors] of bySector) {
    result += `\n${sector}:\n`
    for (const sub of subSectors) {
      result += `  - ${sub}\n`
    }
  }

  return result
}

// Keyword-based matching as fallback (only used when OpenAI is unavailable)
function keywordMatch(description: string): FlattenedIndustryOption | null {
  const descLower = description.toLowerCase()

  const keywordMappings: { keywords: string[]; subSector: string }[] = [
    { keywords: ['dental', 'dentist', 'teeth', 'oral', 'mouthguard', 'bruxing', 'orthodont'], subSector: 'MEDICAL_SUPPLIES_SUB' },
    { keywords: ['medical device', 'medical equipment', 'surgical', 'diagnostic'], subSector: 'MEDICAL_EQUIPMENT_SUB' },
    { keywords: ['software', 'saas', 'app', 'application', 'platform', 'cloud'], subSector: 'ENTERPRISE_SOFTWARE' },
    { keywords: ['it service', 'it consulting', 'technology consulting', 'managed service'], subSector: 'IT_CONSULTING' },
    { keywords: ['manufacture', 'manufacturing', 'factory', 'production'], subSector: 'INDUSTRIAL_MACHINERY' },
    { keywords: ['construction', 'building', 'contractor', 'renovation'], subSector: 'CONSTRUCTION_SERVICES' },
    { keywords: ['retail', 'store', 'shop', 'ecommerce', 'e-commerce'], subSector: 'SPECIALTY_STORES' },
    { keywords: ['restaurant', 'food service', 'dining', 'cafe', 'catering'], subSector: 'RESTAURANTS' },
    { keywords: ['consulting', 'advisory', 'professional service'], subSector: 'PROFESSIONAL_SERVICES' },
    { keywords: ['staffing', 'recruiting', 'employment', 'hr service'], subSector: 'STAFFING' },
    { keywords: ['marketing', 'advertising', 'digital marketing', 'agency'], subSector: 'ADVERTISING' },
    { keywords: ['trucking', 'freight', 'shipping', 'logistics', 'delivery'], subSector: 'TRUCKING' },
    { keywords: ['real estate', 'property', 'brokerage', 'realtor'], subSector: 'REAL_ESTATE_BROKERAGE' },
    { keywords: ['accounting', 'bookkeeping', 'tax preparation', 'cpa'], subSector: 'PROFESSIONAL_SERVICES' },
    { keywords: ['insurance', 'insurance agency', 'insurance broker'], subSector: 'PROPERTY_CASUALTY' },
    { keywords: ['auto repair', 'car repair', 'mechanic', 'body shop'], subSector: 'AUTO_SERVICE' },
    { keywords: ['hotel', 'motel', 'lodging', 'hospitality', 'resort'], subSector: 'HOTELS_MOTELS' },
    { keywords: ['healthcare', 'clinic', 'medical practice', 'physician'], subSector: 'HEALTHCARE_FACILITIES' },
  ]

  let bestMatch: { subSector: string; score: number } | null = null

  for (const mapping of keywordMappings) {
    let score = 0
    for (const keyword of mapping.keywords) {
      if (descLower.includes(keyword)) {
        score += keyword.length
      }
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { subSector: mapping.subSector, score }
    }
  }

  if (bestMatch) {
    return allIndustries.find(ind => ind.icbSubSector === bestMatch.subSector) || null
  }

  return null
}

export async function POST(request: Request) {
  // SEC-034: Rate limit AI endpoints
  const rl = await applyRateLimit(request, RATE_LIMIT_CONFIGS.AI)
  if (!rl.success) return createRateLimitResponse(rl)

  // SECURITY FIX (PROD-060): Was completely unauthenticated. This endpoint calls OpenAI,
  // so an attacker could abuse it for AI cost amplification. Require auth.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'You must be logged in to use industry matching' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { description } = body

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // ALWAYS try OpenAI first if API key is available
    const openaiKey = process.env.OPENAI_API_KEY

    if (openaiKey) {
      try {
        const industryList = getIndustryListForAI()

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an industry classification expert for business valuation purposes. Given a business description, you must classify it using ONLY the industries from this list:

${industryList}

Return ONLY valid JSON with this exact structure (no markdown, no code blocks, no extra text):
{"icbSubSector": "THE_EXACT_CODE_FROM_THE_LIST", "confidence": "high", "reasoning": "brief explanation"}

The icbSubSector MUST be one of the exact codes shown in parentheses in the list above. Choose the single best match.`
              },
              {
                role: 'user',
                content: `Classify this business: "${description}"`
              }
            ],
            temperature: 0.2,
            max_tokens: 150,
          }),
        })

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json()
          const content = openaiData.choices?.[0]?.message?.content?.trim()

          if (content) {
            try {
              // Strip markdown code blocks if present
              let jsonContent = content
              if (jsonContent.startsWith('```')) {
                jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
              }

              const aiResult = JSON.parse(jsonContent)

              // Find the industry by the exact ICB code
              const matchedIndustry = allIndustries.find(
                ind => ind.icbSubSector === aiResult.icbSubSector
              )

              if (matchedIndustry) {
                return NextResponse.json({
                  match: {
                    ...matchedIndustry,
                    confidence: aiResult.confidence || 'high',
                    reasoning: aiResult.reasoning || 'AI-powered industry classification.',
                  },
                  source: 'ai',
                })
              } else {
                // AI returned an invalid code - log it for debugging
                console.warn('OpenAI returned invalid icbSubSector:', aiResult.icbSubSector)
              }
            } catch (parseError) {
              console.error('Failed to parse OpenAI response:', content, parseError)
            }
          }
        } else {
          const errorData = await openaiResponse.json().catch(() => ({}))
          console.error('OpenAI API error response:', openaiResponse.status, errorData)
        }
      } catch (aiError) {
        console.error('OpenAI API network error:', aiError)
      }
    } else {
      console.warn('OPENAI_API_KEY not configured - using keyword fallback')
    }

    // FALLBACK: Only use keyword matching if OpenAI is unavailable or failed
    console.log('Falling back to keyword matching for:', description.substring(0, 50))
    const keywordResult = keywordMatch(description)

    if (keywordResult) {
      return NextResponse.json({
        match: {
          ...keywordResult,
          confidence: 'medium',
          reasoning: 'Based on keyword analysis (AI unavailable).',
        },
        source: 'keyword',
      })
    }

    // Default to Professional Services if nothing matches
    const defaultIndustry = allIndustries.find(ind => ind.icbSubSector === 'PROFESSIONAL_SERVICES')

    if (defaultIndustry) {
      return NextResponse.json({
        match: {
          ...defaultIndustry,
          confidence: 'low',
          reasoning: 'Unable to find a specific match. You may want to search manually for a more specific classification.',
        },
        source: 'default',
      })
    }

    return NextResponse.json(
      { error: 'Unable to find a matching industry classification' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Error in industry matching:', error)
    return NextResponse.json(
      { error: 'Failed to process industry matching request' },
      { status: 500 }
    )
  }
}
