import type { CompanyDossierContent, DossierSectionName } from '../types'
import { buildIdentitySection } from './build-identity'
import { buildFinancialsSection } from './build-financials'
import { buildAssessmentSection } from './build-assessment'
import { buildValuationSection } from './build-valuation'
import { buildTasksSection } from './build-tasks'
import { buildEvidenceSection } from './build-evidence'
import { buildSignalsSection } from './build-signals'
import { buildEngagementSection } from './build-engagement'
import { buildAIContextSection } from './build-ai-context'

const SECTION_BUILDERS: Record<
  DossierSectionName,
  (companyId: string) => Promise<CompanyDossierContent[DossierSectionName]>
> = {
  identity: buildIdentitySection,
  financials: buildFinancialsSection,
  assessment: buildAssessmentSection,
  valuation: buildValuationSection,
  tasks: buildTasksSection,
  evidence: buildEvidenceSection,
  signals: buildSignalsSection,
  engagement: buildEngagementSection,
  aiContext: buildAIContextSection,
}

/**
 * Build all 9 dossier sections in parallel
 */
export async function buildAllSections(
  companyId: string
): Promise<CompanyDossierContent> {
  const [
    identity,
    financials,
    assessment,
    valuation,
    tasks,
    evidence,
    signals,
    engagement,
    aiContext,
  ] = await Promise.all([
    buildIdentitySection(companyId),
    buildFinancialsSection(companyId),
    buildAssessmentSection(companyId),
    buildValuationSection(companyId),
    buildTasksSection(companyId),
    buildEvidenceSection(companyId),
    buildSignalsSection(companyId),
    buildEngagementSection(companyId),
    buildAIContextSection(companyId),
  ])

  return {
    identity,
    financials,
    assessment,
    valuation,
    tasks,
    evidence,
    signals,
    engagement,
    aiContext,
  }
}

/**
 * Build only specified sections (for incremental updates)
 */
export async function buildSections(
  companyId: string,
  sectionNames: DossierSectionName[]
): Promise<Partial<CompanyDossierContent>> {
  const results: Partial<CompanyDossierContent> = {}

  const entries = await Promise.all(
    sectionNames.map(async (name) => {
      const builder = SECTION_BUILDERS[name]
      const data = await builder(companyId)
      return [name, data] as const
    })
  )

  for (const [name, data] of entries) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(results as any)[name] = data
  }

  return results
}
