import { NextRequest, NextResponse } from 'next/server'
import { authorizeDealAccess } from '@/lib/deal-tracker/deal-auth'
import { parseInput } from '@/lib/contact-system/smart-parser'
import { findPersonMatches, findCompanyMatches } from '@/lib/contact-system/identity-resolution'
import { inferRoleFromTitle } from '@/lib/contact-system/constants'

/**
 * POST /api/deals/[dealId]/participants/smart-add
 * Parse pasted text and return preview with identity matches.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_VIEW')
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Parse the input text
    const parsed = parseInput(text)

    // Resolve person matches
    const personResults = await Promise.all(
      parsed.people.map(async (person) => {
        const matches = await findPersonMatches({
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email || null,
          linkedInUrl: person.linkedInUrl || null,
        })

        // Infer role from title if available
        const inferredRole = person.title ? inferRoleFromTitle(person.title) : null

        return {
          parsed: person,
          match: matches,
          inferredRole,
        }
      })
    )

    // Resolve company matches
    const companyResults = await Promise.all(
      parsed.companies.map(async (company) => {
        const matches = await findCompanyMatches({
          name: company.name,
          website: company.website || null,
          domain: company.domain || null,
          linkedInUrl: company.linkedInUrl || null,
        })
        return {
          parsed: company,
          match: matches,
        }
      })
    )

    return NextResponse.json({
      parsed,
      people: personResults,
      companies: companyResults,
    })
  } catch (error) {
    console.error('Error in smart-add:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
