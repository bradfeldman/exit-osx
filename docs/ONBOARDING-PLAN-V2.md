# Onboarding Plan V2 — Hybrid Recommendation
**Date:** February 19, 2026
**Source:** Customer Success Agent analysis comparing Mocksite, Existing Code, and Redesign Plan
**Status:** Recommended, pending approval

## Decision: Option C (Unauthenticated) with surgical additions from A and B

### Why Option C Wins
- At pre-PMF (10-20 users), the distance between "I heard about this" and "I understand why I should care" is the critical metric
- Value-first, account-second is a fundamentally different acquisition motion
- Option A (mocksite, ~28 min) requires trust that hasn't been earned yet
- Option B (existing code, ~6 min) has unnecessary auth gate before value delivery

---

## Recommended Flow

### Pre-Auth Flow (at `/assess`, no login required)

**Screen 1 — Business Basics** (~60 sec)
- Business name (optional — can be anonymous)
- One-sentence description (powers server-side ICB classification)
- Annual revenue as **bands** ("Under $500K / $500K-$2M / $2M-$10M / Over $10M") — NOT exact figure
- Server-side ICB classification with **visible correction option** (show inferred category, one-click to change)

**Screen 2 — 5 Core Factors** (~90 sec)
Plain-English radio buttons (from redesign plan):
- Revenue Model (subscription/project-based/hybrid)
- Team Structure (owner involvement: minimal/moderate/critical)
- Operating Costs (gross margins: >60% / 30-60% / <30%)
- Workforce (knowledge workers/mixed/manual labor)
- Asset Profile (asset-light/asset-heavy)

**Screen 3 — Buyer Confidence Scan** (~2:30)
8 questions, but **reframed as 4-option scale** instead of binary:
- "Yes / Mostly / Not yet / No" (instead of Yes/No)
- Gives scoring engine more signal
- Founders who answer "Mostly" are telling you something real

**Screen 4 — Review Answers** (~30 sec)
Summary with tap-to-change. Creates moment of reflection that increases ownership of results.

**Screen 5 — Results Reveal**
1. Animated BRI score reveal (dopamine moment)
2. Valuation range (low/high, labeled as estimate)
3. Top 3 buyer scrutiny areas (framed as "what buyers will look at")
4. **Soft email capture**: "Save your results and get your full exit plan" — primary CTA
5. **Hard gate**: account creation required for task instructions, priority ranking, full action plan

### Post-Auth: First-Visit Dashboard (NOT a second onboarding)

Curated 3-section view:
1. **HeroMetricsBar** — BRI score with category breakdown
2. **ValuationBridge** — where the value gap comes from (no blur overlay)
3. **Single "First Move" card** — ONE task (highest ROI, lowest effort), not three
   - Contextual "Why this matters" line (borrowing mocksite's "Why we ask" pattern)
   - Soft upgrade prompt if task instructions are gated

**"See full dashboard" escape hatch** always visible (for power users/advisors).

After 3 sessions OR first task started → transition to full ValueHome with NextMoveCard at position 3.

---

## Accounting Integration: POST-ACTIVATION Only

Do NOT ask for QuickBooks/Xero during onboarding at this stage.

**Right moment**: After user completes first task (high-confidence state)
**Frame as**: "Connect your financials to get a more precise valuation"
**Rationale**: 80% of valuation signal comes from revenue + industry + assessment. Marginal precision from COGS/payroll not worth onboarding abandonment cost.
**Exception**: Managed advisory firm rollouts where a human guides the process

---

## What the Mocksite's "Why We Ask" Pattern Should Become

Don't use it during data collection (reads as defensive). Instead, apply it:
- In task detail views — "why this task matters to buyers"
- In post-auth assessment context — "how this score affects your valuation"

---

## Key Terminology (Advisory Board Directive)
- ALWAYS: "Buyer Readiness Index" (never "Exit Score", "BRI Score", "Exit Readiness Score")
- CTA: "See What Your Business Is Worth" (not "Get Your Free Exit Score")

## Routes
| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/assess` | 4-screen assessment flow | No |
| `/assess/results` | Results reveal + account gate | No |
| `/methodology` | BRI methodology explanation | No |

## API Endpoints (New)
| Endpoint | Purpose |
|----------|---------|
| `POST /api/assess/classify` | Takes description, returns ICB classification. No auth. |
| `POST /api/assess/calculate` | Takes all assessment data, returns valuation + BRI. No auth. Rate-limited. |
| `POST /api/assess/save` | Takes email + assessment data. Creates user, company, snapshot, tasks. Sends magic link. |

## Deprecated Components (when implemented)
- `OnboardingFlow.tsx` → replaced by new AssessmentFlow
- `BasicInfoStep.tsx` → replaced by BusinessBasicsStep
- `RevenueStep.tsx` → combined into BusinessBasicsStep
- `IndustryPreviewStep.tsx` → valuation integrated into results reveal
- `DeepDiveStep.tsx` → moved to post-onboarding (Diagnosis page)
- `PlatformTour.tsx` → removed for first-visit users
- 8 orphaned step components: CelebrationStep, ClarifyingQuestionsStep, FirstMoveStep, RiskAssessmentStep, RiskQuestionsStep, TaskAssignmentStep, ValuationRevealStep, BusinessDescriptionStep

---

## Validation Metrics (30-day targets)

| Stage | Target |
|-------|--------|
| Screen 1 → Screen 3 completion | >70% |
| Reach Results screen | >65% |
| Soft email capture on Results | >40% |
| Account creation from Results | >30% |
| Click "Start this" on first task | >50% |
| Day 7 return rate | Track as primary retention signal |

**30-day litmus test**: % of users who reach Results screen and create an account.
- Above 30% → funnel worth optimizing
- Below 15% → scoring/framing problem, not flow problem

At 10-20 users, every churn signal should be a human conversation (phone/personal email), not automation.

---

## Important Clarification: AI Questions vs. Onboarding Questions

The **onboarding flow does NOT use AI-generated questions**. The system has two separate question paths:

| Feature | Onboarding | Post-Onboarding (Dossier) |
|---------|-----------|--------------------------|
| Questions | 8 hardcoded QuickScan + 23 seed questions | 30 AI-generated via Claude Sonnet |
| Source | Hardcoded in components + prisma seed data | `src/lib/dossier/ai-questions.ts` |
| Trigger | User signs up | Manual via diagnosis page |
| BRI Calculation | From seed questions only | From AI questions (refines score) |

The `ai-questions.ts` file generates 30 company-specific questions but is only called post-onboarding via the dossier/diagnosis system, not during the initial assessment.

---

## Comparison to Mocksite Scope

The mocksite envisions a more comprehensive authenticated onboarding (~28 min) with accounting integration, 24 multi-choice questions, goal-setting, and contextual sidebars. This plan intentionally defers that complexity to post-activation:
- Accounting integration → feature gate / post-first-task prompt
- 24-question deep assessment → post-onboarding diagnosis page
- Goal-setting → future feature
- "Why we ask" sidebars → repurposed as task-level context post-auth
