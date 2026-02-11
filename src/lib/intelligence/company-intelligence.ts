/**
 * Company Intelligence Layer — Main Orchestrator
 *
 * PROD-024: Builds a comprehensive intelligence profile for a company by
 * combining the persisted dossier snapshot with supplemental data queries.
 *
 * Design decision: The dossier system already handles the 9 core sections
 * (identity, financials, assessment, valuation, tasks, evidence, signals,
 * engagement, aiContext). This module:
 *
 * 1. Reads the current dossier snapshot (fast — it's a single JSON read)
 * 2. Queries supplemental data in parallel (NA flags, disclosures, notes)
 * 3. Computes section metadata (freshness, completeness)
 * 4. Returns the full CompanyIntelligence profile
 *
 * If no dossier exists, it triggers a full build first.
 */

import { prisma } from '@/lib/prisma'
import { getCurrentDossier, updateDossier } from '@/lib/dossier/build-dossier'
import type { CompanyDossierContent } from '@/lib/dossier/types'
import type {
  CompanyIntelligence,
  IntelligenceSectionName,
  NAFlagsSection,
  DisclosuresSection,
  NotesSection,
} from './types'
import {
  aggregateNAFlags,
  computeCategoryBreakdown,
  type NAAssessmentResponse,
  type NATask,
} from './aggregate-na-flags'
import {
  aggregateDisclosures,
  type DisclosurePromptSetInput,
  type DisclosureResponseInput,
} from './aggregate-disclosures'
import {
  aggregateNotes,
  type AssessmentNoteInput,
  type TaskCompletionNoteInput,
  type CheckInDetailInput,
} from './aggregate-notes'
import { buildSectionMeta, type SectionTimestamps } from './section-meta'

const BRI_CATEGORIES = ['FINANCIAL', 'TRANSFERABILITY', 'OPERATIONAL', 'MARKET', 'LEGAL_TAX', 'PERSONAL']

// ─── Supplemental Data Fetchers ────────────────────────────────────────

