# SPEC: Mode 3 — ACTIONS (The Operating System)

**Status:** Ready for Development
**Priority:** P0 — This is the core habit loop. Without a clear, frictionless action system, assessments are academic exercises and valuations are static numbers. Actions are where subscription value is created.
**Business Metric:** Engagement (task start rate, task completion rate), Retention (weekly active task work), Revenue (value recovered → ROI framing that prevents churn)
**Replaces:** Current `/dashboard/playbook/page.tsx` (PlaybookContent), `/dashboard/action-plan/page.tsx` (ActionPlanContent), `PlaybookContent.tsx`, `TaskCard.tsx`, `GenerateActionPlanDialog.tsx`, `TaskList.tsx` (action-plan), Sprint model usage, Action Plan management UI

---

## 1. STRATEGIC CONTEXT

### Why This Exists

The Actions screen answers: **"What should I be working on, why does it matter to a buyer, and how far along am I?"**

The current system has four separate surfaces for task work — a Playbook page showing all generated tasks with category filters and status tabs, an Action Plan page with a simpler task list, a Sprint concept (model exists but unused), and an Action Center on the dashboard. Users encounter the same tasks in different layouts with different levels of detail. The Playbook has 790 lines of UI code showing everything at once. The Action Plan page is a separate view of the same data. Sprint planning was designed but never built. The result: users see tasks everywhere, but the system doesn't tell them which ONE thing to do right now.

Mode 3 replaces all of this with **one prioritized action queue**. No sprint planning. No playbook-vs-action-plan distinction. No "Generate Action Plan" dialog. One page. One queue. The system decides what's next. The user decides when to work.

### What Business Metric This Moves

- **Task Start Rate:** The current system shows a list of 15 tasks with equal visual weight. The new system shows ONE active task with sub-steps and a clear "Continue" CTA, plus a short "Up Next" queue. Single-task focus should increase task start rate from current baseline to 50%+ of weekly active users (hypothesis).
- **Task Completion Rate:** Sub-steps create micro-completions. Checking off "Listed top 5 customers by revenue" feels like progress even if the full task isn't done. This reduces abandonment mid-task.
- **Weekly Return Rate:** "Completed This Month" with dollar values and the running total creates a pull to keep the streak alive. When a user sees "$590K recovered this month for $179/month" they don't churn.
- **Subscription ROI:** The monthly value recovered total is the single strongest anti-churn metric in the product. It transforms the abstract ("your BRI improved") into the concrete ("you recovered $590K of enterprise value").

### Current State vs. Desired State

| | Current | Desired |
|---|---|---|
| Task surfaces | 4 separate (Playbook, Action Plan, Action Center, Sprint concept) | 1 unified Action Queue at `/dashboard/actions` |
| Task focus | List of 15 tasks with equal visual weight | ONE active task expanded, 3-5 "up next" collapsed |
| Progress model | Binary (not started / done) | Sub-steps with progress bar (micro-completions) |
| Value attribution | Dollar impact shown per task but no running total | "Completed This Month" section with per-task value and monthly running total |
| Sprint planning | Model exists, never built, not needed | Eliminated entirely — the system manages priority |
| Delegation | "Assigned: You" label only | Full delegation flow: assign to team member or invite external collaborator |
| Prerequisites | Not shown | Visible on queued tasks ("Needs: vendor list"), clickable to create mini-task |
| Generate action plan | Dialog with date picker and carry-forward toggle | Eliminated — queue auto-manages based on priority rank |
| Category filters | 6 category filter buttons + status tabs + sort | Eliminated from primary view — filtering is the enemy of "what's next" focus |

---

## 2. USER STORIES & SCENARIOS

### Primary User Stories

**US-1: First-time user (assessment complete, tasks just generated)**
> As a business owner who just completed my first assessment, I want to see my highest-impact task with clear instructions and buyer context so that I can start working immediately without deciding what to do first.

**US-2: Mid-task user (has an in-progress task)**
> As a business owner returning to the app, I want to see my current in-progress task with the sub-steps I've already completed checked off and a clear "Continue" button so that I can pick up exactly where I left off.

**US-3: Task completion user (just finished a task)**
> As a business owner who just marked a task complete, I want to see the dollar value I recovered, add any completion notes or evidence, and then see my next task automatically surfaced so that momentum isn't broken.

**US-4: Monthly review user (returning after time away)**
> As a business owner reviewing my progress, I want to see everything I've completed this month with the total value recovered so that I feel the ROI of my subscription and am motivated to keep going.

**US-5: Delegation user (wants to assign tasks)**
> As a business owner who needs my CPA to handle tax documentation, I want to assign that task to them with a clear brief so that I can focus on tasks I can do myself.

**US-6: Free tier user**
> As a free tier user, I can see my generated tasks and their dollar impact, but I hit the upgrade wall when I try to access sub-steps, mark tasks complete, or assign tasks. The queue SHOWS value but doesn't let me CAPTURE it without upgrading.

### State Transitions

| State | Condition | What's Different |
|---|---|---|
| **Empty** | No tasks generated (no assessment completed) | Show explanation: "Complete your diagnosis to generate your action queue." Link to Mode 2. No fake tasks, no placeholder data. |
| **Fresh** | Tasks generated, none started | First task expanded with full detail. "Up Next" shows 3-5 tasks. No "Completed" section. Hero shows "0 tasks completed · $0 recovered this month." |
| **Active** | 1+ tasks in progress | Current in-progress task(s) expanded at top. Sub-step progress visible. "Up Next" shows what comes after. |
| **Progressing** | 1+ tasks completed this month | "Completed This Month" section visible with value attribution. Running total shown in hero. Active task at top. |
| **Mature** | 10+ tasks completed total | Historical view available. Monthly totals in hero. Potential "pace" indicator: "At this rate, you'll close your Value Gap in ~8 months." |
| **All Done** | All tasks completed, queue empty | Celebration state. "You've completed all identified actions. Your BRI is [score]. Next step: keep your evidence current in Mode 4, or reassess in Mode 2 to find new opportunities." |

### Edge Cases

