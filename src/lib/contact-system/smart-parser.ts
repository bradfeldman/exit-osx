/**
 * Smart Parser
 *
 * Parses unstructured text input (email signatures, vCards, LinkedIn URLs,
 * plain text) and extracts structured contact information.
 *
 * Key features:
 * - Email signature parsing
 * - LinkedIn URL extraction
 * - Phone number detection
 * - Company name extraction
 * - Title/role detection
 */

// ============================================
// TYPES
// ============================================

export interface ParsedCompany {
  name: string
  domain?: string
  website?: string
  linkedInUrl?: string
  confidence: number  // 0-1, how confident we are in this extraction
  source: 'domain' | 'text' | 'linkedin' | 'inferred'
}

export interface ParsedPerson {
  firstName: string
  lastName: string
  fullName: string
  email?: string
  phone?: string
  title?: string
  company?: string
  linkedInUrl?: string
  confidence: number
}

export interface ParsedInput {
  people: ParsedPerson[]
  companies: ParsedCompany[]
  emails: string[]
  phones: string[]
  urls: string[]
  linkedInUrls: string[]
  domains: string[]
  raw: string
}

// ============================================
// REGEX PATTERNS
// ============================================

const PATTERNS = {
  // Email: standard email format
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,

  // Phone: various formats
  phone: /(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}/g,

  // LinkedIn profile URL
  linkedInPerson: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?/gi,

  // LinkedIn company URL
  linkedInCompany: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/company\/([a-zA-Z0-9_-]+)\/?/gi,

  // Generic URL
  url: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,

  // Domain (from email or standalone)
  domain: /@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,

  // Common title patterns
  title: /\b(CEO|CFO|COO|CTO|CIO|CMO|CSO|CPO|CDO|CRO|CHRO|CLO|Partner|Principal|Managing Director|Director|VP|Vice President|SVP|EVP|AVP|President|Chairman|Founder|Co-Founder|Owner|Manager|Head of|Chief|Senior|Associate|Analyst|Consultant|Advisor|Board Member)\b/gi,

  // Company suffixes (for detection)
  companySuffix: /\b(Inc\.?|Incorporated|Corp\.?|Corporation|LLC|LLP|Ltd\.?|Limited|Co\.?|Company|Group|Holdings?|Partners?|LP|GP|Capital|Ventures?|Investments?|Management|Advisory|Consulting|Services?|Solutions?|Technologies?|Tech)\b/gi,
}

// Common filler words to filter out
const FILLER_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'at', 'in', 'on', 'for', 'to', 'of',
  'email', 'phone', 'tel', 'mobile', 'cell', 'fax', 'office', 'direct',
  'sent', 'from', 'my', 'best', 'regards', 'sincerely', 'thanks', 'thank',
  'you', 'www', 'http', 'https', 'com', 'org', 'net', 'io'
])

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Clean and normalize a string.
 */
function cleanString(str: string): string {
  return str
    .replace(/\s+/g, ' ')
    .replace(/[|•·—–-]+/g, ' ')
    .trim()
}

/**
 * Check if a string looks like a person's name.
 */
function isLikelyName(str: string): boolean {
  const cleaned = cleanString(str)
  const words = cleaned.split(' ').filter(w => w.length > 1)

  // Names typically have 2-4 words, each starting with uppercase
  if (words.length < 2 || words.length > 4) return false

  // Check if words look like name parts
  return words.every(word => {
    // Should start with uppercase
    if (!/^[A-Z]/.test(word)) return false
    // Should be mostly letters
    if (!/^[A-Za-z'-]+$/.test(word)) return false
    // Shouldn't be a filler word
    if (FILLER_WORDS.has(word.toLowerCase())) return false
    return true
  })
}

/**
 * Check if a string looks like a company name.
 */
function isLikelyCompanyName(str: string): boolean {
  const cleaned = cleanString(str)

  // Check for company suffix
  if (PATTERNS.companySuffix.test(cleaned)) return true

  // Check for common patterns
  if (/\b(Capital|Ventures?|Partners?|Holdings?|Group)\b/i.test(cleaned)) return true

  return false
}

/**
 * Extract name parts from a full name string.
 */
function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = cleanString(fullName).split(' ').filter(p => p.length > 0)

  if (parts.length === 0) {
    return { firstName: '', lastName: '' }
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }

  // Handle common suffixes
  const suffixes = ['Jr', 'Jr.', 'Sr', 'Sr.', 'II', 'III', 'IV', 'PhD', 'MD', 'Esq', 'Esq.']
  const filtered = parts.filter(p => !suffixes.includes(p))

  if (filtered.length === 0) {
    return { firstName: parts[0], lastName: '' }
  }

  if (filtered.length === 1) {
    return { firstName: filtered[0], lastName: '' }
  }

  // First name is first part, last name is last part
  return {
    firstName: filtered[0],
    lastName: filtered[filtered.length - 1]
  }
}

/**
 * Extract domain from email address.
 */
function extractEmailDomain(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/)
  return match ? match[1].toLowerCase() : null
}

