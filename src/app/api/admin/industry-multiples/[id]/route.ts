import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { recalculateSnapshotsForMultipleUpdate } from '@/lib/valuation/recalculate-snapshot'
import { validateRequestBody, shortText } from '@/lib/security/validation'

// GET - Get a specific industry multiple
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const multiple = await prisma.industryMultiple.findUnique({
      where: { id },
    })

    if (!multiple) {
      return NextResponse.json({ error: 'Industry multiple not found' }, { status: 404 })
    }

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
    })
  } catch (error) {
    console.error('Error fetching industry multiple:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch industry multiple' },
      { status: 500 }
    )
  }
}

const industryMultipleUpdateSchema = z.object({
  ebitdaMultipleLow: z.coerce.number().finite().min(0).max(100).optional(),
  ebitdaMultipleHigh: z.coerce.number().finite().min(0).max(100).optional(),
  revenueMultipleLow: z.coerce.number().finite().min(0).max(100).optional(),
  revenueMultipleHigh: z.coerce.number().finite().min(0).max(100).optional(),
  effectiveDate: z.string().datetime().optional(),
  source: shortText.optional(),
})

// PUT - Update an existing industry multiple
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get existing multiple to compare what changed
    const existingMultiple = await prisma.industryMultiple.findUnique({
      where: { id },
    })

    if (!existingMultiple) {
      return NextResponse.json({ error: 'Industry multiple not found' }, { status: 404 })
    }

    const validation = await validateRequestBody(request, industryMultipleUpdateSchema)
    if (!validation.success) return validation.error

    const {
      ebitdaMultipleLow,
      ebitdaMultipleHigh,
      revenueMultipleLow,
      revenueMultipleHigh,
      effectiveDate,
      source,
    } = validation.data

    // Determine what type of update this is
    const ebitdaChanged =
      (ebitdaMultipleLow !== undefined && Number(existingMultiple.ebitdaMultipleLow) !== ebitdaMultipleLow) ||
      (ebitdaMultipleHigh !== undefined && Number(existingMultiple.ebitdaMultipleHigh) !== ebitdaMultipleHigh)

    const revenueChanged =
      (revenueMultipleLow !== undefined && Number(existingMultiple.revenueMultipleLow) !== revenueMultipleLow) ||
      (revenueMultipleHigh !== undefined && Number(existingMultiple.revenueMultipleHigh) !== revenueMultipleHigh)

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (ebitdaMultipleLow !== undefined) {
      updateData.ebitdaMultipleLow = ebitdaMultipleLow
    }

    if (ebitdaMultipleHigh !== undefined) {
      updateData.ebitdaMultipleHigh = ebitdaMultipleHigh
    }

    if (revenueMultipleLow !== undefined) {
      updateData.revenueMultipleLow = revenueMultipleLow
    }

    if (revenueMultipleHigh !== undefined) {
      updateData.revenueMultipleHigh = revenueMultipleHigh
    }

    if (effectiveDate !== undefined) {
      updateData.effectiveDate = new Date(effectiveDate)
    }

    if (source !== undefined) {
      updateData.source = source
    }

    // Validate low <= high after update
    const newEbitdaLow = (updateData.ebitdaMultipleLow ?? Number(existingMultiple.ebitdaMultipleLow)) as number
    const newEbitdaHigh = (updateData.ebitdaMultipleHigh ?? Number(existingMultiple.ebitdaMultipleHigh)) as number
    const newRevenueLow = (updateData.revenueMultipleLow ?? Number(existingMultiple.revenueMultipleLow)) as number
    const newRevenueHigh = (updateData.revenueMultipleHigh ?? Number(existingMultiple.revenueMultipleHigh)) as number

    if (newEbitdaLow > newEbitdaHigh) {
      return NextResponse.json(
        { error: 'EBITDA multiple low must be <= high' },
        { status: 400 }
      )
    }

    if (newRevenueLow > newRevenueHigh) {
      return NextResponse.json(
        { error: 'Revenue multiple low must be <= high' },
        { status: 400 }
      )
    }

    // Update the multiple
    const updatedMultiple = await prisma.industryMultiple.update({
      where: { id },
      data: updateData,
    })

    // Recalculate snapshots if EBITDA or Revenue multiples changed
    let recalcResult = null
    if (ebitdaChanged || revenueChanged) {
      const updateType = ebitdaChanged && revenueChanged ? 'Both' :
                         ebitdaChanged ? 'EBITDA' : 'Revenue'

      recalcResult = await recalculateSnapshotsForMultipleUpdate(
        existingMultiple.icbSubSector,
        existingMultiple.icbSector,
        existingMultiple.icbSuperSector,
        existingMultiple.icbIndustry,
        updateType
      )
    }

    return NextResponse.json({
      multiple: {
        id: updatedMultiple.id,
        icbIndustry: updatedMultiple.icbIndustry,
        icbSuperSector: updatedMultiple.icbSuperSector,
        icbSector: updatedMultiple.icbSector,
        icbSubSector: updatedMultiple.icbSubSector,
        ebitdaMultipleLow: Number(updatedMultiple.ebitdaMultipleLow),
        ebitdaMultipleHigh: Number(updatedMultiple.ebitdaMultipleHigh),
        revenueMultipleLow: Number(updatedMultiple.revenueMultipleLow),
        revenueMultipleHigh: Number(updatedMultiple.revenueMultipleHigh),
        effectiveDate: updatedMultiple.effectiveDate.toISOString(),
        source: updatedMultiple.source,
      },
      multiplesChanged: {
        ebitda: ebitdaChanged,
        revenue: revenueChanged,
      },
      snapshotsUpdated: recalcResult ? {
        total: recalcResult.totalCompanies,
        successful: recalcResult.successful,
        failed: recalcResult.failed,
        results: recalcResult.results,
      } : null,
    })
  } catch (error) {
    console.error('Error updating industry multiple:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update industry multiple' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an industry multiple
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const multiple = await prisma.industryMultiple.findUnique({
      where: { id },
    })

    if (!multiple) {
      return NextResponse.json({ error: 'Industry multiple not found' }, { status: 404 })
    }

    await prisma.industryMultiple.delete({
      where: { id },
    })

    // Note: Deleting a multiple could affect companies if this was their match
    // They will fall back to the next level in the hierarchy
    // We could trigger recalculation here too if desired

    return NextResponse.json({
      success: true,
      message: 'Industry multiple deleted successfully',
      deletedMultiple: {
        icbSubSector: multiple.icbSubSector,
        icbSector: multiple.icbSector,
        icbSuperSector: multiple.icbSuperSector,
        icbIndustry: multiple.icbIndustry,
      },
    })
  } catch (error) {
    console.error('Error deleting industry multiple:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to delete industry multiple' },
      { status: 500 }
    )
  }
}
