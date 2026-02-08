/**
 * Analytics Type Definitions
 * Type-safe event definitions for the Exit OSx analytics system
 *
 * Naming Convention: {category}_{action}_{target?}
 * Examples: assessment_started, form_field_focused_email, cta_clicked_assessment
 */

// =============================================================================
// CONSENT TYPES
// =============================================================================

export type ConsentState = 'granted' | 'denied'

export interface ConsentPreferences {
  ad_storage: ConsentState
  ad_user_data: ConsentState
  ad_personalization: ConsentState
  analytics_storage: ConsentState
  functionality_storage: ConsentState
  personalization_storage: ConsentState
  security_storage: ConsentState
}

// =============================================================================
// USER CONTEXT
// =============================================================================

export interface AnalyticsUser {
  userId?: string          // Prisma user.id (set after email verification)
  companyId?: string       // Active company ID
  subscriptionTier?: 'free' | 'starter' | 'professional' | 'enterprise'
  briScore?: number        // Current BRI score
  assessmentStatus?: 'not_started' | 'in_progress' | 'completed'
}

export interface SessionContext {
  sessionId: string
  deviceType: 'desktop' | 'tablet' | 'mobile'
  browser: string
  screenSize: string
  timezone: string
  referrer?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
}

// =============================================================================
// EXPERIMENT CONTEXT
// =============================================================================

export interface ExperimentContext {
  experimentId: string
  variant: string
  firstExposure: string  // ISO timestamp
}

// =============================================================================
// BASE EVENT INTERFACE
// =============================================================================

export interface BaseEventParams {
  // Automatically added to all events
  timestamp?: string
  sessionId?: string
  userId?: string
  companyId?: string
  pageUrl?: string
  pageTitle?: string
  experiment?: ExperimentContext
}

// =============================================================================
// PHASE 1: ACQUISITION & ONBOARDING EVENTS
// =============================================================================

// Landing Page Events
export interface LandingPageViewParams extends BaseEventParams {
  referrer?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  deviceType: string
}

export interface CtaVisibilityParams extends BaseEventParams {
  ctaId: string
  ctaText: string
  timeToVisible: number  // ms from page load
  viewportPosition: 'above_fold' | 'below_fold'
}

export interface CtaHoverParams extends BaseEventParams {
  ctaId: string
  ctaText: string
  hoverDuration: number  // ms
}

export interface CtaClickParams extends BaseEventParams {
  ctaId: string
  ctaText: string
  ctaType: 'primary' | 'secondary' | 'tertiary'
  destination: string
}

export interface ScrollDepthParams extends BaseEventParams {
  depth: 25 | 50 | 75 | 100
  timeToDepth: number  // ms from page load
}

export interface ExitIntentParams extends BaseEventParams {
  timeOnPage: number  // ms
  scrollDepthReached: number  // percentage
  lastInteraction?: string
}

// Signup Events
export interface SignupPageViewParams extends BaseEventParams {
  entryPoint: string
  planPreselected?: string
}

export interface FormFieldFocusParams extends BaseEventParams {
  formId: string
  fieldName: string
  fieldOrder: number
  isFirstFocus: boolean
}

export interface FormFieldTimeParams extends BaseEventParams {
  formId: string
  fieldName: string
  timeSpent: number  // ms
}

export interface FormFieldErrorParams extends BaseEventParams {
  formId: string
  fieldName: string
  errorType: string
  errorMessage: string
}

export interface FormAbandonmentParams extends BaseEventParams {
  formId: string
  lastFieldTouched: string
  fieldsCompleted: number
  totalFields: number
  timeOnForm: number  // ms
}

export interface SignupSubmitParams extends BaseEventParams {
  success: boolean
  timeToSubmit: number  // ms from page load
  errorType?: string
}

export interface SignupCompleteParams extends BaseEventParams {
  method: 'email' | 'google' | 'github'
}

// Email Verification Events
export interface VerificationEmailSentParams extends BaseEventParams {
  email: string  // hashed
}

