import { NextResponse } from 'next/server'
import { getFlattenedIndustryOptions, type FlattenedIndustryOption } from '@/lib/data/industries'

// Get all industry options for matching
const allIndustries = getFlattenedIndustryOptions()

// Find industry by GICS sub-industry name
function findByGicsName(
  gics: { sector: string; industryGroup: string; industry: string; subIndustry: string },
  industries: FlattenedIndustryOption[]
): FlattenedIndustryOption | null {
  const subIndustryLower = gics.subIndustry.toLowerCase().trim()

  // Try exact match on sub-sector label first
  let match = industries.find(ind =>
    ind.subSectorLabel.toLowerCase() === subIndustryLower
  )

  // Try contains match
  if (!match) {
    match = industries.find(ind =>
      ind.subSectorLabel.toLowerCase().includes(subIndustryLower) ||
      subIndustryLower.includes(ind.subSectorLabel.toLowerCase())
    )
  }

  // Try matching on industry or sector level
  if (!match) {
    const industryLower = gics.industry.toLowerCase().trim()
    match = industries.find(ind =>
      ind.sectorLabel.toLowerCase().includes(industryLower) ||
      industryLower.includes(ind.sectorLabel.toLowerCase())
    )
  }

  return match || null
}

// Keyword-based matching as fallback
function keywordMatch(description: string): FlattenedIndustryOption | null {
  const descLower = description.toLowerCase()

  // Define keyword mappings to industries
  const keywordMappings: { keywords: string[]; subSector: string }[] = [
    // Healthcare / Medical
    { keywords: ['dental', 'dentist', 'teeth', 'oral', 'mouthguard', 'bruxing', 'orthodont'], subSector: 'MEDICAL_SUPPLIES_SUB' },
    { keywords: ['medical device', 'medical equipment', 'surgical', 'diagnostic'], subSector: 'MEDICAL_EQUIPMENT_SUB' },
    { keywords: ['hospital', 'clinic', 'healthcare facility', 'urgent care'], subSector: 'HEALTHCARE_FACILITIES' },
    { keywords: ['pharmacy', 'pharmaceutical', 'drug', 'medicine'], subSector: 'PHARMA_SUB' },
    { keywords: ['biotech', 'biotechnology', 'gene', 'therapeutic'], subSector: 'BIOTECH_SUB' },

    // Technology
    { keywords: ['software', 'saas', 'app', 'application', 'platform', 'cloud'], subSector: 'ENTERPRISE_SOFTWARE' },
    { keywords: ['it service', 'it consulting', 'technology consulting', 'managed service'], subSector: 'IT_CONSULTING' },
    { keywords: ['data processing', 'data center', 'hosting'], subSector: 'DATA_PROCESSING' },
    { keywords: ['computer', 'hardware', 'server', 'networking'], subSector: 'COMPUTER_HARDWARE' },

    // Manufacturing / Industrial
    { keywords: ['manufacture', 'manufacturing', 'factory', 'production', 'fabricat'], subSector: 'INDUSTRIAL_MACHINERY' },
    { keywords: ['construction', 'building', 'contractor', 'renovation'], subSector: 'CONSTRUCTION_SERVICES' },
    { keywords: ['aerospace', 'aviation', 'aircraft', 'defense'], subSector: 'AEROSPACE_DEFENSE_SUB' },
    { keywords: ['electrical', 'wiring', 'circuit', 'power equipment'], subSector: 'ELECTRICAL_COMPONENTS' },

    // Retail
    { keywords: ['retail', 'store', 'shop', 'ecommerce', 'e-commerce', 'online store'], subSector: 'SPECIALTY_STORES' },
    { keywords: ['clothing', 'apparel', 'fashion', 'garment'], subSector: 'APPAREL_RETAIL' },
    { keywords: ['home improvement', 'hardware store', 'lumber'], subSector: 'HOME_IMPROVEMENT' },

    // Food & Beverage
    { keywords: ['restaurant', 'food service', 'dining', 'cafe', 'catering'], subSector: 'RESTAURANTS' },
    { keywords: ['food production', 'food manufacturing', 'packaged food', 'snack'], subSector: 'PACKAGED_FOODS' },
    { keywords: ['brewery', 'beer', 'brewing'], subSector: 'BREWERS' },
    { keywords: ['winery', 'wine', 'distillery', 'spirits', 'liquor'], subSector: 'DISTILLERS_VINTNERS' },

    // Services
    { keywords: ['consulting', 'advisory', 'professional service', 'management consulting'], subSector: 'PROFESSIONAL_SERVICES' },
    { keywords: ['staffing', 'recruiting', 'employment', 'hr service', 'temp agency'], subSector: 'STAFFING' },
    { keywords: ['marketing', 'advertising', 'digital marketing', 'agency'], subSector: 'ADVERTISING' },
    { keywords: ['security', 'guard', 'alarm', 'surveillance'], subSector: 'SECURITY_ALARM' },
    { keywords: ['cleaning', 'janitorial', 'facilities', 'maintenance'], subSector: 'ENVIRONMENTAL_SERVICES' },
    { keywords: ['printing', 'print shop', 'graphics'], subSector: 'COMMERCIAL_PRINTING' },

    // Transportation & Logistics
    { keywords: ['trucking', 'freight', 'shipping', 'logistics', 'delivery'], subSector: 'TRUCKING' },
    { keywords: ['airline', 'aviation', 'flight'], subSector: 'AIRLINES' },

    // Real Estate
    { keywords: ['real estate', 'property', 'brokerage', 'realtor'], subSector: 'REAL_ESTATE_BROKERAGE' },
    { keywords: ['property management', 'landlord', 'rental'], subSector: 'PROPERTY_MANAGEMENT' },

    // Financial Services
    { keywords: ['accounting', 'bookkeeping', 'tax preparation', 'cpa'], subSector: 'PROFESSIONAL_SERVICES' },
    { keywords: ['insurance', 'insurance agency', 'insurance broker'], subSector: 'PROPERTY_CASUALTY' },
    { keywords: ['investment', 'wealth management', 'financial advisor'], subSector: 'ASSET_MANAGEMENT' },
    { keywords: ['mortgage', 'lending', 'loan'], subSector: 'MORTGAGE_FINANCE_SUB' },
    { keywords: ['payment', 'payment processing', 'merchant services'], subSector: 'TRANSACTION_PROCESSING' },

    // Automotive
    { keywords: ['auto repair', 'car repair', 'mechanic', 'collision', 'body shop'], subSector: 'AUTO_SERVICE' },
    { keywords: ['car dealer', 'auto dealer', 'vehicle sales'], subSector: 'AUTO_RETAIL' },
    { keywords: ['auto parts', 'car parts', 'automotive parts'], subSector: 'AUTO_PARTS_SUB' },

    // Travel & Hospitality
    { keywords: ['hotel', 'motel', 'lodging', 'hospitality', 'resort'], subSector: 'HOTELS_MOTELS' },
    { keywords: ['travel', 'travel agency', 'tour', 'vacation'], subSector: 'TRAVEL_SERVICES' },

    // Media & Entertainment
    { keywords: ['media', 'content', 'entertainment', 'film', 'video production'], subSector: 'ENTERTAINMENT_PROD' },
    { keywords: ['publishing', 'publisher', 'magazine', 'newspaper'], subSector: 'PUBLISHING_SUB' },

    // Consumer Products
    { keywords: ['furniture', 'home furnishing', 'decor'], subSector: 'HOME_FURNISHINGS' },
    { keywords: ['appliance', 'household appliance'], subSector: 'HOUSEHOLD_APPLIANCES' },
    { keywords: ['toy', 'game', 'recreational', 'sporting goods'], subSector: 'RECREATIONAL_PRODUCTS' },
    { keywords: ['consumer electronics', 'gadget'], subSector: 'CONSUMER_ELECTRONICS' },

    // Energy
    { keywords: ['solar', 'wind', 'renewable', 'green energy'], subSector: 'RENEWABLE_ENERGY' },
    { keywords: ['oil', 'gas', 'petroleum', 'fuel'], subSector: 'OIL_GAS_EXPLORATION' },
  ]

  // Find the best match
  let bestMatch: { subSector: string; score: number } | null = null

  for (const mapping of keywordMappings) {
    let score = 0
    for (const keyword of mapping.keywords) {
      if (descLower.includes(keyword)) {
        score += keyword.length // Longer keywords = more specific = higher score
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
  try {
    const body = await request.json()
    const { description } = body

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Try OpenAI-based matching if API key is available
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: `You are an industry classification expert for business valuation purposes. Given a business description, classify it using the Global Industry Classification Standard (GICS).

Return ONLY this JSON (no markdown, no code blocks):
{"sector": "GICS Sector", "industryGroup": "GICS Industry Group", "industry": "GICS Industry", "subIndustry": "GICS Sub-Industry", "confidence": "high|medium|low", "reasoning": "brief explanation"}`
              },
              {
                role: 'user',
                content: `Classify this business: "${description}"`
              }
            ],
            temperature: 0.3,
            max_tokens: 200,
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

              const gicsResult = JSON.parse(jsonContent)

              // Find matching industry by GICS name
              const matchedIndustry = findByGicsName(gicsResult, allIndustries)

              if (matchedIndustry) {
                return NextResponse.json({
                  match: {
                    ...matchedIndustry,
                    confidence: gicsResult.confidence || 'medium',
                    reasoning: `GICS: ${gicsResult.subIndustry}. ${gicsResult.reasoning || ''}`,
                  },
                  source: 'ai',
                })
              }
            } catch {
              // JSON parsing failed, fall through to keyword matching
              console.error('Failed to parse OpenAI response:', content)
            }
          }
        }
      } catch (aiError) {
        console.error('OpenAI API error:', aiError)
        // Fall through to keyword matching
      }
    }

    // Fallback to keyword-based matching
    const keywordResult = keywordMatch(description)

    if (keywordResult) {
      return NextResponse.json({
        match: {
          ...keywordResult,
          confidence: 'medium',
          reasoning: 'Based on keyword analysis of your business description.',
        },
        source: 'keyword',
      })
    }

    // Default to a general category if no match found
    const defaultIndustry = allIndustries.find(ind => ind.icbSubSector === 'PROFESSIONAL_SERVICES')

    if (defaultIndustry) {
      return NextResponse.json({
        match: {
          ...defaultIndustry,
          confidence: 'low',
          reasoning: 'Unable to find a specific match. Professional Services is suggested as a general category. You may want to search manually for a more specific classification.',
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
