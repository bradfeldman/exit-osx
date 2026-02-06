# Exit OSx: Full Spec vs. Codebase Audit

**Audit Date:** 2026-02-06
**Auditor:** CPO (Product Spec Authority)
**Scope:** `PRODUCT_MANAGER_PROMPT.md` + all five Mode specs vs. actual implementation in `/src/`

---

## EXECUTIVE SUMMARY

The five Mode specs (VALUE, DIAGNOSIS, ACTIONS, EVIDENCE, DEAL ROOM) are **largely implemented and conforming** to the canonical specs. The core architecture is right: five nav items, waterfall bridge, next move card, sub-step checklists, evidence scorecard, earned Deal Room activation. The Sustained Value System scaffolding is in place (Value Ledger, Signals, Disclosure Prompts, two cron jobs for decay detection).

**Critical gaps exist in three areas:**

1. **Legacy routes and code still present** -- old pages that should have been removed are still routable and accessible
2. **"Features to Add" from the PRODUCT_MANAGER_PROMPT are mostly NOT built** -- "What If" scenarios, Weekly Check-in (mobile), Benchmark Comparisons, AI Exit Coach, Accountability Partner System
3. **Sustained Value System is scaffolded but incomplete** -- drift reports don't exist, signal pipeline is partial, several signal channels are stubs

**Severity ratings used below:**
- **[CRITICAL]** -- Directly breaks spec intent or user experience
- **[HIGH]** -- Meaningful gap between spec and implementation
- **[MEDIUM]** -- Partial implementation or deviations that should be addressed
- **[LOW]** -- Minor copy differences, naming variations, or cosmetic issues
- **[EXTRA]** -- Built but not described in spec (assess if it should stay)

---

## 1. NAVIGATION STRUCTURE

### Spec Says
Five core nav items: `[Value] [Diagnosis] [Actions] [Evidence] [Deal Room]`

No other items in main nav. Value Modeling, Capital, Exit Tools are secondary sections that appear based on progression stage. Developer tools are super-admin only. Global section is admin-only. Settings consolidates into one destination with tabs.

### What's Built

**Core Nav (lines 29-35 of `Sidebar.tsx`):**
```
Home, Diagnosis, Actions, Evidence, Deal Room
```

**[MEDIUM] Nav label "Home" vs "Value"**
- Spec says "Value" as the nav label. Implementation uses "Home".
- The PM spec's own nav table says: `| 1 | VALUE | "Where do I stand..." | Value |`
- `PRODUCT_MANAGER_PROMPT.md` line 953: `[Value] [Diagnosis] [Actions] [Evidence] [Deal Room]`
- File: `/src/components/layout/Sidebar.tsx` line 30: `{ name: 'Home', href: '/dashboard', icon: HomeIcon }`
- **Decision needed:** "Home" is arguably more intuitive for the primary destination, but "Value" is more intentional and mode-consistent. The spec is explicit. Change to "Value".

**[HIGH] Developer tools still in product sidebar**
- Sidebar.tsx lines 355-443: Developer section (Multiple Adjustment, BRI Weights, Snapshot, Industry Multiples, Task Viewer) renders inside the product sidebar for super admins.
- Sidebar.tsx lines 446-509: Global section (BRI Weighting, Add Question, Add Task) renders inside the product sidebar for super admins.
- Spec says (PRODUCT_MANAGER_PROMPT.md line 1279): "Developer tools in the main nav. BRI weight debugging, snapshot viewers, and task engine tools are admin-only, behind a separate admin URL."
- These routes also exist at `/dashboard/developer/*` and `/dashboard/global/*` -- they should ONLY be at `/admin/tools/*`.
- An admin panel already exists at `/src/app/admin/` with its own layout.
- **Status:** These should be removed from the product sidebar entirely and only accessed through `/admin/`.

**[MEDIUM] Value Modeling / Capital / Exit Tools sections use a "stage" progression system**
- Sidebar.tsx lines 258-326 show these sections gated by `stage >= 4`, `stage >= 6`, `stage >= 7`.
- Spec KILLED feature #1: "The 7-stage progression system -- replaced with milestone progression tied to real accomplishments."
- The sidebar uses a numeric `stage` from `useProgression()` context. This IS the killed 7-stage progression system, still controlling nav visibility.
- **Status:** The progression gating should be replaced with milestone-based logic (e.g., financials uploaded, assessment completed) rather than numeric stages.

**[HIGH] Old Exit Tools section still in sidebar**
- Lines 59-63: `Data Room`, `Deal Tracker`, `Contacts` as separate nav items in Exit Tools section.
- Spec consolidated these into Mode 5 (Deal Room). These should not appear as separate nav items.
- The Deal Room at `/dashboard/deal-room` already exists as the unified experience.

