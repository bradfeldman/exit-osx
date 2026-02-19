# Exit OSx 2.0 — Master Execution Plan
**Version:** 1.0
**Date:** 2026-02-19
**Status:** Approved for execution

---

## What Is Already Shipped

Before planning new work, this is the confirmed baseline:

| Item | Commit | Status |
|------|--------|--------|
| Valuation Engine V2 (BQS/DRS/RSS three-score system) | c0ef869 | LIVE |
| Playbook Recommendation Engine (44 definitions, seeded, API, 19 tests) | be97093 | LIVE |
| Questions Engine — Onboarding (8 QuickScan + 23 DeepDive seed) | — | LIVE |
| Questions Engine — Post-onboarding (30 AI-generated via Claude Sonnet) | — | LIVE |
| All 44 Playbook HTML files | `/Users/bradfeldman/Documents/playbooks/` | COMPLETE |
| 88 Mocksite reference pages | `/Users/bradfeldman/Documents/mocksite/` | REFERENCE ONLY |
| Admin analytics Stage 1 (activity feed, user analytics) | 069d145 | LIVE |

**Important correction from brief:** The brief listed PB-08, PB-09, PB-24, PB-30, PB-40, and PB-42 as missing. All 44 playbook HTML files exist. No playbooks need to be built — only reskinned.

---

## The Four Workstreams

This plan organizes all work into four parallel workstreams. Agents pick up their workstream and execute independently. Cross-workstream dependencies are explicitly called out.

```
WORKSTREAM A: Hybrid Onboarding V2
WORKSTREAM B: App Shell Redesign
WORKSTREAM C: Playbook Integration (Focus Mode)
WORKSTREAM D: Freemium & Growth Infrastructure
```

---

## Dependency Map

```
        [A1: Assess Route Shell]
               |
        [A2: Assessment Screens 1-4]
               |
        [A3: Results Reveal + Scoring API]
               |
        [A4: Soft Email Capture + Account Gate]          <-- blocks D1 (freemium gate)
               |
        [A5: First-Visit Dashboard]

        [B1: Design Token System]
               |
        [B2: App Shell Layout]
               |
        [B3: Per-Mode Page Implementations] (can parallelize B3a..B3e)

        [C1: Focus Mode Shell]          <-- depends on B2
               |
        [C2: Playbook Reskin (CSS tokens)]
               |
        [C3: Playbook Hub + Library Pages]    <-- depends on B3
               |
        [C4: Contextual Surfacing]      <-- depends on C1, B3
               |
        [C5: Data Sync + BRI Feedback Loop]   <-- depends on C1, C4

        [D1: Freemium Gating Logic]    <-- depends on A4 (account gate exists)
        [D2: Analytics Instrumentation] <-- can start after B2
        [D3: Email Drip Sequence]      <-- depends on A4 (email capture API)
```

**Critical path:** A1 → A2 → A3 → A4 → A5 → (D1 unblocked) → C5 complete

---

## Phase Overview

```
PHASE 1 (Weeks 1-2): Foundations
  A: Assessment Shell + Screens 1-2
  B: Design Token System + App Shell skeleton

PHASE 2 (Weeks 2-4): Core Flows + Visual Layer
  A: Screens 3-4 + Scoring Engine (A2-A3)
  B: App Shell full implementation (B2-B3)
  C: Focus Mode Shell (C1) — unblocked after B2
  D: Analytics foundation (D2)

PHASE 3 (Weeks 4-6): Conversion + Integration
  A: Results Reveal + Account Gate (A4-A5)
  C: Playbook Reskin + Hub (C2-C3)
  D: Freemium gating (D1)

PHASE 4 (Weeks 6-8): Intelligence + Feedback Loop
  C: Contextual Surfacing + Data Sync (C4-C5)
  D: Email drip sequence (D3)
  ALL: Polish, mobile QA, accessibility audit
```

---

## WORKSTREAM A: Hybrid Onboarding V2

**Spec:** `/Users/bradfeldman/.claude/agent-memory/product-designer-ux/onboarding-v2-hybrid-spec.md`
**Owner agents:** full-stack-engineer (primary), lead-frontend-engineer (components), backend-systems-architect (API + auth)

### A1 — Assess Route Shell
**Phase:** 1 | **Size:** M | **Agent:** lead-frontend-engineer

Create the `/assess` route group with its own layout that excludes the app shell entirely (no sidebar, no dashboard header). This is a focused funnel container.

**Files to create:**
- `src/app/(assess)/layout.tsx` — bare layout, no sidebar, no app header. Only the assessment shell frame.
- `src/app/(assess)/assess/page.tsx` — renders `AssessmentFlow`
- `src/app/(assess)/assess/results/page.tsx` — renders `ResultsReveal`
- `src/components/assess/AssessmentShell.tsx` — fixed top bar (logo + step indicator) + fixed bottom bar (back + continue) + progress bar at very top. 56px top, 72px bottom, 3px progress bar.
- `src/components/assess/AssessmentFlow.tsx` — state machine for 5 screens. Manages `sessionStorage` key `exitosx-assessment-v2`. URL params: `?step=1|2|3|4`, results at `/assess/results`.

**SessionStorage schema (must match spec exactly):**
```json
{
  "step": 1,
  "businessName": "",
  "description": "",
  "revenueBand": null,
  "icbClassification": null,
  "coreFactors": {},
  "buyerScan": {},
  "email": null,
  "timestamp": 0
}
```

**Acceptance criteria:**
- `/assess` is fully accessible without auth. No auth redirect.
- App shell (sidebar, header) is completely absent on this route.
- Browser back button at `/assess?step=2` returns to `?step=1`, not to dashboard.
- Progress bar advances per step percentages defined in spec.
- prefers-reduced-motion: all transitions are instant.
- Mobile: full-width, no card, 20px horizontal padding, pb-safe for iOS.

---

### A2 — Assessment Screens 1-4
**Phase:** 1-2 | **Size:** L | **Agent:** lead-frontend-engineer

Build all four assessment screens as step components, plus shared sub-components.

**Files to create:**
- `src/components/assess/steps/BusinessBasicsStep.tsx` — Screen 1
- `src/components/assess/steps/BusinessProfileStep.tsx` — Screen 2
- `src/components/assess/steps/BuyerScanStep.tsx` — Screen 3 (refactored from existing `QuickScanStep.tsx`)
- `src/components/assess/steps/ReviewStep.tsx` — Screen 4
- `src/components/assess/RevenueBandSelector.tsx` — 7-option pill grid (48px height, 2-col desktop / 1-col mobile)
- `src/components/assess/ProfileOptionCard.tsx` — reusable option card for Screen 2 (white bg, 1px border, 12px radius, selected state: accent-light bg + 2px accent border + check icon)
- `src/components/assess/AnswerScale.tsx` — 4-option selector (Yes/Mostly/Not yet/No). Desktop: horizontal row. Mobile: 2x2 grid. Color coding: green/blue/orange/red per spec.