export interface VerificationLinkClickedParams extends BaseEventParams {
  timeFromSend: number  // ms
}

export interface VerificationAbandonedParams extends BaseEventParams {
  hoursElapsed: number
}

export interface ResendVerificationParams extends BaseEventParams {
  resendCount: number
}

// Company Setup Wizard Events
export interface SetupWizardStartedParams extends BaseEventParams {
  entrySource: string
}

export interface SetupStepViewedParams extends BaseEventParams {
  stepNumber: number
  stepName: 'basic_info' | 'revenue' | 'business_profile'
}

export interface SetupStepTimeParams extends BaseEventParams {
  stepNumber: number
  stepName: string
  duration: number  // ms
}

export interface SetupStepCompletedParams extends BaseEventParams {
  stepNumber: number
  stepName: string
  inputsProvided: Record<string, unknown>
}

export interface SetupStepBackParams extends BaseEventParams {
  fromStep: number
  toStep: number
}

export interface IndustrySearchParams extends BaseEventParams {
  searchQuery: string
  resultsCount: number
  resultClicked?: string
}

export interface SetupAbandonedParams extends BaseEventParams {
  lastStepCompleted: number
  totalTimeSpent: number  // ms
}

export interface SetupCompletedParams extends BaseEventParams {
  totalTime: number  // ms
  stepsRevisited: number
}

// =============================================================================
// PHASE 2: CRITICAL TRANSITION EVENTS
// =============================================================================

// Dashboard First View Events
export interface DashboardFirstViewParams extends BaseEventParams {
  timeSinceSignup: number  // ms
}

export interface InitialValuationDisplayedParams extends BaseEventParams {
  valuationAmount: number
  industryMultiple: number
  calculationMethod: 'quick' | 'dcf'
}

export interface ValuationViewportTimeParams extends BaseEventParams {
  duration: number  // ms
}

export interface BriScoreDisplayedParams extends BaseEventParams {
  score: number | null  // null if incomplete
  status: 'complete' | 'incomplete' | 'not_started'
}

export interface AssessmentPromptDisplayedParams extends BaseEventParams {
  promptVariant: string
  position: string
}

export interface AssessmentCtaHoverParams extends BaseEventParams {
  ctaId: string
  hoverDuration: number  // ms
}

export interface AssessmentCtaClickParams extends BaseEventParams {
  ctaId: string
  ctaVariant: string
  timeOnDashboard: number  // ms
}

export interface DashboardExitWithoutAssessmentParams extends BaseEventParams {
  timeOnDashboard: number  // ms
  scrollDepthReached: number
  ctaWasVisible: boolean
  featuresClicked: string[]
}

export interface TimeToAssessmentStartParams extends BaseEventParams {
  duration: number  // ms from dashboard load
}

// Assessment Introduction Events
export interface AssessmentIntroViewedParams extends BaseEventParams {
  assessmentType: 'company' | 'risk' | 'personal_readiness'
  entrySource: string
}

export interface AssessmentIntroReadTimeParams extends BaseEventParams {
  duration: number  // ms
  estimatedTimeShown: string
}

export interface AssessmentIntroAbandonedParams extends BaseEventParams {
  timeOnPage: number  // ms
}

// =============================================================================
// PHASE 3: ASSESSMENT EXPERIENCE EVENTS
// =============================================================================

export interface AssessmentStartedParams extends BaseEventParams {
  assessmentId: string
  assessmentType: 'initial' | 'project' | 'company' | 'risk' | 'personal_readiness'
  totalQuestions: number
  isFirstAssessment?: boolean
}

export interface QuestionDisplayedParams extends BaseEventParams {
  assessmentId: string
  questionId: string
  questionNumber: number
  totalQuestions: number
  category: string
  isFirstView?: boolean
}

export interface QuestionTimeParams extends BaseEventParams {
  assessmentId: string
  questionNumber: number
  timeSpent: number  // ms
}