---

## 2. LEGACY ROUTES STILL PRESENT (Should Be Removed or Redirected)

All of the following route directories still exist and are routable. The spec explicitly replaces them with the five Mode pages.

| Legacy Route | Spec Replacement | Status |
|---|---|---|
| `/dashboard/playbook/` | Mode 3: Actions (`/dashboard/actions`) | **[HIGH]** Still exists with `page.tsx` |
| `/dashboard/action-plan/` | Mode 3: Actions | **[HIGH]** Still exists with `page.tsx` |
| `/dashboard/assessment/` (+ `/company`, `/risk`, `/personal-readiness`) | Mode 2: Diagnosis (`/dashboard/diagnosis`) | **[HIGH]** Still exists with 3 separate sub-routes |
| `/dashboard/assessments/` (+ `/new`, `/[id]`) | Mode 2: Diagnosis | **[HIGH]** Still exists |
| `/dashboard/deal-tracker/` | Mode 5: Deal Room (`/dashboard/deal-room`) | **[HIGH]** Still exists |
| `/dashboard/contacts/` | Mode 5: Deal Room | **[HIGH]** Still exists |
| `/dashboard/data-room/` | Mode 4: Evidence + Mode 5: Deal Room | **[HIGH]** Still exists |
| `/dashboard/value-builder/` | Mode 1: Value (home `/dashboard`) | **[HIGH]** Still exists with `ValueBuilderClient.tsx` |
| `/dashboard/deals/` (+ `/[dealId]`) | Mode 5: Deal Room | **[MEDIUM]** Still exists |
| `/dashboard/developer/*` (6 sub-routes) | Should be admin-only at `/admin/tools/*` | **[HIGH]** Still exists in product nav |
| `/dashboard/global/*` (2 sub-routes) | Should be admin-only | **[HIGH]** Still exists in product nav |

**Total: 15+ legacy routes that should be removed or redirected.**

These create multiple pathways to the same data, fragment the user experience, and directly violate the "five modes, five destinations" architecture. Users who bookmark old URLs or follow old links will land on deprecated UIs.

---

## 3. MODE 1: VALUE (Home Screen)

### What's Built Right (Conforming to Spec)

