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
  FINANCIAL: 'bg-blue-100 text-blue-700',
  TRANSFERABILITY: 'bg-green-100 text-green-700',
  OPERATIONAL: 'bg-yellow-100 text-yellow-700',
  MARKET: 'bg-purple-100 text-purple-700',
  LEGAL_TAX: 'bg-red-100 text-red-700',
  PERSONAL: 'bg-orange-100 text-orange-700',
}

/**
 * Border color variants for category indicators
 */
export const BRI_CATEGORY_BORDER_COLORS: Record<BRICategory, string> = {
  FINANCIAL: 'border-blue-500',
  TRANSFERABILITY: 'border-green-500',
  OPERATIONAL: 'border-yellow-500',
  MARKET: 'border-purple-500',
  LEGAL_TAX: 'border-red-500',
  PERSONAL: 'border-orange-500',
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
  return BRI_CATEGORY_COLORS[category as BRICategory] || 'bg-gray-100 text-gray-700'
}
