/**
 * Identity Resolution Engine
 *
 * Detects potential duplicates and matches new records against
 * existing canonical companies and people.
 *
 * Key principles:
 * - High confidence (>=0.95): Auto-link without user intervention
 * - Medium confidence (>=0.70): Suggest to user for confirmation
 * - Low confidence (>=0.50): Save as provisional, flag for review
 * - Below threshold (<0.50): Create as new record
 */

import { prisma } from '@/lib/prisma'
import type { CanonicalCompany, CanonicalPerson, DataQuality } from '@prisma/client'

// ============================================
// TYPES
// ============================================

export interface MatchConfig {
  autoLinkThreshold: number     // >= this: auto-merge
  suggestThreshold: number      // >= this: suggest to user
  provisionalThreshold: number  // >= this: save as provisional
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  autoLinkThreshold: 0.95,
  suggestThreshold: 0.70,
  provisionalThreshold: 0.50,
}

export type MatchType = 'EXACT' | 'HIGH_CONFIDENCE' | 'POSSIBLE' | 'NO_MATCH'

export interface MatchResult<T> {
  matchType: MatchType
  confidence: number
  matchedEntity: T | null
  matchReasons: string[]
  suggestedAction: 'AUTO_LINK' | 'SUGGEST_MERGE' | 'SAVE_PROVISIONAL' | 'CREATE_NEW'
}

export interface CompanyMatchInput {
  name: string
  website?: string | null
  linkedInUrl?: string | null
  domain?: string | null  // Extracted from email
}

export interface PersonMatchInput {
  firstName: string
  lastName: string
  email?: string | null
  linkedInUrl?: string | null
  companyName?: string | null
  title?: string | null
}

// ============================================
// STRING NORMALIZATION
// ============================================

