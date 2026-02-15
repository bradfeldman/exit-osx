import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { findDuplicateCompanies, findDuplicatePeople } from '@/lib/contact-system/identity-resolution'
import { PAGINATION } from '@/lib/contact-system/constants'

/**
 * GET /api/canonical/duplicates
 * Get potential duplicate companies and people for admin review
 */
export async function GET(request: NextRequest) {
  // SECURITY FIX (SEC-032): Duplicate management is an admin operation
  const result = await checkPermission('ORG_MANAGE_MEMBERS')
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType') || 'all' // 'company', 'person', 'all'
    const status = searchParams.get('status') || 'PENDING' // 'PENDING', 'RESOLVED', 'SKIPPED', 'all'
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0.70')
    const page = parseInt(searchParams.get('page') || String(PAGINATION.DEFAULT_PAGE))
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT)),
      PAGINATION.MAX_LIMIT
    )

    // Check if we should run fresh detection or use cached candidates
    const useCache = searchParams.get('useCache') !== 'false'

    if (useCache) {
      // Fetch from DuplicateCandidate table
      const where: Record<string, unknown> = {}

      if (entityType !== 'all') {
        where.entityType = entityType === 'company' ? 'COMPANY' : 'PERSON'
      }

      if (status !== 'all') {
        where.status = status
      }

      if (minConfidence > 0) {
        where.confidence = { gte: minConfidence }
      }

      const [candidates, total] = await Promise.all([
        prisma.duplicateCandidate.findMany({
          where,
          orderBy: [
            { status: 'asc' }, // PENDING first
            { confidence: 'desc' },
          ],
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.duplicateCandidate.count({ where }),
      ])

      // Enrich candidates with entity details
      const enrichedCandidates = await Promise.all(
        candidates.map(async (candidate) => {
          if (candidate.entityType === 'COMPANY') {
            const [companyA, companyB] = await Promise.all([
              candidate.companyAId
                ? prisma.canonicalCompany.findUnique({
                    where: { id: candidate.companyAId },
                    select: { id: true, name: true, website: true, dataQuality: true },
                  })
                : null,
              candidate.companyBId
                ? prisma.canonicalCompany.findUnique({
                    where: { id: candidate.companyBId },
                    select: { id: true, name: true, website: true, dataQuality: true },
                  })
                : null,
            ])
            return { ...candidate, companyA, companyB }
          } else {
            const [personA, personB] = await Promise.all([
              candidate.personAId
                ? prisma.canonicalPerson.findUnique({
                    where: { id: candidate.personAId },
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      currentTitle: true,
                      dataQuality: true,
                    },
                  })
                : null,
              candidate.personBId
                ? prisma.canonicalPerson.findUnique({
                    where: { id: candidate.personBId },
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      currentTitle: true,
                      dataQuality: true,
                    },
                  })
                : null,
            ])
            return { ...candidate, personA, personB }
          }
        })
      )

      // Get summary counts
      const statusCounts = await prisma.duplicateCandidate.groupBy({
        by: ['status', 'entityType'],
        _count: true,
      })

      const summary = {
        companies: { pending: 0, resolved: 0, skipped: 0 },
        people: { pending: 0, resolved: 0, skipped: 0 },
      }

      statusCounts.forEach((s) => {
        const key = s.entityType === 'COMPANY' ? 'companies' : 'people'
        const statusKey = s.status.toLowerCase() as 'pending' | 'resolved' | 'skipped'
        summary[key][statusKey] = s._count
      })

      return NextResponse.json({
        candidates: enrichedCandidates,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        summary,
      })
    } else {
      // Run fresh duplicate detection (expensive operation)
      const results: { companies: unknown[]; people: unknown[] } = {
        companies: [],
        people: [],
      }

      if (entityType === 'all' || entityType === 'company') {
        results.companies = await findDuplicateCompanies(minConfidence)
      }

      if (entityType === 'all' || entityType === 'person') {
        results.people = await findDuplicatePeople(minConfidence)
      }

      return NextResponse.json({
        freshResults: true,
        companies: results.companies.slice(0, limit),
        people: results.people.slice(0, limit),
        totalCompanyDuplicates: results.companies.length,
        totalPersonDuplicates: results.people.length,
      })
    }
  } catch (error) {
    console.error('Error fetching duplicates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/canonical/duplicates
 * Run duplicate detection and save candidates to database
 */
export async function POST(request: NextRequest) {
  // SECURITY FIX (SEC-032): Running duplicate detection is an admin operation
  const result = await checkPermission('ORG_MANAGE_MEMBERS')
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { entityType, minConfidence = 0.70 } = body

    let companyDuplicates: Awaited<ReturnType<typeof findDuplicateCompanies>> = []
    let personDuplicates: Awaited<ReturnType<typeof findDuplicatePeople>> = []

    // Run detection
    if (!entityType || entityType === 'company') {
      companyDuplicates = await findDuplicateCompanies(minConfidence)
    }

    if (!entityType || entityType === 'person') {
      personDuplicates = await findDuplicatePeople(minConfidence)
    }

    // Save candidates to database (avoiding duplicates)
    let savedCompany = 0
    let savedPerson = 0

    for (const dup of companyDuplicates) {
      // Check if this pair already exists
      const existing = await prisma.duplicateCandidate.findFirst({
        where: {
          entityType: 'COMPANY',
          OR: [
            { companyAId: dup.entityA.id, companyBId: dup.entityB.id },
            { companyAId: dup.entityB.id, companyBId: dup.entityA.id },
          ],
        },
      })

      if (!existing) {
        await prisma.duplicateCandidate.create({
          data: {
            entityType: 'COMPANY',
            companyAId: dup.entityA.id,
            companyBId: dup.entityB.id,
            confidence: dup.confidence,
            matchReasons: dup.matchReasons,
            status: 'PENDING',
          },
        })
        savedCompany++
      }
    }

    for (const dup of personDuplicates) {
      const existing = await prisma.duplicateCandidate.findFirst({
        where: {
          entityType: 'PERSON',
          OR: [
            { personAId: dup.entityA.id, personBId: dup.entityB.id },
            { personAId: dup.entityB.id, personBId: dup.entityA.id },
          ],
        },
      })

      if (!existing) {
        await prisma.duplicateCandidate.create({
          data: {
            entityType: 'PERSON',
            personAId: dup.entityA.id,
            personBId: dup.entityB.id,
            confidence: dup.confidence,
            matchReasons: dup.matchReasons,
            status: 'PENDING',
          },
        })
        savedPerson++
      }
    }

    return NextResponse.json({
      success: true,
      detected: {
        companies: companyDuplicates.length,
        people: personDuplicates.length,
      },
      saved: {
        companies: savedCompany,
        people: savedPerson,
      },
      message: `Found ${companyDuplicates.length} company and ${personDuplicates.length} person duplicate pairs. Saved ${savedCompany + savedPerson} new candidates.`,
    })
  } catch (error) {
    console.error('Error running duplicate detection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
