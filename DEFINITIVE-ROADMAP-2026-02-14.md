# Exit OSx: Definitive Product Roadmap
## Synthesized from 13 Specialist Agent Reviews
**Date:** February 14, 2026
**Author:** Principal Product Manager
**Phase:** Phase 1 ($0-$100K MRR) -- Bottleneck = ACTIVATION

---

## Executive Summary

Thirteen specialist agents reviewed the entire Exit OSx codebase. Together they produced 200+ findings. This document distills them into a single, sequenced, dependency-aware roadmap with hard prioritization calls and explicit reasoning for every decision.

**The platform state in one sentence:** The foundation is strong -- the valuation engine is sound, Stripe is fully wired, email infrastructure is mature, the five-mode architecture works -- but the product has bugs that produce wrong numbers, an activation funnel that leaks users at critical moments, and financial modeling gaps that undermine credibility with buyers.

### Agent Corrections (Still Valid)

Before the roadmap, three corrections from the first review remain important:

1. **Stripe IS fully wired.** Real price IDs, Checkout Sessions, webhook handlers for all lifecycle events. The Growth Engineer was wrong.
   - Files: `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/stripe.ts`, `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/api/stripe/checkout/route.ts`, `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/api/stripe/webhook/route.ts`

2. **Email infrastructure IS extensive.** 27 templates, 7-email trial drip, Resend + rate limiting. The real gap is Foundation-tier (non-trial) engagement emails, not missing infrastructure.
   - Files: `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/email/service.ts`, `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/api/cron/trial-drip/route.ts`

3. **BRI driving valuation is INTENTIONAL.** This is the product insight, not a bug. Readiness IS value.

### Cross-Agent Consensus Themes

| Theme | Agents Who Flagged | Severity |
|---|---|---|
| Task priority bug (array index not score) | AI Rules Engine, UX Designer | P0 -- ALL task priorities wrong |
| Owner comp $150K hardcode | Financial Modeling, Business Appraiser, Product Manager | P0 -- up to $750K valuation error |
| Negative EBITDA produces negative valuations | Financial Modeling, Business Appraiser, AI Rules Engine | P0 -- nonsensical user-facing output |
| alphaConstant schema default mismatch (0.40 vs 1.4) | Financial Modeling | P0 -- latent data integrity bomb |
| Foundation paywall surprise | Customer Success, Product Lead, Product Manager | P0 -- activation killer |
| Onboarding analytics = zero events | Growth Engineer, Product Lead, Product Manager | P0 -- flying blind |
| Task generation silent failure | Customer Success, Product Lead, Product Manager | P0 -- broken core loop |
| Score name inconsistency (4 names for 1 score) | Content Architect, Product Lead, Product Manager | P1 -- trust erosion |
| Valuation disclaimers missing | Content Architect, Business Appraiser, Wealth Advisor | P1 -- regulatory/trust risk |
| BRI weight duplication across 6+ files | AI Rules Engine, Financial Modeling | P1 -- divergence risk |
| No entity type on Company model | Wealth Advisor | P1 -- highest-dollar tax variable missing |
| formatCurrency duplicated 8+ times | UX Designer, Content Architect | P1 -- trust erosion |
| Dashboard cognitive overload | UX Designer | P1 -- activation friction |
| Default core factors inflate initial valuation | UX Designer | P1 -- trust-damaging correction |
| No SaaS revenue metrics (MRR, churn, NRR) | SaaS Data Architect | P1 -- blocks fundraising |
| Comparable engine hallucination risk | Business Appraiser, Financial Modeling, AI Rules Engine | P2 -- liability risk |
| No proceeds waterfall (EV shown, never after-tax) | Wealth Advisor | P2 -- misleading omission |
| No working capital analysis | Business Appraiser, Buyer Intelligence | P2 -- deal mechanics gap |
| No estate planning content | Wealth Advisor | P3 -- future value |

---

## NOW: Sprint 1-2 (Weeks 1-4)

These items are actively producing wrong numbers, losing users, or blocking measurement. Every item here either fixes a bug that produces incorrect output, patches a hole in the activation funnel, or establishes the measurement baseline we need for everything else.

