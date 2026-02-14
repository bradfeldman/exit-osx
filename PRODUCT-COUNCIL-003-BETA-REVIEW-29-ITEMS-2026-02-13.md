# PRODUCT COUNCIL DECISION RECORD: COUNCIL-003

## Beta Review -- 29 BF Items Prioritization

**DECISION ID:** COUNCIL-003
**DATE:** 2026-02-13
**TYPE:** Prioritization (Multiple Items) + Scope Decision
**QUESTION:** For each of the 29 BF items (BF-001 through BF-029), should we Build Now (pre-beta/during beta), Build Soon (next release after beta), Defer (future release), or Kill/Rethink?
**CONTEXT:** Exit OSx is entering BETA. 87/104 core items are shipped. COUNCIL-001 identified six critical blockers (Stripe, onboarding analytics, skip removal, Redis, email drip, in-app support). This review evaluates 29 new items identified during product review, prioritizing them against the beta-readiness bar. The product must be good enough to activate, retain, and convert real users.
**URGENCY:** Blocking (items needed pre-beta) + This Sprint (items needed during beta)

---

## EXECUTIVE SUMMARY

Of the 29 BF items, the council identifies:

- **8 items: BUILD NOW** (pre-beta or first week of beta)
- **7 items: BUILD SOON** (during beta, within 2-4 weeks)
- **8 items: DEFER** (post-beta, future releases)
- **6 items: KILL or RETHINK** (wrong approach, already done, or not worth it)

The strategic narrative is: **Instrument, stabilize, and guide -- then polish.** Beta users must be able to report problems (BF-001), the team must be able to see errors (BF-002 -- already done), onboarding must be mandatory (BF-003), and the core experience must not break at any viewport (BF-008). Everything else is optimization of a working product.

---

## SPECIALIST INPUTS SUMMARY

### CONSENSUS ITEMS (3+ specialists agree)

- **BF-001 (Feedback/Bug Reporting) is essential for beta** -- Growth, CS, UX all agree: beta without feedback = flying blind on user experience
- **BF-003 (Mandatory Assessment) is critical** -- CS, Growth, Product Lead all agree: this was already mandated in COUNCIL-001 as "remove skip option"
- **BF-008 (Responsive Layout) is a must-fix** -- UX, Frontend, CS all agree: broken layouts at any viewport destroy credibility
- **BF-029 (Delete Finder Artifacts) was already mandated** -- COUNCIL-001 Tier 1. Search confirms artifacts already cleaned up (no files found)
- **BF-018 (AI EBITDA Bridge) is high-value but post-beta** -- Appraiser, Financial Modeling, CS all agree it is the highest-value financial feature but requires significant engineering and data pipeline work
- **BF-016 (Trello Pipeline) is already built** -- PROD-041 (Pipeline Drag-and-Drop) was completed in Wave 10

### CONFLICTS

- **CONFLICT 1: BF-004 (Replace Industry Lookup)**
  - Growth recommends: Build Now -- richer data = better valuation = more trust = more conversion
  - Backend Architect recommends: Defer -- ICB taxonomy is deeply integrated; replacing it mid-beta is risky
  - **Tension:** Data quality improvement vs. architectural risk during beta

- **CONFLICT 2: BF-009/010/011 (Evidence & Data Room Redesign)**
  - UX recommends: Build Now -- current experience is confusing
  - PM recommends: Defer -- Evidence room works; redesign is a scope expansion during beta
  - **Tension:** User experience polish vs. scope discipline during activation phase

- **CONFLICT 3: BF-025 (Viral Exit Readiness Report)**
  - Growth recommends: Build Now -- organic acquisition channel
  - Product Lead recommends: Build Soon -- report quality must be exceptional or it damages brand
  - **Tension:** Speed to market vs. quality bar for brand-defining content

---

## INDIVIDUAL ITEM EVALUATIONS

### BETA INFRASTRUCTURE

---

#### BF-001: Beta Feedback & Bug Reporting
**VERDICT: BUILD NOW**

**Specialist Inputs:**
- **CS (HIGH confidence):** Beta without a feedback mechanism is malpractice. Users who encounter bugs and cannot report them churn silently. This is the #1 "first 48 hours" feature.
- **Growth (HIGH confidence):** Feedback data IS your beta analytics. Every bug report is a product signal. Every feature request is demand validation.
- **UX (HIGH confidence):** A persistent floating button (bottom-right) with a 3-field form (type: bug/feature/other, description, optional screenshot) is 2-4 hours of work.

**Committee Debate:**
- **Product Lead:** APPROVED. Use an off-the-shelf widget (Canny, Instabug, or even a simple in-app form writing to SupportTicket model). Do NOT build a custom feedback system. Ship the simplest thing that works.
- **PM:** BUILD NOW. This is literally what beta is for. 4 hours of work, infinite value.
- **CS:** FOUNDERS NEED THIS. The SupportTicket model and admin UI already exist. Wire up a simple frontend form. This also partially satisfies the "in-app support" requirement from COUNCIL-001.

**Rationale:** Beta users are doing you a favor. Give them the easiest possible way to tell you what is broken. The SupportTicket backend already exists -- this is just a frontend form. Doubles as the in-app support channel COUNCIL-001 required.
**Effort:** 4-8 hours
**Championed by:** Customer Success

---

#### BF-002: Error Tracking & Logging
**VERDICT: ALREADY DONE (Kill as tracked item)**

**Specialist Inputs:**
- **Backend (HIGH confidence):** Sentry is already integrated. `src/instrumentation.ts` loads `sentry.server.config` and `sentry.edge.config`. The infrastructure exists.
- **QA (HIGH confidence):** Verify Sentry DSN is configured in production environment variables. If it is, this is done.

**Committee Debate:**
- **Product Lead:** KILLED as a work item. Sentry is integrated. Verify the DSN is in Vercel production env vars and close this.
- **PM:** Agree. Mark as done. 5-minute verification task, not a feature.
- **CS:** Agree. But ensure error alerts are configured so the team is notified of production errors, not just logging them.

**Rationale:** Sentry integration exists in `src/instrumentation.ts`. This item is a verification task (check Vercel env vars for Sentry DSN), not a build item. Ensure alerting is configured (Slack/email on error spike).
**Effort:** 15-minute verification
**Championed by:** Product Lead (kill)

---

### ONBOARDING & ASSESSMENTS

---

#### BF-003: Mandatory 6-Category Assessment in Onboarding
**VERDICT: BUILD NOW**

**Specialist Inputs:**
- **CS (HIGH confidence):** This was already mandated in COUNCIL-001 as "Remove onboarding skip option" (Tier 1, Item 3, estimated 30 minutes). The skip option is confirmed in the codebase: `handleSkip()` in OnboardingFlow.tsx (line 364), `onSkip` prop on QuickScanStep, RiskQuestionsStep, and IndustryPreviewStep. This is the single biggest activation risk -- founders who skip never see BRI, never get tasks, never activate.
- **Growth (HIGH confidence):** Users who skip assessment are $0 LTV users. They see a valuation range and nothing else. Their "first win" moment never happens.

**Committee Debate:**
- **Product Lead:** APPROVED. This was already decided in COUNCIL-001. Execute it. Remove `onSkip` prop from all step components. Remove `handleSkip()` from OnboardingFlow. Remove `onboardingSkipped` localStorage flag. The assessment IS the activation. Step 6 (Deep Dive) remains optional as designed.
- **PM:** BUILD NOW. 30 minutes of code removal. Highest ROI/effort ratio of any item on this list.
- **CS:** FOUNDERS NEED THIS. The QuickScan (8 binary questions) takes under 2 minutes. No founder will abandon because of 2 minutes. They WILL abandon if they land on an empty dashboard with no BRI or tasks.

