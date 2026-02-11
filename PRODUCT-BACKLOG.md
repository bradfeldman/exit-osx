# Exit OSx Product Backlog

**Last Updated:** 2026-02-11
**Managed By:** project-manager agent
**Sources:** Product Lead Review (2026-02-10), Spec Audit (2026-02-06), Valuation Bug Report (2026-02-04), Agent Memory

---

## Executive Summary

### Total Items: 104 | Completed: 87 | Remaining: 17

| Status | Count | Description |
|--------|-------|-------------|
| **Done** | 87 | Implemented, tested, and deployed |
| **Partial** | 3 | Infrastructure exists, needs completion (PROD-078, 082, 086) |
| **Not Started** | 14 | Future features and mobile app (Phase 3-4, PROD-080/081/083/084/087, PROD-096-104) |

### Completion by Category

| Category | Done | Partial | Not Started |
|----------|------|---------|-------------|
| Onboarding (001-006) | 6 | — | — |
| Valuation & Financial (007-012) | 6 | — | — |
| Scoring & Assessment (013-017) | 5 | — | — |
| Sustained Value & Signals (018-022) | 5 | — | — |
| Mobile & Intelligence (023-024) | 2 | — | — |
| Legacy Cleanup (025-034) | 10 | — | — |
| Actions & Tasks (035-040) | 6 | — | — |
| Deal Room & UX (041-053) | 13 | — | — |
| Cron Jobs (054-057) | 4 | — | — |
| AI Features (058-059) | 2 | — | — |
| Technical Debt (060-072) | 13 | — | — |
| Phase 2 Features (073-079, 085) | 7 | 1 | — |
| Phase 3-4 Features (080-084, 086-087) | — | 2 | 5 |
| Testing & DevOps (088-095) | 8 | — | — |
| Mobile App (096-104) | — | — | 9 |
| **Totals** | **87** | **3** | **14** |

---

## Sprint 1: Critical Blockers (Must Fix Now)

### WORKSTREAM: Signup & Onboarding Flow

#### PROD-001: Magic-Link Signup with Deferred Business Setup
**Source:** Product Lead Review 1.X
**Priority:** Blocker
**Category:** Onboarding
**Complexity:** L (3-4 days)

**Description:**
Current signup flow asks for password + company name upfront, creating too much friction. Need to implement magic-link email-only signup with deferred business setup.

**Acceptance Criteria:**
- [ ] Signup form only asks for email address
- [ ] Magic link sent via Resend
- [ ] Activation page shows locked email, password creation with confirm field, eye toggle, requirements display
- [ ] Password requirements clearly visible during creation
- [ ] No company name asked during signup
- [ ] Post-activation lands in onboarding where company name is captured
- [ ] Email field locked/disabled during password setup

**Assigned Agent(s):** security-compliance-engineer (auth flow) + lead-frontend-engineer (UI) + growth-engineer (funnel optimization)

**Dependencies:** None (unblocks PROD-002)

**Status:** ✅ Done — Magic link signup at `(auth)/signup/page.tsx`, activation at `(auth)/activate/page.tsx`

---

#### PROD-002: Freeform Business Description with AI Classification
**Source:** Product Lead Review 1.1
**Priority:** Blocker
**Category:** Onboarding
**Complexity:** L (3-4 days)

**Description:**
GICS-first industry classification is too rigid. Replace with freeform business description that uses AI to derive classification(s). User should be able to complete onboarding without selecting formal industry.

**Acceptance Criteria:**
- [ ] First onboarding step: textarea for business description (not dropdown)
- [ ] AI processes description to derive primary + secondary industry classifications
- [ ] System explains why it chose each classification
- [ ] User can confirm, edit, or override derived classifications
- [ ] No blocking dropdown selection required
- [ ] Industry multiples populated from derived classification

**Assigned Agent(s):** applied-ai-rules-engine (classification logic) + full-stack-engineer (integration) + content-knowledge-architect (prompt design)

**Dependencies:** PROD-001 (onboarding entry point)

**Status:** ✅ Done — AI industry matching at `api/industries/match/route.ts`, uses GPT-4o-mini for ICB classification

---

#### PROD-003: Streamline Onboarding Flow (Eliminate Redundant Data Entry)
**Source:** Product Lead Review 1.2
**Priority:** Blocker
**Category:** Onboarding
**Complexity:** M (2-3 days)

**Description:**
Current flow forces users through: describe → submit → classify → select → re-enter. This creates abandonment. Need single progressive flow with inline confirmation/edit and zero redundant data entry.

**Acceptance Criteria:**
- [ ] All data collected in one pass through wizard
- [ ] Background processing shows inline progress (not blocking screens)
- [ ] Users can edit any field without going back through entire flow
- [ ] No field asked twice
- [ ] Quick Scan results appear inline, not on separate page
- [ ] Flow feels continuous, not stepped

**Assigned Agent(s):** lead-frontend-engineer (flow redesign) + full-stack-engineer (state management) + product-designer-ux (flow audit)

**Dependencies:** PROD-002 (classification must work inline)

**Status:** ✅ Done — `StreamlinedOnboardingFlow.tsx` with 4-step flow (basics, financials, risk, summary)

---

#### PROD-004: Investment-Banker-Grade Comparable Company & Multiple Engine
**Source:** Product Lead Review 1.3
**Priority:** Blocker
**Category:** Financial/Valuation
**Complexity:** XL (5+ days)

**Description:**
No robust system for deriving defensible valuation multiples. Need investment-banker-like logic that identifies closest public comparables, adjusts for size/growth/margins/customer mix, and produces EBITDA + Revenue multiple ranges with explanations.

**Acceptance Criteria:**
- [ ] AI prompt identifies 3-5 closest public comparable companies
- [ ] Adjusts multiples for: revenue size, growth rate, margin profile, customer concentration
- [ ] Produces EBITDA multiple range (low/mid/high) with reasoning
- [ ] Produces Revenue multiple range with reasoning
- [ ] Explains why each comparable was chosen
- [ ] Multiples are updateable (not static)
- [ ] Uses current market data (not stale benchmarks)
- [ ] Results are defensible to sophisticated buyers

**Assigned Agent(s):** financial-modeling-engineer (multiple logic) + applied-ai-rules-engine (comparable selection) + saas-data-architect (data sourcing)

**Dependencies:** PROD-002 (needs industry classification)

**Status:** ✅ Done — `comparable-engine.ts` with Claude AI, `api/companies/[id]/comparables/route.ts`, 40+ ICB sub-sectors

---

#### PROD-005: Animated Progress During Plan Generation
**Source:** Product Lead Review 1.4
**Priority:** High
**Category:** Onboarding
**Complexity:** S (4-8 hours)

**Description:**
Dead loading state while system builds action plan is poor UX. Show animated progress steps: "Analyzing industry", "Benchmarking peers", "Identifying value gaps", "Building your action plan".

**Acceptance Criteria:**
- [ ] Replace spinner with step-by-step progress UI
- [ ] Show 4-5 specific steps matching actual processing
- [ ] Each step animates complete when finished
- [ ] Steps appear sequential (not all at once)
- [ ] Uses existing AnimatedStagger/AnimatedItem components
- [ ] Shows estimated time if processing exceeds 5 seconds

**Assigned Agent(s):** lead-frontend-engineer

**Dependencies:** PROD-003 (new onboarding flow)

**Status:** ✅ Done — Step-by-step animated progress overlay in `StreamlinedOnboardingFlow.tsx`

---

#### PROD-006: Tour-First, Task-Later Onboarding
**Source:** Product Lead Review 1.5
**Priority:** Blocker
**Category:** Onboarding
**Complexity:** M (2-3 days)

**Description:**
Users forced into tasks before understanding product leads to confusion. Show first task as preview, guide through where tasks live, how assessments drive tasks, and how value changes. Tasks become actionable only after tour.

**Acceptance Criteria:**
- [ ] Onboarding completion shows product tour (not task execution)
- [ ] Tour highlights: Value dashboard, Diagnosis, Action queue, Evidence, Deal Room
- [ ] First task shown as "preview" with callouts explaining task anatomy
- [ ] Tasks locked/gated until tour completion
- [ ] "Skip tour" option available for power users
- [ ] Tour state persisted (never shown twice)

**Assigned Agent(s):** lead-frontend-engineer (tour UI) + product-designer-ux (tour flow) + growth-engineer (activation metrics)

**Dependencies:** PROD-003 (onboarding flow complete)

**Status:** ✅ Done — `PlatformTour.tsx` + `ExposureContext.tsx` with LEARNING→TOURING→VIEWING→ACTING state machine

---

### WORKSTREAM: Valuation Consistency & Financial Calculations

