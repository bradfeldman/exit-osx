/**
 * Project Assessments Module
 *
 * This module handles the detailed Project Assessments that come after
 * the Initial BRI Assessment. These 8-15 question assessments:
 * - Refine the BRI score with additional detail
 * - Generate targeted 30-90 day action plans
 * - Continuously improve through iterative assessment cycles
 */

export {
  calculateQuestionPriorities,
  selectQuestionsForAssessment,
  markQuestionsAsAsked,
  getQuestionCoverageStats,
  recommendNextAssessmentFocus,
} from './prioritization-engine'

export {
  generateActionPlanFromResponses,
  getActionPlanSummary,
  get3090DayActionPlan,
} from './action-plan-generator'
