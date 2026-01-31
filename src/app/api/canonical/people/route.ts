import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { DataQuality } from '@prisma/client'
import { normalizePersonName, extractDomain, findPersonMatches } from '@/lib/contact-system/identity-resolution'
import { PAGINATION, FREE_EMAIL_DOMAINS } from '@/lib/contact-system/constants'

/**
 * GET /api/canonical/people
 * Get all canonical people with optional filtering
 */
export async function GET(request: NextRequest) {
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const companyId = searchParams.get('companyId')
    const dataQuality = searchParams.get('dataQuality') as DataQuality | null
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const sortField = searchParams.get('sort') || 'lastName'
    const sortOrder = searchParams.get('order') || 'asc'
    const page = parseInt(searchParams.get('page') || String(PAGINATION.DEFAULT_PAGE))
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT)),
      PAGINATION.MAX_LIMIT
    )

    // Build filter
    const where: Record<string, unknown> = {}

    if (!includeDeleted) {
      where.mergedIntoId = null
    }

    if (companyId) {
      where.currentCompanyId = companyId
    }

    if (dataQuality) {
      where.dataQuality = dataQuality
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { normalizedName: { contains: search.toLowerCase(), mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { currentTitle: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Build sort
    const orderBy: Record<string, string>[] = []
    if (sortField === 'lastName') {
      orderBy.push({ lastName: sortOrder })
      orderBy.push({ firstName: 'asc' })
    } else if (sortField === 'firstName') {
      orderBy.push({ firstName: sortOrder })
      orderBy.push({ lastName: 'asc' })
    } else if (sortField === 'email') {
      orderBy.push({ email: sortOrder })
    } else if (sortField === 'createdAt') {
      orderBy.push({ createdAt: sortOrder })
    } else {
      orderBy.push({ lastName: sortOrder })
    }

    // Get people with pagination
    const [people, total] = await Promise.all([
      prisma.canonicalPerson.findMany({
        where,
        include: {
          currentCompany: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              dealContacts: true,
              employmentHistory: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.canonicalPerson.count({ where }),
    ])

    // Get summary counts by data quality
    const qualityCounts = await prisma.canonicalPerson.groupBy({
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
      people,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    })
  } catch (error) {
    console.error('Error fetching canonical people:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/canonical/people
 * Create a new canonical person
 */
export async function POST(request: NextRequest) {
  const result = await checkPermission('COMPANY_UPDATE')
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      linkedInUrl,
      currentTitle,
      currentCompanyId,
      currentCompanyName,
      skipDuplicateCheck,
    } = body

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    const normalizedName = normalizePersonName(firstName, lastName)

    // If email provided, check it's unique
    if (email) {
      const existingEmail = await prisma.canonicalPerson.findUnique({
        where: { email: email.toLowerCase() },
      })
      if (existingEmail) {
        return NextResponse.json({
          error: 'A person with this email already exists',
          existingPerson: {
            id: existingEmail.id,
            firstName: existingEmail.firstName,
            lastName: existingEmail.lastName,
          },
        }, { status: 400 })
      }
    }

    // Check for potential duplicates (unless explicitly skipped)
    if (!skipDuplicateCheck) {
      const matchResult = await findPersonMatches({
        firstName,
        lastName,
        email,
        linkedInUrl,
        companyName: currentCompanyName,
      })

      if (matchResult.suggestedAction !== 'CREATE_NEW') {
        return NextResponse.json({
          duplicateWarning: true,
          matchResult,
          message: 'Potential duplicate detected. Use skipDuplicateCheck=true to create anyway.',
        }, { status: 409 })
      }
    }

    // Resolve company ID
    let resolvedCompanyId = currentCompanyId

    // If no company ID but have email, try to find company by domain
    if (!resolvedCompanyId && email) {
      const domain = extractDomain(email)
      if (domain && !FREE_EMAIL_DOMAINS.has(domain)) {
        const domainRecord = await prisma.canonicalDomain.findUnique({
          where: { domain },
        })
        if (domainRecord) {
          resolvedCompanyId = domainRecord.companyId
        }
      }
    }

    // Create person
    const person = await prisma.canonicalPerson.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        normalizedName,
        email: email?.toLowerCase().trim() || null,
        phone: phone?.trim() || null,
        linkedInUrl: linkedInUrl?.trim() || null,
        currentTitle: currentTitle?.trim() || null,
        currentCompanyId: resolvedCompanyId || null,
        dataQuality: 'PROVISIONAL',
      },
      include: {
        currentCompany: { select: { id: true, name: true } },
      },
    })

    // If company was resolved from email domain, create employment record
    if (resolvedCompanyId && currentTitle) {
      await prisma.personEmployment.create({
        data: {
          personId: person.id,
          companyId: resolvedCompanyId,
          title: currentTitle.trim(),
          isCurrent: true,
        },
      })
    }

    return NextResponse.json({ person }, { status: 201 })
  } catch (error) {
    console.error('Error creating canonical person:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
