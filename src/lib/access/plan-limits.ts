import { PlanTier, TEAM_MEMBER_LIMITS } from '@/lib/pricing'

/**
 * Plan limits configuration
 */
export interface PlanLimits {
  companies: number
  staff: number
  guestOwners: number
}

/**
 * Get limits for each plan tier
 */
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  'foundation': {
    companies: 1,
    staff: 0,
    guestOwners: 0,
  },
  'growth': {
    companies: 1,
    staff: 3,
    guestOwners: 0,
  },
  'deal-room': {
    companies: Infinity,
    staff: Infinity,
    guestOwners: 10,
  },
}

/**
 * Get the limits for a specific plan tier
 */
export function getPlanLimits(planTier: PlanTier): PlanLimits {
  return PLAN_LIMITS[planTier]
}

/**
 * Check if a plan can have additional companies
 */
export function canAddCompany(planTier: PlanTier, currentCount: number): boolean {
  const limits = getPlanLimits(planTier)
  return currentCount < limits.companies
}

/**
 * Check if a plan can have additional staff
 */
export function canAddStaff(planTier: PlanTier, currentCount: number): boolean {
  const limits = getPlanLimits(planTier)
  return currentCount < limits.staff
}

/**
 * Check if a plan can have additional guest owners
 */
export function canAddGuestOwner(planTier: PlanTier, currentCount: number): boolean {
  const limits = getPlanLimits(planTier)
  return currentCount < limits.guestOwners
}

/**
 * Get the number of staff that would need to be paused on downgrade
 */
export function getStaffToPause(currentPlan: PlanTier, newPlan: PlanTier, currentStaffCount: number): number {
  const newLimit = TEAM_MEMBER_LIMITS[newPlan]
  if (newLimit === Infinity) return 0
  return Math.max(0, currentStaffCount - newLimit)
}

/**
 * Get the number of guest owners that would need to be removed on downgrade
 */
export function getGuestOwnersToPause(currentPlan: PlanTier, newPlan: PlanTier, currentGuestOwnerCount: number): number {
  const newLimit = PLAN_LIMITS[newPlan].guestOwners
  return Math.max(0, currentGuestOwnerCount - newLimit)
}

/**
 * Get the number of companies that would be affected on downgrade
 */
export function getCompaniesToHandle(currentPlan: PlanTier, newPlan: PlanTier, currentCompanyCount: number): number {
  const newLimit = PLAN_LIMITS[newPlan].companies
  if (newLimit === Infinity) return 0
  return Math.max(0, currentCompanyCount - newLimit)
}

/**
 * Trial configuration
 */
export const TRIAL_CONFIG = {
  durationDays: 14,
  defaultPlan: 'deal-room' as PlanTier,
  fallbackPlan: 'foundation' as PlanTier,
  reminderDays: 3, // Send reminder 3 days before trial ends
}

/**
 * Calculate trial end date from start date
 */
export function calculateTrialEndDate(startDate: Date): Date {
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + TRIAL_CONFIG.durationDays)
  return endDate
}

/**
 * Check if trial is ending soon (within reminder period)
 */
export function isTrialEndingSoon(trialEndsAt: Date): boolean {
  const now = new Date()
  const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return daysRemaining > 0 && daysRemaining <= TRIAL_CONFIG.reminderDays
}

/**
 * Check if trial has expired
 */
export function hasTrialExpired(trialEndsAt: Date): boolean {
  return new Date() > trialEndsAt
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(trialEndsAt: Date): number {
  const now = new Date()
  const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, daysRemaining)
}
