# SPEC: Mode 1 — VALUE (Home Screen)

**Status:** Ready for Development
**Priority:** P0 — This is the first thing every user sees. Nothing else matters until this works.
**Business Metric:** Activation (onboarding → first value seen), Retention (weekly return rate)
**Replaces:** Current `DashboardContent.tsx`, `HeroMetrics.tsx`, `ValueDrivers.tsx`, `RiskBreakdown.tsx`, `ActionCenter.tsx`, and `ValueBuilderClient.tsx`

---

## 1. STRATEGIC CONTEXT

### Why This Exists

The Value home screen is the cockpit of Exit OSx. It answers one question in 3 seconds: **"Where do I stand and what should I do next?"**

The current dashboard shows six metric cards (current value, potential value, value gap, BRI score, core index, personal readiness), a multiple slider, a 2x3 risk breakdown grid, and an action center buried below the fold. It's informative. It's not actionable. A user can look at the current dashboard and still not know what to DO.

The new Value screen has four sections, in strict visual priority:

1. **Hero Metrics** — three numbers: Current Value, Potential Value, Value Gap (with monthly delta)
2. **Valuation Bridge** — a waterfall chart showing exactly which BRI categories are costing money
3. **Next Move Card** — one task, one time estimate, one dollar impact, one buyer consequence
4. **Value Timeline** — annotated history showing what the user did and what happened

Every element drives the user toward one action: **start the Next Move task.**

### What Business Metric This Moves

- **Activation:** Users who see the Value Gap and Valuation Bridge in their first session are 3x more likely to start their first task (hypothesis to validate)
- **Weekly Return Rate:** The Value Timeline with annotations and the Next Move card give users a reason to come back — something changed, something to do
- **Task Start Rate:** The Next Move card's single-task focus with buyer consequence copy should increase task start rate from current baseline to 40%+ of weekly active users

### Current State vs. Desired State

| | Current | Desired |
|---|---|---|
| Hero metrics | 6 cards in a grid (value, gap, BRI, core, personal, premium) | 3 metrics in a row (current, potential, gap with delta) |
| Value visualization | None — just numbers | Valuation Bridge waterfall showing dollar cost per BRI category |
| Task surfacing | ActionCenter below fold, shows category list | Next Move card above fold, shows ONE task with buyer rationale |
| Value history | Line chart without annotations | Annotated timeline with cause-effect labels |
| User clarity | "I see numbers but what do I do?" | "I see the gap, I see where the money is, I know what to do next" |

---

## 2. USER STORIES & SCENARIOS

### Primary User Stories

**US-1: First-time user (post-onboarding, no assessment)**
> As a business owner who just completed onboarding, I want to see my initial valuation with the Value Gap prominently displayed so that I understand what I stand to gain and feel motivated to complete the full assessment.

**US-2: Assessed user (has BRI, has tasks)**
> As a business owner who completed the assessment, I want to see exactly which categories are costing me the most money and what my single highest-ROI task is so that I can take action immediately.

**US-3: Returning user (has task history)**
> As a business owner returning after a week, I want to see what changed since my last visit — value recovered, tasks completed, any drift — so that I feel momentum and know what to do next.

**US-4: Active user (connected financials, completing tasks regularly)**
> As a business owner who is actively using the platform, I want to see my value growing over time with clear cause-and-effect annotations so that I know my subscription is paying for itself.

### State Transitions

The Value screen has **five distinct states** based on user progress:

| State | Condition | What's Different |
|---|---|---|
| **Preview** | Onboarding complete, no assessment | Bridge shows estimated gaps, Next Move = "Complete your assessment", Timeline has 1 point |
| **Assessed** | Assessment complete, tasks generated | Bridge shows real BRI gaps, Next Move = highest-ROI task, Timeline has 2+ points |
| **Financial** | Financials connected (QuickBooks or manual) | Values update with real EBITDA, bridge recalculates, "financials connected" annotation on timeline |
| **Active** | 3+ tasks completed | Completed tasks section visible, monthly delta shows, timeline has annotations |
| **Advanced** | DCF available, 10+ tasks complete | Most accurate values, rich timeline, strong monthly deltas |

### Edge Cases

**E-1: User with BRI = 0 or no assessment responses**
Show the Preview state. The Valuation Bridge shows estimated category costs based on industry averages with a label: "Based on industry averages. Complete your assessment for a personalized breakdown."

**E-2: User with BRI = 95+ (very high)**
The Value Gap is small or zero. The bridge is nearly flat. Shift messaging: "Your business is buyer-ready. Explore your Deal Room options." Surface maintenance tasks instead of improvement tasks.

**E-3: Value Gap is negative (current > potential due to DCF exceeding industry max)**
Show "Market Premium" instead of "Value Gap." The bridge inverts to show value ABOVE potential. Next Move focuses on protecting value, not recovering it.

**E-4: No tasks available (all completed or none generated)**
Next Move card shows: "All current tasks complete. Your next assessment will generate new recommendations." CTA: "Start Re-Assessment."

**E-5: User hasn't logged in for 30+ days**
Show a return banner above the hero: "Welcome back. While you were away, 2 documents expired and your estimated value at risk increased by $45K. Here's what to do about it." (Requires drift detection system — degrade gracefully if not yet built: show standard view.)

**E-6: Free tier user**
Everything renders. The Next Move card shows the task but the Start button opens an upgrade prompt: "Upgrade to Growth to start completing tasks and closing your Value Gap."

---

## 3. DETAILED FUNCTIONAL REQUIREMENTS

### 3.1 Hero Metrics Bar

Three metrics displayed horizontally with equal weight:

**Metric 1: Current Value**
- Source: `tier1.currentValue` from dashboard API
- Format: Currency, abbreviated for values > $1M (e.g., "$2.4M"), full for < $1M (e.g., "$842,000")
- Label: "Current Value"
- Sub-label (Preview state): "Industry Preview" in a muted badge
- Sub-label (Financial state): "Based on your financials" in a muted badge
- Animated count-up on first load (reuse existing `useCountUp` hook)

**Metric 2: Potential Value**
- Source: `tier1.potentialValue` from dashboard API
- Same formatting as Current Value
- Label: "Potential Value"
- Sub-label: "If all gaps closed"

