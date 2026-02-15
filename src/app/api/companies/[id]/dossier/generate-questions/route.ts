import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { generateQuestionsForCompany } from '@/lib/dossier/ai-questions'
import { getCurrentDossier, updateDossier } from '@/lib/dossier/build-dossier'
import { applyUserRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limit'

export const maxDuration = 60

/**
 * POST /api/companies/[id]/dossier/generate-questions
 * Generates AI-tailored BRI questions for the company.
 * Creates a dossier first if none exists.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  // SEC-034: Rate limit AI endpoints
  const rl = await applyUserRateLimit(request, result.auth.user.id, RATE_LIMIT_CONFIGS.AI)
  if (!rl.success) return createRateLimitResponse(rl)

  try {
    // Ensure dossier exists — build one if needed
    let dossier = await getCurrentDossier(companyId)
    if (!dossier) {
      dossier = await updateDossier(companyId, 'manual_rebuild', 'question_generation')
    }

    const { questionIds, reasoning } = await generateQuestionsForCompany(companyId)

    return NextResponse.json({
      questionIds,
      questionCount: questionIds.length,
      reasoning,
      dossierVersion: dossier.version,
    })
  } catch (error) {
    console.error(`[Dossier] Question generation failed for company ${companyId}:`, error)
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}
