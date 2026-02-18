/**
 * Compute user engagement status based on last activity date.
 * Extracted to a plain utility (not a component) to avoid React purity lint rules.
 */
export function computeEngagementStatus(
  lastActiveAt: Date | null
): 'active' | 'stalled' | 'dormant' {
  if (!lastActiveAt) return 'dormant'

  const daysSinceActive =
    (Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceActive > 14) return 'dormant'
  if (daysSinceActive > 3) return 'stalled'
  return 'active'
}
