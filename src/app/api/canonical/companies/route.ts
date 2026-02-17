import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { BuyerType, DataQuality } from '@prisma/client'
import { normalizeCompanyName, extractDomainFromUrl, findCompanyMatches } from '@/lib/contact-system/identity-resolution'
import { PAGINATION, FREE_EMAIL_DOMAINS } from '@/lib/contact-system/constants'
import { validateRequestBody, shortText, longText } from '@/lib/security/validation'

/**
 * GET /api/canonical/companies
 * Get all canonical companies with optional filtering
 */
export async function GET(request: NextRequest) {
  // Requires admin permission for canonical data management
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const companyType = searchParams.get('companyType') as BuyerType | null
    const dataQuality = searchParams.get('dataQuality') as DataQuality | null
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const sortField = searchParams.get('sort') || 'name'
    const sortOrder = searchParams.get('order') || 'asc'
    const page = parseInt(searchParams.get('page') || String(PAGINATION.DEFAULT_PAGE))
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT)),
      PAGINATION.MAX_LIMIT
    )

    // Build filter
    const where: Record<string, unknown> = {}

    // Exclude merged records by default
    if (!includeDeleted) {
      where.mergedIntoId = null
    }

    if (companyType) {
      where.companyType = companyType
    }

    if (dataQuality) {
      where.dataQuality = dataQuality
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { normalizedName: { contains: search.toLowerCase(), mode: 'insensitive' } },
        { website: { contains: search, mode: 'insensitive' } },
        { domains: { some: { domain: { contains: search, mode: 'insensitive' } } } },
      ]
    }

    // Build sort
    const orderBy: Record<string, string> = {}
    if (sortField === 'name') {
      orderBy.name = sortOrder
    } else if (sortField === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else if (sortField === 'updatedAt') {
      orderBy.updatedAt = sortOrder
    } else {
      orderBy.name = sortOrder
    }

    // Get companies with pagination
    const [companies, total] = await Promise.all([
      prisma.canonicalCompany.findMany({
        where,
        include: {
          domains: { select: { domain: true, isPrimary: true } },
          _count: {
            select: {
              people: true,
              dealBuyers: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.canonicalCompany.count({ where }),
    ])

    // Get summary counts by data quality
    const qualityCounts = await prisma.canonicalCompany.groupBy({
      by: ['dataQuality'],
      where: { mergedIntoId: null },
      _count: true,
    })

    const summary = {
      provisional: 0,
      suggested: 0,
      verified: 0,
      enriched: 0,
    }
    qualityCounts.forEach((q) => {
      const key = q.dataQuality.toLowerCase() as keyof typeof summary
      summary[key] = q._count
    })

    return NextResponse.json({
      companies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    })
  } catch (error) {
    console.error('Error fetching canonical companies:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const canonicalCompanyCreateSchema = z.object({
  name: shortText.min(1),
  legalName: shortText.optional().nullable(),
  website: z.string().max(2000).optional().nullable(),
  linkedInUrl: z.string().max(2000).optional().nullable(),
  companyType: z.enum(['STRATEGIC', 'FINANCIAL', 'INDIVIDUAL', 'MANAGEMENT', 'ESOP', 'OTHER']).optional(),
  industryCode: shortText.optional().nullable(),
  industryName: shortText.optional().nullable(),
  headquarters: shortText.optional().nullable(),
  country: shortText.optional().nullable(),
  employeeCount: z.coerce.number().int().min(0).optional().nullable(),
  foundedYear: z.coerce.number().int().min(1800).max(new Date().getFullYear() + 1).optional().nullable(),
  aum: z.coerce.number().finite().optional().nullable(),
  description: longText.optional().nullable(),
  domains: z.array(z.string().max(255)).max(20).optional(),
  skipDuplicateCheck: z.boolean().optional(),
})

/**
 * POST /api/canonical/companies
 * Create a new canonical company
 * SECURITY FIX (SEC-090): Elevated to ORG_MANAGE_MEMBERS — canonical entities are
 * global/shared records. Write operations require admin-level workspace permission
 * to prevent cross-tenant data pollution.
 */
export async function POST(request: NextRequest) {
  const result = await checkPermission('ORG_MANAGE_MEMBERS')
  if (isAuthError(result)) return result.error

  try {
    const validation = await validateRequestBody(request, canonicalCompanyCreateSchema)
    if (!validation.success) return validation.error

    const {
      name,
      legalName,
      website,
      linkedInUrl,
      companyType,
      industryCode,
      industryName,
      headquarters,
      country,
      employeeCount,
      foundedYear,
      aum,
      description,
      domains: inputDomains,
      skipDuplicateCheck,
    } = validation.data

    const normalizedName = normalizeCompanyName(name)

    // Extract domain from website if not provided
    const websiteDomain = website ? extractDomainFromUrl(website) : null
    const domainsToCreate: string[] = []

    // Add domains from input
    if (inputDomains && Array.isArray(inputDomains)) {
      domainsToCreate.push(...inputDomains.map((d: string) => d.toLowerCase()))
    }

    // Add website domain if not already included
    if (websiteDomain && !domainsToCreate.includes(websiteDomain) && !FREE_EMAIL_DOMAINS.has(websiteDomain)) {
      domainsToCreate.push(websiteDomain)
    }

    // Check for potential duplicates (unless explicitly skipped)
    if (!skipDuplicateCheck) {
      const matchResult = await findCompanyMatches({
        name,
        website,
        linkedInUrl,
        domain: domainsToCreate[0],
      })

      if (matchResult.suggestedAction !== 'CREATE_NEW') {
        return NextResponse.json({
          duplicateWarning: true,
          matchResult,
          message: 'Potential duplicate detected. Use skipDuplicateCheck=true to create anyway.',
        }, { status: 409 })
      }
    }

    // Check for existing domains
    if (domainsToCreate.length > 0) {
      const existingDomains = await prisma.canonicalDomain.findMany({
        where: { domain: { in: domainsToCreate } },
        include: { company: { select: { id: true, name: true } } },
      })

      if (existingDomains.length > 0) {
        return NextResponse.json({
          error: 'Domain already associated with another company',
          existingDomains: existingDomains.map(d => ({
            domain: d.domain,
            companyId: d.company.id,
            companyName: d.company.name,
          })),
        }, { status: 400 })
      }
    }

    // Create company with domains
    const company = await prisma.canonicalCompany.create({
      data: {
        name: name.trim(),
        normalizedName,
        legalName: legalName?.trim() || null,
        website: website?.trim() || null,
        linkedInUrl: linkedInUrl?.trim() || null,
        companyType: companyType || 'OTHER',
        industryCode: industryCode?.trim() || null,
        industryName: industryName?.trim() || null,
        headquarters: headquarters?.trim() || null,
        country: country?.trim() || null,
        employeeCount: employeeCount || null,
        foundedYear: foundedYear || null,
        aum: aum || null,
        description: description?.trim() || null,
        dataQuality: 'PROVISIONAL',
        domains: {
          create: domainsToCreate.map((domain, index) => ({
            domain,
            isPrimary: index === 0,
          })),
        },
      },
      include: {
        domains: { select: { domain: true, isPrimary: true } },
      },
    })

    return NextResponse.json({ company }, { status: 201 })
  } catch (error) {
    console.error('Error creating canonical company:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
