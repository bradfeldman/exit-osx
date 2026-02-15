# Exit OSx: Definitive Prioritized Fix List

**Date:** 2026-02-14
**Produced by:** CPO, synthesizing findings from 13 specialist agent reviews
**Current bottleneck:** Activation ($0-$100K MRR)
**Decision framework:** Every item evaluated against business metric impact, Hormozi Value Equation, Staircase Method bottleneck, and user trust.

---

## How to read this document

Each item has:
- **What:** Description of the issue
- **Where:** File path(s) and line numbers
- **Effort:** T-shirt size (XS = <1hr, S = 1-4hr, M = 4-8hr, L = 1-3 days, XL = 3-5 days, XXL = 1-2 weeks)
- **Flagged by:** Which specialist agent(s) identified it
- **Metric:** Which business metric this protects or improves

Items within each tier are ordered by priority (do the first one first).

---

## TIER 1: DO NOW (This Sprint)

These are bugs, data integrity issues, or trust-breaking problems that actively harm users today. Every day these remain unfixed is a day we risk a founder making a decision based on wrong numbers.

---

### 1.1 Task priority uses array index instead of actual score

**What:** In `generate-tasks.ts`, line 276, the condition `tasksToCreate.indexOf(task) < tasksToCreate.length` is ALWAYS true (every element's index is less than the array length). This means `scoreForPriority` is calculated from the task's position in the array, not from its actual BRI score or impact. The entire 25-level priority matrix is effectively randomized -- the first task generated always gets the highest priority regardless of its real value. This means the "Next Move" card on the dashboard (our single most important CTA) recommends the wrong task.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/playbook/generate-tasks.ts`, lines 276-278

**Fix:** Replace the array-index-based scoring with the actual question score that the task was generated from. The `task` object already has the question's score available from the template matching context. Use `task.upgradeFromScore` or the question's normalized score as the input to `calculateTaskPriorityFromAttributes`.

**Effort:** S (2-3 hours including test verification)
**Flagged by:** Applied AI Rules Engine (P0)
**Metric:** Activation + Retention (wrong task order = users work on low-impact tasks first = slower value realization = higher churn)

---

### 1.2 Hardcoded $150K market salary in assessment completion

**What:** When a user completes their assessment (the most consequential moment in onboarding), the market salary is hardcoded to $150,000. But `recalculate-snapshot.ts` correctly uses `getMarketSalary()` which scales from $80K-$400K based on company size. For a $15M revenue company where the founder pays themselves $350K, the assessment route adds back $200K as excess comp ($350K - $150K), but a later recalculation adds back only $50K ($350K - $300K benchmark). At a 5x multiple, that is a $750K valuation discrepancy between their first "real" valuation and all subsequent ones.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/api/assessments/[id]/complete/route.ts`, line 198

**Fix:** Import `getMarketSalary` from the valuation module and use `getMarketSalary(revenueSizeCategory)` instead of the hardcoded 150000. The `revenueSizeCategory` is already available on the company's `CoreFactors`.

**Effort:** XS (30 minutes)
**Flagged by:** Financial Modeling Engineer (C-1), Business Appraiser
**Metric:** Activation + Trust (first valuation must be consistent with subsequent ones, or users lose confidence in the platform)

---

### 1.3 Negative EBITDA produces negative valuations shown to users

**What:** `calculateValuation()` has no guard against negative `adjustedEbitda`. If EBITDA adjustments push the number negative, the formula produces negative `currentValue` and `potentialValue`. A founder seeing "Your business is worth -$500K" is both meaningless in M&A and catastrophic for trust.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/calculate-valuation.ts`, lines 123-153

**Fix:** Add a guard at the top of the calculation: if `adjustedEbitda <= 0`, fall back to revenue-based valuation (which the `method-selector.ts` already supports) or return a result with a `methodNote` explaining that EBITDA-based valuation is not applicable and showing the revenue-based estimate instead. Never display a negative valuation.

**Effort:** M (4-6 hours -- needs to handle the fallback gracefully across all surfaces)
**Flagged by:** Financial Modeling Engineer (C-4), Applied AI Rules Engine (P1)
**Metric:** Activation + Trust (a negative valuation on any screen destroys credibility permanently)

---

### 1.4 BRI weight normalization not enforced -- NaN propagation risk

**What:** `calculateWeightedBriScore()` sums `score * weight` but never validates weights sum to 1.0. If custom weights (from SystemSetting or company overrides) sum to >1.0, BRI can exceed 1.0, and `Math.pow(1 - briScore, 1.4)` with a negative base returns `NaN`. That NaN propagates through the entire valuation -- the user sees "NaN" for their company value. If weights sum to <1.0, BRI is systematically understated.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/bri-scoring.ts`, lines 105-115

**Fix:** Two guards: (1) Normalize weights by dividing each by `totalWeight` if they don't sum to 1.0 (within a 0.001 tolerance). (2) Clamp the final `briScore` to [0, 1] before returning. Add the same clamp at the input boundary of `calculateValuation()`.

**Effort:** S (1-2 hours)
**Flagged by:** Financial Modeling Engineer (S-2), Applied AI Rules Engine (P1)
**Metric:** Trust (NaN on any financial screen = instant credibility death)

---

### 1.5 alphaConstant schema default (0.40) vs code constant (1.4)

**What:** The Prisma schema defaults `alphaConstant` to 0.40, but the code uses 1.4. With alpha=0.40, a 50% BRI gives only a 13% discount; with alpha=1.40 it gives 35%. Any snapshot created without explicitly setting alphaConstant (migration script, manual insert, seed, future code path) would produce silently wrong valuations.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/prisma/schema.prisma`, line 412

**Fix:** Change `@default(0.40)` to `@default(1.40)`. Also change the column type from `@db.Decimal(3, 2)` to `@db.Decimal(4, 2)` because 1.40 requires 3 digits total (1 before decimal + 2 after), but Decimal(3,2) maxes at 9.99. Actually Decimal(3,2) maxes at 9.99 which is fine for 1.40, but to be safe with future alpha tuning, use Decimal(4,2).

**Effort:** XS (15 minutes + migration)
**Flagged by:** Financial Modeling Engineer (C-2)
**Metric:** Data integrity (silent valuation corruption)

---

### 1.6 Default core factors inflate initial valuation (bait-and-switch)

**What:** During onboarding, all core factors are set to optimal values: `SUBSCRIPTION_SAAS`, `EXCELLENT` margins, `LOW` labor intensity, `ASSET_LIGHT`, `MINIMAL` owner involvement (lines 277-281 of OnboardingFlow.tsx). This produces a Core Score of 1.0, maximizing the initial valuation. When users later correct these in the assessment, their valuation drops -- creating a trust-damaging "bait and switch" moment.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/OnboardingFlow.tsx`, lines 274-282

**Fix:** Use neutral/middle values as defaults: `TRANSACTIONAL` (not SaaS), `MODERATE` margins, `MODERATE` labor intensity, `MODERATE` asset intensity, `MODERATE` owner involvement. This produces a Core Score around 0.5, meaning the initial valuation is conservative. When users correct their factors upward, the valuation goes UP (positive surprise). When they correct downward, the drop is smaller. Conservative defaults protect trust.

**Effort:** S (1-2 hours including verifying the downstream impact)
**Flagged by:** Product Designer/UX (Critical #6), Content Architect
**Metric:** Activation (trust destruction at the valuation reveal moment = users don't proceed to assessment)

---

### 1.7 formatCurrency duplicated 8+ times with inconsistent output

**What:** Multiple files define their own `formatCurrency` function with different formatting rules. Some output `$350K`, others `$350k`. Some use 1 decimal, others use 0. In a financial product where users make million-dollar decisions, inconsistent number formatting erodes trust at every glance.

**Where:** Files with duplicates include:
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/value/HeroMetricsBar.tsx`
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/steps/RiskResultsStep.tsx`
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/steps/IndustryPreviewStep.tsx`
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/value/ValuationBridge.tsx`
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/value/NextMoveCard.tsx`
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/value/ProgressContext.tsx`
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/actions/ActiveTaskCard.tsx`
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/actions/TaskCompletionDialog.tsx`
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/dcf-calculator.ts`

**Fix:** Create one canonical `formatCurrency()` in `src/lib/format.ts`. Rules: `$2.4M` for millions, `$350K` for thousands (capital K), `$1,234` for sub-thousands. Handle boundary conditions correctly ($999,999 = $1.0M, not $1000.0K). Replace all local implementations with imports from this single source.

**Effort:** M (4-6 hours for extraction + replacement across all files + visual testing)
**Flagged by:** Product Designer/UX (Critical #2), Content Architect
**Metric:** Trust (inconsistent financial formatting in a financial product)

---

### 1.8 Score name inconsistency across surfaces

**What:** The same concept is called "Exit Score," "Exit Readiness Score," "Buyer Readiness Score," "Buyer Readiness Index," and "BRI Score" across different surfaces. Users encountering these different names think they are different things. This is confusing and unprofessional.

**Where:** Multiple components across onboarding, dashboard, diagnosis, and task views. Key files:
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/steps/RiskResultsStep.tsx` -- uses different labels
- Various dashboard components

**Fix:** Pick ONE name. My decision: **"Buyer Readiness Score"** everywhere users see it. Abbreviated as **"BRI"** only in compact UI elements (badges, tooltips). Never "Exit Score." Never "Exit Readiness Score." Do a global search-and-replace of all user-facing strings. Internal code can keep using `briScore` as the variable name.

**Effort:** M (3-4 hours for search, replace, and visual verification)
**Flagged by:** Content/Knowledge Architect, Customer Success Engineer
**Metric:** Activation (confused users don't trust the product enough to proceed)

---

### 1.9 Onboarding snapshot ignores actual EBITDA and owner comp

**What:** The onboarding snapshot route computes adjusted EBITDA solely by estimating from revenue, discarding any actual EBITDA or owner compensation the company already has. If a founder entered their actual EBITDA during setup, it is ignored, and the estimate may be 40% off.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/api/companies/[id]/onboarding-snapshot/route.ts`, lines 106-107

**Fix:** Apply the same EBITDA adjustment logic as `recalculate-snapshot.ts`: check if `annualEbitda > 0`, use it as base, add back excess owner comp over market salary, include add-backs and deductions. Fall back to revenue estimate only when no actual EBITDA is available.

**Effort:** S (2-3 hours)
**Flagged by:** Financial Modeling Engineer (S-1)
**Metric:** Activation (first valuation accuracy determines whether users trust the platform)

---

### 1.10 TaskCompletionDialog has no focus trap or keyboard support

**What:** The task completion dialog (the most important user action in the product -- where value is created) uses a raw `div` overlay with no focus trapping, no keyboard escape, and no `aria-modal`. Screen readers don't announce it as a dialog. Keyboard-only users are stuck.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/actions/TaskCompletionDialog.tsx`

**Fix:** Replace the raw div overlay with the shadcn/ui `Dialog` component (which is already in the project and provides focus trap, keyboard escape, aria-modal, and proper animation). Keep the current content/layout, just wrap it in the proper Dialog primitive.

**Effort:** S (2-3 hours)
**Flagged by:** Product Designer/UX (Critical #3)
**Metric:** Retention (task completion is the core retention action -- it must be flawless)

---

### 1.11 BRI category labels hardcoded divergently in RiskResultsStep

**What:** `RiskResultsStep.tsx` defines its own `RISK_LABELS` map with different category names than the canonical `bri-categories.ts`. Users see one set of labels during onboarding and a different set on the dashboard.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/steps/RiskResultsStep.tsx`

**Fix:** Import category labels from the canonical `bri-categories.ts` source. Remove the local `RISK_LABELS` constant.

**Effort:** XS (30 minutes)
**Flagged by:** Content/Knowledge Architect
**Metric:** Activation (label inconsistency between onboarding and dashboard breaks trust in the first session)

---

### 1.12 Onboarding has ZERO analytics tracking

**What:** `OnboardingFlow.tsx` makes zero calls to the analytics module despite 90+ events being defined in the analytics type system. We cannot measure: time to complete each step, drop-off points, error rates, or which step kills activation. We are flying blind on the most important funnel in the product.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/OnboardingFlow.tsx`

**Fix:** Add analytics tracking for: `onboarding_started`, `onboarding_step_viewed` (with step number), `onboarding_step_completed`, `onboarding_company_created`, `onboarding_valuation_revealed`, `onboarding_quickscan_completed`, `onboarding_assessment_started`, `onboarding_completed`, and `onboarding_error` events. These events already exist in the analytics type definitions.

**Effort:** M (4-6 hours to wire up events at each step transition with proper properties)
**Flagged by:** Growth Engineer, Customer Success Engineer, SaaS Data Architect
**Metric:** Activation (cannot optimize what you cannot measure -- and activation is our bottleneck)

---

### 1.13 Task generation fails silently in DeepDiveStep

**What:** When the deep-dive assessment tries to generate tasks and fails (API error, timeout, etc.), the catch block logs the error to console and then proceeds to the dashboard with zero tasks. The user sees an empty Actions page with no explanation and no way to retry. This is the activation cliff.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/steps/DeepDiveStep.tsx` (catch block in task generation)

**Fix:** Show an inline error with a "Retry" button. If retry fails after 2 attempts, show a message: "We're generating your personalized action plan. Check back in a few minutes." and store a flag that triggers task generation on next dashboard visit. Never send users to an empty Actions page.

**Effort:** M (4-6 hours)
**Flagged by:** Customer Success Engineer
**Metric:** Activation (empty Actions page after onboarding = immediate churn)

---

## TIER 2: DO NEXT (Next 2-4 Weeks)

These are significant issues that affect accuracy, trust, or retention but are not actively breaking the user experience today. They should be addressed in the next 2-4 sprints.

---

### 2.1 Comparable engine AI hallucination risk

**What:** The comparable engine relies entirely on Claude to generate company names, tickers, and financial metrics with zero verification. AI-generated financials can be fabricated. These comparables flow directly into the valuation range and are shown to users making million-dollar decisions.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/comparable-engine.ts`, lines 226-284

**Fix (Phase 1):** Add a prominent disclaimer: "Comparable companies and their metrics are AI-estimated and should be verified with current market data before making financial decisions." Add a visual indicator (e.g., badge) marking these as "AI-Estimated." (Phase 2): Validate tickers against a financial API. (Phase 3): Use real market data APIs for metrics.

**Effort:** Phase 1: S (2 hours). Phase 2-3: XL (5+ days)
**Flagged by:** Financial Modeling Engineer (S-9), Applied AI Rules Engine (P0), Business Appraiser
**Metric:** Trust + Legal risk

---

### 2.2 BRI weights duplicated in 6+ files

**What:** BRI category weights (FINANCIAL=0.25, etc.) are independently defined in at least 6 files. If any one is updated without the others, BRI scores will diverge depending on which code path executes.

**Where:**
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/bri-weights.ts` (canonical)
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/improve-snapshot-for-task.ts` (lines 23-30)
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/recalculate-snapshot.ts`
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/OnboardingFlow.tsx`
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/value-gap-attribution.ts`
- Several other files

**Fix:** Remove all local weight definitions. Import exclusively from `src/lib/bri-weights.ts`. For `improve-snapshot-for-task.ts`, also wire in `getBriWeightsForCompany()` to respect custom weights (same as `recalculate-snapshot.ts` does).

**Effort:** M (4-6 hours)
**Flagged by:** Applied AI Rules Engine (P1), Financial Modeling Engineer (S-7)
**Metric:** Data integrity (score divergence between code paths)

---

### 2.3 DCF terminal value hardcoded to year 5

**What:** The DCF calculator hardcodes `calculatePresentValue(terminalValue, inputs.wacc, 5)` regardless of how many growth rate years are actually provided. If someone provides 3 growth rates, the terminal value is discounted from year 5, creating a 2-year gap where no value is captured.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/dcf-calculator.ts`, line 170

**Fix:** Replace `5` with `inputs.growthRates.length`.

**Effort:** XS (15 minutes)
**Flagged by:** Financial Modeling Engineer (S-5)
**Metric:** Trust (wrong DCF values for non-standard projection periods)

---

### 2.4 Decimal(4,2) overflow risk for multiples

**What:** `baseMultiple`, `finalMultiple`, `dcfImpliedMultiple`, and `exitMultiple` are stored as `Decimal(4,2)`, which maxes at 99.99. While typical EBITDA multiples are safe, `dcfImpliedMultiple` can easily exceed 100x (a $50M DCF on $400K EBITDA = 125x), causing Prisma to throw and crash the snapshot pipeline.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/prisma/schema.prisma`, lines 396-397, 406-408, 423

**Fix:** Change all multiple fields from `@db.Decimal(4,2)` to `@db.Decimal(6,2)` (supports up to 9,999.99). Alternatively, add a validation clamp before write.

**Effort:** S (1 hour + migration)
**Flagged by:** Financial Modeling Engineer (C-3)
**Metric:** Data integrity (Prisma crash on edge cases)

---

### 2.5 EBITDA improvement weight normalization bug

**What:** The EBITDA improvement calculation uses `(categoryWeight / 0.25)` to normalize, but the average weight across 6 categories is 0.167, not 0.25. The 0.25 is the FINANCIAL weight. This makes FINANCIAL improvements appear exactly correctly weighted while all other categories are systematically under-weighted.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/recalculate-snapshot.ts`, line 70

**Fix:** Replace `0.25` with `(1 / categories.length)` or remove the normalization factor entirely and let each category's stated improvement percentage stand on its own.

**Effort:** XS (30 minutes)
**Flagged by:** Financial Modeling Engineer (S-4)
**Metric:** Trust (distorts how much value improvement is attributed to non-financial categories)

---

### 2.6 potentialValue inconsistency between code paths

**What:** `calculateValuation()` defines `potentialValue = adjustedEbitda * baseMultiple` (same EBITDA, better multiple). But `recalculate-snapshot.ts` uses `potentialValue = potentialEbitda * baseMultiple` (improved EBITDA AND better multiple). `improve-snapshot-for-task.ts` uses the first formula. So the Value Gap changes meaning depending on which code path produced the snapshot.

**Where:**
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/calculate-valuation.ts`, line 143
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/recalculate-snapshot.ts`, lines 248-249
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/improve-snapshot-for-task.ts`, line 149

**Fix:** Decide ONE definition. My decision: potentialValue includes EBITDA improvement (the `recalculate-snapshot` version), because that is what the user cares about -- their total upside. Update `calculateValuation()` and `improve-snapshot-for-task.ts` to match. Document the definition in a comment block.

**Effort:** M (4-6 hours including regression testing)
**Flagged by:** Financial Modeling Engineer (S-10)
**Metric:** Trust (Value Gap is the hero metric -- it must be consistent)

---

### 2.7 Dashboard cognitive overload (10+ sections)

**What:** The Value home page renders 10+ sections: HeroMetricsBar, BRIRangeGauge, BenchmarkComparison, ValuationBridge, WhatIfScenarios, NextMoveCard, ProgressContext, ValueLedgerSection, DriftReportBanner, ValueTimeline. The most actionable element (NextMoveCard) is buried 6-7 sections down. Users are overwhelmed on first login.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/value/ValueHome.tsx`

**Fix:** Reorganize into 3 clear zones per the MODE-1-VALUE-HOME spec: (1) Hero Zone (HeroMetricsBar + Value Gap headline), (2) Action Zone (NextMoveCard -- move it UP to position 2), (3) Detail Zone (everything else, collapsed by default or behind tabs). The user's eye should flow: "Here's where I stand" -> "Here's what to do next" -> "Here's the detail if I want it."

**Effort:** L (2-3 days)
**Flagged by:** Product Designer/UX (Critical #1)
**Metric:** Activation + Retention (overwhelmed users don't take action)

---

### 2.8 MobileNav uses mouse-only events

**What:** MobileNav uses `onMouseLeave` and `onMouseEnter` for closing behavior. These events don't fire on touch devices. Mobile users cannot reliably close the navigation.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/layout/MobileNav.tsx`

**Fix:** Replace mouse events with touch-compatible patterns: use `onTouchStart` alongside mouse events, or better, use a click-outside detection pattern (the `useClickOutside` hook pattern). Also add a visible close button for explicit dismissal.

**Effort:** S (2 hours)
**Flagged by:** Product Designer/UX (Critical #4)
**Metric:** Activation (our target user -- 45-65 year old business owner -- often accesses from mobile/tablet)

---

### 2.9 QuickScan has no answer review before submission

**What:** The Quick Scan assessment (8 binary questions during onboarding) has no review screen. Users answer 8 questions and results are immediately calculated. If they misclicked one answer, they cannot go back. For questions that determine hundreds of thousands of dollars in value gap attribution, this is a trust issue.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/steps/QuickScanStep.tsx`

**Fix:** Add a review screen after the 8th question showing all answers with the ability to change any of them before submitting. Keep it lightweight -- a simple list with checkmarks and "Change" links.

**Effort:** M (4-6 hours)
**Flagged by:** Product Designer/UX (Critical #7)
**Metric:** Activation (incorrect assessment = wrong Value Gap = user doesn't trust the platform)

---

### 2.10 No valuation disclaimers on display surfaces

**What:** Valuations are shown without context about their limitations. No disclaimer that enterprise value is not the same as what the founder receives. No note about the estimation methodology. Only `/terms` has a disclaimer, which nobody reads.

**Where:** All valuation display components:
- HeroMetricsBar, ValuationBridge, ValueTimeline, IndustryPreviewStep, RiskResultsStep

**Fix:** Add a subtle but always-visible disclaimer below the main valuation: "Enterprise value estimate based on industry multiples and your Buyer Readiness Score. Actual transaction value depends on deal structure, market conditions, and due diligence. Not a formal appraisal." Style it as `text-xs text-muted-foreground` so it's present but not dominant. Also add an info icon tooltip on the valuation number that explains the calculation methodology in plain language.

**Effort:** M (4-6 hours across all surfaces)
**Flagged by:** Content Architect, Business Appraiser, Wealth Advisor
**Metric:** Trust + Legal risk

---

### 2.11 Settings still 4 separate pages (spec says tabs)

**What:** Settings has 4 separate pages (billing, company, organization, user). The spec calls for a single settings destination with tabs. Having 4 pages creates navigation confusion and is on the killed features list (#8).

**Where:**
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/(dashboard)/dashboard/settings/` (4 subdirectories)

**Fix:** Consolidate into one settings page with 4 tabs: Account, Company, Organization, Billing. Use the existing shadcn/ui Tabs component.

**Effort:** L (1-2 days)
**Flagged by:** Product Designer/UX, Content Architect
**Metric:** Polish (killed feature still alive in codebase)

---

### 2.12 estimateEbitdaFromRevenue can produce unrealistic margins

**What:** The EBITDA estimation formula `(Revenue * Revenue_Multiple_high) / EBITDA_Multiple_low` can imply 50-70% EBITDA margins for high-multiple industries. For Biotech: $10M revenue * 5.0 / 7.0 = $7.14M EBITDA (71% margin). This overstates estimated EBITDA for users who haven't entered actual financials.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/industry-multiples.ts`, lines 250-270

**Fix:** Cap the implied EBITDA margin at the industry's `ebitdaMarginHigh` value when available. If not available, cap at 35% (95th percentile for SMBs). Log when the cap is applied for debugging.

**Effort:** S (2 hours)
**Flagged by:** Financial Modeling Engineer (S-3)
**Metric:** Activation (overstated EBITDA = inflated first valuation = trust damage when corrected)

---

### 2.13 External signals cron is a stub

**What:** The cron job at `check-external-signals/route.ts` is a 21-line stub that does nothing. The signal types (tax liens, court dockets, UCC filings) are well-defined in the schema but no monitoring exists. Companies are blind to external threats that directly impact exit readiness.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/api/cron/check-external-signals/route.ts`

**Fix:** For now, remove the stub and the cron trigger so it doesn't waste compute. Add to the backlog as a Phase 3 (retention) feature when we have real data provider integrations. Don't pretend monitoring exists when it doesn't.

**Effort:** XS (disable the cron entry)
**Flagged by:** Applied AI Rules Engine (P1)
**Metric:** Integrity (stub code that pretends to work is worse than no code)

---

### 2.14 Subscription revenue analytics infrastructure missing

**What:** The platform cannot calculate MRR, NRR, churn rate, or LTV/CAC. The Workspace table is a mutable state machine -- when a user upgrades, the old plan is overwritten. There is no subscription event log, no MRR snapshot table, no churn event tracking. This blocks fundraising, investor reporting, and any data-driven growth work.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/prisma/schema.prisma` (Workspace model)

**Fix:** Add two tables: (1) `SubscriptionEvent` (workspaceId, eventType, previousPlanTier, newPlanTier, previousMrr, newMrr, deltaMrr, reason, stripeEventId, occurredAt). (2) `MrrSnapshot` (workspaceId, snapshotDate, planTier, mrr, isActive). Populate SubscriptionEvent from the existing Stripe webhook handler (which already processes subscription events). Add a nightly cron that creates MrrSnapshots from active subscriptions.

**Effort:** XL (4-5 days)
**Flagged by:** SaaS Data Architect (CRITICAL)
**Metric:** Business infrastructure (cannot run a SaaS business without subscription analytics)

---

### 2.15 Industry multiples are stale (2024-01-01)

**What:** The seed data has `effectiveDate = new Date('2024-01-01')` and `source = 'SMB M&A Market Data 2024'`. These multiples are over 2 years old and not sourced from a specific, verifiable database.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/prisma/seed-data/industry-multiples.ts`, line 21

**Fix:** (1) Update the multiples to 2025/2026 data from a citable source (DealStats, GF Data, or Pepperdine Private Capital Markets Project). (2) Add a `lastRefreshedAt` display to the UI so users know the data currency. (3) Add a quarterly reminder to update these.

**Effort:** L (1-2 days to research and update 70+ subsectors)
**Flagged by:** Buyer Intelligence Advisor, Financial Modeling Engineer (M-1)
**Metric:** Trust (sophisticated users will question 2-year-old multiples)

---

## TIER 3: DO LATER (Next 1-3 Months)

These are real issues that matter but don't block the current activation bottleneck. They become priorities as we move from activation to conversion and retention.

---

### 3.1 No entity type on Company model (C-Corp/S-Corp/LLC)

**What:** The Company model has no field for business entity type. This is the single highest-dollar tax variable in any exit. A C-Corp asset sale vs. S-Corp stock sale can mean a 15-20% difference in effective tax rate -- on a $5M exit, that's $750K-$1M.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/prisma/schema.prisma` (Company model)

**Fix:** Add `entityType` enum (C_CORP, S_CORP, LLC, PARTNERSHIP, SOLE_PROP) to the Company model. Ask for it during onboarding (or as an early assessment question). Use it to power tax-aware features in later phases.

**Effort:** S (schema change) + M (UI integration)
**Flagged by:** Wealth Advisor (RED priority #1)
**Metric:** Conversion (this is a Growth tier differentiator -- "see your after-tax proceeds")

---

### 3.2 No proceeds waterfall (enterprise value shown as what founder receives)

**What:** The platform shows enterprise value everywhere but never shows what the founder actually takes home after taxes, transaction costs, debt, and deal structure. A $5M valuation might yield $3.2M in net proceeds. Users making life decisions based on the enterprise value number are being misled.

**Where:** All valuation display surfaces (HeroMetricsBar, ValueTimeline, landing page)

**Fix:** Build a Proceeds Waterfall Calculator: Enterprise Value -> minus net debt -> minus estimated transaction costs (5-8%) -> minus estimated taxes (entity-type-dependent) -> equals Estimated Net Proceeds. Display it below or alongside the main valuation. This is a Growth tier feature -- show the waterfall to free users with blurred numbers below the enterprise value line.

**Effort:** XL (1 week including schema changes, calculator, and UI)
**Flagged by:** Wealth Advisor (RED priority #2), Financial Modeling Engineer (F-1)
**Metric:** Conversion (the "what I actually take home" number is the most compelling upgrade motivator) + Trust

---

### 3.3 Retirement calculator imports business value pre-tax

**What:** The retirement calculator imports the enterprise valuation directly. If the platform shows $5M and the retirement calculator says "you can retire," but the after-tax proceeds are $3.5M, the retirement answer could be dangerously wrong.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/retirement/retirement-calculator.ts`

**Fix:** Apply an estimated tax haircut when importing business value to retirement. Use a conservative default (30% federal + state capital gains + NIIT) or, if entity type is available, use a more precise estimate. Display both "Enterprise Value" and "Estimated After-Tax Proceeds" in the retirement assets.

**Effort:** M (6-8 hours)
**Flagged by:** Wealth Advisor (YELLOW priority #1)
**Metric:** Trust (wrong retirement answer is a liability)

---

### 3.4 Auto-DCF uses book equity for WACC capital structure

**What:** WACC should use market-value weights, not book values. Book equity is frequently negative or wildly different from fair market value for SMBs. The code falls back to 80/20 when equity is negative, but the primary path is unreliable.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/auto-dcf.ts`, lines 147-165

**Fix:** Default to target capital structure based on industry/size (which the 80/20 default already approximates) rather than attempting to derive from book values. Use the multiple-based EV as a proxy for equity market value only when it's available and reasonable.

**Effort:** M (4-6 hours)
**Flagged by:** Financial Modeling Engineer (S-6)
**Metric:** Trust (DCF is a Growth+ feature used by more sophisticated users who will notice)

---

### 3.5 Add tax planning task templates

**What:** The task template system has 22 templates across 6 BRI categories but zero templates for tax planning, entity structure review, QSBS verification, estate planning, or advisor team assembly. These have the highest dollar impact per hour of any tasks a founder can do.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/playbook/task-templates.ts`

**Fix:** Add 6-8 tax/wealth planning task templates:
- "Verify QSBS eligibility with tax advisor" (LEGAL_TAX, $1M+ impact)
- "Evaluate entity structure for tax optimization" (LEGAL_TAX, $380K-$840K impact)
- "Assemble professional advisory team" (PERSONAL, preventive)
- "Review/create estate plan" (PERSONAL, varies)
- "Evaluate pre-exit gifting strategies" (PERSONAL, $400K-$800K estate tax savings)
- "Estimate after-tax proceeds from sale" (FINANCIAL, preventive)

**Effort:** L (1-2 days to write templates + connect to BRI questions)
**Flagged by:** Wealth Advisor (Tier 2 priority #5)
**Metric:** Retention (higher-value tasks = more perceived value = lower churn)

---

### 3.6 PersonalFinancials.organizationId should be userId

**What:** The PersonalFinancials model is scoped to Organization, but personal financial data (retirement assets, net worth, etc.) is inherently tied to a person, not an organization. If a founder has two companies in different organizations, their PFS should follow them.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/prisma/schema.prisma` (PersonalFinancials model)

**Fix:** Change `organizationId` to `userId`. Add a migration to remap existing records (look up the user via the organization membership).

**Effort:** M (4-6 hours including migration)
**Flagged by:** Strategic Spec Review (2026-02-11, APPROVED)
**Metric:** Data integrity

---

### 3.7 Add mid-year convention option to DCF

**What:** The DCF uses end-of-year discounting exclusively. In M&A practice, mid-year convention is standard (cash flows come throughout the year). This systematically understates DCF enterprise value by approximately 7%.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/dcf-calculator.ts`, lines 86-92

**Fix:** Add `useMidYearConvention: boolean` to DCF inputs (default `true`). When true, use `years - 0.5` as the discount exponent.

**Effort:** S (2 hours)
**Flagged by:** Financial Modeling Engineer (S-8)
**Metric:** Trust (DCF users expect mid-year convention)

---

### 3.8 Assessment ARIA semantics missing

**What:** Assessment answer options are rendered as generic buttons but function as radio selections. Screen readers announce them as buttons, not as selectable options in a group. This affects accessibility compliance and users with disabilities.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/diagnosis/CategoryAssessmentFlow.tsx`

**Fix:** Add `role="radiogroup"` to the options container and `role="radio"` + `aria-checked` to each option. Add `aria-label` describing the question being answered.

**Effort:** S (1-2 hours)
**Flagged by:** Product Designer/UX (Critical #9)
**Metric:** Compliance + Activation (accessibility barriers reduce addressable market)

---

### 3.9 Customer concentration + owner dependency double-counting

**What:** The BRI scoring counts customer concentration risk in the FINANCIAL category AND the assessment may also surface it via owner-dependent customer relationships in TRANSFERABILITY. Similarly, owner dependency appears in both core factors (ownerInvolvement) and TRANSFERABILITY assessment questions. This double-penalizes certain risk profiles.

**Where:**
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/multiple-adjustments.ts` (concentration adjustment)
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/prisma/seed-data/bri-questions.ts` (multiple questions touching same risk)

**Fix:** Audit the full list of adjustments and BRI questions for overlap. Where the same risk factor is captured in both the multiple adjustment engine AND the BRI assessment, reduce the weight of one. Document which mechanism "owns" each risk factor.

**Effort:** L (1-2 days of analysis + calibration)
**Flagged by:** Applied AI Rules Engine (P1)
**Metric:** Trust (double-penalized users see unfairly low valuations)

---

### 3.10 normalizeDecimalRate over-aggressively auto-corrects in comparable engine

**What:** The function auto-divides values by 100 when `|value| > 1 && |value| <= 100`. But a legitimate 150% growth rate (1.5) gets divided by 100 to become 0.015 (1.5%), destroying high-growth company metrics.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/comparable-engine.ts`, lines 443-463

**Fix:** Remove the heuristic normalization. Instead, specify the expected format explicitly in the AI prompt ("return all rates as decimals: 15% growth = 0.15") and validate that returned values fall within expected bounds (e.g., growth rate between -0.5 and 5.0, margin between -1.0 and 1.0). Flag outliers rather than auto-correcting.

**Effort:** S (2-3 hours)
**Flagged by:** Financial Modeling Engineer (M-4)
**Metric:** Trust (wrong comparable metrics)

---

### 3.11 IndustryPreviewStep back button uses window.history.back()

**What:** The back button on the industry preview step (step 3 of onboarding) calls `window.history.back()`, which could navigate the user out of the onboarding flow entirely if they arrived from an external link.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/steps/IndustryPreviewStep.tsx`

**Fix:** Replace `window.history.back()` with the explicit `goToStep(2)` callback from OnboardingFlow.

**Effort:** XS (15 minutes)
**Flagged by:** Product Designer/UX (Critical #1)
**Metric:** Activation (user accidentally leaves onboarding)

---

### 3.12 Sensitivity table shows 0 for invalid WACC/growth combos

**What:** When WACC equals terminal growth (mathematical singularity), the DCF sensitivity table shows `enterpriseValue: 0` instead of marking the cell as invalid. Users may interpret 0 as "worthless" rather than "cannot compute."

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/dcf-calculator.ts`, lines 220-229

**Fix:** Return `null` for invalid combinations and render "N/A" in the UI cell with a tooltip explaining why.

**Effort:** S (1-2 hours)
**Flagged by:** Financial Modeling Engineer (M-7)
**Metric:** Trust (DCF users are sophisticated and will notice)

---

### 3.13 ebitdaMarginLow/High stored as percentages, not decimals

**What:** Seed data stores margins as percentages (15.0 for 15%) while the rest of the codebase uses decimals (0.15). The `ebitda-bridge.ts` correctly converts, but this is a trap for future developers.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/prisma/seed-data/industry-multiples.ts`

**Fix:** Either convert seed data to decimals (0.15) and update all consumers, or rename the fields to `ebitdaMarginLowPct` and `ebitdaMarginHighPct` to make the unit explicit.

**Effort:** M (4-6 hours for either approach)
**Flagged by:** Financial Modeling Engineer (M-2)
**Metric:** Developer experience (reduces future bugs)

---

### 3.14 Multiple adjustment stacking has no ceiling

**What:** Size, growth, SaaS, margin, and concentration adjustments stack additively with a floor of 0.3x but no ceiling. A high-growth SaaS company with premium margins could get a 1.6x multiplier on the base EBITDA multiple, producing unrealistically high valuations.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/multiple-adjustments.ts`, lines 252-258

**Fix:** Add a ceiling of 1.5x (50% maximum premium above base multiple). Document the rationale.

**Effort:** XS (30 minutes)
**Flagged by:** Financial Modeling Engineer (M-10)
**Metric:** Trust (overstated valuations for edge-case companies)

---

### 3.15 Settings page uses hardcoded colors

**What:** Settings pages use hardcoded hex colors instead of CSS variables from the design system, breaking dark mode and creating maintenance debt.

**Where:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/(dashboard)/dashboard/settings/` (multiple files)

**Fix:** Replace all hardcoded colors with CSS variable references (`text-foreground`, `bg-card`, `border-border`, etc.).

**Effort:** M (3-4 hours)
**Flagged by:** Product Designer/UX (Critical #10)
**Metric:** Polish

---

## TIER 4: BACKLOG (Evaluate When Bottleneck Shifts)

These are real issues or feature gaps that are not aligned with the current activation bottleneck. They become relevant as we move into conversion, retention, and expansion phases.

---

### 4.1 No EV-to-equity bridge in multiple-based valuation
The primary valuation shows enterprise value without deducting net debt. Important for debt-heavy companies. Build when we add the Proceeds Waterfall (3.2).
**Flagged by:** Financial Modeling Engineer (F-1), Wealth Advisor

### 4.2 No working capital adjustment modeling
Buyers adjust purchase price for above/below-normal working capital. The WC calculation exists in `financial-calculations.ts` but isn't connected to the valuation pipeline. Build when Deal Room becomes active.
**Flagged by:** Financial Modeling Engineer (F-2), Wealth Advisor

### 4.3 No Quality of Earnings (QoE) framework
The current system allows free-form EBITDA adjustments without defensibility scoring. Build a framework that categorizes adjustments as "universally accepted," "commonly accepted," or "aggressive." Build for Exit-Ready tier.
**Flagged by:** Financial Modeling Engineer (F-3)

### 4.4 No transaction cost estimate
No deduction for investment banker fees (5-10%), legal fees ($100K-$500K), etc. Build as part of the Proceeds Waterfall (3.2).
**Flagged by:** Financial Modeling Engineer (F-4), Wealth Advisor

### 4.5 No tax impact of sale structure modeling
Asset sale vs. stock sale tax implications are not modeled. Depends on entity type (3.1) being implemented first. Build for Growth tier.
**Flagged by:** Financial Modeling Engineer (F-5), Wealth Advisor

### 4.6 No deal structure modeling (earnouts, seller notes, escrow)
No modeling of how deal structure affects actual proceeds and timing. Build for Exit-Ready tier / Deal Room.
**Flagged by:** Wealth Advisor (RED priority #5)

### 4.7 No estate planning content or questions
Zero estate planning presence in the platform. Pre-exit gifting of minority interests with valuation discounts is one of the highest-value strategies. Build as PERSONAL BRI expansion + task templates.
**Flagged by:** Wealth Advisor (RED priority #3)

### 4.8 No post-exit planning content
No guidance on 90-day rule, wealth preservation, diversification, identity transition. Build as AI Coach content + Growth tier feature.
**Flagged by:** Wealth Advisor (RED priority #6)

### 4.9 No professional team assessment
Platform doesn't ask if the founder has a CPA, estate attorney, wealth advisor, M&A attorney. Build as PERSONAL assessment expansion.
**Flagged by:** Wealth Advisor (YELLOW priority #7)

### 4.10 No revenue quality scoring beyond revenue model type
Missing NRR, LTV/CAC, revenue concentration by product, contractual backlog. Build when financial data depth supports it.
**Flagged by:** Financial Modeling Engineer (F-6)

### 4.11 No cross-company benchmarking infrastructure
Cannot tell users their BRI score percentile vs. peers. Needs k-anonymity framework and enough data volume. Build at $500K+ MRR when sample sizes support it.
**Flagged by:** SaaS Data Architect

### 4.12 No revenue trend detection / assessment regression detection
The rules engine doesn't detect revenue trends or BRI score regression. Build for retention phase.
**Flagged by:** Applied AI Rules Engine

### 4.13 No industry-specific BRI weights
All industries use the same BRI category weights. A manufacturing company should weight OPERATIONAL higher; a SaaS company should weight FINANCIAL higher. Build when we have enough data to calibrate.
**Flagged by:** Applied AI Rules Engine

### 4.14 Legacy routes still routable
Playbook, action-plan, data-room, deal-tracker, contacts, value-builder, developer/*, global/*, assessment/* routes still exist but are not linked. Clean up to prevent confusion.
**Flagged by:** Previous audit

### 4.15 Monte Carlo still in codebase
`src/lib/valuation/monte-carlo.ts` is a killed feature that should be removed to avoid confusion.
**Flagged by:** Previous audit

### 4.16 Orphaned onboarding step components
8 step components from a previous onboarding version exist but are not referenced. Remove dead code.
**Flagged by:** Product Designer/UX

### 4.17 NIIT (3.8%) not modeled in retirement tax calculations
The Net Investment Income Tax surcharge applies to most business exit proceeds. Missing from retirement calculator.
**Flagged by:** Wealth Advisor (YELLOW priority #2)

### 4.18 No Accountability Partner system
Referenced in specs but never built. Evaluate for retention phase.
**Flagged by:** Previous audit

---

## SUMMARY STATS

| Tier | Items | Estimated Total Effort |
|------|-------|----------------------|
| DO NOW | 13 | ~8-10 dev days |
| DO NEXT | 15 | ~25-30 dev days |
| DO LATER | 15 | ~20-25 dev days |
| BACKLOG | 18 | ~40+ dev days |

### Top 5 Items by Impact-to-Effort Ratio

1. **1.2** Hardcoded $150K market salary (XS effort, $750K valuation accuracy impact)
2. **1.5** alphaConstant schema default mismatch (XS effort, prevents silent data corruption)
3. **2.3** DCF terminal value year 5 hardcode (XS effort, fixes DCF for all non-5-year projections)
4. **1.11** RiskResultsStep divergent labels (XS effort, fixes onboarding consistency)
5. **3.11** IndustryPreviewStep back button (XS effort, prevents accidental onboarding abandonment)

### Agent Contribution Summary

| Agent | Unique Findings Adopted | Key Contribution |
|-------|------------------------|------------------|
| Financial Modeling Engineer | 14 | Valuation formula bugs, DCF issues, EBITDA estimation |
| Wealth Advisor | 9 | Tax/estate/proceeds gaps, entity type, retirement accuracy |
| Product Designer/UX | 10 | Cognitive overload, accessibility, interaction patterns |
| Applied AI Rules Engine | 6 | Task priority bug (P0), weight duplication, double-counting |
| SaaS Data Architect | 2 | Subscription analytics infrastructure (critical for business) |
| Content/Knowledge Architect | 4 | Naming consistency, formatting, disclaimers |
| Customer Success Engineer | 3 | Silent failures, empty states, error handling |
| Growth Engineer | 2 | Onboarding analytics gap (corrected re: Stripe/email) |
| Business Appraiser | 2 | Owner comp issues, disclaimer requirements |
| Buyer Intelligence Advisor | 2 | Stale multiples, potential value framing |
| Project Manager | 0 | Organizational synthesis (no new findings) |
| Product Manager | 0 | Prioritization synthesis (no new findings) |

---

## CORRECTIONS AND NOTES

### Confirmed corrections from Phase 1 review (still valid)
- **Stripe IS fully wired** with real price IDs, checkout sessions, webhooks, and customer portal. Any finding that says Stripe is "stubbed" is wrong.
- **Email infrastructure IS extensive** with 27 templates via Resend, cron jobs for drip campaigns, weekly digests, task reminders, inactivity detection, and drift reports. Any finding that says "only 2 emails" is wrong.
- **BRI driving valuation is intentional design**, not a bug. The non-linear discount formula (`(1 - BRI)^1.4`) is the product's core mechanism.

### Items from agent reviews that were NOT included and why
- **Wealth Advisor's estate planning as "RED priority"**: Moved to backlog because estate planning is not the current activation bottleneck. It's a genuine product gap but not where we need to focus engineering effort right now.
- **SaaS Data Architect's BenchmarkAggregate table**: Great idea but requires significant data volume. Premature to build.
- **Applied AI Rules Engine's "no feedback loop"**: Valid concern about task effectiveness measurement, but this is a Phase 3 retention optimization.
- **Financial Modeling Engineer's ALPHA justification request**: The 1.4 constant was calibrated against M&A advisor feedback. Documenting the rationale is good but not urgent.
- **Multiple agents flagging "no SDE education"**: Valid for sub-$3M companies but not blocking activation. Add to content roadmap.
