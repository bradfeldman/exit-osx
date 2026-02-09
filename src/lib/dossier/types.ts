import type { BriCategory } from '@prisma/client'

// ─── Section Types ───────────────────────────────────────────────────────

export interface IdentitySection {
  name: string
  industry: string
  subSector: string
  businessDescription: string | null
  coreFactors: {
    revenueModel: string
    ownerInvolvement: string
    laborIntensity: string
    assetIntensity: string
    grossMarginProxy: string
    revenueSizeCategory: string
  } | null
}

export interface FinancialsSection {
  annualRevenue: number
  annualEbitda: number
  ownerCompensation: number
  revenueGrowthYoY: number | null
  ebitdaMarginPct: number | null
  periodsAvailable: number
  latestPeriodLabel: string | null
  balanceSheetHighlights: {
    totalAssets: number | null
    totalLiabilities: number | null
    workingCapital: number | null
    cash: number | null
  } | null
  dataCompleteness: 'none' | 'minimal' | 'partial' | 'complete'
}

export interface AssessmentSection {
  hasCompletedAssessment: boolean
  lastAssessmentDate: string | null
  categoryScores: Record<string, number>
  weakestCategories: string[]
  weakestDrivers: Array<{
    questionId: string
    questionText: string
    category: string
    scoreValue: number
    riskDriverName: string | null
  }>
  unansweredCategories: string[]
  totalQuestionsAnswered: number
  totalQuestionsAvailable: number
}

export interface ValuationSection {
  currentValue: number | null
  potentialValue: number | null
  valueGap: number | null
  briScore: number | null
  finalMultiple: number | null
  trend: Array<{
    date: string
    briScore: number
    currentValue: number
  }>
}

export interface TasksSection {
  totalTasks: number
  pendingCount: number
  inProgressCount: number
  completedCount: number
  totalPendingValue: number
  totalCompletedValue: number
  valueByCategory: Record<string, number>
  topPendingTasks: Array<{
    id: string
    title: string
    briCategory: string
    normalizedValue: number
    effortLevel: string
  }>
  recentCompletions: Array<{
    id: string
    title: string
    completedAt: string
    completedValue: number
  }>
  weeklyVelocity: number
}

export interface EvidenceSection {
  totalDocuments: number
  documentsByStatus: Record<string, number>
  categoryGaps: string[]
  urgentDocuments: Array<{
    id: string
    documentName: string
    status: string
    category: string
    nextUpdateDue: string | null
  }>
}

export interface SignalsSection {
  openSignalsCount: number
  severitySummary: Record<string, number>
  recentValueMovements: Array<{
    date: string
    deltaValue: number
    eventType: string
    narrativeSummary: string | null
  }>
  topOpenSignals: Array<{
    id: string
    title: string
    severity: string
    category: string | null
    description: string | null
  }>
}

export interface EngagementSection {
  lastCheckInDate: string | null
  checkInStreak: number
  daysSinceLastActivity: number
  latestDriftReportSummary: string | null
  totalCheckIns: number
}

export interface AIContextSection {
  previousQuestionIds: string[]
  previousTaskTitles: string[]
  identifiedRisks: string[]
  focusAreas: string[]
}

// ─── Composite Dossier ──────────────────────────────────────────────────

export interface CompanyDossierContent {
  identity: IdentitySection
  financials: FinancialsSection
  assessment: AssessmentSection
  valuation: ValuationSection
  tasks: TasksSection
  evidence: EvidenceSection
  signals: SignalsSection
  engagement: EngagementSection
  aiContext: AIContextSection
}

export type DossierSectionName = keyof CompanyDossierContent

export const ALL_SECTIONS: DossierSectionName[] = [
  'identity',
  'financials',
  'assessment',
  'valuation',
  'tasks',
  'evidence',
  'signals',
  'engagement',
  'aiContext',
]

// ─── Trigger Mapping ────────────────────────────────────────────────────

export type DossierTriggerEvent =
  | 'assessment_completed'
  | 'task_completed'
  | 'financial_data_updated'
  | 'evidence_uploaded'
  | 'signal_created'
  | 'weekly_checkin'
  | 'company_profile_updated'
  | 'manual_rebuild'

export const TRIGGER_TO_SECTIONS: Record<DossierTriggerEvent, DossierSectionName[]> = {
  assessment_completed: ['assessment', 'valuation', 'tasks', 'aiContext'],
  task_completed: ['tasks', 'valuation', 'signals', 'aiContext'],
  financial_data_updated: ['financials', 'valuation'],
  evidence_uploaded: ['evidence'],
  signal_created: ['signals'],
  weekly_checkin: ['engagement'],
  company_profile_updated: ['identity'],
  manual_rebuild: ALL_SECTIONS,
}

// ─── AI Generation Types ────────────────────────────────────────────────

export interface AIGeneratedQuestion {
  questionText: string
  helpText: string
  buyerLogic: string
  briCategory: BriCategory
  issueTier: 'CRITICAL' | 'SIGNIFICANT' | 'OPTIMIZATION'
  maxImpactPoints: number
  riskDriverName: string
  displayOrder: number
  options: Array<{
    optionText: string
    scoreValue: number
    displayOrder: number
  }>
}

export interface QuestionGenerationResult {
  questions: AIGeneratedQuestion[]
  reasoning: string
}

export interface AIGeneratedTask {
  title: string
  description: string
  actionType: string
  briCategory: BriCategory
  linkedQuestionId: string
  upgradeFromScore: number
  upgradeToScore: number
  effortLevel: string
  complexity: string
  estimatedHours: number | null
  issueTier: 'CRITICAL' | 'SIGNIFICANT' | 'OPTIMIZATION'
  buyerConsequence: string
}

export interface TaskGenerationResult {
  tasks: AIGeneratedTask[]
  reasoning: string
}