**Rationale:** COUNCIL-001 already decided this. The skip option on steps 3-4 lets users bypass the assessment, resulting in an empty dashboard with no BRI score, no tasks, and no "first win" moment. Remove `handleSkip()`, `onSkip` props, and all skip buttons from QuickScanStep, RiskQuestionsStep, IndustryPreviewStep, and ClarifyingQuestionsStep. Keep Deep Dive (step 6) as optional.
**Effort:** 30 minutes
**Championed by:** Customer Success

---

#### BF-004: Replace Industry Lookup with Rich Business Description
**VERDICT: BUILD SOON (during beta, not pre-beta)**

**Specialist Inputs:**
- **Buyer Intelligence (MEDIUM confidence):** Better business descriptions drive better valuation multiples. ICB taxonomy is a useful internal classification, but users should not have to navigate a 4-level hierarchy. The AI classification from freeform text already exists (PROD-002, completed Wave 5). The question is whether to remove the manual ICB selector entirely.
- **Backend (HIGH confidence):** ICB taxonomy is deeply embedded: `icbIndustry`, `icbSuperSector`, `icbSector`, `icbSubSector` fields on Company model, used for IndustryMultiple lookups. Removing the selector requires the AI classification to be 100% reliable, or you lose the multiple lookup chain.
- **Content (MEDIUM confidence):** Freeform description fields ("What does your business do?" "Who are your customers?" "What market do you serve?") would capture richer data than an industry dropdown. But the dropdown provides the structured data needed for benchmarks.

**Committee Debate:**
- **Product Lead:** APPROVED WITH CHANGES. Do NOT remove the ICB selector. Instead: (1) Make the business description fields richer (3 specific prompts instead of 1 generic field). (2) Use AI to pre-select the ICB category from the description. (3) Let the user confirm or change the AI's selection. This gives you rich text data AND structured classification. Best of both worlds.
- **PM:** BUILD SOON. Not a beta blocker. The current flow works. Improvement can ship in week 2-3 of beta with real user feedback on where they struggle.
- **CS:** FOUNDERS NEED THIS BUT DIFFERENTLY. The 4-level ICB hierarchy is confusing for founders. "I run an HVAC company" should not require knowing "Industrials > Construction & Materials > Building Materials & Fixtures." The AI pre-classification approach solves this without removing the data structure.

**Rationale:** The AI classification (PROD-002) already exists. Enhance it: richer description prompts, AI pre-selects ICB, user confirms. Do not remove ICB structure -- it drives IndustryMultiple lookups. Ship during beta, not before.
**Effort:** 1-2 days
**Championed by:** Product Lead

---

#### BF-005: "I Don't Know" Option on Assessment Questions
**VERDICT: BUILD SOON**

**Specialist Inputs:**
- **CS (HIGH confidence):** Founders abandoning assessments because they do not know an answer is a real risk. The 8 QuickScan questions are binary (yes/no), which is fine. But the 6-category deep assessment (step 6 and Mode 2) has more nuanced questions. An "I don't know" option prevents abandonment AND provides data about founder knowledge gaps.
- **Growth (MEDIUM confidence):** "I don't know" responses can drive engagement -- "You said you don't know about customer concentration. Here's why it matters and how to find out." This is a task generation opportunity.
- **Financial Modeling (MEDIUM confidence):** Scoring needs to handle "I don't know" appropriately. It should NOT be treated as the worst answer (punitive) or the best answer (generous). It should be treated as "no data" and weighted at the category average or excluded from scoring.

**Committee Debate:**
- **Product Lead:** APPROVED. But scoring design matters. "I don't know" = confidence=0 for that question (already captured by the confidence dots system in Mode 2). Do not change the BRI calculation. Just add the UI option and set confidence to zero. This naturally reduces the category's overall confidence, which is the correct behavior.
- **PM:** BUILD SOON. The QuickScan (step 4) is binary and works fine. Add "I don't know" to the deep assessment (step 6 + Mode 2 reassessments) during beta.
- **CS:** FOUNDERS NEED THIS. A founder who stalls on "What is your customer concentration percentage?" because they genuinely do not know will either lie or abandon. Neither is good.

**Rationale:** Add "I don't know" to deep assessment questions (not QuickScan binary questions). Set confidence=0 for those responses. This prevents abandonment and creates a task opportunity ("Find out your customer concentration"). Ship during beta.
**Effort:** 1 day
**Championed by:** Customer Success

---

### UI / LAYOUT

---

#### BF-006: Company Name & BRI Score in Page Header
**VERDICT: BUILD SOON**

**Specialist Inputs:**
- **UX (MEDIUM confidence):** Having the company name and BRI score persistently visible is good UX. It reinforces identity and progress. Currently the company name appears in the sidebar (confirmed in Sidebar.tsx). Moving it to the header area provides more prominence. However, the BRI score appearing on every page might create "score fatigue" -- users who see 62/100 on every page stop being motivated by it.
- **CS (MEDIUM confidence):** BRI in the header is the "evidence score" retention hook. Seeing "62/100" on every page is a constant reminder that the work is not done. This is the productive incompleteness principle.

**Committee Debate:**
- **Product Lead:** APPROVED. But do it carefully. Show company name in header always. Show BRI score as a compact badge (not a full meter). The Value Home page shows the full BRI breakdown -- the header is just a glanceable reminder. Remove company name from nav bar as proposed.
- **PM:** BUILD SOON. UX polish, not a beta blocker. Ship in week 2.
- **CS:** FOUNDERS NEED THIS. The BRI score is the stickiest number in the product. Make it unavoidable.

**Rationale:** Move company name to header, add compact BRI badge. Remove company name from nav bar. Ship during beta, not before.
**Effort:** 4-8 hours
**Championed by:** Customer Success

---

#### BF-007: Remove Number Spinner Arrows Site-Wide
**VERDICT: BUILD NOW**

**Specialist Inputs:**
- **UX (HIGH confidence):** Number spinners are a known UX anti-pattern for financial inputs. Accidentally clicking the spinner while trying to click in the field changes the value. On the DCF page where inputs represent millions of dollars, this is dangerous. A single CSS rule (`input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }`) fixes this globally.
- **Frontend (HIGH confidence):** This is a 5-minute CSS-only fix. Add to globals.css and done.

**Committee Debate:**
- **Product Lead:** APPROVED. 5 minutes of CSS. No debate needed.
- **PM:** BUILD NOW. CSS one-liner.
- **CS:** Founders entering $2.4M revenue who accidentally hit the spinner and see $2,400,001 will lose trust instantly.

**Rationale:** A single CSS rule removes spinner arrows from all number inputs site-wide. Five minutes of work. Prevents accidental value changes on financial inputs. No reason to defer this.
**Effort:** 5 minutes
**Championed by:** Product Lead

---

#### BF-008: Responsive Layout Audit & Fix
**VERDICT: BUILD NOW**

**Specialist Inputs:**
- **UX (HIGH confidence):** If FCF growth rate inputs literally disappear at certain viewport widths on the DCF page, that is a data-loss bug, not a cosmetic issue. Users at that viewport cannot complete the DCF analysis.
- **Frontend (HIGH confidence):** This requires auditing all pages at key breakpoints (320px, 375px, 768px, 1024px, 1280px, 1440px). Likely issues: overflow hidden on flex containers, fixed widths that exceed viewport, missing min-w-0 on flex children.
- **CS (HIGH confidence):** Beta users will be on laptops, iPads, and phones. A layout that breaks on iPad (1024px) or a 13" MacBook (1280px at 150% scaling = 853px effective) is a show-stopper.