### NOW-1: Fix Task Priority Bug (P0)
**What:** Task priority score is calculated from array index position, not actual impact score. The conditional `indexOf(task) < tasksToCreate.length` is always true, making the entire 25-level priority matrix meaningless.
**Why:** EVERY task in the system has wrong priority. The "most valuable thing to do next" is effectively random. This is the core value proposition of the Actions mode.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/playbook/generate-tasks.ts` lines 276-278
**Fix:** Replace array index with actual task score from the priority matrix. Backfill existing tasks.
**Effort:** S (4 hours code + 2 hours backfill script)
**Dependencies:** None
**Flagged by:** AI Rules Engine (P0), UX Designer (Critical)

### NOW-2: Fix Owner Compensation Hardcode (P0)
**What:** Assessment complete route hardcodes market salary to $150K. The recalculate-snapshot route correctly uses revenue-based bands ($80K-$400K). This creates up to $750K valuation discrepancy depending on which code path runs.
**Why:** The assessment completion is the FIRST time a founder sees their valuation. If it is overstated by $750K relative to subsequent recalculations, trust is destroyed permanently.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/api/assessments/[id]/complete/route.ts` line 198
**Fix:** Import and use `getMarketSalary(revenueSizeCategory)` from recalculate-snapshot.ts. Add the bi-directional adjustment (below-market comp should REDUCE EBITDA, not just ignore it).
**Effort:** S (2 hours)
**Dependencies:** None
**Flagged by:** Financial Modeling Engineer (C-1), Business Appraiser (1D), Product Manager (NOW-5)

### NOW-3: Guard Against Negative EBITDA Valuations (P0)
**What:** `calculateValuation()` has no guard against negative adjustedEbitda. Negative EBITDA produces negative currentValue and potentialValue shown to founders.
**Why:** "Your company is worth -$500,000" is both mathematically wrong (negative EBITDA companies still have enterprise value) and catastrophically trust-destroying.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/calculate-valuation.ts` lines 123-153
**Fix:** Add floor at zero for EBITDA-based valuation. When EBITDA <= 0, switch to revenue-based valuation with clear messaging: "Your company has negative operating earnings. Showing revenue-based estimate instead."
**Effort:** S (4 hours)
**Dependencies:** None
**Flagged by:** Financial Modeling Engineer (C-4), AI Rules Engine (P1), Business Appraiser (implicit)

### NOW-4: Fix alphaConstant Schema Default (P0)
**What:** Prisma schema defaults alphaConstant to 0.40. Code uses 1.4. These differ by 3.5x. Any database operation that relies on the schema default (migration, manual insert, seeding) produces silently wrong discount curves.
**Why:** BRI 50% with alpha=0.40 gives 13% discount. BRI 50% with alpha=1.40 gives 35% discount. A latent data integrity bomb.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/prisma/schema.prisma` line 412
**Fix:** Change `@default(0.40)` to `@default(1.40)`. Add migration. Audit existing snapshots for any with alpha=0.40 and recalculate.
**Effort:** XS (1 hour + migration)
**Dependencies:** None
**Flagged by:** Financial Modeling Engineer (C-2)