async function fetchNAFlagsData(companyId: string): Promise<NAFlagsSection> {
  // Get all assessment responses for the company (across all assessments)
  // following PROD-013 pattern: query by assessment.companyId, not single assessment
  const allResponses = await prisma.assessmentResponse.findMany({
    where: { assessment: { companyId } },
    select: {
      questionId: true,
      confidenceLevel: true,
      updatedAt: true,
      question: {
        select: {
          questionText: true,
          briCategory: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Deduplicate by questionId (latest response wins)
  const seenQuestions = new Set<string>()
  const deduped: typeof allResponses = []
  for (const r of allResponses) {
    if (!seenQuestions.has(r.questionId)) {
      seenQuestions.add(r.questionId)
      deduped.push(r)
    }
  }

  // Extract NA responses
  const naResponses: NAAssessmentResponse[] = deduped
    .filter((r) => r.confidenceLevel === 'NOT_APPLICABLE')
    .map((r) => ({
      questionId: r.questionId,
      questionText: r.question.questionText,
      briCategory: r.question.briCategory,
      updatedAt: r.updatedAt,
    }))

  // Get NA tasks
  const naTasks = await prisma.task.findMany({
    where: { companyId, status: 'NOT_APPLICABLE' },
    select: { id: true, title: true, briCategory: true },
  })

  const naTaskInputs: NATask[] = naTasks.map((t) => ({
    id: t.id,
    title: t.title,
    briCategory: t.briCategory,
  }))

  // Compute category breakdown for NA threshold detection
  const responsesWithNA = deduped.map((r) => ({
    briCategory: r.question.briCategory,
    isNA: r.confidenceLevel === 'NOT_APPLICABLE',
  }))

  const categoryBreakdown = computeCategoryBreakdown(BRI_CATEGORIES, responsesWithNA)

  return aggregateNAFlags(naResponses, naTaskInputs, categoryBreakdown)
}

async function fetchDisclosuresData(companyId: string): Promise<DisclosuresSection> {
  const [promptSets, responses] = await Promise.all([
    prisma.disclosurePromptSet.findMany({
      where: { companyId },
      select: { completedAt: true, skippedAt: true },
    }),
    prisma.disclosureResponse.findMany({
      where: { companyId },
      select: {
        questionKey: true,
        questionText: true,
        briCategory: true,
        answer: true,
        followUpAnswer: true,
        respondedAt: true,
        signalCreated: true,
      },
      orderBy: { respondedAt: 'desc' },
    }),
  ])

  const promptSetInputs: DisclosurePromptSetInput[] = promptSets.map((ps) => ({
    completedAt: ps.completedAt,
    skippedAt: ps.skippedAt,
  }))

  const responseInputs: DisclosureResponseInput[] = responses.map((r) => ({
    questionKey: r.questionKey,
    questionText: r.questionText,
    briCategory: r.briCategory,
    answer: r.answer,
    followUpAnswer: r.followUpAnswer,
    respondedAt: r.respondedAt,
    signalCreated: r.signalCreated,
  }))

  return aggregateDisclosures(promptSetInputs, responseInputs)
}

async function fetchNotesData(companyId: string): Promise<NotesSection> {
  const [assessmentNotes, legacyTaskNotes, taskNoteRecords, checkIns] = await Promise.all([
    // Assessment response notes (non-empty)
    prisma.assessmentResponse.findMany({
      where: {
        assessment: { companyId },
        notes: { not: null },
        NOT: { notes: '' },
      },
      select: {
        questionId: true,
        notes: true,
        updatedAt: true,
        question: {
          select: {
            questionText: true,
            briCategory: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),

    // Legacy task completion notes from Task.completionNotes field (for backward compatibility)
    prisma.task.findMany({
      where: {
        companyId,
        status: 'COMPLETED',
        completionNotes: { not: null },
        NOT: { completionNotes: '' },
      },
      select: {
        id: true,
        title: true,
        briCategory: true,
        completionNotes: true,
        completedAt: true,
      },
      orderBy: { completedAt: 'desc' },
    }),

    // New TaskNote records (all types)
    prisma.taskNote.findMany({
      where: {
        task: { companyId },
      },
      select: {
        id: true,
        content: true,
        noteType: true,
        createdAt: true,
        task: {
          select: {
            id: true,
            title: true,
            briCategory: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // Completed weekly check-ins with detail
    prisma.weeklyCheckIn.findMany({
      where: {
        companyId,
        completedAt: { not: null },
      },
      select: {
        weekOf: true,
        teamChanges: true,
        teamChangesNote: true,
        customerChanges: true,
        customerChangesNote: true,
        confidenceRating: true,
        additionalNotes: true,
        completedAt: true,
      },
      orderBy: { weekOf: 'desc' },
    }),
  ])

  const assessmentNoteInputs: AssessmentNoteInput[] = assessmentNotes.map((n) => ({
    questionId: n.questionId,
    questionText: n.question.questionText,
    briCategory: n.question.briCategory,
    note: n.notes!,
    updatedAt: n.updatedAt,
  }))

  // Combine legacy completionNotes with new TaskNote records
  const legacyNoteInputs: TaskCompletionNoteInput[] = legacyTaskNotes.map((t) => ({
    id: t.id,
    title: t.title,
    briCategory: t.briCategory,
    completionNotes: t.completionNotes!,
    completedAt: t.completedAt!,
  }))

  const newNoteInputs: TaskCompletionNoteInput[] = taskNoteRecords.map((n) => ({
    id: n.task.id,
    title: n.task.title,
    briCategory: n.task.briCategory,
    completionNotes: n.content,
    completedAt: n.createdAt,
  }))

  const checkInInputs: CheckInDetailInput[] = checkIns.map((c) => ({
    weekOf: c.weekOf,
    teamChanges: c.teamChanges,
    teamChangesNote: c.teamChangesNote,
    customerChanges: c.customerChanges,
    customerChangesNote: c.customerChangesNote,
    confidenceRating: c.confidenceRating,
    additionalNotes: c.additionalNotes,
    completedAt: c.completedAt!,
  }))

  // Merge legacy and new task notes
  const allTaskNotes = [...legacyNoteInputs, ...newNoteInputs]

  return aggregateNotes(assessmentNoteInputs, allTaskNotes, checkInInputs)
}

async function fetchTimestamps(companyId: string, dossierUpdatedAt: string | null): Promise<SectionTimestamps> {
  const [lastResponse, lastTask, lastDocument, lastSignal, lastCheckIn, lastDisclosure] =
    await Promise.all([
      prisma.assessmentResponse.findFirst({
        where: { assessment: { companyId } },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      prisma.task.findFirst({
        where: { companyId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      }),
      prisma.dataRoomDocument.findFirst({
        where: { companyId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      prisma.signal.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.weeklyCheckIn.findFirst({
        where: { companyId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      }),
      prisma.disclosureResponse.findFirst({
        where: { companyId },
        orderBy: { respondedAt: 'desc' },
        select: { respondedAt: true },
      }),
    ])

  return {
    dossierUpdatedAt,
    lastAssessmentResponseAt: lastResponse?.updatedAt?.toISOString() ?? null,
    lastTaskCompletionAt: lastTask?.completedAt?.toISOString() ?? null,
    lastDocumentUpdateAt: lastDocument?.updatedAt?.toISOString() ?? null,
    lastSignalAt: lastSignal?.createdAt?.toISOString() ?? null,
    lastCheckInAt: lastCheckIn?.completedAt?.toISOString() ?? null,
    lastDisclosureAt: lastDisclosure?.respondedAt?.toISOString() ?? null,
  }
}

// ─── Main Entry Point ──────────────────────────────────────────────────

/**
 * Build the full company intelligence profile.
 *
 * This is the primary entry point for AI consumers. It returns a typed,
 * structured view of everything the system knows about a company.
 *
 * @param companyId - The company to build intelligence for
 * @param sections - Optional: only build specific sections (optimization)
 */
export async function buildCompanyIntelligence(
  companyId: string,
  sections?: IntelligenceSectionName[]
): Promise<CompanyIntelligence> {
  // Step 1: Get or create the dossier
  let dossier = await getCurrentDossier(companyId)
  if (!dossier) {
    // No dossier exists — trigger a full build
    dossier = await updateDossier(companyId, 'manual_rebuild')
  }

  const dossierContent = dossier.content as unknown as CompanyDossierContent
  const dossierUpdatedAt = dossier.createdAt.toISOString()

  // Step 2: Build supplemental sections in parallel
  const needsNA = !sections || sections.includes('naFlags')
  const needsDisclosures = !sections || sections.includes('disclosures')
  const needsNotes = !sections || sections.includes('notes')

  const [naFlags, disclosures, notes, timestamps] = await Promise.all([
    needsNA ? fetchNAFlagsData(companyId) : emptyNAFlags(),
    needsDisclosures ? fetchDisclosuresData(companyId) : emptyDisclosures(),
    needsNotes ? fetchNotesData(companyId) : emptyNotes(),
    fetchTimestamps(companyId, dossierUpdatedAt),
  ])

  // Step 3: Build section metadata
  const allSectionData = {
    ...dossierContent,
    naFlags,
    disclosures,
    notes,
  }

  const sectionMeta = buildSectionMeta(allSectionData, timestamps)

  // Step 4: Assemble the full intelligence profile
  return {
    companyId,
    generatedAt: new Date().toISOString(),
    ...dossierContent,
    naFlags,
    disclosures,
    notes,
    sectionMeta,
  }
}

/**
 * Build a single section of the intelligence profile.
 * Useful for targeted AI consumers that only need one piece.
 */
export async function buildIntelligenceSection(
  companyId: string,
  sectionName: IntelligenceSectionName
): Promise<unknown> {
  switch (sectionName) {
    case 'naFlags':
      return fetchNAFlagsData(companyId)
    case 'disclosures':
      return fetchDisclosuresData(companyId)
    case 'notes':
      return fetchNotesData(companyId)
    default: {
      // Dossier section — read from the persisted dossier
      const dossier = await getCurrentDossier(companyId)
      if (!dossier) {
        const rebuilt = await updateDossier(companyId, 'manual_rebuild')
        const content = rebuilt.content as unknown as CompanyDossierContent
        return content[sectionName]
      }
      const content = dossier.content as unknown as CompanyDossierContent
      return content[sectionName]
    }
  }
}

// ─── Empty section defaults ────────────────────────────────────────────

function emptyNAFlags(): NAFlagsSection {
  return {
    assessmentNAFlags: [],
    taskNAFlags: [],
    heavilyNACategories: [],
    totalNACount: 0,
  }
}

function emptyDisclosures(): DisclosuresSection {
  return {
    totalCompleted: 0,
    totalSkipped: 0,
    recentResponses: [],
    materialChanges: [],
    highChangeCategories: [],
  }
}

function emptyNotes(): NotesSection {
  return {
    assessmentNotes: [],
    taskCompletionNotes: [],
    checkInDetails: [],
    totalNotesCount: 0,
  }
}
