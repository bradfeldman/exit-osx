import type { SignalSeverity, BriCategory } from '@prisma/client'

export interface ExternalSignalTypeConfig {
  defaultSeverity: SignalSeverity
  category: BriCategory | null
  description: string
}

export const EXTERNAL_SIGNAL_TYPES: Record<string, ExternalSignalTypeConfig> = {
  SOS_FILING: {
    defaultSeverity: 'MEDIUM',
    category: 'LEGAL_TAX',
    description: 'Secretary of State filing detected — may indicate registration change or compliance issue.',
  },
  COURT_DOCKET: {
    defaultSeverity: 'HIGH',
    category: 'LEGAL_TAX',
    description: 'Court docket entry found — potential legal proceedings involving the company.',
  },
  UCC_FILING: {
    defaultSeverity: 'MEDIUM',
    category: 'FINANCIAL',
    description: 'UCC filing detected — may indicate new secured debt or lien.',
  },
  TAX_LIEN: {
    defaultSeverity: 'CRITICAL',
    category: 'LEGAL_TAX',
    description: 'Tax lien filed — outstanding tax obligation that could affect deal closure.',
  },
  INDUSTRY_BENCHMARK: {
    defaultSeverity: 'LOW',
    category: 'MARKET',
    description: 'Industry benchmark data updated — may affect market positioning analysis.',
  },
} as const

export type ExternalSignalType = keyof typeof EXTERNAL_SIGNAL_TYPES
