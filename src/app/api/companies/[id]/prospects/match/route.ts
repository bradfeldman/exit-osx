import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { BuyerProspect } from '@prisma/client'

interface MatchResult {
  prospect: BuyerProspect
  confidence: 'exact' | 'high' | 'low'
  matchedOn: 'domain' | 'company_name'
}

/**
 * Extract domain from email address
 */
function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/)
  if (!match) return null

  let domain = match[1].toLowerCase()
  if (domain.startsWith('www.')) {
    domain = domain.substring(4)
  }
  return domain
}

/**
 * GET /api/companies/[id]/prospects/match
 * Match an email or company name to existing prospects
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const companyName = searchParams.get('companyName')

    if (!email && !companyName) {
      return NextResponse.json(
        { error: 'email or companyName is required' },
        { status: 400 }
      )
    }

    const matches: MatchResult[] = []
    let exactMatch: BuyerProspect | null = null

    // Try email domain matching first
    if (email) {
      const emailDomain = extractDomainFromEmail(email)

      if (emailDomain) {
        // Find prospects with matching domain
        const domainMatches = await prisma.buyerProspect.findMany({
          where: {
            companyId,
            domain: emailDomain,
          },
        })

        for (const prospect of domainMatches) {
          // Exact domain match is highest confidence
          if (!exactMatch) {
            exactMatch = prospect
          }
          matches.push({
            prospect,
            confidence: 'exact',
            matchedOn: 'domain',
          })
        }
      }
    }

    // Try company name matching (fuzzy)
    if (companyName && matches.length === 0) {
      // First try exact match
      const exactNameMatch = await prisma.buyerProspect.findFirst({
        where: {
          companyId,
          name: { equals: companyName, mode: 'insensitive' },
        },
      })

      if (exactNameMatch) {
        if (!exactMatch) {
          exactMatch = exactNameMatch
        }
        matches.push({
          prospect: exactNameMatch,
          confidence: 'exact',
          matchedOn: 'company_name',
        })
      } else {
        // Try partial match
        const partialMatches = await prisma.buyerProspect.findMany({
          where: {
            companyId,
            name: { contains: companyName, mode: 'insensitive' },
          },
          take: 5,
        })

        for (const prospect of partialMatches) {
          // Calculate rough similarity
          const similarity = calculateSimilarity(
            prospect.name.toLowerCase(),
            companyName.toLowerCase()
          )

          matches.push({
            prospect,
            confidence: similarity > 0.7 ? 'high' : 'low',
            matchedOn: 'company_name',
          })
        }
      }
    }

    // If still no matches, try extracting company name from email domain
    if (matches.length === 0 && email) {
      const emailDomain = extractDomainFromEmail(email)
      if (emailDomain) {
        // Extract likely company name from domain (e.g., "acme" from "acme.com")
        const domainParts = emailDomain.split('.')
        const likelyCompanyName = domainParts[0]

        if (likelyCompanyName.length > 2) {
          const domainNameMatches = await prisma.buyerProspect.findMany({
            where: {
              companyId,
              name: { contains: likelyCompanyName, mode: 'insensitive' },
            },
            take: 5,
          })

          for (const prospect of domainNameMatches) {
            matches.push({
              prospect,
              confidence: 'low',
              matchedOn: 'company_name',
            })
          }
        }
      }
    }

    // Sort by confidence (exact > high > low)
    const confidenceOrder = { exact: 0, high: 1, low: 2 }
    matches.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence])

    return NextResponse.json({
      matches,
      exactMatch,
    })
  } catch (error) {
    console.error('Error matching prospects:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Simple string similarity calculation (Jaccard-like)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(''))
  const set2 = new Set(str2.split(''))

  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])

  return intersection.size / union.size
}