**Metric 3: Value Gap (with Monthly Delta)**
- Source: `tier1.valueGap` from dashboard API
- **NEW: Monthly delta** — requires new calculation (see API changes below)
- Format: Currency (same abbreviation rules) + delta below
- Label: "Value Gap"
- Delta display: "↓ $180K this month" (green, gap shrinking) or "↑ $45K this month" (red, gap growing) or "No change" (muted)
- Delta is calculated as: `currentMonthValueGap - previousMonthValueGap` (negative = improvement)
- If no previous month data, show "First month" in muted text instead of delta

### 3.2 Valuation Bridge (Waterfall Chart)

**This is a new component.** No equivalent exists in the current codebase.

**Data Source:**
The bridge requires BRI sub-scores per category and the dollar impact of each category's gap. The calculation:

```
For each BRI category (Financial, Transferability, Operations, Market, Legal/Tax):
  categoryGap = (1 - categoryScore) * categoryWeight * totalValueGap / weightedGapSum
```

More precisely, the dollar impact per category should be proportional to how much each category contributes to the overall BRI discount. The API must return this pre-calculated (see API changes).

**Personal Readiness is excluded from the bridge.** It doesn't affect valuation directly (it affects the owner's timeline, not buyer pricing). Including it would misrepresent the math.

**Visual Specification:**

The waterfall starts from Current Value on the left and builds up to Potential Value on the right. Each bar represents one BRI category's dollar cost, stacked from largest to smallest.

```
Potential ─┐
Value      │ ████████ Legal/Tax: $220K
$3.8M      │ ████████████ Market: $180K
           │ ████████████████ Operations: $340K
           │ ████████████████████ Transferability: $280K
           │ ████████████████████████ Financial: $380K
Current  ──┘
Value
$2.4M
```

**Chart Implementation:**
- Use Recharts `BarChart` with stacked bars, NOT a custom SVG
- Each bar segment is a BRI category
- Sort segments: largest gap at bottom, smallest at top
- Left axis: dollar values
- No right axis
- No grid lines (clean look)
- Horizontal orientation (bars go left to right)

**Color Coding:**
- Each category uses its existing BRI color from the design system:
  - Financial: `#3b82f6` (blue-500)
  - Transferability: `#22c55e` (green-500)
  - Operations: `#eab308` (yellow-500)
  - Market: `#8b5cf6` (purple-500)
  - Legal/Tax: `#ef4444` (red-500)
