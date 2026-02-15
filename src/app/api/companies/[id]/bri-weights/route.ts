import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'

// Default weights that must sum to 1.0 (100%)
const DEFAULT_BRI_WEIGHTS = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

type BriWeights = typeof DEFAULT_BRI_WEIGHTS

// GET - Get company's BRI weights (company-specific or global defaults)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { briWeights: true },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // If company has custom weights, use them; otherwise get global defaults
    let weights: BriWeights
    let isDefault: boolean
    let isGlobal: boolean

    if (company.briWeights) {
      weights = company.briWeights as BriWeights
      isDefault = false
      isGlobal = false
    } else {
      // Check for global custom weights
      const globalSetting = await prisma.systemSetting.findUnique({
        where: { key: 'bri_category_weights' },
      })

      if (globalSetting?.value) {
        weights = globalSetting.value as BriWeights
        isDefault = false
        isGlobal = true
      } else {
        weights = DEFAULT_BRI_WEIGHTS
        isDefault = true
        isGlobal = true
      }
    }

    return NextResponse.json({
      weights,
      isDefault,
      isGlobal,
      defaultWeights: DEFAULT_BRI_WEIGHTS,
    })
  } catch (error) {
    console.error('Error fetching company BRI weights:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch BRI weights' },
      { status: 500 }
    )
  }
}

// PUT - Set company-specific BRI weights
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
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

    // Validate weights sum to exactly 100%
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

    // Update company with new weights
    await prisma.company.update({
      where: { id: companyId },
      data: { briWeights: weights },
    })

    // Recalculate snapshot for this company
    const recalcResult = await recalculateSnapshotForCompany(
      companyId,
      'BRI weights updated',
      result.auth.user.id
    )

    return NextResponse.json({
      weights,
      isDefault: false,
      isGlobal: false,
      snapshotUpdated: recalcResult.success,
      snapshotId: recalcResult.snapshotId,
    })
  } catch (error) {
    console.error('Error updating company BRI weights:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update BRI weights' },
      { status: 500 }
    )
  }
}

// DELETE - Remove company-specific weights (revert to global/defaults)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    // Remove company-specific weights
    await prisma.company.update({
      where: { id: companyId },
      data: { briWeights: Prisma.DbNull },
    })

    // Recalculate snapshot for this company
    const recalcResult = await recalculateSnapshotForCompany(
      companyId,
      'BRI weights reverted to defaults',
      result.auth.user.id
    )

    // Get the effective weights (global or default)
    const globalSetting = await prisma.systemSetting.findUnique({
      where: { key: 'bri_category_weights' },
    })

    const weights = globalSetting?.value as BriWeights || DEFAULT_BRI_WEIGHTS
    const isDefault = !globalSetting

    return NextResponse.json({
      weights,
      isDefault,
      isGlobal: true,
      snapshotUpdated: recalcResult.success,
      snapshotId: recalcResult.snapshotId,
    })
  } catch (error) {
    console.error('Error removing company BRI weights:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to remove BRI weights' },
      { status: 500 }
    )
  }
}