/**
 * Extract domain from URL.
 */
function extractUrlDomain(url: string): string | null {
  try {
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`
    const parsed = new URL(urlWithProtocol)
    return parsed.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

// ============================================
// MAIN PARSER
// ============================================

/**
 * Parse unstructured input and extract structured contact information.
 */
export function parseInput(raw: string): ParsedInput {
  const result: ParsedInput = {
    people: [],
    companies: [],
    emails: [],
    phones: [],
    urls: [],
    linkedInUrls: [],
    domains: [],
    raw
  }

  if (!raw || raw.trim().length === 0) {
    return result
  }

  // 1. Extract emails
  const emailMatches = raw.match(PATTERNS.email) || []
  result.emails = [...new Set(emailMatches.map(e => e.toLowerCase()))]

  // 2. Extract domains from emails
  for (const email of result.emails) {
    const domain = extractEmailDomain(email)
    if (domain && !domain.includes('gmail') && !domain.includes('yahoo') &&
        !domain.includes('hotmail') && !domain.includes('outlook')) {
      result.domains.push(domain)
    }
  }
  result.domains = [...new Set(result.domains)]

  // 3. Extract phone numbers
  const phoneMatches = raw.match(PATTERNS.phone) || []
  result.phones = [...new Set(phoneMatches.map(p => p.replace(/\D/g, '')))]

  // 4. Extract URLs
  const urlMatches = raw.match(PATTERNS.url) || []
  result.urls = [...new Set(urlMatches)]

  // 5. Extract LinkedIn URLs
  const linkedInPersonMatches = raw.match(PATTERNS.linkedInPerson) || []
  const linkedInCompanyMatches = raw.match(PATTERNS.linkedInCompany) || []
  result.linkedInUrls = [...new Set([...linkedInPersonMatches, ...linkedInCompanyMatches])]

  // 6. Parse lines for structured data
  const lines = raw.split(/[\n\r]+/).map(l => cleanString(l)).filter(l => l.length > 0)

  // Track what we've found
  let foundName: string | null = null
  let foundTitle: string | null = null
  let foundCompany: string | null = null

  for (const line of lines) {
    // Skip lines that are just email/phone/url
    if (PATTERNS.email.test(line) && line.match(PATTERNS.email)?.[0] === line) continue
    if (PATTERNS.phone.test(line) && line.replace(/\D/g, '').length === line.replace(/\s/g, '').length) continue
    if (PATTERNS.url.test(line) && line.match(PATTERNS.url)?.[0] === line) continue

    // Check for title
    const titleMatch = line.match(PATTERNS.title)
    if (titleMatch) {
      foundTitle = line
    }

    // Check for company name
    if (isLikelyCompanyName(line) && !foundCompany) {
      foundCompany = line
    }

    // Check for person name (usually first non-email/phone line)
    if (!foundName && isLikelyName(line)) {
      foundName = line
    }
  }

  // 7. Build person record if we found enough data
  if (foundName || result.emails.length > 0) {
    const { firstName, lastName } = foundName
      ? parseFullName(foundName)
      : { firstName: '', lastName: '' }

    // If no name but have email, try to extract from email
    let derivedFirstName = firstName
    let derivedLastName = lastName
    if (!foundName && result.emails.length > 0) {
      const email = result.emails[0]
      const localPart = email.split('@')[0]
      // Try to parse name from email (e.g., john.smith@company.com)
      const nameParts = localPart.split(/[._-]/).filter(p => p.length > 1)
      if (nameParts.length >= 2) {
        derivedFirstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)
        derivedLastName = nameParts[nameParts.length - 1].charAt(0).toUpperCase() + nameParts[nameParts.length - 1].slice(1)
      }
    }

    const person: ParsedPerson = {
      firstName: derivedFirstName,
      lastName: derivedLastName,
      fullName: foundName || `${derivedFirstName} ${derivedLastName}`.trim(),
      email: result.emails[0],
      phone: result.phones[0],
      title: foundTitle || undefined,
      company: foundCompany || undefined,
      linkedInUrl: result.linkedInUrls.find(u => /\/in\//.test(u)),
      confidence: calculatePersonConfidence({
        hasName: !!foundName,
        hasEmail: result.emails.length > 0,
        hasTitle: !!foundTitle,
        hasCompany: !!foundCompany,
        hasLinkedIn: result.linkedInUrls.some(u => /\/in\//.test(u))
      })
    }

    if (person.firstName || person.email) {
      result.people.push(person)
    }
  }

  // 8. Build company records
  // From explicit company name
  if (foundCompany) {
    result.companies.push({
      name: foundCompany,
      domain: result.domains[0],
      confidence: 0.8,
      source: 'text'
    })
  }

  // From domains (if no explicit company)
  if (!foundCompany && result.domains.length > 0) {
    for (const domain of result.domains) {
      // Try to infer company name from domain
      const domainParts = domain.split('.')
      const companyName = domainParts[0]
        .split(/[-_]/)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')

      result.companies.push({
        name: companyName,
        domain,
        website: `https://www.${domain}`,
        confidence: 0.6,
        source: 'domain'
      })
    }
  }

  // From LinkedIn company URLs
  for (const url of result.linkedInUrls) {
    if (/\/company\//.test(url)) {
      const match = url.match(/\/company\/([a-zA-Z0-9_-]+)/)
      if (match) {
        const companySlug = match[1]
        const companyName = companySlug
          .split(/[-_]/)
          .map(p => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ')

        // Only add if not already present
        if (!result.companies.some(c => c.name.toLowerCase() === companyName.toLowerCase())) {
          result.companies.push({
            name: companyName,
            linkedInUrl: url,
            confidence: 0.7,
            source: 'linkedin'
          })
        }
      }
    }
  }

  return result
}

