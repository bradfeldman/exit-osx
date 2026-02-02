// Types for AI-generated operations diagnosis content

export interface BusinessProfile {
  businessType: string
  cuisine?: string
  locationType?: string
  seatingCapacity?: number
  team: {
    total: number
    ownerWorking: boolean
    fullTime: number
    partTime: number
    keyRoles: string[]
  }
  services: string[]
  hours?: string
  techStack: {
    pos?: string
    inventory?: string
    scheduling?: string
    delivery?: string
  }
  yearsInBusiness?: number
  painPoints: string[]
  documentationLevel: 'none' | 'minimal' | 'partial' | 'good' | 'excellent'
  ownerDependency: 'critical' | 'high' | 'moderate' | 'low'
  primaryGoal: string
  constraints: string[]
  uniqueFactors: string[]
}

export interface ClarifyingQuestion {
  id: string
  question: string
  options: {
    id: string
    text: string
  }[]
  allowsOther: boolean
  mapsToProfileField: string
}

export interface ClarifyingQuestionsResult {
  alreadyKnown: Record<string, unknown>
  questions: ClarifyingQuestion[]
}

export interface DiagnosticOption {
  id: string
  text: string
  drivers: string[]
  severity: 'high' | 'medium' | 'low'
  scoreImpact: number
}

export interface DiagnosticQuestion {
  id: string
  questionText: string
  contextText: string
  options: DiagnosticOption[]
}

export interface DiagnosticQuestionsResult {
  subcategory: string
  questions: DiagnosticQuestion[]
}

export interface IdentifiedDriver {
  id: string
  severity: 'high' | 'medium' | 'low'
  count: number
}

export interface GeneratedTask {
  id: string
  title: string
  description: string
  doneDefinition: string
  benchmarkTarget?: string
  delegateTo?: string
  estimatedEffort?: string
  improvesDrivers: string[]
  whyThisMatters?: string
}

export interface TaskGenerationResult {
  tasks: GeneratedTask[]
}

// Driver definitions for reference
export const SCALABILITY_DRIVERS = [
  'throughput_kitchen',
  'throughput_foh',
  'throughput_capacity',
  'throughput_turnover',
  'labor_linear',
  'labor_step',
  'no_sops',
  'partial_sops',
  'sops_not_enforced',
  'menu_complex',
  'growth_hours',
  'growth_headcount',
  'no_measurement',
] as const

export const TECHNOLOGY_DRIVERS = [
  'pos_manual',
  'pos_legacy',
  'pos_limited',
  'inventory_none',
  'inventory_manual',
  'online_tablet_chaos',
  'online_manual_entry',
  'reporting_none',
  'reporting_manual',
  'integration_none',
  'no_measurement',
] as const

export const VENDOR_DRIVERS = [
  'food_no_contract',
  'food_verbal',
  'beverage_informal',
  'equipment_reactive',
  'equipment_informal',
  'lease_short',
  'lease_no_transfer',
  'pricing_exposed',
  'no_measurement',
] as const

export const RETENTION_DRIVERS = [
  'pay_not_competitive',
  'pay_below_market',
  'schedule_issues',
  'culture_issues',
  'no_advancement',
  'training_none',
  'training_shadow_only',
  'key_person_critical',
  'key_person_high',
  'feedback_none',
  'no_measurement',
] as const

export const SUBCATEGORY_DRIVERS = {
  SCALABILITY: SCALABILITY_DRIVERS,
  TECHNOLOGY: TECHNOLOGY_DRIVERS,
  VENDOR: VENDOR_DRIVERS,
  RETENTION: RETENTION_DRIVERS,
} as const

export type Subcategory = keyof typeof SUBCATEGORY_DRIVERS