export interface QuestionResponseParams extends BaseEventParams {
  assessmentId: string
  questionId: string
  questionNumber: number
  category: string
  responseValue: number
  timeToAnswer: number  // ms
  wasEdited?: boolean
  confidenceLevel?: string
}

export interface QuestionSkippedParams extends BaseEventParams {
  assessmentId: string
  questionId: string
  questionNumber: number
  category: string
  skipReason?: 'not_applicable' | 'uncertain' | 'skipped'
  timeToSkip?: number  // ms
}

export interface QuestionHelpClickedParams extends BaseEventParams {
  questionId: string
  helpType: 'tooltip' | 'modal' | 'link'
}

export interface ProgressIndicatorInteractionParams extends BaseEventParams {
  assessmentId: string
  fromQuestion: number
  toQuestion: number
  direction: 'forward' | 'backward'
  navigationType?: 'button' | 'category' | 'dot'
}

export interface AssessmentPausedParams extends BaseEventParams {
  assessmentType: string
  lastQuestionNumber: number
  percentComplete: number
  timeSpent: number  // ms
}

export interface AssessmentResumedParams extends BaseEventParams {
  assessmentType: string
  questionNumber: number
  timeGap: number  // ms since pause
}

export interface AssessmentAbandonedParams extends BaseEventParams {
  assessmentId: string
  assessmentType: 'initial' | 'project' | 'company' | 'risk' | 'personal_readiness'
  questionsAnswered: number
  totalQuestions: number
  lastQuestionViewed: number
  totalTime: number  // ms
  completionRate: number  // percentage
}

export interface AssessmentCompletedParams extends BaseEventParams {
  assessmentId: string
  assessmentType: 'initial' | 'project' | 'company' | 'risk' | 'personal_readiness'
  totalTime: number  // ms
  questionsAnswered: number
  totalQuestions: number
  completionRate: number  // percentage
}

// Assessment Results Events
export interface ResultsDisplayedParams extends BaseEventParams {
  assessmentId: string
  briScoreBefore: number | null
  briScoreAfter: number | null
  briImpact: number | null
  tasksCreated: number
  keyFindingsCount: number
  estimatedValue?: number | null
}

export interface ResultsViewportTimeParams extends BaseEventParams {
  duration: number  // ms
}

export interface ScoreAnimationCompletedParams extends BaseEventParams {
  finalScore: number
  animationWatched: boolean
}

export interface CategoryExpandedParams extends BaseEventParams {
  category: string
  score: number
}

export interface ActionPlanCtaClickedParams extends BaseEventParams {
  sourceSection?: string
  briScore?: number
  ctaType?: string
  source?: string
}

export interface ResultsSharedParams extends BaseEventParams {
  shareMethod: 'email' | 'link' | 'social'
}

export interface ResultsDownloadedParams extends BaseEventParams {
  format: 'pdf' | 'csv'
}

// =============================================================================
// PHASE 4: ACTION & GROWTH EVENTS
// =============================================================================

export interface PlaybookViewedParams extends BaseEventParams {
  entrySource: string
  tasksDisplayed: number
}

export interface TaskListScrollDepthParams extends BaseEventParams {
  depth: number  // percentage
  tasksVisible: number
}

export interface TaskExpandedParams extends BaseEventParams {
  taskId: string
  taskTitle: string
  taskCategory: string
  taskPriority: string
  issueTier: string | null
  effortLevel: string
}

export interface TaskStartedParams extends BaseEventParams {
  taskId: string
  taskTitle: string
  taskCategory: string
  issueTier: string | null
  effortLevel: string
  taskNumber: number  // position in the list
}

export interface TaskCompletedParams extends BaseEventParams {
  taskId: string
  taskTitle: string
  taskCategory: string
  issueTier: string | null
  effortLevel: string
  hasEvidence: boolean
  hasCompletionNotes: boolean
}

export interface TaskDismissedParams extends BaseEventParams {
  taskId: string
  taskCategory: string
  dismissReason: 'deferred' | 'not_applicable'
}