**Screen 1 — Business Basics:**
- Business name (text, required, 2+ chars)
- Description (textarea 3 rows / 4 rows mobile, 300 char soft limit, counter at 250+)
- Revenue band selector (7 options: Under $1M / $1M-$3M / $3M-$5M / $5M-$10M / $10M-$25M / $25M-$50M / $50M+)
- ICB classification fires on blur from description field (20+ chars), debounced. Stores result in session state but does NOT display on this screen.
- Continue disabled until all 3 are valid.

**Screen 2 — Business Profile:**
- 5 questions: Revenue Model, Owner Role, Gross Margins, Workforce, Assets
- Each question: labeled group, 2-3 option cards
- Option mapping from spec (SUBSCRIPTION_SAAS / PROJECT_BASED / HYBRID, MINIMAL / MODERATE / CRITICAL, EXCELLENT / MODERATE / LOW, etc.)
- All 5 required before Continue enabled.

**Screen 3 — Buyer Confidence Scan:**
- 8 questions, one at a time, auto-advance 400ms after selection
- 4-option AnswerScale component per question
- Progress bar increments per question: 40% + (question_number / 8 * 35%)
- "Question N of 8" + "~X min left" counter shown above question card
- Category badge on each question card (FINANCIAL, TRANSFERABILITY, etc.)
- Question 2 (customer concentration) has INVERTED scoring — capture flag in session state.
- Back button navigates to previous question (not back a screen).
- Last question shows "See My Results" instead of auto-advancing.

**Screen 4 — Review & Confirm:**
- 3 editable sections: Your Business / Business Profile / Buyer Confidence Answers
- Industry correction flow: inline expand → "Yes, that's right" or "No, change it" → search/dropdown
- Profile edit: "Change" links navigate back to Screen 2 scrolled to relevant question, then return to Screen 4.
- Buyer scan edit: each row tappable, navigates to that question in Screen 3, then returns.
- Continue button text: "See My Results"
- Answer pills use 4-option color scheme (green/blue/orange/red).

**Acceptance criteria for all screens:**
- All touch targets 44px minimum.
- Keyboard navigation: Tab, arrow keys, Enter/Space to select.
- WCAG AA: 4.5:1 contrast, role="radiogroup" + role="radio" + aria-checked on all option groups.
- Mobile layouts match spec exactly.
- Session state persists across browser refresh.
- Session expires after 24 hours (check timestamp on load).

---

### A3 — Assessment API Endpoints + Scoring Engine
**Phase:** 2 | **Size:** M | **Agent:** backend-systems-architect

Build the 4 API endpoints that power the assessment flow.

**Files to create:**
- `src/app/api/assess/classify/route.ts` — POST, no auth. Takes `{ description: string }`. Returns `{ icbCode, industryName, confidence }`. Use Claude Sonnet for classification. Rate limit: 30/hour per IP.
- `src/app/api/assess/calculate/route.ts` — POST, no auth. Takes full session state. Returns `{ briScore, valuationLow, valuationHigh, potentialLow, potentialHigh, topRisk, gapAmount, industryMultiple }`. Rate limit: 10/hour per IP.
- `src/app/api/assess/email/route.ts` — POST, no auth. Takes `{ email, assessmentData }`. Stores lead. Triggers drip email (Day 0). Rate limited.
- `src/app/api/assess/save/route.ts` — POST, no auth. Takes `{ email, password, fullName, assessmentData }` OR `{ googleToken, assessmentData }`. Creates User + Company + ValuationSnapshot + initial Tasks. Sends magic link. Returns `{ userId, companyId, redirectUrl: '/dashboard' }`.

**Scoring logic for `/api/assess/calculate`:**
- BRI = sum of 8 question scores, clamped to [35, 100]
- Question weights: each question is 12.5 points. Yes=12.5, Mostly=8.75, Not yet=3.75, No=0.
- Question 2 (concentration) is inverted: Yes=0, Mostly=3.75, Not yet=8.75, No=12.5.
- Valuation range: revenue band midpoint × industry multiple range (low/high from industry table).
- BRI adjustment: score < 70 = reduce multiple by up to 20%. Score > 85 = increase by up to 10%.
- Potential valuation: same calculation assuming all questions answered "Yes".
- Top risk: the question with the lowest individual score. Ties broken by BRI category dollar weight.
- Gap amount: potentialLow - valuationLow (present as range: potentialLow-valuationLow to potentialHigh-valuationHigh).

**Acceptance criteria:**
- `/api/assess/calculate` returns in under 2 seconds (if Claude classify is needed, it should be pre-fired by the time results are requested).
- All endpoints handle malformed input with 400 + clear error message.
- Rate limiting returns 429 with Retry-After header.
- `/api/assess/save` is idempotent: if email already exists, return 409 with `{ error: 'EMAIL_EXISTS', signInUrl: '/login' }`.
- No auth token required on any of these endpoints.

---

### A4 — Results Reveal + Email Capture + Account Gate
**Phase:** 3 | **Size:** L | **Agent:** lead-frontend-engineer

The conversion-critical screen. Must exactly follow the 6-phase animation sequence from the spec.

**Files to create:**
- `src/components/assess/ResultsReveal.tsx` — orchestrates 6 phases with timing
- `src/components/assess/ScoreGauge.tsx` — semi-circular 180-degree gauge. Counter animation 0→score, 1200ms cubic ease-out. `tabular-nums`. `aria-live="polite"` for final score announcement.
- `src/components/assess/SoftEmailCapture.tsx` — inline card (not modal). Email input + "Send My Results" button. "Skip for now" link. After submit: show check + "Sent! Check your inbox."
- `src/components/assess/AccountGate.tsx` — account creation form. Email pre-filled if captured in SoftEmailCapture. Full name + password with strength indicator. "Create Account" primary + "Continue with Google" secondary. Terms text.
- `src/components/assess/MethodologyPanel.tsx` — slide-over panel explaining calculation. Opened by "How we calculated this" link.

**Phase timing (must match spec):**
1. Calculation interstitial: 1.5-2 seconds minimum hold even if API resolves faster. Rotating helper text every 600ms.
2. BRI score reveal: counter animation 1200ms. Gauge animates synchronously.
3. Valuation range card: fades in 1 second after BRI settles.
4. Top risk card: fades in 1 second after valuation.
5. Soft email capture: fades in 1.5 seconds after risk card.
6. Account gate: visible below email capture, blurred category breakdown preview above gate line.