**Committee Debate:**
- **Product Lead:** APPROVED. But scope it. Do NOT audit every page exhaustively. Fix the known DCF page bug. Test the 5 core mode pages (Value, Diagnosis, Actions, Evidence, Deal Room) at 768px and 1280px. Fix anything that is broken or unreadable. Ship the audit; follow up with polish.
- **PM:** BUILD NOW. Layout bugs that hide inputs are functional bugs, not UX polish. Fix the known issues; do a broad sweep during beta.
- **CS:** FOUNDERS NEED THIS. A founder on a Surface Pro or iPad who cannot see the growth rate input will think the product is broken.

**Rationale:** Fix the known DCF page bug (inputs disappearing at certain widths). Test 5 core mode pages at tablet (768px) and laptop (1280px) breakpoints. Fix anything that breaks functionality. Full audit is ongoing during beta.
**Effort:** 1-2 days (focused fix), ongoing (full audit)
**Championed by:** Product Lead

---

### EVIDENCE & DATA ROOM

---

#### BF-009: Redesign Evidence Page
**VERDICT: BUILD SOON**

**Specialist Inputs:**
- **UX (MEDIUM confidence):** The current Evidence page has 11 components including EvidenceEmptyState, MissingDocumentsSection, EvidenceCategoryTable, and HeroEvidenceBar. This is not a bare page -- it has structure. The issue is whether the UX guides the user effectively. The spec says "Scorecard, not file manager" and the implementation includes a hero bar showing X% buyer-ready. The gap may be smaller than BF-009 suggests.
- **CS (MEDIUM confidence):** The evidence score ("47% buyer-ready") is the stickiest metric in the product. If the page adequately shows the score, the missing documents, and the path to improvement, it is working. If users are confused about what to upload or why, a guided redesign helps.
- **Content (HIGH confidence):** Each document upload should explain why a buyer wants this document and what "good" looks like. This is content work, not a redesign.

**Committee Debate:**
- **Product Lead:** APPROVED WITH CHANGES. Do NOT full-redesign. Instead: add contextual help text to each evidence category ("Buyers request 3 years of tax returns to verify reported income"). Add a "Why This Matters" tooltip or expandable section per document type. This is content, not code.
- **PM:** BUILD SOON. The page works. It has the hero bar, categories, missing documents. Improve the copy and guidance during beta when you have real user feedback about where they get stuck.
- **CS:** FOUNDERS NEED THIS BUT DIFFERENTLY. The page exists and is functional. What is missing is guidance -- "Upload your P&L for the last 3 years. Buyers want to see revenue trend and margin consistency." Add help text, not a redesign.

**Rationale:** Evidence page already has 11 components with hero bar, categories, and missing docs. The gap is contextual guidance, not structure. Add "Why Buyers Want This" help text per document type and "What Good Looks Like" guidance. This is content + copy work, not a redesign.
**Effort:** 1-2 days (content + small UI additions)
**Championed by:** PM (scope discipline)

---

#### BF-010: Comprehensive Data Room Planning
**VERDICT: DEFER**

**Specialist Inputs:**
- **PM (HIGH confidence):** This is a planning/research item, not a build item. "Full planning: use cases, UX research, feature scoping" is Phase 2+ work. The evidence room works for the preparation phase. The data room (sharing with buyers) is behind the Deal Room activation gate (Exit-Ready tier + 70% evidence + 90 days). No beta user will reach this gate in the first 90 days by definition.
- **UX (MEDIUM confidence):** The data room vision (selling tool, not file dump) is correct long-term. But no beta user will need this within the beta window.

**Committee Debate:**
- **Product Lead:** DEFERRED. Zero beta users will reach the Deal Room activation gate (requires 90 days on platform). This is literally impossible to need during a 90-day beta. Plan it when users approach the gate.
- **PM:** DEFER. The dependency chain is: activate > retain > evidence 70% > 90 days > Deal Room. We are at step 1.
- **CS:** FOUNDERS DON'T NEED THIS yet. No founder in beta will be selling within 90 days.

**Rationale:** Deal Room activation requires 90 days on platform. No beta user can reach this gate during beta. Plan the data room when the first cohort approaches the 90-day mark.
**Effort:** N/A (deferred)
**Championed by:** PM (sequencing)

---

#### BF-011: Data Room Company-Level Permissions & Sharing
**VERDICT: DEFER**

**Specialist Inputs:**
- **Security (HIGH confidence):** Granular document sharing with per-company access control is a significant security feature. It requires careful design: invitation system, access tokens, permission inheritance, audit logging. This is PROD-083 (Advanced Data Room Permissions), already marked "Not Started" in the execution plan.
- **Backend (HIGH confidence):** The current org-level access works. Company-level granular permissions is a Phase 3 feature.

**Committee Debate:**
- **Product Lead:** DEFERRED. Same reasoning as BF-010. No beta user will be sharing documents with buyers. This is Phase 3.
- **PM:** DEFER. Dependency: Deal Room activation (90 days + Exit-Ready + 70% evidence). Cannot be needed during beta.
- **CS:** DEFER. Agree completely.

**Rationale:** Same dependency chain as BF-010. No beta user reaches Deal Room within the beta window. This is PROD-083, already planned for Phase 3.
**Effort:** N/A (deferred)
**Championed by:** PM (sequencing)

---

#### BF-012: Activity Page Empty State & Value Prop
**VERDICT: BUILD SOON**

**Specialist Inputs:**
- **UX (HIGH confidence):** Empty states are a critical onboarding moment. An empty Activity page with no explanation is a dead end. The fix is simple: add a card explaining "Track who views your documents and when. Activity appears here as you share your data room with potential buyers."
- **CS (MEDIUM confidence):** The Activity page is part of Deal Room (Mode 5), which is gated. Most users will not see it during early beta. But when they do reach it, the empty state should guide, not confuse.

**Committee Debate:**
- **Product Lead:** APPROVED. But low priority. This is behind the Deal Room gate. Add a simple empty state component. 30 minutes of work. Ship when you are doing any Deal Room work.
- **PM:** BUILD SOON. Small effort, bundle with other empty state improvements.
- **CS:** FOUNDERS NEED THIS when they reach it. But "when they reach it" is weeks/months from now. Low urgency.

**Rationale:** Simple empty state component needed for Deal Room Activity page. Low effort (30 minutes) but also low urgency (behind activation gate). Bundle with other UX polish work during beta.
**Effort:** 30 minutes
**Championed by:** UX

---

### DEAL ROOM & PIPELINE

---

#### BF-013: Overhaul Deal Room Contact Add/Edit
**VERDICT: BUILD SOON**

**Specialist Inputs:**
- **UX (HIGH confidence):** If a user adds a contact without a company name and then cannot add the company when editing, that is a bug, not a feature gap. The AddParticipantModal and ParticipantDetailPanel components need to support editing all fields that were available at creation.
- **Frontend (HIGH confidence):** The AddParticipantModal (confirmed in codebase at `src/components/deal-room/contacts/AddParticipantModal.tsx`) and ParticipantDetailPanel need a code fix, not an "overhaul."