#### PROD-007: Fix LINEAR vs NON-LINEAR Valuation Formula in Onboarding
**Source:** Valuation Bug Report (Bug #1) + Product Lead Review
**Priority:** Blocker
**Category:** Financial/Valuation
**Complexity:** M (1-2 days)

**Description:**
Onboarding uses LINEAR formula (currentValue = potentialValue × briRatio) while backend uses NON-LINEAR formula with ALPHA=1.4. This creates 16-29% valuation differences between onboarding and dashboard. Root cause is `OnboardingFlow.tsx` lines 342-345.

**Acceptance Criteria:**
- [ ] OnboardingFlow.tsx uses NON-LINEAR formula with ALPHA=1.4
- [ ] Formula matches `recalculate-snapshot.ts` exactly
- [ ] Test case verifies onboarding values match dashboard values within 1%
- [ ] No "value jumps" when moving from onboarding to dashboard
- [ ] RiskResultsStep displays correct values to user

**Assigned Agent(s):** financial-modeling-engineer (formula audit) + qa-test-engineer (integration tests)

**Dependencies:** PROD-009 (shared utility must exist first)

**Status:** ✅ Done — NON-LINEAR formula with ALPHA=1.4 in `calculate-valuation.ts`

---

#### PROD-008: Standardize Core Score Calculation (6 factors vs 5 factors)
**Source:** Valuation Bug Report (Bug #3)
**Priority:** Blocker
**Category:** Financial/Valuation
**Complexity:** M (1-2 days)

**Description:**
Dashboard uses 6 factors in Core Score calculation (includes revenueSizeCategory), while onboarding-snapshot and recalculate-snapshot use 5 factors (excludes revenueSizeCategory). This creates 10% Core Score differences that compound through multiple calculation.

**Acceptance Criteria:**
- [ ] Core Score calculation uses identical factor list in all locations
- [ ] Recommended: Remove revenueSizeCategory from dashboard (revenue already affects valuation via multiple)
- [ ] Test case verifies Core Score matches across dashboard, onboarding, recalculate-snapshot
- [ ] Documentation explains which factors are included and why

**Assigned Agent(s):** financial-modeling-engineer (formula audit) + backend-systems-architect (API consistency)

**Dependencies:** PROD-009 (shared utility)

**Status:** ✅ Done — Standardized 6-factor core score in `calculate-valuation.ts`

---

#### PROD-009: Create Shared calculateValuation() Utility
**Source:** Valuation Bug Report (Priority 3 fix)
**Priority:** Blocker
**Category:** Financial/Valuation
**Complexity:** M (1-2 days)

**Description:**
Five separate places calculate valuations with different formulas. Need single source of truth at `src/lib/valuation/calculate-valuation.ts` that all callers use. This prevents future formula divergence.

**Acceptance Criteria:**
- [ ] New file: `src/lib/valuation/calculate-valuation.ts` with `calculateValuation()` function
- [ ] Function uses NON-LINEAR formula with ALPHA=1.4
- [ ] Returns: currentValue, potentialValue, valueGap, baseMultiple, finalMultiple, discountFraction
- [ ] All 5 locations updated to use shared utility:
  - OnboardingFlow.tsx
  - /api/companies/[id]/onboarding-snapshot/route.ts
  - recalculate-snapshot.ts
  - /api/companies/[id]/dashboard/route.ts
  - improve-snapshot-for-task.ts
- [ ] Unit tests for calculateValuation() with known inputs/outputs
- [ ] Integration test verifies consistency across all call sites

**Assigned Agent(s):** financial-modeling-engineer (utility creation) + backend-systems-architect (migration) + qa-test-engineer (test coverage)

**Dependencies:** None (blocks PROD-007, PROD-008)

**Status:** ✅ Done — Shared `calculateValuation()` in `src/lib/valuation/calculate-valuation.ts`

---

#### PROD-010: Financial Calculation Audit (Cash Flow, Working Capital, FCF, EBITDA)
**Source:** Product Lead Review 4.2
**Priority:** Blocker
**Category:** Financial/Valuation
**Complexity:** L (3-4 days)

**Description:**
Multiple financial calculation errors reported: cash flow year alignment incorrect, working capital not calculating, FCF not populating, lending page EBITDA mismatch. Needs full audit and fix.

**Acceptance Criteria:**
- [ ] Cash flow year alignment corrected across all financial pages
- [ ] Working capital calculation formula verified and fixed
- [ ] Free Cash Flow (FCF) populates correctly
- [ ] EBITDA matches across all pages (dashboard, valuation, lending)
- [ ] Single source of truth for each financial metric
- [ ] Financial formulas documented in code comments
- [ ] Test cases for each calculation with known inputs/outputs

**Assigned Agent(s):** financial-modeling-engineer (audit + fix) + qa-test-engineer (regression tests)

**Dependencies:** None

**Status:** ✅ Done — EBITDA bug fixed in FinancialsSpreadsheet.tsx, BRI weights consolidated

---

#### PROD-011: QuickBooks Auto-Sync on Connection
**Source:** Product Lead Review 4.1
**Priority:** Blocker
**Category:** Financial/Valuation
**Complexity:** M (1-2 days)

**Description:**
QuickBooks integration doesn't auto-sync on initial connection. Large persistent connection UI remains after sync. Manual sync button unclear.

**Acceptance Criteria:**
- [ ] On QB connect: trigger immediate sync (not manual)
- [ ] On login: auto-refresh financials if > 24 hours since last sync
- [ ] Add "Force Sync" button with last-sync timestamp display
- [ ] Minimize QB connection UI after successful initial sync
- [ ] Show sync progress with specific steps (accounts, transactions, etc.)
- [ ] Handle sync errors gracefully with retry option

**Assigned Agent(s):** full-stack-engineer (QB integration) + backend-systems-architect (sync logic)

**Dependencies:** None

**Status:** ✅ Done — Auto-sync in `quickbooks/sync.ts`, Force Sync button in `QuickBooksCard.tsx`

---

#### PROD-012: Simplify DCF vs EBITDA vs Revenue Valuation Method Selection
**Source:** Product Lead Review 4.3
**Priority:** Blocker
**Category:** Financial/Valuation
**Complexity:** M (2-3 days)

**Description:**
Too much technical burden on user to choose between DCF, EBITDA multiple, and Revenue multiple methods. System should choose default method intelligently, user sees outcomes not mechanics.

**Acceptance Criteria:**
- [ ] System auto-selects best method based on: company maturity, data availability, industry norms
- [ ] Default method shown to user with brief explanation ("We're using EBITDA multiples because...")
- [ ] Advanced users can override default in settings
- [ ] Method selection doesn't block onboarding
- [ ] DCF only shown for mature businesses with 3+ years financials
- [ ] Revenue multiples used for pre-revenue or negative EBITDA companies

**Assigned Agent(s):** financial-modeling-engineer (method selection logic) + product-designer-ux (simplified UI)

**Dependencies:** PROD-009 (shared valuation utility)

**Status:** ✅ Done — Auto-selection engine in `method-selector.ts` with decision tree

---

### WORKSTREAM: Scoring & Assessment System

#### PROD-013: Fix Assessment Reset & Zeroing Bugs
**Source:** Product Lead Review 2.3
**Priority:** Blocker
**Category:** Scoring/BRI
**Complexity:** L (3-4 days)

**Description:**
Re-assessing one category sets other categories to zero. Confidence levels behave inconsistently. "Financial Health" category appears structurally biased. Assessment updates should preserve prior scores.

**Acceptance Criteria:**
- [ ] Re-assess category = UPDATE, not RESET
- [ ] Other categories remain unchanged during single-category re-assessment
- [ ] Confidence levels persist and update correctly
- [ ] Audit "Financial Health" category for bias (structural vs user data)
- [ ] Test case: re-assess one category 3x, verify others unchanged
- [ ] AssessmentResponse records preserve history (not overwritten)

**Assigned Agent(s):** backend-systems-architect (assessment engine audit) + qa-test-engineer (regression tests)

**Dependencies:** None

**Status:** ✅ Done — Cross-assessment aggregation via shared `bri-scoring.ts` utilities

---

#### PROD-014: Enforce Assessment Flow Logic (Initial → Adaptive)
**Source:** Product Lead Review 2.4
**Priority:** Blocker
**Category:** Scoring/BRI
**Complexity:** M (2-3 days)

**Description:**
Advanced questions appear before initial questions answered. "Sharpen Diagnosis" label confusing. Categories default to 70 without data, creating fake scores. Need proper initial → adaptive question flow.

**Acceptance Criteria:**
- [ ] Initial assessment questions required before adaptive questions appear
- [ ] "Sharpen Diagnosis" button renamed to "Re-Assess"
- [ ] Categories with no user data show "Not Assessed" (not default 70)
- [ ] Placeholder scores visually distinct from real scores
- [ ] Question ordering enforced: foundational → advanced
- [ ] UI clearly shows assessment completion progress per category

**Assigned Agent(s):** backend-systems-architect (question engine) + lead-frontend-engineer (UI updates)

**Dependencies:** PROD-013 (assessment engine fixes)

**Status:** ✅ Done — Assessment flow logic enforced (Initial → Adaptive)

---

#### PROD-015: BRI Range Graphic Fix (Company Position Incorrect)
**Source:** Product Lead Review 2.1
**Priority:** Blocker
**Category:** Scoring/BRI
**Complexity:** S (4-8 hours)

**Description:**
BRI range graphic displays company at bottom of range instead of between min and max. Need redesign with explicit min/max markers and company positioned correctly inside range.

**Acceptance Criteria:**
- [ ] Range shows explicit min value (left anchor)
- [ ] Range shows explicit max value (right anchor)
- [ ] Company indicator positioned proportionally between min and max
- [ ] Visual design clearly shows company is "inside" the range, not anchored to left edge
- [ ] Mobile-responsive layout maintains proportional positioning

**Assigned Agent(s):** lead-frontend-engineer (component fix) + product-designer-ux (visual design)

**Dependencies:** None

**Status:** ✅ Done — BRI range graphic fixed

---

#### PROD-016: Fix Category Value Gap Reconciliation
**Source:** Product Lead Review 2.2
**Priority:** Blocker
**Category:** Scoring/BRI
**Complexity:** M (1-2 days)

**Description:**
Individual category value gaps don't sum to total estimated value gap. Need math audit to ensure deltas roll up correctly and investigate rounding/weighting issues.

**Acceptance Criteria:**
- [ ] Sum of 6 category value gaps = total value gap (within rounding tolerance)
- [ ] Category gap calculation formula documented
- [ ] Rounding applied consistently at final display (not intermediate steps)
- [ ] Weight distribution across categories verified
- [ ] Test case with known category scores verifies rollup math

**Assigned Agent(s):** financial-modeling-engineer (math audit) + backend-systems-architect (data flow)

**Dependencies:** PROD-009 (shared valuation utility)

**Status:** ✅ Done — Category value gap reconciliation via `calculateCategoryValueGaps()`

---

#### PROD-017: Assessment Cadence Control (Fatigue Prevention)
**Source:** Product Lead Review 2.5
**Priority:** High
**Category:** Scoring/BRI
**Complexity:** M (2-3 days)

**Description:**
Weekly + monthly + category updates create assessment fatigue. Need smart cadence rules: weekly OR monthly (not both), category updates only triggered by material changes, task completions, or time thresholds.

**Acceptance Criteria:**
- [ ] User chooses weekly OR monthly cadence (not forced into both)
- [ ] Category re-assessment prompts only appear when:
  - Material change detected (e.g., revenue +20%)
  - Related task completed
  - > 90 days since last assessment
- [ ] No more than 1 assessment prompt per week
- [ ] User can defer assessment without penalty
- [ ] Cadence preference stored in user settings

**Assigned Agent(s):** backend-systems-architect (cadence logic) + applied-ai-rules-engine (trigger rules)

**Dependencies:** PROD-014 (assessment flow fixes)

**Status:** ✅ Done — Assessment cadence control with fatigue prevention

---

### WORKSTREAM: Sustained Value System (Retention Engine)

#### PROD-018: Build Drift Detection Engine & Monthly Drift Report
**Source:** Spec Audit §8 + Project Manager Memory
**Priority:** Blocker (Primary Retention Mechanism)
**Category:** Sustained Value
**Complexity:** XL (5+ days)

**Description:**
Monthly Value Drift Ritual is the primary retention mechanism and is NOT built. Need 3-screen in-app flow, email notifications, continuous drift detection. Current cron jobs (document decay, financial staleness) are inputs but drift report synthesis doesn't exist.

**Acceptance Criteria:**
- [ ] Drift calculation synthesizes: BRI changes, value-at-risk signals, document staleness, financial staleness
- [ ] Monthly drift report generated automatically
- [ ] 3-screen in-app flow: (1) Drift summary, (2) Category details, (3) Recommended actions
- [ ] Email notification: "Your buyer confidence dropped X points this month"
- [ ] Drift report accessible from dashboard
- [ ] Drift history shows monthly timeline
- [ ] Copy follows spec: buyer-framed, urgent but not alarmist

**Assigned Agent(s):** applied-ai-rules-engine (drift calculation) + backend-systems-architect (report generation) + lead-frontend-engineer (in-app flow) + content-knowledge-architect (copy)

**Dependencies:** PROD-019 (email infrastructure)

**Status:** ✅ Done — Drift engine + 3-screen UI + email notifications in `lib/drift/`

---

#### PROD-019: Email Notification System for Drift/Signals
**Source:** Spec Audit §8
**Priority:** Blocker
**Category:** Sustained Value
**Complexity:** M (2-3 days)

**Description:**
No email notification system beyond onboarding-complete. Need email templates and sending infrastructure for: drift reports, signal alerts, weekly check-ins, engagement campaigns.

**Acceptance Criteria:**
- [ ] Email templates created for:
  - Monthly drift report
  - High-severity signal alert
  - Weekly check-in reminder
  - 21-day inactivity nudge
- [ ] Resend integration for all templates
- [ ] Email preferences in user settings (frequency, types)
- [ ] Unsubscribe handling
- [ ] Email tracking (opens, clicks) via Resend webhooks
- [ ] API endpoints: /api/email/drift, /api/email/signal-alert, /api/email/weekly-checkin

**Assigned Agent(s):** full-stack-engineer (email infra) + content-knowledge-architect (templates) + growth-engineer (email metrics)

**Dependencies:** None (blocks PROD-018)

**Status:** ✅ Done — Email infrastructure via Resend, 10+ email types

---

#### PROD-020: Complete Signal Pipeline (Channels 2-5)
**Source:** Spec Audit §8
**Priority:** High
**Category:** Sustained Value
**Complexity:** L (3-4 days)

**Description:**
Signal pipeline partially built. Channel 1 (Prompted Disclosure) works. Need to complete: Channel 2 (task-generated signals + document upload signals), Channel 3 (cron job outputs into signal system), Channel 4 (external public signals - Phase 2), Channel 5 (advisor signal workflow).

**Acceptance Criteria:**
- [ ] Channel 2: Task completion creates signals in Signal table (verify existing, fix gaps)
- [ ] Channel 2: Document upload creates signals via task-signal mapping
- [ ] Channel 3: Document decay cron outputs create signals with correct severity/confidence
- [ ] Channel 3: Financial staleness cron outputs create signals
- [ ] Channel 5: Advisor portal has signal confirmation/deny workflow
- [ ] All signals flow into Value Ledger
- [ ] Signal confidence scoring implemented per spec

**Assigned Agent(s):** backend-systems-architect (signal pipeline) + applied-ai-rules-engine (confidence scoring)

**Dependencies:** PROD-018 (drift engine consumes signals)

**Status:** ✅ Done — All 5 signal channels implemented in `lib/signals/`

---

#### PROD-021: Signal Confidence Scoring & Fatigue Prevention
**Source:** Spec Audit §8
**Priority:** High
**Category:** Sustained Value
**Complexity:** M (2-3 days)

**Description:**
Signal confidence levels defined in schema but actual scoring pipeline (confidence affecting value-at-risk calculations) not verified. Signal suppression rules (max 3 active, grouping) not implemented.

**Acceptance Criteria:**
- [ ] Signal confidence weights applied per spec: UNCERTAIN (0.5x), LOW (0.7x), MODERATE (0.85x), HIGH (1.0x), VERY_HIGH (1.0x)
- [ ] Value-at-risk calculation uses confidence-weighted signals
- [ ] Max 3 signals shown at once (highest severity × confidence)
- [ ] Related signals grouped (not shown separately)
- [ ] Signal dismissed by user = confidence downgrade (not deletion)
- [ ] Confidence scoring documented in code

**Assigned Agent(s):** applied-ai-rules-engine (confidence logic) + backend-systems-architect (aggregation)

**Dependencies:** PROD-020 (signal pipeline)

**Status:** ✅ Done — Confidence scoring in `confidence-scoring.ts` with fatigue prevention

---

#### PROD-022: Value-at-Risk Monitoring & Aggregation
**Source:** Spec Audit §8
**Priority:** High
**Category:** Sustained Value
**Complexity:** M (2-3 days)

**Description:**
Spec describes continuous value-at-risk tracking that feeds into Value Gap. No component or API endpoint specifically for value-at-risk aggregation found.

**Acceptance Criteria:**
- [ ] API endpoint: /api/companies/[id]/value-at-risk
- [ ] Aggregates all active signals with estimatedValueImpact
- [ ] Applies confidence weighting
- [ ] Returns: totalValueAtRisk, signalCount, topThreats (highest impact signals)
- [ ] Value Gap calculation includes value-at-risk
- [ ] Dashboard shows value-at-risk as separate metric or sub-component

**Assigned Agent(s):** backend-systems-architect (aggregation logic) + financial-modeling-engineer (value gap integration)

**Dependencies:** PROD-020, PROD-021 (signal pipeline + confidence scoring)

**Status:** ✅ Done — VaR aggregation engine in `value-at-risk.ts` with trend analysis

---

### WORKSTREAM: Mobile Experience

#### PROD-023: Fix Mobile Login Bug (Page Jump)
**Source:** Product Lead Review 8.1
**Priority:** Blocker
**Category:** Mobile
**Complexity:** M (1-2 days)

**Description:**
Login page jumps back and forth on mobile. Mobile routing and state management broken.

**Acceptance Criteria:**
- [ ] Mobile login page loads without jumping/re-rendering
- [ ] Form inputs retain focus on mobile
- [ ] Keyboard appearance doesn't cause layout shift
- [ ] State preserved during mobile navigation
- [ ] Test on iOS Safari, Android Chrome
- [ ] Viewport meta tag configured correctly

**Assigned Agent(s):** mobile-experience-engineer (mobile debugging) + lead-frontend-engineer (state fix)

**Dependencies:** None

**Status:** ✅ Done — `min-h-[100dvh]`, viewport config, removed scale animations

---

### WORKSTREAM: Intelligence Continuity (Strategic Blocker)

#### PROD-024: Build Company Intelligence Layer
**Source:** Product Lead Review 3.3
**Priority:** Blocker (Strategic)
**Category:** Technical Debt
**Complexity:** XL (5+ days)

**Description:**
Knowledge learned over time (onboarding data, assessments, task completions, notes, NA flags) isn't accumulating. Need Company Intelligence Layer that aggregates all learning and uses it to generate better questions, adjust value ranges, improve task relevance.

**Acceptance Criteria:**
- [ ] Aggregate data model or view: CompanyIntelligence
- [ ] Pulls from: onboarding responses, assessment history, task completions, notes, NA flags, disclosure responses
- [ ] Used by: question generation (adaptive questions), value range adjustments, task recommendation engine
- [ ] Intelligence persists and builds over time (not recalculated fresh each time)
- [ ] API: /api/companies/[id]/intelligence
- [ ] AI prompts reference intelligence context
- [ ] Narrative generation uses intelligence to personalize copy

**Assigned Agent(s):** backend-systems-architect (data model) + applied-ai-rules-engine (AI integration) + saas-data-architect (data aggregation)

**Dependencies:** None (foundational infrastructure)

**Status:** ✅ Done — Company Intelligence Layer in `lib/intelligence/company-intelligence.ts`

---

## Sprint 2: High Priority (Fix This Quarter)

### Legacy Cleanup & Navigation

#### PROD-025: Remove Legacy Routes & Add Redirects
**Source:** Spec Audit §2
**Priority:** High
**Category:** Legacy Cleanup
**Complexity:** M (2-3 days)

**Description:**
15+ legacy routes still routable alongside five modes. Create multiple pathways to same data, fragment UX, violate five-destination architecture. Need removal or redirects.

**Legacy Routes to Handle:**
- /dashboard/playbook → /dashboard/actions
- /dashboard/action-plan → /dashboard/actions
- /dashboard/assessment/* (3 sub-routes) → /dashboard/diagnosis
- /dashboard/assessments/* (2 sub-routes) → /dashboard/diagnosis
- /dashboard/deal-tracker → /dashboard/deal-room
- /dashboard/contacts → /dashboard/deal-room
- /dashboard/data-room → /dashboard/evidence OR /dashboard/deal-room
- /dashboard/value-builder → /dashboard
- /dashboard/deals/[dealId] → /dashboard/deal-room
- /dashboard/developer/* → /admin/tools/*
- /dashboard/global/* → /admin/tools/*

**Acceptance Criteria:**
- [ ] All legacy route directories removed or redirected
- [ ] Next.js redirects in next.config.ts or middleware
- [ ] Bookmarked URLs redirect to correct new location
- [ ] No broken internal links
- [ ] Admin/developer routes only accessible at /admin/tools/*

**Assigned Agent(s):** full-stack-engineer (cleanup) + devops-platform-engineer (redirect testing)

**Dependencies:** PROD-026 (nav cleanup), PROD-027 (dev tools removed from sidebar)

**Status:** ✅ Done — Empty dirs removed, 301 redirects added in middleware.ts

---

#### PROD-026: Remove Developer/Global Sections from Product Sidebar
**Source:** Spec Audit §1 + Product Lead Killed Features #6, #7
**Priority:** High
**Category:** Legacy Cleanup
**Complexity:** S (4-8 hours)

**Description:**
Developer and Global sections render in product sidebar for super admins. These are admin tools, not user features. Should only exist at /admin/tools/*.

**Acceptance Criteria:**
- [ ] Sidebar.tsx: Remove Developer section (lines 355-443)
- [ ] Sidebar.tsx: Remove Global section (lines 446-509)
- [ ] Admin panel at /admin/ retains access to all tools
- [ ] Super admin users see clean product sidebar
- [ ] No regression in admin panel functionality

**Assigned Agent(s):** lead-frontend-engineer

**Dependencies:** None (enables PROD-025)

**Status:** ✅ Done — Dev/Global sections removed from Sidebar.tsx

---

#### PROD-027: Remove Exit Tools Section from Sidebar
**Source:** Spec Audit §1
**Priority:** High
**Category:** Legacy Cleanup
**Complexity:** S (4-8 hours)

**Description:**
Sidebar lines 59-63 show "Data Room", "Deal Tracker", "Contacts" as separate nav items. These are consolidated into Mode 5 (Deal Room) and should not appear separately.

**Acceptance Criteria:**
- [ ] Remove Exit Tools section from Sidebar.tsx
- [ ] "Deal Room" remains as single nav item
- [ ] Data Room accessible via Deal Room tabs
- [ ] Contacts accessible via Deal Room pipeline
- [ ] No orphaned navigation items

**Assigned Agent(s):** lead-frontend-engineer

**Dependencies:** None (enables PROD-025)

**Status:** ✅ Done — Exit Tools section removed, consolidated into Deal Room

---

#### PROD-028: Replace Stage-Based Progression with Milestone-Based
**Source:** Spec Audit §1 + Product Lead Killed Features #1 + Project Manager Memory
**Priority:** High
**Category:** Technical Debt
**Complexity:** L (3-4 days)

**Description:**
Sidebar uses numeric `stage` from useProgression() to gate nav sections. This IS the killed 7-stage progression system. Should use milestone-based logic (financials uploaded, assessment completed, etc.) instead.

**Acceptance Criteria:**
- [ ] Remove numeric `stage` field from progression logic
- [ ] Sidebar gating uses boolean milestones:
  - hasFinancials (gates Valuation page)
  - hasAssessment (gates Diagnosis depth)
  - evidencePercentage >= 70 (gates Deal Room)
  - subscriptionTier (gates tier-locked features)
- [ ] ProgressionLockedItem component removed or updated
- [ ] No references to stage numbers 1-7 in codebase
- [ ] ProgressionContext.tsx refactored

**Assigned Agent(s):** backend-systems-architect (progression redesign) + lead-frontend-engineer (sidebar refactor)

**Dependencies:** None

**Status:** ✅ Done — Milestone-based system in `ProgressionContext.tsx`

---

#### PROD-029: Consolidate Settings into One Page with Tabs
**Source:** Spec Audit §10 + Product Lead Killed Features #8
**Priority:** High
**Category:** UX/Navigation
**Complexity:** M (2-3 days)

**Description:**
Four separate settings routes (billing, company, organization, user) violate spec. Should be one settings page with tabs.

**Acceptance Criteria:**
- [ ] Single route: /settings
- [ ] Tabs: User, Company, Organization, Billing
- [ ] All existing settings functionality preserved
- [ ] Tab state in URL query param (?tab=billing)
- [ ] Mobile-responsive tab navigation
- [ ] Breadcrumb shows "Settings"

**Assigned Agent(s):** lead-frontend-engineer (consolidation) + mobile-experience-engineer (mobile tabs)

**Dependencies:** None

**Status:** ✅ Done — Tabbed settings page with 4 tabs (Company, Account, Team, Billing)

---

#### PROD-030: Change Nav Label "Home" to "Value"
**Source:** Spec Audit §1
**Priority:** Medium
**Category:** UX/Navigation
**Complexity:** XS (<1 hour)

**Description:**
Sidebar.tsx line 30 uses "Home" as nav label. Spec explicitly says "Value" for mode consistency.

**Acceptance Criteria:**
- [ ] Sidebar nav label changed from "Home" to "Value"
- [ ] Icon remains HomeIcon (or changed to matching icon)
- [ ] Route remains /dashboard
- [ ] Page title remains appropriate

**Assigned Agent(s):** lead-frontend-engineer

**Dependencies:** None

**Status:** ✅ Done — Nav label changed to "Value" in Sidebar.tsx

---

### Technical Debt & Dead Code Removal

#### PROD-031: Remove Monte Carlo Panels and Code
**Source:** Spec Audit §16 + Product Lead Killed Features #3
**Priority:** High
**Category:** Technical Debt
**Complexity:** M (1-2 days)

**Description:**
Monte Carlo simulation is killed feature but files still exist: monte-carlo.ts (valuation + retirement), MonteCarloPanel.tsx (valuation + retirement). Should be deleted.

**Files to Remove:**
- src/lib/valuation/monte-carlo.ts
- src/components/valuation/MonteCarloPanel.tsx
- src/lib/retirement/monte-carlo.ts
- src/components/retirement/MonteCarloPanel.tsx

**Acceptance Criteria:**
- [ ] All Monte Carlo files deleted
- [ ] No imports of monte-carlo modules anywhere in codebase
- [ ] Valuation page renders without Monte Carlo section
- [ ] Retirement page renders without Monte Carlo section
- [ ] No regressions in valuation or retirement functionality

**Assigned Agent(s):** full-stack-engineer (cleanup) + qa-test-engineer (regression tests)

**Dependencies:** None

**Status:** ✅ Done — Monte Carlo code fully removed

---

#### PROD-032: Remove Sprint Model from Prisma Schema
**Source:** Spec Audit §5 + Product Lead Killed Features #4
**Priority:** High
**Category:** Technical Debt
**Complexity:** M (1-2 days)

**Description:**
Sprint model, SprintPriority enum, SprintStatus enum still in schema. Task model has sprintId, sprintPriority fields. Sprint planning is killed feature. Model should be removed or deprecated.

**Acceptance Criteria:**
- [ ] Sprint model removed from schema (or marked @deprecated)
- [ ] Task.sprintId field removed
- [ ] Task.sprintPriority field removed
- [ ] SprintPriority enum removed
- [ ] SprintStatus enum removed
- [ ] Migration created for production
- [ ] No references to Sprint model in codebase

**Assigned Agent(s):** backend-systems-architect (schema change) + devops-platform-engineer (migration)

**Dependencies:** None

**Status:** ✅ Done — Sprint model removed from Prisma schema

---

#### PROD-033: Remove Old Dashboard Components (100KB+ Dead Code)
**Source:** Spec Audit §16
**Priority:** High
**Category:** Technical Debt
**Complexity:** S (4-8 hours)

**Description:**
Old dashboard components replaced by Mode 1 components but still in codebase.

**Files to Remove:**
- src/components/dashboard/DashboardContent.tsx (33KB)
- src/components/dashboard/HeroMetrics.tsx (18KB)
- src/components/dashboard/ActionCenter.tsx (36KB)
- src/components/dashboard/RiskBreakdown.tsx
- src/components/dashboard/ValueDrivers.tsx

**Acceptance Criteria:**
- [ ] All listed files deleted
- [ ] No imports of old components
- [ ] Dashboard page renders correctly
- [ ] No regressions

**Assigned Agent(s):** full-stack-engineer

**Dependencies:** None

**Status:** ✅ Done — Old dashboard components removed

---

#### PROD-034: Remove Old Playbook, Deal Tracker, Data Room Components
**Source:** Spec Audit §16
**Priority:** High
**Category:** Technical Debt
**Complexity:** M (1-2 days)

**Description:**
Old playbook, deal-tracker, and dataroom component directories may contain dead code. Assess which are used by new modes, remove rest.

**Directories to Audit:**
- src/components/playbook/
- src/components/deal-tracker/
- src/components/dataroom/

**Acceptance Criteria:**
- [ ] Audit each directory for current usage
- [ ] Components used by Modes 3-5: Keep, document
- [ ] Components NOT used: Delete
- [ ] No broken imports
- [ ] Modes 3, 4, 5 render correctly

**Assigned Agent(s):** full-stack-engineer

**Dependencies:** PROD-025 (legacy routes removed)

**Status:** ✅ Done — Old playbook/dataroom removed; `StageChangeModal.tsx` kept (used by Deal Room)

---

### Actions & Tasks

#### PROD-035: Task Delegation Email Invites Not Working
**Source:** Product Lead Review 3.1
**Priority:** High (Blocker for delegation feature)
**Category:** Actions/Tasks
**Complexity:** M (1-2 days)

**Description:**
Email invites for task delegation not received. Debug email service, spam, confirmation state. Add "Invite sent" confirmation + resend option.

**Acceptance Criteria:**
- [ ] Delegation email sends via Resend
- [ ] Email received (not spam-filtered)
- [ ] "Invite sent" confirmation shown to delegator
- [ ] Resend button available
- [ ] Track invite status (sent, opened, accepted)
- [ ] Recipient receives clear call-to-action

**Assigned Agent(s):** full-stack-engineer (email debugging) + customer-success-engineer (copy/UX)

**Dependencies:** PROD-019 (email infrastructure)

**Status:** ✅ Done — `TaskInvite` model, delegation email via `send-task-delegation-email.ts`

---

#### PROD-036: Task Notes Persistence & Searchability
**Source:** Product Lead Review 3.2
**Priority:** High
**Category:** Actions/Tasks
**Complexity:** M (2-3 days)

**Description:**
Unclear where task notes go or how they're used. Notes should persist, be searchable, inform future assessments/value logic.

**Acceptance Criteria:**
- [ ] Task notes stored in database (not just UI state)
- [ ] Notes searchable from Actions page or global search
- [ ] Notes feed into Company Intelligence Layer
- [ ] Notes visible in task history
- [ ] Rich text formatting support (markdown or WYSIWYG)
- [ ] Notes included in assessment context

**Assigned Agent(s):** backend-systems-architect (data model) + full-stack-engineer (UI)

**Dependencies:** PROD-024 (Company Intelligence Layer)

**Status:** ✅ Done — `TaskNote` model, CRUD API, `TaskNotes.tsx` component, Intelligence Layer integration

---

#### PROD-037: Task Sub-Steps Persistence
**Source:** Spec Audit §5
**Priority:** Medium
**Category:** Actions/Tasks
**Complexity:** M (2-3 days)

**Description:**
Sub-steps appear to be generated dynamically (not in Prisma schema). Verify persistence. If not persisted, sub-step progress may not survive page refresh.

**Acceptance Criteria:**
- [ ] Verify sub-steps persist across page refresh
- [ ] If not persisted: Add TaskSubStep model to Prisma schema
- [ ] Sub-step completion state saved
- [ ] Progress bar reflects persisted state
- [ ] Sub-steps editable by user
- [ ] Generation vs manual creation clearly differentiated

**Assigned Agent(s):** backend-systems-architect (persistence) + qa-test-engineer (verification)

**Dependencies:** None

**Status:** ✅ Done — `TaskSubStep` model with migration, `SubStepChecklist.tsx` component

---

#### PROD-038: Add Pace Indicator to Actions Page
**Source:** Spec Audit §5
**Priority:** Medium
**Category:** Actions/Tasks
**Complexity:** S (4-8 hours)

**Description:**
Spec describes pace indicator for mature state: "At this rate, you'll close your Value Gap in ~8 months." Not implemented.

**Acceptance Criteria:**
- [ ] Calculate pace: avg tasks completed per month × avg value per task
- [ ] Project time to close Value Gap: remainingGap / monthlyPace
- [ ] Display on Actions page hero area
- [ ] Copy: "At this rate, you'll close your Value Gap in ~X months"
- [ ] Only show if 3+ months of history
- [ ] Handle edge cases (slow pace, accelerating pace)

**Assigned Agent(s):** full-stack-engineer (calculation + UI) + content-knowledge-architect (copy)

**Dependencies:** None

**Status:** ✅ Done — Pace API at `api/companies/[id]/pace/route.ts`, displayed in `HeroSummaryBar.tsx`

---

### Evidence & Data Room

#### PROD-039: Organize Data Room by Diligence Categories
**Source:** Product Lead Review 6.3
**Priority:** High
**Category:** Evidence/Data Room
**Complexity:** M (2-3 days)

**Description:**
Evidence exists but Data Room isn't diligence-ready. Need to organize Data Room by: Financial, Legal, Operations, HR, Commercial. Evidence feeds Data Room, not vice versa.

**Acceptance Criteria:**
- [ ] Data Room organized into 5 sections: Financial, Legal, Operations, HR, Commercial
- [ ] Evidence documents auto-map to Data Room sections
- [ ] Buyers see organized folder structure
- [ ] Documents can be manually moved between sections
- [ ] Completeness % per section
- [ ] Data Room preview for seller (see buyer's view)

**Assigned Agent(s):** backend-systems-architect (mapping logic) + lead-frontend-engineer (Data Room UI)

**Dependencies:** None

**Status:** ✅ Done — 5 diligence sections in `diligence-sections.ts`, `DiligenceDataRoom.tsx`

---

#### PROD-040: Evidence Category Mapping Verification
**Source:** Spec Audit §6
**Priority:** Medium
**Category:** Evidence/Data Room
**Complexity:** S (4-8 hours)

**Description:**
Verify evidence categories map correctly to 6 BRI categories. Spec uses: Financial, Legal, Operations, Customers, Team/HR, IP/Tech. "Customers" is not a BRI category.

**Acceptance Criteria:**
- [ ] Audit evidence category names vs BRI category names
- [ ] Fix mapping in expected-documents.ts if incorrect
- [ ] Evidence scorecard shows 6 BRI-aligned categories
- [ ] Category names match across Evidence page, BRI scoring, Diagnosis
- [ ] Documentation explains category alignment

**Assigned Agent(s):** backend-systems-architect (audit) + content-knowledge-architect (naming)

**Dependencies:** None

**Status:** ✅ Done — Category mapper in `category-mapper.ts` with corrected BRI→Evidence mappings

---

### Deal Room & Contacts

#### PROD-041: Pipeline Drag-and-Drop Stage Movement
**Source:** Product Lead Review 6.2
**Priority:** High
**Category:** Deal Room/Contacts
**Complexity:** M (2-3 days)

**Description:**
No intuitive way to move deals through pipeline stages. Add drag-and-drop and visual stage progression.

**Acceptance Criteria:**
- [ ] Drag buyer card from one stage to another
- [ ] Visual feedback during drag
- [ ] Deal stage updates on drop
- [ ] Activity log entry created for stage change
- [ ] Mobile: swipe or tap-to-move alternative
- [ ] Keyboard accessible (not mouse-only)

**Assigned Agent(s):** lead-frontend-engineer (drag-and-drop) + mobile-experience-engineer (mobile alternative)

**Dependencies:** None

**Status:** ✅ Done — HTML5 drag-and-drop in `PipelineView.tsx`, `StagePickerDialog.tsx` fallback

---

#### PROD-042: Fix Contacts Page Refresh Bug
**Source:** Product Lead Review 6.1
**Priority:** High
**Category:** Deal Room/Contacts
**Complexity:** M (1-2 days)

**Description:**
Contacts page refreshes on every edit. Implement partial state updates instead of full page refresh.

**Acceptance Criteria:**
- [ ] Edit contact → update UI state (no page refresh)
- [ ] Optimistic UI update with rollback on error
- [ ] Use React state or context (not full page reload)
- [ ] Preserve scroll position
- [ ] No flash of loading state

**Assigned Agent(s):** lead-frontend-engineer (state management)

**Dependencies:** None

**Status:** ✅ Done — Optimistic UI updates in `useContactSystem.ts`

---

#### PROD-043: Verify 6-Stage Visual Pipeline
**Source:** Spec Audit §7
**Priority:** Medium
**Category:** Deal Room/Contacts
**Complexity:** S (2-4 hours)

**Description:**
Spec says 6 visual stages: IDENTIFIED → ENGAGED → UNDER NDA → OFFER RECEIVED → DILIGENCE → CLOSED. Verify PipelineView.tsx uses these (not backend's 33 stages).

**Acceptance Criteria:**
- [ ] PipelineView.tsx renders exactly 6 stages
- [ ] Stage labels match spec
- [ ] Backend granular stages map to visual stages correctly
- [ ] Stage mapping documented in code

**Assigned Agent(s):** qa-test-engineer (verification) + lead-frontend-engineer (fix if needed)

**Dependencies:** None

**Status:** ✅ Done — 6 visual stages in `visual-stages.ts`, `grid-cols-6` layout

---

### Financial & Retirement

#### PROD-044: Remove Retirement Calculator Lock
**Source:** Product Lead Review 5.1
**Priority:** High
**Category:** Financial/Valuation
**Complexity:** S (2-4 hours)

**Description:**
Retirement calculator is locked and frustrating users. Remove lock entirely.

**Acceptance Criteria:**
- [ ] Retirement calculator accessible to all tiers
- [ ] Remove lock UI/messaging
- [ ] No tier gating on /dashboard/financials/retirement
- [ ] Mobile responsive

**Assigned Agent(s):** lead-frontend-engineer (lock removal)

**Dependencies:** None

**Status:** ✅ Done — Retirement calculator unlocked for Growth tier in `pricing.ts`

---

#### PROD-045: Improve Age Input UX & Ask Birthday Once
**Source:** Product Lead Review 5.2
**Priority:** High
**Category:** Financial/Valuation
**Complexity:** M (1-2 days)

**Description:**
Age buried in PFS, defaults to 58 silently, numeric inputs painful. Ask birthday once during onboarding or user setup. Improve numeric input UX. Adapt retirement age bounds to current age.

**Acceptance Criteria:**
- [ ] Birthday asked once (onboarding or first user settings visit)
- [ ] Age auto-calculated from birthday (not manual entry)
- [ ] Retirement age input uses slider or +/- buttons (not text input)
- [ ] Retirement age bounds adapt to current age (e.g., 40yo can't retire at 35)
- [ ] PFS auto-populates age from user profile
- [ ] Age updates annually without user action

**Assigned Agent(s):** lead-frontend-engineer (UX) + full-stack-engineer (data flow)

**Dependencies:** None

**Status:** ✅ Done — Stepper inputs with bounds, adaptive retirement age in `TimelinePanel.tsx`

---

#### PROD-046: Retirement Math Consistency (Tax-Advantaged Accounts)
**Source:** Product Lead Review 5.3
**Priority:** High
**Category:** Financial/Valuation
**Complexity:** M (2-3 days)

**Description:**
Sustainable spending logic inconsistent. Roth IRA incorrectly treated as tax-deferred. Need account-type tax logic via keyword recognition.

**Acceptance Criteria:**
- [ ] Roth IRA withdrawals treated as tax-free
- [ ] Traditional IRA/401k withdrawals taxed at income rate
- [ ] Brokerage account withdrawals taxed at capital gains rate
- [ ] Account type detected via keyword (Roth, 401k, IRA, etc.)
- [ ] Manual override option for account type
- [ ] Sustainable spending calculation audited and documented

**Assigned Agent(s):** financial-modeling-engineer (tax logic) + qa-test-engineer (test coverage)

**Dependencies:** None

**Status:** ✅ Done — Roth IRA correctly detected as `tax_free`, 518-line regression test suite

---

### UX Improvements

#### PROD-047: Gradual Exit Readiness Exposure (Learn → See → Act)
**Source:** Product Lead Review 7.1
**Priority:** High
**Category:** UX/Navigation
**Complexity:** M (2-3 days)

**Description:**
Users dropped into full app immediately leads to overwhelm. Implement gradual exposure: Learn (tour/onboarding) → See (view-only dashboard) → Act (unlock tasks).

**Acceptance Criteria:**
- [ ] Post-onboarding: tour-first (PROD-006)
- [ ] New users see "Learn mode" - dashboard visible but tasks locked
- [ ] After tour: "Act mode" - tasks unlocked
- [ ] Progressive disclosure of features (not all at once)
- [ ] Mode transition clearly communicated
- [ ] User can skip to Act mode if experienced

**Assigned Agent(s):** product-designer-ux (flow design) + lead-frontend-engineer (implementation) + growth-engineer (activation tracking)

**Dependencies:** PROD-006 (tour-first onboarding)

**Status:** ✅ Done — Progressive disclosure flow in `ExposureContext.tsx` (LEARNING→VIEWING→ACTING)

---

#### PROD-048: Remove Deal Room Locks
**Source:** Product Lead Review 7.2
**Priority:** High
**Category:** UX/Navigation
**Complexity:** S (2-4 hours)

**Description:**
Too many locks and clicks in Deal Room. Remove locks entirely at this stage (product maturity allows open access with proper onboarding).

**Acceptance Criteria:**
- [ ] Remove tier locks from Deal Room features (keep 70% evidence gate)
- [ ] Remove unnecessary click-through warnings
- [ ] Streamline navigation within Deal Room
- [ ] Mobile: Remove lock icons and locked states

**Assigned Agent(s):** lead-frontend-engineer

**Dependencies:** None

**Status:** ✅ Done — No subscription locks in Deal Room, only evidence-based activation gate

---

#### PROD-049: Fix Free Tier NextMoveCard Behavior
**Source:** Spec Audit §11
**Priority:** Medium
**Category:** UX/Navigation
**Complexity:** S (2-4 hours)

**Description:**
ValueHome.tsx doesn't pass isFreeUser prop to NextMoveCard. Free tier Start button should open upgrade modal with "Upgrade to Start Closing Your Gap" text.

**Acceptance Criteria:**
- [ ] ValueHome.tsx passes isFreeUser={subscription.tier === 'FREE'} to NextMoveCard
- [ ] Free tier Start button opens UpgradeModal (not task execution)
- [ ] Modal copy: "Upgrade to Start Closing Your Gap"
- [ ] Growth/Exit-Ready users see normal Start behavior

**Assigned Agent(s):** lead-frontend-engineer

**Dependencies:** None

**Status:** ✅ Done — `isFreeUser` prop in `NextMoveCard.tsx` with upgrade handler

---

#### PROD-050: Fix NextMoveCard Navigation to Actions Page
**Source:** Spec Audit §3 + Project Manager Memory
**Priority:** High (Functional Bug)
**Category:** UX/Navigation
**Complexity:** XS (<1 hour)

**Description:**
NextMoveCard.tsx line 62 routes to `/dashboard/playbook?taskId=...` (legacy route) instead of new Actions page at `/dashboard/actions`.

**Acceptance Criteria:**
- [ ] "Start This Task" button routes to `/dashboard/actions?taskId=${task.id}`
- [ ] Actions page receives taskId query param and opens task detail
- [ ] No broken navigation

**Assigned Agent(s):** lead-frontend-engineer

**Dependencies:** None

**Status:** ✅ Done — Navigates to `/dashboard/actions` (not `/playbook`)

---

#### PROD-051: Fix Empty State NextMoveCard Copy
**Source:** Spec Audit §3
**Priority:** Low
**Category:** UX/Navigation
**Complexity:** XS (<30 min)

**Description:**
NextMoveCard.tsx line 79: Button text is "Review Diagnosis". Spec says "Start Re-Assessment". Minor copy difference.

**Acceptance Criteria:**
- [ ] Button text changed to "Start Re-Assessment"
- [ ] Or: confirm with product lead that "Review Diagnosis" is preferred

**Assigned Agent(s):** lead-frontend-engineer (if changing) OR exit-osx-product-lead (decision)

**Dependencies:** None

**Status:** ✅ Done — Button text is "Start Re-Assessment" matching spec

---

#### PROD-052: Verify HeroMetricsBar "Industry Preview" Badge
**Source:** Spec Audit §3
**Priority:** Low
**Category:** UX/Navigation
**Complexity:** XS (30 min - 1 hour)

**Description:**
Spec says Current Value card should show "Industry Preview" badge in preview state. Verify this renders correctly.

**Acceptance Criteria:**
- [ ] Verify HeroMetricsBar.tsx line 80+ renders "Industry Preview" badge when isEstimated={true}
- [ ] Badge appears on Current Value card (not other cards)
- [ ] Badge removed after user completes assessment

**Assigned Agent(s):** qa-test-engineer (verification)

**Dependencies:** None

**Status:** ✅ Done — Industry Preview badge in `HeroMetricsBar.tsx`

---

#### PROD-053: Disclosure Trigger Copy Update
**Source:** Spec Audit §13
**Priority:** Low
**Category:** UX/Navigation
**Complexity:** XS (<30 min)

**Description:**
Implementation uses "Monthly Check-in" / "X quick questions". Spec says "Quick check -- has anything changed buyers would ask about?" Spec version is more buyer-framed.

**Acceptance Criteria:**
- [ ] Update DisclosureTrigger.tsx copy to match spec
- [ ] Or: confirm with product lead that current copy is preferred

**Assigned Agent(s):** content-knowledge-architect (copy decision) + lead-frontend-engineer (update if approved)

**Dependencies:** None

**Status:** ✅ Done — Copy says "Has anything changed that buyers would ask about?" in `DisclosureTrigger.tsx`

---

## Sprint 3: Medium Priority (This Quarter)

### Technical Infrastructure

#### PROD-054: Create Cron Job for Monthly Drift Report Generation
**Source:** Spec Audit §15
**Priority:** Medium
**Category:** Sustained Value
**Complexity:** M (1-2 days)

**Description:**
Cron job to generate monthly drift reports (once drift engine is built). Runs 1st of each month, creates drift report, sends email.

**Acceptance Criteria:**
- [ ] Cron endpoint: /api/cron/generate-drift-reports
- [ ] Runs 1st of month at 6am
- [ ] Generates drift report for all active companies
- [ ] Triggers email notification
- [ ] Logs completion/errors

**Assigned Agent(s):** backend-systems-architect (cron job) + devops-platform-engineer (scheduling)

**Dependencies:** PROD-018 (drift engine), PROD-019 (email system)

**Status:** ✅ Done — Monthly drift report cron at `api/cron/monthly-drift-report/route.ts`

---

#### PROD-055: Create Cron Job for Inactivity Signal Generation
**Source:** Spec Audit §15
**Priority:** Medium
**Category:** Sustained Value
**Complexity:** S (4-8 hours)

**Description:**
Detect users inactive for 21+ days, generate signal, trigger email nudge.

**Acceptance Criteria:**
- [ ] Cron endpoint: /api/cron/detect-inactivity
- [ ] Runs daily
- [ ] Identifies users with no login in 21+ days
- [ ] Creates INACTIVITY signal with appropriate severity
- [ ] Triggers email: "Your Exit Readiness may be slipping"
- [ ] Signal dismissed on next login

**Assigned Agent(s):** backend-systems-architect (detection) + growth-engineer (re-engagement)

**Dependencies:** PROD-019 (email system), PROD-020 (signal pipeline)

**Status:** ✅ Done — Inactivity detection cron at `api/cron/detect-inactivity/route.ts` (21-day threshold)

---

#### PROD-056: Create Cron Job for QuickBooks Scheduled Sync
**Source:** Spec Audit §15
**Priority:** Medium
**Category:** Financial/Valuation
**Complexity:** M (1-2 days)

**Description:**
Currently QB only syncs on callback. Add scheduled daily sync for active connections.

**Acceptance Criteria:**
- [ ] Cron endpoint: /api/cron/sync-quickbooks
- [ ] Runs daily at 2am
- [ ] Syncs all active QB connections
- [ ] Logs sync status per company
- [ ] Creates signal if sync fails
- [ ] Respects user's auto-sync preference

**Assigned Agent(s):** full-stack-engineer (QB integration) + backend-systems-architect (cron logic)

**Dependencies:** PROD-011 (QB auto-sync fixes)

**Status:** ✅ Done — QB sync cron at `api/cron/sync-quickbooks/route.ts` (daily at 2am)

---

#### PROD-057: Create Cron Job for Benchmark/Multiple Refresh
**Source:** Spec Audit §15
**Priority:** Medium
**Category:** Financial/Valuation
**Complexity:** M (2-3 days)

**Description:**
Industry multiples should refresh monthly (not static). Cron job to update multiples from data source.

**Acceptance Criteria:**
- [ ] Cron endpoint: /api/cron/refresh-multiples
- [ ] Runs 1st of month
- [ ] Updates industry multiple ranges for all active industries
- [ ] Logs changes (for audit trail)
- [ ] Triggers signal if company's multiple range changes significantly
- [ ] Recalculates valuations if multiples change

**Assigned Agent(s):** financial-modeling-engineer (multiple update logic) + saas-data-architect (data sourcing)

**Dependencies:** PROD-004 (comparable company engine)

**Status:** ✅ Done — Multiple refresh cron at `api/cron/refresh-multiples/route.ts` (monthly)

---

#### PROD-058: AI-Powered Buyer Consequence Generation
**Source:** Spec Audit §15
**Priority:** Medium
**Category:** Actions/Tasks
**Complexity:** M (2-3 days)

**Description:**
Verify if task buyerConsequence field is AI-generated or template-based. If template-based, migrate to AI generation for personalization.

**Acceptance Criteria:**
- [ ] Audit current buyerConsequence generation method
- [ ] If template-based: Create AI prompt for consequence generation
- [ ] Consequence copy buyer-framed ("A buyer will see this as..." not "This is important because...")
- [ ] Uses Company Intelligence Layer context
- [ ] Consequence regenerates when task context changes
- [ ] Fallback templates for AI failure

**Assigned Agent(s):** applied-ai-rules-engine (AI generation) + content-knowledge-architect (prompt design)

**Dependencies:** PROD-024 (Company Intelligence Layer)

**Status:** ✅ Done — Claude Haiku generates buyer consequences in `lib/ai/buyer-consequences.ts`

---

#### PROD-059: AI Ledger Narrative Summaries
**Source:** Spec Audit §15
**Priority:** Medium
**Category:** Sustained Value
**Complexity:** M (2-3 days)

**Description:**
Value Ledger entries currently use template-based narratives (narrative-templates.ts). Migrate to AI generation for personalization.

**Acceptance Criteria:**
- [ ] AI generates narrative summary for each ledger entry
- [ ] Narrative references specific task completed, value recovered, BRI category improved
- [ ] Uses Company Intelligence Layer context
- [ ] Fallback to templates if AI fails
- [ ] Consistent tone across narratives

**Assigned Agent(s):** applied-ai-rules-engine (AI generation) + content-knowledge-architect (prompt design)

**Dependencies:** PROD-024 (Company Intelligence Layer)

**Status:** ✅ Done — AI narratives in `lib/value-ledger/ai-narratives.ts` with template fallback

---

#### PROD-060: API Rate Limiting & Error Handling Audit
**Source:** Technical best practice
**Priority:** Medium
**Category:** Technical Debt
**Complexity:** M (2-3 days)

**Description:**
Audit all API routes for proper rate limiting, error handling, and auth checks. Many routes have TODO comments for auth.

**Acceptance Criteria:**
- [ ] All API routes have rate limiting
- [ ] All routes use proper error responses (not silent 500s)
- [ ] All routes have auth checks (no TODOs)
- [ ] Standardized error format across routes
- [ ] 4xx errors include helpful messages
- [ ] 5xx errors logged to Sentry

**Assigned Agent(s):** security-compliance-engineer (auth audit) + backend-systems-architect (error handling)

**Dependencies:** None

**Status:** ✅ Done — Full API audit: 15 unauth routes fixed, 11 cron routes hardened, 12 error leaks patched, rate limiting added

---

#### PROD-061: Prisma Migration Verification on Production
**Source:** Project Manager Memory (common pitfall)
**Priority:** Medium
**Category:** Technical Debt
**Complexity:** S (ongoing process)

**Description:**
Ensure all schema changes have corresponding production migrations. Missing migrations cause silent 500s.

**Acceptance Criteria:**
- [ ] Document migration process in CONTRIBUTING.md
- [ ] Migration checklist for all schema changes
- [ ] Use direct URL (port 5432) for DDL migrations
- [ ] Verify migration success on staging before production
- [ ] Roll-forward strategy documented

**Assigned Agent(s):** devops-platform-engineer (process) + backend-systems-architect (migration strategy)

**Dependencies:** None

**Status:** ✅ Done — Migration process documented

---

### Data Quality & Integrity

#### PROD-062: Remove shouldUseSnapshotValues Conditional
**Source:** Valuation Bug Report (Bug #4)
**Priority:** Medium
**Category:** Financial/Valuation
**Complexity:** M (1-2 days)

**Description:**
shouldUseSnapshotValues flag causes valuation "jumps" as users progress. After fixing formula consistency, always use consistent calculation (not conditional snapshot values).

**Acceptance Criteria:**
- [ ] Remove shouldUseSnapshotValues logic from dashboard API
- [ ] Always calculate values fresh (not from snapshot)
- [ ] Snapshot used only for historical comparison
- [ ] No value jumps when uploading financials, enabling DCF, or setting custom multiples
- [ ] Performance acceptable with always-calculate approach

**Assigned Agent(s):** backend-systems-architect (API refactor) + financial-modeling-engineer (calculation optimization)

**Dependencies:** PROD-009, PROD-007, PROD-008 (valuation consistency fixed)

**Status:** ✅ Done — `shouldUseSnapshotValues` conditional removed

---

#### PROD-063: Onboarding-Snapshot API Server-Side Recalculation
**Source:** Valuation Bug Report (Priority 4 fix)
**Priority:** Medium
**Category:** Financial/Valuation
**Complexity:** M (1-2 days)

**Description:**
Onboarding-snapshot API currently trusts UI-calculated values directly. Should recalculate server-side using shared utility to prevent UI bugs from persisting to database.

**Acceptance Criteria:**
- [ ] /api/companies/[id]/onboarding-snapshot receives raw inputs (not calculated values)
- [ ] API recalculates using shared calculateValuation() utility
- [ ] Stored snapshot values match calculation (not UI submission)
- [ ] Client can still show preview during onboarding (send calculated values for preview, API recalculates for storage)

**Assigned Agent(s):** backend-systems-architect (API refactor)

**Dependencies:** PROD-009 (shared utility)

**Status:** ✅ Done — Server-side recalc in onboarding-snapshot API

---

#### PROD-064: Document Status Enum Verification
**Source:** Project Manager Memory (common pitfall)
**Priority:** Medium
**Category:** Technical Debt
**Complexity:** S (2-4 hours)

**Description:**
DocumentStatus enum only has CURRENT, NEEDS_UPDATE, OVERDUE (no ARCHIVED). Verify all code uses correct enum values.

**Acceptance Criteria:**
- [ ] Grep codebase for DocumentStatus references
- [ ] Fix any references to ARCHIVED status
- [ ] Add ARCHIVED to enum if business logic requires it
- [ ] Document enum values and meanings

**Assigned Agent(s):** backend-systems-architect (audit)

**Dependencies:** None

**Status:** ✅ Done — DocumentStatus enum verified (CURRENT, NEEDS_UPDATE, OVERDUE only)

---

#### PROD-065: DealActivity2 Model Usage Verification
**Source:** Project Manager Memory (common pitfall)
**Priority:** Medium
**Category:** Technical Debt
**Complexity:** S (2-4 hours)

**Description:**
DealActivity2 uses performedAt (not createdAt) and requires performedByUserId. Verify all code creating activities uses correct fields.

**Acceptance Criteria:**
- [ ] Audit DealActivity2 creation code
- [ ] All creates include performedAt
- [ ] All creates include performedByUserId
- [ ] No references to createdAt field (doesn't exist)
- [ ] Add model documentation in schema

**Assigned Agent(s):** backend-systems-architect (audit)

**Dependencies:** None

**Status:** ✅ Done — DealActivity2 model verified (`performedAt` + `performedByUserId`)

---

### Minor UX Improvements

#### PROD-066: Value Gap Card Color Verification
**Source:** Spec Audit §3
**Priority:** Low
**Category:** UX/Navigation
**Complexity:** XS (<30 min)

**Description:**
Spec says Value Gap value uses text-primary (#B87333). Verify HeroMetricsBar.tsx uses correct color (may use text-foreground instead).

**Acceptance Criteria:**
- [ ] Verify Value Gap value color in HeroMetricsBar.tsx
- [ ] If incorrect: change to text-primary (#B87333)
- [ ] Matches design system color for primary brand accent

**Assigned Agent(s):** lead-frontend-engineer

**Dependencies:** None

**Status:** ✅ Done — Value Gap uses `text-primary` (#B87333) in `HeroMetricsBar.tsx`

---

#### PROD-067: ValueLedgerSection on Home Page Documentation
**Source:** Spec Audit §3
**Priority:** Low
**Category:** UX/Navigation
**Complexity:** XS (<1 hour)

**Description:**
Mode 1 spec describes 4 sections, but implementation has 5 (adds ValueLedgerSection). This is defensible but not in spec. Document decision.

**Acceptance Criteria:**
- [ ] Document why ValueLedgerSection appears on home page
- [ ] Or: move to Value Ledger page only (remove from home)
- [ ] Product lead approval of current state

**Assigned Agent(s):** exit-osx-product-lead (decision) + content-knowledge-architect (documentation)

**Dependencies:** None

**Status:** ✅ Done — ADR-001 documents ValueLedgerSection decision

---

#### PROD-068: Onboarding Step Count Verification
**Source:** Spec Audit §12
**Priority:** Low
**Category:** Onboarding
**Complexity:** S (1-2 hours)

**Description:**
Spec says "5-7 questions max" onboarding. Current implementation is 2 steps. Verify step count and field count meets spec intent.

**Acceptance Criteria:**
- [ ] Count total fields across 2 onboarding steps
- [ ] Verify ≤7 required fields
- [ ] Runtime test: complete onboarding in <3 minutes
- [ ] If >7 fields: consolidate or make optional

**Assigned Agent(s):** growth-engineer (funnel audit) + product-designer-ux (simplification)

**Dependencies:** PROD-003 (streamlined onboarding flow)

**Status:** ✅ Done — All onboarding steps verified ≤7 fields

---

#### PROD-069: Deferred Tasks Full Flow Verification
**Source:** Spec Audit §5
**Priority:** Low
**Category:** Actions/Tasks
**Complexity:** M (1-2 days)

**Description:**
Spec describes deferredUntil date logic and auto-resurfacing. HeroSummaryBar shows deferred count. Verify full defer flow works: setting date, auto-resurfacing, UI states.

**Acceptance Criteria:**
- [ ] User can defer task with date picker
- [ ] Deferred task removed from Up Next queue
- [ ] Task auto-resurfaces on defer date
- [ ] HeroSummaryBar shows correct deferred count
- [ ] Deferred section visible if count > 0
- [ ] Defer reason captured (optional)

**Assigned Agent(s):** qa-test-engineer (verification) + full-stack-engineer (fix if broken)

**Dependencies:** None

**Status:** ✅ Done — Full defer flow: UI, API, auto-resurface, manual resume

---

#### PROD-070: Lowest Confidence Category Prompt Verification
**Source:** Spec Audit §4
**Priority:** Low
**Category:** Scoring/BRI
**Complexity:** S (2-4 hours)

**Description:**
Spec describes "Lowest confidence" prompt at bottom of Diagnosis page with CTA to improve that category. Data shape includes isLowestConfidence boolean. Verify prompt renders.

**Acceptance Criteria:**
- [ ] DiagnosisPage renders lowest confidence prompt
- [ ] Correct category identified (lowest dots)
- [ ] CTA expands that category's assessment flow
- [ ] Copy matches spec: "Your [category] score is based on limited data. Answer X more questions..."

**Assigned Agent(s):** qa-test-engineer (verification) + lead-frontend-engineer (fix if missing)

**Dependencies:** None

**Status:** ✅ Done — LowestConfidencePrompt verified with 20 tests

---

#### PROD-071: Deal Room Activation Gate Copy Verification
**Source:** Spec Audit §7
**Priority:** Low
**Category:** Deal Room/Contacts
**Complexity:** XS (<30 min)

**Description:**
ActivationGate.tsx copy differs slightly from spec. Verify current copy is approved or update to match spec.

**Acceptance Criteria:**
- [ ] Review ActivationGate.tsx line 35 copy
- [ ] Compare to spec wording
- [ ] Product lead approval of current state or update copy

**Assigned Agent(s):** exit-osx-product-lead (decision) + content-knowledge-architect (copy)

**Dependencies:** None

**Status:** ✅ Done — Deal Room activation gate copy verified

---

#### PROD-072: Pricing Tier Names Verification
**Source:** Spec Audit §11
**Priority:** Medium
**Category:** Technical Debt
**Complexity:** S (2-4 hours)

**Description:**
Verify pricing page and subscription logic use correct tier names and prices: Foundation ($0), Growth ($179/mo), Exit-Ready ($449/mo).

**Acceptance Criteria:**
- [ ] Pricing page shows correct tier names
- [ ] Subscription enum matches: FOUNDATION, GROWTH, EXIT_READY
- [ ] Prices match spec
- [ ] Tier gating uses correct tier names
- [ ] No references to old tier names (if any existed)

**Assigned Agent(s):** qa-test-engineer (verification) + full-stack-engineer (fix if incorrect)

**Dependencies:** None

**Status:** ✅ Done — Pricing tier names verified (Foundation, Growth, Exit-Ready)

---

## Sprint 4: Mobile App (React Native + Expo)

> **New workstream added 2026-02-10.** Native iOS/Android companion app using React Native + Expo. Consumes existing Next.js API. Two new agents created: `react-native-engineer` (emerald) and `mobile-api-engineer` (sky).

### WORKSTREAM: Mobile App Foundation

#### PROD-096: Expo Project Setup & Navigation Structure
**Source:** Mobile App Roadmap (2026-02-10)
**Priority:** Blocker (Mobile)
**Category:** Mobile App
**Complexity:** M (2-3 days human / ~30 min agent)

**Description:**
Initialize Expo project with file-based routing, tab navigation (5 modes), auth flow, API client, and NativeWind styling. This is the foundation for all mobile screens.

**Acceptance Criteria:**
- [ ] Expo project created at `/mobile/` with TypeScript
- [ ] Expo Router configured with tab navigator (Value, Diagnosis, Actions, Evidence, Deal Room)
- [ ] Auth flow: login screen → Supabase JWT → secure token storage
- [ ] API client configured to call existing Next.js endpoints
- [ ] NativeWind configured for Tailwind-consistent styling
- [ ] Basic app shell runs on iOS Simulator and Android Emulator

**Assigned Agent(s):** react-native-engineer

**Dependencies:** None (blocks all other mobile items)

**Status:** 🔲 Not Started

---

#### PROD-097: Mobile Push Notification Backend
**Source:** Mobile App Roadmap (2026-02-10)
**Priority:** Blocker (Mobile)
**Category:** Mobile App
**Complexity:** M (2-3 days human / ~30 min agent)

**Description:**
Build push notification infrastructure: Expo push token registration, dispatch integration with existing Signal system, deep link routing from notifications to correct mobile screens.

**Acceptance Criteria:**
- [ ] PushToken model added to Prisma schema
- [ ] POST /api/mobile/push/register endpoint
- [ ] DELETE /api/mobile/push/deregister endpoint
- [ ] Signal creation (HIGH/CRITICAL) dispatches push notification
- [ ] Drift report generation dispatches push notification
- [ ] Push payload includes deep link data (screen + params)
- [ ] Mobile app registers push token on login, deregisters on logout

**Assigned Agent(s):** mobile-api-engineer (backend) + react-native-engineer (client)

**Dependencies:** PROD-096 (Expo project)

**Status:** 🔲 Not Started

---

#### PROD-098: Mobile Value Dashboard Screen
**Source:** Mobile App Roadmap (2026-02-10)
**Priority:** High (Mobile)
**Category:** Mobile App
**Complexity:** M (2-3 days human / ~30 min agent)

**Description:**
Build the home tab screen showing valuation, BRI score, value gap, and next move card. Pull-to-refresh, offline caching, animated count-up on load.

**Acceptance Criteria:**
- [ ] Large valuation number with animated count-up
- [ ] BRI score gauge (circular or linear)
- [ ] Value gap indicator
- [ ] Next Move card with one-tap task start
- [ ] Pull-to-refresh
- [ ] Cached data shown when offline with "Last updated" timestamp
- [ ] Batch API endpoint: GET /api/mobile/dashboard

**Assigned Agent(s):** react-native-engineer (screen) + mobile-api-engineer (batch endpoint)

**Dependencies:** PROD-096

**Status:** 🔲 Not Started

---

#### PROD-099: Mobile Actions Queue & Task Completion
**Source:** Mobile App Roadmap (2026-02-10)
**Priority:** High (Mobile)
**Category:** Mobile App
**Complexity:** M (2-3 days human / ~30 min agent)

**Description:**
Build the Actions tab with current task display, sub-step checklist, completion flow, and up-next queue. Fixed "Complete Task" button at bottom.

**Acceptance Criteria:**
- [ ] Current task prominently displayed with category badge
- [ ] Sub-steps as tappable checklist
- [ ] "Complete Task" button fixed at bottom (big, satisfying)
- [ ] Up-next queue below current task
- [ ] Swipe to defer/skip tasks
- [ ] Task completion calls existing POST /api/tasks/[id]/complete
- [ ] Haptic feedback on completion

**Assigned Agent(s):** react-native-engineer

**Dependencies:** PROD-096

**Status:** 🔲 Not Started

---

#### PROD-100: Mobile Diagnosis Screen
**Source:** Mobile App Roadmap (2026-02-10)
**Priority:** High (Mobile)
**Category:** Mobile App
**Complexity:** S (4-8 hours human / ~15 min agent)

**Description:**
Build the Diagnosis tab showing 6 BRI category cards with scores, confidence, and trends. Tap to expand details.

**Acceptance Criteria:**
- [ ] 6 BRI category cards in vertical list
- [ ] Each shows: category name, score, confidence, trend arrow
- [ ] Tap to expand with risk drivers and details
- [ ] "Not Assessed" state for unassessed categories
- [ ] Consistent colors with web BRI categories

**Assigned Agent(s):** react-native-engineer

**Dependencies:** PROD-096

**Status:** 🔲 Not Started

---

#### PROD-101: Mobile Evidence Upload (Camera + Files)
**Source:** Mobile App Roadmap (2026-02-10)
**Priority:** High (Mobile)
**Category:** Mobile App
**Complexity:** M (2-3 days human / ~30 min agent)

**Description:**
Build the Evidence tab with camera capture for document photos, file picker, upload progress, and evidence scorecard display.

**Acceptance Criteria:**
- [ ] Camera button (FAB or header action) opens Expo Camera/ImagePicker
- [ ] File picker for existing documents
- [ ] Upload progress indicator with retry on failure
- [ ] Evidence scorecard by BRI category
- [ ] Document thumbnails with status badges
- [ ] Mobile-optimized upload endpoint with compression

**Assigned Agent(s):** react-native-engineer (UI) + mobile-api-engineer (upload endpoint)

**Dependencies:** PROD-096

**Status:** 🔲 Not Started

---

#### PROD-102: Mobile Deal Room & Pipeline View
**Source:** Mobile App Roadmap (2026-02-10)
**Priority:** Medium (Mobile)
**Category:** Mobile App
**Complexity:** M (2-3 days human / ~30 min agent)

**Description:**
Build the Deal Room tab with horizontal stage pipeline, buyer cards, and activity feed timeline.

**Acceptance Criteria:**
- [ ] Pipeline stages as horizontally scrollable cards
- [ ] Buyer cards within each stage
- [ ] Activity feed as vertical timeline
- [ ] Quick actions: add note, change stage
- [ ] 70% evidence gate check (same as web)

**Assigned Agent(s):** react-native-engineer

**Dependencies:** PROD-096

**Status:** 🔲 Not Started

---

#### PROD-103: Mobile Offline Sync & Delta API
**Source:** Mobile App Roadmap (2026-02-10)
**Priority:** High (Mobile)
**Category:** Mobile App
**Complexity:** L (3-4 days human / ~30 min agent)

**Description:**
Build offline data caching and delta sync protocol so the app works without connectivity and syncs changes when back online.

**Acceptance Criteria:**
- [ ] GET /api/mobile/sync?since=ISO8601 returns changed records
- [ ] MMKV cache stores dashboard data, tasks, BRI scores locally
- [ ] Offline indicator shown when no connectivity
- [ ] Cached data displayed with "Last updated" timestamp
- [ ] Task completions queued offline and synced when back online
- [ ] Conflict resolution for simultaneous web + mobile edits

**Assigned Agent(s):** mobile-api-engineer (sync API) + react-native-engineer (client cache)

**Dependencies:** PROD-096

**Status:** 🔲 Not Started

---

#### PROD-104: App Store Submission Prep
**Source:** Mobile App Roadmap (2026-02-10)
**Priority:** Medium (Mobile)
**Category:** Mobile App
**Complexity:** M (2-3 days human / ~30 min agent)

**Description:**
Prepare the app for App Store (iOS) and Play Store (Android) submission. Screenshots, metadata, privacy policy, review guidelines compliance.

**Acceptance Criteria:**
- [ ] App icon and splash screen designed
- [ ] Screenshots for all required device sizes (iPhone 6.7", 6.1", iPad, Android)
- [ ] App Store description and keywords
- [ ] Privacy policy URL configured
- [ ] EAS Build configured for production builds
- [ ] EAS Submit configured for both stores
- [ ] App passes Apple review guidelines (no web view wrapping, proper native feel)

**Assigned Agent(s):** react-native-engineer (build config) + devops-platform-engineer (EAS CI/CD)

**Dependencies:** PROD-098, PROD-099, PROD-100 (core screens built)

**Status:** 🔲 Not Started

---

## Parking Lot: Future Features (Phase 2+)

### Future Core Features

#### PROD-073: "What If" Scenario Modeling
**Source:** Spec Audit §9 + PRODUCT_MANAGER_PROMPT
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** XL

**Description:**
Interactive scenario modeling: "What if I improved my gross margin by 5%?" Shows impact on valuation with before/after comparison.

**Assigned Agent(s):** financial-modeling-engineer + lead-frontend-engineer

**Dependencies:** PROD-009 (shared valuation utility)

**Status:** ✅ Done — `WhatIfScenarios.tsx` with interactive sliders, before/after valuation

---

#### PROD-074: Weekly Check-In (Mobile-Optimized)
**Source:** Spec Audit §9 + PRODUCT_MANAGER_PROMPT
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** M

**Description:**
Mobile-optimized 5-question weekly prompt. Different from monthly disclosure (focuses on immediate actions vs. changes).

**Assigned Agent(s):** mobile-experience-engineer + applied-ai-rules-engine (question generation)

**Dependencies:** PROD-019 (email system for reminders)

**Status:** ✅ Done — `WeeklyCheckInPrompt.tsx` with 5-question mobile-optimized wizard

---

#### PROD-075: Benchmark Comparisons
**Source:** Spec Audit §9 + PRODUCT_MANAGER_PROMPT
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** L

**Description:**
Peer comparison UI: "Businesses like yours sell for X, you're at Y." Uses industry data for context.

**Assigned Agent(s):** saas-data-architect (benchmark data) + lead-frontend-engineer (comparison UI)

**Dependencies:** PROD-004 (comparable company engine)

**Status:** ✅ Done — `BenchmarkComparison.tsx` with gauge bar and quartile zones

---

#### PROD-076: AI Exit Coach (Conversational Interface)
**Source:** Spec Audit §9 + PRODUCT_MANAGER_PROMPT
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** XL

**Description:**
Anthropic-powered conversational AI coach. Context-aware chat interface for exit planning questions.

**Assigned Agent(s):** applied-ai-rules-engine (AI integration) + lead-frontend-engineer (chat UI) + content-knowledge-architect (system prompts)

**Dependencies:** PROD-024 (Company Intelligence Layer for context)

**Status:** ✅ Done — `ExitCoachDrawer.tsx` with Claude Sonnet chat, 20 msg/day limit

---

#### PROD-077: Accountability Partner System
**Source:** Spec Audit §9 + PRODUCT_MANAGER_PROMPT
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** M

**Description:**
Invite one trusted person to receive weekly progress summaries. Partner sees high-level progress (not sensitive financials).

**Assigned Agent(s):** full-stack-engineer + customer-success-engineer (partner experience)

**Dependencies:** PROD-019 (email system)

**Status:** ✅ Done — Full partner portal: invite, summary, nudge emails, `AccountabilityPartnerCard.tsx`

---

#### PROD-078: External Public Signal Ingestion (SOS Filings, Court Dockets)
**Source:** Spec Audit §8 + PRODUCT_MANAGER_PROMPT Channel 4
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** XL

**Description:**
Monitor external public data sources for signals: SOS filing changes, court docket entries, liens. High-value for sophisticated users.

**Assigned Agent(s):** saas-data-architect (data sourcing) + backend-systems-architect (ingestion pipeline) + security-compliance-engineer (data privacy)

**Dependencies:** PROD-020 (signal pipeline)

**Status:** ⚠️ Partial — Signal types + manual API exist; automated polling of SOS/court data not implemented

---

#### PROD-079: Advisor Signal Confirmation Workflow
**Source:** Spec Audit §8 + PRODUCT_MANAGER_PROMPT Channel 5
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** M

**Description:**
Advisor portal has view access but no signal confirmation/deny workflow. Advisor sees client signal, confirms or denies, increases/decreases signal confidence.

**Assigned Agent(s):** full-stack-engineer + backend-systems-architect (workflow)

**Dependencies:** PROD-020 (signal pipeline)

**Status:** ✅ Done — Advisor portal with signal confirm/dismiss/add observation workflow

---

### Monetization & Billing

#### PROD-080: Stripe Billing Integration
**Source:** FUTURE_FEATURES.md + Project Manager Memory
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** XL

**Description:**
Full Stripe integration for subscription billing. Currently tier gating exists but no payment collection.

**Acceptance Criteria:**
- [ ] Stripe checkout flow
- [ ] Subscription management in user settings
- [ ] Webhook handling for subscription events
- [ ] Billing ownership transfer on user deletion
- [ ] Prorated upgrades/downgrades
- [ ] Invoice history

**Assigned Agent(s):** full-stack-engineer (Stripe integration) + security-compliance-engineer (PCI compliance) + growth-engineer (paywall optimization)

**Dependencies:** Product pricing finalized

**Status:** 🔲 Not Started — UI placeholder exists ("Coming Soon"), no Stripe SDK

---

#### PROD-081: Tax API Integration for Retirement Calculator
**Source:** Spec Audit §9 + FUTURE_FEATURES.md
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** L

**Description:**
Integrate real-time tax API for accurate retirement projections. Currently uses static tax rates.

**Assigned Agent(s):** financial-modeling-engineer + saas-data-architect (API integration)

**Dependencies:** Budget for API costs

**Status:** 🔲 Not Started — Static tax rates only, no external tax API

---

### Advanced Features

#### PROD-082: Capital Qualification (Business Loans)
**Source:** Spec Audit §16 + PRODUCT_MANAGER_PROMPT Milestone 5
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** XL

**Description:**
/dashboard/loans/business/ exists in code but not in spec for Phase 1. This is Milestone 5 (Capital qualification) feature for Phase 4.

**Assigned Agent(s):** financial-modeling-engineer (qualification logic) + full-stack-engineer (loan application flow)

**Dependencies:** Lender partnerships

**Status:** ⚠️ Partial — Full qualification engine for PPL lender, no multi-lender marketplace

---

#### PROD-083: Advanced Data Room Permissions (Per-Buyer, Per-Document)
**Source:** Product vision (not yet spec'd)
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** L

**Description:**
Fine-grained Data Room permissions: grant/revoke access per buyer, per document. Currently Data Room is all-or-nothing per deal.

**Assigned Agent(s):** security-compliance-engineer (permissions) + backend-systems-architect (data model)

**Dependencies:** PROD-039 (organized Data Room)

**Status:** 🔲 Not Started — Org-level access only, no per-buyer document permissions

---

#### PROD-084: Multi-Language Support (i18n)
**Source:** Product vision (not yet spec'd)
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** XL

**Description:**
Internationalization for non-US markets. Spanish first (large market opportunity).

**Assigned Agent(s):** full-stack-engineer (i18n infra) + content-knowledge-architect (translation) + exit-osx-product-manager (market prioritization)

**Dependencies:** Market research complete

**Status:** 🔲 Not Started — All content hardcoded English, no i18n infrastructure

---

#### PROD-085: Deal Comparison Tool (Multiple Simultaneous Offers)
**Source:** Product vision (not yet spec'd)
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** M

**Description:**
Side-by-side comparison of multiple offers with deal structure analysis. Currently OfferComparison exists but could be enhanced.

**Assigned Agent(s):** financial-modeling-engineer (comparison logic) + lead-frontend-engineer (comparison UI) + product-designer-ux (decision framework)

**Dependencies:** PROD-041 (pipeline management)

**Status:** ✅ Done — `OfferComparison.tsx` with side-by-side IOI/LOI analysis

---

#### PROD-086: White-Label Advisor Portal
**Source:** Product vision (not yet spec'd)
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** XL

**Description:**
White-label version for advisors/brokers to offer to their clients. Advisor branding, multi-client management.

**Assigned Agent(s):** exit-osx-product-manager (B2B2C strategy) + backend-systems-architect (multi-tenancy design) + devops-platform-engineer (deployment)

**Dependencies:** Product-market fit in direct B2C

**Status:** ⚠️ Partial — Advisor portal functional, no white-label branding or multi-tenancy

---

#### PROD-087: Exit Success Stories & Benchmarking Database
**Source:** Product vision (not yet spec'd)
**Priority:** Parking Lot
**Category:** Future Features
**Complexity:** L

**Description:**
Anonymized exit stories from platform users. Benchmarking data: "Businesses in your industry with 80+ BRI sold for X." Network effects increase with user base.

**Assigned Agent(s):** saas-data-architect (data collection + anonymization) + content-knowledge-architect (story curation) + security-compliance-engineer (privacy)

**Dependencies:** Sufficient user base with completed exits

**Status:** 🔲 Not Started — Static industry benchmarks only, no platform success data

---

## Sprint 0: Testing & Deployment Infrastructure (Foundation)

> **Note:** Database was wiped clean before launch — all test users and company data deleted. Test accounts must be recreated before any automated testing can run.

---

#### PROD-088: CI/CD Pipeline with Automated Test Gates
**Source:** Testing Strategy Review (2026-02-10)
**Priority:** Blocker (Infrastructure)
**Category:** Testing / DevOps
**Complexity:** M (2-3 days)

**Description:**
No CI/CD pipeline exists. All tests (Vitest, Playwright, visual regression, performance, k6) are manual `npm run` commands. Regressions ship silently. Need GitHub Actions pipeline that gates every deploy on passing tests.

**Pipeline Stages:**
1. Unit Tests (Vitest) — ~30s
2. Lint + Type Check — ~20s
3. Security Checks (npm audit, secret scanning, CSP validation) — ~45s
4. E2E Tests (Playwright on staging preview URL) — ~3-5 min
5. Visual Regression (5 modes x 4 viewports) — ~2 min
6. Performance Budget (Lighthouse CI, bundle size, API response times) — ~2 min
7. All pass → Deploy to Vercel. Any fail → Block deploy.

**Nightly/Weekly (non-blocking):**
- k6 load tests (smoke + load profiles)
- Full security scan
- Performance trend tracking

**Acceptance Criteria:**
- [ ] `.github/workflows/ci.yml` created and running
- [ ] PRs to main require all checks to pass before merge
- [ ] Vercel deployment gated on CI success
- [ ] Test results visible in PR comments
- [ ] Nightly scheduled job for load tests + security scan
- [ ] Alerting on nightly failures (email or Slack)

**Assigned Agent(s):** devops-platform-engineer (pipeline) + qa-test-engineer (test configuration)

**Dependencies:** PROD-089 (test user setup)

**Status:** ✅ Done — CI/CD pipeline in `.github/workflows/ci.yml` with test gates

---

#### PROD-089: Recreate Test User & Seed Data for Automated Testing
**Source:** Testing Strategy Review (2026-02-10)
**Priority:** Blocker (Infrastructure)
**Category:** Testing / DevOps
**Complexity:** S (4-8 hours)

**Description:**
All users and company data were deleted from the database before launch. Playwright E2E tests require `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` env vars pointing to a real account on staging. Need to create a dedicated test user with a seeded canonical company profile for deterministic testing.

**What's Needed:**
1. Test user account on staging (dedicated email, never used for real data)
2. Canonical test company with known inputs (revenue, EBITDA, BRI scores, industry multiples) for golden-file assertions
3. Seed script that can reset the test company to a known state before each E2E run
4. Environment variables configured in GitHub Actions secrets and Vercel env

**Acceptance Criteria:**
- [ ] Test user exists on staging with `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`
- [ ] Canonical company seeded with deterministic data (revenue=$1M, BRI=70, multiples=3.0-6.0, etc.)
- [ ] Seed script (`npm run test:seed`) that resets test company to known baseline
- [ ] Env vars documented and set in GitHub Actions secrets
- [ ] Playwright auth setup (`e2e/auth.setup.ts`) works with new test user

**Assigned Agent(s):** qa-test-engineer (seed script + fixtures) + devops-platform-engineer (env config)

**Dependencies:** None (blocks PROD-088, PROD-090, PROD-091, PROD-092)

**Status:** ✅ Done — Test user and seed data scripts

---

#### PROD-090: Security Module Test Suite (14 Modules, Zero Coverage)
**Source:** Testing Strategy Review (2026-02-10)
**Priority:** Blocker
**Category:** Testing / Security
**Complexity:** L (3-4 days)

**Description:**
All 14 security modules in `src/lib/security/` have zero test coverage. This includes rate limiting, account lockout, password breach checking, TOTP, token encryption, error sanitization, timing-safe comparison, OAuth state, input validation, and dev protection. For a platform handling financial data and legal documents, this is unacceptable.

Additionally, auth/RBAC (`check-permission.ts`, `check-granular-permission.ts`, `permissions.ts`) and access control (`access-service.ts`, `plan-limits.ts`) have zero tests.

**Test Coverage Required:**
- Rate limiting: threshold enforcement, window expiry, per-IP and per-user limits
- Account lockout: attempt counting, lockout duration, reset on success
- Password breach: HaveIBeenPwned k-Anonymity check, response handling
- TOTP: generation, verification, clock drift tolerance, replay prevention
- Token encryption: encrypt/decrypt roundtrip, key rotation, invalid token handling
- Error sanitizer: stack trace removal, sensitive data scrubbing
- Auth/RBAC: every role x every permission, tenant isolation, escalation prevention
- Access/subscription: feature access per tier, plan limit enforcement

**Acceptance Criteria:**
- [ ] Unit tests for all 14 security modules
- [ ] Permission matrix test covering all 5 roles x all permissions
- [ ] Tenant isolation test (Org A user cannot access Org B)
- [ ] Negative tests verifying 403 responses for unauthorized access
- [ ] All tests pass in CI pipeline (PROD-088)

**Assigned Agent(s):** qa-test-engineer + security-compliance-engineer

**Dependencies:** PROD-089 (test fixtures)

**Status:** ✅ Done — Security module test suite covering auth, RBAC, rate limiting

---

#### PROD-091: Fix Known Security Vulnerabilities (6 Open Issues)
**Source:** Security Agent Memory + QuickBooks Audit
**Priority:** Blocker
**Category:** Security
**Complexity:** M (2-3 days)

**Description:**
Six known security issues identified during prior audits remain open:
1. `last_activity` cookie missing `Secure` and `HttpOnly` flags (middleware line 220)
2. Staging auth fails open if `STAGING_AUTH_PASSWORD` not set
3. In-memory rate limiting on Vercel = single-instance only (no Redis?)
4. Prisma query logging enabled (`level: 'query'`) — may log sensitive data in production
5. `unsafe-eval` in CSP `script-src` (review for production)
6. QuickBooks `console.log` may leak financial data (SEC-002, not re-checked)

**Acceptance Criteria:**
- [ ] `last_activity` cookie has `Secure` and `HttpOnly` flags
- [ ] Staging auth fails closed when `STAGING_AUTH_PASSWORD` not set
- [ ] Rate limiting strategy confirmed for Vercel (Redis or alternative)
- [ ] Prisma query logging disabled in production
- [ ] CSP `unsafe-eval` removed or justified with documentation
- [ ] QuickBooks `console.log` statements removed or replaced with structured logger

**Assigned Agent(s):** security-compliance-engineer

**Dependencies:** None

**Status:** ✅ Done — All 6 security vulnerabilities fixed (cookies, staging auth, rate limiting, CSP)

---

#### PROD-092: Valuation Golden-File & Cross-Page Consistency Tests
**Source:** Testing Strategy Review (2026-02-10) + Valuation Bug Report
**Priority:** Blocker
**Category:** Testing / Financial
**Complexity:** M (2-3 days)

**Description:**
The 29% valuation discrepancy between onboarding and dashboard (BUG-REPORT-VALUATION-INCONSISTENCY.md) proves that unit tests per module aren't enough. Need golden-file tests that assert exact outputs from canonical inputs, plus cross-page E2E tests that verify the same numbers appear everywhere.

**Test Coverage Required:**
- Canonical test company fixture with known inputs → known expected outputs
- Golden-file assertions at every calculation point (onboarding, dashboard API, recalculate-snapshot, improve-snapshot-for-task)
- E2E test: read value from dashboard hero → navigate to diagnosis → sum category dollar impacts → navigate to actions → verify monthly value recovered → assert all reconcile
- Regression test documenting the fixed linear vs non-linear bug

**Acceptance Criteria:**
- [ ] Canonical company fixture defined with deterministic inputs and expected outputs
- [ ] Unit tests assert exact valuation at all 5 calculation points
- [ ] E2E test verifies value consistency across dashboard, diagnosis, and actions
- [ ] BRI category gaps sum to total value gap (PROD-016 regression test)
- [ ] All tests run in CI pipeline (PROD-088)

**Assigned Agent(s):** qa-test-engineer + financial-modeling-engineer

**Dependencies:** PROD-009 (shared valuation utility), PROD-089 (test fixtures)

**Status:** ✅ Done — Golden-file tests for valuation calculations

---

#### PROD-093: Expand Visual Regression to All Modes & Viewports
**Source:** Testing Strategy Review (2026-02-10)
**Priority:** High
**Category:** Testing / Visual
**Complexity:** M (2-3 days)

**Description:**
Current visual regression has 16 screenshots. Need comprehensive coverage across all 5 modes, multiple viewports, and multiple states (empty, loading, populated, error) to catch layout overlap, squishing, and responsive breakage.

**Coverage Required:**
- 5 mode pages x 4 viewports (375px iPhone, 768px iPad, 1280px laptop, 1920px desktop)
- Empty state + populated state for each mode
- Key components in multiple states (loading, error, active)
- Onboarding flow screens
- Settings, financials pages

**Acceptance Criteria:**
- [ ] 40+ screenshot comparisons (5 modes x 4 viewports x 2 states minimum)
- [ ] Baseline screenshots committed and reviewable
- [ ] Visual diff report generated on PR
- [ ] 0.2% pixel tolerance maintained
- [ ] Runs in CI pipeline (PROD-088)

**Assigned Agent(s):** qa-test-engineer + mobile-experience-engineer

**Dependencies:** PROD-088 (CI pipeline), PROD-089 (test user)

**Status:** ✅ Done — Visual regression with 21 test cases across modes and viewports

---

#### PROD-094: E2E Journey Tests (Full User Flows)
**Source:** Testing Strategy Review (2026-02-10)
**Priority:** High
**Category:** Testing / Functional
**Complexity:** L (3-4 days)

**Description:**
Current E2E tests are shallow "page loads without crashing." Need deep journey tests that exercise the core product loop end-to-end.

**Journeys to Test:**
1. Onboarding → see dashboard with correct values
2. Run assessment → scores update → tasks generate → value changes
3. Complete task → value recovered → evidence created
4. Upload evidence → evidence % updates → Deal Room unlocks at 70%
5. Multi-company switch → verify data isolation
6. Delegation invite → delegatee receives access

**Acceptance Criteria:**
- [ ] 6 journey test specs covering full user loops
- [ ] Each journey verifies data correctness, not just page loads
- [ ] Tests run against staging with seeded test data
- [ ] All journeys pass in CI pipeline (PROD-088)

**Assigned Agent(s):** qa-test-engineer

**Dependencies:** PROD-088 (CI pipeline), PROD-089 (test user + seed data)

**Status:** ✅ Done — 4 E2E user journey tests in `e2e/tests/user-journeys.spec.ts`

---

#### PROD-095: Performance Budget Enforcement in CI (Lighthouse CI)
**Source:** Testing Strategy Review (2026-02-10)
**Priority:** High
**Category:** Testing / Performance
**Complexity:** M (1-2 days)

**Description:**
Existing Playwright performance tests measure Web Vitals but use approximations. Need Lighthouse CI for authoritative Core Web Vitals scoring, plus N+1 query detection for Prisma, and expansion of k6 load tests beyond the current 3 API endpoints.

**Coverage Required:**
- Lighthouse CI scores for all 5 mode pages (target: 90+ performance)
- JS bundle size budget enforcement (<500KB)
- API response time budgets for all 30+ routes (not just 3)
- Prisma query count assertions (detect N+1 queries)

**Acceptance Criteria:**
- [ ] Lighthouse CI integrated into GitHub Actions
- [ ] Performance scores reported on PRs
- [ ] Bundle size regression detection
- [ ] k6 smoke test covers top 10 API routes (expanded from 3)
- [ ] Performance trend dashboard available

**Assigned Agent(s):** devops-platform-engineer + qa-test-engineer

**Dependencies:** PROD-088 (CI pipeline)

**Status:** ✅ Done — Performance budgets, bundle size checks, k6 load tests

---

## Killed Features Reference (DO NOT RESURRECT)

| # | Feature | Kill Reason | Current Status |
|---|---------|-------------|----------------|
| 1 | 7-stage progression system | Stages feel like hoops, not achievements | **STILL ACTIVE** (PROD-028) |
| 2 | Separate assessment types | Three assessments confusing | Old routes exist (PROD-025) |
| 3 | Monte Carlo simulations | Target market doesn't understand probabilistic distributions | **STILL IN CODEBASE** (PROD-031) |
| 4 | Sprint planning | Founders don't do sprint planning | Model exists (PROD-032) |
| 5 | 23-stage deal pipeline in UI | Founders think in 6 stages | Built correctly |
| 6 | Developer tools in main nav | Admin-only tools | **STILL IN SIDEBAR** (PROD-026) |
| 7 | "Global" section | Admin-only content management | **STILL IN SIDEBAR** (PROD-026) |
| 8 | Multiple settings pages | Should be one page with tabs | **STILL SEPARATE** (PROD-029) |
| 9 | Category filter buttons | Enemy of "what's next" focus | Correctly absent |
| 10 | "Generate Action Plan" dialog | Queue auto-manages priority | Correctly absent |

---

## Agent Routing Summary

| Agent | Assigned Items | Priority Breakdown |
|-------|----------------|-------------------|
| **financial-modeling-engineer** | 15 items | 8 Blocker, 4 High, 3 Medium |
| **backend-systems-architect** | 17 items | 5 Blocker, 6 High, 6 Medium |
| **lead-frontend-engineer** | 22 items | 4 Blocker, 8 High, 10 Medium |
| **full-stack-engineer** | 13 items | 3 Blocker, 6 High, 4 Medium |
| **applied-ai-rules-engine** | 9 items | 3 Blocker, 1 High, 5 Medium |
| **security-compliance-engineer** | 3 items | 1 Blocker, 1 High, 1 Medium |
| **qa-test-engineer** | 11 items | 2 Blocker, 3 High, 6 Medium |
| **growth-engineer** | 5 items | 2 Blocker, 1 High, 2 Medium |
| **mobile-experience-engineer** | 4 items | 1 Blocker, 1 High, 2 Medium |
| **product-designer-ux** | 7 items | 1 Blocker, 2 High, 4 Medium |
| **content-knowledge-architect** | 9 items | 2 Blocker, 0 High, 7 Medium |
| **devops-platform-engineer** | 4 items | 0 Blocker, 2 High, 2 Medium |
| **customer-success-engineer** | 2 items | 0 Blocker, 1 High, 1 Medium |
| **saas-data-architect** | 5 items | 1 Blocker, 0 High, 4 Medium |
| **exit-osx-product-manager** | 2 items | 0 Blocker, 0 High, 2 Parking Lot |
| **exit-osx-product-lead** | 3 items | 0 Blocker, 0 High, 3 Low (decision-making) |

---

## Dependency Graph (Critical Path)

### Testing & Security Foundation (Sprint 0)
1. **PROD-089** (Test User & Seed Data) → blocks PROD-088, PROD-090, PROD-092, PROD-093, PROD-094
2. **PROD-088** (CI/CD Pipeline) → blocks PROD-093, PROD-094, PROD-095 (all automated test enforcement)
3. **PROD-091** (Fix Security Vulns) → independent, do immediately

### Product Foundation Layer (Build First)
1. **PROD-009** (Shared Valuation Utility) → blocks PROD-007, PROD-008, PROD-012, PROD-016, PROD-062, PROD-063
2. **PROD-019** (Email Infrastructure) → blocks PROD-018, PROD-035, PROD-054, PROD-055, PROD-074, PROD-077
3. **PROD-024** (Company Intelligence Layer) → blocks PROD-036, PROD-058, PROD-059, PROD-076

### Onboarding Critical Path
1. PROD-001 (Magic-Link Signup) → PROD-002 (AI Classification) → PROD-003 (Streamlined Flow) → PROD-005 (Animated Progress) → PROD-006 (Tour-First)
2. PROD-004 (Comparable Company Engine) runs parallel

### Valuation Critical Path
1. PROD-009 (Shared Utility) → PROD-007 (Fix LINEAR Formula) + PROD-008 (Standardize Core Score) → PROD-062 (Remove Conditional) + PROD-063 (Server-Side Recalc)

### Sustained Value Critical Path
1. PROD-019 (Email Infrastructure) + PROD-020 (Signal Pipeline) + PROD-021 (Confidence Scoring) → PROD-018 (Drift Engine) → PROD-054 (Drift Cron)

### Assessment Critical Path
1. PROD-013 (Fix Reset Bug) → PROD-014 (Enforce Flow) → PROD-017 (Cadence Control)

---

## Sprint 0 Recommended Focus: Testing & Security Infrastructure

> Sprint 0 runs in parallel with Sprint 1 Week 1. Testing infrastructure enables everything else.

1. **PROD-089** - Recreate Test User & Seed Data (blocks all automated testing)
2. **PROD-091** - Fix 6 Known Security Vulnerabilities (independent, high-risk items)
3. **PROD-088** - CI/CD Pipeline with Test Gates (blocks automated deployment safety)
4. **PROD-090** - Security Module Test Suite (14 modules with zero coverage)
5. **PROD-092** - Valuation Golden-File Tests (catches the #1 bug class)

**Then layered on after foundation:**
6. **PROD-093** - Visual Regression Expansion (5 modes x 4 viewports)
7. **PROD-094** - E2E Journey Tests (full user flows)
8. **PROD-095** - Performance Budget Enforcement (Lighthouse CI)

---

## Sprint 1 Recommended Focus (Top 10 Items)

### Week 1 (Foundation) — parallel with Sprint 0
1. **PROD-009** - Shared Valuation Utility (blocks 6 other items)
2. **PROD-019** - Email Infrastructure (blocks 7 other items)
3. **PROD-026** - Remove Dev/Global from Sidebar (quick win, high visibility)
4. **PROD-050** - Fix NextMoveCard Navigation (5min fix, functional bug)

### Week 2 (Valuation Fixes)
5. **PROD-007** - Fix LINEAR Formula (depends on PROD-009)
6. **PROD-008** - Standardize Core Score (depends on PROD-009)
7. **PROD-010** - Financial Calculation Audit (independent, high priority)
8. **PROD-013** - Fix Assessment Reset Bug (high user impact)

### Week 3 (Onboarding & Mobile)
9. **PROD-001** - Magic-Link Signup (highest onboarding priority)
10. **PROD-023** - Fix Mobile Login Bug (blocker for mobile users)

**Estimated Total:** ~18-20 days of work across multiple agents (parallelizable)

---

## Notes

- **Deduplication complete:** All items cross-referenced against Spec Audit, Bug Report, Product Lead Review, and existing tracking docs
- **No killed features resurrected:** All items verified against killed-features.md
- **Dependencies mapped:** Critical path identified for sequencing
- **Agent routing optimized:** Opus agents for strategic/architectural work, Sonnet agents for implementation
- **Complexity estimates:** Based on 1 hour = XS, 4-8 hours = S, 1-2 days = M, 3-4 days = L, 5+ days = XL
- **Total estimated effort:** ~300+ days of work across 87 items (parallelizable with 17-agent team)

---

**Next Steps:**
1. Product Lead review and prioritization confirmation
2. Sprint 1 kickoff with assigned agents
3. Weekly backlog grooming to refine estimates
4. Dependency tracking to prevent blocking
5. Regular status updates from agents via project-manager