export interface TaskBlockedParams extends BaseEventParams {
  taskId: string
  taskCategory: string
  blockedReason?: string
}

export interface PlaybookFilterChangedParams extends BaseEventParams {
  filterType: 'status' | 'category'
  filterValue: string
  previousValue: string
  tasksMatched: number
}

// Dashboard Return Visit Events
export interface DashboardReturnViewParams extends BaseEventParams {
  daysSinceLastVisit: number
  visitsThisMonth: number
}

export interface ValuationChangeNoticedParams extends BaseEventParams {
  previousValue: number
  newValue: number
  changePercent: number
  interactionType: 'hover' | 'click' | 'none'
}

export interface BriChangeNoticedParams extends BaseEventParams {
  previousScore: number
  newScore: number
  interactionType: 'hover' | 'click' | 'none'
}

// Re-assessment Nudge Events
export interface ReassessmentNudgeDismissedParams extends BaseEventParams {
  dismissedAt?: string  // ISO timestamp
}

export interface ReassessmentNudgeClickedParams extends BaseEventParams {
  // companyId is inherited from BaseEventParams
  trigger: 'task_count' | 'time_based'
}

// =============================================================================
// PHASE 5: DEEPER ENGAGEMENT (FINANCIALS)
// =============================================================================

export interface FinancialsPageViewedParams extends BaseEventParams {
  entryPoint: string
  subscriptionTier: string
  hasExistingData: boolean
}

export interface FinancialsEmptyStateSeenParams extends BaseEventParams {
  section: string
}

export interface StatementEntryStartedParams extends BaseEventParams {
  statementType: 'pnl' | 'balance_sheet' | 'cash_flow'
  period: string
}

export interface StatementCompletedParams extends BaseEventParams {
  statementType: string
  completionRate: number  // percentage of fields
  timeToComplete: number  // ms
}

export interface QuickbooksConnectClickedParams extends BaseEventParams {
  currentDataState: 'empty' | 'partial' | 'complete'
}

export interface DcfPageViewedParams extends BaseEventParams {
  hasFinancials: boolean
}

export interface DcfAssumptionsModifiedParams extends BaseEventParams {
  assumptionChanged: string
  previousValue: number
  newValue: number
}

export interface DcfResultViewedParams extends BaseEventParams {
  valuationResult: number
  scenarioName?: string
}

export interface DcfToggleChangedParams extends BaseEventParams {
  useDcfValue: boolean
  dcfValue: number | null
  impliedMultiple: number | null
}

export interface EbitdaAdjustmentMadeParams extends BaseEventParams {
  adjustmentType: 'add_back' | 'deduction'
  adjustmentCategory: string
  amount: number
  isNew: boolean
}

export interface FinancialPeriodCreatedParams extends BaseEventParams {
  fiscalYear: number
  periodType: 'annual' | 'quarterly' | 'monthly' | 't12'
  dataSource: 'manual' | 'quickbooks' | 'import'
}

export interface FinancialPeriodsBatchCreatedParams extends BaseEventParams {
  created: number
  skipped: number
  totalPeriods: number
}

export interface FinancialDataSavedParams extends BaseEventParams {
  statementType: 'pnl' | 'balance_sheet' | 'cash_flow' | 'add_backs'
  periodId: string
  fieldsUpdated: number
  hasEbitda: boolean
}

export interface MonteCarloRunParams extends BaseEventParams {
  iterations: number
  resultMedian: number
  resultP10: number
  resultP90: number
}

export interface SensitivityTableViewedParams extends BaseEventParams {
  centerWacc: number
  centerGrowth: number
  baseValue: number
}

// =============================================================================
// PHASE 6: PERSONAL PLANNING
// =============================================================================

export interface PfsStartedParams extends BaseEventParams {
  entrySource: string
}

export interface PfsCompletedParams extends BaseEventParams {
  sectionsCompleted: number
  totalSections: number
  sensitiveFieldsCompleted: boolean
}

export interface RetirementCalcViewedParams extends BaseEventParams {
  entryPoint: string
}

