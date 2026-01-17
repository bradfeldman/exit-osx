import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'

const BRI_WEIGHTS_KEY = 'bri_category_weights'

// Default weights that must sum to 1.0 (100%)
export const DEFAULT_BRI_WEIGHTS = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

export type BriWeights = typeof DEFAULT_BRI_WEIGHTS

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
    console.error('Error fetching BRI weights:', error)
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

  try {
    // Get the database user ID for tracking who triggered the update
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { id: true },
    })
    const dbUserId = dbUser?.id

    const body = await request.json()
    const weights = body.weights as BriWeights

    // Validate all required keys exist
    const requiredKeys = Object.keys(DEFAULT_BRI_WEIGHTS)
    for (const key of requiredKeys) {
      if (typeof weights[key as keyof BriWeights] !== 'number') {
        return NextResponse.json(
          { error: `Missing or invalid weight for ${key}` },
          { status: 400 }
        )
      }
    }

    // Validate weights sum to exactly 100% (sum rounded percentages)
    const sumPercent = Object.values(weights).reduce((a, b) => a + Math.round(b * 100), 0)
    if (sumPercent !== 100) {
      return NextResponse.json(
        { error: `Weights must sum to exactly 100%. Current sum: ${sumPercent}%` },
        { status: 400 }
      )
    }

    // Validate each weight is between 0 and 1
    for (const [key, value] of Object.entries(weights)) {
      if (value < 0 || value > 1) {
        return NextResponse.json(
          { error: `Weight for ${key} must be between 0% and 100%` },
          { status: 400 }
        )
      }
    }

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
    console.error('Error updating BRI weights:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to update BRI weights: ${errorMessage}` },
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
    console.error('Error restoring default BRI weights:', error)
    return NextResponse.json(
      { error: 'Failed to restore default weights' },
      { status: 500 }
    )
  }
}
