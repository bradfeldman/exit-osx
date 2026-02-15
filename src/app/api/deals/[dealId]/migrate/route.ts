import { NextRequest, NextResponse } from 'next/server'
import { authorizeDealAccess } from '@/lib/deal-tracker/deal-auth'
import {
  runFullMigration,
  validateMigrationReadiness,
  rollbackMigration,
  type MigrationOptions,
} from '@/lib/contact-system/migration'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

type RouteParams = Promise<{ dealId: string }>

const postSchema = z.object({
  dryRun: z.boolean().default(false),
  skipDuplicateCheck: z.boolean().default(false),
})

/**
 * POST /api/deals/[dealId]/migrate
 * Run data migration for a deal.
 *
 * Body:
 * - dryRun?: boolean - If true, simulates migration without making changes
 * - skipDuplicateCheck?: boolean - If true, skips duplicate detection
 */
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { dealId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_UPDATE')
  if (authResult instanceof NextResponse) return authResult

  try {
    const input = await validateRequestBody(request, postSchema)
    if (!input.success) return input.error
    const { dryRun, skipDuplicateCheck } = input.data

    // Validate migration readiness
    const validation = await validateMigrationReadiness(dealId)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Migration validation failed',
          issues: validation.issues,
        },
        { status: 400 }
      )
    }

    // Run migration
    const options: MigrationOptions = {
      dryRun,
      skipDuplicateCheck,
    }

    const result = await runFullMigration(dealId, options)

    return NextResponse.json({
      success: result.success,
      dryRun,
      summary: result.summary,
      errors: result.errors,
      duration: result.duration,
      validationIssues: validation.issues,
    })
  } catch (error) {
    console.error('Error running migration:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to run migration' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/deals/[dealId]/migrate
 * Validate migration readiness for a deal.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { dealId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_VIEW')
  if (authResult instanceof NextResponse) return authResult

  try {

    const validation = await validateMigrationReadiness(dealId)

    return NextResponse.json({
      dealId,
      isReady: validation.isValid,
      issues: validation.issues,
    })
  } catch (error) {
    console.error('Error validating migration:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to validate migration readiness' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/deals/[dealId]/migrate
 * Rollback migration for a deal.
 *
 * Query:
 * - dryRun?: boolean - If true, simulates rollback without making changes
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { dealId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_UPDATE')
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get('dryRun') === 'true'

    const result = await rollbackMigration(dealId, { dryRun })

    return NextResponse.json({
      success: true,
      dryRun,
      ...result,
    })
  } catch (error) {
    console.error('Error rolling back migration:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to rollback migration' },
      { status: 500 }
    )
  }
}