**E-1: User has 30+ tasks in queue**
Only show the top task expanded and 3-5 in "Up Next." The rest exist in the system but are invisible to the user. No "Show All 30 Tasks" button on the primary view. The queue auto-manages — when a task is completed, the next one surfaces. A secondary "Full Queue" view is available via a subtle link but NOT the default experience.

**E-2: User starts a task but doesn't complete it for 14+ days**
Show a gentle nudge on the task card: "Started 14 days ago — still working on this?" with options: "Yes, continuing" (resets timer), "I'm stuck" (offers to mark blocked or defer), "Not relevant anymore" (marks N/A). Don't auto-defer. Let the user decide.

**E-3: User marks task as BLOCKED**
Task moves below "Up Next" with blocked indicator and reason. Next priority task auto-surfaces to top position. Blocked task shows "Blocked: [reason]" with option to unblock when ready. System does NOT count blocked tasks as failures — they're a natural part of the process.

**E-4: User defers a task**
Task exits the visible queue entirely. Deferred tasks have a `deferredUntil` date. When the date passes, the task re-enters the queue at its original priority rank. A subtle "Deferred (2)" count is visible in the hero area but not in the main flow.

**E-5: All visible tasks require delegation**
If the top 3 tasks are all assigned to someone else (CPA, attorney, etc.), surface the next self-assignable task as the primary "Your Next Move." Show delegated tasks in a separate "Waiting On Others" section below.

**E-6: Task completion triggers next-level task**
When a task is completed and `generateNextLevelTasks()` creates a follow-up, the follow-up enters the queue at its calculated priority rank. If it's higher priority than the current "Up Next" tasks, it surfaces naturally. Don't show a "new task generated!" notification — just let the queue update.

**E-7: Value gap changes (new assessment or financial data)**
When `renormalizeTaskValues()` is called, all dollar impacts update. The running "completed this month" total reflects the values AT TIME OF COMPLETION (not recalculated). Active task dollar impacts update to current values. Show no notification — just update the numbers.

---

## 3. DETAILED FUNCTIONAL REQUIREMENTS

### 3.1 Hero Summary Bar

A compact bar at the top of the Actions page showing queue status and monthly progress.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  YOUR ACTION QUEUE         12 tasks · 3 active · 2 deferred     │
│                                                                  │
│  This Month: 4 completed · $590K recovered                      │
└──────────────────────────────────────────────────────────────────┘
```

**Data Requirements:**
- `totalTasks`: Count of all non-completed, non-cancelled tasks (in queue + in action plan)
- `activeTasks`: Count of tasks with status `IN_PROGRESS`
- `deferredTasks`: Count of tasks with status `DEFERRED`
- `completedThisMonth`: Count of tasks completed in current calendar month
- `valueRecoveredThisMonth`: Sum of `normalizedValue` for tasks completed this month (value at time of completion, stored as `completedValue` — see data model changes)

**Behavior:**
- Clicking "X deferred" opens a minimal deferred tasks panel (not a full page)
- Monthly stats reset on the 1st of each month
- If no tasks completed this month: "This Month: Ready to start" (not "$0 recovered")

### 3.2 Active Task Card (Expanded)

The primary visual element. Shows the ONE task (or up to 2 if both are in-progress) the user should be working on right now.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  ● IN PROGRESS                              Transferability      │
│                                                                  │
│  Document top 5 customer relationships                           │
│                                                                  │
│  ~$120K impact · 45 min remaining · Started Oct 15               │
│                                                                  │
│  WHY THIS MATTERS TO BUYERS                                      │
│  "A buyer will ask: What happens to revenue if key customer      │
│   relationships don't transfer? Without documentation,           │
│   they assume the worst."                                        │
│                                                                  │
│  ────────────────────────────────────────────────────────────    │
│                                                                  │
│  Progress: ████████████░░░░░░ 2 of 4 steps                      │
│                                                                  │
│  ☑ List top 5 customers by revenue                               │
│  ☑ Draft relationship summary for customers 1 and 2              │
│  ☐ Complete summaries for customers 3-5                          │
│  ☐ Upload customer relationship document                         │
│                                                                  │
│  ────────────────────────────────────────────────────────────    │
│                                                                  │
│  [Continue →]              [Mark Complete]     Assigned: You      │
│                                                                  │
│  ┌─ More Details ─────────────────────────────────────────────┐  │
│  │  Success Criteria · Steps to Complete · Required Output     │  │
│  │  (collapsed by default, expands on click)                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- Task title, description from `Task` model
- Dollar impact from `normalizedValue`
- Time remaining calculated from `estimatedHours` minus elapsed time on sub-steps
- BRI category from `briCategory`
- Buyer consequence from `buyerConsequence` field (added in Mode 1 spec) or generated from `richDescription.buyerRisk`
- Sub-steps from `richDescription.subTasks` — flattened into a checklist

**Sub-Step Behavior:**
- Each sub-step is a checkbox that persists state
- Sub-step completion state is stored in a new `taskProgress` JSON field on the Task model (see data model changes)
- Checking a sub-step saves immediately (optimistic update, auto-save)
- Progress bar updates on each check
- When all sub-steps are checked, show a "All steps complete — ready to mark done?" prompt instead of auto-completing
- If no `richDescription.subTasks` exist (legacy tasks), show just the task description and a single "Mark Complete" button with no progress bar

**"Continue" Button Behavior:**
- If task has an `outputFormat` in rich description: opens a panel/modal with upload guidance
- If task has linked evidence requirements: scrolls to or highlights the upload CTA
- If task is purely operational: button label becomes "I'm working on this" and keeps task in IN_PROGRESS state

**Status Change Options (accessible via dropdown or secondary actions):**
- **Mark Complete** → Opens completion dialog (notes + optional evidence upload)
- **I'm Blocked** → Opens blocked reason input, moves task below "Up Next"
- **Defer** → Opens defer dialog with date picker and reason
- **Not Applicable** → Confirms with "This will remove the task and recalculate your queue"
- **Assign to Someone** → Opens delegation flow (see 3.5)

### 3.3 Up Next Queue

Shows the next 3-5 tasks in priority order. Compact cards with just enough info to understand what's coming.

**Layout:**
```
  Up Next
  ┌──────────────────────────────────────────────────────────────┐
  │  ○ Formalize vendor agreements                               │
  │    Operations · ~$90K · 60 min · Needs: vendor list          │
  ├──────────────────────────────────────────────────────────────┤
  │  ○ Update insurance certificates                             │
  │    Legal/Tax · ~$60K · 15 min · Upload required              │
  ├──────────────────────────────────────────────────────────────┤
  │  ○ Create employee handbook                                  │
  │    Transferability · ~$55K · 90 min · Template available     │
  └──────────────────────────────────────────────────────────────┘