- **HeroMetricsBar**: 3 metrics (Current Value, Potential Value, Value Gap) with correct copy, animated count-up, monthly delta with green/red/muted states. File: `src/components/value/HeroMetricsBar.tsx`
- **ValuationBridge**: Horizontal bar chart using Recharts with BRI category colors matching spec (#3b82f6, #22c55e, #eab308, #8b5cf6, #ef4444). Preview state with overlay. Category click navigation. File: `src/components/value/ValuationBridge.tsx`
- **NextMoveCard**: Single task focus, buyer consequence in quotes, "YOUR NEXT MOVE" / "CONTINUE WHERE YOU LEFT OFF" headers, "Why this?" expandable rationale, Coming Up list. File: `src/components/value/NextMoveCard.tsx`
- **ValueTimeline**: Area chart with annotations. File: `src/components/value/ValueTimeline.tsx`
- **ValueLedgerSection**: Monthly summary integrated into home. File: `src/components/value-ledger/ValueLedgerSection.tsx`
- **DisclosureTrigger**: Monthly disclosure check-in card at top of page. File: `src/components/disclosures/DisclosureTrigger.tsx`
- **Loading/Error states**: `ValueHomeLoading.tsx`, `ValueHomeError.tsx` exist.
- **Layout**: `max-w-5xl mx-auto px-6 py-8` matches spec. `space-y-8` stagger animations.
- **API data shape**: Dashboard API returns `bridgeCategories`, `valueGapDelta`, `nextMove` with correct TypeScript interfaces matching spec.

### Gaps and Differences

**[MEDIUM] Sub-badge on Current Value card in Preview state**
- Spec (MODE-1 3.1): "Sub-label (Preview state): `<Badge variant="secondary">Industry Preview</Badge>`"
- Implementation (HeroMetricsBar.tsx line 80+): The component receives `isEstimated` and `hasAssessment` props but the actual badge rendering depends on reading the full file. Needs verification that "Industry Preview" badge actually renders.

**[LOW] NextMoveCard navigates to `/dashboard/playbook?taskId=...`**
- File: `NextMoveCard.tsx` line 62: `router.push('/dashboard/playbook?taskId=${task.id}')`
- This routes to the OLD playbook page, not the new Actions page at `/dashboard/actions`.
- Should navigate to `/dashboard/actions?taskId=${task.id}` or directly to a task detail.
- **This is a functional bug**: clicking "Start This Task" takes users to a legacy route.

**[MEDIUM] "Start Re-Assessment" CTA in empty state**
- Spec (MODE-1 3.3 Empty State): CTA is "Start Re-Assessment"
- Implementation (NextMoveCard.tsx line 79): Button text is "Review Diagnosis" and navigates to `/dashboard/diagnosis`.
- The copy difference is minor ("Review Diagnosis" is arguably better UX copy), but it's a spec deviation.

**[LOW] Value Gap card color**
- Spec: Value Gap value uses `text-primary` (#B87333)
- Needs verification in HeroMetricsBar.tsx -- the value may use `text-foreground` instead.

**[MEDIUM] ValueLedgerSection on home page -- not in Mode 1 spec**
- The Mode 1 spec describes 4 sections: Hero Metrics, Valuation Bridge, Next Move Card, Value Timeline.
- Implementation adds a 5th section: ValueLedgerSection between Next Move and Timeline.
- The PRODUCT_MANAGER_PROMPT.md does mention Value Ledger as a nav item accessible from Value Builder via "View full history" link, and also describes it as a secondary surface. Including a summary section on the home page is defensible but not in the Mode 1 spec.

---

## 4. MODE 2: DIAGNOSIS

### What's Built Right

- **Unified assessment experience**: Single page at `/dashboard/diagnosis` with 6 category panels. File: `src/components/diagnosis/DiagnosisPage.tsx`
- **Confidence indicators**: Per-category confidence with dots, questions answered/available, staleness detection. Interface shows `dots`, `questionsAnswered`, `questionsTotal`, `isStale`, `daysSinceUpdate`.
- **Dollar impact per category**: Each category has `dollarImpact` field.
- **Risk drivers section**: Ranked list of specific risk drivers with dollar amounts and linked tasks. `RiskDriversSection.tsx`
- **Category Assessment Flow**: Inline assessment within category panels (not separate page). `CategoryAssessmentFlow.tsx`
- **API endpoint**: `/api/companies/[id]/diagnosis` returns full diagnosis data.

### Gaps and Differences

**[MEDIUM] Inline assessment flow opens from category panels**
- Spec says: clicking a category panel opens an inline assessment flow within the Diagnosis page.
- Implementation uses `expandedCategory` state and `CategoryAssessmentFlow.tsx` for this.
- The `?expand=CATEGORY` query param from the Valuation Bridge click works correctly.
- This appears to be correctly implemented. Verification would require runtime testing.

**[HIGH] Old assessment routes still exist and are reachable**
- `/dashboard/assessment/company`, `/dashboard/assessment/risk`, `/dashboard/assessment/personal-readiness` are still present.
- `/dashboard/assessments/new` and `/dashboard/assessments/[id]` are still present.
- These represent the killed "separate assessment types" pattern. Users could accidentally navigate to them.

**[MEDIUM] Spec says "Lowest confidence" prompt with CTA at bottom of category grid**
- Spec (PRODUCT_MANAGER_PROMPT.md lines 1072-1076):
  ```
  Lowest confidence: Legal & Tax
  "Your legal score is based on limited data. Answer 4 more questions..."
  [Improve Legal & Tax Confidence]
  ```
- Need to verify this prompt exists in the DiagnosisPage implementation. The data shape includes `isLowestConfidence` boolean per category, suggesting it's implemented.

---

## 5. MODE 3: ACTIONS

### What's Built Right

- **Unified action queue**: Single page at `/dashboard/actions`. File: `src/components/actions/ActionsPage.tsx`
- **Sub-steps with progress**: `SubStepChecklist.tsx` with checkboxes and progress bar. Data model has `subSteps` array (generated at API level, not in Prisma schema).
- **Active task expanded**: `ActiveTaskCard.tsx` with full detail, buyer consequence, sub-steps.
- **Up Next queue**: `UpNextQueue.tsx` with collapsed task rows.
- **Completed This Month**: `CompletedThisMonth.tsx` with per-task value and monthly total.
- **Waiting On Others**: `WaitingOnOthers.tsx` for delegated tasks.
- **Hero Summary Bar**: Shows task counts and monthly value recovered.
- **Task Completion Dialog**: `TaskCompletionDialog.tsx` for marking tasks done with evidence.
- **No category filters**: Correctly absent from Actions page.
- **No "Generate Action Plan" dialog**: Correctly absent.
- **No sprint planning**: Correctly absent from UI.
- **Buyer context**: `BuyerContextBlock.tsx` provides buyer consequence information.

### Gaps and Differences

**[MEDIUM] Sprint model still in Prisma schema**
- `prisma/schema.prisma` lines 485-500: `model Sprint { ... }` with `SprintPriority` and `SprintStatus` enums.
- Task model still has `sprintId`, `sprintPriority` fields (lines 419-420, 441).
- Spec killed sprint planning. The model should be removed or deprecated.

**[LOW] Task sub-steps are NOT in the Prisma schema**
- Sub-steps appear to be generated dynamically (possibly from task description or AI) at the API level, not stored as a database relation.
- The spec (MODE-3) describes sub-steps as integral. If they're generated on-the-fly, they may not persist when a user returns. Need to verify persistence.

**[MEDIUM] No visible "pace" indicator**
- Spec (MODE-3 State: Mature, 10+ tasks completed): "Potential 'pace' indicator: 'At this rate, you'll close your Value Gap in ~8 months.'"
- This does not appear to be implemented in the current Actions page.

**[LOW] Deferred tasks UI**
- Spec describes `deferredUntil` date logic and "Deferred (2)" count in hero area.
- HeroSummaryBar shows `deferredTasks` count when > 0, which is correct.
- Full defer flow (setting a date, auto-resurfacing) needs runtime verification.

---

## 6. MODE 4: EVIDENCE

### What's Built Right

- **Evidence scorecard**: Single page at `/dashboard/evidence`. File: `src/components/evidence/EvidencePage.tsx`
- **6 BRI-aligned categories**: With `documentsUploaded`, `documentsExpected`, `percentage`, `buyerImpact` levels.
- **Hero evidence bar**: `HeroEvidenceBar.tsx` showing "X% buyer-ready" score.
- **Missing documents section**: `MissingDocumentsSection.tsx` with buyer explanations per document.
- **Recently added section**: `RecentlyAddedSection.tsx` showing recent uploads with source.
- **Deal Room teaser**: `DealRoomTeaser.tsx` appears when approaching 70% evidence.
- **Empty state**: `EvidenceEmptyState.tsx` exists.
- **Document source tracking**: `source: 'direct' | 'task' | 'integration'` on uploaded docs.
- **Staleness detection**: `isStale` and `staleReason` fields on documents.
- **API endpoint**: `/api/companies/[id]/evidence` returns structured evidence data.

### Gaps and Differences

**[LOW] Category names in Evidence vs. BRI categories**
- Spec (PRODUCT_MANAGER_PROMPT lines 1194-1200) uses: Financial, Legal, Operations, Customers, Team/HR, IP/Tech
- Evidence spec (MODE-4) says 6 BRI-aligned categories
- The mapping between the 6 BRI categories and the 6 evidence categories needs to be verified. The evidence API may map differently (e.g., "Customers" is not a BRI category -- it would be part of FINANCIAL or TRANSFERABILITY).

**[MEDIUM] Expected documents list**
- The system has `src/lib/evidence/expected-documents.ts` defining what documents are expected per category.
- Need to verify this list matches the spec's buyer-impact expectations (tax returns, customer contracts, IP agreements, etc.).

---

## 7. MODE 5: DEAL ROOM

### What's Built Right

- **Activation gate**: `ActivationGate.tsx` enforces 3 criteria: Evidence 70%+, 90+ day tenure, Exit-Ready tier.
- **Three sections via tabs**: `DealRoomTabs.tsx` with Pipeline, Data Room, Activity Feed.
- **Pipeline view**: `pipeline/PipelineView.tsx` with visual stages.
- **Buyer detail**: `pipeline/BuyerDetailPanel.tsx` for managing individual buyers.
- **Offer comparison**: `pipeline/OfferComparison.tsx` for side-by-side IOI/LOI comparison.
- **Data Room integration**: `data-room/DealDataRoom.tsx` within Deal Room.
- **Activity Feed**: `activity/ActivityFeed.tsx` unified timeline.
- **API endpoint**: `/api/companies/[id]/deal-room` returns activation state, deal, pipeline, offers, data room.

### Gaps and Differences

**[MEDIUM] 6-stage visual pipeline**
- Spec says: `IDENTIFIED -> ENGAGED -> UNDER NDA -> OFFER RECEIVED -> DILIGENCE -> CLOSED`
- Need to verify `PipelineView.tsx` uses exactly these 6 stages vs. the backend's 33 stages.
- The API response includes `stages` array with `visualStage` and `label` per stage, suggesting the mapping is done.

**[LOW] Activation gate copy**
- ActivationGate.tsx line 35: "Your Deal Room activates when you're ready to run a sale process. Here's where you stand:"
- This is clean and matches spec intent, though spec wording differs slightly: "Your evidence is 72% buyer-ready. You're approaching the point where running a sale process makes sense."
- The spec's copy is for the teaser state, not the gate state. The gate copy is appropriate.

---

## 8. SUSTAINED VALUE SYSTEM

### What's Built

- **Signal model**: `prisma/schema.prisma` line 2923+ -- full `Signal` model with `channel`, `category`, `eventType`, `severity`, `confidence`, `resolutionStatus`, `estimatedValueImpact`, etc.
- **Value Ledger model**: `prisma/schema.prisma` line 2958+ -- full `ValueLedgerEntry` model with `deltaValueRecovered`, `deltaValueAtRisk`, `deltaBri`, `narrativeSummary`, linked to signals and tasks.
- **Disclosure Prompt Set model**: `prisma/schema.prisma` line 2989+ -- `DisclosurePromptSet` and `DisclosureResponse` models.
- **Signal API**: `/api/companies/[id]/signals` (route.ts and [signalId] route).
- **Value Ledger API**: `/api/companies/[id]/value-ledger` route.
- **Disclosure API**: `/api/companies/[id]/disclosures/` with `current` and `respond` endpoints.
- **Value Ledger creation**: `src/lib/value-ledger/create-entry.ts` utility function.
- **Narrative templates**: `src/lib/value-ledger/narrative-templates.ts` for ledger entry summaries.
- **Value Ledger page**: Full page at `/dashboard/value-ledger` with `ValueLedgerPage.tsx`, filtering (`LedgerFilters.tsx`), timeline view (`LedgerTimeline.tsx`).
- **Disclosure trigger on home**: `DisclosureTrigger.tsx` renders monthly check-in card.

### What's Missing

**[CRITICAL] No drift detection engine or drift reports**
- Spec (PRODUCT_MANAGER_PROMPT lines 326-404): Monthly Value Drift Ritual with 3-screen in-app flow, specific email notifications, continuous drift detection.
- Grep for `drift` returned NO matches in `src/`.
- No drift report component, no drift email template, no drift calculation logic.
- The cron jobs for document decay (`detect-document-decay`) and financial staleness (`detect-financial-staleness`) exist -- these are INPUTS to drift detection -- but the drift report itself (the synthesis, the email, the in-app flow) does not exist.
- **This is the primary retention mechanism. It's not built.**

**[CRITICAL] No email notification system for drift/signals**
- Spec describes specific email subject lines: "Your buyer confidence dropped 3 points this month."
- No email templates, no email sending infrastructure beyond `onboarding-complete` found.
- `/api/email/onboarding-complete` exists but no drift, weekly, or monthly email endpoints.

**[HIGH] Signal pipeline is partial**
- Channel 1 (Prompted Disclosure): **Built** -- DisclosureTrigger and DisclosurePrompt components work.
- Channel 2 (Task-Generated Signals): **Partially built** -- Task completion creates ledger entries (verified in `/api/tasks/[id]/complete/route.ts`), but the signal creation from document uploads (the task-signal mappings table in spec) needs verification.
- Channel 3 (Time-Based Decay): **Partially built** -- Two cron jobs exist (`detect-document-decay`, `detect-financial-staleness`) but their outputs into the signal system need verification.
- Channel 4 (External Public Signal Ingestion): **Not built** -- Spec marks this as Phase 2a/2b. No SOS filing alerts, no court docket monitoring.
- Channel 5 (Advisor/Third-Party Signals): **Not built** -- Advisor can view company via advisor portal but signal confirmation/deny workflow not implemented.

**[HIGH] Signal confidence scoring and fatigue prevention**
- Spec defines detailed confidence levels with weight modifiers (0.5x to 1.0x).
- Prisma schema has `confidence` field with `ConfidenceLevel` enum.
- The actual scoring pipeline (signal confidence affecting value-at-risk calculations) needs verification.
- Signal suppression rules (max 3 active, grouping related signals, etc.) are not evidently implemented.

**[HIGH] Value-at-risk monitoring**
- Spec describes continuous value-at-risk tracking that feeds into the Value Gap.
- No component or API endpoint specifically for "value at risk" aggregation was found.

---

## 9. FEATURES TO ADD (from PRODUCT_MANAGER_PROMPT) -- STATUS

| Feature | Spec Section | Status |
|---|---|---|
| **Valuation Bridge (Waterfall Chart)** | Lines 1289-1301 | **BUILT** -- ValuationBridge.tsx |
| **"What If" Scenarios** | Lines 1303-1311 | **NOT BUILT** -- No scenario modeling UI. Old valuation page has core factors but not the "what if I changed X" interactive format. |
| **Weekly Check-In (Mobile)** | Lines 1313-1323 | **NOT BUILT** -- No mobile-optimized 5-question weekly prompt. Disclosure prompts are monthly, not weekly. |
| **Benchmark Comparisons** | Lines 1325-1329 | **NOT BUILT** -- No peer comparison UI showing "businesses like yours sell for X, you're at Y." Industry data exists in the system but no comparative display. |
| **AI Exit Coach** | Lines 1331-1338 | **NOT BUILT** -- No conversational AI interface. No Anthropic-powered chat feature. |
| **Accountability Partner System** | Lines 1340-1347 | **NOT BUILT** -- No invite-one-person flow, no partner summary emails. |
| **Value Ledger** | Lines 1349-1351 | **BUILT** -- Full implementation with page, filters, timeline, API. |

---

## 10. FEATURES TO KILL (from PRODUCT_MANAGER_PROMPT) -- STATUS

| Killed Feature | Kill Reason | Current Status |
|---|---|---|
| **7-stage progression system** | Lines 1269 | **[CRITICAL] STILL IN USE** -- `useProgression()` context with numeric `stage` gates sidebar sections. ProgressionLockedItem component exists. |
| **Separate assessment types** | Lines 1271 | **[HIGH] OLD ROUTES STILL EXIST** -- `/assessment/company`, `/assessment/risk`, `/assessment/personal-readiness` still routable. New unified Diagnosis exists but old paths remain. |
| **Monte Carlo simulations** | Lines 1273 | **[HIGH] STILL IN CODEBASE** -- `src/lib/valuation/monte-carlo.ts`, `src/components/valuation/MonteCarloPanel.tsx`, `src/lib/retirement/monte-carlo.ts`, `src/components/retirement/MonteCarloPanel.tsx` all still present. |
| **Sprint planning with drag-and-drop** | Lines 1275 | **[MEDIUM] MODEL STILL EXISTS** -- `Sprint` model in Prisma schema with `SprintStatus`, `SprintPriority` enums. Task has `sprintId` field. No UI for it in Actions page (correct). |
| **23-stage deal pipeline in UI** | Lines 1277 | **[LOW] LIKELY CORRECT** -- Deal Room uses visual stages. Backend retains granular stages. Need to verify PipelineView.tsx only shows 6. |
| **Developer tools in main nav** | Lines 1279 | **[HIGH] STILL IN SIDEBAR** -- Developer and Global sections render in product sidebar for super admins. |
| **"Global" section for adding questions/tasks** | Lines 1281 | **[HIGH] STILL IN SIDEBAR** -- `/dashboard/global/add-question` and `/dashboard/global/add-task` still in product nav. |
| **Multiple separate settings pages** | Lines 1283 | **[MEDIUM] STILL SEPARATE** -- 4 separate settings routes: `/settings/billing`, `/settings/company`, `/settings/organization`, `/settings/user`. Should be consolidated into one page with tabs. |
| **Category filter buttons on task list** | Lines from system prompt | **CORRECT** -- No category filters in Actions page. |
| **"Generate Action Plan" dialog with date picker** | Lines from system prompt | **CORRECT** -- No dialog in Actions page. |

---

## 11. PRICING / TIER GATING

### What's Built

- Subscription context exists (`useSubscription`)
- Upgrade modal exists (`UpgradeModal`)
- Feature key gating in sidebar (`canAccessFeature`)
- Free tier shows data but gates actions (NextMoveCard has `isFreeUser` prop with upgrade CTA)

### Gaps

**[MEDIUM] Free tier "Start" button behavior on NextMoveCard**
- Spec says free tier Start button opens upgrade modal with text "Upgrade to Start Closing Your Gap"
- Implementation has `isFreeUser` prop but the `ValueHome.tsx` parent doesn't pass it. Default is `false`.
- The free tier gating on the home page may not be working correctly if `isFreeUser` is never set to `true`.

**[MEDIUM] Pricing tier names**
- Spec: Foundation ($0), Growth ($179/mo), Exit-Ready ($449/mo)
- Need to verify the pricing page and subscription logic uses these exact names and prices.

---

## 12. ONBOARDING

### What's Built

- `FocusedOnboardingWizard.tsx` -- 2-step onboarding (Business name/industry + Revenue)
- Analytics tracking for wizard completion
- Celebration state with confetti on completion
- Industry path selection with ICB classification

### Gaps

**[MEDIUM] Onboarding is 2 steps, spec says 5-7 questions**
- PRODUCT_MANAGER_PROMPT line 104: "The onboarding flow should feel effortless -- 5-7 questions max"
- Current implementation is 2 steps (Business Info + Revenue). Within those steps, there are multiple fields.
- The spec also mentions "Quick Scan" questions during onboarding that create the initial BRI estimate. The current flow asks about revenue model, gross margin, labor intensity, asset intensity, owner involvement -- but these are in `initialFormData`, suggesting they may be collected within the 2 steps.
- This may be conforming if the 2 steps contain 5-7 fields total. Needs runtime verification.

**[LOW] "3 minutes to valuation preview" target**
- Spec: "If onboarding takes more than 3 minutes to deliver a valuation preview, you've already lost."
- 2-step flow should meet this easily.

---

## 13. COPY AUDIT (Sampling)

**[LOW] Disclosure trigger copy**
- Implementation: "Monthly Check-in" / "X quick questions about changes in your business"
- Spec (line 603): "Quick check -- has anything changed buyers would ask about?"
- The implementation copy is softer ("Monthly Check-in" vs. "Quick check -- has anything changed buyers would ask about?"). The spec's version is more buyer-framed and direct.

**[LOW] Action Queue header**
- Implementation: "YOUR ACTION QUEUE" (correct per spec)
- Stats below: "12 tasks . 3 active" (correct)
- Monthly total: "This Month: 4 completed . $590K recovered" (correct pattern)

**[LOW] Valuation Bridge section header**
- Implementation: "WHERE YOUR VALUE GAP IS" / "Each bar shows how much a buyer discounts for that category."
- Spec (MODE-1 4.3): Identical. **Correct.**

**[LOW] Empty state Next Move card**
- Spec: "You've completed all current tasks. Nice work." + "Your next assessment will generate new recommendations..."
- Implementation: Same text. **Correct.**

---

## 14. DATA MODEL ALIGNMENT

### Conforming

- `buyerConsequence` field on Task model: **Present** (schema line 431)
- `Signal` model with all spec fields: **Present** (schema lines 2923-2956)
- `ValueLedgerEntry` model: **Present** with all key fields (schema lines 2958-2987)
- `DisclosurePromptSet` and `DisclosureResponse`: **Present** (schema lines 2989-3019)
- `BriCategory` enum: **Present**
- `SignalChannel`, `SignalSeverity`, `ConfidenceLevel`, `SignalResolutionStatus` enums: **Present**
- `LedgerEventType` enum: **Present**

### Gaps

**[MEDIUM] Sprint model should be removed**
- `Sprint` model, `SprintPriority` enum, `SprintStatus` enum still in schema
- Task fields `sprintId`, `sprintPriority` still present
- These are dead code from the killed sprint planning feature

**[LOW] `ConfidenceLevel` enum naming**
- Spec uses: unverified, supported, evidence_backed, advisor_confirmed, system_verified
- Schema uses different names (need to check exact enum values). Field on Signal is `UNCERTAIN` default (line 2930), which differs from spec's "unverified."

**[MEDIUM] Value Ledger `confidenceLevel` default**
- Schema line 2970: `@default(SOMEWHAT_CONFIDENT)`
- Spec uses "supported" as the mid-level confidence. Naming differs.

---

## 15. TECHNICAL INFRASTRUCTURE

### Cron Jobs

| Cron Job | Spec Section | Status |
|---|---|---|
| Document decay detection | Channel 3: Time-Based Decay | **BUILT** (`/api/cron/detect-document-decay`) |
| Financial staleness detection | Channel 3: Time-Based Decay | **BUILT** (`/api/cron/detect-financial-staleness`) |
| Trial expiration check | N/A (operational) | **BUILT** (`/api/cron/check-trial-expiration`) |
| Monthly drift report generation | Sustained Value System | **NOT BUILT** |
| Inactivity signal generation (21-day) | Drift Detection Engine | **NOT BUILT** |
| QuickBooks sync on schedule | Drift Detection Engine | **NOT BUILT** (only callback-based) |
| Benchmark/multiple refresh (monthly) | Drift Detection Engine | **NOT BUILT** |

### AI Integration

- **Anthropic API**: Integration exists in `src/lib/ai/` (diagnosis.ts, types.ts)
- **AI-generated buyer consequence copy**: Spec says this should be generated per task. The `buyerConsequence` field exists on Task. Need to verify if generation is AI-powered or template-based.
- **AI Exit Coach**: **NOT BUILT**
- **AI drift report narratives**: **NOT BUILT**
- **AI ledger narrative summaries**: Template-based fallback exists (`narrative-templates.ts`). AI generation status unknown.

---

## 16. EXTRA CODE NOT IN SPEC (Assess if Should Stay)

| Item | Location | Assessment |
|---|---|---|
| **MonteCarloPanel** (valuation + retirement) | `src/components/valuation/`, `src/components/retirement/` | **SHOULD REMOVE** -- Killed feature. Still accessible at `/dashboard/valuation`. |
| **Loans / Business Loans** | `/dashboard/loans/business/`, Capital section in sidebar | **NOT IN FIVE MODES** -- This is a future feature (Capital qualification from Milestone 5). Should not be in the nav until Phase 4. |
| **Retirement Calculator** | `/dashboard/financials/retirement/` | **IN SPEC** as Milestone 4 unlock. Currently in sidebar under Value Modeling. |
| **DCF Valuation page** | `/dashboard/valuation/` | **IN SPEC** as part of Exit-Ready tier. Contains Monte Carlo which should be removed. |
| **Old DashboardContent.tsx** | `src/components/dashboard/DashboardContent.tsx` | **SHOULD REMOVE** -- Replaced by ValueHome.tsx. 33KB of dead code. |
| **Old HeroMetrics.tsx** | `src/components/dashboard/HeroMetrics.tsx` | **SHOULD REMOVE** -- Replaced by HeroMetricsBar.tsx. 18KB of dead code. |
| **Old ActionCenter.tsx** | `src/components/dashboard/ActionCenter.tsx` | **SHOULD REMOVE** -- Replaced by NextMoveCard. 36KB of dead code. |
| **Old RiskBreakdown.tsx** | `src/components/dashboard/RiskBreakdown.tsx` | **SHOULD REMOVE** -- Replaced by ValuationBridge. |
| **Old ValueDrivers.tsx** | `src/components/dashboard/ValueDrivers.tsx` | **SHOULD REMOVE** -- Consolidated into Mode 2. |
| **PlaybookContent.tsx** | `src/components/playbook/PlaybookContent.tsx` | **SHOULD REMOVE** -- Replaced by ActionsPage. |
| **Old data room components** | `src/components/dataroom/` | **ASSESS** -- Some may be used by Mode 5 Deal Room data room tab. |
| **Old deal-tracker components** | `src/components/deal-tracker/` | **SHOULD REMOVE** -- Replaced by deal-room components. |
| **Progression context** | `src/contexts/ProgressionContext.tsx` (presumed) | **SHOULD REDESIGN** -- Stage-based progression is a killed feature. Replace with milestone-based logic. |

---

## 17. PRIORITIZED REMEDIATION

### Tier 1: Fix Now (Breaks Core Experience)

1. **Fix NextMoveCard navigation** -- Change `/dashboard/playbook` to `/dashboard/actions` (5 min fix, high impact)
2. **Remove developer/global sections from product sidebar** -- Move to admin-only (1 hour)
3. **Add redirects from legacy routes** to new Mode pages (prevent user confusion)
4. **Pass `isFreeUser` prop to NextMoveCard** from ValueHome for proper free tier gating

### Tier 2: Fix This Sprint (Spec Conformance)

5. **Change nav label "Home" to "Value"** per spec
6. **Remove Monte Carlo panels and related code** from valuation pages
7. **Remove old dashboard components** (DashboardContent, HeroMetrics, ActionCenter, RiskBreakdown, ValueDrivers) -- 100KB+ of dead code
8. **Consolidate settings into one page with tabs** (currently 4 separate routes)
9. **Remove Exit Tools section from sidebar** (Data Room, Deal Tracker, Contacts) -- replaced by Deal Room
10. **Clean up Sprint model** from Prisma schema (or at minimum stop referencing it)

### Tier 3: Build This Quarter (Missing Features)

11. **Drift detection engine + monthly drift report** -- The #1 missing retention mechanism
12. **Email infrastructure** for drift reports, signal notifications, engagement emails
13. **Replace stage-based progression** with milestone-based progression
14. **Signal pipeline completion** -- Wire cron outputs to signal creation
15. **Value-at-risk aggregation** and display

### Tier 4: Build Later (Phase 2+ Features)

16. "What If" Scenarios
17. Benchmark Comparisons
18. Weekly Check-In (mobile-optimized)
19. AI Exit Coach
20. Accountability Partner System
21. External Signal Ingestion (SOS filings, court dockets)
22. Advisor signal confirmation workflow

---

## VERDICT

**APPROVED WITH CHANGES.**

The five-mode architecture is correctly built. The core components for each mode exist and largely conform to their canonical specs. The data models are right. The engagement hooks are present. The fundamental loop (Value Gap -> Diagnosis -> Actions -> Evidence -> Deal Room) works.

But the codebase carries significant dead weight from the pre-Mode architecture, and the Sustained Value System -- which the PRODUCT_MANAGER_PROMPT explicitly calls "the reason retention works" -- is scaffolded but not operational. Fix the Tier 1 items immediately, the Tier 2 items this sprint, and make the drift engine the top priority for the next sprint. Without drift reports and email notifications, we have a calculator with a login page, not an operating system that earns its subscription.