export interface RetirementInputsEnteredParams extends BaseEventParams {
  fieldsCompleted: string[]
}

export interface RetirementGapDisplayedParams extends BaseEventParams {
  gapAmount: number
  projectedAmount: number
  neededAmount: number
}

// =============================================================================
// PHASE 7: EXIT EXECUTION
// =============================================================================

export interface DataroomFirstVisitParams extends BaseEventParams {
  subscriptionTier: string
}

export interface DocumentUploadedParams extends BaseEventParams {
  documentType: string
  fileSize: number
  category: string
}

export interface DocumentMilestoneParams extends BaseEventParams {
  milestone: 5 | 10 | 25 | 50
  totalDocuments: number
}

export interface DataroomSharedParams extends BaseEventParams {
  recipientType: 'buyer' | 'advisor' | 'other'
}

export interface DealTrackerFirstVisitParams extends BaseEventParams {
  entrySource?: string  // Optional: how user arrived at deal tracker
}

export interface BuyerAddedParams extends BaseEventParams {
  buyerNumber: number  // 1st, 2nd, etc.
  buyerType?: string
}

export interface BuyerStageAdvancedParams extends BaseEventParams {
  buyerId: string
  fromStage: string
  toStage: string
}

export interface DealWonParams extends BaseEventParams {
  buyerId: string
  dealValue?: number
  timeToClose: number  // ms from first contact
}

// =============================================================================
// GLOBAL EVENTS
// =============================================================================

export interface SessionStartParams extends BaseEventParams {
  deviceType: string
  browser: string
  screenSize: string
  timezone: string
}

export interface PageTransitionParams extends BaseEventParams {
  fromPage: string
  toPage: string
  transitionTime: number  // ms
}

export interface FeatureLockedDisplayedParams extends BaseEventParams {
  featureName: string
  requiredTier: string
  currentTier: string
}

export interface UpgradeModalDisplayedParams extends BaseEventParams {
  triggerFeature: string
  currentTier: string
}

export interface UpgradeModalClickedParams extends BaseEventParams {
  selectedPlan: string
  triggerFeature: string
}

export interface UpgradeModalDismissedParams extends BaseEventParams {
  triggerFeature: string
  timeDisplayed: number  // ms
}

// Trial Banner Events
export interface TrialBannerDisplayedParams extends BaseEventParams {
  daysRemaining: number | null
  isExpired: boolean
  isUrgent: boolean
}

export interface TrialBannerClickedParams extends BaseEventParams {
  daysRemaining: number | null
  isExpired: boolean
  destination: string
}

export interface TrialBannerDismissedParams extends BaseEventParams {
  daysRemaining: number | null
}

// Pricing Page Events
export interface PricingPageViewedParams extends BaseEventParams {
  entrySource: string
  isLoggedIn: boolean
}

export interface PricingBillingToggleParams extends BaseEventParams {
  selectedCycle: 'monthly' | 'annual'
  previousCycle: 'monthly' | 'annual'
}

export interface PricingPlanCtaClickedParams extends BaseEventParams {
  planId: string
  planName: string
  price: number
  billingCycle: 'monthly' | 'annual'
  ctaText: string
}

// Billing Settings Events
export interface BillingPageViewedParams extends BaseEventParams {
  currentPlan: string
  isTrialing: boolean
  trialDaysRemaining: number | null
  requestedUpgrade: string | null
}

export interface PlanUpgradeInitiatedParams extends BaseEventParams {
  currentPlan: string
  targetPlan: string
  isTrialing: boolean
  triggerSource: 'billing_page' | 'upgrade_modal' | 'feature_gate' | 'trial_banner'
}

export interface PlanUpgradeCompletedParams extends BaseEventParams {
  previousPlan: string
  newPlan: string
  wasTrialing: boolean
  isNowTrialing: boolean
}

export interface PlanUpgradeFailedParams extends BaseEventParams {
  currentPlan: string
  targetPlan: string
  errorMessage: string
}

