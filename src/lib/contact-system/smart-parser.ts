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
  phone?: string // Legacy — kept for backward compat
  phoneWork?: string
  phoneCell?: string
  title?: string
  company?: string
  linkedInUrl?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zip?: string
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

// Credentials/designations that can appear after a name
const NAME_SUFFIXES = new Set([
  'cfa', 'cpa', 'mba', 'jd', 'md', 'phd', 'esq', 'pe', 'cfp', 'clu',
  'chfc', 'aif', 'caia', 'frm', 'pmp', 'rn', 'do', 'dds', 'dvm',
  'jr', 'sr', 'ii', 'iii', 'iv',
])

/**
 * Check if a string looks like a person's name.
 */
function isLikelyName(str: string): boolean {
  // Strip commas and clean
  const cleaned = cleanString(str).replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  // Remove known credential suffixes
  const words = cleaned.split(' ').filter(w =>
    w.length > 1 && !NAME_SUFFIXES.has(w.toLowerCase().replace(/\./g, ''))
  )

  // Names typically have 2-4 words, each starting with uppercase
  if (words.length < 2 || words.length > 4) return false

  // Check if words look like name parts
  return words.every(word => {
    // Should start with uppercase
    if (!/^[A-Z]/.test(word)) return false
    // Should be mostly letters (allow trailing period for initials)
    if (!/^[A-Za-z'-]+\.?$/.test(word)) return false
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

  // If it looks like a job title, it's probably not a company name
  // Common patterns: "Senior Partner", "Managing Director", etc.
  const titlePrefixes = /^(Senior|Junior|Associate|Managing|Executive|General|Limited|Chief|Head|Lead|Principal)\s+/i
  if (titlePrefixes.test(cleaned) && PATTERNS.title.test(cleaned)) {
    return false
  }

  // Check for company suffix (Inc, LLC, Corp, etc.)
  if (PATTERNS.companySuffix.test(cleaned)) return true

  // Check for common company patterns - but not if it's just a title word
  const companyPatterns = /\b(Capital|Ventures?|Holdings?|Group)\b/i
  const standalonePartner = /^Partners?$/i
  if (companyPatterns.test(cleaned) && !standalonePartner.test(cleaned)) return true

  // "Partners" only counts as company if it's part of a longer name (e.g., "Smith Partners")
  if (/\bPartners?\b/i.test(cleaned) && cleaned.split(/\s+/).length > 1 && !titlePrefixes.test(cleaned)) {
    return true
  }

  return false
}

/**
 * Extract name parts from a full name string.
 */
function parseFullName(fullName: string): { firstName: string; lastName: string } {
  // Strip commas and clean
  const parts = cleanString(fullName).replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(p => p.length > 0)

  if (parts.length === 0) {
    return { firstName: '', lastName: '' }
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }

  // Handle common suffixes and credentials
  const filtered = parts.filter(p =>
    !NAME_SUFFIXES.has(p.toLowerCase().replace(/\./g, ''))
  )

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
 * Format a digits-only phone string as (xxx) xxx-xxxx or +1 (xxx) xxx-xxxx.
 */
function formatPhone(digits: string): string {
  // Strip leading '1' country code if 11 digits
  const d = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  // If not 10 digits, return as-is
  return digits
}

/**
 * Extract domain from email address.
 */
function extractEmailDomain(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/)
  return match ? match[1].toLowerCase() : null
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
  result.phones = [...new Set(phoneMatches.map(p => formatPhone(p.replace(/\D/g, ''))))]

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

  // Address detection
  const foundAddress: {
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    zip?: string
  } = {}

  // US state abbreviations for address parsing
  const US_STATES = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/
  // City, State ZIP pattern
  const CITY_STATE_ZIP = /^(.+?),?\s+(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s+(\d{5}(?:-\d{4})?)$/i
  // Street address pattern (starts with number)
  const STREET_ADDRESS = /^\d+\s+[\w\s.]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Road|Rd|Lane|Ln|Way|Court|Ct|Place|Pl|Circle|Cir|Terrace|Ter|Trail|Trl|Parkway|Pkwy|Highway|Hwy)\.?\s*,?/i
  // Suite/Apt pattern
  const SUITE_APT = /^(?:Suite|Ste|Apt|Unit|#|Floor|Fl)\s*\.?\s*\S+/i

  for (const line of lines) {
    // Skip lines that are just email/phone/url
    if (PATTERNS.email.test(line) && line.match(PATTERNS.email)?.[0] === line) continue
    if (PATTERNS.phone.test(line) && line.replace(/\D/g, '').length === line.replace(/\s/g, '').length) continue
    if (PATTERNS.url.test(line) && line.match(PATTERNS.url)?.[0] === line) continue

    // Check for city/state/zip pattern
    const cityStateZipMatch = line.match(CITY_STATE_ZIP)
    if (cityStateZipMatch) {
      foundAddress.city = cityStateZipMatch[1].replace(/,\s*$/, '').trim()
      foundAddress.state = cityStateZipMatch[2].toUpperCase()
      foundAddress.zip = cityStateZipMatch[3]
      continue
    }

    // Check for street address
    if (STREET_ADDRESS.test(line) && !foundAddress.addressLine1) {
      foundAddress.addressLine1 = line.replace(/,\s*$/, '').trim()
      continue
    }

    // Check for suite/apt (only if we already have a street address)
    if (SUITE_APT.test(line) && foundAddress.addressLine1 && !foundAddress.addressLine2) {
      foundAddress.addressLine2 = line.trim()
      continue
    }

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

    // Assign phones: first = work, second = cell
    const phoneWork = result.phones[0] || undefined
    const phoneCell = result.phones.length > 1 ? result.phones[1] : undefined

    const person: ParsedPerson = {
      firstName: derivedFirstName,
      lastName: derivedLastName,
      fullName: foundName || `${derivedFirstName} ${derivedLastName}`.trim(),
      email: result.emails[0],
      phone: phoneWork, // Legacy compat
      phoneWork,
      phoneCell,
      title: foundTitle || undefined,
      company: foundCompany || undefined,
      linkedInUrl: result.linkedInUrls.find(u => /\/in\//.test(u)),
      addressLine1: foundAddress.addressLine1,
      addressLine2: foundAddress.addressLine2,
      city: foundAddress.city,
      state: foundAddress.state,
      zip: foundAddress.zip,
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
  const phones: string[] = []

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':')
    const value = valueParts.join(':')

    if (key.startsWith('FN')) {
      data.fullName = value
    } else if (key.startsWith('N') && !key.startsWith('NOTE')) {
      const [lastName, firstName] = value.split(';')
      data.firstName = firstName
      data.lastName = lastName
    } else if (key.startsWith('EMAIL')) {
      data.email = value
    } else if (key.startsWith('TEL')) {
      phones.push(value)
      // Try to assign based on type hints in the key
      const keyLower = key.toLowerCase()
      if (keyLower.includes('work') && !data.phoneWork) {
        data.phoneWork = value
      } else if ((keyLower.includes('cell') || keyLower.includes('mobile')) && !data.phoneCell) {
        data.phoneCell = value
      }
    } else if (key.startsWith('TITLE')) {
      data.title = value
    } else if (key.startsWith('ORG')) {
      data.company = value
    } else if (key.startsWith('URL') && value.includes('linkedin')) {
      data.linkedIn = value
    } else if (key.startsWith('ADR')) {
      // vCard ADR format: PO Box;Extended;Street;City;State;ZIP;Country
      const parts = value.split(';')
      if (parts[2]) data.addressLine1 = parts[2].trim()
      if (parts[1]) data.addressLine2 = parts[1].trim()
      if (parts[3]) data.city = parts[3].trim()
      if (parts[4]) data.state = parts[4].trim()
      if (parts[5]) data.zip = parts[5].trim()
    }
  }

  if (!data.fullName && !data.firstName && !data.email) {
    return null
  }

  const { firstName, lastName } = data.firstName
    ? { firstName: data.firstName, lastName: data.lastName || '' }
    : parseFullName(data.fullName || '')

  // Assign phones: use typed assignments first, then fall back to order
  const phoneWork = data.phoneWork || phones[0] || undefined
  const phoneCell = data.phoneCell || (phones.length > 1 ? phones[1] : undefined)

  return {
    firstName,
    lastName,
    fullName: data.fullName || `${firstName} ${lastName}`.trim(),
    email: data.email,
    phone: phoneWork, // Legacy compat
    phoneWork,
    phoneCell,
    title: data.title,
    company: data.company,
    linkedInUrl: data.linkedIn,
    addressLine1: data.addressLine1 || undefined,
    addressLine2: data.addressLine2 || undefined,
    city: data.city || undefined,
    state: data.state || undefined,
    zip: data.zip || undefined,
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
