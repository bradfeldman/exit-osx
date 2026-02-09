import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { createHash } from 'crypto'
import { buildAllSections, buildSections } from './sections'
import {
  type CompanyDossierContent,
  type DossierTriggerEvent,
  type DossierSectionName,
  TRIGGER_TO_SECTIONS,
  ALL_SECTIONS,
} from './types'

function hashContent(content: CompanyDossierContent): string {
  return createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex')
}

/**
 * Update or create a company dossier.
 *
 * - If no dossier exists → full rebuild
 * - If dossier exists → incremental patch (only rebuild affected sections)
 * - Skips save if content hash is identical to current
 */
export async function updateDossier(
  companyId: string,
  triggerEvent: DossierTriggerEvent,
  triggerSource?: string
) {
  const sectionsToRebuild = TRIGGER_TO_SECTIONS[triggerEvent]

  // Find current dossier
  const currentDossier = await prisma.companyDossier.findFirst({
    where: { companyId, isCurrent: true },
  })

  let content: CompanyDossierContent
  let buildType: 'FULL' | 'INCREMENTAL'
  let rebuiltSections: DossierSectionName[]

  if (!currentDossier) {
    // First dossier — full rebuild
    content = await buildAllSections(companyId)
    buildType = 'FULL'
    rebuiltSections = [...ALL_SECTIONS]
  } else {
    // Incremental — merge updated sections with existing content
    const existingContent = currentDossier.content as unknown as CompanyDossierContent
    const updatedSections = await buildSections(companyId, sectionsToRebuild)

    content = { ...existingContent, ...updatedSections }
    buildType = 'INCREMENTAL'
    rebuiltSections = sectionsToRebuild
  }

  // Hash check — skip if content hasn't changed
  const newHash = hashContent(content)
  if (currentDossier?.contentHash === newHash) {
    return currentDossier
  }

  // Mark old version as non-current, create new version
  const newVersion = (currentDossier?.version ?? 0) + 1

  const newDossier = await prisma.$transaction(async (tx) => {
    if (currentDossier) {
      await tx.companyDossier.update({
        where: { id: currentDossier.id },
        data: { isCurrent: false },
      })
    }

    return tx.companyDossier.create({
      data: {
        companyId,
        version: newVersion,
        buildType,
        triggerEvent,
        triggerSource: triggerSource ?? null,
        content: content as unknown as Prisma.InputJsonValue,
        contentHash: newHash,
        sections: rebuiltSections,
        previousId: currentDossier?.id ?? null,
        isCurrent: true,
      },
    })
  })

  return newDossier
}

/**
 * Get the current dossier for a company, or null if none exists
 */
export async function getCurrentDossier(companyId: string) {
  return prisma.companyDossier.findFirst({
    where: { companyId, isCurrent: true },
  })
}

/**
 * Fire-and-forget dossier update — used in event hooks
 * Never throws; logs errors to console
 */
export function triggerDossierUpdate(
  companyId: string,
  triggerEvent: DossierTriggerEvent,
  triggerSource?: string
) {
  updateDossier(companyId, triggerEvent, triggerSource).catch((err) => {
    console.error(`[Dossier] Failed to update dossier for company ${companyId}:`, err)
  })
}