**Gate lock/unlock:**
- Above gate (visible): BRI score + gauge, valuation range, top risk.
- Gate marker: "Create a free account to unlock your full results" centered divider.
- Below divider: blurred preview of 6 BRI category bars.
- Account creation card.

**After account creation:**
- POST to `/api/assess/save`
- On success: redirect to `/dashboard`
- On EMAIL_EXISTS 409: show "Already have an account? Sign in" with pre-filled email.

**prefers-reduced-motion:** All phase transitions are instant. Counter shows final value immediately.

**Acceptance criteria:**
- Phases 1-6 sequence correctly on all viewport sizes.
- Google OAuth path works.
- Email pre-fills in account gate if captured in soft capture.
- WCAG AA: counter uses aria-live. All blurred content has aria-hidden="true" and text equivalent below gate.
- Mobile: all cards stack correctly. Soft email capture is full-width. Account gate buttons are full-width.

---

### A5 — First-Visit Dashboard
**Phase:** 3 | **Size:** M | **Agent:** lead-frontend-engineer

The authenticated landing state for new users. Single first-move card, not the full dashboard.

**Depends on:** A4 (account creation flow complete), B2 (app shell exists)

**Files to create/modify:**
- `src/components/value/FirstVisitDashboard.tsx` — curated layout. Sections: Welcome Banner + First Move Card + Quick Wins row + Quiet Footer.
- `src/components/value/FirstMoveCard.tsx` — single featured action. "RECOMMENDED" badge (orange). Task title (20px bold). Why-it-matters copy (2 sentences). Dollar impact (green). Time estimate. "Start This Action" CTA. "See all actions" link.
- Modify `src/app/(dashboard)/dashboard/page.tsx` — detect first-visit state, render FirstVisitDashboard instead of full ValueHome.

**First-visit detection logic:**
- New field on Company or User record: `firstVisitCompleted: Boolean @default(false)`
- First-visit state ends when ANY of:
  - User starts their first action (clicks "Start This Action")
  - User has visited the dashboard 3+ times (tracked via server-side counter or cookie)
  - User completes the full Diagnosis assessment
  - 7 days pass since account creation
- When condition met: set `firstVisitCompleted = true`. Welcome Banner is replaced by standard HeroMetricsBar. Full ValueHome loads.

**First Move selection logic:**
- From 8 buyer scan answers, find the question with the lowest score.
- Map that question's category to the playbook recommendation engine.
- Select the highest-impact task in that category as the "First Move."
- Fall back to highest dollar-impact task if no category match.

**Welcome Banner:**
- Dismissable via X button. Once dismissed, never returns (store in DB, not localStorage).
- Left: "Welcome, [First Name]" + "Your Buyer Readiness Index is X/100. Here's your biggest opportunity."
- Right: BRI score in 64px circular progress ring (colored by tier).

**Quick Wins row:**
- 2-3 horizontal scrollable cards (mobile). 160px wide. Title + dollar impact pill. No CTA button, just clickable.
- Visually subordinate to the First Move card.

**Quiet Footer:**
- "Want a deeper picture? Take the full assessment (15 min)" link
- "Connect your financials for a precise valuation" link
- "Edit your business profile" link
- 13px text links, below the fold.

**Acceptance criteria:**
- New users see FirstVisitDashboard. Returning users (3 visits, or action started) see full dashboard.
- Welcome Banner X dismisses permanently.
- First Move card task is correctly derived from lowest-scoring buyer scan answer.
- Mobile: horizontal Quick Wins row scrolls correctly with momentum.

---

## WORKSTREAM B: App Shell Big-Bang Redesign

**Reference:** 88 mocksite pages at `/Users/bradfeldman/Documents/mocksite/`
**Owner agents:** lead-frontend-engineer (primary), product-designer-ux (design QA)

The mocksite is the pixel-perfect target. Every app page must match the mocksite's visual design. This is a full visual redesign, not a feature change.

### B1 — Design Token System
**Phase:** 1 | **Size:** M | **Agent:** lead-frontend-engineer

Establish the single source of truth for all design tokens before any component work begins. All subsequent B, C work uses these tokens.

**Reference files in mocksite:** `ds-colors.html`, `ds-buttons.html`, `ds-components.html`

**Files to create/modify:**
- `src/app/globals.css` — update CSS custom properties to match mocksite token system exactly:
  - `--text-primary: #1D1D1F`
  - `--text-secondary: #6E6E73`
  - `--text-tertiary: #8E8E93`
  - `--accent: #0071E3`
  - `--accent-light: #EBF5FF`
  - `--bg: #F5F5F7`
  - `--surface: #FFFFFF`
  - `--border: #E5E7EB`
  - `--border-light: #F2F2F7`
  - `--green: #34C759`, `--green-light: #E8F8ED`
  - `--orange: #FF9500`, `--orange-light: #FFF6E8`
  - `--red: #FF3B30`, `--red-light: #FFEBEA`
  - Typography: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', sans-serif`
  - Radius scale: 8px / 12px / 16px / 20px / 24px
  - Shadow scale: subtle / default / elevated / float

**Acceptance criteria:**
- All existing components that use inline styles or hardcoded hex values are migrated to CSS vars.
- No color values appear as inline styles in JSX.
- Dark mode tokens defined but not required to be functional in Phase 1.

---

### B2 — App Shell Layout
**Phase:** 1-2 | **Size:** L | **Agent:** lead-frontend-engineer

Rebuild the authenticated app shell to match `index.html` mocksite design exactly.

**Reference mocksite pages:** `index.html`, `settings.html`, `notifications.html`

**Files to modify:**
- `src/app/(dashboard)/layout.tsx` — top-level dashboard layout
- `src/components/layout/Sidebar.tsx` (or equivalent) — white sidebar, 260px, company name at top, 5-mode nav, playbook nav item, utility items at bottom
- `src/components/layout/Header.tsx` — 60px top bar, company name + valuation ticker, notification bell, avatar menu
- `src/components/layout/MobileNav.tsx` — bottom nav bar on mobile (< 768px), 5 mode icons

**Sidebar spec (from mocksite `index.html`):**
- Width: 260px fixed desktop. Collapsed: 64px (icon only). Mobile: slide-over drawer.
- Top: Exit OS logo + company name (truncated), company switcher chevron.
- Nav sections: Dashboard / Diagnosis / Actions / Evidence / Deal Room / Playbooks (new).
- Active state: accent-light bg, accent text, 3px left border.
- Bottom: Settings, Help, User avatar + name.
- No numeric stage gates. Nav items always visible (no progression gating on nav — per known bug in MEMORY.md).