```

**Each row shows:**
- Task title
- BRI category label
- Dollar impact (from `normalizedValue`)
- Estimated time (from `estimatedHours`)
- Prerequisite hint OR output type hint (from rich description)

**Prerequisite Display:**
- Derived from `richDescription.subTasks[0]` — the first sub-task often describes what's needed before starting
- If task has `outputFormat.formats` that include "upload" or "document," show "Upload required"
- If task references data that comes from another system: "Needs: [data source]"

**Behavior:**
- Clicking a queued task expands it inline (replaces the compact row with the full Active Task Card layout) — this does NOT change the task status. The user is previewing it.
- "Start This Task" button on expanded preview changes status to IN_PROGRESS and moves it to the Active section
- User CAN have multiple tasks in IN_PROGRESS simultaneously (max 3 recommended, no hard limit)
- If user starts a second task while one is in progress, show both in the Active section (stacked, most recent on top)

**"See Full Queue" Link:**
- Subtle text link below the last "Up Next" item: "See all 12 tasks in queue"
- Opens a secondary view (slide-over panel, not a new page) showing all remaining tasks in priority order
- Full queue view allows: reorder by drag (manual priority override), defer, mark N/A
- Full queue view does NOT become the primary experience — the focused queue is always the default

### 3.4 Completed This Month

Shows tasks completed in the current calendar month with value attribution.

**Layout:**
```
  ─────── COMPLETED THIS MONTH (4) ───────────────────────────

  ✓ Connected QuickBooks              +$340K recovered   Oct 3
  ✓ Documented org structure          +$85K recovered    Oct 7
  ✓ Updated lease agreement           +$45K recovered    Oct 12
  ✓ Completed financial review        +$120K recovered   Oct 18

  Total value recovered this month: $590K
```

**Data Requirements:**
- Tasks with `status: COMPLETED` and `completedAt` within current calendar month
- Dollar value uses `completedValue` (snapshot of `normalizedValue` at time of completion — see data model changes)
- Sorted by `completedAt` descending (most recent first)
- Running total sums all `completedValue` for the month

**Behavior:**
- Each completed row is clickable → expands to show completion notes, evidence uploaded, and the BRI impact
- If no tasks completed this month, this section is hidden (not "0 completed")
- Previous months accessible via "View previous months" link → opens history panel showing month-by-month summaries
- The running total ("$590K recovered") uses the brand accent color and is the most prominent number in this section

### 3.5 Delegation Flow

Allows users to assign tasks to team members or invite external collaborators.

**Trigger:** "Assign to Someone" action on any task card.

**Flow:**
1. **Choose Assignee** — Shows existing team members (users with access to this company) as selectable options. "Invite someone new" option at bottom.
2. **Invite New** (if selected) — Email input + role label (e.g., "CPA," "Attorney," "COO"). Sends task-specific invite via existing `TaskInvite` model.
3. **Brief** — Auto-generated from `richDescription` showing: what needs to be done (`subTasks`), what the output should be (`outputFormat`), and why it matters (`buyerRisk`). User can edit before sending.
4. **Confirmation** — Task card shows "Assigned: [Name/Email] ([Role])" with "Waiting" indicator.

**Assigned Task Behavior:**
- Assigned tasks remain in the queue at their priority position but show the assignee's name
- If the top 3 tasks are all assigned to others, surface the next self-assigned task as the primary active task
- "Waiting On Others" section appears below "Up Next" when any tasks are delegated
- Assignee receives email with task brief and a link to update status (via existing TaskInvite token flow)

### 3.6 Task Completion Dialog

Triggered when user clicks "Mark Complete" on any task.

**Flow:**
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ✓ Task Complete                                             │
│                                                              │
│  Document top 5 customer relationships                       │
│  Estimated value recovered: ~$120K                           │
│                                                              │
│  ────────────────────────────────────────────────────────    │
│                                                              │
│  Completion Notes (optional)                                 │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Documented all 5 relationships. Customer #3 has    │     │
│  │ a verbal-only agreement — flagged for legal.       │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  Evidence (optional)                                         │
│  [Upload Document]  or  [Link from Data Room]                │
│                                                              │
│  ────────────────────────────────────────────────────────    │
│                                                              │
│  [Complete Task →]                          [Back]           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**On completion:**
1. Set `status: COMPLETED`, `completedAt: now()`, `completionNotes: [notes]`
2. Snapshot `normalizedValue` → `completedValue` (new field, see data model changes)
3. If linked to assessment question: call existing `upgradesFromOption` / `upgradesToOption` logic to improve BRI
4. Call `generateNextLevelTasks()` if applicable
5. Call `onTaskStatusChange()` with `autoFill: true` to backfill queue
6. Show brief celebration: "+$120K recovered" with confetti animation (subtle, 1.5s)
7. Auto-transition to next task after 2s delay (or immediately on click)
8. Fire analytics event `task_completed`

### 3.7 API Changes

#### New Endpoint: `GET /api/companies/[id]/actions`

Replaces the current split between `/api/tasks`, `/api/companies/[id]/action-center`, and playbook data fetching.

**Response:**
```typescript
interface ActionsResponse {
  // Hero summary
  summary: {
    totalTasks: number
    activeTasks: number
    deferredTasks: number
    completedThisMonth: number
    valueRecoveredThisMonth: number  // sum of completedValue for current month
  }

