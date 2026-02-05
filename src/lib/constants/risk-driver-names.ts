/**
 * Short human-readable risk names for each assessment question.
 * These map question themes to concise labels for the "What's Costing You The Most" section.
 * Keys are lowercase substrings that match against question text.
 */
export const RISK_DRIVER_NAME_PATTERNS: Array<{ pattern: string; name: string }> = [
  // FINANCIAL
  { pattern: 'revenue consistency', name: 'Revenue Volatility' },
  { pattern: 'revenue been over', name: 'Revenue Volatility' },
  { pattern: 'recurring revenue', name: 'Low Recurring Revenue' },
  { pattern: 'customer diversif', name: 'Customer Concentration' },
  { pattern: 'customer base', name: 'Customer Concentration' },
  { pattern: 'financial record', name: 'Financial Opacity' },
  { pattern: 'financial reporting', name: 'Financial Opacity' },
  { pattern: 'gross profit', name: 'Margin Pressure' },
  { pattern: 'profit margin', name: 'Margin Pressure' },

  // TRANSFERABILITY
  { pattern: 'owner depend', name: 'Owner Dependency' },
  { pattern: 'without the owner', name: 'Owner Dependency' },
  { pattern: 'management team', name: 'Weak Management Depth' },
  { pattern: 'customer relationship', name: 'Relationship-Dependent Revenue' },
  { pattern: 'key relationships', name: 'Relationship-Dependent Revenue' },
  { pattern: 'business model scalab', name: 'Scalability Constraints' },

  // OPERATIONAL
  { pattern: 'process document', name: 'Undocumented Processes' },
  { pattern: 'documented process', name: 'Undocumented Processes' },
  { pattern: 'technology infrastructure', name: 'Technology Risk' },
  { pattern: 'technology systems', name: 'Technology Risk' },
  { pattern: 'employee retention', name: 'Retention Risk' },
  { pattern: 'employee turnover', name: 'Retention Risk' },
  { pattern: 'vendor', name: 'Vendor Dependency' },
  { pattern: 'supplier', name: 'Vendor Dependency' },

  // MARKET
  { pattern: 'market growth', name: 'Market Headwinds' },
  { pattern: 'competitive position', name: 'Competitive Vulnerability' },
  { pattern: 'competitive advantage', name: 'Competitive Vulnerability' },
  { pattern: 'proprietary', name: 'Weak IP Position' },
  { pattern: 'intellectual property', name: 'Weak IP Position' },

  // LEGAL_TAX
  { pattern: 'corporate structure', name: 'Structural Complexity' },
  { pattern: 'contract', name: 'Transfer Risk (Contracts)' },
  { pattern: 'license transfer', name: 'Transfer Risk (Contracts)' },
  { pattern: 'litigation', name: 'Legal Exposure' },
  { pattern: 'regulatory', name: 'Legal Exposure' },
  { pattern: 'legal', name: 'Legal Exposure' },

  // PERSONAL
  { pattern: 'exit timeline', name: 'Unclear Exit Timeline' },
  { pattern: 'personal', name: 'Commingled Assets' },
  { pattern: 'business asset', name: 'Commingled Assets' },
  { pattern: 'key employee awareness', name: 'Transition Risk (People)' },
  { pattern: 'succession', name: 'Transition Risk (People)' },
]

/**
 * Get risk driver name from question text using pattern matching.
 * Falls back to a truncated version of the question text.
 */
export function getRiskDriverName(questionText: string, riskDriverName?: string | null): string {
  // Use stored riskDriverName if available
  if (riskDriverName) return riskDriverName

  const lowerText = questionText.toLowerCase()
  for (const { pattern, name } of RISK_DRIVER_NAME_PATTERNS) {
    if (lowerText.includes(pattern)) return name
  }

  // Fallback: first 30 chars of question
  return questionText.length > 30 ? questionText.slice(0, 30) + '…' : questionText
}