**Header spec:**
- 60px height, white bg, 1px bottom border.
- Left: hamburger on mobile.
- Center (or left after mobile hamburger): breadcrumb for sub-pages.
- Right: valuation range ticker (animated, green), notification bell with badge, avatar dropdown.
- Valuation ticker: "$X.XM - $X.XM" in 14px semibold --text-primary. On first-visit, shows range from assessment.

**Acceptance criteria:**
- Sidebar matches `index.html` mocksite pixel-for-pixel at 1440px viewport.
- Mobile: sidebar becomes drawer, header shows hamburger.
- Navigation is not gated by stage or progression — all 5 modes always accessible.
- Transition to/from Focus Mode (Workstream C) is seamless (sidebar animates out, Focus Bar animates in).

---

### B3 — Per-Mode Page Implementations
**Phase:** 2-3 | **Size:** L each | **Agent:** lead-frontend-engineer (B3a-B3c), full-stack-engineer (B3d-B3e)

Each mode's main page is rebuilt to match its mocksite counterpart. These can run in parallel once B2 is complete.

#### B3a — Value Mode (`/dashboard`)
**Reference:** `index.html`, `valuation.html`, `scenario-modeler.html`

Key components to build/update:
- `HeroMetricsBar` — BRI gauge ring (64px), valuation range with delta, signal count badge, deal room status
- `ValuationBridge` — waterfall chart showing gap from current to potential. Match `valuation.html` exactly.
- `NextMoveCard` — navigates to `/dashboard/actions` (fix existing bug: currently navigates to `/dashboard/playbook`)
- `ActivePlaybooksRow` — compact 3-card horizontal scroll showing in-progress playbooks (new, supports C4)
- `SignalSummaryCard` — top 3 active signals with severity badges

#### B3b — Diagnosis Mode (`/dashboard/diagnosis`)
**Reference:** `ai-diagnosis.html`, `ai-diagnosis-report.html`, `assessments.html`

Key components to build/update:
- `DiagnosisHeader` — BRI score with 6-category breakdown bars
- `CategoryPanel` — expandable panel for each BRI category. Matches mocksite category panel design.
- `AssessmentInvite` — inline CTA to take deeper assessment when no assessment exists (`assessments-empty.html`)
- AI Diagnosis report view (`ai-diagnosis-report.html`)

#### B3c — Actions Mode (`/dashboard/actions`)
**Reference:** `action-center.html`, `task-detail.html`

Key components to build/update:
- `ActionCenter` — single active task (prominent), sub-steps, up-next queue. Match `action-center.html`.
- `TaskDetail` — full task view with "Why this matters" collapsible sidebar card (post-auth "Why We Ask" pattern from onboarding spec)
- `PlaybookResourceLink` — inline link from task to matching playbook (supports C4 contextual surfacing)

#### B3d — Evidence Mode (`/dashboard/evidence`)
**Reference:** `evidence-upload.html`, `progress-report.html`

Key components to build/update:
- `EvidenceScorecard` — by BRI category, buyer-readiness percentage
- `EvidenceUpload` — file upload with category tagging. Match `evidence-upload.html`.
- `BuyerReadinessBar` — overall % with breakdown

#### B3e — Deal Room Mode (`/dashboard/deal-room`)
**Reference:** `deal-room.html`, `buyers.html`, `buyer-profile.html`, `data-room.html`, `due-diligence-tracker.html`

Key components to build/update:
- `DealPipeline` — 6-stage kanban-style pipeline. Match `deal-room.html`.
- `BuyerCard` — contact card with NDA status, last contact date, deal stage
- `DataRoomPanel` — VDR with folder structure
- Gating: Evidence score must be >= 70% to enter Deal Room. Show upgrade/unlock prompt below threshold.

**Acceptance criteria for all B3 items:**
- Each page matches its mocksite reference at 1440px viewport width.
- All pages are mobile-responsive (< 768px). Layout shifts as needed.
- No page requires more than one network waterfall (data loading is not sequential).
- All interactive states (hover, active, disabled, loading, empty) are implemented.
- Empty states match `*-empty.html` mocksite pages.

---

## WORKSTREAM C: Playbook Integration (Focus Mode)

**Spec:** `/Users/bradfeldman/Documents/playbooks/PLAYBOOK-INTEGRATION-SPEC.md`
**Owner agents:** lead-frontend-engineer (C1 shell), full-stack-engineer (C3-C5), backend-systems-architect (C5 data sync API)

**Important note:** All 44 playbook HTML files already exist. PB-08, PB-09, PB-24, PB-30, PB-40, and PB-42 were listed as "missing" in the brief but are confirmed present. No new playbooks need to be written. Work is: (1) reskin, (2) integrate into app.

### C1 — Focus Mode Shell
**Phase:** 2 | **Size:** M | **Agent:** lead-frontend-engineer
**Depends on:** B2 complete

The Focus Mode is a layout variant of the app shell, not a separate application. When a user enters a playbook, the app sidebar is replaced by the playbook sidebar, and the standard header is replaced by the 48px Focus Bar.

**Files to create:**
- `src/components/layout/FocusModeShell.tsx` — layout wrapper. Accepts: focusBarProps, sidebarContent, mainContent. Handles transition animation (app sidebar slides out, playbook sidebar slides in, 300ms).
- `src/components/layout/FocusBar.tsx` — 48px fixed top bar. Left: back arrow + breadcrumb "Exit OS / Playbooks / [Title]". Center: "Section N of M" + thin progress bar. Right: "Auto-saved" status + "X" close button.
- `src/components/playbook/PlaybookSidebar.tsx` — white sidebar matching app sidebar width (260px). Brand block at top ("Exit OS Playbook" + playbook title). Progress bar. Section nav with locked/unlocked/completed states. Composite score card at bottom.
- `src/app/(dashboard)/playbook/[id]/page.tsx` — Playbook Detail page (the "airlock" before Focus Mode). Shows overview, phases, estimated time, value impact. "Start Playbook" / "Continue" CTA.
- `src/app/(dashboard)/playbook/[id]/[section]/page.tsx` — Focus Mode page. Renders FocusModeShell with playbook iframe or inline content.
- `src/app/(dashboard)/playbook/page.tsx` — Playbook Hub (see C3).
- `src/app/(dashboard)/playbook/library/page.tsx` — Playbook Library (see C3).

**URL scheme:** `/playbook/pb-03` (Detail) → `/playbook/pb-03/welcome` (Focus Mode start) → `/playbook/pb-03/assessment` (deep link)

**Focus Bar behavior:**
- Back arrow: navigates to `/playbook/[id]` (detail page). NOT history.back().
- Close (X): navigates to stored referrer or `/playbook` if none.
- Progress: reads from localStorage key `exitosx-pb[id]-*` and maps to section count.
- Save status: "Auto-saved" normally. "Saving..." during POST to `/api/playbook-progress`.

