import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { recalculateSnapshotsForMultipleUpdate } from '@/lib/valuation/recalculate-snapshot'
import { industryMultiples as defaultMultiples } from '@/../prisma/seed-data/industry-multiples'
import { validateRequestBody, shortText } from '@/lib/security/validation'

// GET - List all industry multiples
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const multiples = await prisma.industryMultiple.findMany({
      orderBy: [
        { icbIndustry: 'asc' },
        { icbSuperSector: 'asc' },
        { icbSector: 'asc' },
        { icbSubSector: 'asc' },
        { effectiveDate: 'desc' },
      ],
    })

    return NextResponse.json({
      multiples: multiples.map(m => ({
        id: m.id,
        icbIndustry: m.icbIndustry,
        icbSuperSector: m.icbSuperSector,
        icbSector: m.icbSector,
        icbSubSector: m.icbSubSector,
        ebitdaMultipleLow: Number(m.ebitdaMultipleLow),
        ebitdaMultipleHigh: Number(m.ebitdaMultipleHigh),
        revenueMultipleLow: Number(m.revenueMultipleLow),
        revenueMultipleHigh: Number(m.revenueMultipleHigh),
        effectiveDate: m.effectiveDate.toISOString(),
        source: m.source,
      })),
    })
  } catch (error) {
    console.error('Error fetching industry multiples:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch industry multiples' },
      { status: 500 }
    )
  }
}

const industryMultipleSchema = z.object({
  icbIndustry: shortText.min(1),
  icbSuperSector: shortText.min(1),
  icbSector: shortText.min(1),
  icbSubSector: shortText.min(1),
  ebitdaMultipleLow: z.coerce.number().finite().min(0).max(100),
  ebitdaMultipleHigh: z.coerce.number().finite().min(0).max(100),
  revenueMultipleLow: z.coerce.number().finite().min(0).max(100),
  revenueMultipleHigh: z.coerce.number().finite().min(0).max(100),
  effectiveDate: z.string().datetime().optional(),
  source: shortText.optional(),
}).refine(data => data.ebitdaMultipleLow <= data.ebitdaMultipleHigh, {
  message: 'EBITDA multiple low must be <= high',
}).refine(data => data.revenueMultipleLow <= data.revenueMultipleHigh, {
  message: 'Revenue multiple low must be <= high',
})

// POST - Create a new industry multiple entry
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the database user ID for tracking
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { id: true },
    })
    const dbUserId = dbUser?.id

    const validation = await validateRequestBody(request, industryMultipleSchema)
    if (!validation.success) return validation.error

    const {
      icbIndustry,
      icbSuperSector,
      icbSector,
      icbSubSector,
      ebitdaMultipleLow,
      ebitdaMultipleHigh,
      revenueMultipleLow,
      revenueMultipleHigh,
      effectiveDate,
      source,
    } = validation.data

    // Create the new multiple entry
    const multiple = await prisma.industryMultiple.create({
      data: {
        icbIndustry,
        icbSuperSector,
        icbSector,
        icbSubSector,
        ebitdaMultipleLow,
        ebitdaMultipleHigh,
        revenueMultipleLow,
        revenueMultipleHigh,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        source,
      },
    })

    // Recalculate snapshots for affected companies
    const recalcResult = await recalculateSnapshotsForMultipleUpdate(
      icbSubSector,
      icbSector,
      icbSuperSector,
      icbIndustry,
      'Both',
      dbUserId
    )

    return NextResponse.json({
      multiple: {
        id: multiple.id,
        icbIndustry: multiple.icbIndustry,
        icbSuperSector: multiple.icbSuperSector,
        icbSector: multiple.icbSector,
        icbSubSector: multiple.icbSubSector,
        ebitdaMultipleLow: Number(multiple.ebitdaMultipleLow),
        ebitdaMultipleHigh: Number(multiple.ebitdaMultipleHigh),
        revenueMultipleLow: Number(multiple.revenueMultipleLow),
        revenueMultipleHigh: Number(multiple.revenueMultipleHigh),
        effectiveDate: multiple.effectiveDate.toISOString(),
        source: multiple.source,
      },
      snapshotsUpdated: {
        total: recalcResult.totalCompanies,
        successful: recalcResult.successful,
        failed: recalcResult.failed,
      },
    })
  } catch (error) {
    console.error('Error creating industry multiple:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to create industry multiple' },
      { status: 500 }
    )
  }
}

// DELETE - Restore all multiples to defaults
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the database user ID for tracking
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { id: true },
    })
    const dbUserId = dbUser?.id

    // Delete all existing multiples
    await prisma.industryMultiple.deleteMany()

    // Recreate from defaults
    for (const multiple of defaultMultiples) {
      await prisma.industryMultiple.create({
        data: {
          icbIndustry: multiple.icbIndustry,
          icbSuperSector: multiple.icbSuperSector,
          icbSector: multiple.icbSector,
          icbSubSector: multiple.icbSubSector,
          revenueMultipleLow: multiple.revenueMultipleLow,
          revenueMultipleHigh: multiple.revenueMultipleHigh,
          ebitdaMultipleLow: multiple.ebitdaMultipleLow,
          ebitdaMultipleHigh: multiple.ebitdaMultipleHigh,
          effectiveDate: multiple.effectiveDate,
          source: multiple.source,
        },
      })
    }

    // Recalculate snapshots for ALL companies since multiples reset
    const allCompanies = await prisma.company.findMany({
      select: { id: true },
    })

    let successful = 0
    let failed = 0

    for (const company of allCompanies) {
      try {
        const { recalculateSnapshotForCompany } = await import('@/lib/valuation/recalculate-snapshot')
        const result = await recalculateSnapshotForCompany(company.id, 'Industry multiples restored to defaults', dbUserId)
        if (result.success) {
          successful++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }

    // Fetch the newly created multiples
    const multiples = await prisma.industryMultiple.findMany({
      orderBy: [
        { icbIndustry: 'asc' },
        { icbSuperSector: 'asc' },
        { icbSector: 'asc' },
        { icbSubSector: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      message: 'Industry multiples restored to defaults',
      count: multiples.length,
      snapshotsUpdated: {
        total: allCompanies.length,
        successful,
        failed,
      },
      multiples: multiples.map(m => ({
        id: m.id,
        icbIndustry: m.icbIndustry,
        icbSuperSector: m.icbSuperSector,
        icbSector: m.icbSector,
        icbSubSector: m.icbSubSector,
        ebitdaMultipleLow: Number(m.ebitdaMultipleLow),
        ebitdaMultipleHigh: Number(m.ebitdaMultipleHigh),
        revenueMultipleLow: Number(m.revenueMultipleLow),
        revenueMultipleHigh: Number(m.revenueMultipleHigh),
        effectiveDate: m.effectiveDate.toISOString(),
        source: m.source,
      })),
    })
  } catch (error) {
    console.error('Error restoring default multiples:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to restore default multiples' },
      { status: 500 }
    )
  }
}
