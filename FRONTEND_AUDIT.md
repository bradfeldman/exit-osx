# Exit OSx Frontend Implementation Audit

**Audit Date:** 2026-02-06
**Scope:** Every page, component, copy string, UX flow, visual pattern, and gating mechanism in the frontend codebase.

---

## TABLE OF CONTENTS

1. [All Pages & Routes](#1-all-pages--routes)
2. [All Components by Section](#2-all-components-by-section)
3. [Copy Audit](#3-copy-audit)
4. [Navigation Structure](#4-navigation-structure)
5. [UX Patterns](#5-ux-patterns)
6. [Visual Patterns](#6-visual-patterns)
7. [Gating Logic: Free vs Paid](#7-gating-logic-free-vs-paid)

---

## 1. ALL PAGES & ROUTES

### Route Group: `(dashboard)`

| Route | Page File | Primary Component | Max Width |
|-------|-----------|-------------------|-----------|
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | `ValueHome` | `max-w-5xl` |
| `/dashboard/diagnosis` | `src/app/(dashboard)/dashboard/diagnosis/page.tsx` | `DiagnosisPage` | `max-w-5xl` |
| `/dashboard/actions` | `src/app/(dashboard)/dashboard/actions/page.tsx` | `ActionsPage` | `max-w-[800px]` |
| `/dashboard/evidence` | `src/app/(dashboard)/dashboard/evidence/page.tsx` | `EvidencePage` | `max-w-[900px]` |
| `/dashboard/deal-room` | `src/app/(dashboard)/dashboard/deal-room/page.tsx` | `DealRoomPage` | `max-w-[1200px]` |
| `/dashboard/value-ledger` | `src/app/(dashboard)/dashboard/value-ledger/page.tsx` | `ValueLedgerPage` | `max-w-5xl` |
| `/dashboard/financials` | `src/app/(dashboard)/dashboard/financials/page.tsx` | Financials hub | -- |
| `/dashboard/financials/pnl` | sub-route | P&L tab | -- |
| `/dashboard/financials/balance-sheet` | sub-route | Balance sheet tab | -- |
| `/dashboard/financials/cash-flow` | sub-route | Cash flow tab | -- |
| `/dashboard/financials/add-backs` | sub-route | EBITDA add-backs | -- |
| `/dashboard/financials/dcf` | sub-route | DCF valuation | -- |
| `/dashboard/financials/personal` | sub-route | Personal financial statement | -- |
| `/dashboard/financials/retirement` | sub-route | Retirement calculator | -- |
| `/dashboard/financials/profile` | sub-route | Financial profile | -- |
| `/dashboard/financials/statements` | sub-route | Financial statements | -- |
| `/dashboard/valuation` | page.tsx | Valuation overview | -- |
| `/dashboard/contacts` | page.tsx | Contacts management | -- |
| `/dashboard/data-room` | page.tsx | Data room | -- |
| `/dashboard/deal-tracker` | page.tsx | Deal tracker | -- |
| `/dashboard/playbook` | page.tsx | Playbook | -- |
| `/dashboard/action-plan` | page.tsx | Action plan | -- |
| `/dashboard/value-builder` | page.tsx | Value builder | -- |
| `/dashboard/assessment` | page.tsx | Assessment hub | -- |
| `/dashboard/assessment/company` | sub-route | Company assessment | -- |
| `/dashboard/assessment/personal-readiness` | sub-route | Personal readiness | -- |
| `/dashboard/assessment/risk` | sub-route | Risk assessment | -- |
| `/dashboard/assessments` | page.tsx | Assessments list | -- |
| `/dashboard/assessments/[id]` | page.tsx | Assessment detail | -- |
| `/dashboard/assessments/new` | page.tsx | New assessment | -- |
| `/dashboard/company/setup` | page.tsx | Company setup | -- |
| `/dashboard/company/bri-weights` | page.tsx | BRI weight config | -- |
| `/dashboard/settings` | page.tsx | Settings hub | -- |
| `/dashboard/settings/company` | sub-route | Company settings | -- |
| `/dashboard/settings/user` | sub-route | User settings | -- |
| `/dashboard/settings/organization` | sub-route | Org settings | -- |
| `/dashboard/settings/billing` | sub-route | Billing settings | -- |
| `/dashboard/developer/*` | multiple | Dev tools (superadmin) | -- |
| `/dashboard/global/add-question` | page.tsx | Global question admin | -- |
| `/dashboard/global/add-task` | page.tsx | Global task admin | -- |
| `/dashboard/loans/business` | page.tsx | Business loans | -- |
| `/dashboard/tasks/[id]` | page.tsx | Task detail | -- |
| `/dashboard/deals` | page.tsx | Deals list | -- |
| `/dashboard/deals/[dealId]` | page.tsx | Deal detail | -- |
| `/dashboard/deals/[dealId]/buyers` | sub-route | Deal buyers | -- |
| `/dashboard/retirement-calculator` | page.tsx | Retirement calculator | -- |

### Route Group: `(auth)`

| Route | Page File | Description |
|-------|-----------|-------------|
| `/login` | `src/app/(auth)/login/page.tsx` | Login page with 2FA, captcha, lockout |
| `/signup` | `src/app/(auth)/signup/page.tsx` | Registration page with value anchoring |
| `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` | Password reset request |
| `/reset-password` | `src/app/(auth)/reset-password/page.tsx` | Password reset completion |

### Route Group: `(onboarding)`

| Route | Page File | Description |
|-------|-----------|-------------|
| `/onboarding` | `src/app/(onboarding)/onboarding/page.tsx` | Focused onboarding wizard |

### Route Group: `(advisor)`

| Route | Page File | Description |
|-------|-----------|-------------|
| `/advisor` | `src/app/(advisor)/advisor/page.tsx` | Advisor portal |

### Route Group: `(seller)`

| Route | Page File | Description |
|-------|-----------|-------------|
| `/[dealId]` | `src/app/(seller)/[dealId]/page.tsx` | Seller-side deal view |

### Route Group: `admin`

| Route | Page File | Description |
|-------|-----------|-------------|
| `/admin/*` | multiple | Admin panel |

---

## 2. ALL COMPONENTS BY SECTION

### 2.1 Layout Components

**Directory:** `src/components/layout/`

| Component | File | Description |
|-----------|------|-------------|
| `Sidebar` | `Sidebar.tsx` | Desktop sidebar navigation with progression-gated sections |
| `Header` | `Header.tsx` | Top header bar with subscription badge, notifications, avatar |
| `MobileNav` | `MobileNav.tsx` | Mobile drawer navigation |
| `DashboardShell` | `DashboardShell.tsx` | Provider wrapper (Company > UserRole > Subscription > Progression) |
| `DashboardContent` | `DashboardContent.tsx` | Route logic: stage 0 = EntryScreen, stages 1+ = full dashboard |
| `EntryScreen` | `EntryScreen.tsx` | Dark gradient entry for stage 0 users (no company) |
| `NotificationBell` | `NotificationBell.tsx` | Notification bell in header |

### 2.2 Mode 1: Value Home (`/dashboard`)

**Directory:** `src/components/value/`

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `ValueHome` | `ValueHome.tsx` | -- | Main orchestrator. Fetches `/api/companies/{id}/dashboard`. |
| `HeroMetricsBar` | `HeroMetricsBar.tsx` | `currentValue, potentialValue, valueGap, valueGapDelta, isEstimated, hasAssessment, isEbitdaFromFinancials` | 3-column KPI grid with animated countup |
| `ValuationBridge` | `ValuationBridge.tsx` | `bridgeCategories, hasAssessment, onCategoryClick, onAssessmentStart` | Horizontal bar chart per BRI category |
| `NextMoveCard` | `NextMoveCard.tsx` | `task, comingUp` | Highlighted priority task card |
| `ValueTimeline` | `ValueTimeline.tsx` | `valueTrend, annotations` | Area chart of value over time |
| `ComingUpList` | `ComingUpList.tsx` | `tasks` | List of upcoming tasks below NextMoveCard |
| `BridgeTooltip` | `BridgeTooltip.tsx` | `active, payload, label` | Custom recharts tooltip for bridge chart |
| `ValueHomeLoading` | `ValueHomeLoading.tsx` | -- | Skeleton loading state |
| `ValueHomeError` | `ValueHomeError.tsx` | `onRetry` | Error state with retry button |

### 2.3 Mode 2: Diagnosis (`/dashboard/diagnosis`)

**Directory:** `src/components/diagnosis/`

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `DiagnosisPage` | `DiagnosisPage.tsx` | -- | Orchestrator. Fetches `/api/companies/{id}/diagnosis`. |
| `DiagnosisHeader` | `DiagnosisHeader.tsx` | `briScore, isEstimated` | Title, BRI score display |
| `CategoryPanel` | `CategoryPanel.tsx` | `category, onAssessmentComplete, isExpanded, onToggle` | BRI category card with inline assessment |
| `CategoryAssessmentFlow` | `CategoryAssessmentFlow.tsx` | `companyId, assessmentId, category, onComplete, onCancel` | Inline question-by-question assessment |
| `ConfidenceDots` | `ConfidenceDots.tsx` | `confidence, maxConfidence` | 4-dot confidence indicator |
| `RiskDriversSection` | `RiskDriversSection.tsx` | `riskDrivers, hasAssessment` | Top risk drivers ranked by dollar impact |
| `RiskDriverRow` | `RiskDriverRow.tsx` | `rank, driver, onStartTask` | Individual risk driver with CTA |

### 2.4 Mode 3: Actions (`/dashboard/actions`)

**Directory:** `src/components/actions/`

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `ActionsPage` | `ActionsPage.tsx` | -- | Orchestrator. Fetches `/api/companies/{id}/actions`. |
| `HeroSummaryBar` | `HeroSummaryBar.tsx` | `totalTasks, activeTasks, deferredTasks, monthlyCompleted, monthlyRecovered` | Action queue stats banner |
| `ActiveTaskCard` | `ActiveTaskCard.tsx` | `task, onToggleSubStep, onComplete, onBlock` | Active task with sub-steps, buyer context, status actions |
| `SubStepChecklist` | `SubStepChecklist.tsx` | `steps, progress, onToggle` | Checkbox sub-step list with progress bar |
| `BuyerContextBlock` | `BuyerContextBlock.tsx` | `buyerConsequence, buyerRisk` | "Why this matters to buyers" quote block |
| `TaskStatusActions` | `TaskStatusActions.tsx` | `taskId, onComplete, onBlock, assignee, isAssignedToCurrentUser` | Mark Complete + overflow menu (Block, Defer, Not Applicable) |
| `TaskDetailsCollapsible` | `TaskDetailsCollapsible.tsx` | `successCriteria, outputFormat, description` | Expandable "More Details" with success criteria and output format |
| `TaskCompletionDialog` | `TaskCompletionDialog.tsx` | `task, onConfirm, onCancel` | Full-screen modal for completing task with notes |
| `UpNextQueue` | `UpNextQueue.tsx` | `tasks, onStartTask` | Expandable queue of upcoming tasks |
| `QueueItemRow` | `QueueItemRow.tsx` | `title, categoryLabel, briCategory, normalizedValue, estimatedMinutes, prerequisiteHint, outputHint, assignee, onClick` | Individual queue item |
| `WaitingOnOthers` | `WaitingOnOthers.tsx` | `tasks` | Tasks assigned to other team members |
| `CompletedThisMonth` | `CompletedThisMonth.tsx` | `tasks, totalRecovered` | Completed tasks summary |
| `CompletedTaskRow` | `CompletedTaskRow.tsx` | `title, completedValue, completedAt` | Individual completed task row |
| `EmptyState` | `EmptyState.tsx` | -- | Empty queue state with link to diagnosis |
| `ActionsLoading` | `ActionsLoading.tsx` | -- | Skeleton loading |
| `ActionsError` | `ActionsError.tsx` | `onRetry` | Error state with retry |

### 2.5 Mode 4: Evidence (`/dashboard/evidence`)

**Directory:** `src/components/evidence/`

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `EvidencePage` | `EvidencePage.tsx` | -- | Orchestrator. Fetches `/api/companies/{id}/evidence`. |
| `HeroEvidenceBar` | `HeroEvidenceBar.tsx` | `percentage, totalDocuments, totalCategories` | Score bar with progress indicator |
| `EvidenceCategoryTable` | `EvidenceCategoryTable.tsx` | `categories` | Expandable table by evidence category |
| `EvidenceEmptyState` | `EvidenceEmptyState.tsx` | -- | First-time upload prompt with category cards |
| `MissingDocumentsSection` | `MissingDocumentsSection.tsx` | `documents` | Missing docs ranked by buyer impact |
| `RecentlyAddedSection` | `RecentlyAddedSection.tsx` | `documents` | Recently uploaded docs |
| `DealRoomTeaser` | `DealRoomTeaser.tsx` | `isReady, evidencePercentage, daysOnPlatform, subscriptionTier` | Deal Room activation teaser |
| `EvidenceLoading` | `EvidenceLoading.tsx` | -- | Skeleton loading |
| `EvidenceError` | `EvidenceError.tsx` | `onRetry` | Error state with retry |

### 2.6 Mode 5: Deal Room (`/dashboard/deal-room`)

**Directory:** `src/components/deal-room/`

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `DealRoomPage` | `DealRoomPage.tsx` | -- | Orchestrator. Fetches `/api/companies/{id}/deal-room`. |
| `ActivationGate` | `ActivationGate.tsx` | `requirements` | Pre-activation checklist |
| `DealRoomTabs` | `DealRoomTabs.tsx` | `activeTab, onTabChange, buyerCount, openQuestions, recentActivity` | Pipeline / Data Room / Activity tabs |
| `DealRoomLoading` | `DealRoomLoading.tsx` | -- | Skeleton loading |
| `DealRoomError` | `DealRoomError.tsx` | `onRetry` | Error state with retry |

### 2.7 Value Ledger

**Directory:** `src/components/value-ledger/`

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `ValueLedgerPage` | `ValueLedgerPage.tsx` | -- | Full page with infinite scroll. Fetches `/api/companies/{id}/value-ledger`. |
| `ValueLedgerSection` | `ValueLedgerSection.tsx` | -- | Compact section on home dashboard (3 recent entries) |
| `LedgerSummaryBar` | `LedgerSummaryBar.tsx` | `totalRecovered, totalAtRisk, entryCount` | 3-column summary (Recovered, At Risk, Events) |
| `LedgerFilters` | `LedgerFilters.tsx` | `selectedCategory, selectedEventType, onCategoryChange, onEventTypeChange` | Category + event type dropdowns |
| `LedgerTimeline` | `LedgerTimeline.tsx` | `entries` | Date-grouped timeline (Today, Yesterday, etc.) |
| `LedgerEntry` | `LedgerEntry.tsx` | `entry, mode` | Individual entry (compact or full mode) |
| `ValueLedgerLoading` | `ValueLedgerLoading.tsx` | -- | Skeleton loading |

### 2.8 Disclosures (Monthly Check-in)

**Directory:** `src/components/disclosures/`

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `DisclosureTrigger` | `DisclosureTrigger.tsx` | -- | Blue gradient banner on home page |
| `DisclosurePrompt` | `DisclosurePrompt.tsx` | `promptSet, onClose, onComplete` | Full-screen modal with Yes/No questions |

### 2.9 Onboarding

**Directory:** `src/components/onboarding/`

| Component | File | Description |
|-----------|------|-------------|
| `FocusedOnboardingWizard` | `FocusedOnboardingWizard.tsx` | 2-step wizard (Business Info + Revenue), celebration screen with confetti |

### 2.10 Subscription / Gating

**Directory:** `src/components/subscription/`

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `UpgradeModal` | `UpgradeModal.tsx` | `open, onOpenChange, feature, featureDisplayName` | Dialog showing plan comparison |
| `TrialBanner` | `TrialBanner.tsx` | -- | Top banner for trials <=7 days or expired |
| `FeatureGate` | `FeatureGate.tsx` | `feature, children, fallback` | Wrapper: shows children if access, LockedFeature if not |
| `LockedFeature` | `LockedFeature.tsx` | `feature, featureDisplayName, variant` | Three variants: card, inline, minimal |

### 2.11 UI Primitives

**Directory:** `src/components/ui/`

| Component | File |
|-----------|------|
| `animated-section` | `animated-section.tsx` (AnimatedSection, AnimatedHero, AnimatedStagger, AnimatedItem) |
| `badge` | `badge.tsx` |
| `button` | `button.tsx` |
| `captcha` | `captcha.tsx` |
| `checkbox` | `checkbox.tsx` |
| `collapsible` | `collapsible.tsx` |
| `command` | `command.tsx` |
| `company-avatar` | `company-avatar.tsx` |
| `dialog` | `dialog.tsx` |
| `dropdown-menu` | `dropdown-menu.tsx` |
| `label` | `label.tsx` |
| `popover` | `popover.tsx` |
| `progress` | `progress.tsx` |
| `select` | `select.tsx` |
| `separator` | `separator.tsx` |
| `skeleton` | `skeleton.tsx` |
| `slider` | `slider.tsx` |
| `switch` | `switch.tsx` |
| `table` | `table.tsx` |
| `tabs` | `tabs.tsx` |
| `textarea` | `textarea.tsx` |
| `toaster` | `toaster.tsx` |
| `tooltip` | `tooltip.tsx` |
| `user-avatar` | `user-avatar.tsx` |

### 2.12 Other Component Directories

| Directory | Components |
|-----------|-----------|
| `src/components/financials/` | `PLTab`, `BalanceSheetTab`, `CashFlowTab`, `AddBacksTab`, `YearCard`, `FinancialTable`, `DCFValuationSection`, `PeriodSelector`, `DataSourceBadge`, `StepProgress`, `FinancialSettingsModal`, `QuickBooksStatus`, `HorizontalScrollContainer`, `FinancialSummaryPanel`, `EditableCell`, `AddPeriodDialog` |
| `src/components/valuation/` | `GrowthAssumptions`, `TerminalValuePanel`, `ValuationResults`, `WACCCalculator` |
| `src/components/retirement/` | `GrowthPanel`, `MarketDataPanel`, `MonteCarloPanel`, `ProjectionChart`, `SensitivityTable`, `SpendingPanel`, `TimelinePanel` |
| `src/components/assessment/` | `QuestionCard`, `AssessmentResults` |
| `src/components/dashboard/` | `ValueHistoryChart`, `ValueHistoryChartDynamic`, `TrendInsights`, `TrendInsightsDynamic`, `ExecutionMomentum` |
| `src/components/company/steps/` | `CoreFactorsStep`, `AdjustmentsStep`, `FinancialsStep` |
| `src/components/playbook/` | `TaskAssignDialog`, `GenerateActionPlanDialog`, `TaskUploadDialog`, `TaskCompletionDialog` |
| `src/components/deal-tracker/` | `AddProspectModal`, `CSVImportModal`, `DenyProspectModal` |
| `src/components/dataroom/` | `ActivityFeed`, `AnalyticsPanel`, `DocumentAnalytics`, `NotificationBell`, `SearchFilters`, `UserAccessReport`, `VersionHistory` |
| `src/components/admin/` | `ActivityFeed`, `AdminHeader`, `AdminLayout`, `ImpersonationBanner`, `ImpersonationModal`, `OrgTable`, `TicketTable`, `UserTable` |
| `src/components/advisor/` | `ClientSwitcher` |
| `src/components/settings/` | `GDPRSettings`, `OrganizationSettings` |
| `src/components/security/` | `session-manager`, `two-factor-settings` |
| `src/components/developer/` | `AddQuestionFlow`, `TaskViewer`, `AddTaskFlow` |
| `src/components/access/` | `AccessRequestButton`, `AccessRequestList`, `AccessRequestModal` |
| `src/components/integrations/` | `QuickBooksCard` |

---

## 3. COPY AUDIT

### 3.1 Page Headlines & Subtitles

| Page | Headline | Subtitle |
|------|----------|----------|
| Entry Screen | "See how buyers value your business" | -- |
| Entry Screen CTA | "Start Here" | -- |
| Entry Screen Cards | "Quick Assessment", "Buyer's Perspective", "Action Plan" | "Answer a few questions about your business", "See how buyers evaluate and price your company", "Get personalized steps to increase your exit value" |
| Signup | "See How Buyers Would Price Your Business Today" | (value anchor: "$900K math example") |
| Signup CTA | "Reveal My Exit Risk Profile" | -- |
| Signup Success | "You're One Click Away From Your Exit Readiness Score" | "Open Email & See My Results" |
| Login left panel | "Build a Business Buyers Want to Own" | -- |
| Onboarding Step 1 | "Your Business" | "Why this matters: Your industry determines your baseline valuation multiple" |
| Onboarding Step 2 | "Revenue" | "Revenue size directly impacts your company's market value" |
| Onboarding Celebration | "Businesses like yours sell for approximately" | "But your number could be 20-40% higher with the right preparation" |
| Onboarding CTA | "See Where Buyers Will Discount You" | -- |
| Value Home | (no explicit page headline) | -- |
| Diagnosis | "YOUR BUYER READINESS" | "How buyers evaluate your business" |
| Actions | "YOUR ACTION QUEUE" | (stat line: "X tasks . X active . X deferred") |
| Evidence | "YOUR EVIDENCE" | "X% buyer-ready" |
| Deal Room | "Deal Room" | (tabs: Pipeline, Data Room, Activity) |
| Value Ledger | "Value Ledger" | "Every action, every signal -- your buyer-proof value story." |

### 3.2 Section Headers

| Component | Section Header | Notes |
|-----------|---------------|-------|
| HeroMetricsBar | "Current Value", "Potential Value", "Value Gap" | Column headers |
| ValuationBridge | "WHERE YOUR VALUE GAP IS" | "Each bar shows how much a buyer discounts for that category." |
| NextMoveCard | "YOUR NEXT MOVE" or "CONTINUE WHERE YOU LEFT OFF" | Depends on task.startedAt |
| NextMoveCard (coming up) | "COMING UP" | Below main task |
| ValueTimeline | "YOUR VALUE OVER TIME" | "Each milestone shows what you did and what happened." |
| ValueLedgerSection (home) | "Value Ledger" | Uppercase tracking-widest |
| DiagnosisHeader | "YOUR BUYER READINESS" | "How buyers evaluate your business" |
| RiskDriversSection | "WHAT'S COSTING YOU THE MOST" | "Specific risks ranked by dollar impact" |
| HeroSummaryBar (actions) | "YOUR ACTION QUEUE" | -- |
| UpNextQueue | "Up Next" | -- |
| WaitingOnOthers | "WAITING ON OTHERS" | -- |
| CompletedThisMonth | "COMPLETED THIS MONTH (X)" | Section divider style |
| HeroEvidenceBar | "YOUR EVIDENCE" | -- |
| MissingDocumentsSection | "MISSING (HIGHEST IMPACT FIRST)" | Section divider style |
| RecentlyAddedSection | "RECENTLY ADDED" | Section divider style |
| DealRoomTeaser | "DEAL ROOM READY" or "DEAL ROOM" + "Almost Ready" | -- |
| LedgerSummaryBar | "Recovered", "At Risk", "Events" | Column headers |
| DisclosureTrigger | "Monthly Check-in" | -- |
| DisclosurePrompt | "Monthly Check-in" | -- |
| BuyerContextBlock | "WHY THIS MATTERS TO BUYERS" | -- |
| TaskDetailsCollapsible | "More Details", "Description", "Success Criteria", "Required Output" | Collapsible sub-sections |

### 3.3 Button Labels

| Context | Button Text | Variant |
|---------|-------------|---------|
| Entry Screen | "Start Here" | Primary, link to /onboarding |
| Signup | "Reveal My Exit Risk Profile" | Primary |
| Signup Success | "Open Email & See My Results" | Primary |
| Login | "Sign In" | Primary |
| Onboarding Celebration | "See Where Buyers Will Discount You" | Primary, burnt-orange |
| ValueHomeError | "Try Again" | Primary |
| ValuationBridge (no assessment) | "Start Assessment" | Primary |
| NextMoveCard (no task started) | "Start This Task" | Primary |
| NextMoveCard (task in progress) | "Continue" | Primary |
| NextMoveCard (free tier) | "Upgrade to Start Closing Your Gap" | Primary |
| NextMoveCard (all done) | "Review Diagnosis" | Primary |
| CategoryPanel (no assessment) | "Start Assessment" | Primary |
| CategoryPanel (assessment done) | "Review & Refresh" | Outline |
| CategoryPanel (in progress) | "Continue" | Primary |
| CategoryPanel (score >= 80) | "Maintaining" | Ghost |
| CategoryPanel (old data) | "Review Answers" | Outline |
| CategoryAssessmentFlow | "Back" / "Next" / "Done" | -- |
| TaskStatusActions | "Mark Complete" | Primary |
| TaskStatusActions overflow | "I'm Blocked", "Defer", "Not Applicable" | Ghost menu items |
| TaskCompletionDialog | "Complete Task" / "Completing..." | Primary |
| TaskCompletionDialog | "Back" | Ghost |
| ActionsError | "Retry" | Primary |
| EmptyState (actions) | "Go to Diagnosis" | Primary |
| EvidenceError | "Retry" | Primary |
| DealRoomTeaser (ready) | "Activate Deal Room" | Primary |
| DealRoomTeaser (not ready) | "Build Your Evidence" / "Upgrade to Exit-Ready" / "Available in X days" | Varies |
| ActivationGate | "Activate Deal Room" | Burnt-orange |
| ActivationGate | "Upgrade to Exit-Ready" / "Build Your Evidence" | Varies |
| DealRoomError | "Retry" | Primary |
| DisclosureTrigger | "Start Check-in" | Primary, bg-blue-600 |
| DisclosurePrompt (question) | "Yes" / "No" | Outline |
| DisclosurePrompt (follow-up) | "Skip" / "Continue" | Outline / Primary blue |
| DisclosurePrompt (done) | "Done" | Primary |
| TrialBanner | "Upgrade Now" | Default or outline |
| LockedFeature (card) | "Unlock Feature" | Primary |
| LockedFeature (minimal) | "Locked" | Text link style |
| UpgradeModal | "Start Free Trial of {plan}" / "Upgrade Trial to {plan}" / "Upgrade to {plan}" | Primary |
| ValueLedgerSection | "View full history" | Text link with arrow |
| RiskDriverRow | "Connect QuickBooks" / "Upload Financials" / "Start: {task}" / "Continue: {task}" / "Review & Update" | Varies |

### 3.4 Empty States

| Component | Icon | Title | Body |
|-----------|------|-------|------|
| ValueHomeError | AlertCircle | "Unable to load your dashboard" | "Please refresh the page or try again in a moment." |
| ValuationBridge (no data) | -- | "No value gap data available yet." | -- |
| ValuationBridge (preview) | -- | (overlay) | "Based on industry averages. Complete your assessment for a personalized breakdown." |
| NextMoveCard (all done) | -- | -- | "You've completed all current tasks. Nice work." |
| EmptyState (actions) | ListChecks | "Your action queue is empty" | "Complete your diagnosis to generate personalized tasks..." |
| ActionsError | AlertTriangle | "Unable to load actions" | "Something went wrong loading your action queue. Please try again." |
| EvidenceEmptyState | FileCheck | "Build your buyer-ready evidence" | 6 category cards with impact badges |
| EvidenceEmptyState tip | -- | -- | "Start with Financial documents -- buyers request these in 100% of deals." |
| EvidenceError | AlertTriangle | "Unable to load evidence" | "Something went wrong loading your evidence library. Please try again." |
| DealRoomError | AlertTriangle | "Unable to load Deal Room" | "Something went wrong loading your Deal Room. Please try again." |
| LedgerTimeline (empty) | -- | "No ledger entries yet." | "Complete tasks and connect data to start building your value story." |
| ValueTimeline (single point) | -- | -- | "Your value journey starts here. Complete tasks and connect financials to see your progress over time." |
| RiskDriversSection (no assessment) | -- | (contextual) | -- |
| RiskDriversSection (no drivers) | -- | (contextual) | -- |

### 3.5 Tooltip / Contextual Copy

| Component | Copy |
|-----------|------|
| HeroMetricsBar badge (no assessment) | "Industry Preview" |
| HeroMetricsBar badge (has financials) | "Based on your financials" |
| HeroMetricsBar delta | "First month" / "No change" / "down $X this month" / "up $X this month" |
| BridgeTooltip | "{label}: {score}/100", "Costing you ~{dollarImpact}", buyer explanation |
| CategoryPanel (PERSONAL) | "Affects your exit timeline, not buyer pricing" |
| CategoryPanel (lowest confidence) | "Lowest confidence - improve this first" |
| CategoryPanel (stale data) | "Updated X days ago" with stale warning |
| CategoryAssessmentFlow | "Doesn't apply to my business" (N/A option) |
| CategoryAssessmentFlow | "Not sure about this answer" (flag option) |
| ActiveTaskCard (stale) | "Started X days ago -- still working on this?" (after 14 days) |
| TaskCompletionDialog | "Estimated value recovered: ~$X" |
| TaskCompletionDialog placeholder | "What did you accomplish? Any follow-up items?" |
| TaskStatusActions block input | "What's blocking you?" |
| CompletedTaskRow | "+$X recovered" |
| CompletedThisMonth | "Total value recovered this month: $X" |
| ValueLedgerSection motto | "Every action becomes buyer-proof." |
| DisclosurePrompt (done, signals) | "{N} signal(s) detected. We'll track the impact on your exit readiness." |
| DisclosurePrompt (done, no signals) | "No changes detected -- your value story is up to date." |
| TrialBanner (days left) | "{N} days left in your trial" / "1 day left in your trial" / "Your trial ends today" |
| TrialBanner (expired) | "Your trial has expired" / "Upgrade now to continue using premium features" |
| TrialBanner subtitle | "Upgrade to keep all your premium features" |
| LockedFeature (card body) | "Upgrade to {planName} to unlock this feature." |
| LockedFeature (inline) | "{featureName} ({plan} plan)" |

### 3.6 Loading State Copy

| Component | Loading Display |
|-----------|-----------------|
| ValueHomeLoading | Skeleton: 3 cards (120px), bridge (280px), next move (200px), timeline (280px) |
| ActionsLoading | Skeleton: hero bar (16px), active card (264px), 3 queue items (14px each) |
| EvidenceLoading | Skeleton: hero (20px), table (280px), 3 cards (24px each) |
| DealRoomLoading | Skeleton: 3 tab labels, header, 6-column pipeline grid |
| ValueLedgerLoading | Skeleton: 3-column summary, 2 filter selects, 4 timeline entries |
| DisclosurePrompt (submitting) | "Processing..." with animate-pulse |

---

## 4. NAVIGATION STRUCTURE

### 4.1 Desktop Sidebar (Sidebar.tsx)

**Core Links (always visible at stages 1+):**
1. Home (`/dashboard`) -- HomeIcon
2. Diagnosis (`/dashboard/diagnosis`) -- Stethoscope icon
3. Actions (`/dashboard/actions`) -- Zap icon
4. Evidence (`/dashboard/evidence`) -- FileCheck icon
5. Deal Room (`/dashboard/deal-room`) -- Briefcase icon

**Value Modeling Section (visible at stage >= 4):**
- Business Financials (`/dashboard/financials`) -- BarChart2 icon
- DCF Valuation (`/dashboard/valuation`) -- TrendingUp icon -- requires "dcf-valuation" feature
- Retirement Calculator (`/dashboard/retirement-calculator`) -- Calculator icon -- requires "retirement-calculator" feature
- Personal Financial Statement (`/dashboard/financials/personal`) -- User icon -- requires "personal-financials" feature

**Capital Section (visible at stage >= 6):**
- Business Loans (`/dashboard/loans/business`) -- Wallet icon -- requires "business-loans" feature

**Exit Tools Section (visible at stage >= 7):**
- Data Room (`/dashboard/data-room`) -- FolderLock icon
- Deal Tracker (`/dashboard/deal-tracker`) -- GitBranch icon
- Contacts (`/dashboard/contacts`) -- Users icon

**Admin Section (always visible at stages 1+):**
- Settings (`/dashboard/settings`) -- Settings icon
- Developer tools (`/dashboard/developer/*`) -- superadmin only
- Global tools (`/dashboard/global/*`) -- superadmin only

**Footer:**
- Company selector dropdown
- Version badge (e.g., "v0.6")

### 4.2 Mobile Navigation (MobileNav.tsx)

Mobile nav uses different labels for core sections:
- "Exit OSx Scorecard" (maps to Home)
- "Risk Assessment" (maps to Diagnosis)
- "Buyer View" (implied)
- "Action Plan" (maps to Actions)

Same progression and subscription gating logic applies.

### 4.3 Header (Header.tsx)

- Left: Mobile menu button + mobile logo (hidden desktop)
- Right: Subscription badge (Foundation/Growth/Exit-Ready with trial days remaining) + NotificationBell + UserAvatar dropdown
- UserAvatar dropdown: "User Settings" link, "Sign out" action

### 4.4 Tab Navigation (within pages)

**DealRoomTabs:** Pipeline | Data Room | Activity (with badge counts)
- Active tab indicated by burnt-orange underline

---

## 5. UX PATTERNS

### 5.1 Onboarding Flow

1. **Entry Screen** (stage 0): Dark gradient full-screen. "See how buyers value your business" headline. "Start Here" CTA links to `/onboarding`. Three value prop cards.
2. **Onboarding Wizard** (2 steps):
   - Step 1: "Your Business" -- name + industry selection (BasicInfoStep)
   - Step 2: "Revenue" -- annual revenue input (RevenueStep)
   - Each step shows value anchor banner explaining why the data matters
   - Trust footer: "Enterprise-grade security" + step counter + logout link
3. **Celebration Screen**: Dark gradient with gold accents. Animated valuation number with confetti (canvas-confetti, colors: #B87333, #D4A574, #FFD700, #FFFFFF). Curiosity hook about hidden value. CTA: "See Where Buyers Will Discount You" with animated arrow.
4. **Post-onboarding**: Lands on Value Home dashboard.

### 5.2 Assessment Flow (Inline within Diagnosis)

1. User clicks "Start Assessment" on a CategoryPanel
2. Panel expands to show CategoryAssessmentFlow inline (no page navigation)
3. Questions loaded from `/api/questions` for that category
4. Existing responses loaded from `/api/assessments/{id}/responses`
5. Radio-style options with auto-advance after 400ms delay
6. Special options: "Doesn't apply to my business" (N/A), "Not sure about this answer" (flag)
7. Progress bar shows completion
8. Back/Next navigation preserves state
9. "Done" button triggers BRI recalculation via `/api/companies/{id}/recalculate-bri`
10. On complete: parent DiagnosisPage refetches all data

### 5.3 Task Lifecycle (Actions Page)

1. **Queue**: Tasks appear in UpNextQueue ordered by priority
2. **Start**: User clicks "Start This Task" -- optimistic UI update
3. **In Progress**: Task moves to ActiveTaskCard with:
   - Sub-step checklist with progress bar
   - Buyer context block ("Why this matters to buyers")
   - Stale nudge after 14 days
   - Expandable details (description, success criteria, output format)
4. **Complete**: "Mark Complete" opens TaskCompletionDialog:
   - Shows task title and estimated value recovered
   - Optional completion notes textarea
   - "Complete Task" confirmation
5. **Block**: "I'm Blocked" from overflow menu -- text input for reason
6. **Defer**: "Defer" from overflow menu (currently just closes menu -- appears to be a placeholder)
7. **Not Applicable**: "Not Applicable" from overflow menu (currently just closes menu -- appears to be a placeholder)
8. **Completed**: Moves to CompletedThisMonth section with "+$X recovered" tag

### 5.4 Evidence Upload Flow

1. User sees EvidenceEmptyState or EvidenceCategoryTable
2. Category table rows expand to show:
   - Existing uploaded documents (with stale warnings for old docs)
   - Missing documents (with buyer explanation quotes)
3. Upload triggered per-document via upload link
4. Recently Added section shows this month's uploads
5. MissingDocumentsSection prioritizes by buyer impact
6. Deal Room teaser appears when evidence score >= 60%

### 5.5 Monthly Disclosure Check-in

1. **Trigger**: DisclosureTrigger renders blue gradient banner on home page when pending questions exist
2. **Prompt**: Full-screen modal with Yes/No questions
3. **Follow-up**: "Yes" answers get follow-up text input (optional)
4. **Completion**: Submits all responses to `/api/companies/{id}/disclosures/respond`
5. **Result**: Shows signal count or "no changes" message
6. **Side effect**: Signals feed into Value Ledger entries

### 5.6 Deal Room Activation

Three requirements must be met:
1. Evidence score >= 70%
2. Platform tenure >= 90 days
3. Subscription = Exit-Ready tier

If unmet, ActivationGate shows checklist with appropriate CTAs for each unmet requirement.

### 5.7 Animation Patterns

- **AnimatedStagger**: Wraps page sections, applies stagger delay (typically 0.12-0.15s)
- **AnimatedItem**: Child of stagger, fade-in-up animation
- **Easing**: `[0.25, 0.1, 0.25, 1]` (framer-motion)
- **CountUp**: Currency values animate from 0 using `useCountUpCurrency`
- **Progress bars**: `transition-all duration-500 ease-out` or `duration-300`
- **Chevron rotation**: `transition-transform` on expand/collapse
- **Confetti**: canvas-confetti on onboarding celebration

### 5.8 Loading States

Every mode has a dedicated loading skeleton component:
- `ValueHomeLoading` -- 3 metric skeletons + bridge + next move + timeline
- `ActionsLoading` -- hero bar + active card + 3 queue items
- `EvidenceLoading` -- hero + table + 3 cards
- `DealRoomLoading` -- tabs + header + 6-column pipeline grid
- `ValueLedgerLoading` -- 3 summary cards + filters + 4 timeline entries

All use `Skeleton` component or `animate-pulse` class.

### 5.9 Error States

Consistent pattern across all modes:
- AlertTriangle icon (text-destructive/60)
- "Unable to load {feature}" headline (text-lg font-semibold)
- Descriptive body text (text-sm text-muted-foreground)
- "Retry" or "Try Again" button
- Only ValueHomeError uses AlertCircle instead of AlertTriangle

### 5.10 Data Fetching Pattern

All pages follow the same pattern:
```
useCallback(async () => { ... fetch(...) ... }, [selectedCompanyId])
useEffect(() => { fetchData() }, [fetchData])
```
- No TanStack Query usage
- Manual loading/error state management
- `selectedCompanyId` from `useCompany()` context

---

## 6. VISUAL PATTERNS

### 6.1 Color System

| Token / Variable | Usage |
|-----------------|-------|
| `--burnt-orange` (#B87333) | Primary brand accent: ValueTimeline chart stroke, SubStepChecklist progress, ActiveTaskCard border, DealRoomTabs active underline, ActivationGate CTA, Actions monthly recovered stat |
| `bg-primary` / `text-primary` | General primary actions and highlights |
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary text, descriptions, metadata |
| `bg-muted` / `bg-muted/50` | Subtle backgrounds, hover states |
| `bg-card` / `border-border` | Card surfaces and borders |
| `text-destructive` / `bg-destructive` | Errors, at-risk values, expired trial |
| `text-emerald-500/600/700` | Positive values, recovered amounts, completion states, task checkmarks |
| `text-amber-500/600/700` | Warning states, at-risk values, urgent trial banner |
| `bg-blue-500/600` | Disclosure check-in CTA, progress bars |
| `bg-zinc-*` | General UI chrome (zinc-50 through zinc-900) |

**BRI Category Colors (ValuationBridge):**
| Category | Color |
|----------|-------|
| FINANCIAL | `#3b82f6` (blue-500) |
| TRANSFERABILITY | `#22c55e` (green-500) |
| OPERATIONAL | `#eab308` (yellow-500) |
| MARKET | `#8b5cf6` (violet-500) |
| LEGAL_TAX | `#ef4444` (red-500) |
| PERSONAL | (not in bridge -- affects timeline, not buyer pricing) |

**Confetti Colors (Onboarding):**
`#B87333`, `#D4A574`, `#FFD700`, `#FFFFFF`

### 6.2 Typography

| Context | Classes |
|---------|---------|
| Page title | `text-2xl font-semibold text-zinc-900` |
| Section header (uppercase) | `text-xs font-semibold uppercase tracking-widest text-zinc-400` or `text-muted-foreground` |
| Card title | `text-lg font-semibold text-zinc-900` or `text-foreground` |
| Body text | `text-sm text-zinc-700` or `text-muted-foreground` with `leading-relaxed` |
| Metadata | `text-xs text-zinc-400` or `text-muted-foreground` |
| Financial values (large) | `text-5xl font-bold tabular-nums` (BRI score), `text-2xl font-semibold tabular-nums` (currency) |
| Financial values (inline) | `text-sm font-medium tabular-nums` |
| Buyer quotes | `text-sm text-muted-foreground italic leading-relaxed` with curly quotes |
| Section divider text | `text-xs font-semibold tracking-wider text-muted-foreground uppercase` |

### 6.3 Card Patterns

| Type | Classes |
|------|---------|
| Standard card | `rounded-2xl border border-zinc-200 bg-white p-6` |
| Active task card | `rounded-2xl border-2 border-[var(--burnt-orange)]/30 bg-card p-6` |
| Disclosure trigger | `rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-5` |
| Summary bar items | `rounded-xl bg-{color}-50/50 border border-{color}-100 p-4` |
| ActivationGate | `rounded-2xl border border-dashed` (when not ready) or solid (when ready) |
| Locked feature (card) | `rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-8` |
| Modal overlay | `fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm` (Disclosure) or `bg-black/50` (TaskCompletion) |
| Modal content | `rounded-2xl bg-white shadow-xl` (Disclosure) or `rounded-xl bg-card border border-border shadow-xl` (TaskCompletion) |

### 6.4 Icon Usage

Icons sourced from `lucide-react`:
| Icon | Context |
|------|---------|
| `HomeIcon` | Home nav |
| `Stethoscope` | Diagnosis nav |
| `Zap` | Actions nav |
| `FileCheck` | Evidence nav + empty state |
| `Briefcase` | Deal Room nav |
| `MessageCircle` | Disclosure trigger |
| `BookOpen` | Value Ledger section |
| `AlertCircle` | ValueHomeError |
| `AlertTriangle` | All other errors, risk questions, block action |
| `CheckCircle` | Disclosure completion |
| `Check` | Completed checkmarks, sub-steps |
| `ChevronDown` | Collapsible sections |
| `ChevronRight` | Continue action, breadcrumbs |
| `ArrowRight` | "View full history" links, upgrade CTA |
| `ArrowUpRight` | Unlock feature CTA |
| `Lock` | Locked features |
| `X` | Modal close, dismiss |
| `MoreHorizontal` | Overflow menu trigger |
| `Clock` | Defer action, expired trial |
| `XCircle` | Not Applicable action |
| `TrendingUp` | Recovered / positive signals |
| `TrendingDown` | At risk / negative signals |
| `Activity` | Events count |
| `DollarSign` | Default ledger event |
| `Filter` | Ledger filter icon |
| `ListChecks` | Actions empty state |
| `Sparkles` | Trial banner (non-urgent) |
| `BarChart2` | Financials nav |
| `TrendingUp` | DCF Valuation nav |
| `Calculator` | Retirement nav |
| `User` | Personal financials nav |
| `Wallet` | Business loans nav |
| `FolderLock` | Data Room nav |
| `GitBranch` | Deal Tracker nav |
| `Users` | Contacts nav |
| `Settings` | Settings nav |

### 6.5 Spacing & Layout

| Pattern | Value |
|---------|-------|
| Page padding | `px-6 py-8` |
| Section gap (stagger) | `space-y-8` (home), `space-y-6` (ledger, diagnosis, actions) |
| Card padding | `p-6` (standard), `p-5` (trigger), `p-4` (summary items) |
| Border radius | `rounded-2xl` (cards), `rounded-xl` (sub-cards, summary items), `rounded-lg` (inputs, details), `rounded-full` (progress bars, dots, avatars) |
| Max widths | `max-w-5xl` (home, diagnosis, ledger), `max-w-[800px]` (actions), `max-w-[900px]` (evidence), `max-w-[1200px]` (deal room) |

### 6.6 Score-Based Color Coding (Diagnosis)

| Score Range | Color |
|-------------|-------|
| >= 80 | `text-emerald-600` |
| >= 60 | `text-primary` |
| >= 40 | `text-amber-600` |
| < 40 | `text-destructive` |

### 6.7 Evidence Readiness Progress Bar Colors

| Percentage | Color |
|------------|-------|
| >= 67% | `bg-emerald-500` |
| >= 34% | `bg-amber-500` |
| < 34% | `bg-rose-500` |

### 6.8 Value Ledger Entry Colors

| State | Bar Color | Amount Color | Icon Background |
|-------|-----------|-------------|-----------------|
| Recovered (positive) | `bg-emerald-500` | `text-emerald-600` | `bg-emerald-50` |
| At Risk (negative) | `bg-amber-500` | `text-amber-600` | `bg-amber-50` |
| Neutral | `bg-zinc-300` | `text-zinc-500` | `bg-zinc-50` |

---

## 7. GATING LOGIC: FREE vs PAID

### 7.1 Subscription Tiers

| Tier | Price (Annual) | Price (Monthly) | Internal ID |
|------|---------------|-----------------|-------------|
| Foundation | $0 | $0 | `foundation` |
| Growth | $149/mo | $179/mo | `growth` |
| Exit-Ready | $379/mo | $449/mo | `exit-ready` |

### 7.2 Feature Requirements Map

From `src/lib/pricing.ts`, the `FEATURE_REQUIREMENTS` map gates features to minimum tiers:

| Feature Key | Required Tier | Display Context |
|-------------|---------------|-----------------|
| `dcf-valuation` | Growth | DCF Valuation nav item |
| `retirement-calculator` | Growth | Retirement Calculator nav item |
| `personal-financials` | Growth | Personal Financial Statement nav item |
| `business-loans` | Growth | Business Loans nav item |
| (additional features defined in pricing.ts) | Various | Various |

### 7.3 Progression Stages

From `src/contexts/ProgressionContext.tsx`:

| Stage | Name | Trigger | Nav Impact |
|-------|------|---------|------------|
| 0 | Entry | No company created | Shows EntryScreen only, no sidebar |
| 1 | Value Discovered | Company exists | Full dashboard with core 5 nav links |
| 2 | Data Entry | (implied activity) | Same as 1 |
| 3 | First Win | 1 task completed | Same as 1 |
| 4 | Financial Depth | Business financials connected | Unlocks "Value Modeling" section in sidebar |
| 5 | Personal + Future | DCF + personal financials | Same as 4 (additional sub-items visible) |
| 6 | Capital Options | Both financial types connected | Unlocks "Capital" section in sidebar |
| 7 | Exit Tools | BRI >= 80 | Unlocks "Exit Tools" section in sidebar |

Stage transitions trigger toast notifications.

### 7.4 Gating Implementation Components

1. **FeatureGate** (`src/components/subscription/FeatureGate.tsx`):
   - Wraps content that requires a specific subscription tier
   - Uses `useFeatureAccess` hook to check current tier against required tier
   - Shows `LockedFeature` or `RequestAccessFeature` as fallback

2. **LockedFeature** (`src/components/subscription/LockedFeature.tsx`):
   - Three visual variants:
     - `card`: Centered layout with Lock icon, feature name, "Unlock Feature" button
     - `inline`: Pill with Lock icon, feature name, plan name
     - `minimal`: Small Lock icon + "Locked" text
   - Tracks `feature_locked_displayed` analytics event on mount
   - Opens UpgradeModal on click

3. **UpgradeModal** (`src/components/subscription/UpgradeModal.tsx`):
   - Dialog showing current plan vs target plan
   - Lists plan features and pricing
   - CTAs adapt based on context:
     - "Start Free Trial of {plan}" (new trial)
     - "Upgrade Trial to {plan}" (existing trial on lower tier)
     - "Upgrade to {plan}" (paid user upgrading)
   - Tracks analytics events

4. **TrialBanner** (`src/components/subscription/TrialBanner.tsx`):
   - Shows when trial has 7 or fewer days remaining
   - Three visual states:
     - Normal (primary color): 4-7 days remaining
     - Urgent (amber): 1-3 days remaining
     - Expired (destructive red): trial ended
   - Copy: "{N} days left in your trial" / "Your trial ends today" / "Your trial has expired"
   - Dismissible for 24 hours (localStorage)
   - Expired banner cannot be dismissed
   - "Upgrade Now" links to `/dashboard/settings/billing`

5. **Sidebar lock icons**: Subscription-locked nav items show Lock icon next to label

6. **Sidebar progression hiding**: Entire nav sections are hidden until user reaches required progression stage

### 7.5 Gating in Core 5 Modes

| Mode | Free Tier Behavior | Paid Tier Behavior |
|------|-------------------|-------------------|
| Home (Value) | Full access. Estimated values shown with "Industry Preview" badge. | Full access with personalized values. |
| Diagnosis | Full access to all categories and assessments. | Same. |
| Actions | NextMoveCard shows "Upgrade to Start Closing Your Gap" if not on Growth+. | Full task execution. |
| Evidence | Full access to upload and view. | Same. |
| Deal Room | ActivationGate requires Exit-Ready tier (plus evidence >= 70% and tenure >= 90 days). | Full access when all requirements met. |

### 7.6 Analytics Events for Gating

| Event | Trigger |
|-------|---------|
| `feature_locked_displayed` | LockedFeature component mounts |
| `trial_banner_displayed` | TrialBanner shows |
| `trial_banner_dismissed` | User dismisses banner |
| `trial_banner_clicked` | User clicks "Upgrade Now" |
| (upgrade modal events) | Tracked in UpgradeModal |

---

## APPENDIX: API ENDPOINTS REFERENCED IN FRONTEND

| Endpoint | Used By | Method |
|----------|---------|--------|
| `/api/companies/{id}/dashboard` | ValueHome | GET |
| `/api/companies/{id}/diagnosis` | DiagnosisPage | GET |
| `/api/companies/{id}/actions` | ActionsPage | GET |
| `/api/companies/{id}/evidence` | EvidencePage | GET |
| `/api/companies/{id}/deal-room` | DealRoomPage | GET |
| `/api/companies/{id}/value-ledger` | ValueLedgerPage, ValueLedgerSection | GET |
| `/api/companies/{id}/disclosures/current` | DisclosureTrigger | GET |
| `/api/companies/{id}/disclosures/respond` | DisclosurePrompt | POST |
| `/api/companies/{id}/recalculate-bri` | CategoryAssessmentFlow | POST |
| `/api/questions` | CategoryAssessmentFlow | GET |
| `/api/assessments/{id}/responses` | CategoryAssessmentFlow | GET |

---

## APPENDIX: DATA SHAPES (TypeScript Interfaces)

### DashboardData (ValueHome)

```typescript
interface DashboardData {
  company: {
    id: string
    name: string
    annualRevenue: number
    annualEbitda: number
    adjustedEbitda: number
  }
  tier1: {
    currentValue: number
    potentialValue: number
    valueGap: number
    marketPremium: number
    briScore: number | null
    coreScore: number | null
    finalMultiple: number
    multipleRange: { low: number; high: number }
    industryName: string
    isEstimated: boolean
    useDCFValue?: boolean
    hasCustomMultiples?: boolean
  } | null
  tier2: {
    adjustedEbitda: number
    isEbitdaEstimated: boolean
    isEbitdaFromFinancials: boolean
    ebitdaSource: string
    fiscalYear: number | null
    multipleRange: { low: number; high: number; current: number }
    hasCustomMultiples: boolean
  }
  tier5: {
    valueTrend: Array<{ value: number; date: string }>
    briTrend: { direction: string; change: number } | null
    exitWindow: string | null
    annotations: Array<{
      date: string
      label: string
      detail: string
      impact: string
      type: 'positive' | 'negative' | 'neutral'
    }>
  }
  bridgeCategories: Array<{
    category: string
    label: string
    score: number
    dollarImpact: number
    weight: number
    buyerExplanation: string
  }>
  valueGapDelta: number | null
  previousValueGap: number | null
  nextMove: {
    task: {
      id: string
      title: string
      description: string
      briCategory: string
      estimatedHours: number | null
      rawImpact: number
      status: string
      buyerConsequence: string | null
      effortLevel: string
      startedAt: string | null
    } | null
    comingUp: Array<{
      id: string
      title: string
      estimatedHours: number | null
      rawImpact: number
      briCategory: string
    }>
  }
  hasAssessment: boolean
}
```

### LedgerEntryData (Value Ledger)

```typescript
interface LedgerEntryData {
  id: string
  eventType: string  // TASK_COMPLETED | DRIFT_DETECTED | SIGNAL_CONFIRMED | REGRESSION_DETECTED | ASSESSMENT_COMPLETED | SNAPSHOT_CREATED | BENCHMARK_SHIFT | NEW_DATA_CONNECTED
  category: string | null  // FINANCIAL | TRANSFERABILITY | OPERATIONAL | MARKET | LEGAL_TAX | PERSONAL
  deltaValueRecovered: number
  deltaValueAtRisk: number
  deltaBri: number | null
  narrativeSummary: string
  occurredAt: string
  taskId: string | null
  signalId: string | null
}
```

### PromptSetData (Disclosures)

```typescript
interface PromptSetData {
  id: string
  questions: Array<{
    key: string
    text: string
    briCategory: string
    followUpText: string
    signalType: string  // 'negative' | 'positive'
  }>
  responses: Array<{
    questionKey: string
    answer: boolean
    followUpAnswer: string | null
  }>
}
```

---

## APPENDIX: CURRENCY FORMATTING

Three separate `formatCurrency` implementations exist in the codebase (not shared):

1. **TaskCompletionDialog**: `formatCurrency(value: number): string`
2. **QueueItemRow**: `formatCurrency(value: number): string`
3. **CompletedTaskRow**: `formatCurrency(value: number): string`

All use the same logic:
```typescript
if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
return `$${Math.round(value)}`
```

Additionally:
- **LedgerEntry**: `formatDollar(amount: number): string` -- identical logic
- **HeroMetricsBar, ValueLedgerSection, LedgerSummaryBar**: use `useCountUpCurrency` hook
- **ValuationBridge**: uses recharts built-in formatting

**NOTE:** This is a DRY violation. A shared utility should be extracted.

---

## APPENDIX: NOTED INCONSISTENCIES

1. **Currency formatting**: 4 duplicate implementations of the same `formatCurrency` function across Actions components + LedgerEntry.

2. **Error state icons**: ValueHomeError uses `AlertCircle`, all other error states use `AlertTriangle`.

3. **Max width inconsistency**: Pages use different max widths (5xl, 800px, 900px, 1200px) which may be intentional for content density but creates inconsistency.

4. **Modal overlay styles**: DisclosurePrompt uses `bg-black/40 backdrop-blur-sm`, TaskCompletionDialog uses `bg-black/50` without blur.

5. **Card border radius**: Most cards use `rounded-2xl`, but TaskCompletionDialog uses `rounded-xl`, and LockedFeature card uses `rounded-lg`.

6. **Color system mixing**: Some components use zinc-* colors directly (DisclosureTrigger, LedgerEntry, HeroMetricsBar) while others use semantic tokens (text-foreground, text-muted-foreground, bg-card). This creates potential dark mode issues.

7. **Defer and Not Applicable actions**: In TaskStatusActions, the "Defer" and "Not Applicable" overflow menu items currently only close the menu without performing any action -- these appear to be placeholders.

8. **Silent error handling**: DisclosurePrompt `submitAll()` silently catches errors with no user feedback. ValueLedgerSection also silently fails.

9. **Mobile nav label mismatch**: MobileNav uses different labels ("Exit OSx Scorecard", "Risk Assessment") than desktop Sidebar ("Home", "Diagnosis").

---

*End of audit.*
