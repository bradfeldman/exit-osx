# Onboarding Redesign v1.0 — Product Designer/UX
**Date:** February 15, 2026
**Agent:** Product Designer/UX (ad7e4ee)

## Core Architecture Decision
Assessment flow is UNAUTHENTICATED. Users provide email only AFTER seeing results.
Route: /assess (new, public) → 4 screens → Results Reveal → Account creation gate

## 5-Screen Flow (~6 minutes to first value)

### Screen 1: Business Basics (~90 sec)
- Company name (text input)
- "Describe what your business does" (textarea, 2-3 sentences)
- Annual revenue (hero-style $ input, preserved from current RevenueStep)
- Server-side ICB classification from description (replaces manual industry browse)

### Screen 2: Business Profile (~90 sec)
5 core factors collected via plain-English radio buttons:

**Revenue Model:**
- "Most revenue comes from recurring subscriptions or contracts" → SUBSCRIPTION_SAAS
- "Revenue is project-based or one-time sales" → PROJECT_BASED
- "Mix of recurring and one-time revenue" → HYBRID

**Team Structure:**
- "I could step away for a month and the business runs fine" → MINIMAL owner involvement
- "I'm involved in key decisions but have a capable team" → MODERATE
- "The business depends heavily on me day-to-day" → CRITICAL

**Operating Costs:**
- "Gross margins above 60%" → EXCELLENT
- "Gross margins 30-60%" → MODERATE
- "Gross margins below 30%" → LOW

**Workforce:**
- "Mostly knowledge workers or automated systems" → LOW labor intensity
- "Mix of skilled and manual labor" → MODERATE
- "Heavily dependent on manual labor or physical presence" → HIGH

**Asset Profile:**
- "Primarily digital or intellectual property" → ASSET_LIGHT
- "Significant physical assets (equipment, real estate, inventory)" → ASSET_HEAVY

### Screen 3: Buyer Confidence Scan (~2:30)
8 yes/no questions (refactored from QuickScanStep, removes "Scan Complete" interstitial)

### Screen 4: Review Answers (NEW) (~30 sec)
Summary of all answers with tap-to-change. Psychological safety: "Everything look right?"

### Screen 5: Results Reveal
Phased animation sequence:
1. BRI Score (0-100) with gauge animation — 2 sec
2. Category breakdown with dollar attribution — appears after BRI settles
3. Valuation: Current Value → Potential Value → Gap — staggered reveal
4. Top 3 tasks with dollar impact and buyer consequence
5. Account creation gate: "Create a free account to save your results"

## First-Visit Dashboard (after account creation)
Only 3 sections (NOT the 10+ section ValueHome):
1. HeroMetricsBar (BRI, Current Value, Potential Value, Gap)
2. ValuationBridge (where the gap comes from — no blur overlay)
3. NextMoveCard (first task, prominent, with dollar value)
Plus: quiet footer pointing to full assessment, financials upload, profile editing.

After 3 visits OR first task started → transition to full ValueHome with NextMoveCard moved up to position 3.

## Free vs Paid Boundary

| Feature | Free Access | Locked |
|---------|-------------|--------|
| Valuation estimate | Full | — |
| BRI Score + 6 categories | Full breakdown | — |
| Valuation Bridge | Full | — |
| Top 3 tasks | Titles + dollar impact + buyer consequence | — |
| Task instructions | — | "Upgrade to Growth to see step-by-step instructions" |
| Task completion | — | Cannot mark tasks done or track progress |
| Deep 6-category assessment | — | Can see category names but cannot do detailed assessment |
| What-If Scenarios | — | Gated |
| Business Financials | — | Gated |
| DCF Valuation | — | Gated |
| Evidence vault | — | Gated |
| Deal Room | — | Gated |

**Key insight:** Free users see the WHAT but not the HOW. Like Netflix: show the trailer, gate the movie.

## Terminology (Advisory Board Directive)
- ALWAYS: "Buyer Readiness Index" (never "Exit Score", "BRI Score", "Exit Readiness Score")
- CTA: "See What Your Business Is Worth" (not "Get Your Free Exit Score")

## New Routes
| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/assess` | 4-screen assessment flow | No |
| `/assess/results` | Results reveal + account gate | No |
| `/methodology` | BRI methodology explanation | No |

## New Components
| Component | Purpose |
|-----------|---------|
| `AssessmentFlow.tsx` | Orchestrates 4-screen flow |
| `BusinessBasicsStep.tsx` | Screen 1: Name + description + revenue |
| `BusinessProfileStep.tsx` | Screen 2: 5 core factors |
| `BuyerScanStep.tsx` | Screen 3: 8 yes/no (refactored QuickScanStep) |
| `ReviewStep.tsx` | Screen 4: Answer review |
| `ResultsReveal.tsx` | Screen 5: Phased results + account gate |
| `FirstVisitDashboard.tsx` | Curated first-visit dashboard |
| `MethodologyPanel.tsx` | Valuation methodology slide-over |

## New API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /api/assess/classify` | Takes description, returns ICB classification. No auth. |
| `POST /api/assess/calculate` | Takes all assessment data, returns valuation + BRI. No auth. Rate-limited. |
| `POST /api/assess/save` | Takes email + assessment data. Creates user, company, snapshot, tasks. Sends magic link. |

## Deprecated Components
- `OnboardingFlow.tsx` → replaced by `AssessmentFlow.tsx`
- `BasicInfoStep.tsx` → replaced by `BusinessBasicsStep.tsx`
- `RevenueStep.tsx` → combined into `BusinessBasicsStep.tsx`
- `IndustryPreviewStep.tsx` → valuation integrated into results reveal
- `DeepDiveStep.tsx` → moved to post-onboarding (Diagnosis page)
- `PlatformTour.tsx` → removed for first-visit users
- 8 orphaned step components: `CelebrationStep`, `ClarifyingQuestionsStep`, `FirstMoveStep`, `RiskAssessmentStep`, `RiskQuestionsStep`, `TaskAssignmentStep`, `ValuationRevealStep`, `BusinessDescriptionStep`

## Trust Architecture
- Level 1 (Inline): "Based on $4.2M revenue in Plumbing Services, Industry multiple: 3.2x-5.8x"
- Level 2 (Methodology Panel): Explains formula, BRI categories, data sources, limitations
- Level 3 (Disclaimer Footer): Legal disclaimer on every screen showing financial numbers

## Key Tradeoffs
- No email capture before results (lose re-engagement for non-completers)
- Industry classification done server-side (less user control, simpler UX)
- Deep assessment removed from onboarding (available later from Diagnosis)
- PlatformTour removed for first visit (rely on clear labels + footer hints)

## Files That Need Modification
- `HeroMetricsBar.tsx:97` — "BRI Score" → "Buyer Readiness Index"
- `ValueHome.tsx` — Add firstVisit conditional, move NextMoveCard to position 3
- `ValuationBridge.tsx:66-73` — Remove blur overlay when QuickScan data exists
- `landing-page.tsx` — CTA text changes, terminology alignment
- `RiskResultsStep.tsx:104` — "Buyer Readiness Score" → "Buyer Readiness Index"
