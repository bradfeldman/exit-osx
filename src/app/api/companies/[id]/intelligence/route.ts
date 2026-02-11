/**
 * GET /api/companies/[id]/intelligence
 *
 * PROD-024: Company Intelligence Layer API
 *
 * Returns the full intelligence profile for a company, aggregating data from
 * the dossier system plus supplemental sources (NA flags, disclosures, notes).
 *
 * Query params:
 *   ?section=financials — Return only a specific section
 *   ?section=naFlags,disclosures — Return multiple specific sections (comma-separated)
 *
 * Auth: Requires COMPANY_VIEW permission on the company.
 *
 * Response shape (full):
 * {
 *   companyId: string,
 *   generatedAt: string (ISO),
 *   identity: IdentitySection,
 *   financials: FinancialsSection,
 *   assessment: AssessmentSection,
 *   valuation: ValuationSection,
 *   tasks: TasksSection,
 *   evidence: EvidenceSection,
 *   signals: SignalsSection,
 *   engagement: EngagementSection,
 *   aiContext: AIContextSection,
 *   naFlags: NAFlagsSection,
 *   disclosures: DisclosuresSection,
 *   notes: NotesSection,
 *   sectionMeta: Record<IntelligenceSectionName, SectionMeta>
 * }
 *
 * Response shape (filtered, e.g. ?section=naFlags):
 * {
 *   companyId: string,
 *   generatedAt: string (ISO),
 *   naFlags: NAFlagsSection,
 *   sectionMeta: { naFlags: SectionMeta }
 * }
 */

import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import {
  buildCompanyIntelligence,
  buildIntelligenceSection,
  isValidSectionName,
  type IntelligenceSectionName,
} from '@/lib/intelligence'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const sectionParam = searchParams.get('section')

    // Single section request — lightweight path
    if (sectionParam) {
      const requestedSections = sectionParam.split(',').map((s) => s.trim())

      // Validate all section names
      const invalidSections = requestedSections.filter((s) => !isValidSectionName(s))
      if (invalidSections.length > 0) {
        return NextResponse.json(
          {
            error: `Invalid section name(s): ${invalidSections.join(', ')}`,
            validSections: [
              'identity', 'financials', 'assessment', 'valuation',
              'tasks', 'evidence', 'signals', 'engagement', 'aiContext',
              'naFlags', 'disclosures', 'notes',
            ],
          },
          { status: 400 }
        )
      }

      const validSections = requestedSections as IntelligenceSectionName[]

      if (validSections.length === 1) {
        // Single section: use the lightweight path
        const sectionData = await buildIntelligenceSection(companyId, validSections[0])
        return NextResponse.json({
          companyId,
          generatedAt: new Date().toISOString(),
          [validSections[0]]: sectionData,
        })
      }

      // Multiple sections: build full intelligence but filter the response
      const intelligence = await buildCompanyIntelligence(companyId, validSections)

      const filtered: Record<string, unknown> = {
        companyId: intelligence.companyId,
        generatedAt: intelligence.generatedAt,
      }

      const filteredMeta: Record<string, unknown> = {}

      for (const section of validSections) {
        filtered[section] = intelligence[section]
        filteredMeta[section] = intelligence.sectionMeta[section]
      }

      filtered.sectionMeta = filteredMeta

      return NextResponse.json(filtered)
    }

    // Full intelligence profile
    const intelligence = await buildCompanyIntelligence(companyId)

    return NextResponse.json(intelligence)
  } catch (error) {
    console.error('[Intelligence] Error building intelligence profile:', error)
    return NextResponse.json(
      { error: 'Failed to build intelligence profile' },
      { status: 500 }
    )
  }
}