export interface ErrorDisplayedParams extends BaseEventParams {
  errorType: string
  errorMessage: string
  errorContext: string
}

export interface HelpAccessedParams extends BaseEventParams {
  helpType: 'tooltip' | 'modal' | 'article' | 'support'
  context: string
}

export interface SupportTicketCreatedParams extends BaseEventParams {
  ticketCategory: string
  context: string
}

// =============================================================================
// PLATFORM TOUR EVENTS
// =============================================================================

export type TourStartedParams = BaseEventParams

export interface TourCompletedParams extends BaseEventParams {
  stepsViewed: number
}

export interface TourSkippedParams extends BaseEventParams {
  skippedAtStep: number
}

// =============================================================================
// EVENT MAP - Maps event names to their parameter types
// =============================================================================

export interface AnalyticsEventMap {
  // Phase 1: Acquisition & Onboarding
  'landing_page_view': LandingPageViewParams
  'cta_visibility': CtaVisibilityParams
  'cta_hover': CtaHoverParams
  'cta_click': CtaClickParams
  'scroll_depth': ScrollDepthParams
  'exit_intent': ExitIntentParams
  'signup_page_view': SignupPageViewParams
  'form_field_focus': FormFieldFocusParams
  'form_field_time': FormFieldTimeParams
  'form_field_error': FormFieldErrorParams
  'form_abandonment': FormAbandonmentParams
  'signup_submit': SignupSubmitParams
  'signup_complete': SignupCompleteParams
  'verification_email_sent': VerificationEmailSentParams
  'verification_link_clicked': VerificationLinkClickedParams
  'verification_abandoned': VerificationAbandonedParams
  'resend_verification': ResendVerificationParams
  'setup_wizard_started': SetupWizardStartedParams
  'setup_step_viewed': SetupStepViewedParams
  'setup_step_time': SetupStepTimeParams
  'setup_step_completed': SetupStepCompletedParams
  'setup_step_back': SetupStepBackParams
  'industry_search': IndustrySearchParams
  'setup_abandoned': SetupAbandonedParams
  'setup_completed': SetupCompletedParams

  // Phase 2: Critical Transition
  'dashboard_first_view': DashboardFirstViewParams
  'initial_valuation_displayed': InitialValuationDisplayedParams
  'valuation_viewport_time': ValuationViewportTimeParams
  'bri_score_displayed': BriScoreDisplayedParams
  'assessment_prompt_displayed': AssessmentPromptDisplayedParams
  'assessment_cta_hover': AssessmentCtaHoverParams
  'assessment_cta_click': AssessmentCtaClickParams
  'dashboard_exit_without_assessment': DashboardExitWithoutAssessmentParams
  'time_to_assessment_start': TimeToAssessmentStartParams
  'assessment_intro_viewed': AssessmentIntroViewedParams
  'assessment_intro_read_time': AssessmentIntroReadTimeParams
  'assessment_intro_abandoned': AssessmentIntroAbandonedParams

  // Phase 3: Assessment Experience
  'assessment_started': AssessmentStartedParams
  'question_displayed': QuestionDisplayedParams
  'question_time': QuestionTimeParams
  'question_response': QuestionResponseParams
  'question_skipped': QuestionSkippedParams
  'question_help_clicked': QuestionHelpClickedParams
  'progress_indicator_interaction': ProgressIndicatorInteractionParams
  'assessment_paused': AssessmentPausedParams
  'assessment_resumed': AssessmentResumedParams
  'assessment_abandoned': AssessmentAbandonedParams
  'assessment_completed': AssessmentCompletedParams
  'results_displayed': ResultsDisplayedParams
  'results_viewport_time': ResultsViewportTimeParams
  'score_animation_completed': ScoreAnimationCompletedParams
  'category_expanded': CategoryExpandedParams
  'action_plan_cta_clicked': ActionPlanCtaClickedParams
  'results_shared': ResultsSharedParams
  'results_downloaded': ResultsDownloadedParams