  // Currently in-progress task(s) — expanded view
  activeTasks: Array<{
    id: string
    title: string
    description: string
    briCategory: BriCategory
    categoryLabel: string
    normalizedValue: number          // current dollar impact
    estimatedHours: number | null
    effortLevel: EffortLevel
    status: TaskStatus
    startedAt: string | null         // when moved to IN_PROGRESS
    daysInProgress: number | null
    priorityRank: number

    // Buyer context
    buyerConsequence: string | null
    buyerRisk: {
      mainQuestion: string
      consequences: string[]
      conclusion: string
    } | null

    // Sub-steps
    subSteps: Array<{
      id: string                     // generated from index
      title: string
      completed: boolean
    }>
    subStepProgress: {
      completed: number
      total: number
    }

    // Rich description sections (lazy-loaded on expand)
    successCriteria: {
      overview: string
      outcomes: string[]
    } | null
    outputFormat: {
      description: string
      formats: string[]
      guidance: string
    } | null

    // Assignment
    assignee: {
      id: string
      name: string
      email: string
      role: string | null            // "CPA", "Attorney", etc.
    } | null
    isAssignedToCurrentUser: boolean

    // Evidence
    proofDocuments: Array<{
      id: string
      name: string
      uploadedAt: string
    }>
  }>

  // Up next queue (3-5 tasks)
  upNext: Array<{
    id: string
    title: string
    briCategory: BriCategory
    categoryLabel: string
    normalizedValue: number
    estimatedHours: number | null
    effortLevel: EffortLevel
    priorityRank: number
    prerequisiteHint: string | null  // derived from rich description
    outputHint: string | null        // "Upload required", "Template available"
    assignee: {
      name: string
      role: string | null
    } | null
  }>

  // Completed this month
  completedThisMonth: Array<{
    id: string
    title: string
    completedValue: number           // value at time of completion
    completedAt: string
    briCategory: BriCategory
    completionNotes: string | null
    hasEvidence: boolean
  }>

  // Waiting on others (delegated tasks)
  waitingOnOthers: Array<{
    id: string
    title: string
    briCategory: BriCategory
    normalizedValue: number
    assignee: {
      name: string
      email: string
      role: string | null
    }
    assignedAt: string
    lastUpdated: string | null
  }>

  // Metadata
  hasMoreInQueue: boolean
  totalQueueSize: number
}
```

#### New Endpoint: `GET /api/companies/[id]/actions/queue`

Returns the full task queue for the "See Full Queue" panel.

**Response:**
```typescript
interface QueueResponse {
  tasks: Array<{
    id: string
    title: string
    briCategory: BriCategory
    categoryLabel: string
    normalizedValue: number
    estimatedHours: number | null
    effortLevel: EffortLevel
    priorityRank: number
    status: TaskStatus
    issueTier: IssueTier | null
    assignee: { name: string; role: string | null } | null
  }>
  totalCount: number
}
```

#### Updated Endpoint: `PATCH /api/tasks/[id]`

Add support for sub-step progress updates:

```typescript
// New fields in PATCH body
interface TaskUpdateBody {
  // ... existing fields ...
  subStepProgress?: Record<string, boolean>  // { "step-0": true, "step-1": false, ... }
}
```

#### New Endpoint: `POST /api/tasks/[id]/complete`

Dedicated completion endpoint that handles the full completion flow:

```typescript
interface TaskCompleteBody {
  completionNotes?: string
  evidenceDocumentIds?: string[]      // link existing data room documents
}

interface TaskCompleteResponse {
  task: {
    id: string
    title: string
    completedValue: number
    briImpact: {
      previousScore: number
      newScore: number
      categoryChanged: BriCategory
    } | null
  }
  nextTask: {
    id: string
    title: string
    normalizedValue: number
    briCategory: BriCategory
  } | null
  followUpTaskGenerated: boolean
  monthlyTotal: {
    completedCount: number
    totalValueRecovered: number
  }
}
```

### 3.8 Data Model Changes

#### Task Model Additions

```prisma
model Task {
  // ... existing fields ...

  // Sub-step progress (JSON storing checked state of sub-steps derived from richDescription)
  taskProgress       Json?              @map("task_progress")
  // e.g., { "steps": { "0": true, "1": true, "2": false, "3": false } }

  // Snapshot of normalizedValue at time of completion (for historical accuracy)
  completedValue     Decimal?           @map("completed_value") @db.Decimal(15, 2)

  // When the task was moved to IN_PROGRESS (for "days in progress" calculation)
  startedAt          DateTime?          @map("started_at")

  // Assignee role label (e.g., "CPA", "Attorney") — separate from user relationship
  assigneeRole       String?            @map("assignee_role")
}
```

**Migration notes:**
- `taskProgress` defaults to `null`. Populated on first sub-step interaction.
- `completedValue` is set by the completion endpoint. For already-completed tasks, backfill from current `normalizedValue`.
- `startedAt` is set when status changes from PENDING to IN_PROGRESS. For already-in-progress tasks, backfill from `updatedAt`.
- `assigneeRole` is a display label only, not a permission system. Stored on Task, not on User.

#### No New Models Required

The existing `Task`, `TaskAssignment`, `TaskInvite`, and related models are sufficient. The Action Queue is a UI concept built on top of the existing `inActionPlan` + `priorityRank` system with the new fields above.

### 3.9 Tier Gating

| Feature | Foundation (Free) | Growth ($179/mo) | Exit-Ready ($449/mo) |
|---|---|---|---|
| View action queue | Yes (see tasks + dollar values) | Yes | Yes |
| Sub-step progress | No (upgrade wall) | Yes | Yes |
| Mark tasks complete | No (upgrade wall) | Yes | Yes |
| Delegation/assignment | No | Yes (team members) | Yes (team + external) |
| Full queue view | No | Yes | Yes |
| Completion history | No | Yes | Yes |
| Evidence upload on completion | No | Yes | Yes |
| Task completion → BRI update | No | Yes | Yes |

**Upgrade wall copy:**
- On "Mark Complete": "Upgrade to Growth to track your progress and recover value. Your $179/month pays for itself with just one completed task."
- On sub-step checkbox: "Upgrade to Growth to track sub-steps and maintain momentum."

---

## 4. DESIGN SPECIFICATIONS

### 4.1 Page Layout

```
Page: /dashboard/actions
Max width: 800px (focused, not wide dashboard — this is a work view)
Padding: px-6 py-8
Background: var(--background)
```

### 4.2 Hero Summary Bar

```
Container: w-full rounded-xl border border-border/50 bg-card p-6
Layout: flex justify-between items-center