/**
 * Normalize a company name for matching.
 * Removes common suffixes, punctuation, and converts to lowercase.
 */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove common suffixes
    .replace(/\b(inc\.?|incorporated|corp\.?|corporation|llc|llp|ltd\.?|limited|co\.?|company|group|holdings?|partners?|lp|gp)\b/gi, '')
    // Remove "the" prefix
    .replace(/^the\s+/i, '')
    // Remove punctuation
    .replace(/[.,&\-']/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize a person's name for matching.
 */
export function normalizePersonName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
    .toLowerCase()
    .trim()
    // Remove common name suffixes
    .replace(/\b(jr\.?|sr\.?|ii|iii|iv|phd|md|esq\.?)\b/gi, '')
    // Remove punctuation
    .replace(/[.,\-']/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract domain from email address.
 */
export function extractDomain(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/)
  return match ? match[1].toLowerCase() : null
}

/**
 * Extract domain from website URL.
 */
export function extractDomainFromUrl(url: string): string | null {
  try {
    // Add protocol if missing
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`
    const parsed = new URL(urlWithProtocol)
    // Remove www prefix
    return parsed.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

// ============================================
// SIMILARITY FUNCTIONS
// ============================================

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculate similarity score (0-1) based on Levenshtein distance.
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  const distance = levenshteinDistance(a, b)
  return 1 - distance / maxLen
}

// ============================================
// COMPANY MATCHING
// ============================================

interface CompanyMatchSignal {
  signal: string
  weight: number
  matched: boolean
  details?: string
}

/**
 * Find matching canonical companies for the given input.
 */
export async function findCompanyMatches(
  input: CompanyMatchInput,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): Promise<MatchResult<CanonicalCompany>> {
  const signals: CompanyMatchSignal[] = []
  const normalizedName = normalizeCompanyName(input.name)
  let bestMatch: CanonicalCompany | null = null
  let bestScore = 0

  // Extract domain from website if provided
  const websiteDomain = input.website ? extractDomainFromUrl(input.website) : null
  const inputDomain = input.domain || websiteDomain

  // 1. Check for exact domain match (highest confidence)
  if (inputDomain) {
    const domainMatch = await prisma.canonicalDomain.findUnique({
      where: { domain: inputDomain },
      include: { company: true }
    })

    if (domainMatch && !domainMatch.company.mergedIntoId) {
      signals.push({
        signal: 'DOMAIN_EXACT',
        weight: 0.95,
        matched: true,
        details: `Domain "${inputDomain}" matches exactly`
      })
      bestMatch = domainMatch.company
      bestScore = 0.95
    }
  }

  // 2. Check for exact normalized name match
  const exactNameMatch = await prisma.canonicalCompany.findFirst({
    where: {
      normalizedName,
      mergedIntoId: null
    }
  })

  if (exactNameMatch) {
    signals.push({
      signal: 'NAME_EXACT',
      weight: 0.85,
      matched: true,
      details: `Normalized name "${normalizedName}" matches exactly`
    })
    if (!bestMatch || 0.85 > bestScore) {
      bestMatch = exactNameMatch
      bestScore = Math.max(bestScore, 0.85)
    }
  }

  // 3. Check for LinkedIn URL match
  if (input.linkedInUrl) {
    const linkedInMatch = await prisma.canonicalCompany.findFirst({
      where: {
        linkedInUrl: input.linkedInUrl,
        mergedIntoId: null
      }
    })

    if (linkedInMatch) {
      signals.push({
        signal: 'LINKEDIN_EXACT',
        weight: 0.90,
        matched: true,
        details: `LinkedIn URL matches exactly`
      })
      if (!bestMatch || 0.90 > bestScore) {
        bestMatch = linkedInMatch
        bestScore = Math.max(bestScore, 0.90)
      }
    }
  }

  // 4. Fuzzy name matching
  if (!bestMatch || bestScore < config.autoLinkThreshold) {
    const candidates = await prisma.canonicalCompany.findMany({
      where: {
        mergedIntoId: null,
        // Use ILIKE for initial filtering
        normalizedName: {
          contains: normalizedName.substring(0, 4)
        }
      },
      take: 100
    })

    for (const candidate of candidates) {
      const similarity = stringSimilarity(normalizedName, candidate.normalizedName)
      if (similarity >= 0.80 && similarity > bestScore) {
        signals.push({
          signal: 'NAME_FUZZY',
          weight: similarity * 0.75, // Discount fuzzy matches
          matched: true,
          details: `Name similarity: ${(similarity * 100).toFixed(0)}%`
        })
        bestMatch = candidate
        bestScore = similarity * 0.75
      }
    }
  }

  // Calculate final confidence
  const confidence = Math.min(1, bestScore)
  const matchReasons = signals.filter(s => s.matched).map(s => s.details || s.signal)

  // Determine match type and suggested action
  let matchType: MatchType
  let suggestedAction: MatchResult<CanonicalCompany>['suggestedAction']

  if (confidence >= config.autoLinkThreshold) {
    matchType = 'EXACT'
    suggestedAction = 'AUTO_LINK'
  } else if (confidence >= config.suggestThreshold) {
    matchType = 'HIGH_CONFIDENCE'
    suggestedAction = 'SUGGEST_MERGE'
  } else if (confidence >= config.provisionalThreshold) {
    matchType = 'POSSIBLE'
    suggestedAction = 'SAVE_PROVISIONAL'
  } else {
    matchType = 'NO_MATCH'
    suggestedAction = 'CREATE_NEW'
  }

  return {
    matchType,
    confidence,
    matchedEntity: bestMatch,
    matchReasons,
    suggestedAction
  }
}

// ============================================
// PERSON MATCHING
// ============================================

interface PersonMatchSignal {
  signal: string
  weight: number
  matched: boolean
  details?: string
}

/**
 * Find matching canonical people for the given input.
 */
export async function findPersonMatches(
  input: PersonMatchInput,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): Promise<MatchResult<CanonicalPerson>> {
  const signals: PersonMatchSignal[] = []
  const normalizedName = normalizePersonName(input.firstName, input.lastName)
  let bestMatch: CanonicalPerson | null = null
  let bestScore = 0

  // 1. Email exact match (highest confidence - email is unique identifier)
  if (input.email) {
    const emailMatch = await prisma.canonicalPerson.findUnique({
      where: { email: input.email.toLowerCase() }
    })

    if (emailMatch && !emailMatch.mergedIntoId) {
      signals.push({
        signal: 'EMAIL_EXACT',
        weight: 0.99,
        matched: true,
        details: `Email "${input.email}" matches exactly`
      })
      bestMatch = emailMatch
      bestScore = 0.99
    }
  }

  // 2. LinkedIn URL match
  if (input.linkedInUrl && !bestMatch) {
    const linkedInMatch = await prisma.canonicalPerson.findFirst({
      where: {
        linkedInUrl: input.linkedInUrl,
        mergedIntoId: null
      }
    })

    if (linkedInMatch) {
      signals.push({
        signal: 'LINKEDIN_EXACT',
        weight: 0.95,
        matched: true,
        details: `LinkedIn URL matches exactly`
      })
      bestMatch = linkedInMatch
      bestScore = Math.max(bestScore, 0.95)
    }
  }

  // 3. Name + Company match
  if (input.companyName && (!bestMatch || bestScore < config.autoLinkThreshold)) {
    const normalizedCompanyName = normalizeCompanyName(input.companyName)

    // Find canonical company first
    const company = await prisma.canonicalCompany.findFirst({
      where: {
        normalizedName: normalizedCompanyName,
        mergedIntoId: null
      }
    })

    if (company) {
      // Find person at that company with matching name
      const personAtCompany = await prisma.canonicalPerson.findFirst({
        where: {
          normalizedName,
          currentCompanyId: company.id,
          mergedIntoId: null
        }
      })

      if (personAtCompany) {
        signals.push({
          signal: 'NAME_COMPANY',
          weight: 0.85,
          matched: true,
          details: `Name and company match`
        })
        if (!bestMatch || 0.85 > bestScore) {
          bestMatch = personAtCompany
          bestScore = Math.max(bestScore, 0.85)
        }
      }
    }
  }

  // 4. Name + Domain match (from email)
  if (input.email && (!bestMatch || bestScore < config.autoLinkThreshold)) {
    const domain = extractDomain(input.email)
    if (domain) {
      // Find company by domain
      const domainMatch = await prisma.canonicalDomain.findUnique({
        where: { domain }
      })

      if (domainMatch) {
        // Find person with same name at that company
        const personByDomain = await prisma.canonicalPerson.findFirst({
          where: {
            normalizedName,
            currentCompanyId: domainMatch.companyId,
            mergedIntoId: null
          }
        })

        if (personByDomain) {
          signals.push({
            signal: 'NAME_DOMAIN',
            weight: 0.80,
            matched: true,
            details: `Name matches person at same domain`
          })
          if (!bestMatch || 0.80 > bestScore) {
            bestMatch = personByDomain
            bestScore = Math.max(bestScore, 0.80)
          }
        }
      }
    }
  }

  // 5. Exact name match only (lower confidence)
  if (!bestMatch || bestScore < config.suggestThreshold) {
    const nameOnlyMatch = await prisma.canonicalPerson.findFirst({
      where: {
        normalizedName,
        mergedIntoId: null
      }
    })

    if (nameOnlyMatch) {
      signals.push({
        signal: 'NAME_ONLY',
        weight: 0.50,
        matched: true,
        details: `Name matches but no other signals`
      })
      if (!bestMatch) {
        bestMatch = nameOnlyMatch
        bestScore = Math.max(bestScore, 0.50)
      }
    }
  }

  // Calculate final confidence
  const confidence = Math.min(1, bestScore)
  const matchReasons = signals.filter(s => s.matched).map(s => s.details || s.signal)

  // Determine match type and suggested action
  let matchType: MatchType
  let suggestedAction: MatchResult<CanonicalPerson>['suggestedAction']

  if (confidence >= config.autoLinkThreshold) {
    matchType = 'EXACT'
    suggestedAction = 'AUTO_LINK'
  } else if (confidence >= config.suggestThreshold) {
    matchType = 'HIGH_CONFIDENCE'
    suggestedAction = 'SUGGEST_MERGE'
  } else if (confidence >= config.provisionalThreshold) {
    matchType = 'POSSIBLE'
    suggestedAction = 'SAVE_PROVISIONAL'
  } else {
    matchType = 'NO_MATCH'
    suggestedAction = 'CREATE_NEW'
  }

  return {
    matchType,
    confidence,
    matchedEntity: bestMatch,
    matchReasons,
    suggestedAction
  }
}

// ============================================
// DUPLICATE DETECTION (BATCH)
// ============================================

export interface DuplicatePair<T> {
  entityA: T
  entityB: T
  confidence: number
  matchReasons: string[]
}

/**
 * Find potential duplicate companies in the database.
 * Run as a batch job to identify duplicates for admin review.
 */
export async function findDuplicateCompanies(
  minConfidence: number = 0.70
): Promise<DuplicatePair<CanonicalCompany>[]> {
  const duplicates: DuplicatePair<CanonicalCompany>[] = []

  // Get all non-merged companies
  const companies = await prisma.canonicalCompany.findMany({
    where: { mergedIntoId: null },
    include: { domains: true }
  })

  // Compare each pair (O(n^2) but necessary for fuzzy matching)
  for (let i = 0; i < companies.length; i++) {
    for (let j = i + 1; j < companies.length; j++) {
      const companyA = companies[i]
      const companyB = companies[j]
      const reasons: string[] = []
      let confidence = 0

      // Check domain overlap
      const domainsA = new Set(companyA.domains.map(d => d.domain))
      const domainsB = new Set(companyB.domains.map(d => d.domain))
      const domainOverlap = [...domainsA].some(d => domainsB.has(d))

      if (domainOverlap) {
        confidence = Math.max(confidence, 0.95)
        reasons.push('Shared domain')
      }

      // Check name similarity
      const nameSimilarity = stringSimilarity(
        companyA.normalizedName,
        companyB.normalizedName
      )

      if (nameSimilarity >= 0.90) {
        confidence = Math.max(confidence, nameSimilarity * 0.85)
        reasons.push(`Name similarity: ${(nameSimilarity * 100).toFixed(0)}%`)
      }

      // Check LinkedIn match
      if (companyA.linkedInUrl && companyA.linkedInUrl === companyB.linkedInUrl) {
        confidence = Math.max(confidence, 0.95)
        reasons.push('Same LinkedIn URL')
      }

      // Add to duplicates if above threshold
      if (confidence >= minConfidence) {
        duplicates.push({
          entityA: companyA,
          entityB: companyB,
          confidence,
          matchReasons: reasons
        })
      }
    }
  }

  // Sort by confidence descending
  return duplicates.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Find potential duplicate people in the database.
 */
export async function findDuplicatePeople(
  minConfidence: number = 0.70
): Promise<DuplicatePair<CanonicalPerson>[]> {
  const duplicates: DuplicatePair<CanonicalPerson>[] = []

  // Get all non-merged people
  const people = await prisma.canonicalPerson.findMany({
    where: { mergedIntoId: null }
  })

  // Group by normalized name for efficiency
  const byName = new Map<string, CanonicalPerson[]>()
  for (const person of people) {
    const existing = byName.get(person.normalizedName) || []
    existing.push(person)
    byName.set(person.normalizedName, existing)
  }

  // Check exact name matches
  for (const [name, group] of byName) {
    if (group.length > 1) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const personA = group[i]
          const personB = group[j]
          const reasons: string[] = ['Same normalized name']
          let confidence = 0.60 // Base confidence for name match

          // Boost if same company
          if (personA.currentCompanyId && personA.currentCompanyId === personB.currentCompanyId) {
            confidence = Math.max(confidence, 0.85)
            reasons.push('Same current company')
          }

          // Boost if same LinkedIn
          if (personA.linkedInUrl && personA.linkedInUrl === personB.linkedInUrl) {
            confidence = Math.max(confidence, 0.95)
            reasons.push('Same LinkedIn URL')
          }

          if (confidence >= minConfidence) {
            duplicates.push({
              entityA: personA,
              entityB: personB,
              confidence,
              matchReasons: reasons
            })
          }
        }
      }
    }
  }

  return duplicates.sort((a, b) => b.confidence - a.confidence)
}

// ============================================
// MERGE OPERATIONS
// ============================================

export interface MergeResult {
  survivingId: string
  mergedIds: string[]
  auditLogId: string
}

/**
 * Merge duplicate companies into a single canonical record.
 * The primary company survives; duplicates are marked as merged.
 */
export async function mergeCompanies(
  primaryId: string,
  duplicateIds: string[],
  performedByUserId: string
): Promise<MergeResult> {
  // Validate all IDs exist and are not already merged
  const companies = await prisma.canonicalCompany.findMany({
    where: {
      id: { in: [primaryId, ...duplicateIds] },
      mergedIntoId: null
    }
  })

  if (companies.length !== duplicateIds.length + 1) {
    throw new Error('One or more companies not found or already merged')
  }

  // Perform merge in transaction
  const result = await prisma.$transaction(async (tx) => {
    const now = new Date()

    // 1. Update all references from duplicates to primary
    for (const dupId of duplicateIds) {
      // Move domains
      await tx.canonicalDomain.updateMany({
        where: { companyId: dupId },
        data: { companyId: primaryId }
      })

      // Move people's current company
      await tx.canonicalPerson.updateMany({
        where: { currentCompanyId: dupId },
        data: { currentCompanyId: primaryId }
      })

      // Move employment history
      await tx.personEmployment.updateMany({
        where: { companyId: dupId },
        data: { companyId: primaryId }
      })

      // Move deal buyers
      await tx.dealBuyer.updateMany({
        where: { canonicalCompanyId: dupId },
        data: { canonicalCompanyId: primaryId }
      })

      // Mark as merged
      await tx.canonicalCompany.update({
        where: { id: dupId },
        data: {
          mergedIntoId: primaryId,
          mergedAt: now
        }
      })
    }

    // 2. Create audit log entry
    const auditLog = await tx.auditLog.create({
      data: {
        actorId: performedByUserId,
        actorEmail: 'system', // Will be updated by caller
        action: 'COMPANY_MERGE',
        targetType: 'CanonicalCompany',
        targetId: primaryId,
        metadata: {
          primaryId,
          mergedIds: duplicateIds,
          mergedAt: now.toISOString()
        }
      }
    })

    return {
      survivingId: primaryId,
      mergedIds: duplicateIds,
      auditLogId: auditLog.id
    }
  })

  return result
}

/**
 * Merge duplicate people into a single canonical record.
 */
export async function mergePeople(
  primaryId: string,
  duplicateIds: string[],
  performedByUserId: string
): Promise<MergeResult> {
  // Validate all IDs exist and are not already merged
  const people = await prisma.canonicalPerson.findMany({
    where: {
      id: { in: [primaryId, ...duplicateIds] },
      mergedIntoId: null
    }
  })

  if (people.length !== duplicateIds.length + 1) {
    throw new Error('One or more people not found or already merged')
  }

  // Perform merge in transaction
  const result = await prisma.$transaction(async (tx) => {
    const now = new Date()

    // 1. Update all references from duplicates to primary
    for (const dupId of duplicateIds) {
      // Move employment history
      await tx.personEmployment.updateMany({
        where: { personId: dupId },
        data: { personId: primaryId }
      })

      // Move deal contacts
      await tx.dealContact.updateMany({
        where: { canonicalPersonId: dupId },
        data: { canonicalPersonId: primaryId }
      })

      // Move activities
      await tx.dealActivity2.updateMany({
        where: { personId: dupId },
        data: { personId: primaryId }
      })

      // Move email attempts
      await tx.emailAttempt.updateMany({
        where: { personId: dupId },
        data: { personId: primaryId }
      })

      // Mark as merged
      await tx.canonicalPerson.update({
        where: { id: dupId },
        data: {
          mergedIntoId: primaryId,
          mergedAt: now
        }
      })
    }

    // 2. Create audit log entry
    const auditLog = await tx.auditLog.create({
      data: {
        actorId: performedByUserId,
        actorEmail: 'system',
        action: 'PERSON_MERGE',
        targetType: 'CanonicalPerson',
        targetId: primaryId,
        metadata: {
          primaryId,
          mergedIds: duplicateIds,
          mergedAt: now.toISOString()
        }
      }
    })

    return {
      survivingId: primaryId,
      mergedIds: duplicateIds,
      auditLogId: auditLog.id
    }
  })

  return result
}
