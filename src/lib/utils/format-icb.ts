/**
 * Format an ICB code like MEDICAL_EQUIPMENT_SUB to a human-readable label.
 * Removes underscores, title-cases words, strips trailing "Sub" suffix.
 */
export function formatIcbName(code: string | null): string | null {
  if (!code) return null
  return code
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bSub\b$/i, '')
    .trim()
}
