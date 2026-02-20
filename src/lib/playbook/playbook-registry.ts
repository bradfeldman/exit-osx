import {
  playbookDefinitions,
  type PlaybookDefinition,
} from '../../../prisma/seed-data/playbook-definitions'

const slugIndex = new Map<string, PlaybookDefinition>()
for (const def of playbookDefinitions) {
  slugIndex.set(def.slug.toUpperCase(), def)
}

/**
 * Look up a playbook definition by slug (e.g. 'PB-01' or 'pb-01').
 */
export function getPlaybookDefinition(slug: string): PlaybookDefinition | undefined {
  return slugIndex.get(slug.toUpperCase())
}

/**
 * Get all playbook definitions.
 */
export function getAllPlaybooks(): PlaybookDefinition[] {
  return playbookDefinitions
}

/**
 * Get the section (phase) count for a playbook.
 */
export function getPlaybookSectionCount(slug: string): number {
  const def = getPlaybookDefinition(slug)
  return def?.phases.length ?? 0
}