Left side:
  Title: "YOUR ACTION QUEUE" — text-sm font-semibold tracking-wider text-muted-foreground uppercase
  Stats: "12 tasks · 3 active · 2 deferred" — text-sm text-muted-foreground
  "2 deferred" uses text-amber-600 and is clickable

Right side:
  "This Month:" label — text-sm text-muted-foreground
  "4 completed · $590K recovered" — text-sm font-semibold text-foreground
  Dollar amount uses text-[var(--burnt-orange)] font-bold
```

### 4.3 Active Task Card

```
Container: rounded-xl border-2 border-[var(--burnt-orange)]/30 bg-card p-6 mt-6 shadow-sm
Border: 2px solid with burnt-orange at 30% opacity (indicates "active — work here")

Status badge (top-left):
  ● IN PROGRESS — inline-flex items-center gap-1.5 text-xs font-medium text-[var(--burnt-orange)]
  Pulsing dot: w-2 h-2 rounded-full bg-[var(--burnt-orange)] animate-pulse

Category badge (top-right):
  text-xs font-medium px-2 py-0.5 rounded-full
  Colors: Use BRI_CATEGORY_COLORS from existing constants (Financial=emerald, Transferability=blue, etc.)

Title:
  text-xl font-semibold text-foreground mt-3

Meta line:
  text-sm text-muted-foreground mt-1
  Format: "~$120K impact · 45 min remaining · Started Oct 15"
  Dollar amount: font-medium text-foreground

Buyer context section:
  mt-4 p-4 rounded-lg bg-muted/50 border border-border/30
  Label: "WHY THIS MATTERS TO BUYERS" — text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2
  Copy: text-sm text-muted-foreground italic leading-relaxed

Progress section:
  mt-6
  Progress bar: h-2 rounded-full bg-muted overflow-hidden
  Fill: h-full rounded-full bg-[var(--burnt-orange)] transition-all duration-300
  Label: "2 of 4 steps" — text-xs text-muted-foreground mt-1

Sub-step checklist:
  mt-3 space-y-2
  Each step: flex items-start gap-3
  Checkbox: w-4 h-4 rounded border-2 cursor-pointer
    Unchecked: border-border
    Checked: border-[var(--burnt-orange)] bg-[var(--burnt-orange)] with checkmark icon in white
  Label: text-sm text-foreground (checked: text-muted-foreground line-through)

Action row:
  mt-6 flex items-center justify-between border-t border-border/50 pt-4
  [Continue →]: Primary button — bg-[var(--burnt-orange)] text-white px-6 py-2 rounded-lg font-medium
  [Mark Complete]: Secondary button — border border-border text-foreground px-4 py-2 rounded-lg
  "Assigned: You" — text-sm text-muted-foreground

"More Details" section:
  mt-4 border border-border/30 rounded-lg
  Collapsed: "More Details" clickable header with chevron
  Expanded: Shows successCriteria, steps to complete, outputFormat sections
  Each section: text-sm with appropriate spacing
```

### 4.4 Up Next Queue

```
Section container: mt-8
Section label: "Up Next" — text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-3

Task rows:
  Container: rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/30

  Each row: p-4 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors
  Left side:
    Row 1: flex items-center gap-2
      ○ indicator: w-3 h-3 rounded-full border-2 border-border
      Title: text-sm font-medium text-foreground
    Row 2: text-xs text-muted-foreground mt-0.5
      Format: "Operations · ~$90K · 60 min · Needs: vendor list"
      Category uses its respective color

  Right side (only if assigned):
    Avatar circle or initials: w-6 h-6 rounded-full bg-muted text-[10px]

Click behavior:
  Row expands inline to show full Active Task Card layout
  "Start This Task" primary CTA appears
  Other rows push down (not overlay)
  Click again or click "Collapse" to return to compact view
```

### 4.5 Completed This Month

```
Section container: mt-8

Section divider:
  flex items-center gap-3
  Line: flex-1 h-px bg-border/50
  Label: "COMPLETED THIS MONTH (4)" — text-xs font-semibold tracking-wider text-muted-foreground uppercase whitespace-nowrap

Completed rows:
  space-y-1 mt-3

  Each row: flex items-center justify-between py-2 px-1 rounded hover:bg-muted/20 cursor-pointer
  Left: flex items-center gap-2
    ✓ icon: w-4 h-4 text-emerald-500
    Title: text-sm text-muted-foreground
  Right: flex items-center gap-4
    Value: text-sm font-medium text-emerald-600 — "+$120K recovered"
    Date: text-xs text-muted-foreground — "Oct 18"

Running total:
  mt-4 pt-3 border-t border-border/30
  "Total value recovered this month:" — text-sm text-muted-foreground
  "$590K" — text-lg font-bold text-[var(--burnt-orange)]
```

### 4.6 Empty State

```
Container: flex flex-col items-center justify-center py-16 text-center

Icon: Target or ListChecks from lucide — w-12 h-12 text-muted-foreground/40

Title: "Your action queue is empty" — text-lg font-semibold text-foreground mt-4
Subtitle: "Complete your diagnosis to generate personalized tasks that increase your business value."
  — text-sm text-muted-foreground mt-2 max-w-md

CTA: [Go to Diagnosis →] — primary button linking to /dashboard/diagnosis
```

### 4.7 Animations

All animations use the existing `motion` export from `src/lib/motion.tsx` (LazyMotion with domAnimation).

```typescript
// Page load: stagger sections
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