- Current Value marker: `var(--primary)` (#B87333)
- Potential Value marker: `var(--primary)` with 0.3 opacity

**Interactivity:**
- Hover on any segment: tooltip shows category name, score (0-100), dollar cost, and a one-line explanation
- Click on any segment: smooth-scrolls to the Diagnosis tab (Mode 2) filtered to that category. If user is on free tier, show upgrade prompt instead.

**Tooltip Content Per Category:**
```
Financial Health: 78/100
Costing you ~$380K in buyer discount
"Buyers pay less when financial records lack depth."
```

The one-line buyer explanations are static, not AI-generated:

| Category | Buyer Explanation |
|---|---|
| Financial | "Buyers pay less when financial records lack depth or consistency." |
| Transferability | "Buyers discount businesses that can't run without the owner." |
| Operations | "Buyers see risk in businesses without documented, repeatable processes." |
| Market | "Buyers pay premiums for defensible market positions and diverse revenue." |
| Legal/Tax | "Buyers walk away from unresolved legal exposure and compliance gaps." |

**Preview State (No Assessment):**
Show the bridge with estimated category impacts based on industry averages. Each bar shows a "?" overlay. Below the chart: "These estimates are based on industry averages. Complete your assessment for a personalized breakdown." CTA button: "Start Assessment →"

**Responsive Behavior:**
- Desktop (lg+): Horizontal waterfall, full labels
- Tablet (md): Horizontal waterfall, abbreviated labels ("Financial" → "Fin")
- Mobile (sm): Vertical stacked bar chart, full labels, categories listed below

### 3.3 Next Move Card

**This replaces the current ActionCenter component.**

The Next Move card shows exactly ONE task — the highest-priority task from the user's action queue.

**Task Selection Logic:**

The "Next Move" is selected by the existing priority matrix (`src/lib/tasks/priority-matrix.ts`) with additional filtering:

1. Filter to tasks with status = `PENDING` or `IN_PROGRESS`
2. If any task is `IN_PROGRESS`, that IS the Next Move (user already started it)
3. If no `IN_PROGRESS` task, select the task with lowest `priorityRank` (highest priority)
4. If tied on `priorityRank`, prefer: (a) tasks with all prerequisites met, (b) tasks with lower `estimatedHours`, (c) tasks created earlier
5. If user is `IN_PROGRESS` on a task, show that task with its current progress

**Card Layout:**

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  YOUR NEXT MOVE                                          │
│                                                          │
│  Document your top 5 customer relationships              │
│                                                          │
│  ⏱ 45 min          💰 ~$120K value impact                │
│                                                          │
│  "Buyers discount when revenue depends on relationships  │
│   only the owner maintains. Documenting these proves     │
│   transferability."                                      │
│                                                          │
│  ┌────────────────┐    ┌─────────────────────────┐      │
│  │ Start This Task│    │ Why this? ▾             │      │
│  └────────────────┘    └─────────────────────────┘      │
│                                                          │
└──────────────────────────────────────────────────────────┘

Coming up next:
  "Formalize vendor agreements" (60 min, ~$90K)
  "Update insurance certificates" (15 min, ~$60K)
```

**Card Fields:**

| Field | Source | Formatting |
|---|---|---|
| Section header | Static | "YOUR NEXT MOVE" |
| Task title | `task.title` | Sentence case, max 80 chars |
| Time estimate | `task.estimatedHours` | Convert to minutes if < 2 hours ("45 min"), hours if >= 2 ("3 hours") |
| Value impact | `task.rawImpact` | Currency with "~" prefix, abbreviated ("~$120K") |
| Buyer consequence | **NEW field: `task.buyerConsequence`** | 1-2 sentences, italic, in quotes. See generation spec below. |
| Primary CTA | Dynamic | "Start This Task" (if PENDING), "Continue" (if IN_PROGRESS) |
| Secondary action | Static | "Why this?" — expands rationale panel |

**Buyer Consequence Copy:**

This is a new field on the Task model. It's generated when tasks are created via the action plan generator. Two approaches, used in order of preference:

1. **AI-generated (preferred):** When generating tasks, call Anthropic with the company profile, BRI category, and specific risk driver to generate a 1-2 sentence buyer consequence. Template prompt:
   ```
   Write a 1-2 sentence explanation of why a buyer would pay less for a business
   with this specific weakness: [risk description].
   Frame it as: "Buyers [verb] when [specific condition]. [What fixing it proves]."
   Keep it under 200 characters. Be specific, not generic.
   ```

2. **Template fallback:** If AI unavailable, use static templates per BRI category:
   - FINANCIAL: "Buyers pay less when they can't verify the numbers. Documenting this strengthens financial credibility."
   - TRANSFERABILITY: "Buyers discount businesses that depend on the owner. This proves the business runs without you."
   - OPERATIONAL: "Buyers see risk in ad-hoc processes. Documenting this shows the business is scalable."
   - MARKET: "Buyers pay premiums for market defensibility. This strengthens your competitive position."
   - LEGAL_TAX: "Buyers walk away from unresolved compliance gaps. This removes a deal-breaker."
   - PERSONAL: "Exit readiness signals commitment to the process. This shows you're serious."

**"Why This?" Expandable Rationale:**

When expanded, shows:
- BRI category and current score: "Transferability: 58/100"
- Dollar impact calculation: "This task addresses customer concentration, which accounts for ~$120K of your $280K Transferability gap."
- Suggested evidence: "Upload: customer relationship summary, contact transfer plan"
- Estimated time: "Most founders complete this in one sitting."

**"Coming Up" Section:**

Below the Next Move card, show the next 2 tasks in the queue. Muted styling (text-muted-foreground), single line each:
- Task title (truncated to 40 chars) + time estimate + value impact
- No CTA buttons — these are informational only
- Clicking a coming-up task opens the full Actions tab (Mode 3)

**IN_PROGRESS State:**

If the user has a task already in progress, the Next Move card changes:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  CONTINUE WHERE YOU LEFT OFF                             │
│                                                          │
│  Document your top 5 customer relationships              │
│  Transferability · ~$120K impact · 45 min remaining      │
│                                                          │
│  [Continue →]                     Started Oct 15         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Header changes to "CONTINUE WHERE YOU LEFT OFF". CTA is "Continue →". Shows when the task was started.

**Empty State (No Tasks):**

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  WHAT'S NEXT                                             │
│                                                          │
│  You've completed all current tasks. Nice work.          │
│                                                          │
│  Your next assessment will generate new                  │
│  recommendations based on your updated profile.          │
│                                                          │
│  [Start Re-Assessment →]                                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Free Tier State:**

Everything renders normally. The Start button triggers the upgrade modal instead of navigating to the task:

```
CTA: "Upgrade to Start Closing Your Gap →"
```

The buyer consequence copy is still visible — this is the conversion hook. The user reads why buyers discount their business and can't act on it without upgrading. That tension drives conversion.

### 3.4 Value Timeline (Annotated)

**This extends the existing `ValueHistoryChart.tsx` component.**

**Current State:** The existing chart shows CurrentValue and PotentialValue as area charts with a BRI score line. It has a `snapshotReason` field that's mostly unused.

**Desired State:** The timeline shows value over time with human-readable annotations at each inflection point.

**Annotations:**

Each `ValuationSnapshot` can have an annotation derived from `snapshotReason`. The API should return annotations as structured objects:

```typescript
interface TimelineAnnotation {
  date: string           // ISO date
  label: string          // Short label: "Connected QuickBooks"
  detail: string         // Longer detail: "Valuation accuracy improved with real financials"
  impact: string         // "+$340K accuracy" or "+4 BRI points"
  type: 'positive' | 'negative' | 'neutral'
}
```

**Annotation Types (auto-generated from snapshot reason):**

| snapshotReason | Label | Type |
|---|---|---|
| `onboarding_complete` | "Initial valuation" | neutral |
| `assessment_complete` | "Assessment completed" | positive |
| `financials_connected` | "Financials connected" | positive |
| `task_completed` | "Task: [task title]" | positive |
| `reassessment_complete` | "Re-assessment completed" | positive/negative (based on BRI delta) |
| `dcf_calculated` | "DCF valuation added" | neutral |
| `manual_recalculation` | "Valuation updated" | neutral |
| `financial_period_added` | "New financial period" | positive |

**Chart Specification:**
- Type: Area chart (Current Value) with dashed line (Potential Value)
- Annotations: Dot markers on the timeline with short labels
- Hover on annotation: shows full detail and impact
- X-axis: dates, formatted "Oct '24"
- Y-axis: dollar values, abbreviated
- Area fill: `var(--primary)` at 10% opacity
- Line color: `var(--primary)`
- Potential Value line: `var(--chart-3)` (#6B6B6B) dashed
- Annotation dot: 8px circle, `var(--primary)` for positive, `var(--destructive)` for negative, `var(--muted-foreground)` for neutral

**Timeline States:**

- **1 data point (just onboarded):** Show the single point with "Your journey starts here" label. No chart line — just the hero metrics and bridge. This section is visually minimal.
- **2-5 data points:** Show the chart with all annotations. Limited but growing.
- **6+ data points:** Full chart with scrollable annotation list below

**Section Header:**
- "YOUR VALUE OVER TIME"
- Sub: "Each milestone shows what you did and what happened."

**Responsive Behavior:**
- Desktop: Full chart with inline annotations
- Tablet: Full chart, annotations below as a list
- Mobile: Simplified sparkline chart with annotation list below

### 3.5 API Changes

**Modify: `GET /api/companies/[id]/dashboard`**

Add to the response:

```typescript
// Add to tier1
tier1: {
  // ... existing fields ...

  // NEW: Monthly delta
  valueGapDelta: number | null       // Change in value gap vs. 30 days ago (negative = improvement)
  valueGapDeltaPeriod: '30d' | null  // Period the delta covers
  previousValueGap: number | null     // The comparison value gap

  // NEW: Valuation Bridge data
  bridgeCategories: Array<{
    category: BriCategory            // 'FINANCIAL', 'TRANSFERABILITY', etc.
    label: string                    // 'Financial Health'
    score: number                    // 0-100 (converted from 0-1 for display)
    dollarImpact: number             // Dollar cost of this category's gap
    weight: number                   // BRI weight for this category
    buyerExplanation: string         // Static one-liner
  }>
}

// Add to tier4 or create new tier
nextMove: {
  task: {
    id: string
    title: string
    description: string
    briCategory: BriCategory
    estimatedHours: number | null
    rawImpact: number
    status: TaskStatus
    buyerConsequence: string | null   // NEW field
    effortLevel: EffortLevel
    startedAt: string | null          // If IN_PROGRESS, when it started
  } | null

  comingUp: Array<{
    id: string
    title: string
    estimatedHours: number | null
    rawImpact: number
    briCategory: BriCategory
  }>  // Max 2 items
}

// Add to tier5
tier5: {
  // ... existing fields ...

  // NEW: Timeline annotations
  annotations: TimelineAnnotation[]
}
```

**Valuation Bridge Dollar Impact Calculation:**

Add this to the dashboard route handler:

```typescript
function calculateBridgeCategories(
  snapshot: ValuationSnapshot,
  briWeights: Record<string, number>,
  valueGap: number
): BridgeCategory[] {
  const categories = [
    { key: 'FINANCIAL', score: snapshot.briFinancial, label: 'Financial Health' },
    { key: 'TRANSFERABILITY', score: snapshot.briTransferability, label: 'Transferability' },
    { key: 'OPERATIONAL', score: snapshot.briOperational, label: 'Operations' },
    { key: 'MARKET', score: snapshot.briMarket, label: 'Market Position' },
    { key: 'LEGAL_TAX', score: snapshot.briLegalTax, label: 'Legal & Tax' },
  ]

  // Calculate each category's contribution to the total gap
  // Weight the gap by: (1 - categoryScore) * categoryWeight
  const rawGaps = categories.map(c => ({
    ...c,
    weight: briWeights[c.key] || 0,
    rawGap: (1 - Number(c.score)) * (briWeights[c.key] || 0),
  }))

  const totalRawGap = rawGaps.reduce((sum, c) => sum + c.rawGap, 0)

  // Distribute the dollar value gap proportionally
  return rawGaps
    .map(c => ({
      category: c.key as BriCategory,
      label: c.label,
      score: Math.round(Number(c.score) * 100),
      dollarImpact: totalRawGap > 0
        ? Math.round((c.rawGap / totalRawGap) * valueGap)
        : 0,
      weight: c.weight,
      buyerExplanation: BUYER_EXPLANATIONS[c.key],
    }))
    .sort((a, b) => b.dollarImpact - a.dollarImpact) // Largest gap first
}
```

**Monthly Delta Calculation:**

```typescript
// In the dashboard route handler:
// Find snapshot from ~30 days ago
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
const previousSnapshot = await prisma.valuationSnapshot.findFirst({
  where: {
    companyId,
    createdAt: { lte: thirtyDaysAgo },
  },
  orderBy: { createdAt: 'desc' },
})

const valueGapDelta = previousSnapshot
  ? Number(currentSnapshot.valueGap) - Number(previousSnapshot.valueGap)
  : null
```

**Next Move Selection:**

```typescript
// In the dashboard route handler:
// 1. Check for IN_PROGRESS task first
const inProgressTask = await prisma.task.findFirst({
  where: { companyId, status: 'IN_PROGRESS' },
  orderBy: { updatedAt: 'desc' },
})

// 2. If none, get highest priority PENDING task
const nextPendingTask = inProgressTask || await prisma.task.findFirst({
  where: {
    companyId,
    status: 'PENDING',
    inActionPlan: true,
  },
  orderBy: [
    { priorityRank: 'asc' },      // Lowest rank = highest priority
    { estimatedHours: 'asc' },     // Prefer shorter tasks
    { createdAt: 'asc' },          // Older tasks first
  ],
})

// 3. Get next 2 tasks for "Coming Up"
const comingUp = await prisma.task.findMany({
  where: {
    companyId,
    status: 'PENDING',
    inActionPlan: true,
    id: { not: nextPendingTask?.id },
  },
  orderBy: [
    { priorityRank: 'asc' },
    { estimatedHours: 'asc' },
  ],
  take: 2,
})
```

**Timeline Annotations:**

```typescript
// In valuation-history route handler, generate annotations from snapshots:
function generateAnnotations(snapshots: ValuationSnapshot[]): TimelineAnnotation[] {
  return snapshots.map((snapshot, index) => {
    const prev = snapshots[index + 1] // Previous in time (array is desc)
    const valueDelta = prev
      ? Number(snapshot.currentValue) - Number(prev.currentValue)
      : 0
    const briDelta = prev
      ? (Number(snapshot.briScore) - Number(prev.briScore)) * 100
      : 0

    return {
      date: snapshot.createdAt.toISOString(),
      label: getAnnotationLabel(snapshot.snapshotReason),
      detail: getAnnotationDetail(snapshot.snapshotReason, valueDelta, briDelta),
      impact: formatImpact(valueDelta, briDelta),
      type: valueDelta > 0 ? 'positive' : valueDelta < 0 ? 'negative' : 'neutral',
    }
  }).filter(a => a.label !== null)
}
```

### 3.6 Data Model Changes

**Add to Task model (Prisma schema):**

```prisma
model Task {
  // ... existing fields ...

  buyerConsequence    String?   @map("buyer_consequence")  // AI-generated or template

  // ... rest of model ...
}
```

Migration: `ALTER TABLE tasks ADD COLUMN buyer_consequence TEXT;`

This is a nullable text field. Populated during task generation. Backfill existing tasks with template fallbacks based on `briCategory`.

**No new tables required for this spec.** The bridge data is calculated on the fly. The monthly delta is calculated from existing snapshots. Annotations are derived from existing `snapshotReason` values.

### 3.7 Permissions & Tier Gating

| Element | Foundation (Free) | Growth | Exit-Ready |
|---|---|---|---|
| Hero Metrics | Full (read-only) | Full | Full |
| Valuation Bridge | Full (clickable opens upgrade modal) | Full (clickable navigates to Diagnosis) | Full |
| Next Move Card | Visible, Start → upgrade modal | Full functionality | Full |
| Coming Up tasks | Visible (titles only) | Full | Full |
| Value Timeline | Full (read-only) | Full | Full |
| Monthly Delta | Shown if data exists | Shown if data exists | Shown if data exists |

The free tier sees everything but can't ACT. This is intentional. The value wall must show them exactly what they're missing in dollars before they hit the paywall.

---

## 4. DESIGN SPECIFICATIONS

### 4.1 Page Layout

```
┌─ Sidebar (existing, 240px) ─┐┌─── Main Content (flex-1) ──────────────────┐
│                              ││                                             │
│  [Value] ← active            ││  ┌─ Hero Metrics Bar ───────────────────┐  │
│  [Diagnosis]                 ││  │  Current | Potential | Gap + Delta   │  │
│  [Actions]                   ││  └──────────────────────────────────────┘  │
│  [Evidence]                  ││                                             │
│  [Deal Room]                 ││  ┌─ Valuation Bridge ────────────────────┐  │
│                              ││  │  Waterfall chart                      │  │
│                              ││  │  (or preview state with CTA)          │  │
│                              ││  └──────────────────────────────────────┘  │
│                              ││                                             │
│                              ││  ┌─ Next Move Card ──────────────────────┐  │
│                              ││  │  Task + consequence + CTA             │  │
│                              ││  ├──────────────────────────────────────┤  │
│                              ││  │  Coming Up (2 tasks, muted)          │  │
│                              ││  └──────────────────────────────────────┘  │
│                              ││                                             │
│                              ││  ┌─ Value Timeline ──────────────────────┐  │
│                              ││  │  Annotated area chart                 │  │
│                              ││  └──────────────────────────────────────┘  │
│                              ││                                             │
└──────────────────────────────┘└─────────────────────────────────────────────┘
```

**Max content width:** `max-w-5xl` (1024px) centered within the main content area.
**Vertical spacing between sections:** `space-y-8` (32px).
**Page padding:** `px-6 py-8` on desktop, `px-4 py-6` on mobile.

### 4.2 Hero Metrics Bar

**Container:** Single row, 3 equal-width cards. `grid grid-cols-3 gap-4` on desktop, `grid grid-cols-1 gap-3` on mobile.

**Each metric card:**
- Background: `bg-card` (white)
- Border: `border border-border`
- Border radius: `rounded-xl` (var(--radius-xl), 12px)
- Padding: `p-6`
- Hover: subtle lift via existing card hover animation (`whileHover: { y: -2 }`)

**Current Value card:**
- Label: `text-sm font-medium text-muted-foreground` — "Current Value"
- Value: `text-3xl font-bold text-foreground` — animated count-up
- Sub-badge (if Preview): `<Badge variant="secondary">Industry Preview</Badge>`

**Potential Value card:** Same styling as Current Value.

**Value Gap card:**
- Label: `text-sm font-medium text-muted-foreground` — "Value Gap"
- Value: `text-3xl font-bold` — color: `text-primary` (#B87333)
- Delta line: `text-sm font-medium mt-1`
  - Improvement (gap shrinking): `text-emerald-600` — "↓ $180K this month"
  - Regression (gap growing): `text-destructive` — "↑ $45K this month"
  - No change: `text-muted-foreground` — "No change this month"
  - No data: `text-muted-foreground` — "First month"

### 4.3 Valuation Bridge Section

**Section Header:**
- Title: `text-lg font-semibold text-foreground` — "WHERE YOUR VALUE GAP IS"
- Sub: `text-sm text-muted-foreground` — "Each bar shows how much a buyer discounts for that category."

**Chart Container:**
- Background: `bg-card`
- Border: `border border-border`
- Border radius: `rounded-xl`
- Padding: `p-6`
- Height: `h-[280px]` on desktop, `h-[320px]` on mobile (vertical orientation)

**Recharts Configuration:**

```tsx
<ResponsiveContainer width="100%" height="100%">
  <BarChart
    data={bridgeData}
    layout="vertical"
    margin={{ top: 0, right: 40, left: 120, bottom: 0 }}
  >
    <XAxis
      type="number"
      tickFormatter={(v) => formatCurrency(v, { abbreviated: true })}
      axisLine={false}
      tickLine={false}
      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
    />
    <YAxis
      type="category"
      dataKey="label"
      axisLine={false}
      tickLine={false}
      tick={{ fill: 'var(--foreground)', fontSize: 13, fontWeight: 500 }}
      width={110}
    />
    <Tooltip content={<BridgeTooltip />} />
    <Bar
      dataKey="dollarImpact"
      radius={[0, 6, 6, 0]}
      barSize={32}
    >
      {bridgeData.map((entry, index) => (
        <Cell
          key={index}
          fill={BRI_CATEGORY_COLORS[entry.category]}
          cursor="pointer"
        />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>
```

**BRI_CATEGORY_COLORS:**
```typescript
const BRI_CATEGORY_COLORS: Record<string, string> = {
  FINANCIAL: '#3b82f6',       // blue-500
  TRANSFERABILITY: '#22c55e', // green-500
  OPERATIONAL: '#eab308',     // yellow-500
  MARKET: '#8b5cf6',          // purple-500
  LEGAL_TAX: '#ef4444',       // red-500
}
```

**Custom Tooltip (`BridgeTooltip`):**
```tsx
<div className="bg-card border border-border rounded-lg shadow-lg p-3 max-w-[260px]">
  <div className="font-semibold text-foreground text-sm">{label}: {score}/100</div>
  <div className="text-primary font-bold text-sm mt-1">
    Costing you ~{formatCurrency(dollarImpact)}
  </div>
  <div className="text-muted-foreground text-xs mt-1 italic">
    "{buyerExplanation}"
  </div>
</div>
```

**Preview State Overlay:**
When `hasAssessment === false`, overlay the chart with a frosted glass effect:

```tsx
<div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]
                flex flex-col items-center justify-center rounded-xl z-10">
  <p className="text-sm text-muted-foreground mb-3 text-center max-w-xs">
    Based on industry averages. Complete your assessment
    for a personalized breakdown.
  </p>
  <Button>Start Assessment →</Button>
</div>
```

### 4.4 Next Move Card

**Container:**
- Background: `bg-card`
- Border: `border-2 border-primary/20` (subtle burnt-orange border to draw attention)
- Border radius: `rounded-xl`
- Padding: `p-6`
- Box shadow: `shadow-sm`

**Section Header (inside card):**
- "YOUR NEXT MOVE" — `text-xs font-semibold tracking-wider uppercase text-primary`

**Task Title:**
- `text-xl font-semibold text-foreground mt-3`

**Meta Row:**
- `flex items-center gap-4 mt-3 text-sm text-muted-foreground`
- Time: Clock icon (`lucide-react` `Clock`) + "45 min"
- Value: Dollar icon (`DollarSign`) + "~$120K value impact"
- Category badge: `<Badge variant="secondary">{categoryLabel}</Badge>`

**Buyer Consequence:**
- `mt-4 text-sm text-muted-foreground italic leading-relaxed`
- Wrapped in quotation marks via CSS `before:content-['"'] after:content-['"']`
- Max 2 lines — truncate with "..." if longer

**Button Row:**
- `flex items-center gap-3 mt-5`
- Primary: `<Button size="lg">Start This Task</Button>` — full burnt-orange
- Secondary: `<Button variant="ghost" size="sm">Why this? <ChevronDown /></Button>`

**Coming Up Section:**
- Separator: `<Separator className="my-4" />`
- Label: `text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2` — "COMING UP"
- Each task: `flex justify-between items-center py-2 text-sm`
  - Left: task title (truncated) in `text-muted-foreground`
  - Right: time + value in `text-muted-foreground/70`
- Hover on row: `hover:text-foreground` transition
- Click on row: navigate to `/dashboard/actions` (Mode 3, future)

### 4.5 Value Timeline Section

**Section Header:**
- Title: `text-lg font-semibold text-foreground` — "YOUR VALUE OVER TIME"
- Sub: `text-sm text-muted-foreground` — "Each milestone shows what you did and what happened."

**Chart Container:**
- Background: `bg-card`
- Border: `border border-border`
- Border radius: `rounded-xl`
- Padding: `p-6`
- Height: `h-[240px]`

**Chart:**
- Recharts AreaChart with:
  - Area: `fill="var(--primary)"` at 8% opacity, `stroke="var(--primary)"` at 2px
  - Dashed line for Potential Value: `stroke="var(--chart-3)"` `strokeDasharray="4 4"`
  - Annotation dots: Recharts `<ReferenceDot>` at each annotated snapshot
    - Positive: `fill="#22c55e"` (green-500), `r={5}`
    - Negative: `fill="#ef4444"` (red-500), `r={5}`
    - Neutral: `fill="var(--muted-foreground)"`, `r={4}`

**Annotation Tooltip (on dot hover):**
```tsx
<div className="bg-card border border-border rounded-lg shadow-lg p-3">
  <div className="font-semibold text-sm">{label}</div>
  <div className="text-xs text-muted-foreground mt-1">{detail}</div>
  <div className={cn("text-xs font-medium mt-1",
    type === 'positive' ? 'text-emerald-600' :
    type === 'negative' ? 'text-destructive' :
    'text-muted-foreground'
  )}>
    {impact}
  </div>
</div>
```

**Single Data Point State:**
When only 1 snapshot exists, don't render the chart. Instead show:

```tsx
<div className="flex items-center justify-center h-[120px] text-center">
  <div>
    <p className="text-sm text-muted-foreground">
      Your value journey starts here.
    </p>
    <p className="text-xs text-muted-foreground/70 mt-1">
      Complete tasks and connect financials to see your progress over time.
    </p>
  </div>
</div>
```

### 4.6 Animation Specifications

**Page Load Sequence (staggered):**

Use `AnimatedStagger` from the existing animation system:

1. Hero Metrics: fade-in-up, delay 0ms
2. Valuation Bridge: fade-in-up, delay 150ms
3. Next Move Card: fade-in-up, delay 300ms
4. Value Timeline: fade-in-up, delay 450ms

```tsx
<AnimatedStagger staggerDelay={0.15}>
  <AnimatedItem><HeroMetricsBar /></AnimatedItem>
  <AnimatedItem><ValuationBridge /></AnimatedItem>
  <AnimatedItem><NextMoveCard /></AnimatedItem>
  <AnimatedItem><ValueTimeline /></AnimatedItem>
</AnimatedStagger>
```

**Hero Metric Count-Up:**
Reuse existing `useCountUp` hook. Duration: 1.2s. Easing: ease-out. Trigger on component mount.

**Value Gap Delta Animation:**
After count-up completes (1.2s delay), fade-in the delta text:
```tsx
initial={{ opacity: 0, y: 4 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 1.4, duration: 0.4 }}
```

**Bridge Chart:**
Bars animate from width 0 to full width, staggered by 100ms per bar:
```tsx
// Recharts built-in animation
<Bar isAnimationActive={true} animationDuration={800} animationBegin={200} />
```

**Next Move Card Attention Pulse:**
On first visit only (tracked via localStorage `exitosx_nextmove_seen`), the Next Move card border pulses once:
```tsx
animate={{
  borderColor: ['rgba(184,115,51,0.2)', 'rgba(184,115,51,0.5)', 'rgba(184,115,51,0.2)']
}}
transition={{ duration: 2, delay: 1 }}
```

### 4.7 Loading States

**Skeleton Layout:**
Match the exact layout with skeleton placeholders:

```tsx
// Hero Metrics: 3 skeleton cards
<div className="grid grid-cols-3 gap-4">
  {[1,2,3].map(i => (
    <Skeleton className="h-[120px] rounded-xl" key={i} />
  ))}
</div>

// Bridge: one tall skeleton
<Skeleton className="h-[280px] rounded-xl" />

// Next Move: one medium skeleton
<Skeleton className="h-[200px] rounded-xl" />

// Timeline: one medium skeleton
<Skeleton className="h-[280px] rounded-xl" />
```

Use existing `Skeleton` component from `src/components/ui/skeleton.tsx`.

### 4.8 Error States

**API Error:**
If the dashboard API fails, show a centered error card:

```tsx
<Card className="p-8 text-center">
  <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
  <p className="text-sm font-medium mt-3">Unable to load your dashboard</p>
  <p className="text-xs text-muted-foreground mt-1">
    Please refresh the page or try again in a moment.
  </p>
  <Button variant="outline" size="sm" className="mt-4" onClick={refetch}>
    Try Again
  </Button>
</Card>
```

**Partial Data:**
If some data is missing (e.g., no BRI scores yet), render the available sections and show the Preview state for sections that need assessment data.

---

## 5. ENGAGEMENT & CONVERSION HOOKS

### 5.1 Conversion Moments (Free → Growth)

The Value screen has three conversion hooks for free tier users:

1. **Next Move Card:** User reads the buyer consequence, understands the risk, clicks "Start This Task" → upgrade modal opens. Copy in modal: "Your Value Gap is $1.4M. Start closing it today with a personalized action plan." CTA: "Upgrade to Growth — $179/mo"

2. **Valuation Bridge click:** User clicks a category bar to drill into diagnosis → upgrade modal opens. Copy: "See exactly what's costing you $380K in Financial buyer discount." CTA: "Unlock Full Diagnosis"

3. **Assessment CTA in Preview state:** User sees blurred bridge with "Complete your assessment for a personalized breakdown" → this is available to free tier (assessment completion is the activation gate, not the tier gate). After assessment, tasks become visible but locked behind Growth.

### 5.2 Re-Engagement Triggers

1. **Weekly email (Growth+ users):** "Your Value Gap is now $X (↓$Y since last month). Your next move: [task title]. Takes [time]." Single CTA: "Do This Now" → links directly to task.

2. **Monthly drift report email:** (Specified in Sustained Value System, not in this spec's scope. But the data this screen displays feeds the drift report.)

3. **Dashboard change detection:** Every time the user loads the Value screen, check if any metric changed since last visit. If yes, show a brief toast: "Your value increased by $45K since your last visit." Use Sonner toast, auto-dismiss after 5 seconds.

### 5.3 Activation Metric

**Primary metric for this screen:** % of users who start their Next Move task within 7 days of first seeing the Value screen.

**Target:** 40% of Growth users start a task within 7 days.

**Tracking events to implement:**

| Event | Trigger | Properties |
|---|---|---|
| `value_screen_viewed` | Page load | `state` (preview/assessed/financial/active), `valueGap`, `briScore` |
| `bridge_viewed` | Bridge section enters viewport | `hasAssessment`, `topCategory` |
| `bridge_category_clicked` | Click on bridge bar | `category`, `dollarImpact` |
| `next_move_viewed` | Next Move card enters viewport | `taskId`, `rawImpact`, `estimatedHours` |
| `next_move_started` | Click "Start This Task" | `taskId`, `briCategory`, `rawImpact` |
| `next_move_why_expanded` | Click "Why this?" | `taskId` |
| `coming_up_clicked` | Click a coming-up task | `taskId` |
| `upgrade_prompted` | Upgrade modal opened from this screen | `trigger` (next_move/bridge/assessment) |
| `timeline_annotation_viewed` | Hover on timeline annotation | `snapshotReason`, `type` |

Use existing analytics tracking pattern (`useScrollDepthTracking` pattern).

---

## 6. TECHNICAL GUIDANCE

### 6.1 Component Architecture

```
src/
  app/(dashboard)/dashboard/
    page.tsx                          # Server component (exists, modify)

  components/value/                   # NEW directory
    ValueHome.tsx                     # Client orchestrator (replaces DashboardContent.tsx)
    HeroMetricsBar.tsx                # 3-metric horizontal bar
    ValuationBridge.tsx               # Waterfall chart + preview state
    BridgeTooltip.tsx                 # Custom Recharts tooltip
    NextMoveCard.tsx                  # Single task card with buyer consequence
    NextMoveRationale.tsx             # Expandable "Why this?" panel
    ComingUpList.tsx                  # 2-task preview list
    ValueTimeline.tsx                 # Annotated area chart (extends ValueHistoryChart)
    TimelineAnnotation.tsx            # Annotation dot + tooltip
    ValueHomeLoading.tsx              # Full-page skeleton
    ValueHomeError.tsx                # Error state
```

**Do not delete the existing dashboard components yet.** The new Value components live in `components/value/`. The page.tsx routes to the new `ValueHome.tsx`. The old components remain available for reference and can be deprecated in a subsequent cleanup sprint.

### 6.2 Data Fetching

Use the existing pattern: fetch from `/api/companies/[id]/dashboard` in a `useEffect` or with TanStack Query (if adopted). The dashboard API already handles company context.

```tsx
// ValueHome.tsx
const { selectedCompanyId } = useCompany()
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['value-home', selectedCompanyId],
  queryFn: () => fetch(`/api/companies/${selectedCompanyId}/dashboard`).then(r => r.json()),
  enabled: !!selectedCompanyId,
  staleTime: 30_000,        // Consider fresh for 30s
  refetchOnWindowFocus: true, // Refresh when user returns to tab
})
```

If TanStack Query is not yet adopted, use the existing `useEffect` + `fetch` pattern from `DashboardContent.tsx`.

### 6.3 Performance Requirements

- **First Contentful Paint:** < 1.5s (skeleton renders immediately)
- **Dashboard API response:** < 800ms (the current API should already meet this; the new calculations add minimal overhead)
- **Bridge chart render:** < 200ms after data arrives (Recharts renders fast for 5 bars)
- **Count-up animation:** Starts within 100ms of data arrival, completes in 1.2s

### 6.4 Caching

- Dashboard API response: cached for 30s client-side (staleTime in TanStack Query or manual cache)
- Valuation history: cached for 60s (doesn't change frequently)
- Bridge data: computed server-side on each request (derived from snapshot, no separate cache needed)

### 6.5 Testing Requirements

**Unit Tests (Vitest):**
- `calculateBridgeCategories()` — verify dollar distribution sums to valueGap, verify sorting, verify empty/null handling
- `generateAnnotations()` — verify label generation for each snapshotReason type
- Monthly delta calculation — verify positive/negative/null cases
- Next Move selection — verify IN_PROGRESS priority, verify fallback to PENDING, verify empty state

**Component Tests (Testing Library):**
- `HeroMetricsBar` — renders 3 metrics, handles null values, shows correct formatting
- `ValuationBridge` — renders 5 bars, shows preview state when no assessment, handles click
- `NextMoveCard` — renders task details, shows IN_PROGRESS state, shows empty state, shows free tier state
- `ValueTimeline` — renders chart with annotations, handles single data point, handles empty data

**E2E Tests (Playwright):**
- Load Value screen as new user (Preview state) → verify bridge shows preview overlay
- Load Value screen as assessed user → verify bridge shows real data, Next Move shows task
- Click "Start This Task" → verify navigation to task detail
- Click bridge category → verify navigation to Diagnosis filtered by category

---

## 7. LAUNCH & ITERATION PLAN

### 7.1 MVP Scope (Sprint 1 — Ship This)

**Build:**
- [ ] `ValueHome.tsx` orchestrator with data fetching
- [ ] `HeroMetricsBar.tsx` with 3 metrics and monthly delta
- [ ] `ValuationBridge.tsx` with horizontal bar chart, tooltip, preview state
- [ ] `NextMoveCard.tsx` with task selection, buyer consequence (template fallback only), CTA
- [ ] `ComingUpList.tsx` with 2-task preview
- [ ] Dashboard API changes: `bridgeCategories`, `nextMove`, `valueGapDelta`
- [ ] `buyerConsequence` column on Task model + migration + backfill with templates
- [ ] Skeleton loading state
- [ ] Error state
- [ ] Free tier gating (upgrade modal on task start and bridge click)
- [ ] Analytics events

**Skip for MVP:**
- AI-generated buyer consequence copy (use templates)
- Annotated Value Timeline (ship existing chart without annotations)
- "Why this?" expandable rationale (ship without expansion, add in Sprint 2)
- Return user banner ("Welcome back, X changed")
- Toast on metric change since last visit

### 7.2 Sprint 2 — Intelligence

- [ ] AI-generated `buyerConsequence` during task creation (Anthropic API)
- [ ] `ValueTimeline.tsx` with annotations (requires `snapshotReason` backfill)
- [ ] "Why this?" expandable rationale on Next Move card
- [ ] Return user detection + toast notification
- [ ] Weekly email integration (value screen data feeds email template)

### 7.3 Sprint 3 — Polish

- [ ] Annotation auto-generation for all snapshot reasons
- [ ] Bridge click → deep link to Diagnosis tab filtered by category
- [ ] Mobile-optimized responsive layouts
- [ ] Performance audit and optimization
- [ ] A/B test: bridge chart horizontal vs. vertical orientation

### 7.4 Success Metrics

| Metric | Current Baseline | Sprint 1 Target | Sprint 3 Target |
|---|---|---|---|
| Task start rate (within 7 days of seeing Value screen) | Unknown (no tracking) | 25% | 40% |
| Weekly return rate (Growth users) | Unknown | 35% | 50% |
| Time on Value screen (avg) | Unknown | 45s | 60s |
| Bridge interaction rate (hover/click) | N/A (new) | 30% | 50% |
| Free → Growth conversion from Value screen | Unknown | 5% | 8% |

### 7.5 What We'll Learn From v1

1. **Do users interact with the bridge?** If hover/click rates are low, the visualization may need redesign (different chart type, different positioning).
2. **Does the Next Move card drive task starts?** If not, the buyer consequence copy may be too generic (accelerate AI generation).
3. **Does the monthly delta motivate or discourage?** If users with growing gaps churn faster, we may need to reframe negative deltas as "here's what to do about it" rather than "you're losing money."
4. **Is one Next Move enough?** If users complete the Next Move and don't return to Actions, the Coming Up section may need to be more prominent.

---

## APPENDIX A: Complete Copy/Microcopy Reference

| Location | Copy | Notes |
|---|---|---|
| Page title (browser tab) | "Value — Exit OSx" | |
| Hero metric 1 label | "Current Value" | |
| Hero metric 1 sub (preview) | "Industry Preview" | Badge |
| Hero metric 1 sub (financial) | "Based on your financials" | Badge |
| Hero metric 2 label | "Potential Value" | |
| Hero metric 2 sub | "If all gaps closed" | |
| Hero metric 3 label | "Value Gap" | |
| Delta (improving) | "↓ $[X] this month" | Green |
| Delta (regressing) | "↑ $[X] this month" | Red |
| Delta (flat) | "No change this month" | Muted |
| Delta (first month) | "First month" | Muted |
| Bridge section title | "WHERE YOUR VALUE GAP IS" | |
| Bridge section sub | "Each bar shows how much a buyer discounts for that category." | |
| Bridge preview overlay | "Based on industry averages. Complete your assessment for a personalized breakdown." | |
| Bridge preview CTA | "Start Assessment →" | |
| Next Move header (pending) | "YOUR NEXT MOVE" | Uppercase, primary color |
| Next Move header (in progress) | "CONTINUE WHERE YOU LEFT OFF" | Uppercase, primary color |
| Next Move CTA (pending) | "Start This Task" | Primary button |
| Next Move CTA (in progress) | "Continue →" | Primary button |
| Next Move secondary | "Why this?" | Ghost button |
| Coming Up label | "COMING UP" | Uppercase, muted |
| Empty state header | "WHAT'S NEXT" | |
| Empty state body | "You've completed all current tasks. Nice work." | |
| Empty state sub | "Your next assessment will generate new recommendations based on your updated profile." | |
| Empty state CTA | "Start Re-Assessment →" | |
| Free tier CTA | "Upgrade to Start Closing Your Gap →" | |
| Timeline section title | "YOUR VALUE OVER TIME" | |
| Timeline section sub | "Each milestone shows what you did and what happened." | |
| Timeline empty state | "Your value journey starts here." | |
| Timeline empty sub | "Complete tasks and connect financials to see your progress over time." | |
| Error title | "Unable to load your dashboard" | |
| Error sub | "Please refresh the page or try again in a moment." | |
| Error CTA | "Try Again" | |

## APPENDIX B: File Reference (Existing Code to Understand)

| File | Why It Matters |
|---|---|
| `src/components/dashboard/DashboardContent.tsx` | Current orchestrator — understand data flow, analytics events, re-assessment logic |
| `src/components/dashboard/HeroMetrics.tsx` | Current hero metrics — understand formatting, count-up pattern |
| `src/components/dashboard/ActionCenter.tsx` | Current task surfacing — understand playbook data shape |
| `src/components/dashboard/ValueHistoryChart.tsx` | Current timeline — extend with annotations |
| `src/app/api/companies/[id]/dashboard/route.ts` | Dashboard API — modify to add bridge, nextMove, delta |
| `src/lib/valuation/calculate-valuation.ts` | Valuation formula — understand bridge math |
| `src/lib/constants/bri-categories.ts` | BRI constants — category labels, colors |
| `src/lib/tasks/priority-matrix.ts` | Task priority — understand Next Move selection |
| `src/components/ui/card.tsx` | Card component — reuse for all cards |
| `src/components/ui/animated-section.tsx` | Animation wrappers — reuse for stagger |
| `src/lib/motion.tsx` | Motion library — use `motion` from here, not framer-motion directly |
| `src/contexts/CompanyContext.tsx` | Company selection — use `useCompany()` |
| `src/contexts/SubscriptionContext.tsx` | Tier gating — use `canAccessFeature()` |
| `src/contexts/ProgressionContext.tsx` | Stage system — will be modified later, use current hooks for now |
