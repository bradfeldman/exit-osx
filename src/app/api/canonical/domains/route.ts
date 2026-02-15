import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { PAGINATION, FREE_EMAIL_DOMAINS } from '@/lib/contact-system/constants'

/**
 * GET /api/canonical/domains
 * Get all canonical domains with optional filtering
 */
export async function GET(request: NextRequest) {
  // SECURITY FIX (SEC-032): Domain management is an admin operation
  const result = await checkPermission('ORG_MANAGE_MEMBERS')
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const companyId = searchParams.get('companyId')
    const page = parseInt(searchParams.get('page') || String(PAGINATION.DEFAULT_PAGE))
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT)),
      PAGINATION.MAX_LIMIT
    )

    // Build filter
    const where: Record<string, unknown> = {}

    if (companyId) {
      where.companyId = companyId
    }

    if (search) {
      where.domain = { contains: search, mode: 'insensitive' }
    }

    const [domains, total] = await Promise.all([
      prisma.canonicalDomain.findMany({
        where,
        include: {
          company: {
            select: { id: true, name: true, companyType: true },
          },
        },
        orderBy: { domain: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.canonicalDomain.count({ where }),
    ])

    return NextResponse.json({
      domains,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching canonical domains:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/canonical/domains
 * Add a domain to a canonical company
 */
export async function POST(request: NextRequest) {
  // SECURITY FIX (SEC-032): Domain management is an admin operation
  const result = await checkPermission('ORG_MANAGE_MEMBERS')
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { domain, companyId, isPrimary = false } = body

    if (!domain || !companyId) {
      return NextResponse.json(
        { error: 'Domain and companyId are required' },
        { status: 400 }
      )
    }

    const normalizedDomain = domain.toLowerCase().trim()

    // Validate domain format
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/.test(normalizedDomain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      )
    }

    // Check for free email domains
    if (FREE_EMAIL_DOMAINS.has(normalizedDomain)) {
      return NextResponse.json(
        { error: 'Cannot add free email domains (gmail, yahoo, etc.)' },
        { status: 400 }
      )
    }

    // Check if domain already exists
    const existing = await prisma.canonicalDomain.findUnique({
      where: { domain: normalizedDomain },
      include: { company: { select: { id: true, name: true } } },
    })

    if (existing) {
      return NextResponse.json({
        error: 'Domain already associated with a company',
        existingCompany: {
          id: existing.company.id,
          name: existing.company.name,
        },
      }, { status: 400 })
    }

    // Check if company exists
    const company = await prisma.canonicalCompany.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // If setting as primary, unset other primaries first
    if (isPrimary) {
      await prisma.canonicalDomain.updateMany({
        where: { companyId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const domainRecord = await prisma.canonicalDomain.create({
      data: {
        domain: normalizedDomain,
        companyId,
        isPrimary,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ domain: domainRecord }, { status: 201 })
  } catch (error) {
    console.error('Error creating canonical domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/canonical/domains
 * Remove a domain from a company
 */
export async function DELETE(request: NextRequest) {
  // SECURITY FIX (SEC-032): Domain management is an admin operation
  const result = await checkPermission('ORG_MANAGE_MEMBERS')
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { domainId, domain } = body

    // Can delete by ID or domain string
    const where = domainId ? { id: domainId } : domain ? { domain: domain.toLowerCase() } : null

    if (!where) {
      return NextResponse.json(
        { error: 'domainId or domain is required' },
        { status: 400 }
      )
    }

    const existing = await prisma.canonicalDomain.findFirst({ where })

    if (!existing) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    await prisma.canonicalDomain.delete({ where: { id: existing.id } })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Error deleting canonical domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