// Sub-step check: scale + color
const checkVariants = {
  unchecked: { scale: 1 },
  checked: { scale: [1, 1.2, 1], transition: { duration: 0.2 } }
}

// Task completion celebration
const celebrationVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
}

// Progress bar fill
// Use CSS transition on width: transition-all duration-500 ease-out

// Queue item expand
// Use AnimatePresence with layout animation
// Height auto-expands with spring physics
```

### 4.8 Loading State

```
Skeleton layout:
  - Hero bar: h-16 rounded-xl bg-muted animate-pulse
  - Active task card: h-64 rounded-xl bg-muted animate-pulse mt-6
  - Up Next: 3x h-14 rounded bg-muted animate-pulse mt-8 space-y-2

Use TanStack Query with:
  staleTime: 30_000  (30s — task state changes more frequently than valuation)
  refetchOnWindowFocus: true
  refetchInterval: 60_000  (1 minute — catch status changes from delegated tasks)
```

### 4.9 Mobile Responsiveness

```
Breakpoints:
  < 640px (mobile):
    - Hero bar stacks vertically (title above, stats below)
    - Active task card full-width, no horizontal padding reduction
    - Sub-steps remain full-width (these are the interactive elements)
    - Up Next rows stack with category on its own line
    - Completed rows: value stacks below title

  640px-1024px (tablet):
    - Same as desktop but max-width: 100% with px-4

  > 1024px (desktop):
    - max-width: 800px centered
```

---

## 5. ENGAGEMENT HOOKS

### 5.1 Core Engagement Loop

```
Complete Task → See Value Recovered → Feel ROI → Start Next Task → Complete Task...
```

This is the tightest engagement loop in the product. Every task completion creates an immediate dopamine hit ("+$120K recovered") followed by an immediate next action (next task auto-surfaces). There is no dead state between completion and the next task.

### 5.2 Micro-Completion Loop

```
Check Sub-Step → See Progress Bar Move → Feel Progress → Check Next Sub-Step...
```

Sub-steps turn a 45-minute task into 4-6 discrete micro-wins. Each checkbox creates a small completion signal. The progress bar moving provides visual reinforcement. This prevents the "I started but never finished" pattern that kills task completion rates.

### 5.3 Monthly Value Accumulation

```
Complete Tasks Over Month → See Running Total Grow → Month End: "You recovered $X" → Start Next Month
```

The monthly running total creates a streak-like mechanic without gamification. Users don't want to see a month with $0 recovered. The total is visible on every visit. It's the Hormozi value equation made visible: "$590K recovered for $179/month."

### 5.4 Conversion Moments (Free → Paid)

**Moment 1: First task view.** User sees their highest-impact task with "$X impact" but can't mark sub-steps or complete it. Copy: "This task is worth ~$120K to your exit. Upgrade to start building value."

**Moment 2: Queue awareness.** User sees "12 tasks · $1.2M total impact" but can only view, not act. The queue makes the total opportunity cost tangible.

**Moment 3: Social proof.** After assessment completion, before actions are accessible: "Founders who complete their first 3 tasks recover an average of $280K in value. Upgrade to start."

### 5.5 Analytics Events

| Event | Trigger | Properties |
|---|---|---|
| `actions_viewed` | Page load | `{ taskCount, activeCount, completedThisMonth }` |
| `task_expanded` | Click on Up Next row | `{ taskId, briCategory, normalizedValue, position }` |
| `task_started` | Status → IN_PROGRESS | `{ taskId, briCategory, normalizedValue, fromPosition }` |
| `substep_completed` | Sub-step checkbox checked | `{ taskId, stepIndex, stepsCompleted, stepsTotal }` |
| `substep_unchecked` | Sub-step checkbox unchecked | `{ taskId, stepIndex }` |
| `task_completed` | Status → COMPLETED | `{ taskId, briCategory, completedValue, daysToComplete, subStepsTotal }` |
| `task_blocked` | Status → BLOCKED | `{ taskId, briCategory, reason, daysInProgress }` |
| `task_deferred` | Status → DEFERRED | `{ taskId, briCategory, deferredUntil, reason }` |
| `task_delegated` | Assignee changed | `{ taskId, assigneeRole, isNewInvite }` |
| `task_completion_dialog_opened` | Mark Complete clicked | `{ taskId, hasEvidence, hasNotes }` |
| `full_queue_opened` | "See all X tasks" clicked | `{ totalQueueSize }` |
| `monthly_total_viewed` | Completed section scrolled into view | `{ completedCount, totalValueRecovered }` |
| `upgrade_wall_hit` | Free user attempts gated action | `{ action, taskId, normalizedValue }` |

---

## 6. TECHNICAL GUIDANCE

### 6.1 Component Architecture

```
src/components/actions/
├── ActionsPage.tsx              # Page orchestrator (data fetching, layout)
├── HeroSummaryBar.tsx           # Queue stats and monthly progress
├── ActiveTaskCard.tsx           # Expanded in-progress task with sub-steps
│   ├── SubStepChecklist.tsx     # Checkbox list with progress bar
│   ├── BuyerContextBlock.tsx    # "Why this matters to buyers" section
│   ├── TaskDetailsCollapsible.tsx # Expandable rich description sections
│   └── TaskStatusActions.tsx    # Status change dropdown/buttons
├── UpNextQueue.tsx              # Compact task queue with expand behavior
│   └── QueueItemRow.tsx         # Single compact task row
├── CompletedThisMonth.tsx       # Completed tasks with value attribution
│   └── CompletedTaskRow.tsx     # Single completed row
├── WaitingOnOthers.tsx          # Delegated tasks section
├── TaskCompletionDialog.tsx     # Completion flow (notes + evidence)
├── DelegationFlow.tsx           # Assign/invite flow
├── FullQueuePanel.tsx           # Slide-over panel showing all tasks
├── DeferredTasksPanel.tsx       # Slide-over panel for deferred tasks
└── EmptyState.tsx               # No tasks state
```

### 6.2 Data Fetching

```typescript
// Primary query — loads on page mount
const { data, isLoading, refetch } = useQuery({
  queryKey: ['actions', companyId],
  queryFn: () => fetch(`/api/companies/${companyId}/actions`).then(r => r.json()),
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchInterval: 60_000,
})

