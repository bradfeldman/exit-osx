/**
 * Currency formatting utilities
 * Shared across components to ensure consistent formatting
 */

/**
 * Formats a number as currency with automatic K/M/B suffix
 * @param value - The numeric value to format
 * @returns Formatted currency string (e.g., "$1.5M", "$250K", "$500")
 */
export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}K`
  }
  return `$${Math.round(value)}`
}

/**
 * Alias for formatCurrency for backward compatibility
 */
export const formatDollar = formatCurrency
