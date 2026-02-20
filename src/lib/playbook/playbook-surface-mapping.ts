// Playbook Surface Mapping
// Lookup functions for contextual playbook surfacing throughout the app.
// Maps BRI categories, task topics, and signal types to relevant playbooks.

import {
  playbookDefinitions,
  type PlaybookDefinition,
} from '../../../prisma/seed-data/playbook-definitions'

export interface SurfaceRecommendation {
  playbook: PlaybookDefinition
  matchStrength: number // 0-1
  reason: string
}

// Build a BRI category → playbook index (using DRS triggers)
const categoryIndex = new Map<string, { def: PlaybookDefinition; weight: number }[]>()
for (const def of playbookDefinitions) {
  for (const trigger of def.triggers) {
    if (trigger.source === 'DRS') {
      const list = categoryIndex.get(trigger.signal) ?? []
      list.push({ def, weight: trigger.weight })
      categoryIndex.set(trigger.signal, list)
    }
  }
}

// Sort each category's playbooks by trigger weight (strongest match first)
for (const [, list] of categoryIndex) {
  list.sort((a, b) => b.weight - a.weight)
}

/**
 * Get playbooks relevant to a BRI category.
 * Returns playbooks whose DRS triggers include the given category,
 * sorted by trigger weight (strongest match first).
 */
export function getPlaybooksForCategory(
  briCategory: string,
  limit = 3
): SurfaceRecommendation[] {
  const matches = categoryIndex.get(briCategory) ?? []
  return matches.slice(0, limit).map(({ def, weight }) => ({
    playbook: def,
    matchStrength: weight,
    reason: `Addresses ${briCategory.toLowerCase().replace('_', ' ')} readiness gaps`,
  }))
}

/**
 * Get a single best playbook for a given context.
 * Priority: briCategory match (most common), then fallback to first available.
 */
export function getPlaybookForContext(context: {
  briCategory?: string
  signalCategory?: string
}): SurfaceRecommendation | null {
  const category = context.briCategory ?? context.signalCategory
  if (!category) return null

  const matches = categoryIndex.get(category)
  if (!matches || matches.length === 0) return null

  const best = matches[0]
  return {
    playbook: best.def,
    matchStrength: best.weight,
    reason: `Recommended for ${category.toLowerCase().replace('_', ' ')} improvement`,
  }
}

/**
 * Get playbooks that match a task's BRI category.
 * Used in the Actions page to show related playbooks for the active task.
 */
export function getPlaybooksForTask(
  taskBriCategory: string,
  limit = 2
): SurfaceRecommendation[] {
  return getPlaybooksForCategory(taskBriCategory, limit)
}

/**
 * Get the playbook slug (e.g. 'PB-01') from a PlaybookDefinition.
 * Playbook definitions use descriptive slugs, so we find the display slug
 * from the definitions array index.
 */
export function getPlaybookDisplaySlug(def: PlaybookDefinition): string {
  const index = playbookDefinitions.indexOf(def)
  if (index === -1) return def.slug
  return `PB-${String(index + 1).padStart(2, '0')}`
}

// Map PlaybookCategory to BRI category for reverse lookup
const PLAYBOOK_TO_BRI: Record<string, string> = {
  PERSONAL: 'PERSONAL',
  FINANCIAL: 'FINANCIAL',
  OPERATIONAL: 'OPERATIONAL',
  LEGAL: 'LEGAL_TAX',
  MARKET_GROWTH: 'MARKET',
  DEAL_PREP: 'TRANSFERABILITY',
}

/**
 * Get the primary BRI category for a playbook.
 * Uses the highest-weighted DRS trigger, falling back to category mapping.
 */
export function getPlaybookPrimaryBriCategory(def: PlaybookDefinition): string {
  const drsTriggers = def.triggers
    .filter(t => t.source === 'DRS')
    .sort((a, b) => b.weight - a.weight)

  if (drsTriggers.length > 0) return drsTriggers[0].signal
  return PLAYBOOK_TO_BRI[def.category] ?? 'FINANCIAL'
}