**Resume behavior:**
- On load: check localStorage for `currentPage` in playbook state. If exists, load that section.
- Show toast: "Welcome back. You're on section 4 of 14."
- If last visit was 7+ days ago: "Welcome back — it's been X days. You were working on [section name]."

**Mobile Focus Mode:**
- < 900px: Focus Bar collapses to [back arrow] [truncated title] [hamburger].
- Sidebar becomes bottom-sheet drawer triggered by hamburger.
- Playbook content owns full screen.
- iOS safe-area padding at bottom.

**Acceptance criteria:**
- Entering Focus Mode: sidebar transition is smooth (< 300ms).
- Exiting via back arrow returns to detail page, not browser history.
- URL is deep-linkable. Sharing `/playbook/pb-03/assessment` loads Focus Mode at correct section.
- Mobile: Focus Bar never obscures content.

---

### C2 — Playbook Reskin (CSS Token Swap)
**Phase:** 3 | **Size:** L | **Agent:** lead-frontend-engineer
**Depends on:** B1 (token system established), C1 (shell exists to test in)

Batch-migrate all 44 playbook HTML files from the playbook design system (forest green / Georgia / dark sidebar) to the app design system (blue / SF Pro / white sidebar).

**Source files:** `/Users/bradfeldman/Documents/playbooks/Playbook-01-*.html` through `Playbook-44-*.html`
**Target location:** These files need to be copied into the Next.js app's public directory or served via a content layer. Decision needed on serving strategy (see Notes below).

**Token replacement map (from spec Section 3):**
```css
--color-primary: #0071E3          /* was #2D5A3D */
--color-primary-light: #EBF5FF   /* was #E8F0EB */
--color-accent: #FF9500           /* was #B87333 */
--color-accent-light: #FFF6E8    /* was #FFF3E8 */
--color-bg: #F5F5F7               /* was #FAFAF9 */
--color-border: #E5E7EB           /* was #E8E5E0 */
--color-text: #1D1D1F             /* was #1A1917 */
--color-text-secondary: #6E6E73  /* was #6B6860 */
--color-score-1: #FF3B30          /* was #C53030 */
--color-score-5: #34C759          /* was #1A6B35 */
```

**Typography changes:**
- `font-family`: replace `Georgia, serif` (display) and `Segoe UI` (body) with `-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`
- Sidebar background: `#1A1917` → `#FFFFFF`
- Sidebar text: white → `#6E6E73` (inactive), `#0071E3` (active)
- Sidebar active item: 3px left accent border in blue
- All primary/action buttons: forest green → `#0071E3`
- Progress bar fill: burnt orange → `#0071E3`

**What does NOT change:**
- HTML structure
- JavaScript logic
- Section content and copy
- Interaction patterns (score selectors, checklists, auto-save, section locking)
- Gauge ring, expandable cards, data tables

**Implementation approach:**
Write a script (`scripts/reskin-playbooks.js`) that batch-processes all 44 HTML files and applies the token swap. Then manually QA each file for any hardcoded colors that weren't caught by the token system.

**Serving strategy (decision required before C2 starts):**
Option A: Copy HTML files to `public/playbooks/` and serve as static assets. Playbook sidebar in C1 renders as iframe. postMessage bridge handles score events.
Option B: Convert each playbook to a Next.js page by extracting its content and rendering via a shared template.
Recommendation: Option A (iframe) is faster to implement and lower risk. Option B is cleaner but requires significant content extraction work. Use Option A for launch, migrate to Option B in a future sprint.