### NOW-5: Fix Decimal(4,2) Overflow for Multiples (P0)
**What:** All multiple fields stored as Decimal(4,2), which means max value 99.99. DCF implied multiples can exceed this (e.g., $50M EV / $400K EBITDA = 125x), causing Prisma write errors that crash the snapshot pipeline.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/prisma/schema.prisma` lines 396-397, 406-408, 423
**Fix:** Change to `@db.Decimal(6,2)` for all multiple fields. Add pre-write validation clamping.
**Effort:** XS (1 hour + migration)
**Dependencies:** None
**Flagged by:** Financial Modeling Engineer (C-3)

### NOW-6: Fix Foundation Paywall Surprise (P0)
**What:** Foundation users complete onboarding, get excited by valuation reveal, click to Actions, and hit a locked screen with no value. This is a bait-and-switch experience.
**Why:** This is the #1 activation killer. The user's emotional momentum peaks at the Value Gap reveal. The next click should deepen engagement, not slam a door.
**Fix:** Show top 3 tasks with dollar impact visible (but detail locked). Frame upgrade as "Unlock your personalized action plan" with the specific dollar value they would recover. Never show an empty/locked state with no value preview.
**Effort:** S (1 day)
**Dependencies:** None
**Flagged by:** Customer Success (Critical), Product Lead (F1-adjacent), Product Manager (NOW-1)

### NOW-7: Onboarding Analytics Instrumentation (P0)
**What:** OnboardingFlow.tsx (765 lines) has ZERO analytics.track() calls. We cannot measure where users drop off in the 6-step onboarding flow.
**Why:** We are in Phase 1 (activation bottleneck). We cannot optimize what we cannot measure. The analytics hooks and typed events already exist -- this is pure wiring work.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/OnboardingFlow.tsx`
**Fix:** Add tracking calls at each step entry/exit, QuickScan completion rate, DeepDive skip/partial/complete, time-to-valuation-reveal, CTA clicks, task generation success/failure. Use existing `useTrack()` hook.
**Effort:** S (4 hours)
**Dependencies:** None
**Flagged by:** Growth Engineer (Critical Gap #1), Product Lead (F2), Product Manager (NOW-2)

### NOW-8: Task Generation Failure Recovery (P0)
**What:** DeepDiveStep.tsx catches task generation errors and continues to dashboard silently. User arrives at Actions page with zero tasks.
**Why:** A user who completed onboarding, saw their Value Gap, got excited, then arrives at an empty Actions page will never return. The core loop is broken at the moment of peak emotional momentum.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/steps/DeepDiveStep.tsx` lines 186-188
**Fix:** (a) Add retry with exponential backoff (3 attempts). (b) On failure: show loading state then error with manual retry. (c) Add server-side cron to detect companies with snapshots + 0 tasks and regenerate. (d) Fire analytics event on failure.
**Effort:** M (1.5 days)
**Dependencies:** NOW-7 (analytics for monitoring)
**Flagged by:** Customer Success (Critical), Product Lead (F1), Product Manager (NOW-3)

### NOW-9: Score Name Standardization (P1)
**What:** The product uses 4 different names: "Exit Score" (landing), "Exit Readiness Score" (pricing), "Buyer Readiness Score" (onboarding), "BRI Score" (dashboard). Also, RiskResultsStep.tsx hardcodes its own RISK_LABELS that diverge from canonical bri-categories.ts.
**Why:** A 50-year-old founder who sees three different names for the same number stops trusting the platform. This is the cheapest trust fix available.
**Files:** Landing page, pricing page, RiskResultsStep.tsx, pricing.ts, bri-categories.ts
**Fix:** Standardize on "Buyer Readiness Index (BRI)" everywhere. Import labels from bri-categories.ts instead of hardcoding.
**Effort:** XS (2 hours)
**Dependencies:** None
**Flagged by:** Content Architect (#1 priority), Product Lead (F3, F4), Product Manager (NOW-6)

### NOW-10: Valuation Disclaimers + Label Accuracy (P1)
**What:** Dollar valuations displayed with confetti animations and zero disclaimers. "Current Value" is actually enterprise value before debt, taxes, and working capital. "Potential Value" has no appraisal basis.
**Why:** Given FINRA licensing exposure and the platform's advisory positioning, every valuation display needs a disclaimer. A founder who sees "$4.2M" and thinks that is take-home proceeds is being misled. Regulatory and trust risk.
**Fix:** (a) "Current Value" becomes "Estimated Enterprise Value" with EV tooltip. (b) "Potential Value" becomes "Industry Ceiling" with explanation. (c) Add micro-disclaimer beneath all valuation displays: "Estimated enterprise value based on industry multiples and self-reported inputs. Not a formal valuation opinion."
**Effort:** S (4 hours)
**Dependencies:** None
**Flagged by:** Content Architect (#2 priority), Business Appraiser (1A), Wealth Advisor (Section 2)

### NOW-11: BRI Weight Single Source of Truth (P1)
**What:** BRI category weights appear independently in 6+ source files. `improve-snapshot-for-task.ts` defines its own DEFAULT_CATEGORY_WEIGHTS and ignores company-specific weights. If any file is updated without the others, BRI scoring diverges.
**Files:** `bri-weights.ts`, `bri-categories.ts`, `bri-scoring.ts`, `improve-snapshot-for-task.ts`, `recalculate-snapshot.ts`, `generate-tasks.ts`
**Fix:** Establish single canonical source in `bri-weights.ts`. All other files import from it. `improve-snapshot-for-task.ts` uses `getBriWeightsForCompany()` like `recalculate-snapshot.ts` does.
**Effort:** S (4 hours)
**Dependencies:** None
**Flagged by:** AI Rules Engine (P1), Financial Modeling Engineer (S-7)

### NOW-12: Default Core Factors Fix (P1)
**What:** Onboarding sets all core factors to optimal values (Subscription SaaS, Excellent margins, Low labor intensity, Asset light, Minimal owner involvement). When users later correct these, valuation drops significantly -- trust-damaging "bait and switch."
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/OnboardingFlow.tsx` lines 274-282
**Fix:** Set defaults to MODERATE/middle values across all factors. A plumber should not see SaaS-tier valuation on first load.
**Effort:** XS (1 hour)
**Dependencies:** None
**Flagged by:** UX Designer (C6 Critical)

### NOW-13: BRI Weight Normalization Guard (P1)
**What:** `calculateWeightedBriScore()` never validates weights sum to 1.0. Custom weights summing to >1.0 produce briScore >1.0, which feeds into `(1 - briScore)^1.4` with a negative base, producing NaN that propagates through the entire valuation.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/bri-scoring.ts` lines 105-115
**Fix:** Validate weights sum to 1.0 (within 0.01 tolerance). If not, normalize by dividing each weight by the sum of all weights.
**Effort:** XS (1 hour)
**Dependencies:** None
**Flagged by:** Financial Modeling Engineer (S-2), AI Rules Engine (implicit)

---

**NOW Sprint Summary:**
- 13 items total
- 8 are P0 (produce wrong numbers or break core user flows)
- 5 are P1 (erode trust or create latent risks)
- Estimated total effort: ~7-8 engineering days
- Zero new features. All fixes to existing functionality.
- After this sprint: every number shown to users is correct, the activation funnel is measurable, and the core loop (assess -> score -> task -> act) works reliably.

---

## NEXT: Sprint 3-6 (Weeks 5-12)

With correct numbers, measurable funnel, and working core loop, we shift to conversion optimization and early retention. These items make users want to stay and pay.

### NEXT-1: formatCurrency Centralization (P1)
**What:** `formatCurrency()` duplicated 8+ times with inconsistent output ($350K vs $350k). In a financial product, inconsistent currency formatting erodes trust.
**Files:** HeroMetricsBar, RiskResultsStep, IndustryPreviewStep, ValuationBridge, NextMoveCard, ProgressContext, ActiveTaskCard, TaskCompletionDialog
**Fix:** Single utility at `src/lib/utils/format-currency.ts`. Replace all duplicates. Enforce via lint rule.
**Effort:** S (3 hours)
**Dependencies:** None
**Flagged by:** UX Designer (#2 most impactful), Content Architect

### NEXT-2: Visible Valuation Impact from Task Completion (P1)
**What:** When a task is completed, nothing visibly changes. The ValuationSnapshot does not update until next full assessment. The dopamine loop is broken.
**Why:** This is the #1 retention risk. Users complete tasks but see no movement. They stop coming back.
**Fix:** (a) Inline celebration on task complete: "BRI +X points. Value +$Y." (b) Value Timeline annotation for completed tasks. (c) Dollar attribution visible on completed task cards.
**Effort:** M (2 days)
**Dependencies:** NOW-1 (task priorities must be correct first)
**Flagged by:** Customer Success (Section 3), Product Manager (NEXT-1)

### NEXT-3: Dashboard Hierarchy Refactor (P1)
**What:** Value home page renders 10+ sections with NextMoveCard buried 6-7 sections down. A founder opening the dashboard answers: "What is my business worth and what should I do next?" The answer is buried.
**Fix:** Restructure to 3 tiers: (1) Hero: BRI Score + Estimated Value + Value Gap. (2) Action: NextMoveCard immediately below hero. (3) Detail: Everything else below the fold or in expandable sections.
**Effort:** M (1.5 days)
**Dependencies:** NOW-10 (labels must be correct first)
**Flagged by:** UX Designer (C1 Critical, C2 Critical, C3 Critical)

### NEXT-4: Foundation-Tier Engagement Emails (P1)
**What:** Trial drip sequence exists (7 emails) but Foundation-tier (non-trial) users who never upgrade have no engagement sequence. They complete onboarding and hear nothing.
**Fix:** Build Foundation engagement sequence: Day 1 (Value Gap teaser), Day 3 (Your #1 weakness + buyer concern), Day 7 (social proof), Day 14 (drift/inactivity framing), Day 30 (value decay alert).
**Effort:** M (1.5 days -- templates exist, need new sequence logic)
**Dependencies:** None
**Flagged by:** Product Manager (NEXT-2), Growth Engineer (Section 4)

### NEXT-5: TaskCompletionDialog Accessibility Fix (P1)
**What:** Uses raw div overlay with no focus trapping, keyboard escape, or aria-modal. This is the most consequential user action in the product.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/actions/TaskCompletionDialog.tsx`
**Fix:** Refactor to use the existing Dialog component pattern (Radix UI). Add focus trap, keyboard escape, aria-modal, aria-labelledby.
**Effort:** S (3 hours)
**Dependencies:** None
**Flagged by:** UX Designer (C7 Critical)

### NEXT-6: MobileNav Touch Fix (P1)
**What:** MobileNav uses `onMouseLeave` and `onMouseEnter` for closing, which do not fire on touch devices. Nav stays open.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/layout/MobileNav.tsx`
**Fix:** Replace mouse events with click-outside-to-close pattern. Add touch event handlers.
**Effort:** XS (2 hours)
**Dependencies:** None
**Flagged by:** UX Designer (C8 Critical)

### NEXT-7: Assessment Context Enhancement (P2)
**What:** QuestionCard has helpText and buyerLogic data available but does not render them. Users answer assessment questions without understanding why they matter.
**Fix:** Render helpText inline. Add expandable "Why buyers care" section using existing buyerLogic data.
**Effort:** S (3 hours)
**Dependencies:** None
**Flagged by:** Product Manager (NEXT-3), Buyer Intelligence Advisor

### NEXT-8: Skip-to-Dashboard Guard Rails (P2)
**What:** Users can skip from Step 3 to dashboard with no BRI score, no tasks, no value. Dashboard shows confusing empty states.
**Fix:** (a) If user skips assessment: guided state on dashboard with prominent CTA to complete. (b) Remove skip option from Step 3, or replace with "I'll do this later" that still generates a minimal snapshot.
**Effort:** S (4 hours)
**Dependencies:** NOW-8 (task generation must be reliable)
**Flagged by:** Customer Success (Critical activation cliff), Product Manager (NEXT-5)

### NEXT-9: Onboarding IndustryPreviewStep Back Button Fix (P2)
**What:** Step 3 uses `window.history.back()` instead of `goToStep()`, causing unpredictable navigation.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/steps/IndustryPreviewStep.tsx` line 123
**Fix:** Replace with `goToStep(2)`.
**Effort:** XS (15 minutes)
**Dependencies:** None
**Flagged by:** UX Designer (C4 Critical)

### NEXT-10: SaaS Revenue Metrics Infrastructure (P2)
**What:** Cannot calculate MRR, NRR, churn, LTV/CAC. Workspace table is mutable state machine that overwrites plan history. This blocks fundraising conversations.
**Fix:** Add SubscriptionEvent and MrrSnapshot tables. Wire Stripe webhooks to create SubscriptionEvent records. Build nightly MrrSnapshot cron.
**Effort:** L (5-6 days)
**Dependencies:** None (Stripe already wired)
**Flagged by:** SaaS Data Architect (grade: F for revenue metrics)

### NEXT-11: DCF Terminal Value Year Bug (P2)
**What:** Terminal value hardcoded to year 5 even when growth rates array has different length. If 3 growth rates provided, there is a 2-year gap where no value is captured.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/dcf-calculator.ts` line 170
**Fix:** Replace `5` with `inputs.growthRates.length`.
**Effort:** XS (30 minutes)
**Dependencies:** None
**Flagged by:** Financial Modeling Engineer (S-5)

### NEXT-12: EBITDA Improvement Weight Normalization Fix (P2)
**What:** Improvement calculation divides by 0.25 (FINANCIAL category weight) instead of actual average weight (0.167). Systematically distorts improvement potential.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/recalculate-snapshot.ts` line 70
**Fix:** Divide by `(1 / categories.length)` or remove the normalization factor entirely.
**Effort:** XS (30 minutes)
**Dependencies:** None
**Flagged by:** Financial Modeling Engineer (S-4)

### NEXT-13: Assessment ARIA Radio Semantics (P2)
**What:** Assessment options announced as generic buttons to screen readers, not as selectable radio options.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/diagnosis/CategoryAssessmentFlow.tsx`
**Fix:** Add role="radiogroup" and role="radio" with aria-checked.
**Effort:** XS (1 hour)
**Dependencies:** None
**Flagged by:** UX Designer (C9 Critical)

### NEXT-14: Login Event Misname Fix (P2)
**What:** Successful logins trigger `signup_submit` instead of `login_success`, polluting funnel metrics.
**File:** `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/(auth)/login/page.tsx`
**Fix:** Rename event to `login_success`.
**Effort:** XS (15 minutes)
**Dependencies:** None
**Flagged by:** Growth Engineer (Gap #3)

---

**NEXT Sprint Summary:**
- 14 items total
- Mix of P1 (conversion/retention) and P2 (correctness/polish)
- Estimated total effort: ~16-18 engineering days (4-5 weeks at single-dev pace)
- Two items are feature additions (NEXT-2, NEXT-4, NEXT-10); rest are fixes and refactors
- After this sprint: the activation-to-retention loop is complete, numbers are trustworthy at every step, the dashboard is scannable, and we have SaaS metrics for fundraising.

---

## LATER: Sprint 7+ (Months 3-6)

These are real gaps identified by the agents, but they are premature for Phase 1 (activation bottleneck). Each one is either a new feature that requires proven core retention, a domain sophistication that serves <10% of current users, or infrastructure that needs more data before building.

### LATER-1: Entity Type on Company Model
**What:** No field captures C-Corp / S-Corp / LLC / Partnership. This is the highest-dollar tax variable in any exit.
**Why LATER:** We are in activation phase. Users are not yet reaching the "how much will I keep?" question because they haven't even completed the "what is my business worth?" journey. Adding entity type now adds onboarding friction for zero activation benefit.
**When:** Phase 2 ($100K-$500K MRR), when retention is the bottleneck and users ask "what about taxes?"
**Effort:** M (schema change + onboarding step + tax logic)
**Flagged by:** Wealth Advisor (Section 1, "single highest-dollar tax variable")

### LATER-2: Proceeds Waterfall
**What:** EV shown everywhere, never after-tax proceeds. Founders think "$5M" is what they take home. Actual take-home could be $2.8M-$3.8M.
**Why LATER:** Requires entity type (LATER-1), deal structure assumptions, transaction cost estimates. Building this without the underlying data model is dangerous -- showing an inaccurate proceeds estimate is worse than showing EV with a disclaimer (which NOW-10 delivers).
**When:** Phase 2, immediately after LATER-1.
**Effort:** L (new calculation engine + UI)
**Flagged by:** Wealth Advisor (Section 2), Business Appraiser (2D)

### LATER-3: Working Capital Target Calculator
**What:** No concept of normalized working capital. In M&A, working capital adjustments are standard.
**Why LATER:** Working capital is a deal-mechanics concept. Users in activation phase don't know what working capital is. It becomes relevant when users are preparing for actual deals (Phase 3).
**When:** Phase 2-3.
**Effort:** L (calculator + education content + UI)
**Flagged by:** Business Appraiser (2C), Buyer Intelligence Advisor (#2 priority)

### LATER-4: QoE (Quality of Earnings) Preparation Module
**What:** No QoE preparation workflow. This is the single most expensive advisory engagement a founder replaces ($15K-$50K).
**Why LATER:** Highest advisory replacement value but requires: (a) financial data upload working well, (b) users who have completed multiple tasks, (c) evidence building patterns established. Building QoE before the task/evidence loop is proven puts the cart before the horse.
**When:** Phase 3 ($500K-$1M MRR).
**Effort:** XL
**Flagged by:** Buyer Intelligence Advisor (#1 priority), Business Appraiser (implied)

### LATER-5: Revenue Quality Module (Cohort, NRR, Concentration)
**What:** No revenue quality analysis. Buyers care deeply about customer concentration, revenue mix, cohort retention.
**Why LATER:** Requires actual customer data input (not just assessment answers). The data entry UX does not exist yet. This is a Phase 2-3 feature that makes the platform "diligence-ready" vs. "assessment-ready."
**When:** Phase 2-3.
**Effort:** XL
**Flagged by:** Buyer Intelligence Advisor (#4 priority), SaaS Data Architect (implied)

### LATER-6: Readiness Report PDF Export
**What:** No way to export a BRI report, valuation summary, or evidence package as a document.
**Why LATER:** Export is a Growth/Exit-Ready tier feature. Users need to have something worth exporting first. Build the content, then the container.
**When:** Phase 2.
**Effort:** L
**Flagged by:** Content Architect, Product Manager (L-5)

### LATER-7: Assessment Expansion (20 to 40 Questions)
**What:** 20 BRI questions. Buyer Intelligence Advisor wants 40+. Business Appraiser wants more granularity.
**Why LATER:** 20 questions are validated for activation. More questions = more friction = lower completion rate. Expansion is a retention play (deeper assessment for returning users), not an activation play.
**When:** Phase 2, gated behind completion of initial 20.
**Effort:** M
**Flagged by:** Buyer Intelligence Advisor, Business Appraiser

### LATER-8: Industry Multiples Refresh + Real Sources
**What:** Multiples cited as "SMB M&A Market Data 2024" (not a real publication). Effective date Jan 1, 2024 (now 2+ years stale).
**Why LATER:** The multiples themselves are reasonable. Updating sources and dates is important for credibility but does not move activation metrics. This is a trust/credibility enhancement for Phase 2.
**When:** Phase 2.
**Effort:** M (research + data update + citation chain)
**Flagged by:** Business Appraiser (2A), Buyer Intelligence Advisor

### LATER-9: SDE Method for Smaller Businesses
**What:** Platform uses EBITDA for all companies. For owner-operated businesses under ~$1M earnings, SDE is the standard metric. Using EBITDA multiples on an SDE analysis produces 30-50% valuation error.
**Why LATER:** The owner comp normalization (NOW-2) partially addresses this. Full SDE implementation requires a parallel valuation methodology with its own multiple ranges, which is a significant build.
**When:** Phase 2-3.
**Effort:** L
**Flagged by:** Business Appraiser (2B), Content Architect

### LATER-10: Deal Structure Simulator (Earnout/Seller Note Modeling)
**What:** EV shown as single number. 30-60% of SMB deals include earnouts. $3M EV might mean $2M at close + $1M over 3 years.
**Why LATER:** This is a Phase 3 (deal execution) feature. Users in activation/retention phases are not thinking about deal structure.
**When:** Phase 3.
**Effort:** L
**Flagged by:** Business Appraiser (2D), Wealth Advisor

### LATER-11: Comparable Engine Verification Layer
**What:** AI-generated comparable company data with no verification against real financial data sources. Hallucination risk.
**Why LATER:** Comparables are an Exit-Ready tier feature behind an existing paywall. The current "AI-estimated comparables for directional guidance" framing is acceptable with proper disclaimers (NOW-10). Real API integration (Financial Modeling Prep, SEC EDGAR) requires data partnerships and significant engineering.
**When:** Phase 3.
**Effort:** XL
**Flagged by:** Business Appraiser (1F), Financial Modeling Engineer (S-9), AI Rules Engine (P0)

### LATER-12: DCF Methodology Improvements
**What:** Multiple DCF issues: book-value capital structure instead of target, beta=1.0 for SMBs (should be total beta 2.0-4.0), no mid-year convention, no build-up method option.
**Why LATER:** DCF is an Exit-Ready tier feature. Improvements matter for credibility with sophisticated users, but the current implementation is "textbook correct" even if not "SMB-optimal." These are refinements, not fixes.
**When:** Phase 2-3.
**Effort:** M (cumulative across multiple refinements)
**Flagged by:** Business Appraiser (1E), Financial Modeling Engineer (S-6, S-8)

### LATER-13: Estate Planning Content and Guidance
**What:** Zero estate planning references in the codebase. Pre-exit gifting with valuation discounts can save $400K-$800K in estate taxes.
**Why LATER:** High value for the right users, but requires tax/legal content that we should not build without professional review. Also, estate planning is relevant only for users with >$5M estimated proceeds and >12-month exit timeline. That is a small subset of our current user base.
**When:** Phase 3-4 (Exit-Ready tier enhancement).
**Effort:** L (content creation + review + integration)
**Flagged by:** Wealth Advisor (Section 3)

### LATER-14: BRI Industry-Specific Weights
**What:** Default BRI weights are static across all industries. Manufacturing should weight Operational higher. Professional services should weight Transferability higher. Regulated businesses should weight Legal/Tax higher.
**Why LATER:** The infrastructure for custom weights exists. Auto-adjustment logic requires validated industry-specific data that we do not have yet. Static defaults are "reasonable enough" for Phase 1.
**When:** Phase 2-3.
**Effort:** M
**Flagged by:** Business Appraiser (2F), AI Rules Engine

### LATER-15: Multiple Adjustment / Core Score Double-Counting Refactor
**What:** The multiple adjustment engine and core valuation formula are parallel systems that can double-count size risk, owner dependency, and revenue model quality.
**Why LATER:** These systems are currently used in different contexts (adjustment engine in comparable pipeline, core formula in primary valuation). They do not overlap in current production paths. Refactoring requires careful analysis of all call sites to ensure no regression.
**When:** Phase 2, during comparable engine improvements.
**Effort:** M
**Flagged by:** Business Appraiser (1G)

### LATER-16: External Signals Implementation
**What:** Cron at check-external-signals is a 21-line stub. Tax liens, court dockets, UCC filings are defined but nothing monitors for them.
**Why LATER:** Requires external data API integrations that do not exist. Signal types are well-defined but the monitoring infrastructure is a Phase 3 investment.
**When:** Phase 3.
**Effort:** XL
**Flagged by:** AI Rules Engine (P1)

### LATER-17: Deal-Killer Threshold Dashboard
**What:** No aggregated view of threshold-based deal-killing risks (single customer >40% revenue, pending litigation, regulatory non-compliance).
**Why LATER:** Good feature, but requires sufficient assessment/evidence data to populate. Users in activation phase do not have enough data for this to be useful.
**When:** Phase 2.
**Effort:** M
**Flagged by:** Buyer Intelligence Advisor (#3 priority)

### LATER-18: Onboarding EBITDA Estimation Improvement
**What:** Onboarding snapshot ignores actual EBITDA/owner comp, estimates purely from revenue multiples. Can be 40% off.
**Why LATER:** The onboarding snapshot is intentionally simplified for speed-to-value (<15 min). The full assessment (which runs minutes later) uses correct EBITDA logic. The gap is real but short-lived for engaged users.
**When:** Phase 2 (when we have data on how many users never complete assessment after onboarding).
**Effort:** S
**Flagged by:** Financial Modeling Engineer (S-1)

---

## KILLED: Won't Build

### KILLED-1: In-App Glossary
**Why killed:** Tooltips achieve 80% of the value at 5% of the cost. We already have tooltip infrastructure.
**Flagged by:** Content Architect
**Alternative:** Continue expanding tooltips on financial terms. Add "What is this?" links to relevant help center articles.

### KILLED-2: Mobile AI Coach (Phase 2+)
**Why killed:** Premature. No validated manual workflow to replace. AI Coach without proven task system is a toy, not a tool.
**Flagged by:** Various
**Alternative:** Defer to Phase 3 ($500K-$1M MRR) when task engagement patterns are proven.

### KILLED-3: Advisor Portal
**Why killed:** Phase 4 feature ($3M+ MRR). No advisors use the platform yet. Building for a user that does not exist.
**Alternative:** Partner invite flow already exists. Iterate on that when advisor demand materializes.

### KILLED-4: White-Label Configuration
**Why killed:** Phase 4+ feature. Zero demand signal. Classic scope creep.
**Alternative:** If an enterprise customer demands it, build it then, not before.

### KILLED-5: Custom Integration Hub
**Why killed:** Core value not proven. Integrations before product-market fit is a well-documented anti-pattern.
**Alternative:** QuickBooks integration (already partially built) is the only integration that matters for Phase 1-2.

### KILLED-6: R&W Insurance Checklist
**Why killed:** Relevant to <1% of users in our price range. Premature specialization.
**Flagged by:** Buyer Intelligence Advisor
**Alternative:** Include as content in QoE module (LATER-4) when built.

### KILLED-7: AI-Generated Comparable Companies as Primary Valuation Source
**Why killed:** Hallucination risk too high for a primary valuation input. Current industry multiples (static, reasonable) are more trustworthy even if less impressive.
**What instead:** Keep as "directional guidance" with prominent disclaimers. Invest in real data sources (LATER-11) when budget allows.
**Flagged by:** Business Appraiser (1F), AI Rules Engine (P0)

### KILLED-8: Automatic BRI Weight Adjustment by Industry (Without Data)
**Why killed:** Building auto-adjustment logic without validated industry-specific weight data would produce confident-looking but arbitrary results. Worse than static reasonable defaults.
**What instead:** Allow manual weight override (infrastructure exists). Build auto-adjustment (LATER-14) only when we have transaction data to calibrate against.
**Flagged by:** AI Rules Engine

---

## Dependency Map

```
NOW-1 (Task Priority Fix) -----> NEXT-2 (Visible Valuation Impact)
NOW-7 (Onboarding Analytics) --> NOW-8 (Task Gen Recovery -- needs monitoring)
NOW-10 (Disclaimers) ----------> NEXT-3 (Dashboard Refactor -- labels must be right first)
NOW-2 (Owner Comp Fix) --------> LATER-2 (Proceeds Waterfall -- needs correct EBITDA)
NOW-4 (Alpha Default) ---------> [all valuation calculations]
NOW-5 (Decimal Overflow) ------> [all snapshot writes]
NEXT-8 (Skip Guards) ----------> NOW-8 (Task Gen must be reliable)
NEXT-10 (SaaS Metrics) --------> [fundraising conversations]
LATER-1 (Entity Type) ---------> LATER-2 (Proceeds Waterfall)
LATER-1 (Entity Type) ---------> LATER-9 (SDE Method -- tax-aware)
LATER-3 (Working Capital) -----> LATER-4 (QoE Module)
```

---

## Effort Summary by Phase

| Phase | Items | Est. Engineering Days | Key Outcome |
|---|---|---|---|
| NOW (Weeks 1-4) | 13 | 7-8 days | Every number is correct. Funnel is measurable. Core loop works. |
| NEXT (Weeks 5-12) | 14 | 16-18 days | Retention loop complete. Dashboard scannable. SaaS metrics live. |
| LATER (Months 3-6) | 18 | 60-80 days | Diligence-ready platform. Tax planning. Deal execution. |
| KILLED | 8 | 0 | Protected scope. Prevented entropy. |

---

## How to Use This Document

1. **This week:** Ship NOW-1 through NOW-5 (all P0 number-correctness fixes). These are small, independent, and have zero risk of regression.
2. **Next week:** Ship NOW-6 through NOW-13 (activation funnel fixes + trust items).
3. **Weeks 3-4:** Buffer for QA on NOW items + begin NEXT-1.
4. **Weeks 5+:** Work through NEXT items in order. Re-evaluate LATER items monthly based on user data from NOW-7 (onboarding analytics).
5. **Kill items stay killed** unless new data (user interviews, churn analysis, revenue signals) specifically resurrects them with a 1:3:1 proposal.

---

## Key Files Referenced

| File | Relevance |
|---|---|
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/playbook/generate-tasks.ts` | NOW-1: Task priority bug at lines 276-278 |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/api/assessments/[id]/complete/route.ts` | NOW-2: Owner comp hardcode at line 198 |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/calculate-valuation.ts` | NOW-3: Negative EBITDA guard, NOW-4: ALPHA constant |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/prisma/schema.prisma` | NOW-4: alphaConstant default, NOW-5: Decimal(4,2) overflow |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/pricing.ts` | NOW-6: Foundation tier gating |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/OnboardingFlow.tsx` | NOW-7: Analytics, NOW-12: Core factor defaults |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/steps/DeepDiveStep.tsx` | NOW-8: Task generation failure |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/onboarding/steps/RiskResultsStep.tsx` | NOW-9: Score name + label divergence |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/bri-scoring.ts` | NOW-13: Weight normalization |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/bri-weights.ts` | NOW-11: BRI weight canonical source |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/improve-snapshot-for-task.ts` | NOW-11: Hardcoded weights ignoring company-specific |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/value/ValueHome.tsx` | NEXT-3: Dashboard hierarchy |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/actions/TaskCompletionDialog.tsx` | NEXT-5: Accessibility |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/layout/MobileNav.tsx` | NEXT-6: Touch events |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/dcf-calculator.ts` | NEXT-11: Terminal value year bug |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/recalculate-snapshot.ts` | NEXT-12: EBITDA improvement normalization |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/comparable-engine.ts` | LATER-11: AI verification |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/retirement/retirement-calculator.ts` | LATER-1: Entity type impacts |
| `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/api/cron/check-external-signals/route.ts` | LATER-16: Stub implementation |

---

*This roadmap supersedes the previous 5-agent synthesis (roadmap-feb-2026.md). All findings from all 13 agents are accounted for.*
