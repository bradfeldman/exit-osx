import type { PlanTier } from '@/lib/pricing'

/**
 * Playbook access control for freemium gating.
 *
 * Free playbooks (Foundation tier):
 *   - PB-01: Financial Independence Assessment
 *   - PB-09: Working Capital Optimization
 *   - PB-39: Involuntary Exit Preparedness
 *
 * All other playbooks require Growth or higher.
 * For locked playbooks, the first section (welcome page) is free —
 * subsequent sections require an upgrade.
 */

const FREE_PLAYBOOK_IDS = new Set(['PB-01', 'PB-09', 'PB-39'])

/**
 * Check if a user can access a playbook at all (including the first section).
 * All playbooks have at least their first section free.
 */
export function canAccessPlaybook(playbookId: string, planTier: PlanTier): boolean {
  // Everyone can access free playbooks fully
  if (FREE_PLAYBOOK_IDS.has(playbookId.toUpperCase())) return true
  // Growth and above can access all playbooks
  return planTier !== 'foundation'
}

/**
 * Check if a user can access a specific section of a playbook.
 * Free users can access section 1 (welcome/overview) of any playbook,
 * but need Growth+ for section 2 onwards of non-free playbooks.
 */
export function canAccessPlaybookSection(
  playbookId: string,
  sectionIndex: number,
  planTier: PlanTier
): boolean {
  // Free playbooks are fully accessible
  if (FREE_PLAYBOOK_IDS.has(playbookId.toUpperCase())) return true
  // Growth+ can access everything
  if (planTier !== 'foundation') return true
  // Foundation users: first section (index 0) only
  return sectionIndex === 0
}

/**
 * Check if a playbook is fully free (no upgrade needed for any section).
 */
export function isFreePlaybook(playbookId: string): boolean {
  return FREE_PLAYBOOK_IDS.has(playbookId.toUpperCase())
}

/**
 * Get the set of free playbook IDs.
 */
export function getFreePlaybookIds(): string[] {
  return Array.from(FREE_PLAYBOOK_IDS)
}

/**
 * Get the access status for display purposes.
 */
export function getPlaybookAccessStatus(
  playbookId: string,
  planTier: PlanTier
): 'full' | 'preview' | 'locked' {
  if (FREE_PLAYBOOK_IDS.has(playbookId.toUpperCase())) return 'full'
  if (planTier !== 'foundation') return 'full'
  return 'preview' // Can see first section only
}