/**
 * Calculate confidence score for a parsed person.
 */
function calculatePersonConfidence(signals: {
  hasName: boolean
  hasEmail: boolean
  hasTitle: boolean
  hasCompany: boolean
  hasLinkedIn: boolean
}): number {
  let score = 0
  const weights = {
    name: 0.25,
    email: 0.35,
    title: 0.15,
    company: 0.15,
    linkedIn: 0.10
  }

  if (signals.hasName) score += weights.name
  if (signals.hasEmail) score += weights.email
  if (signals.hasTitle) score += weights.title
  if (signals.hasCompany) score += weights.company
  if (signals.hasLinkedIn) score += weights.linkedIn

  return Math.min(1, score)
}

// ============================================
// SPECIALIZED PARSERS
// ============================================

/**
 * Parse a LinkedIn profile URL to extract username.
 */
export function parseLinkedInUrl(url: string): {
  type: 'person' | 'company' | 'unknown'
  identifier: string | null
} {
  // Person profile
  const personMatch = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)
  if (personMatch) {
    return { type: 'person', identifier: personMatch[1] }
  }

  // Company page
  const companyMatch = url.match(/linkedin\.com\/company\/([a-zA-Z0-9_-]+)/)
  if (companyMatch) {
    return { type: 'company', identifier: companyMatch[1] }
  }

  return { type: 'unknown', identifier: null }
}

/**
 * Parse a vCard string.
 */
export function parseVCard(vcard: string): ParsedPerson | null {
  const lines = vcard.split(/\r?\n/)
  const data: Record<string, string> = {}

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':')
    const value = valueParts.join(':')

    if (key.startsWith('FN')) {
      data.fullName = value
    } else if (key.startsWith('N')) {
      const [lastName, firstName] = value.split(';')
      data.firstName = firstName
      data.lastName = lastName
    } else if (key.startsWith('EMAIL')) {
      data.email = value
    } else if (key.startsWith('TEL')) {
      data.phone = value
    } else if (key.startsWith('TITLE')) {
      data.title = value
    } else if (key.startsWith('ORG')) {
      data.company = value
    } else if (key.startsWith('URL') && value.includes('linkedin')) {
      data.linkedIn = value
    }
  }

  if (!data.fullName && !data.firstName && !data.email) {
    return null
  }

  const { firstName, lastName } = data.firstName
    ? { firstName: data.firstName, lastName: data.lastName || '' }
    : parseFullName(data.fullName || '')

  return {
    firstName,
    lastName,
    fullName: data.fullName || `${firstName} ${lastName}`.trim(),
    email: data.email,
    phone: data.phone,
    title: data.title,
    company: data.company,
    linkedInUrl: data.linkedIn,
    confidence: 0.9 // vCards are structured, high confidence
  }
}

/**
 * Bulk parse multiple entries (e.g., from CSV paste).
 */
export function parseBulkInput(raw: string): ParsedInput[] {
  // Try to detect format
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0)

  // Check if it looks like CSV
  if (lines.length > 1 && lines[0].includes(',')) {
    // Parse as CSV
    return lines.slice(1).map(line => {
      const cells = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
      // Assume format: Name, Email, Company, Title
      const reconstructed = cells.join('\n')
      return parseInput(reconstructed)
    })
  }

  // Check if entries are separated by blank lines
  const entries = raw.split(/\n\s*\n/).filter(e => e.trim().length > 0)
  if (entries.length > 1) {
    return entries.map(entry => parseInput(entry))
  }

  // Single entry
  return [parseInput(raw)]
}