// Full queue — loads on demand (when panel opens)
const { data: queueData } = useQuery({
  queryKey: ['actions', 'queue', companyId],
  queryFn: () => fetch(`/api/companies/${companyId}/actions/queue`).then(r => r.json()),
  enabled: isQueuePanelOpen,  // only fetch when panel is opened
})

// Sub-step mutation — optimistic update
const updateSubStep = useMutation({
  mutationFn: ({ taskId, stepIndex, completed }) =>
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ subStepProgress: { [`step-${stepIndex}`]: completed } })
    }),
  onMutate: async ({ taskId, stepIndex, completed }) => {
    // Optimistic update — immediately check/uncheck the box
    await queryClient.cancelQueries(['actions', companyId])
    const prev = queryClient.getQueryData(['actions', companyId])
    queryClient.setQueryData(['actions', companyId], (old) => {
      // Update the specific sub-step in the active task
      // ... optimistic update logic
    })
    return { prev }
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['actions', companyId], context.prev)
  },
  onSettled: () => {
    queryClient.invalidateQueries(['actions', companyId])
  },
})

// Task completion mutation
const completeTask = useMutation({
  mutationFn: ({ taskId, notes, evidenceIds }) =>
    fetch(`/api/tasks/${taskId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ completionNotes: notes, evidenceDocumentIds: evidenceIds })
    }),
  onSuccess: () => {
    // Invalidate actions query to refresh the queue
    queryClient.invalidateQueries(['actions', companyId])
    // Also invalidate the value home screen (Mode 1) since BRI may have changed
    queryClient.invalidateQueries(['dashboard', companyId])
  },
})
```

### 6.3 Sub-Step State Management

Sub-steps are derived from `richDescription.subTasks` and their completion state is stored in the `taskProgress` JSON field.

```typescript
// Derive sub-steps from rich description
function deriveSubSteps(richDescription: RichTaskDescription | null): SubStep[] {
  if (!richDescription?.subTasks) return []

  // Flatten subTasks into a flat checklist
  // Each SubTask has a title and items[] — each item becomes a sub-step
  return richDescription.subTasks.flatMap((subTask, groupIndex) =>
    subTask.items.map((item, itemIndex) => ({
      id: `${groupIndex}-${itemIndex}`,
      title: item,
      group: subTask.title,
    }))
  )
}

// Merge with saved progress
function mergeProgress(
  subSteps: SubStep[],
  taskProgress: { steps: Record<string, boolean> } | null
): SubStepWithState[] {
  return subSteps.map(step => ({
    ...step,
    completed: taskProgress?.steps?.[step.id] ?? false,
  }))
}
```

### 6.4 Performance Requirements

| Metric | Target |
|---|---|
| Actions page load (API) | < 200ms |
| Sub-step toggle (optimistic) | < 50ms visual feedback |
| Sub-step save (server) | < 300ms |
| Task completion flow | < 500ms total (including BRI recalculation) |
| Queue panel open | < 300ms (lazy loaded) |
| Full queue load (30+ tasks) | < 400ms |

### 6.5 Caching Strategy

- **Primary actions data:** Cache for 30s, refetch on window focus. Invalidate on any task mutation.
- **Full queue data:** Cache for 60s, only fetched when panel is opened. Invalidate on task completion (queue order may change).
- **Sub-step progress:** Optimistic updates with rollback on error. Server is source of truth.
- **Completed this month:** Derived from actions data, no separate cache needed.

### 6.6 Testing Requirements

**Unit Tests:**
- `deriveSubSteps()` correctly flattens `richDescription.subTasks`
- `mergeProgress()` correctly applies saved state to derived steps
- Priority-based ordering is maintained after task status changes
- `completedValue` is snapshotted correctly on completion
- Monthly totals calculate correctly across timezone boundaries
- Empty state renders when no tasks exist
- Tier gating blocks correct actions for free users

**Integration Tests:**
- Task completion flow: mark complete → BRI update → next task surfaces → queue backfills
- Delegation flow: assign → invite email sent → assignee can update status
- Sub-step progress: check steps → refresh page → steps persist
- Deferred task: defer with date → date passes → task re-enters queue at correct priority

**E2E Tests:**
- Full user journey: assessment complete → tasks generated → first task started → sub-steps checked → task completed → value shown → next task visible
- Monthly rollover: complete tasks → new month → totals reset → history accessible

---

## 7. LAUNCH PLAN

### Sprint 1: Core Queue (MVP)

**Deliverables:**
- [ ] `ActionsPage.tsx` with data fetching from new `/api/companies/[id]/actions` endpoint
- [ ] `HeroSummaryBar.tsx` with task counts and monthly stats
- [ ] `ActiveTaskCard.tsx` with full layout (title, meta, buyer context, status actions)
- [ ] `UpNextQueue.tsx` with 3-5 compact rows and click-to-expand
- [ ] `CompletedThisMonth.tsx` with value attribution rows and running total
- [ ] `EmptyState.tsx` for no-tasks state
- [ ] New API endpoint: `GET /api/companies/[id]/actions`
- [ ] Database migration: add `completedValue`, `startedAt`, `assigneeRole` to Task model
- [ ] Backfill `completedValue` for existing completed tasks
- [ ] Backfill `startedAt` for existing in-progress tasks
- [ ] Route change: `/dashboard/playbook` → redirect to `/dashboard/actions`
- [ ] Route change: `/dashboard/action-plan` → redirect to `/dashboard/actions`
- [ ] Nav item: rename "Playbook" to "Actions" in sidebar

**NOT in Sprint 1:** Sub-steps, delegation, full queue panel, completion dialog with evidence.

### Sprint 2: Sub-Steps & Completion Flow

**Deliverables:**
- [ ] `SubStepChecklist.tsx` with checkbox UI, progress bar, optimistic updates
- [ ] Database migration: add `taskProgress` JSON field to Task model
- [ ] Sub-step derivation from `richDescription.subTasks`
- [ ] `TaskCompletionDialog.tsx` with notes input and evidence upload
- [ ] New API endpoint: `POST /api/tasks/[id]/complete` with full completion flow
- [ ] `completedValue` snapshotting on completion
- [ ] BRI recalculation trigger on task completion (existing logic, new endpoint)
- [ ] Auto-surface next task after completion (2s delay with manual override)
- [ ] Celebration animation on completion (+$X recovered)
- [ ] Analytics events for sub-step and completion tracking
- [ ] Tier gating: free users see queue but can't interact

### Sprint 3: Delegation & Queue Management

**Deliverables:**
- [ ] `DelegationFlow.tsx` with team member selection and invite flow
- [ ] `WaitingOnOthers.tsx` section for delegated tasks
- [ ] `FullQueuePanel.tsx` slide-over with all tasks and manual priority override
- [ ] `DeferredTasksPanel.tsx` slide-over accessible from hero bar
- [ ] "Stale task" nudge for tasks in-progress > 14 days
- [ ] Deferred task re-entry logic (check `deferredUntil` on page load)
- [ ] Monthly history view (previous months' completion summaries)
- [ ] Mobile responsiveness pass
- [ ] Performance optimization (lazy loading, virtualization if needed)

### Success Metrics (30 days post-launch)

| Metric | Current Baseline | Target |
|---|---|---|
| Task start rate (% of WAU who start a task) | ~15% (estimated) | 40% |
| Task completion rate (started → completed) | ~25% (estimated) | 50% |
| Sub-step engagement (% of users who check at least one sub-step) | N/A (new) | 70% of task starters |
| Avg tasks completed per user per month | ~1.5 (estimated) | 4+ |
| Monthly value recovered per user (avg) | Not tracked | $200K+ |
| Playbook page → Actions page weekly visits | ~2/week (estimated) | 4+/week |
| Delegation rate (% of users who delegate at least one task) | Not tracked | 15% |

---

## APPENDIX A: COPY TABLE

| Element | Copy |
|---|---|
| Page title | YOUR ACTION QUEUE |
| Hero stats format | `{n} tasks · {n} active` or `{n} tasks · {n} active · {n} deferred` |
| Monthly stats (has completions) | `This Month: {n} completed · ${X} recovered` |
| Monthly stats (no completions) | `This Month: Ready to start` |
| Active task meta | `~${X} impact · {n} min remaining · Started {date}` |
| Buyer context label | WHY THIS MATTERS TO BUYERS |
| Sub-step progress | `{n} of {n} steps` |
| Up Next label | Up Next |
| Up Next row format | `{Category} · ~${X} · {n} min · {prerequisite or output hint}` |
| Completed section label | COMPLETED THIS MONTH ({n}) |
| Completed row value | `+${X} recovered` |
| Running total label | `Total value recovered this month:` |
| Empty state title | Your action queue is empty |
| Empty state subtitle | Complete your diagnosis to generate personalized tasks that increase your business value. |
| Empty state CTA | Go to Diagnosis |
| Completion celebration | `+${X} recovered` |
| Stale task nudge | `Started {n} days ago — still working on this?` |
| Stale task options | Yes, continuing / I'm stuck / Not relevant anymore |
| All done title | All actions complete |
| All done subtitle | You've completed all identified actions. Keep your evidence current in Evidence, or reassess in Diagnosis to find new opportunities. |
| Free tier upgrade (complete) | Upgrade to Growth to track your progress and recover value. Your $179/month pays for itself with just one completed task. |
| Free tier upgrade (sub-steps) | Upgrade to Growth to track sub-steps and maintain momentum. |
| See full queue | See all {n} tasks in queue |
| Deferred panel title | Deferred Tasks |
| Waiting on others label | WAITING ON OTHERS |

## APPENDIX B: EXISTING FILE REFERENCE

| File | Disposition |
|---|---|
| `src/app/(dashboard)/dashboard/playbook/page.tsx` | Replace with redirect to `/dashboard/actions` |
| `src/app/(dashboard)/dashboard/action-plan/page.tsx` | Replace with redirect to `/dashboard/actions` |
| `src/components/playbook/PlaybookContent.tsx` (790 lines) | Retire. Replaced by `ActionsPage.tsx` |
| `src/components/playbook/TaskCard.tsx` (761 lines) | Retire. Replaced by `ActiveTaskCard.tsx` + `QueueItemRow.tsx` |
| `src/components/playbook/GenerateActionPlanDialog.tsx` (220 lines) | Retire. Queue auto-manages. |
| `src/components/action-plan/TaskList.tsx` (280 lines) | Retire. Replaced by `UpNextQueue.tsx` |
| `src/components/dashboard/ActionCenter.tsx` (952 lines) | Retire. Task surfacing moves to Mode 1 (Next Move Card) and Mode 3 (Actions page) |
| `src/lib/tasks/action-plan.ts` (377 lines) | Keep and extend. Core queue management logic is correct. Add `completedValue` snapshot. |
| `src/lib/tasks/priority-matrix.ts` (181 lines) | Keep as-is. Priority calculation logic is correct. |
| `src/lib/playbook/generate-tasks.ts` (708 lines) | Keep as-is. Task generation logic is correct. |
| `src/lib/playbook/rich-task-description.ts` (157 lines) | Keep as-is. Sub-steps are derived from this structure. |
| `src/app/api/tasks/[id]/route.ts` (408 lines) | Keep and extend. Add `subStepProgress` handling to PATCH. |
| `src/app/api/tasks/route.ts` (207 lines) | Keep for backwards compatibility. New endpoint is primary. |
| `src/app/api/companies/[id]/action-plan/generate/route.ts` | Retire. Queue auto-manages. |
| `src/app/api/companies/[id]/action-plan/refresh/route.ts` | Keep. Still needed for queue backfill logic. |
| `prisma/schema.prisma` — Sprint model | Keep in schema (no migration cost to remove). Unused. |
| `prisma/schema.prisma` — SprintPriority, SprintStatus enums | Keep in schema. Unused. |