**Committee Debate:**
- **Product Lead:** APPROVED. But "overhaul" is over-scoped. This is a bug fix: ensure the edit form shows all fields, including company. Fix the bug; do not redesign the flow.
- **PM:** BUILD SOON. It is a bug, but it is in Deal Room (gated). Fix it during beta when you touch Deal Room.
- **CS:** Bug fix, not redesign. Agree with PM on timing.

**Rationale:** This is a bug fix (missing company field in edit mode), not an "overhaul." Fix the ParticipantDetailPanel to include all fields available in AddParticipantModal. Ship during beta.
**Effort:** 2-4 hours
**Championed by:** Product Lead (scope reduction)

---

#### BF-014: Auto-Add Prospect Company to Pipeline
**VERDICT: BUILD SOON**

**Specialist Inputs:**
- **Growth (MEDIUM confidence):** Reducing friction in the Deal Room flow is good. Auto-creating a pipeline entry from a contact is a natural workflow optimization. Email domain deduplication prevents clutter.
- **Backend (MEDIUM confidence):** Email domain extraction is straightforward. The deduplication logic is: extract domain from email, check if a DealCompany with matching domain exists, if not create one.

**Committee Debate:**
- **Product Lead:** APPROVED. Natural workflow improvement. But it is Deal Room (gated). Not urgent for beta launch.
- **PM:** BUILD SOON. Good feature, wrong timing. Ship when Deal Room users start adding contacts.
- **CS:** Makes sense but no beta user will be adding deal contacts in the first 30 days.

**Rationale:** Good workflow optimization for Deal Room. Auto-create pipeline company from contact email domain with deduplication. Not urgent for beta (Deal Room is gated).
**Effort:** 4-8 hours
**Championed by:** PM

---

#### BF-015: Pipeline Archive Functionality
**VERDICT: BUILD SOON**

**Specialist Inputs:**
- **UX (MEDIUM confidence):** Archive is a standard pipeline feature. Users who reject a buyer need to remove them from the active view without losing the record.
- **CS (LOW confidence):** No beta user will have enough pipeline activity to need archiving in the first 90 days.

**Committee Debate:**
- **Product Lead:** APPROVED. Simple feature (add `archived` boolean to DealCompany, add toggle in UI). Not urgent.
- **PM:** BUILD SOON. 2-4 hours. Ship when pipeline has real data.
- **CS:** Agree. Nice to have for when Deal Room is active.

**Rationale:** Standard pipeline feature. Add archived flag and UI toggle. Not urgent during beta launch.
**Effort:** 2-4 hours
**Championed by:** PM

---

#### BF-016: Trello-Style Drag-and-Drop Pipeline
**VERDICT: ALREADY DONE (Kill as tracked item)**

**Specialist Inputs:**
- **Frontend (HIGH confidence):** PROD-041 (Pipeline Drag-and-Drop) was completed in Wave 10. The PipelineView with PipelineColumn, BuyerCard, and StagePickerDialog components exist at `src/components/deal-room/pipeline/`. The kanban board is built.

**Committee Debate:**
- **Product Lead:** KILLED as work item. Already implemented as PROD-041 in Wave 10.
- **PM:** Already done. Remove from tracking.
- **CS:** Confirmed. PipelineView.tsx implements the Trello-style kanban.

**Rationale:** PROD-041 (Pipeline Drag-and-Drop) was completed in Wave 10. The Trello-style kanban board with drag-and-drop between stages exists in `src/components/deal-room/pipeline/PipelineView.tsx`. Remove from tracking.
**Effort:** 0 (already done)
**Championed by:** Product Lead (kill)

---

### FINANCIALS & VALUATION

---

#### BF-017: Add Xero Integration
**VERDICT: DEFER**

**Specialist Inputs:**
- **Backend (MEDIUM confidence):** QuickBooks integration is built (PROD-011, Wave 6). Xero integration follows a similar OAuth + API sync pattern. However, QuickBooks has ~80% market share in the US SMB market. Xero is dominant in UK/Australia/NZ. Until Exit OSx has international demand, Xero is low-priority.
- **Growth (LOW confidence):** No data on how many target users use Xero vs QuickBooks. Without demand data, this is speculative.

**Committee Debate:**
- **Product Lead:** DEFERRED. QuickBooks covers the majority of US founders. Xero is an internationalization feature. Build it when users ask for it.
- **PM:** DEFER. Staircase Method: we are in activation phase. Adding a second accounting integration is expansion work.
- **CS:** DEFER. If a beta user uses Xero, they can still manually enter financials. Track how many request Xero.

**Rationale:** QuickBooks covers ~80% of US SMB market. Xero is dominant internationally. Until international demand is proven, defer. Track feature requests during beta.
**Effort:** N/A (deferred)
**Championed by:** PM (sequencing)

---

#### BF-018: AI-Powered EBITDA Bridge
**VERDICT: DEFER (but plan architecture)**

**Specialist Inputs:**
- **Business Appraiser (HIGH confidence):** This is the single highest-value financial feature on the roadmap. EBITDA normalization is the most important step in any valuation. Auto-generating adjustments (personal expenses, family payroll, one-time costs, owner perks) with plain-English explanations would be genuinely differentiated. No competitor does this well.
- **Financial Modeling (HIGH confidence):** The EBITDA adjustment model already exists (`addbacks` on FinancialPeriod). The AI layer would analyze line-item financial data and suggest adjustments. Requires: (1) detailed financial data (not just totals), (2) AI prompt engineering for adjustment identification, (3) UI for accept/reject/modify per adjustment.
- **CS (HIGH confidence):** Founders hate doing EBITDA adjustments. They do not know what qualifies. An AI that says "We noticed $20K in dining expenses -- if personal, adding 80% back adds $16K to your EBITDA" is the "holy shit" moment for financial mode.
- **Backend (MEDIUM confidence):** Requires line-item financial data from QuickBooks sync or uploaded statements. Current QB sync pulls totals, not line items. This needs a data pipeline enhancement.

**Committee Debate:**
- **Product Lead:** DEFERRED but this is the #1 post-beta feature. It passes every filter: Hormozi Value Equation (increases dream outcome + perceived likelihood), 10x test (spreadsheets cannot do this), painkiller test (yes, this is a painkiller). But it requires line-item financial data that we do not have yet. Plan the architecture during beta; build in the release after.
- **PM:** DEFER. Dependencies: line-item QB sync, AI prompt engineering, accept/reject UI. This is a 2-3 week feature. Ship it in the post-beta release as the hero feature.
- **CS:** FOUNDERS NEED THIS but not for beta. Founders in beta are activating, not normalizing EBITDA. This is a Growth/Exit-Ready tier feature for month 2+.

**Rationale:** Highest-value financial feature on the roadmap. Genuinely differentiated. But requires line-item financial data (QB sync enhancement), AI prompt engineering, and accept/reject UI. Plan architecture during beta; build as hero feature for first post-beta release.
**Effort:** 2-3 weeks (too large for pre-beta)
**Championed by:** Product Lead (strategic deferral)

---

#### BF-019: Pre-Populate DCF Page with Estimated FCF
**VERDICT: BUILD SOON**

**Specialist Inputs:**
- **UX (HIGH confidence):** An empty DCF page is a dead end. If the user has revenue and EBITDA from onboarding, the DCF page should show estimated FCF using a reasonable EBITDA-to-FCF conversion (e.g., 70-80% for SMBs). This demonstrates the value of the DCF tool.
- **Financial Modeling (MEDIUM confidence):** Estimating FCF from EBITDA is standard: FCF ~ EBITDA - CapEx - Working Capital Changes. Without detailed financials, a conservative estimate (60-75% of EBITDA) is reasonable. Mark it as "Estimated" clearly.