**Acceptance criteria:**
- All 44 playbooks render in Focus Mode with app design tokens.
- No forest green (#2D5A3D) or burnt orange (#B87333) visible in any playbook.
- Typography is SF Pro (or system font fallback) on all text.
- Mobile responsive behavior maintained.
- QA checklist: check each of the 44 files for visual consistency (can be done quickly with systematic review).

---

### C3 — Playbook Hub + Library Pages
**Phase:** 3 | **Size:** M | **Agent:** full-stack-engineer
**Depends on:** B2, C1

Build the three playbook discovery surfaces.

**Files to create:**
- `src/components/playbook/PlaybookHub.tsx` — "Your Playbooks" page. 3 sections: Active Playbooks (max 3 visible, "View all" link) / Recommended For You (top 3 by value impact) / Recently Completed.
- `src/components/playbook/PlaybookLibrary.tsx` — full catalog with journey view + category filter + status filter (All/Not Started/In Progress/Completed) + search. Journey view groups by phase: Personal Readiness (PB-01 to PB-05) / Financial Cleanup (PB-06 to PB-11) / Operations (PB-12 to PB-19) / Legal & Compliance (PB-20 to PB-25) / Growth & Value (PB-26 to PB-30) / Deal Prep (PB-31 to PB-38) / Contingency (PB-39 to PB-44).
- `src/components/playbook/PlaybookCard.tsx` — reusable card. Shows: title, category, progress ring (if in progress), value impact estimate, time estimate, status (not started / in progress / completed / locked).
- `src/components/playbook/PlaybookDetailPage.tsx` — the "airlock". Shows: title, category, phases list, estimated time, value impact, BRI category mapping. CTA: "Start Playbook" (not started) or "Continue" (in progress, skips to Focus Mode at last position).

**Recommended For You logic:**
- Map user's lowest BRI category scores to playbook-to-BRI mapping table (from spec Appendix A).
- Surface top 3 playbooks by (BRI_category_gap × playbook_estimated_impact).
- For each recommendation, show 1-sentence "why this matters for you" rationale (generated from BRI category + gap size).

**Freemium gating on Library:**
- Free: PB-01 (Financial Independence), PB-39 (Involuntary Exit Preparedness), PB-09 (Working Capital Optimization) — the 3 playbooks the founder selected (D4 decision).
- Growth plan: all 44.
- Locked playbooks in library: show card with lock icon + "Pro" badge. Recommendation rationale still visible. CTA: "Unlock with Growth Plan" instead of "Start Playbook."
- Locked playbooks in Focus Mode: welcome page (first section) is free. Clicking "Continue" to second section triggers upgrade prompt.

**Acceptance criteria:**
- Hub page shows correct sections based on user's playbook state.
- Library journey view and category view both functional.
- Search filters by title and category in real time.
- Status filter updates card display correctly.
- Free vs. locked state correct for each of the 44 playbooks.
- Detail page "Continue" for in-progress playbooks skips the detail page and loads Focus Mode directly at last section.

---

### C4 — Contextual Surfacing
**Phase:** 4 | **Size:** M | **Agent:** full-stack-engineer
**Depends on:** C1 (Focus Mode shell), B3 (app pages built)

Inject playbook recommendations throughout the app at the right moment.

**Integration points to build:**

| Location | Component | Playbook Surface | Trigger |
|----------|-----------|-----------------|---------|
| Dashboard NextMoveCard | `PlaybookSuggestionInline` | Top 1 recommended | Lowest BRI category score |
| Diagnosis CategoryPanel | `PlaybookLinkInPanel` | 1-2 per category | Category score < 70 |
| Actions TaskDetail | `PlaybookResourceSection` | Playbook matching task topic | Task has a playbook mapping |
| Signal Detail page | `PlaybookRecommendedAction` | Playbook matching signal category | Signal is active |
| Assessment results | `PostAssessmentPlaybooks` | Top 3 ranked by value impact | After first assessment completes |
| Value Dashboard | `ActivePlaybooksRow` | In-progress playbooks | Always shown if any in progress |

**Playbook-to-task/signal mapping:**
Create `src/lib/playbook/playbook-surface-mapping.ts` — exports a lookup function: `getPlaybookForContext(context: { briCategory?: string, taskId?: string, signalType?: string }): PlaybookRecommendation | null`. Uses the 44-playbook BRI mapping from spec Appendix A.

**Locked playbook display in surfacing:**
In all contextual surfaces, locked playbooks (for free users) still appear but with a lock badge. CTA changes to "Unlock with Growth Plan." This ensures free users always see the value of upgrading — the recommendation is visible even when the content is gated.

**Acceptance criteria:**
- At least one playbook recommendation visible on dashboard when BRI category < 70.
- Task detail pages show matching playbook for relevant tasks.
- Signal detail pages show matching playbook recommendation.
- Assessment results show top 3 playbooks after first completion.
- Locked playbooks display correctly for free users in all surfacing locations.

---

### C5 — Playbook Score Data Sync + BRI Feedback Loop
**Phase:** 4 | **Size:** L | **Agent:** backend-systems-architect (API) + full-stack-engineer (event system)
**Depends on:** C1, C4

Close the loop: playbook completion scores feed back into BRI and valuation.

**Files to create:**
- `src/lib/playbook/PlaybookContext.tsx` — React context provider. Listens for `playbook:score-update` window events dispatched by playbook iframes. Updates in-memory state. Fires API call to persist.
- `src/app/api/playbook-progress/route.ts` — POST, requires auth. Takes `{ playbookId, compositeScore, sectionScores, completedSections, totalSections, percentComplete }`. Persists to DB. Triggers BRI re-evaluation if threshold crossed.
- Prisma schema addition: `PlaybookProgress` model: `id`, `companyId`, `playbookId` (string), `compositeScore` (Float), `sectionScores` (Json), `completedSections` (Int), `totalSections` (Int), `percentComplete` (Float), `completedAt` (DateTime?), `lastActivityAt` (DateTime).

**postMessage bridge (for iframe approach):**
Each playbook HTML file dispatches:
```javascript
window.dispatchEvent(new CustomEvent('playbook:score-update', {
  detail: { playbookId, compositeScore, sectionScores, completedSections, totalSections, percentComplete, lastUpdated }
}));
```
The parent app (PlaybookContext) listens and persists via API.

**BRI feedback integration:**
- Playbook completion contributes as a "weighted evidence signal" to its mapped BRI category (see spec Appendix A).
- NOT a direct BRI score replacement — it's additive evidence alongside assessment answers and uploaded evidence.
- Scoring weight: a completed playbook at score ≥ 70 contributes +3 to +8 points to its primary BRI category (based on playbook depth and relevance). A completed playbook at score < 70 contributes 0 (incomplete work doesn't help).
- This must be wired into `src/lib/valuation/business-quality-score.ts` (V2 engine).

**User-visible feedback:**
- When playbook score sync causes a BRI category to increase: show a delta badge "+X pts" next to that category score on the Diagnosis page. Clicking reveals: "Your [category] score improved because you completed [Playbook Title] (score: X/100)."
- In the Valuation view: if the BRI change affects valuation, show delta in the Valuation Bridge component.
- Completion celebration banner in Focus Mode: inline (not modal), shows score + "This score has been shared with your Exit OS dashboard." + [View Impact on Dashboard] link.

**Acceptance criteria:**
- Completing a playbook section fires the postMessage event.
- API persists progress to `PlaybookProgress` table.
- Completing a playbook with score ≥ 70 updates the relevant BRI category score on next dashboard load.
- Delta badge visible on Diagnosis page after BRI update.
- PlaybookProgress table correctly tracks all 44 playbooks per company.
- No duplicate progress entries (upsert on companyId + playbookId).

---

## WORKSTREAM D: Freemium & Growth Infrastructure

**Owner agents:** growth-engineer (primary), full-stack-engineer (implementation), backend-systems-architect (subscription model)

**Note on Stripe:** The founder is handling Stripe integration directly. Workstream D assumes the subscription plan concept exists and focuses on the gating logic, analytics, and email infrastructure that surrounds it. D1 can use a simple `plan` field on the User/Company record that the founder will wire to Stripe later.

### D1 — Freemium Gating Logic
**Phase:** 3 | **Size:** S | **Agent:** growth-engineer
**Depends on:** A4 (account creation flow exists)

The 3 free playbooks are: PB-01 (Financial Independence), PB-39 (Involuntary Exit Preparedness), PB-09 (Working Capital Optimization).

**Files to create/modify:**
- `src/lib/subscriptions/playbook-access.ts` — exports `canAccessPlaybook(playbookId: string, plan: UserPlan): boolean`. Free users can access PB-01, PB-09, PB-39 fully. All other playbooks: first section (welcome page) is free, remaining sections require Growth plan.
- `src/components/playbook/PlaybookUpgradeGate.tsx` — inline upgrade prompt shown at section 2 of any locked playbook. Shows: "You've seen what this playbook can do. Unlock all 44 playbooks with Growth." + "Upgrade to Growth" CTA.
- Add `plan: UserPlan @default(FREE)` field to the appropriate Prisma model (User or Company). Enum: `FREE`, `GROWTH`.

**Acceptance criteria:**
- Free users can start and complete PB-01, PB-09, PB-39 with no gate.
- Free users see first section (welcome page) of all other playbooks, then hit upgrade prompt on section 2.
- Growth users see all sections of all 44 playbooks.
- Library cards show lock icon + "Pro" badge for locked playbooks on free plan.
- Upgrade gate is inline (not a modal, not a page redirect).

---

### D2 — Analytics Instrumentation
**Phase:** 2 (start after B2) | **Size:** M | **Agent:** growth-engineer

Instrument all analytics events defined in the onboarding spec and playbook spec. This builds the funnel visibility needed to optimize conversion.

**Assessment funnel events (from onboarding spec):**
- `assess_started`, `assess_business_basics_completed`, `assess_industry_classified`
- `assess_profile_completed`, `assess_scan_question_answered`, `assess_scan_completed`
- `assess_review_completed`, `assess_results_viewed`
- `assess_email_captured`, `assess_email_skipped`, `assess_account_created`
- `assess_abandoned` (fire on page unload if assessment not complete, using `beforeunload` or `visibilitychange`)
- `dashboard_first_visit`, `first_move_started`

**Playbook events (from playbook spec Appendix B):**
- `playbook.opened`, `playbook.section_completed`, `playbook.section_navigated`
- `playbook.score_updated`, `playbook.completed`, `playbook.exited`
- `playbook.recommended_clicked`, `playbook.upgrade_prompted`, `playbook.upgrade_converted`

**Implementation:**
- Use existing `ProductEvent` tracking infrastructure (from admin analytics Stage 1, commit 069d145).
- Create `src/lib/analytics/assess-events.ts` and `src/lib/analytics/playbook-events.ts` with typed event functions.
- Ensure `assess_abandoned` event includes `lastStep` and `timeSpent` for funnel drop-off analysis.

**Acceptance criteria:**
- All 13 assessment events fire at the correct moments.
- All 10 playbook events fire at the correct moments.
- `assess_abandoned` fires when user leaves /assess without creating account.
- Admin analytics dashboard (Stage 1) can display these events in the activity feed.
- No PII in event properties (no email addresses, no business names in event data).

---

### D3 — Email Drip Sequence
**Phase:** 4 | **Size:** M | **Agent:** growth-engineer
**Depends on:** A3 (`/api/assess/email` endpoint live), A4 (soft email capture in results)

Build the 3-email re-engagement sequence triggered when a user submits email via soft capture but does not create an account.

**Trigger:** POST to `/api/assess/email` stores the lead and queues 3 emails.

**Email sequence:**
- Day 0 (immediate): "Here are your results" — BRI score, valuation range, top risk, deep link to `/assess/results?token=[7-day-expiry-token]` to return to their results. "Create your free account to start improving your score."
- Day 2: "The #1 thing buyers check" — educational content about the top risk category identified in their assessment. Soft CTA to create account.
- Day 5: "Your results expire in 2 days" — urgency message. Link back to results. "Your business profile and readiness score are waiting."

**Files to create:**
- `src/lib/email/assess-drip.ts` — functions to queue and send the 3-email sequence via Resend.
- `src/app/api/assess/results-token/route.ts` — GET endpoint that accepts a 7-day token and returns the assessment data to re-populate `/assess/results`. Tokens are stored server-side on assessment save.
- Email templates: `emails/assess-day-0.tsx`, `emails/assess-day-2.tsx`, `emails/assess-day-5.tsx` (React Email format if already used, or Resend templates).

**Acceptance criteria:**
- Day 0 email sends within 60 seconds of form submission.
- Day 2 and Day 5 emails queue correctly (via cron or Resend scheduled sends).
- Deep link token in Day 0 email reconstructs results page correctly.
- Token expires after 7 days.
- Unsubscribe link works and suppresses remaining emails.
- No emails sent to users who created an account (suppress sequence on account creation).

---

## Phase-by-Phase Schedule

### Phase 1 — Foundations (Weeks 1-2)
**Goal:** Assessment shell + route exists. Design tokens locked. App shell skeleton.

| Ticket | Agent | Size | Workstream |
|--------|-------|------|-----------|
| A1: Assess Route Shell | lead-frontend-engineer | M | A |
| A2: Assessment Screens 1-2 (Business Basics + Business Profile) | lead-frontend-engineer | M | A |
| B1: Design Token System | lead-frontend-engineer | M | B |
| B2: App Shell Layout (sidebar + header) | lead-frontend-engineer | L | B |

**Phase 1 exit criteria:**
- `/assess` route is accessible without auth and shows the assessment shell frame.
- Screens 1 and 2 are functional with session storage persistence.
- CSS token system is merged and applied to globals.css.
- New sidebar and header are rendering (even if page content is placeholder).

---

### Phase 2 — Core Flows (Weeks 2-4)
**Goal:** Full assessment flow. App pages rebuilt. Focus Mode shell exists. Analytics foundation.

| Ticket | Agent | Size | Workstream | Parallel? |
|--------|-------|------|-----------|-----------|
| A2 cont: Screens 3-4 (Buyer Scan + Review) | lead-frontend-engineer | M | A | No (A2 must finish first) |
| A3: Assessment API + Scoring Engine | backend-systems-architect | M | A | Yes (can run parallel to A2 cont) |
| B3a: Value Mode page | lead-frontend-engineer | L | B | Yes (after B2) |
| B3b: Diagnosis Mode page | lead-frontend-engineer | L | B | Yes (after B2) |
| B3c: Actions Mode page | lead-frontend-engineer | L | B | Yes (after B2) |
| B3d: Evidence Mode page | full-stack-engineer | L | B | Yes (after B2) |
| B3e: Deal Room Mode page | full-stack-engineer | L | B | Yes (after B2) |
| C1: Focus Mode Shell | lead-frontend-engineer | M | C | Yes (after B2) |
| D2: Analytics Instrumentation | growth-engineer | M | D | Yes (after B2) |

**Note on parallelization:** B3a through B3e and C1 can all run simultaneously once B2 is done. Backend (A3) can run in parallel with frontend (A2 cont). This is the most parallelizable phase.

**Phase 2 exit criteria:**
- Full 4-screen assessment flow (Screens 1-4) is functional end-to-end.
- All 5 mode pages render with mocksite-accurate designs.
- Focus Mode shell (Focus Bar + playbook sidebar slot) renders at `/playbook/[id]` route.
- Analytics events are instrumented for assessment funnel.

---

### Phase 3 — Conversion + Visual Integration (Weeks 4-6)
**Goal:** Results Reveal live. Account creation works. Playbooks reskinned. Hub and Library pages built. Freemium gate in place.

| Ticket | Agent | Size | Workstream | Parallel? |
|--------|-------|------|-----------|-----------|
| A4: Results Reveal + Email Capture + Account Gate | lead-frontend-engineer | L | A | No (A3 must finish first) |
| A5: First-Visit Dashboard | lead-frontend-engineer | M | A | No (A4 must finish first) |
| C2: Playbook Reskin (all 44) | lead-frontend-engineer | L | C | Yes |
| C3: Playbook Hub + Library + Detail pages | full-stack-engineer | M | C | Yes (after C1) |
| D1: Freemium Gating Logic | growth-engineer | S | D | Yes |

**Phase 3 exit criteria:**
- End-to-end onboarding flow is functional: `/assess` → results → account creation → `/dashboard` (first-visit state).
- All 44 playbooks render with app design tokens in Focus Mode.
- Playbook Hub, Library, and Detail pages are functional.
- Free vs. Growth plan gating is in place.
- New user journey is demonstrable end-to-end.

---

### Phase 4 — Intelligence + Polish (Weeks 6-8)
**Goal:** Playbook scores feed back into BRI. Contextual surfacing throughout app. Email drip live. Mobile QA complete.

| Ticket | Agent | Size | Workstream | Parallel? |
|--------|-------|------|-----------|-----------|
| C4: Contextual Surfacing | full-stack-engineer | M | C | Yes |
| C5: Playbook Score Data Sync + BRI Feedback | backend-systems-architect + full-stack-engineer | L | C | No (C4 must finish first) |
| D3: Email Drip Sequence | growth-engineer | M | D | Yes |
| Mobile QA pass (all routes) | mobile-experience-engineer | M | ALL | Yes |
| Accessibility audit (WCAG AA) | qa-test-engineer | M | ALL | Yes |
| Performance audit (Core Web Vitals) | devops-platform-engineer | S | ALL | Yes |

**Phase 4 exit criteria:**
- Completing a playbook with score ≥ 70 updates the relevant BRI category score.
- Playbook recommendations appear contextually on dashboard, diagnosis, actions, signals.
- Email drip sequence sends Day 0, Day 2, Day 5 correctly.
- All routes pass mobile QA on iPhone SE through iPhone 16 Pro Max.
- No WCAG AA violations on any page.
- Core Web Vitals: LCP < 2.5s, CLS < 0.1 on all main pages.

---

## Critical Path

The longest sequential dependency chain that controls overall timeline:

```
A1 (Assess Shell)
  → A2 (Screens 1-4)
    → A3 (Scoring API) [parallel: can overlap with A2 last half]
      → A4 (Results Reveal + Account Gate)
        → A5 (First-Visit Dashboard)
          → C5 (BRI Feedback Loop complete)
```

**Total critical path:** ~7 weeks.

The app shell redesign (B workstream) and playbook reskin (C2) are NOT on the critical path — they can run in parallel with the A workstream. But they must be done before Phase 4 can close.

---

## Agent Assignments Summary

| Agent | Primary Workstream | Tickets |
|-------|-------------------|---------|
| lead-frontend-engineer | A (all), B1, B2, B3a-B3c, C1, C2 | A1, A2, A4, A5, B1, B2, B3a, B3b, B3c, C1, C2 |
| full-stack-engineer | B3d-B3e, C3, C4 | B3d, B3e, C3, C4 |
| backend-systems-architect | A3, C5 (API) | A3, C5-api |
| growth-engineer | D1, D2, D3 | D1, D2, D3 |
| mobile-experience-engineer | Phase 4 mobile QA | mobile-qa |
| qa-test-engineer | Phase 4 accessibility audit | a11y-audit |
| devops-platform-engineer | Phase 4 performance | perf-audit |
| product-designer-ux | Design QA on B3 pages | design-qa |

---

## Key Technical Decisions (Resolved or Needs Resolution)

| Decision | Status | Answer |
|----------|--------|--------|
| Playbook serving strategy | RESOLVED | Inline Focus Mode (layout variant, NOT iframe). Playbook content renders in main content area. Per PLAYBOOK-INTEGRATION-SPEC.md Section 2. |
| Stripe integration | RESOLVED (D4) | Founder handles Stripe directly. Use simple `plan` field on User/Company for gating. |
| Assessment rate limiting | RESOLVED (spec) | `/api/assess/calculate`: 10/hour per IP. `/api/assess/classify`: 30/hour per IP. |
| Google OAuth scope | RESOLVED | Email + name only. Business name already collected in Screen 1 before account gate. |
| Assessment data retention | RESOLVED | SessionStorage 24h (client) + 7-day server-side for email-captured leads. |
| Multiple assessment attempts | RESOLVED | If session exists (< 24h), show previous results with "Retake" option. After 24h, start fresh. |
| Email drip cadence | RESOLVED (spec + D3) | Day 0 (immediate), Day 2, Day 5. Suppress on account creation. |
| BRI floor for onboarding scan | RESOLVED (spec) | `Math.max(35, calculatedScore)`. Must match existing scoring engine. |
| First-visit transition triggers | RESOLVED (A5) | Start first action OR 3 visits OR complete Diagnosis assessment OR 7 days. |

---

## File Reference Index

### Specs
- Onboarding V2 UX spec: `/Users/bradfeldman/.claude/agent-memory/product-designer-ux/onboarding-v2-hybrid-spec.md`
- CS onboarding plan: `/Users/bradfeldman/.claude/projects/-Users-bradfeldman/memory/onboarding-plan-v2.md`
- Playbook integration spec: `/Users/bradfeldman/Documents/playbooks/PLAYBOOK-INTEGRATION-SPEC.md`
- Playbook unified design spec: `/Users/bradfeldman/Documents/playbooks/UNIFIED-DESIGN-SPEC.md`
- Playbook UX audit: `/Users/bradfeldman/Documents/playbooks/PLAYBOOK-UX-AUDIT.md`

### Reference Design
- Mocksite (88 pages): `/Users/bradfeldman/Documents/mocksite/`
- Playbooks (44 HTML files): `/Users/bradfeldman/Documents/playbooks/Playbook-*.html`

### Codebase Root
- App: `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/`
- Valuation V2: `src/lib/valuation/` (already implemented, commit c0ef869)
- Playbook recommendation engine: `src/lib/playbook/playbook-recommendations.ts` (already implemented, commit be97093)
- Existing assessment components: `src/components/assess/` (check current state before creating new files)
- Existing onboarding (deprecated): `src/app/(onboarding)/` (to be replaced by `/assess` flow)

---

## What Is NOT in This Plan (Intentional Deferrals)

| Item | Reason for Deferral |
|------|---------------------|
| AI Exit Coach full UI | Models exist, complex feature. Schedule after Phase 4 complete. |
| Accountability Partner system | Models exist, no UI designed. Phase 2 product expansion. |
| Benchmark Comparisons | Not yet designed. Future sprint. |
| Weekly Check-in mobile experience | Requires sustained value system foundation first. |
| Tax API integration | Blocked by vendor selection. Backlog. |
| Multi-language (i18n) | Not in scope for 2.0 launch. |
| Advanced Data Room permissions | Phase 3 product expansion after Deal Room stabilizes. |
| Capital Qualification (business loans) | Phase 4 product expansion. |
| "What If" scenario modeling (full) | Scenario modeler mocksite page exists. Requires V2 engine work. Future sprint. |
| Full-text playbook search | Phase 2 enhancement. Get library working first. |
| "Continue your playbook" email notifications | Phase 2 engagement. Get in-app experience right first. |

---

*End of master execution plan.*