  // Phase 4: Action & Growth
  'playbook_viewed': PlaybookViewedParams
  'task_list_scroll_depth': TaskListScrollDepthParams
  'task_expanded': TaskExpandedParams
  'task_started': TaskStartedParams
  'task_completed': TaskCompletedParams
  'task_dismissed': TaskDismissedParams
  'task_blocked': TaskBlockedParams
  'playbook_filter_changed': PlaybookFilterChangedParams
  'dashboard_return_view': DashboardReturnViewParams
  'valuation_change_noticed': ValuationChangeNoticedParams
  'bri_change_noticed': BriChangeNoticedParams
  'reassessment_nudge_dismissed': ReassessmentNudgeDismissedParams
  'reassessment_nudge_clicked': ReassessmentNudgeClickedParams

  // Phase 5: Financials
  'financials_page_viewed': FinancialsPageViewedParams
  'financials_empty_state_seen': FinancialsEmptyStateSeenParams
  'statement_entry_started': StatementEntryStartedParams
  'statement_completed': StatementCompletedParams
  'quickbooks_connect_clicked': QuickbooksConnectClickedParams
  'dcf_page_viewed': DcfPageViewedParams
  'dcf_assumptions_modified': DcfAssumptionsModifiedParams
  'dcf_result_viewed': DcfResultViewedParams
  'dcf_toggle_changed': DcfToggleChangedParams
  'ebitda_adjustment_made': EbitdaAdjustmentMadeParams
  'financial_period_created': FinancialPeriodCreatedParams
  'financial_data_saved': FinancialDataSavedParams
  'financials_enter_manually_clicked': BaseEventParams
  'financial_periods_batch_created': FinancialPeriodsBatchCreatedParams
  'sensitivity_table_viewed': SensitivityTableViewedParams
  'monte_carlo_run': MonteCarloRunParams

  // Phase 6: Personal Planning
  'pfs_started': PfsStartedParams
  'pfs_completed': PfsCompletedParams
  'retirement_calc_viewed': RetirementCalcViewedParams
  'retirement_inputs_entered': RetirementInputsEnteredParams
  'retirement_gap_displayed': RetirementGapDisplayedParams

  // Phase 7: Exit Execution
  'dataroom_first_visit': DataroomFirstVisitParams
  'document_uploaded': DocumentUploadedParams
  'document_milestone': DocumentMilestoneParams
  'dataroom_shared': DataroomSharedParams
  'deal_tracker_first_visit': DealTrackerFirstVisitParams
  'buyer_added': BuyerAddedParams
  'buyer_stage_advanced': BuyerStageAdvancedParams
  'deal_won': DealWonParams

  // Global
  'session_start': SessionStartParams
  'page_transition': PageTransitionParams
  'feature_locked_displayed': FeatureLockedDisplayedParams
  'upgrade_modal_displayed': UpgradeModalDisplayedParams
  'upgrade_modal_clicked': UpgradeModalClickedParams
  'upgrade_modal_dismissed': UpgradeModalDismissedParams
  'trial_banner_displayed': TrialBannerDisplayedParams
  'trial_banner_clicked': TrialBannerClickedParams
  'trial_banner_dismissed': TrialBannerDismissedParams
  'pricing_page_viewed': PricingPageViewedParams
  'pricing_billing_toggle': PricingBillingToggleParams
  'pricing_plan_cta_clicked': PricingPlanCtaClickedParams
  'billing_page_viewed': BillingPageViewedParams
  'plan_upgrade_initiated': PlanUpgradeInitiatedParams
  'plan_upgrade_completed': PlanUpgradeCompletedParams
  'plan_upgrade_failed': PlanUpgradeFailedParams
  'error_displayed': ErrorDisplayedParams
  'help_accessed': HelpAccessedParams
  'support_ticket_created': SupportTicketCreatedParams

  // Platform Tour
  'tour_started': TourStartedParams
  'tour_completed': TourCompletedParams
  'tour_skipped': TourSkippedParams
}

export type AnalyticsEventName = keyof AnalyticsEventMap