**Committee Debate:**
- **Product Lead:** APPROVED. Empty pages kill engagement. Pre-populate with labeled estimates. But this is an Exit-Ready tier feature. Only Exit-Ready users see DCF. Not urgent for beta launch.
- **PM:** BUILD SOON. Quick win for Exit-Ready users. 4-8 hours.
- **CS:** Good quality-of-life improvement for paid users. Ship during beta.

**Rationale:** Empty DCF page is a dead end for Exit-Ready users. Pre-populate with estimated FCF from EBITDA (60-75% conversion, labeled as "Estimated"). Ship during beta.
**Effort:** 4-8 hours
**Championed by:** UX

---

#### BF-020: Restore Working Capital on DCF Page
**VERDICT: BUILD SOON**

**Specialist Inputs:**
- **Financial Modeling (HIGH confidence):** Working capital is a standard DCF component. If it was previously on the page and was removed, restoring it is correct. Working capital adjustments affect the bridge from EBITDA to FCF.
- **Business Appraiser (HIGH confidence):** A DCF without working capital consideration is incomplete. Any CPA reviewing the output would note its absence.

**Committee Debate:**
- **Product Lead:** APPROVED. Restore what was built. Do not expand scope. This is a regression fix.
- **PM:** BUILD SOON. If the code existed before, restoring it is quick. Ship during beta.
- **CS:** Agree. Professional credibility item for Exit-Ready users.

**Rationale:** Working capital is a standard DCF component that was previously built and removed. Restore it. This is a regression fix, not new feature work.
**Effort:** 2-4 hours (restore existing logic)
**Championed by:** Financial Modeling

---

#### BF-021: Remove DCF Valuation Toggle & Weight to DCF
**VERDICT: DEFER**

**Specialist Inputs:**
- **Financial Modeling (MEDIUM confidence):** Weighting valuation toward DCF when financials are available is methodologically sound. But a "comparison view showing how DCF converges with multiple-based value" is a visualization feature, not a bug fix.
- **Business Appraiser (MEDIUM confidence):** Presenting both methodologies side-by-side is actually better than hiding one. Let users see multiple approaches and understand why they differ.

**Committee Debate:**
- **Product Lead:** DEFERRED. The current toggle works. A comparison view is a nice visualization but not a beta need. The convergence chart is Phase 2 polish.
- **PM:** DEFER. Expansion feature. The toggle is functional.
- **CS:** DEFER. Founders do not need to understand DCF vs. multiple convergence during beta.

**Rationale:** The current toggle between DCF and multiple-based valuation works. A convergence comparison view is interesting but is UX polish, not a beta requirement. Defer to post-beta.
**Effort:** N/A (deferred)
**Championed by:** PM

---

#### BF-022: Auto-Populate WACC Inputs from Company & Market Data
**VERDICT: DEFER**

