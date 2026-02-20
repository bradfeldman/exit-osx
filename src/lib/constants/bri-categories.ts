// TERM-001 FIX: Centralized BRI category labels and colors for consistent terminology

/**
 * BRI Category keys as used in the database
 */
export const BRI_CATEGORIES = [
  'FINANCIAL',
  'TRANSFERABILITY',
  'OPERATIONAL',
  'MARKET',
  'LEGAL_TAX',
  'PERSONAL',
] as const

export type BRICategory = (typeof BRI_CATEGORIES)[number]

/**
 * Display labels for BRI categories - use these throughout the UI
 */
export const BRI_CATEGORY_LABELS: Record<BRICategory, string> = {
  FINANCIAL: 'Financial Health',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

/**
 * Short labels for compact displays (chips, badges, etc.)
 */
export const BRI_CATEGORY_SHORT_LABELS: Record<BRICategory, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transfer',
  OPERATIONAL: 'Operations',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal/Tax',
  PERSONAL: 'Personal',
}

/**
 * Tailwind color classes for each category
 */
export const BRI_CATEGORY_COLORS: Record<BRICategory, string> = {
  FINANCIAL: 'bg-accent-light text-primary',
  TRANSFERABILITY: 'bg-green-light text-green-dark',
  OPERATIONAL: 'bg-orange-light text-orange-dark',
  MARKET: 'bg-purple-light text-purple-dark',
  LEGAL_TAX: 'bg-red-light text-red-dark',
  PERSONAL: 'bg-orange-light text-orange-dark',
}

/**
 * Border color variants for category indicators
 */
export const BRI_CATEGORY_BORDER_COLORS: Record<BRICategory, string> = {
  FINANCIAL: 'border-primary',
  TRANSFERABILITY: 'border-green',
  OPERATIONAL: 'border-orange',
  MARKET: 'border-purple',
  LEGAL_TAX: 'border-red',
  PERSONAL: 'border-orange',
}

/**
 * Default category display order
 */
export const BRI_CATEGORY_ORDER: BRICategory[] = [
  'FINANCIAL',
  'TRANSFERABILITY',
  'OPERATIONAL',
  'MARKET',
  'LEGAL_TAX',
  'PERSONAL',
]

/**
 * Helper to get label with fallback
 */
export function getBRICategoryLabel(category: string, short: boolean = false): string {
  const labels = short ? BRI_CATEGORY_SHORT_LABELS : BRI_CATEGORY_LABELS
  return labels[category as BRICategory] || category
}

/**
 * Helper to get color classes with fallback
 */
export function getBRICategoryColor(category: string): string {
  return BRI_CATEGORY_COLORS[category as BRICategory] || 'bg-secondary text-foreground'
}
