import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'
import { DEFAULT_BRI_WEIGHTS, type BriWeights } from '@/lib/bri-weights'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const BRI_WEIGHTS_KEY = 'bri_category_weights'

const briWeightsSchema = z.object({
  weights: z.object({
    financial: z.coerce.number().finite().min(0).max(1),
    transferability: z.coerce.number().finite().min(0).max(1),
    operational: z.coerce.number().finite().min(0).max(1),
    market: z.coerce.number().finite().min(0).max(1),
    legalTax: z.coerce.number().finite().min(0).max(1),
    personal: z.coerce.number().finite().min(0).max(1),
  }).refine(
    (weights) => {
      const sumPercent = Object.values(weights).reduce((a, b) => a + Math.round(b * 100), 0)
      return sumPercent === 100
    },
    { message: 'Weights must sum to exactly 100%' }
  ).refine(
    (weights) => Object.values(weights).every(v => v >= 0 && v <= 1),
    { message: 'Each weight must be between 0 and 1' }
  ),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: BRI_WEIGHTS_KEY },
    })

    const weights = setting?.value as BriWeights || DEFAULT_BRI_WEIGHTS

    return NextResponse.json({
      weights,
      isDefault: !setting,
    })
  } catch (error) {
    console.error('Error fetching BRI weights:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch BRI weights' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = await validateRequestBody(request, briWeightsSchema)
  if (!validation.success) return validation.error
  const { weights } = validation.data

  try {
    // Get the database user ID for tracking who triggered the update
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { id: true },
    })
    const dbUserId = dbUser?.id

    // Upsert the setting
    const setting = await prisma.systemSetting.upsert({
      where: { key: BRI_WEIGHTS_KEY },
      update: { value: weights },
      create: { key: BRI_WEIGHTS_KEY, value: weights },
    })

    // Recalculate snapshots for all companies using global defaults (briWeights is null)
    const companiesUsingDefaults = await prisma.company.findMany({
      where: { briWeights: { equals: Prisma.DbNull } },
      select: { id: true },
    })

    let recalculated = 0
    for (const company of companiesUsingDefaults) {
      const result = await recalculateSnapshotForCompany(company.id, 'Global BRI weights updated', dbUserId)
      if (result.success) recalculated++
    }

    return NextResponse.json({
      weights: setting.value as BriWeights,
      isDefault: false,
      companiesRecalculated: recalculated,
    })
  } catch (error) {
    console.error('Error updating BRI weights:', error instanceof Error ? error.message : String(error))
    // SECURITY FIX (PROD-060): Removed error.message from response to prevent leaking internal details
    return NextResponse.json(
      { error: 'Failed to update BRI weights' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the database user ID for tracking who triggered the update
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { id: true },
    })
    const dbUserId = dbUser?.id

    // Delete the custom setting to restore defaults
    await prisma.systemSetting.delete({
      where: { key: BRI_WEIGHTS_KEY },
    }).catch(() => {
      // Ignore if not found
    })

    // Recalculate snapshots for all companies using global defaults (briWeights is null)
    const companiesUsingDefaults = await prisma.company.findMany({
      where: { briWeights: { equals: Prisma.DbNull } },
      select: { id: true },
    })

    let recalculated = 0
    for (const company of companiesUsingDefaults) {
      const result = await recalculateSnapshotForCompany(company.id, 'Global BRI weights restored to defaults', dbUserId)
      if (result.success) recalculated++
    }

    return NextResponse.json({
      weights: DEFAULT_BRI_WEIGHTS,
      isDefault: true,
      companiesRecalculated: recalculated,
    })
  } catch (error) {
    console.error('Error restoring default BRI weights:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to restore default weights' },
      { status: 500 }
    )
  }
}
