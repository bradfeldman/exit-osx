import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { parseInput, parseBulkInput, parseVCard, parseLinkedInUrl } from '@/lib/contact-system/smart-parser'
import { findCompanyMatches, findPersonMatches } from '@/lib/contact-system/identity-resolution'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const postSchema = z.object({
  text: z.string().min(1, 'Text input is required').max(50000),
  format: z.enum(['auto', 'vcard', 'bulk']).default('auto'),
  includeMatches: z.boolean().default(true),
})

/**
 * POST /api/canonical/parse
 * Parse unstructured text and extract contact information.
 * Returns parsed data with potential matches against existing records.
 */
export async function POST(request: NextRequest) {
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  const validation = await validateRequestBody(request, postSchema)
  if (!validation.success) return validation.error
  const { text, format, includeMatches } = validation.data

  try {

    // Detect format and parse
    let parsed

    if (format === 'vcard' || text.includes('BEGIN:VCARD')) {
      // Parse as vCard
      const person = parseVCard(text)
      if (person) {
        parsed = {
          people: [person],
          companies: [],
          emails: person.email ? [person.email] : [],
          phones: person.phone ? [person.phone] : [],
          urls: [],
          linkedInUrls: person.linkedInUrl ? [person.linkedInUrl] : [],
          domains: [],
          raw: text,
        }
      } else {
        parsed = parseInput(text) // Fallback
      }
    } else if (format === 'bulk' || text.includes('\n\n') || text.includes(',') && text.includes('\n')) {
      // Parse as bulk input (CSV or multi-block)
      const results = parseBulkInput(text)
      // Combine results
      parsed = {
        entries: results,
        people: results.flatMap(r => r.people),
        companies: results.flatMap(r => r.companies),
        emails: [...new Set(results.flatMap(r => r.emails))],
        phones: [...new Set(results.flatMap(r => r.phones))],
        urls: [...new Set(results.flatMap(r => r.urls))],
        linkedInUrls: [...new Set(results.flatMap(r => r.linkedInUrls))],
        domains: [...new Set(results.flatMap(r => r.domains))],
        raw: text,
      }
    } else {
      // Default: parse as single input
      parsed = parseInput(text)
    }

    // Find matches against existing canonical records
    const matches: {
      companies: Array<{
        input: unknown
        match: Awaited<ReturnType<typeof findCompanyMatches>>
      }>
      people: Array<{
        input: unknown
        match: Awaited<ReturnType<typeof findPersonMatches>>
      }>
    } = {
      companies: [],
      people: [],
    }

    if (includeMatches) {
      // Match companies
      for (const company of parsed.companies) {
        const match = await findCompanyMatches({
          name: company.name,
          domain: company.domain,
          website: company.website,
          linkedInUrl: company.linkedInUrl,
        })
        matches.companies.push({ input: company, match })
      }

      // Match people
      for (const person of parsed.people) {
        const match = await findPersonMatches({
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email || undefined,
          linkedInUrl: person.linkedInUrl || undefined,
          companyName: person.company || undefined,
          title: person.title || undefined,
        })
        matches.people.push({ input: person, match })
      }
    }

    return NextResponse.json({
      parsed,
      matches: includeMatches ? matches : undefined,
      summary: {
        peopleFound: parsed.people.length,
        companiesFound: parsed.companies.length,
        emailsFound: parsed.emails.length,
        phonesFound: parsed.phones.length,
        linkedInUrlsFound: parsed.linkedInUrls.length,
        potentialDuplicates: matches.companies.filter(m => m.match.suggestedAction !== 'CREATE_NEW').length +
          matches.people.filter(m => m.match.suggestedAction !== 'CREATE_NEW').length,
      },
    })
  } catch (error) {
    console.error('Error parsing input:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/canonical/parse/linkedin
 * Parse a LinkedIn URL to extract type and identifier
 */
export async function GET(request: NextRequest) {
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    const parsed = parseLinkedInUrl(url)

    return NextResponse.json({
      ...parsed,
      originalUrl: url,
    })
  } catch (error) {
    console.error('Error parsing LinkedIn URL:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
