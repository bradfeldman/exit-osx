# Playbook Integration UX Specification
**Version:** 1.0
**Date:** 2026-02-19
**Author:** Product Design UX Agent

---

## Executive Summary

This document recommends how 44 interactive HTML playbooks should be incorporated into the Exit OSx user experience. The core recommendation is a **Focus Mode** architecture: playbooks open inline within the app shell, replacing the main content area while retaining a modified top bar that provides wayfinding back to the app. The playbook's own internal sidebar replaces the app sidebar. The playbooks are reskinned to the app's design system. Discovery is driven by AI-powered contextual surfacing, not a browse-first library.

The guiding principle: **playbooks are the work; the dashboard is the map.** Users should never feel like they are leaving the product to use the product.

---

## 1. Understanding the Problem

### What We Have
- **The App (mocksite):** 88 pages of dashboard, analytics, and deal management. Apple HIG design system (SF Pro, #0071E3 blue accent, white sidebar, #F5F5F7 background). The app is where users orient, monitor, and plan.
- **The Playbooks:** 44 standalone HTML files, each a deep 8-20 section guided experience with interactive assessments, score selectors, checklists, and dashboards. Playbook design system (Georgia serif, #2D5A3D forest green, #B87333 burnt orange accent, #1A1917 dark sidebar). The playbooks are where users DO the actual work of preparing for exit.
- **The Gap:** No integration exists. The app's `playbook.html` page shows cards with "Start Playbook" buttons, but clicking them leads to `playbook-detail.html`, which is a static overview page -- not the interactive playbook itself. The actual interactive playbooks are standalone files with their own navigation, their own design language, and no connection back to the app.

### The Core Tension
The app is a **10-second glance tool** (check score, see what changed, decide what to do next). The playbooks are a **20-minute deep work tool** (sit down, think hard, make assessments, input data). These are fundamentally different modes of interaction, and the integration must respect both without making either feel awkward.

### What Users Actually Need
A business owner preparing for exit needs to:
1. Understand their readiness gaps (the app does this via BRI, valuation, signals)
2. Know what to work on next (the app does this via Action Center, AI recommendations)
3. Actually do the work (the playbooks do this, but they are disconnected from 1 and 2)
4. See their progress reflected back in the system (currently broken -- playbook scores live in localStorage, invisible to the app)

The integration must close the loop between steps 2 and 3, and create the feedback loop in step 4.

---

## 2. Integration Architecture: Focus Mode

### Recommendation: Inline Focus Mode
When a user opens a playbook, the app enters **Focus Mode**:

- The **app sidebar disappears** (it is not relevant during deep work)
- The **playbook's own sidebar appears** in its place (section navigation, progress bar, score display)
- The **main content area** is replaced by the playbook content
- A **Focus Mode top bar** replaces the standard app header, providing:
  - A left-aligned back arrow + breadcrumb: "Exit OS / Playbooks / Owner Dependency Reduction"
  - A centered progress indicator: "Section 4 of 14 -- 28% complete"
  - Right-aligned controls: Save status ("Auto-saved"), Close (X) button
- The **URL updates** to reflect the playbook state: `/playbook/pb-03/assessment` (deep-linkable, resumable)

### Why Not Other Approaches

**New tab / new window:** Rejected. This is the simplest implementation but the worst UX. The user now has two separate browser contexts with no shared state, no way for the app to know what happened in the playbook, and a total brand/experience rupture. It tells the user "this is a different product."

**Slide-over panel:** Rejected. The playbooks are too content-heavy (800px content area + 260px sidebar = 1060px minimum). A slide-over panel from the right would either be too narrow (cramping the content) or so wide it basically replaces the main content anyway. Panels are for quick reference, not 20-minute deep work sessions.

**Modal/overlay:** Rejected for the same reasons as slide-over. Modals communicate "quick interruption, then back to what you were doing." Playbooks are the main event, not an interruption.

**Separate SPA route:** Close to our recommendation, but the distinction matters. A separate route (e.g., `/playbooks/pb-03`) that loads a completely different layout shell would work, but it creates an engineering seam that increases complexity. Focus Mode is a layout variant of the existing shell, not a separate application.

### Focus Mode Layout Specification

```
+---------------------------------------------------------------------+
| [<-] Exit OS / Playbooks / Owner Dependency       [Auto-saved] [X]  |  <- Focus Bar (48px, fixed top)
+---------------------------------------------------------------------+
|                |                                                     |
|  SIDEBAR       |  MAIN CONTENT                                      |
|  (260px)       |  (max-width: 800px, centered)                      |
|                |                                                     |
|  Brand block   |  [Page title]                                      |
|  Progress bar  |                                                     |
|  Section nav   |  [Content: forms, selectors, cards, tables]        |
|  (locked/      |                                                     |
|   unlocked/    |  [Back] ............... [Continue -->]              |
|   completed)   |                                                     |
|  Score display |                                                     |
+---------------------------------------------------------------------+
```

### Focus Bar Behavior

The Focus Bar is the lifeline back to the app. It must always be visible (position: fixed, top: 0, z-index: 200). It uses the app's design system (SF Pro, white background, #E5E7EB border-bottom), not the playbook's.

| Element | Behavior |
|---------|----------|
| Back arrow | Returns to the playbook-detail page (overview). NOT window.history.back(). |
| Breadcrumb | "Exit OS > Playbooks > {Playbook Title}". Only the first two segments are clickable links. |
| Progress | Text: "Section 4 of 14" + thin progress bar underneath. Updates on page navigation within playbook. |
| Save status | Shows "Auto-saved" with a subtle checkmark. Pulses briefly on each auto-save. Turns to "Saving..." during write. |
| Close (X) | Returns to wherever the user came from (referrer). If no referrer, goes to `/playbook` (the playbook hub). Confirmation dialog ONLY if unsaved changes exist (which should be rare given auto-save). |

### Mobile Focus Mode

On mobile (< 900px), Focus Mode is even simpler:
- Focus Bar collapses to: [<-] [Playbook title (truncated)] [hamburger for section nav]
- The playbook sidebar becomes a slide-over drawer (same as current mobile pattern in the standalone playbooks)
- No app chrome whatsoever -- the playbook owns the entire screen
- Bottom safe-area padding for iOS

---

## 3. Design System Reconciliation: Reskin to App

### Recommendation: Reskin All 44 Playbooks to the App Design System

The playbooks must adopt the app's visual language. Users should not perceive a design system change when entering Focus Mode. The transition should feel like going from a map view to a detail view within the same product -- not like leaving one product for another.

### What Changes

| Property | Current (Playbook) | Target (App) |
|----------|-------------------|--------------|
| Body font | Segoe UI / system-ui | SF Pro / -apple-system |
| Display font | Georgia serif | SF Pro Display (weight 700) |
| Sidebar background | #1A1917 (warm near-black) | #FFFFFF (white) with #E5E7EB right border |
| Sidebar text | White on dark | #6E6E73 on white, #0071E3 for active |
| Primary color | #2D5A3D (forest green) | #0071E3 (blue accent) |
| Accent color | #B87333 (burnt orange) | #FF9500 (orange, already in app palette) |
| Background | #FAFAF9 (warm off-white) | #F5F5F7 (cool gray) |
| Surface | #FFFFFF | #FFFFFF (unchanged) |
| Border | #E8E5E0 (warm gray) | #E5E7EB (cool gray) |
| Border radius | 6/10/14/20px | 8/12/16px (app radius scale) |
| Score color 5 (best) | #1A6B35 (dark green) | #34C759 (Apple green) |
| Score color 1 (worst) | #C53030 (dark red) | #FF3B30 (Apple red) |
| Buttons | Forest green primary | Blue (#0071E3) primary |
| Progress bar fill | Burnt orange | Blue (#0071E3) |
| Completed checks | Green fill | #34C759 green fill |

### What Stays the Same

The playbook's **structural design** is excellent and should not change:
- Progressive section locking (unlock on completion)
- Score selectors (1-5 scale with color coding)
- Welcome page hero pattern (icon + title + stats + phases + CTA)
- Dashboard/scorecard as final section
- Callout boxes (info/warning/danger/accent -- just recolor)
- Expandable cards, data tables, checklist items
- Bar chart visualizations
- Gauge ring for composite score
- Toast notifications
- Auto-save to localStorage
- Section phase labels in sidebar nav

### The White Sidebar Question

This is the most consequential visual change. The current dark sidebar (#1A1917) gives the playbooks a distinct, immersive "deep work" feeling. Switching to a white sidebar to match the app means the playbook sidebar will look like the app sidebar, which aids coherence but loses some of that immersive quality.

**My recommendation is to use the white sidebar.** The coherence benefit outweighs the atmosphere loss. The Focus Bar already signals "you are in a special mode." The playbook sidebar content itself (section progress, completion checks, score display) is different enough from the app sidebar (nav menu) that users will not confuse the two, even with the same background color.

To preserve some of the "deep work" distinction:
- Add a subtle left border accent on the active section (3px, blue)
- Use slightly more compact spacing in the playbook sidebar than the app sidebar
- Show the progress bar prominently at top of sidebar with a bolder visual treatment
- Display the composite score in a larger, more prominent card at the bottom of the sidebar

### Implementation Strategy

This is a batch CSS token replacement, not a content rewrite. The unified design spec (`UNIFIED-DESIGN-SPEC.md`) already defines the playbook token system. The migration creates a NEW token set that maps to the app's values:

```css
:root {
  /* Map playbook tokens to app values */
  --color-primary: #0071E3;        /* was #2D5A3D */
  --color-primary-light: #EBF5FF;  /* was #E8F0EB */
  --color-accent: #FF9500;         /* was #B87333 */
  --color-accent-light: #FFF6E8;   /* was #FFF3E8 */
  --color-bg: #F5F5F7;             /* was #FAFAF9 */
  --color-surface: #FFFFFF;        /* unchanged */
  --color-border: #E5E7EB;         /* was #E8E5E0 */
  --color-text: #1D1D1F;           /* was #1A1917 */
  --color-text-secondary: #6E6E73; /* was #6B6860 */
  --color-score-1: #FF3B30;        /* was #C53030 */
  --color-score-5: #34C759;        /* was #1A6B35 */
  /* ... etc */
}
```

The HTML structure, JavaScript logic, section content, and interaction patterns remain unchanged. This is a theme swap, not a rebuild.

---

## 4. Progressive Disclosure: How 44 Playbooks Get Surfaced

### The Problem
44 playbooks is overwhelming. The current `playbook-library.html` shows 14 in a flat grid, which is already heavy. At 44, a library grid would be paralyzing. No user should ever see all 44 at once.

### Recommendation: Three-Layer Discovery Model

**Layer 1: Contextual Surfacing (Primary)**
Playbooks appear where and when they are relevant, throughout the app. The user never needs to go looking for a playbook -- the right playbook finds them.

| Surface | Trigger | Example |
|---------|---------|---------|
| Dashboard "Next Move" card | Lowest BRI category score | "Your Financial Readiness is 32/100. The EBITDA Normalization playbook can help. [Start Playbook]" |
| Signal detail page | Risk signal detected | Signal: "Customer concentration exceeds 40%." Action: "[Start] Customer De-Risking Playbook (PB-14)" |
| Action Center task | Task type matches playbook | Task: "Prepare financial projections." Resource: "Use the [Three-Year Projection Playbook] for step-by-step guidance" |
| AI Coach conversation | User asks relevant question | "I can walk you through that. We have a step-by-step playbook for EBITDA normalization. [Open Playbook]" |
| Assessment results | Category score is low | After completing the Operations assessment: "Your score suggests 3 playbooks that would help. [View Recommendations]" |
| Diagnosis page risk driver | Specific risk identified | Risk driver: "No documented SOPs." Playbook link: "[SOPs & Process Documentation]" |
| Post-assessment summary | Overall readiness gap | "Based on your assessment, here are your top 3 recommended playbooks, ranked by value impact." |

This is the most important layer. It means the playbooks are integrated into the product's intelligence, not siloed in a library.

**Layer 2: Curated Recommendations (Secondary)**
The `playbook.html` page (renamed to "Your Playbooks") shows:

1. **Active Playbooks** (top section) -- playbooks the user has started, sorted by last activity. Shows: title, progress ring, next section name, last active date. Maximum 3 visible; "View all active" link if more.

2. **Recommended for You** (middle section) -- AI-selected playbooks based on current scores, assessment results, and gap analysis. Shows: top 3 ranked by estimated value impact. Each card shows: title, one-sentence "why this matters for you" rationale, estimated value impact, estimated time. This is the existing dark banner pattern from `playbook.html`, which is well-designed.

3. **Recently Completed** (bottom section) -- playbooks finished in last 90 days, with score achieved and option to revisit/re-assess.

No "browse all" grid on this page. Instead, a single text link: "Browse all 44 playbooks in the Library" at the very bottom.

**Layer 3: Full Library (Tertiary)**
The `playbook-library.html` page is preserved but redesigned as a reference view, not a starting point. Think of it like a course catalog -- useful for exploration, but not where most users begin.

Changes:
- Add a **journey view** option alongside the current category filter. The journey view groups playbooks by exit phase: Personal Readiness (1-5) > Financial Cleanup (6-11) > Operations (12-18) > Legal & Compliance (19-25) > Growth & Value (26-30) > Deal Prep (31-38) > Contingency (39-44). Each phase is a collapsible section with a progress summary (e.g., "Financial Cleanup: 2 of 6 complete").
- Add search (the existing search box is good).
- Add a **status filter** alongside category filter: All / Not Started / In Progress / Completed.
- Show the user's score for completed playbooks on the card.

### Freemium Gating

Not all 44 playbooks should be free. Recommendation:

| Tier | Playbooks | Count | Rationale |
|------|-----------|-------|-----------|
| Free | PB-01 (Financial Independence), PB-03 (Owner Dependency), PB-06 (Financial Cleanup), PB-08 (Revenue Quality), PB-15 (SOPs) | 5 | These cover the most common readiness gaps and demonstrate the playbook value proposition. Completing any one of them is the "aha moment" for playbook engagement. |
| Professional | All remaining 39 | 39 | The depth of the playbook library is a primary differentiator for the paid tier. |

Locked playbooks in the library show the welcome page (first section) for free. When the user clicks "Continue" to the second section, they hit the upgrade prompt. This follows the "show value before asking for investment" principle -- let them see the structure and quality of the content before gating.

In contextual surfacing (Layer 1), locked playbook recommendations still appear, but with a subtle lock icon and "Pro" badge. The recommendation rationale is fully visible. The CTA says "Unlock with Professional Plan" instead of "Start Playbook."

---

## 5. Navigation Model: Moving Between App and Playbooks

### Entry Points (App to Playbook)

Every entry point follows the same flow:
1. User clicks a playbook link/button anywhere in the app
2. App navigates to the **Playbook Detail page** (`playbook-detail.html`) -- this is the "airlock"
3. User reviews overview, phases, estimated time, value impact
4. User clicks "Start Playbook" or "Continue" (if in-progress)
5. App enters **Focus Mode** and loads the playbook at the user's last position (or the Welcome page if new)

The Playbook Detail page serves a critical function: it gives the user a moment to assess whether they want to commit 20+ minutes to this playbook right now. It prevents accidental entry into Focus Mode. It is the "you are about to enter deep work" threshold.

**Exception:** If a playbook is already in-progress and the user clicks "Continue" from the dashboard "Active Playbooks" section, skip the detail page and go directly to Focus Mode at the user's last position. They already made the commitment; do not make them re-confirm.

### Exit Points (Playbook to App)

| Exit Method | Behavior |
|-------------|----------|
| Focus Bar back arrow | Returns to Playbook Detail page for this playbook |
| Focus Bar close (X) | Returns to the page the user came from (stored referrer) |
| Breadcrumb "Playbooks" link | Returns to the Playbook Hub (/playbook) |
| Breadcrumb "Exit OS" link | Returns to the Dashboard (/) |
| Completing the final section | Shows completion celebration, then auto-redirects to Playbook Detail page (which now shows "Completed" state with score) |
| Browser back button | Returns to previous playbook section if within playbook, or to the detail page if on the first section |

### Resume Behavior

When a user returns to an in-progress playbook (from any entry point):
1. Focus Mode loads
2. The playbook opens to the **last active section** (stored in localStorage as `currentPage`)
3. The sidebar shows all completed sections with checkmarks, the current section as active, and locked sections as locked
4. A subtle toast appears: "Welcome back. You're on section 4 of 14."

If the user has been away for 7+ days, the toast becomes slightly more helpful: "Welcome back -- it's been 12 days. You were working on the Financial Assessment section."

---

## 6. Data Flow: Playbook Scores to App Scoring Engine

### The Connection Problem

Currently, playbook scores live in localStorage (`exitosx-pb03-owner-dependency`, etc.) and are completely invisible to the app's scoring engine (BRI, valuation). This is the biggest integration gap. The entire value proposition of playbooks is that completing them improves your readiness. If the app does not reflect that improvement, the feedback loop is broken.

### Recommendation: Event-Based Score Sync

When a playbook section is completed or a score is updated:

1. **Playbook JS** dispatches a custom event:
```javascript
window.dispatchEvent(new CustomEvent('playbook:score-update', {
  detail: {
    playbookId: 'pb-03',
    playbookTitle: 'Owner Dependency Reduction',
    compositeScore: 67,
    sectionScores: { dependency: 42, delegation: 71, documentation: 88 },
    completedSections: 8,
    totalSections: 14,
    percentComplete: 57,
    lastUpdated: new Date().toISOString()
  }
}));
```

2. **App's PlaybookContext** (new context provider in the DashboardShell) listens for these events and:
   - Updates the in-memory playbook state
   - Persists to the database via API call: `POST /api/playbook-progress`
   - Triggers a re-evaluation of relevant BRI category scores
   - If the composite score crossed a threshold (e.g., went from "Poor" to "Fair"), triggers a celebration toast

3. **The BRI scoring engine** gains a new input dimension: playbook completion scores. Each playbook maps to one or more BRI categories:

| Playbook | BRI Category Mapping |
|----------|---------------------|
| PB-01 (Financial Independence) | Personal Readiness |
| PB-03 (Owner Dependency) | Founder Dependency / Transferability |
| PB-06 (Financial Cleanup) | Financial Performance |
| PB-07 (EBITDA Normalization) | Financial Performance |
| PB-14 (Customer De-Risking) | Customer Concentration |
| PB-15 (SOPs) | Operations |
| PB-20 (IP Audit) | Legal & Compliance |
| PB-21 (Contract Review) | Legal & Compliance |
| PB-37 (Negotiation Prep) | Deal Readiness |

The playbook score contributes to the BRI category as a **weighted evidence signal**, not a replacement. Completing a playbook does not automatically raise the BRI score -- it provides evidence that the underlying issue has been addressed, which the scoring engine incorporates along with other signals (financial data, assessment answers, evidence uploaded).

### How the User Sees This

The feedback loop must be visible and satisfying:

1. **During playbook completion:** When the user finishes the final section and sees their dashboard/scorecard, a callout shows: "This score has been shared with Exit OS. Check your dashboard to see how it affects your overall readiness."

2. **On the app dashboard (post-completion):** The next time the user visits the dashboard, the relevant BRI category shows a subtle "updated" indicator -- a small blue dot or a "+3 points" delta badge next to the category score. Clicking it reveals: "Your Financial Performance score improved because you completed the Financial Statement Cleanup playbook (score: 78/100)."

3. **In the valuation view:** If the playbook completion materially affects the valuation estimate, the change is surfaced in the Opportunity Breakdown: "Financial Performance gap reduced from -$340K to -$210K after completing the Financial Cleanup playbook."

This closes the loop: the user sees the work they did in the playbook directly reflected in their valuation and readiness scores. That is the core motivation loop of the entire product.

---

## 7. Entry Points: Where Playbooks Are Discovered

### Primary Entry Points (High Intent)

| Location | Surface | Playbook Shown | User State |
|----------|---------|---------------|------------|
| Dashboard | "Next Move" card | Top 1 recommended, based on lowest BRI category | Oriented, looking for what to do next |
| Action Center | Task resource link | Playbook matching the task topic | Working on a specific task, needs guidance |
| Signal Detail | "Recommended Action" section | Playbook matching the signal category | Alarmed by a risk, looking for a fix |
| AI Coach | Inline conversation suggestion | Playbook matching the question topic | Exploratory, asking for help |

### Secondary Entry Points (Browse Intent)

| Location | Surface | Content |
|----------|---------|---------|
| Sidebar nav: "Playbook" | Hub page | Active playbooks + AI recommendations + link to library |
| Playbook Library | Full catalog | All 44 playbooks, filterable by category/phase/status |
| Playbook Detail "Related" section | Related playbooks card | 2-3 related playbooks at bottom of detail page |
| Assessment results page | Post-assessment recommendations | Top 3 playbooks based on assessment scores |

### Entry Points NOT Recommended

- **Global search results:** Not yet. The playbook content is too rich to surface well in search snippets. Add this later once full-text search is implemented.
- **Email notifications:** Not yet. "Continue your playbook" emails are a Phase 2 engagement feature. Get the in-app experience right first.
- **Onboarding flow:** The QuickScan and initial assessment should NOT recommend playbooks. The user needs to understand their baseline scores before being directed to improvement work. Playbook recommendations should only appear after the first full assessment is complete.

---

## 8. Progress and Motivation

### Dashboard Progress Surfacing

On the main dashboard, playbook progress appears in a **compact section** (not a dominant one):

**"Your Active Playbooks" section** -- a horizontal row of up to 3 compact cards:
```
+--------------------------------------------------+
| [icon] Owner Dependency      67% [===========  ] |
|        Last active: 2 days ago                    |
|        [Continue -->]                             |
+--------------------------------------------------+
```

If the user has no active playbooks, this section shows a single CTA: "Your [lowest BRI category] score has the most room for improvement. [Explore recommended playbooks]"

If the user has completed playbooks, a small "Completed" count appears: "3 of 44 playbooks completed."

### Playbook Hub Progress

On the `playbook.html` hub page, progress is more prominent:

- **Overall playbook engagement ring:** A progress ring showing "X of 44 completed" with the overall percentage. This is motivational for power users but not primary for most.
- **Category progress bars:** Under each category header (Personal, Financial, Operations, etc.), a thin progress bar shows what fraction of that category's playbooks are complete. This helps users see which domains are strong vs weak.
- **Active playbook cards** with progress rings, last-active dates, and "Continue" CTAs.

### Completion Celebrations

When a user completes a playbook (finishes the final section):

1. The playbook's own dashboard/scorecard page renders normally
2. Above the scorecard, an **inline celebration banner** appears (not a modal, not confetti):
   ```
   +---------------------------------------------------------------+
   |  [checkmark circle]                                            |
   |  Playbook Complete: Owner Dependency Reduction                 |
   |  Your score: 74/100                                           |
   |  This score has been shared with your Exit OS dashboard.      |
   |  [View Impact on Dashboard]   [Export Report]                 |
   +---------------------------------------------------------------+
   ```
3. The Focus Bar progress indicator updates to "Complete" with a green check.
4. The "Close (X)" button label changes to "Return to Exit OS" to reinforce the natural next step.

**No confetti. No full-screen overlay. No modal celebration.** This is a professional tool for adults making identity-level decisions about selling their business. The tone should be: "good work, here is what this means for you" -- not "you did it! party time!" Quiet competence over performative enthusiasm.

### Streaks and Badges: Not Recommended

Gamification mechanics (streaks, badges, points, leaderboards) are not appropriate for this product. The playbooks cover deeply personal topics (financial independence, family alignment, identity after exit, deal fatigue management). Adding extrinsic rewards would trivialize the work and potentially create perverse incentives (rushing through to collect badges rather than thinking deeply).

The intrinsic motivation is sufficient and powerful: every playbook completion moves the user closer to a successful exit and directly improves their valuation estimate. That is the reward. Show the dollar impact clearly and the motivation loop is self-sustaining.

---

## 9. The "Two Worlds" Problem: Resolved

The feeling of "switching between two products" arises from five sources. Here is how each is resolved:

### 1. Visual Design Rupture
**Problem:** Dark sidebar + Georgia serif + forest green vs. white sidebar + SF Pro + blue accent.
**Solution:** Reskin all playbooks to the app design system (Section 3). The visual transition from app to Focus Mode should feel like going from a list view to a detail view -- a mode change, not a product change.

### 2. Navigation Model Rupture
**Problem:** App uses sidebar with nested nav sections. Playbooks use a completely different sidebar with progressive locking.
**Solution:** Focus Mode replaces the app sidebar with the playbook sidebar. The Focus Bar provides the bridge back. The user's mental model is: "I am still in Exit OS, but I am now focused on one specific thing." This is analogous to how Figma replaces its sidebar when you enter a file, or how Notion replaces its sidebar when you enter a full-page database.

### 3. Terminology Mismatch
**Problem:** The playbooks use "Exit Planning Playbook #03" branding with their own iconography. The app calls them "Playbooks" in the sidebar.
**Solution:** In Focus Mode, the playbook branding block in the sidebar changes from "Exit Planning Playbook #03" to "Exit OS Playbook" with the app's logo mark. The playbook title remains. The numbering (PB-03) becomes internal/invisible -- users see the title, not the number.

### 4. Data Isolation
**Problem:** Playbook scores live in localStorage. The app does not know they exist.
**Solution:** Event-based score sync (Section 6). The playbook writes to localStorage AND dispatches events that the app captures and persists to the database. The user sees their playbook work reflected in dashboard scores.

### 5. Workflow Disconnection
**Problem:** The app tells users what to work on (Action Center, Signals). The playbooks are where they actually work. But there is no handoff between the two.
**Solution:** Bidirectional integration. The Action Center can link directly to a specific playbook section (deep link via query param: `/playbook/pb-03?section=delegation`). Playbook completion triggers Action Center task completion (if a matching task exists). The AI Coach can reference and link to specific playbooks. Signals can recommend specific playbooks. The playbook is a first-class entity in the app's intelligence layer, not an external resource.

---

## 10. Implementation Phases

### Phase 1: Focus Mode Shell (2 weeks)
- Build the Focus Mode layout component (Focus Bar + playbook sidebar + content area)
- Implement URL routing for playbooks (`/playbook/:id/:section`)
- Implement resume behavior (load last position from localStorage)
- Build the entry/exit navigation flows
- Ensure mobile responsive behavior

### Phase 2: Design System Reskin (3 weeks)
- Create the app-themed CSS token set for playbooks
- Batch-migrate all 44 playbooks to the new tokens
- Update sidebar from dark to white
- Update typography from Georgia to SF Pro
- Replace color system (forest green to blue, burnt orange to orange)
- QA pass across all 44 for visual consistency
- Validate mobile responsiveness in Focus Mode

### Phase 3: Contextual Surfacing (2 weeks)
- Implement playbook recommendation engine (map BRI categories to playbooks)
- Add playbook links to Dashboard "Next Move" card
- Add playbook links to Signal Detail pages
- Add playbook links to Action Center tasks
- Add playbook links to AI Coach responses
- Add playbook links to Assessment results

### Phase 4: Data Sync (2 weeks)
- Implement `playbook:score-update` event system
- Build `PlaybookContext` provider
- Create `/api/playbook-progress` API endpoint
- Integrate playbook scores into BRI scoring engine
- Build "score updated" feedback UI on dashboard
- Build completion celebration banner

### Phase 5: Playbook Hub Redesign (1 week)
- Redesign `playbook.html` as the curated hub (active + recommended + completed)
- Redesign `playbook-library.html` with journey view + filters
- Implement freemium gating on library cards
- Add search functionality

### Phase 6: Polish (1 week)
- Accessibility audit of Focus Mode (keyboard navigation between Focus Bar and playbook content, focus trap management)
- Performance optimization (lazy-load playbook content, skeleton loading states)
- Analytics events for playbook engagement tracking
- User testing with 5 users

**Total estimated timeline: 11 weeks**

---

## 11. Tradeoffs

### What This Approach Gains
- **Seamless experience:** No product-switching feeling. Playbooks feel like a native part of Exit OS.
- **Contextual discovery:** Users find the right playbook at the right time, not by browsing a catalog.
- **Closed feedback loop:** Playbook work directly improves dashboard scores and valuation.
- **Scalability:** The Focus Mode pattern can accommodate future content types (courses, workshops, assessments) without architectural changes.
- **Mobile viability:** Focus Mode works naturally on mobile -- full-screen content with drawer nav.

### What This Approach Sacrifices
- **Playbook brand identity:** The forest green / Georgia serif / dark sidebar aesthetic has its own character. Reskinning to the app's design system loses this. (Acceptable -- coherence > character.)
- **Standalone shareability:** Currently, a playbook HTML file can be sent to anyone as a self-contained tool. After integration, playbooks require the app context. (Mitigate by keeping the standalone files as a separate distribution channel if needed.)
- **Implementation simplicity:** An iframe or new-tab approach would be trivially simple. Focus Mode requires real engineering work. (Necessary -- the UX quality of the integration is a primary differentiator for the product.)
- **Design system migration effort:** 44 files need to be reskinned. This is approximately 3 weeks of work. (One-time cost with permanent benefit.)

---

## 12. Key Design Decisions Summary

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Integration model | Focus Mode (inline, replaces main content) | Maintains single-product feeling; supports deep work |
| App sidebar during playbook | Hidden, replaced by playbook sidebar | Reduces distraction; playbook nav is the only relevant nav |
| Playbook design system | Reskin to match app | Coherence > character; prevents "two products" feeling |
| Playbook sidebar background | White (match app) | Consistency; Focus Bar provides mode distinction |
| Discovery model | Contextual surfacing (primary) + curated hub (secondary) + library (tertiary) | 44 is too many to browse; AI-driven relevance wins |
| Freemium gating | 5 free, 39 paid | Demonstrate value with free tier; library depth is paid differentiator |
| Entry experience | Detail page as "airlock" before Focus Mode | Prevents accidental deep-work entry; sets expectations |
| Resume behavior | Open to last active section with toast | Respects interrupted work patterns |
| Data sync | Event-based score sync to API + BRI engine | Closes the feedback loop; makes playbook work visible |
| Completion celebration | Inline banner, no confetti/modal | Professional tone; respectful of the emotional weight |
| Gamification | None (no badges, streaks, points) | Intrinsic motivation (valuation impact) is sufficient |
| Mobile | Full-screen Focus Mode with drawer nav | Maximum content area; natural for deep work |

---

## Appendix A: Playbook-to-BRI Category Mapping

| Playbook # | Title | Primary BRI Category | Secondary |
|-----------|-------|---------------------|-----------|
| PB-01 | Financial Independence | Personal Readiness | -- |
| PB-02 | Post-Exit Identity | Personal Readiness | -- |
| PB-03 | Owner Dependency | Founder Dependency | Operations |
| PB-04 | Family Alignment | Personal Readiness | -- |
| PB-05 | Tax & Estate | Financial Performance | Personal Readiness |
| PB-06 | Financial Cleanup | Financial Performance | -- |
| PB-07 | EBITDA Normalization | Financial Performance | -- |
| PB-08 | Revenue Quality | Financial Performance | Customer Risk |
| PB-09 | Working Capital | Financial Performance | -- |
| PB-10 | Debt & Liability | Financial Performance | Legal & Compliance |
| PB-11 | Financial Projections | Financial Performance | -- |
| PB-12 | Management Bench Strength | Founder Dependency | Operations |
| PB-13 | Key Employee Retention | Founder Dependency | Operations |
| PB-14 | Customer De-Risking | Customer Concentration | -- |
| PB-15 | SOPs & Process Docs | Operations | Founder Dependency |
| PB-16 | Technology Audit | Operations | -- |
| PB-17 | Quality Management | Operations | -- |
| PB-18 | Vendor Management | Operations | -- |
| PB-19 | Facility & Equipment | Operations | -- |
| PB-20 | IP Audit | Legal & Compliance | -- |
| PB-21 | Contract Review | Legal & Compliance | -- |
| PB-22 | HR Compliance | Legal & Compliance | Operations |
| PB-23 | Regulatory Compliance | Legal & Compliance | -- |
| PB-24 | Environmental & Insurance | Legal & Compliance | -- |
| PB-25 | Data Privacy & Cyber | Legal & Compliance | Operations |
| PB-26 | Value Driver Acceleration | Growth | -- |
| PB-27 | Revenue Growth | Growth | Financial Performance |
| PB-28 | Pricing Strategy | Growth | Financial Performance |
| PB-29 | Market Expansion | Growth | -- |
| PB-30 | Brand & Market Position | Growth | -- |
| PB-31 | Valuation Benchmarking | Deal Readiness | -- |
| PB-32 | Deal Team Assembly | Deal Readiness | -- |
| PB-33 | Buyer Universe Mapping | Deal Readiness | -- |
| PB-34 | CIM Preparation | Deal Readiness | -- |
| PB-35 | LOI Evaluation | Deal Readiness | -- |
| PB-36 | Due Diligence Prep | Deal Readiness | -- |
| PB-37 | Negotiation Prep | Deal Readiness | -- |
| PB-38 | Transition & Integration | Deal Readiness | Operations |
| PB-39 | Involuntary Exit | Contingency | -- |
| PB-40 | Business Continuity | Contingency | Operations |
| PB-41 | Partner Alignment | Personal Readiness | Legal & Compliance |
| PB-42 | Deal Fatigue | Personal Readiness | Deal Readiness |
| PB-43 | Exit Timeline | Deal Readiness | -- |
| PB-44 | Market Timing | Deal Readiness | -- |

## Appendix B: Analytics Events

| Event | Trigger | Properties |
|-------|---------|-----------|
| `playbook.opened` | User enters Focus Mode | playbookId, source (dashboard/action-center/signal/ai-coach/library/direct), isResume |
| `playbook.section_completed` | User completes a section | playbookId, sectionId, sectionNumber, totalSections, timeSpentSeconds |
| `playbook.section_navigated` | User navigates to a section | playbookId, sectionId, direction (forward/back/jump) |
| `playbook.score_updated` | Composite score changes | playbookId, previousScore, newScore, delta |
| `playbook.completed` | User finishes all sections | playbookId, compositeScore, totalTimeMinutes, daysFromStart |
| `playbook.exited` | User leaves Focus Mode | playbookId, exitMethod (back/close/breadcrumb/browser-back), percentComplete |
| `playbook.exported` | User exports report | playbookId, exportFormat (text/print) |
| `playbook.recommended_clicked` | User clicks a contextual recommendation | playbookId, surface (dashboard/signal/action/ai-coach/assessment) |
| `playbook.upgrade_prompted` | Free user hits paywall | playbookId, sectionReached |
| `playbook.upgrade_converted` | User upgrades from playbook paywall | playbookId, previousPlan |

---

*End of specification.*
