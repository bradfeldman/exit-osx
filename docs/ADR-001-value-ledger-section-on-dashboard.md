# ADR-001: ValueLedgerSection on Value Dashboard (Home Page)

**Status**: Accepted
**Date**: 2026-02-10
**Context**: PROD-067

---

## Decision

The Value dashboard (Mode 1 home page at `/dashboard`) renders **5 primary content
sections** instead of the 4 described in the original Mode 1 specification. The
additional section is `ValueLedgerSection`, which displays a compact summary of recent
value ledger entries.

This deviation from spec is intentional and defensible.

---

## Original Spec (4 Sections)

The Mode 1 spec defined these sections for the Value dashboard:

1. **HeroMetricsBar** -- Current value, potential value, value gap, BRI score
2. **ValuationBridge** -- Category-by-category breakdown of where value is lost
3. **NextMoveCard** -- Highest-priority action item with upcoming tasks
4. **ValueTimeline** -- Historical value trend with annotations

---

## Current Implementation (10+ Rendered Sections)

The actual `ValueHome.tsx` component renders significantly more than 4 sections, as
the platform evolved beyond the initial spec. The full render order is:

1. **WeeklyCheckInTrigger** -- Conditional; shows only when a weekly check-in is pending
2. **DisclosureTrigger** -- Conditional; shows only when monthly disclosure is due
3. **HeroMetricsBar** -- (from spec) Core value metrics
4. **BRIRangeGauge + BenchmarkComparison** -- 2-column grid; gauge and industry comparison
5. **ValuationBridge** -- (from spec) Category value attribution
6. **WhatIfScenarios** -- Interactive scenario modeling for core factors
7. **NextMoveCard** -- (from spec) Priority action item
8. **ProgressContext** -- Value recovered, value at risk, gap tracking
9. **ValueLedgerSection** -- **(the section in question)** Recent value changes
10. **DriftReportBanner** -- Conditional; shows when a drift report is available
11. **ValueTimeline** -- (from spec) Historical trend line

The spec's 4 sections remain present. The additional sections emerged from subsequent
PROD items as the platform's signal architecture, evidence tracking, and scenario
modeling capabilities were built out.

---

## Why ValueLedgerSection Belongs on the Dashboard

### 1. Momentum Visibility
The ValueLedgerSection shows the user what has **actually happened** -- task completions,
regression detections, benchmark shifts -- in concrete dollar terms. This transforms the
dashboard from a static snapshot into a living narrative of progress.

### 2. Closes the Feedback Loop
The dashboard's other sections tell the user "here is your value" and "here is what to
do next." The ledger tells them "here is what your actions have accomplished." Without
it, users complete tasks but never see the cumulative effect unless they navigate to a
separate page.

### 3. Non-Intrusive Design
The component self-hides when there are no entries (lines 68-69 in ValueLedgerSection.tsx):
```typescript
if (isLoading || !data || data.entries.length === 0) return null
```
For new users or inactive companies, this section is invisible. It only appears once
the system has generated value ledger entries (via task completion, signal detection, etc.),
which means it shows up precisely when the user has done enough to benefit from seeing it.

### 4. Drives Engagement to Full Ledger Page
The section includes a "View full history" link to `/dashboard/value-ledger`, the
dedicated value ledger page with filtering, infinite scroll, and detailed timeline.
This follows the progressive disclosure pattern used throughout the platform.

### 5. Complements ProgressContext
ProgressContext (section 8) shows aggregate numbers: total value recovered, total value
at risk. ValueLedgerSection shows the individual events that contributed to those
aggregates. Together they provide both the summary and the evidence.

---

## Alternatives Considered

### A. Remove ValueLedgerSection, Strictly Follow Spec
Rejected. The spec was written before the signal architecture (PROD-020) and value ledger
(PROD-022) were implemented. The ledger is core platform value -- hiding it behind a
sub-page reduces its impact.

### B. Merge Into ProgressContext
Considered. ProgressContext already shows aggregate value-recovered and value-at-risk
numbers. Adding individual ledger entries there would overload that component and blur
its purpose (high-level summary vs. event history).

### C. Move to a Sidebar or Collapsible Panel
Rejected. The dashboard is single-column, max-w-5xl. A sidebar would break the layout
and add complexity. The current approach (AnimatedItem within AnimatedStagger) keeps
it in the natural scroll flow.

---

## Component Details

| Property | Value |
|----------|-------|
| **File** | `src/components/value-ledger/ValueLedgerSection.tsx` |
| **Data Source** | `GET /api/companies/{id}/value-ledger?limit=3&since={monthStart}` |
| **Self-Hides** | Yes, returns null when no entries exist |
| **Fetch Pattern** | Independent fetch via `useCallback` + `fetch` (not part of main dashboard API call) |
| **Related Pages** | Full ledger at `/dashboard/value-ledger` (`ValueLedgerPage.tsx`) |
| **Related Components** | `LedgerEntry.tsx` (compact mode), `LedgerSummaryBar.tsx`, `LedgerTimeline.tsx` |

---

## Impact

- No performance concern: the section makes one additional API call (3 entries max),
  and self-hides when empty.
- No layout disruption: positioned between ProgressContext and DriftReportBanner,
  logically grouping value-tracking sections together.
- No accessibility issues: follows the same AnimatedItem/AnimatedStagger pattern as
  all other sections.