**Specialist Inputs:**
- **Financial Modeling (MEDIUM confidence):** Auto-populating Beta, Market Risk Premium, and Size Premium from market data would improve the DCF experience. But this requires a market data source (Damodaran's data, CRSP, or an API). Without a data feed, you are hardcoding values that could become stale.
- **Backend (LOW confidence):** This requires either an API integration (cost) or a static data table (maintenance burden). Neither is trivial.

**Committee Debate:**
- **Product Lead:** DEFERRED. The DCF page is Exit-Ready tier. Auto-populating WACC inputs is polish for sophisticated users. Not a beta priority.
- **PM:** DEFER. Data dependency (market data source) makes this a Phase 2+ feature.
- **CS:** DEFER. Founders who use DCF are sophisticated enough to enter WACC assumptions manually.

**Rationale:** Requires market data source integration. DCF is Exit-Ready tier. Sophisticated users can enter WACC inputs manually. Defer to post-beta.
**Effort:** N/A (deferred)
**Championed by:** PM

---

### PERSONAL FINANCIAL STATEMENT

---

#### BF-023: Plaid Integration for PFS
**VERDICT: DEFER**

**Specialist Inputs:**
- **Backend (MEDIUM confidence):** Plaid integration is a significant engineering effort (OAuth, token management, account linking, data normalization). The PFS currently accepts manual entry, which works.
- **Security (HIGH confidence):** Plaid handles sensitive financial data. Integration requires careful security review, data retention policies, and user consent flows.
- **Wealth Advisor (MEDIUM confidence):** Auto-pulling bank and investment data would dramatically improve PFS adoption. But PFS is a Growth-tier feature. Most beta users on Foundation will not reach it.

**Committee Debate:**
- **Product Lead:** DEFERRED. Plaid is a significant integration (~2 weeks). PFS is Growth-tier. Manual entry works. Build when PFS adoption data shows it is a friction point.
- **PM:** DEFER. Staircase: activation phase. Plaid is expansion.
- **CS:** DEFER. If manual entry prevents PFS completion, track that during beta and build Plaid based on data.

**Rationale:** Plaid is a 2-week integration project. PFS is Growth-tier. Manual entry works. Track PFS completion rates during beta; build Plaid if completion rates are low due to manual entry friction.
**Effort:** N/A (deferred)
**Championed by:** PM

---

#### BF-024: Guided PFS Onboarding Wizard
**VERDICT: DEFER**

**Specialist Inputs:**
- **UX (MEDIUM confidence):** A conditional wizard (own vs. rent -> mortgage questions, etc.) is good UX but the PFS page already exists and works. This is a polish feature.
- **CS (LOW confidence):** No churn data suggests PFS completion is a problem. This is speculative improvement.

**Committee Debate:**
- **Product Lead:** DEFERRED. Smart conditional flow is nice but PFS is not a beta-critical feature. Defer until PFS adoption data is available.
- **PM:** DEFER. Same as BF-023. Track PFS usage during beta.
- **CS:** DEFER. No evidence this is needed yet.

**Rationale:** PFS works with manual entry. No data suggests the current flow is a friction point. Defer until beta usage data shows PFS completion is a problem.
**Effort:** N/A (deferred)
**Championed by:** PM

---

### GROWTH & ENGAGEMENT

---

#### BF-025: Transform Exit Readiness Report into Viral Growth Tool
**VERDICT: BUILD SOON**

**Specialist Inputs:**
- **Growth (HIGH confidence):** The onboarding-complete email currently sends a basic BRI summary. Transforming this into a high-quality, shareable report is the lowest-cost organic acquisition channel. If 10% of users share the report, each share reaches 3-5 people. This is the "free PR" flywheel.
- **Content (HIGH confidence):** The report needs: (1) The good (what is strong), (2) The bad (what is risky), (3) The ugly (what a buyer would flag), (4) Actionable recommendations, (5) A clear CTA to continue on Exit OSx. Make it look like a $5,000 consulting report.
- **CS (MEDIUM confidence):** Founders share things that make them look smart. A high-quality exit readiness report that they can show their CPA, attorney, or spouse is a natural sharing mechanism.

**Committee Debate:**
- **Product Lead:** APPROVED. But the quality bar is CRITICAL. A mediocre report damages the brand. This should look like a McKinsey deliverable, not a SaaS email. Build it right or do not build it. BUILD SOON, not BUILD NOW -- give it the time it needs.
- **PM:** BUILD SOON. Ship in week 2-3 of beta. Use beta users' reports as real-world test cases. This is the best organic growth lever available.
- **CS:** FOUNDERS NEED THIS. The current onboarding email is forgettable. A shareable report is the "show my spouse" moment that drives household buy-in for exit planning.

**Rationale:** The current onboarding email is weak. A high-quality, shareable Exit Readiness Report is the lowest-cost organic acquisition channel. But quality must be exceptional -- this is a brand-defining deliverable. Ship during beta (week 2-3) with time to polish.
**Effort:** 2-3 days
**Championed by:** Growth

---

### COLLABORATION & ACCESS

---

#### BF-026: Lightweight Task Invitations (Limited Access)
**VERDICT: BUILD SOON**

**Specialist Inputs:**
- **CS (HIGH confidence):** Task delegation email invites already exist (PROD-035, Wave 9). The question is: does the invited person need to create a full account, or can they complete the task (e.g., upload a document) via a limited-access link? A frictionless link-based flow dramatically increases task completion rates by external parties (CPA, attorney, office manager).
- **Security (HIGH confidence):** Limited-access links require: time-limited tokens, scope-limited permissions (upload only, no browse), audit logging of access. This is a non-trivial security feature.
- **Backend (MEDIUM confidence):** The CompanyInvite model and task invitation system exist. Extending it to support link-based limited access requires a new access token type and a minimal UI for the invited user.

**Committee Debate:**
- **Product Lead:** APPROVED. But scope it tightly. V1: invited person clicks a link, sees ONE task description, can upload ONE file, done. No account creation. No browse access. Token expires in 7 days. This is the "Sally, upload the payroll report" use case.
- **PM:** BUILD SOON. Ship during beta when users start delegating tasks. The task delegation flow (PROD-035) is the prerequisite, and it is done.
- **CS:** FOUNDERS NEED THIS. A founder who needs their office manager to upload a document should not require the office manager to create an Exit OSx account.

**Rationale:** Task delegation exists (PROD-035). Extend it with link-based limited access: click link, see task, upload file, done. No account required. Token expires in 7 days. Ship during beta.
**Effort:** 1-2 days
**Championed by:** Customer Success

---

### UI CONSISTENCY & CLEANUP

---

#### BF-027: Delete Account Danger Zone Styling
**VERDICT: BUILD SOON**

**Specialist Inputs:**
- **UX (LOW confidence):** Inconsistent styling between account deletion and company deletion danger zones is a cosmetic issue. Not blocking anything.

**Committee Debate:**
- **Product Lead:** APPROVED. 15-minute fix. Match the Company tab's danger zone styling. Do it during any settings cleanup pass.
- **PM:** BUILD SOON. Trivial effort, bundle with other polish.
- **CS:** Non-issue for beta users.

**Rationale:** 15-minute styling fix. Bundle with other settings cleanup work during beta.
**Effort:** 15 minutes
**Championed by:** UX

---

#### BF-028: Fix Login Event Naming
**VERDICT: BUILD NOW**

**Specialist Inputs:**
- **Growth (HIGH confidence):** Login success is tracked as `signup_submit` (confirmed in code: `src/app/(auth)/login/page.tsx` line 200). This corrupts analytics data. Every login looks like a signup in your funnel. COUNCIL-001 already mandated this fix as Tier 1, Item 5 (15 minutes).
- **Analytics is the foundation of growth.** If login and signup events are indistinguishable, you cannot measure retention (returning users) vs. acquisition (new users).

**Committee Debate:**
- **Product Lead:** APPROVED. Already mandated in COUNCIL-001. 15-minute fix. Execute.
- **PM:** BUILD NOW. Event naming is corrupting all funnel data.
- **CS:** Agree. Fix immediately.

**Rationale:** COUNCIL-001 already mandated this (Tier 1, Item 5). Login success event is misnamed as `signup_submit` in `src/app/(auth)/login/page.tsx`. Change to `login_success`. 15 minutes.
**Effort:** 15 minutes
**Championed by:** Growth

---

#### BF-029: Delete Finder Copy Artifacts
**VERDICT: ALREADY DONE (Kill as tracked item)**

**Specialist Inputs:**
- **Frontend (HIGH confidence):** Grep search for `page 2.tsx` and `docId] 2` returns no results. The Finder copy artifacts have already been cleaned up. COUNCIL-001 mandated this as Tier 1, Item 6.

**Committee Debate:**
- **Product Lead:** KILLED as work item. Already cleaned up. No artifacts found in codebase search.
- **PM:** Already done. Remove from tracking.
- **CS:** Confirmed. No action needed.

**Rationale:** Grep search confirms no Finder copy artifacts remain in the codebase. Already cleaned up per COUNCIL-001 mandate.
**Effort:** 0 (already done)
**Championed by:** Product Lead (kill)

---

## COMMITTEE DEBATE SUMMARY

### Vote: UNANIMOUS (3-0)

**Product Lead:** APPROVED WITH CHANGES. 29 items evaluated. 8 Build Now, 7 Build Soon, 8 Defer, 6 Kill/Already Done. The key insight: the "Build Now" list is entirely infrastructure and bug fixes (feedback widget, skip removal, CSS fix, responsive audit, event naming). Zero new features in the Build Now tier. This is correct -- beta is about making the existing product work reliably, not adding new capabilities.

**Product Manager:** BUILD NOW on the 8 items, with strict sequencing. The Staircase Method confirms: we are in the activation bottleneck ($0 to first paying user). Every Build Now item serves activation or quality. Every Defer serves expansion. The sequencing is correct.

**Customer Success:** FOUNDERS NEED what we are building. The 8 Build Now items are all "if this is broken/missing, founders will not activate." The 7 Build Soon items are "founders will ask for these during beta." The 8 Deferred items are "founders will want these eventually but not during activation."

---

## FINAL DECISION: PRIORITIZED SPRINT PLAN

### PHASE 1: PRE-BETA (Ship Before First Beta User Enters)

| # | BF | Item | Effort | Why |
|---|---|------|--------|-----|
| 1 | BF-003 | Remove onboarding skip option | 30 min | Activation killer. Already mandated in COUNCIL-001. |
| 2 | BF-028 | Fix login event naming | 15 min | Analytics corruption. Already mandated in COUNCIL-001. |
| 3 | BF-007 | Remove number spinner arrows | 5 min | CSS one-liner. Prevents accidental value changes on financial inputs. |
| 4 | BF-001 | Beta feedback & bug reporting | 4-8 hours | Wire SupportTicket form to frontend. Beta without feedback = flying blind. |
| 5 | BF-008 | Responsive layout fix (critical) | 1-2 days | Fix DCF disappearing inputs. Test 5 core pages at 768px/1280px. |
| **Total** | | | **~2 days** | |

### PHASE 2: BETA WEEK 1-2 (Ship After Beta Starts, Before Second Cohort)

| # | BF | Item | Effort | Why |
|---|---|------|--------|-----|
| 6 | BF-006 | Company name & BRI in header | 4-8 hours | BRI score visibility = retention hook. |
| 7 | BF-005 | "I Don't Know" on assessments | 1 day | Prevents assessment abandonment. |
| 8 | BF-025 | Exit Readiness Report v2 | 2-3 days | Organic growth channel. Quality must be exceptional. |
| 9 | BF-009 | Evidence page guidance (not redesign) | 1-2 days | Add "Why Buyers Want This" help text per document type. |
| **Total** | | | **~5-6 days** | |

### PHASE 3: BETA WEEK 3-4 (Polish Based on Real User Feedback)

| # | BF | Item | Effort | Why |
|---|---|------|--------|-----|
| 10 | BF-004 | Richer business description + AI ICB | 1-2 days | Improve onboarding data quality. AI pre-selects industry. |
| 11 | BF-026 | Lightweight task invitations | 1-2 days | Link-based limited access for task delegation. |
| 12 | BF-013 | Fix contact edit (missing company field) | 2-4 hours | Bug fix in Deal Room contacts. |
| 13 | BF-019 | Pre-populate DCF with estimated FCF | 4-8 hours | Empty page fix for Exit-Ready users. |
| 14 | BF-020 | Restore working capital on DCF | 2-4 hours | Regression fix. |
| 15 | BF-014 | Auto-add prospect to pipeline | 4-8 hours | Workflow optimization for Deal Room. |
| 16 | BF-015 | Pipeline archive functionality | 2-4 hours | Standard pipeline feature. |
| 17 | BF-012 | Activity page empty state | 30 min | Simple empty state component. |
| 18 | BF-027 | Danger zone styling consistency | 15 min | Cosmetic fix. |
| **Total** | | | **~5-6 days** | |

### DEFERRED (Post-Beta, Future Releases)

| BF | Item | When to Build |
|---|------|---------------|
| BF-010 | Data Room comprehensive planning | When first cohort approaches 90-day gate |
| BF-011 | Data Room permissions & sharing | When Deal Room has active users |
| BF-017 | Xero integration | When international demand is proven |
| BF-018 | AI-Powered EBITDA Bridge | Post-beta hero feature (plan architecture during beta) |
| BF-021 | DCF valuation toggle & weighting | Post-beta polish |
| BF-022 | Auto-populate WACC inputs | Post-beta, requires market data source |
| BF-023 | Plaid integration for PFS | When PFS completion data shows friction |
| BF-024 | Guided PFS onboarding wizard | When PFS adoption data is available |

### KILLED / ALREADY DONE

| BF | Item | Status |
|---|------|--------|
| BF-002 | Error tracking (Sentry) | ALREADY DONE -- Sentry integrated in `src/instrumentation.ts`. Verify DSN in Vercel env vars. |
| BF-016 | Trello-style pipeline | ALREADY DONE -- PROD-041 completed in Wave 10. |
| BF-029 | Delete Finder copy artifacts | ALREADY DONE -- No artifacts found in codebase search. |

---

## CRITICAL FINAL FILTER: MARTELL + HORMOZI FRAMEWORKS

### Dan Martell's "Buy Back Your Time" / SaaS Playbook Framework

**Applied to every Build Now and Build Soon item:**

| BF | Churn/Activation? | Magic Moment? | 10x Test | Vitamin or Painkiller? | Replacement Ladder |
|---|---|---|---|---|---|
| BF-001 (Feedback) | Reduces churn (silent bug = silent churn) | No | N/A (infrastructure) | Painkiller for the team | PRODUCT does this (widget), not a person |
| BF-003 (No Skip) | Increases activation (forces first-win moment) | YES -- BRI score IS the magic moment | 10x vs. nothing (skippers get nothing) | Painkiller (prevents empty dashboard) | PRODUCT forces the path |
| BF-007 (No Spinners) | Prevents trust-breaking bugs | No | N/A | Painkiller (prevents accidental changes) | PRODUCT prevents the error |
| BF-008 (Responsive) | Prevents broken experience | No | N/A | Painkiller (broken layout = broken trust) | PRODUCT works everywhere |
| BF-028 (Event Fix) | Enables accurate measurement | No | N/A | Painkiller (corrupted data = wrong decisions) | PRODUCT reports correctly |
| BF-005 (IDK Option) | Reduces assessment abandonment | No | Better than spreadsheet (spreadsheets do not ask questions) | Painkiller (prevents stalling) | PRODUCT adapts to user knowledge |
| BF-006 (BRI Header) | Increases return visits (retention anchor) | Reinforces magic moment | N/A | Vitamin (nice to have, not urgent) | PRODUCT reminds constantly |
| BF-025 (Report) | Drives organic acquisition | YES -- the "show my spouse" moment | 10x vs. a generic email | Painkiller for organic growth | PRODUCT creates the asset |
| BF-026 (Task Links) | Increases task completion rate | No | 10x vs. "call Sally and ask her to create an account" | Painkiller for delegation friction | PRODUCT replaces manual coordination |
| BF-004 (Rich Description) | Improves data quality | No | Better than manual ICB browsing | Vitamin (current flow works) | PRODUCT does the classification |

**Martell Verdict:**
- BF-003 (No Skip) is the highest-leverage single change -- it forces the magic moment
- BF-025 (Report) is the best Replacement Ladder item -- the product creates a consulting-grade deliverable that would cost $5K from a human
- BF-026 (Task Links) replaces the most expensive human work -- manual coordination with external parties
- BF-018 (EBITDA Bridge, deferred) is the ultimate Replacement Ladder item -- replaces a $10K-$25K CPA engagement for EBITDA normalization

**Martell Elevations:**
- ELEVATE BF-025 (Exit Readiness Report): This is the single best organic growth mechanism. Martell calls this "productized content marketing." A shareable report that makes the founder look smart is worth more than any paid ad. Consider moving to Phase 1 if quality can be ensured.

**Martell Kills:**
- No items killed by Martell framework that are not already deferred or killed.

### Alex Hormozi's Value Equation

**Value = (Dream Outcome x Perceived Likelihood of Achievement) / (Time Delay x Effort & Sacrifice)**

**Applied to Build Now + Build Soon items:**

| BF | Dream Outcome | Perceived Likelihood | Time Delay | Effort & Sacrifice |
|---|---|---|---|---|
| BF-001 (Feedback) | -- | Increases (bugs get fixed faster) | -- | -- |
| BF-003 (No Skip) | -- | INCREASES (user sees full picture, not partial) | -- | Slight increase (2 more minutes) |
| BF-005 (IDK Option) | -- | -- | -- | DECREASES (no stalling on unknown answers) |
| BF-006 (BRI Header) | -- | Increases (constant reminder of progress) | -- | -- |
| BF-007 (No Spinners) | -- | Increases (trust preserved) | -- | DECREASES (no accidental errors) |
| BF-008 (Responsive) | -- | Increases (works on all devices) | -- | DECREASES (no workarounds needed) |
| BF-009 (Evidence Guidance) | -- | INCREASES (user knows what to upload and why) | -- | DECREASES (clear instructions) |
| BF-025 (Report) | INCREASES (founder sees $5K-value report for free) | INCREASES (professional output validates platform) | -- | -- |
| BF-026 (Task Links) | -- | INCREASES (tasks get completed by others) | DECREASES (faster task completion) | DECREASES (no account creation for delegatees) |
| BF-028 (Event Fix) | -- | -- (infrastructure) | -- | -- |

**Hormozi "100M Offers" Analysis:**

The items that compound into a value stack:
1. **BF-003 (No Skip)** -- forces the dream outcome reveal (your BRI score, your value gap, your first action)
2. **BF-025 (Report)** -- makes the dream outcome tangible and shareable (a professional document)
3. **BF-009 (Evidence Guidance)** -- increases perceived likelihood ("I know exactly what to do")
4. **BF-026 (Task Links)** -- reduces effort ("I do not have to do this all myself")
5. **BF-005 (IDK Option)** -- reduces effort ("I can still proceed even when I do not know everything")

**Hormozi Verdict:**
The value stack is: **See your full picture (BF-003) -> Get a professional report (BF-025) -> Know exactly what to upload (BF-009) -> Delegate to others (BF-026) -> Never get stuck (BF-005)**. This sequence reduces denominator (effort, sacrifice) while increasing numerator (dream outcome, perceived likelihood). The order matters: you cannot share a report if you skipped the assessment that generates it.

**Hormozi Elevations:**
- ELEVATE BF-009 (Evidence Guidance): Hormozi's framework says "increase perceived likelihood of achievement." A founder who lands on the Evidence page and sees clear guidance for EVERY document ("Here is what buyers want and why") has dramatically higher perceived likelihood of completing the evidence scorecard. Move from Phase 3 to Phase 2.
  - **Already placed in Phase 2** -- no change needed.

**Hormozi Kills:**
- BF-021 (DCF Toggle): Does not move any quadrant of the value equation meaningfully. Founders do not care about DCF vs. multiple convergence. Kill or deep-defer.
- BF-022 (Auto WACC): Same. WACC auto-population is a "vitamin" that does not move the value equation.

---

## FINAL PRIORITIZED SPRINT PLAN (Post-Framework Filter)

No changes from the initial phase plan. Both frameworks confirm the prioritization:

### Phase 1: Pre-Beta (2 days)
1. BF-003: Remove skip option (30 min) -- **Hormozi: forces dream outcome reveal**
2. BF-028: Fix login event naming (15 min) -- **Martell: painkiller for analytics**
3. BF-007: Remove number spinners (5 min) -- **Hormozi: reduces effort**
4. BF-001: Beta feedback widget (4-8 hours) -- **Martell: replaces silent churn**
5. BF-008: Responsive layout fixes (1-2 days) -- **Hormozi: reduces effort**

### Phase 2: Beta Week 1-2 (5-6 days)
6. BF-006: BRI in header (4-8 hours) -- **Hormozi: increases perceived likelihood**
7. BF-005: "I Don't Know" option (1 day) -- **Hormozi: reduces effort**
8. BF-025: Exit Readiness Report v2 (2-3 days) -- **Martell: productized content, Replacement Ladder**
9. BF-009: Evidence page guidance (1-2 days) -- **Hormozi: increases perceived likelihood**

### Phase 3: Beta Week 3-4 (5-6 days)
10-18: BF-004, BF-026, BF-013, BF-019, BF-020, BF-014, BF-015, BF-012, BF-027

### Deferred
BF-010, BF-011, BF-017, BF-018, BF-021, BF-022, BF-023, BF-024

### Killed / Already Done
BF-002, BF-016, BF-029

---

## THE STRATEGIC NARRATIVE

**The story this sprint sequence tells:**

**Phase 1 says:** "We fixed the foundation. The product works on every device, does not break your numbers, does not let you skip the important parts, and tells us when something goes wrong."

**Phase 2 says:** "We made the experience excellent. You always know your BRI score. You never get stuck on questions. Your Exit Readiness Report is something you will want to show your spouse, your CPA, and your board. You know exactly what to upload and why."

**Phase 3 says:** "We polished the edges. Your DCF page has numbers when you arrive. Your pipeline has archive. Your contacts can be edited fully. Your delegated tasks do not require account creation."

**The deferred items say:** "We are not building integration features (Xero, Plaid), advanced financial modeling (AI EBITDA bridge, WACC auto-populate), or data room permissions until we have paying users who need them. We build what the current user needs, not what the imagined user might want."

**This is the Staircase Method in action:** Activation (Phase 1) -> Engagement (Phase 2) -> Polish (Phase 3) -> Expansion (Deferred). No feature is built ahead of its dependency. No expansion feature is built during the activation phase.

---

## ITEMS ELEVATED BY FRAMEWORK FILTER

| BF | Original Phase | Elevated To | Framework | Reasoning |
|---|---|---|---|---|
| BF-025 | Phase 2 | Phase 2 (confirmed, considered for Phase 1) | Martell Replacement Ladder | Replaces $5K consulting deliverable. Best organic growth lever. Kept in Phase 2 only because quality bar requires it. |

## ITEMS KILLED OR RETHOUGHT BY FRAMEWORK FILTER

| BF | Original Phase | New Status | Framework | Reasoning |
|---|---|---|---|---|
| BF-021 | Deferred | DEEP-DEFER / RETHINK | Hormozi Value Equation | Does not move any quadrant of the equation. Founders do not care about DCF vs. multiple convergence. |
| BF-022 | Deferred | DEEP-DEFER | Hormozi Value Equation | WACC auto-population is a vitamin. Sophisticated DCF users can enter their own assumptions. |

---

## CROSS-REFERENCE WITH COUNCIL-001 MANDATES

| COUNCIL-001 Mandate | BF Item | Status |
|---|---|---|
| Stripe billing integration | NOT in BF list | Still #1 priority. Not addressed by any BF item. MUST be done separately. |
| Onboarding analytics | NOT in BF list | Still #2 priority. Not addressed by any BF item. MUST be done separately. |
| Remove skip option | BF-003 | CONFIRMED. Build Now. |
| Deploy Redis | NOT in BF list | Still #4 priority. Not addressed by any BF item. MUST be done separately. |
| Fix login event naming | BF-028 | CONFIRMED. Build Now. |
| Delete Finder artifacts | BF-029 | ALREADY DONE. |
| Email drip sequences | NOT in BF list | Still high priority. Not addressed by any BF item. MUST be done separately. |
| In-app support | BF-001 | PARTIALLY ADDRESSED. Feedback widget doubles as support channel. |
| Kill StreamlinedOnboarding | NOT in BF list | Still needed. StreamlinedOnboardingFlow.tsx and FocusedOnboardingWizard.tsx still exist in codebase. |

**CRITICAL NOTE:** The BF list does NOT include the top COUNCIL-001 priorities (Stripe, onboarding analytics, Redis, email drip sequences). These must be scheduled separately and take precedence over ALL BF items except the 30-minute BF-003 and 15-minute BF-028 quick fixes.

**Recommended combined priority order:**
1. BF-003: Remove skip option (30 min)
2. BF-028: Fix login event naming (15 min)
3. BF-007: Remove number spinners (5 min)
4. **COUNCIL-001: Onboarding analytics** (1 day)
5. **COUNCIL-001: Deploy Redis** (2 hours)
6. **COUNCIL-001: Kill StreamlinedOnboarding + FocusedOnboardingWizard** (1 hour)
7. BF-001: Beta feedback widget (4-8 hours)
8. BF-008: Responsive layout fixes (1-2 days)
9. **COUNCIL-001: Stripe billing** (3-5 days)
10. **COUNCIL-001: Email drip sequences** (2-3 days)
11. BF-006, BF-005, BF-025, BF-009 (Phase 2)

---

## DISSENT RECORD

**No dissent. All three committee members are unanimous on all 29 items.**

---

## METRICS & FOLLOW-UP

| Metric | Target | Timeframe | Owner |
|---|---|---|---|
| Onboarding completion rate (post skip removal) | >80% | 2 weeks post-beta | Growth |
| Beta feedback submissions | >10 per week | First 4 weeks | CS |
| Responsive layout bugs reported | <3 | First 4 weeks | QA |
| Exit Readiness Report share rate | >5% of recipients | 30 days post-launch | Growth |
| Assessment "I Don't Know" usage rate | Track baseline | 30 days post-launch | CS |
| Evidence page engagement (time on page) | Track baseline pre/post guidance | 30 days | Growth |
| Task delegation completion rate (via links) | >50% | 60 days | CS |

**REVIEW DATE:** 2026-03-15 (30 days from today)

---

*Product Council Decision Record -- COUNCIL-003*
*Produced by Exit OSx Product Council Orchestrator*
*2026-02-13*
