# SPEC: Mode 2 — DIAGNOSIS

**Status:** Ready for Development
**Priority:** P0 — This is the engine that generates all downstream value (tasks, evidence, valuation accuracy). Without a strong diagnosis, everything else is guessing.
**Business Metric:** Activation (assessment completion rate), Conversion (assessment → paid upgrade), Retention (reassessment frequency)
**Replaces:** Current `/assessment/page.tsx` (AssessmentWizard), `/assessment/risk/page.tsx` (10-min assessment), `/assessment/personal-readiness/page.tsx`, `/assessments/new/page.tsx`, `ActionCenter.tsx` assessment section, `RiskBreakdown.tsx`

---

## 1. STRATEGIC CONTEXT

### Why This Exists

The Diagnosis screen answers: **"Where exactly am I weak, how confident is the score, and what's it costing me in dollars?"**

The current system has three separate assessments — initial (26 questions via AssessmentWizard), 10-minute risk refinement (via ProjectAssessment), and personal readiness — each with its own entry point, its own UI, its own completion flow, and its own results screen. Users don't know which assessment to take, whether they've finished, or how the assessments relate to each other. The experience feels fragmented rather than progressive.

Mode 2 merges everything into **one unified assessment experience** with six category panels. The assessment is never "done." Confidence can always improve. New questions unlock as the business changes. Reassessment is prompted by gaps in confidence and drift detection, not by a "Start New Assessment" button.

### What Business Metric This Moves

- **Activation:** Assessment completion is the #1 predictor of paid conversion. Users who complete at least 3 BRI categories are 4x more likely to upgrade (hypothesis). The unified experience reduces the confusion that causes abandonment.
- **Conversion:** When categories show dollar costs ("Transferability is costing you $280K"), the user feels the weight of inaction. That emotional specificity is what drives the upgrade decision.
- **Retention:** Confidence indicators create a pull to deepen over time. "Your Legal score is based on limited data (2 of 8 questions)" naturally motivates the user to answer more without being told to.

### Current State vs. Desired State

| | Current | Desired |
|---|---|---|
| Assessment types | 3 separate (initial, risk, personal) | 1 unified experience with 6 category panels |
| Entry points | 3 pages with different URLs | 1 page: `/dashboard/diagnosis` |
| Progress visibility | Per-assessment progress bar | Per-category confidence indicators with questions answered / available |
| Results format | BRI score (0-100) and category percentages | Dollar cost per category, specific named risk drivers, action CTAs |
| Completion model | Binary (complete/incomplete) | Progressive (confidence deepens over time, never "done") |
| Reassessment | "Start new assessment" button | System surfaces low-confidence categories, user deepens on demand |
| Dollar connection | None — abstract scores only | Every category shows dollar impact via Valuation Bridge math |

---

## 2. USER STORIES & SCENARIOS

### Primary User Stories

**US-1: First-time user (no assessment started)**
> As a business owner who just completed onboarding, I want to see my six BRI categories with their current scores (estimated from Quick Scan) and understand which categories need deeper assessment so that I can start answering questions without committing to a 50-question marathon.

**US-2: Partial assessment user (some categories deep, others shallow)**
> As a business owner who has answered Financial and Operational questions deeply but hasn't touched Legal, I want to see that my Financial confidence is high (●●●○) and my Legal confidence is low (●○○○) so that I know where to focus next.

**US-3: Fully assessed user (all categories answered)**
> As a business owner who has completed all available questions, I want to see my specific risk drivers ranked by dollar cost with direct links to tasks that fix them, so I know exactly what to work on.

**US-4: Returning user (business changed)**
> As a business owner returning after 3 months, I want to see which categories may be stale (confidence decayed due to time) and quickly confirm or update my answers so that my BRI stays accurate.

**US-5: Free tier user**
> As a free tier user, I want to complete the full assessment (assessment IS the activation hook — not gated behind paid tier), see my full BRI breakdown with dollar costs, and then hit the upgrade wall when I try to ACT on the diagnosis.

### State Transitions

| State | Condition | What's Different |
|---|---|---|
| **Empty** | No assessment responses at all | All categories show "Not assessed" with estimated scores from Quick Scan. Primary CTA: "Start with your weakest area" |
| **Partial** | 1-3 categories have responses | Assessed categories show real scores + confidence. Unassessed show estimates. System highlights the lowest-confidence category. |
| **Assessed** | All 6 categories have at least initial responses | Full BRI breakdown with confidence per category. "What's Costing You The Most" section fully populated. |
| **Deep** | All categories have high confidence (3+ of 4 dots) | Risk drivers are specific and evidence-connected. Reassessment prompts are time-based only. |
| **Stale** | 90+ days since last assessment update | Confidence decays visually. Categories show "Last updated 4 months ago" and prompt refresh. |

### Edge Cases

**E-1: User answers all questions with maximum scores**
BRI = 100 (or near). Value Gap = $0. Diagnosis screen shifts to maintenance mode: "Your buyer readiness is excellent. Focus on maintaining this by keeping evidence current." Surface evidence-gap tasks instead of improvement tasks.

**E-2: User marks many questions as NOT_APPLICABLE**
Category scores are calculated from applicable questions only. If all questions in a category are N/A, show: "No applicable questions for [Category]. This category won't affect your BRI score." Exclude from dollar impact calculation.

**E-3: User has old initial assessment + newer project assessments**
Use the most recent response for each question (project assessment responses override initial assessment responses). BRI is always calculated from the latest response set across both systems.

**E-4: Confidence decay over time**
If no assessment activity in 90+ days for a category, visual confidence drops by one dot. This is display-only — the underlying score doesn't change. But the visual degradation prompts reassessment. "Your Financial confidence may have changed since [date]. Want to review?"

**E-5: Free tier user completes all questions**
Assessment is fully available to free tier. This is intentional. Assessment completion IS the activation hook. After completing, the user sees their full diagnosis with dollar costs — but task CTAs open the upgrade modal. The gap between diagnosis and action is the conversion moment.

---

## 3. DETAILED FUNCTIONAL REQUIREMENTS

### 3.1 Page Layout Overview

The Diagnosis page has two main sections:

1. **Category Panel Grid** — 6 panels showing BRI categories with scores, confidence, dollar impact
2. **What's Costing You The Most** — ranked list of specific risk drivers with dollar amounts and action CTAs

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  YOUR BUYER READINESS                            BRI: 62    │
│  How buyers evaluate your business                           │
│                                                              │
│  ┌─────────────────────┐ ┌─────────────────────┐            │
│  │ Financial      78   │ │ Transferability  58  │            │
│  │ ●●●○    -$380K     │ │ ●●○○    -$280K      │            │
│  │ 5/5 questions      │ │ 3/4 questions        │            │
│  │ [Deepen →]         │ │ [Deepen →]           │            │
│  └─────────────────────┘ └─────────────────────┘            │
│  ┌─────────────────────┐ ┌─────────────────────┐            │
│  │ Operations     65   │ │ Market          82   │            │
│  │ ●●●○    -$340K     │ │ ●●○○    -$180K      │            │
│  │ 4/4 questions      │ │ 2/3 questions        │            │
│  └─────────────────────┘ └─────────────────────┘            │
│  ┌─────────────────────┐ ┌─────────────────────┐            │
│  │ Legal & Tax    74   │ │ Personal        52   │            │
│  │ ●○○○    -$220K     │ │ ●●○○                 │            │
│  │ 1/3 questions      │ │ 2/3 questions        │            │
│  │ ⚠ Lowest confidence │ │                      │            │
│  └─────────────────────┘ └─────────────────────┘            │
│                                                              │
│  ─────── WHAT'S COSTING YOU THE MOST ───────────────────    │
│                                                              │
│  1. Financial Opacity           -$180K                       │
│     "No buyer-grade financials connected"                    │
│     [Connect QuickBooks] [Upload Financials]                 │
│                                                              │
│  2. Owner Dependency            -$165K                       │
│     "No succession plan documented"                          │
│     [Start Succession Task →]                                │
│                                                              │
│  3. Customer Concentration      -$120K                       │
│     "Top customer >15% of revenue"                           │
│     [Document Customer Diversity →]                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Page Header

**BRI Score Display:**
- "YOUR BUYER READINESS" — `text-lg font-semibold text-foreground`
- BRI score: `text-4xl font-bold text-primary` — right-aligned, animated count-up
- Sub-label: "How buyers evaluate your business" — `text-sm text-muted-foreground`

**If no assessment completed (Quick Scan only):**
- BRI shows with "Estimated" badge: `<Badge variant="secondary">Estimated from Quick Scan</Badge>`
- Below BRI: "Complete your first category to get a personalized score."

### 3.3 Category Panel Grid

**Layout:** `grid grid-cols-2 gap-4` on desktop, `grid grid-cols-1 gap-3` on mobile.

**Six panels, one per BRI category.** Each panel is clickable and expands into the assessment flow for that category.

**Category Panel Component:**

```
┌─────────────────────────────────────┐
│ ● Financial Health           78/100 │
│                                     │
│ Confidence: ●●●○                    │
│ Costing you ~$380K                  │
│                                     │
│ 5 of 5 questions answered           │
│ Last updated: Oct 15, 2025          │
│                                     │
│ [Review Answers]   [Deepen →]       │
└─────────────────────────────────────┘
```

**Panel Fields:**

| Field | Source | Display Logic |
|---|---|---|
| Category icon | Static colored dot | Uses BRI_CATEGORY_COLORS per category |
| Category label | `BRI_CATEGORY_LABELS[category]` | "Financial Health", "Transferability", etc. |
| Score | Category sub-score from latest snapshot × 100 | Integer, 0-100 |
| Confidence dots | Calculated from questions answered vs. total available | See confidence calculation below |
| Dollar impact | From Valuation Bridge calculation (same as Mode 1) | "Costing you ~$380K" — omit for Personal (no valuation impact) |
| Questions progress | `{answered} of {total} questions answered` | Count from AssessmentResponse + ProjectAssessmentResponse |
| Last updated | Most recent response date in this category | "Last updated: Oct 15, 2025" or "Not yet assessed" |
| Primary CTA | Dynamic based on state | See CTA logic below |
| Secondary CTA | Dynamic | See CTA logic below |

**Confidence Dot Calculation:**

Confidence is based on the ratio of questions answered to total available questions in the category, weighted by how recent the answers are:

```typescript
function calculateConfidence(
  questionsAnswered: number,
  totalQuestions: number,
  daysSinceLastUpdate: number
): { dots: number; label: string } {
  // Base confidence from question coverage
  const coverage = totalQuestions > 0 ? questionsAnswered / totalQuestions : 0

  let baseDots: number
  if (coverage === 0) baseDots = 0
  else if (coverage < 0.4) baseDots = 1
  else if (coverage < 0.7) baseDots = 2
  else if (coverage < 1.0) baseDots = 3
  else baseDots = 4  // All questions answered

  // Decay: reduce by 1 dot if 90+ days since last update
  const decayPenalty = daysSinceLastUpdate > 90 ? 1 : 0
  const finalDots = Math.max(0, baseDots - decayPenalty)

  const labels = ['Not assessed', 'Limited', 'Partial', 'Good', 'Strong']
  return { dots: finalDots, label: labels[finalDots] }
}
```

**Confidence Dot Rendering:**
- Filled dot: `●` — `text-primary` (#B87333)
- Empty dot: `○` — `text-muted-foreground/30`
- 4 dots total, filled from left based on confidence level
- Tooltip on hover: "Confidence: [label]. Based on {X} of {Y} questions answered."

**CTA Logic Per Panel:**

| State | Primary CTA | Secondary CTA |
|---|---|---|
| No responses (0 questions) | "Start Assessment →" | — |
| Partial (< 100% questions) | "Continue →" | "Review Answers" |
| Complete (100% questions) | "Review Answers" | "Refresh" (if stale) |
| Stale (90+ days) | "Review & Refresh →" | — |
| High BRI, all questions | "Maintaining" (muted, no action needed) | "Review Answers" |

**Lowest Confidence Highlight:**

The category with the lowest confidence gets a highlight banner inside the panel:

```tsx
{isLowestConfidence && (
  <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
    <AlertTriangle className="h-3.5 w-3.5" />
    <span>Lowest confidence — improve this first</span>
  </div>
)}
```

**Personal Readiness Special Handling:**

Personal Readiness doesn't affect valuation (it's about the owner's readiness, not buyer pricing). The panel:
- Does NOT show "Costing you ~$X" — omit the dollar line entirely
- Shows score and confidence normally
- Shows: "Affects your exit timeline, not buyer pricing" in `text-xs text-muted-foreground`

### 3.4 Category Assessment Flow (Panel Expansion)

When a user clicks a category panel's CTA, they enter the **Category Assessment Flow**. This is a focused question-by-question experience for that specific category.

**Two implementation approaches (choose one):**

**Approach A: Inline Expansion (Recommended)**
The panel expands in place, pushing other panels down. Questions appear inside the expanded panel. The user never leaves the Diagnosis page. This feels faster and more integrated.

**Approach B: Slide-Over Panel**
A drawer slides in from the right (like a settings panel). Questions appear in the drawer. The category grid remains visible but dimmed. Closing the drawer returns to the grid.

**Recommending Approach A** because it keeps the user on a single page and reduces navigation anxiety. The assessment doesn't feel like a separate "thing" — it feels like deepening the diagnosis.

**Expanded Panel Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ ● Financial Health                                    78/100│
│ Confidence: ●●●○ · 5 of 5 answered · Costing you ~$380K   │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │  Question 3 of 5                                        │ │
│ │                                                         │ │
│ │  How diversified is your customer base?                 │ │
│ │                                                         │ │
│ │  ℹ️ Buyer logic: "Customer concentration above 15%       │ │
│ │  triggers buyer due diligence red flags."               │ │
│ │                                                         │ │
│ │  ○ Highly concentrated (>40% from top customer)         │ │
│ │  ○ Moderately concentrated (20-40%)                     │ │
│ │  ● Well diversified (10-20%)              ← current     │ │
│ │  ○ Highly diversified (<10%)                            │ │
│ │                                                         │ │
│ │  Confidence: [Confident ▼]     [Not Applicable]         │ │
│ │                                                         │ │
│ │  [← Previous]              [Next →]                     │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Collapse ↑]                                                │
└─────────────────────────────────────────────────────────────┘
```

**Question Display Fields:**

| Field | Source | Display |
|---|---|---|
| Progress | Question index / total in category | "Question 3 of 5" |
| Question text | `question.questionText` | `text-base font-medium text-foreground` |
| Buyer logic | `question.buyerLogic` | `text-sm text-muted-foreground italic` with info icon. Only show if `buyerLogic` is not null. |
| Help text | `question.helpText` | Expandable below buyer logic. "More context ▾" toggle. |
| Options | `question.options` sorted by `displayOrder` | Radio buttons, vertically stacked |
| Current answer indicator | If response exists for this question | "← current" badge next to selected option |
| Confidence selector | Dropdown or segmented control | Default: "Confident". Options: Confident, Uncertain, Not Applicable |
| Navigation | Previous / Next buttons | "← Previous" disabled on first question. "Next →" becomes "Save & Close" on last question. |

**Question Answering Behavior:**

1. User selects an option → response is saved immediately via API (auto-save, no explicit "save" button)
2. If user changes an answer (reassessing), the old response is updated with the new `selectedOptionId` and `effectiveOptionId`
3. After answering the last question in a category, show a brief inline completion state:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ✓ Financial Health assessment complete                 │
│                                                         │
│  Score: 78/100 (↑3 from previous)                      │
│  Confidence: ●●●● Strong                               │
│                                                         │
│  2 tasks generated from your responses                  │
│                                                         │
│  [View Tasks →]        [Close]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

4. BRI score and Valuation Bridge recalculate in real time after category completion
5. The category panel collapses back to its compact form with updated score and confidence

**API Calls During Assessment Flow:**

- **Load questions:** `GET /api/questions?category={category}` — returns questions with options for the specific category
- **Load existing responses:** `GET /api/assessments/{id}/responses?category={category}` — returns any existing responses
- **Save response (auto-save on selection):** `POST /api/assessments/{id}/responses` with `{ questionId, selectedOptionId, confidenceLevel }`
- **Complete category:** When all questions in category answered, trigger BRI recalculation. No separate "complete" API call needed — recalculation happens on the last response save if all questions in the category have responses.

**Unified Response Handling:**

The current system has two separate models: `AssessmentResponse` (initial) and `ProjectAssessmentResponse` (10-min). For Mode 2, we unify this:

- Continue using the `AssessmentResponse` model as the canonical response store
- When a user answers questions through Mode 2, responses go to `AssessmentResponse`
- The `ProjectAssessment` system remains for the drift-triggered "monthly check-in" use case (future) but is NOT the primary assessment path
- For users who have existing `ProjectAssessmentResponse` records, those responses are merged into the BRI calculation as they already are in `/api/assessments/[id]/complete/route.ts`

### 3.5 "What's Costing You The Most" Section

**This is new.** Nothing equivalent exists in the current codebase.

This section shows specific, named risk drivers — not just categories but the individual questions/issues that are costing the most money.

**Data Source:**

For each question where the user's score < 1.0, calculate the dollar impact:

```typescript
interface RiskDriver {
  id: string                    // question ID
  name: string                  // Short human-readable risk name
  category: BriCategory
  dollarImpact: number          // How much this specific risk costs
  currentScore: number          // 0-1, what user scored
  maxScore: number              // 1.0 (perfect)
  questionText: string          // Original question
  buyerLogic: string | null     // Why buyers care
  actionCta: ActionCta          // What to do about it
  hasLinkedTask: boolean        // Is there already a task for this?
  linkedTaskId: string | null   // Link to existing task
}

interface ActionCta {
  label: string                 // "Connect QuickBooks", "Start Succession Task →"
  type: 'task' | 'feature' | 'assessment'
  targetUrl: string             // Where CTA navigates
}
```

**Dollar Impact Per Question:**

```typescript
function calculateQuestionDollarImpact(
  question: Question,
  response: AssessmentResponse,
  categoryWeight: number,
  totalValueGap: number,
  categoryTotalPoints: number,
): number {
  const scoreValue = Number(response.selectedOption.scoreValue)
  const maxPoints = Number(question.maxImpactPoints)

  // Points lost = max points for this question × (1 - score achieved)
  const pointsLost = maxPoints * (1 - scoreValue)

  // Category dollar impact (from Valuation Bridge) distributed proportionally
  // across questions based on their contribution
  const categoryTotalPointsLost = getCategoryPointsLost(category) // sum of pointsLost in category
  if (categoryTotalPointsLost === 0) return 0

  const categoryDollarImpact = getCategoryDollarImpact(category) // from bridge calculation
  return (pointsLost / categoryTotalPointsLost) * categoryDollarImpact
}
```

**Risk Driver Naming:**

Each question needs a short "risk name" that's more readable than the full question text. These are static mappings:

| Question (abbreviated) | Risk Name |
|---|---|
| Revenue consistency | Revenue Volatility |
| Recurring revenue % | Low Recurring Revenue |
| Customer diversification | Customer Concentration |
| Financial record accuracy | Financial Opacity |
| Gross profit margin | Margin Pressure |
| Owner dependency | Owner Dependency |
| Management team strength | Weak Management Depth |
| Process documentation | Undocumented Processes |
| Customer relationship dependency | Relationship-Dependent Revenue |
| Business model scalability | Scalability Constraints |
| Technology infrastructure | Technology Risk |
| Employee retention | Retention Risk |
| Vendor/supplier agreements | Vendor Dependency |
| Market growth trajectory | Market Headwinds |
| Competitive position | Competitive Vulnerability |
| Proprietary IP/processes | Weak IP Position |
| Corporate structure cleanliness | Structural Complexity |
| Contract/license transferability | Transfer Risk (Contracts) |
| Litigation/regulatory issues | Legal Exposure |
| Exit timeline clarity | Unclear Exit Timeline |
| Personal/business asset separation | Commingled Assets |
| Key employee awareness | Transition Risk (People) |

This mapping should be stored in a constants file (`src/lib/constants/risk-driver-names.ts`) so it's maintainable and referenceable across the app.

**Action CTA Logic Per Risk Driver:**

Each risk driver maps to one of three CTA types:

1. **Task CTA** (most common): If a task exists for this question (via `task.linkedQuestionId`), link to it. Label: "Start: [task title short]"
2. **Feature CTA**: If the risk is fixable by connecting a feature (e.g., Financial Opacity → Connect QuickBooks). Label: "Connect QuickBooks"
3. **Assessment CTA**: If the risk requires deeper assessment (e.g., question was marked UNCERTAIN). Label: "Review & Update"

**Specific Feature CTAs (hardcoded mappings):**

| Risk Name | Feature CTA | Target |
|---|---|---|
| Financial Opacity | "Connect QuickBooks" or "Upload Financials" | `/dashboard/financials` |
| All others | Task CTA (if task exists) | `/dashboard/tasks/{taskId}` |

**Display:**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  WHAT'S COSTING YOU THE MOST                                │
│  Specific risks ranked by dollar impact                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 1  Financial Opacity                        -$180K    │  │
│  │    Financial Health · Score: 2 of 4                    │  │
│  │    "No buyer-grade financials connected"               │  │
│  │    [Connect QuickBooks]  [Upload Financials]           │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ 2  Owner Dependency                         -$165K    │  │
│  │    Transferability · Score: 1 of 4                     │  │
│  │    "Buyers discount businesses that can't run          │  │
│  │     without the owner"                                 │  │
│  │    [Start: Document succession plan →]                 │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ 3  Customer Concentration                   -$120K    │  │
│  │    Financial Health · Score: 2 of 4                    │  │
│  │    "Top customer represents >15% of revenue"           │  │
│  │    [Start: Document customer diversity →]              │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ 4  Undocumented Processes                    -$95K    │  │
│  │    Operations · Score: 1 of 4                          │  │
│  │    "Buyers see risk in businesses without documented,  │  │
│  │     repeatable processes"                              │  │
│  │    [Start: Create process documentation →]             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Showing top 5 of 12 risk drivers                            │
│  [Show all risk drivers ↓]                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Display Rules:**
- Show top 5 risk drivers by default (sorted by dollar impact, descending)
- "Show all" expands to reveal full list
- Each row shows: rank, risk name, dollar impact, category label, score expressed as "X of 4" (option position), buyer logic from `question.buyerLogic` or fallback, action CTA(s)
- Risks with perfect scores (1.0) are excluded
- Risks from NOT_APPLICABLE questions are excluded
- If no assessment responses exist, this section is hidden

**Free Tier Behavior:**
Risk drivers are fully visible (this is the conversion hook). Task CTAs open the upgrade modal. Feature CTAs (QuickBooks) also require Growth tier. The user sees exactly what's costing them money and can't fix it without upgrading.

### 3.6 Reassessment & Confidence Refresh

**Reassessment is not a separate action.** The user simply opens a category panel and answers questions. If they're re-answering questions they previously answered, the existing response is updated.

**System-Prompted Reassessment:**

The system prompts reassessment in two ways:

1. **Confidence decay (visual):** After 90 days without updates to a category, the confidence dots reduce by 1. The panel shows: "Last updated 4 months ago. Your situation may have changed." CTA: "Review & Refresh →"

2. **Drift-triggered (from Signal Architecture):** When a signal is confirmed that affects a category (e.g., "key employee departed" affects Transferability), the system highlights that category panel with an amber border and: "A change was detected that may affect this score. Review your Transferability answers." CTA: "Review →"

**What Happens When User Re-Answers:**
1. User selects a new option for a question → API updates the `AssessmentResponse` record via upsert
2. If the answer changed, set `effectiveOptionId = selectedOptionId`
3. After the user finishes reviewing (closes the panel), trigger BRI recalculation
4. Create a new `ValuationSnapshot` with `snapshotReason: 'reassessment_complete'`
5. If the BRI changed meaningfully (> 2 points), show a brief animation on the page header BRI score

**Reassessment tracking:**
- Store `response.updatedAt` to track when each answer was last touched
- The "Last updated" date per category is the MAX(`updatedAt`) of all responses in that category
- Confidence decay is calculated from this date, not from assessment creation date

### 3.7 API Changes

**New Endpoint: `GET /api/companies/[id]/diagnosis`**

This is the primary data endpoint for the Mode 2 screen. It consolidates data from multiple existing endpoints into one response.

```typescript
interface DiagnosisResponse {
  briScore: number                    // 0-100
  briScoreDecimal: number             // 0-1 (for calculations)
  isEstimated: boolean                // True if no assessment, scores from Quick Scan

  categories: Array<{
    category: BriCategory
    label: string                     // "Financial Health"
    score: number                     // 0-100
    scoreDecimal: number              // 0-1
    dollarImpact: number | null       // null for PERSONAL (no valuation impact)
    weight: number                    // BRI weight (0-1)

    confidence: {
      dots: number                    // 0-4
      label: string                   // "Not assessed", "Limited", "Partial", "Good", "Strong"
      questionsAnswered: number
      questionsTotal: number
      lastUpdated: string | null      // ISO date of most recent response
      daysSinceUpdate: number | null
      isStale: boolean                // > 90 days
    }

    isLowestConfidence: boolean       // Highlight this category
  }>

  riskDrivers: Array<{
    id: string                        // Question ID
    name: string                      // Short risk name from mapping
    category: BriCategory
    categoryLabel: string
    dollarImpact: number
    currentScore: number              // 0-1
    optionPosition: number            // 1-4 (which option selected, 1=worst)
    totalOptions: number              // Usually 4
    questionText: string
    buyerLogic: string | null
    hasLinkedTask: boolean
    linkedTaskId: string | null
    linkedTaskTitle: string | null
    linkedTaskStatus: string | null   // PENDING, IN_PROGRESS, COMPLETED
  }>

  assessmentId: string | null         // Current assessment ID
  hasAssessment: boolean
  lastAssessmentDate: string | null

  // For category expansion
  questionCounts: Record<BriCategory, {
    total: number
    answered: number
    unanswered: number
  }>
}
```

**Existing Endpoint Modification: `GET /api/questions`**

Add optional `category` query parameter:
- `GET /api/questions?category=FINANCIAL` — returns only Financial questions with options
- `GET /api/questions` — returns all questions (existing behavior)

**Existing Endpoint: `POST /api/assessments/[id]/responses`**

No changes needed — this already handles individual response upserts. Ensure it:
1. Upserts on `(assessmentId, questionId)` unique constraint
2. Returns the updated response
3. Triggers no side effects (BRI recalculation is triggered separately)

**New Endpoint: `POST /api/companies/[id]/recalculate-bri`**

Trigger endpoint called when a user closes a category panel after making changes:

```typescript
// Request: empty body (companyId from URL)
// Response:
{
  briScore: number            // 0-100 (new)
  previousBriScore: number    // 0-100 (before recalculation)
  briDelta: number            // Change
  snapshotId: string          // New snapshot created
  categoryScores: Record<BriCategory, number>  // 0-100 per category
}
```

This endpoint:
1. Gathers all responses (Assessment + ProjectAssessment) for the company
2. Recalculates BRI using existing formula from `assessments/[id]/complete/route.ts`
3. Creates a new `ValuationSnapshot`
4. Returns the delta for UI animation

### 3.8 Data Model Changes

**Add to Question model:**

```prisma
model Question {
  // ... existing fields ...
  riskDriverName    String?   @map("risk_driver_name")  // Short name: "Financial Opacity"
}
```

Migration: `ALTER TABLE questions ADD COLUMN risk_driver_name TEXT;`

Backfill: Run a migration script that populates `riskDriverName` from the static mapping table in section 3.5. This is better than a constants file because it allows admin editing later.

**No other model changes required.** The confidence calculation is derived from response timestamps and question counts. The dollar impact is calculated server-side from existing snapshot data.

### 3.9 Permissions & Tier Gating

| Element | Foundation (Free) | Growth | Exit-Ready |
|---|---|---|---|
| BRI score and category breakdown | Full | Full | Full |
| Category panels with confidence | Full | Full | Full |
| Assessment questions (answering) | Full | Full | Full |
| Dollar impact per category | Full | Full | Full |
| Risk drivers list | Full (visible) | Full | Full |
| Risk driver task CTAs | Opens upgrade modal | Navigates to task | Navigates to task |
| Feature CTAs (QuickBooks) | Opens upgrade modal | Full | Full |
| Confidence refresh prompts | Visible | Full | Full |

Assessment is **fully open on free tier.** This is the activation mechanism. The paywall is on acting, not on diagnosing.

---

## 4. DESIGN SPECIFICATIONS

### 4.1 Page Layout

```
┌─ Sidebar (240px) ─┐┌─── Main Content (flex-1, max-w-5xl) ──────────┐
│                    ││                                                 │
│  [Value]           ││  Page Header (BRI score + title)                │
│  [Diagnosis]←active││                                                 │
│  [Actions]         ││  Category Grid (2×3 on desktop, 1×6 mobile)    │
│  [Evidence]        ││                                                 │
│  [Deal Room]       ││  What's Costing You The Most (ranked list)     │
│                    ││                                                 │
└────────────────────┘└─────────────────────────────────────────────────┘
```

**Page padding:** `px-6 py-8` desktop, `px-4 py-6` mobile.
**Section spacing:** `space-y-8` between header, grid, and risk drivers.

### 4.2 Page Header

**Container:** `flex items-start justify-between`

**Left side:**
- Title: `text-2xl font-bold text-foreground` — "YOUR BUYER READINESS"
- Sub: `text-sm text-muted-foreground mt-1` — "How buyers evaluate your business"

**Right side:**
- BRI score: `text-5xl font-bold text-primary` — animated count-up
- Below score: `text-sm text-muted-foreground text-right` — "BRI Score"
- If estimated: `<Badge variant="secondary" className="mt-1">Estimated</Badge>`

### 4.3 Category Panel

**Container:** `bg-card border border-border rounded-xl p-5 cursor-pointer transition-all`
**Hover:** `hover:border-primary/20 hover:shadow-sm`
**Active (expanded):** `border-primary/30 shadow-md`

**Layout (collapsed):**

```
Row 1: [Dot] Category Label                Score/100
Row 2: Confidence: ●●●○
Row 3: Costing you ~$380K
Row 4: 5 of 5 questions answered
Row 5: Last updated: Oct 15, 2025
Row 6: [CTA buttons]
```

**Score display:**
- Score >= 80: `text-emerald-600` (strong)
- Score 60-79: `text-primary` (moderate — burnt orange)
- Score 40-59: `text-amber-600` (needs work)
- Score < 40: `text-destructive` (critical)

**Category dot:**
- 10px circle with BRI category color
- Same colors as Valuation Bridge:
  - FINANCIAL: `bg-blue-500`
  - TRANSFERABILITY: `bg-green-500`
  - OPERATIONAL: `bg-yellow-500`
  - MARKET: `bg-purple-500`
  - LEGAL_TAX: `bg-red-500`
  - PERSONAL: `bg-orange-500`

**Dollar impact line:**
- `text-sm font-medium` — "Costing you ~$380K"
- Color matches score color coding (emerald for low cost, red for high cost)
- Omit entirely for PERSONAL category

**Questions progress:**
- `text-xs text-muted-foreground` — "5 of 5 questions answered"

**Last updated:**
- `text-xs text-muted-foreground` — "Last updated: Oct 15, 2025"
- If stale (90+ days): `text-xs text-amber-600` — "Last updated: Jun 3, 2025 — may need refresh"
- If never: `text-xs text-muted-foreground` — "Not yet assessed"

**CTAs:**
- Primary: `<Button size="sm">` — text varies by state (see 3.3 CTA Logic)
- Secondary: `<Button variant="ghost" size="sm">` — "Review Answers" when applicable
- Lowest confidence panel: amber-bordered `<Button size="sm" variant="outline" className="border-amber-300">` — draws attention

### 4.4 Expanded Category Panel (Assessment Flow)

When expanded, the panel grows to full width of the grid (spans 2 columns on desktop).

**Animation:**
```tsx
<AnimatePresence>
  {isExpanded && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Question flow content */}
    </motion.div>
  )}
</AnimatePresence>
```

**Question card inside expanded panel:**
- Question number: `text-xs text-muted-foreground` — "Question 3 of 5"
- Question text: `text-base font-medium text-foreground mt-2`
- Buyer logic (if exists): `text-sm text-muted-foreground italic mt-2` with `Info` icon
- Help text: Collapsible, triggered by "More context ▾" link

**Options:**
- Radio button group, vertical stack
- Each option: `flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer`
- Selected: `border-primary bg-primary/5`
- Hover: `hover:border-primary/30 hover:bg-muted/50`
- Current answer marker: `<Badge variant="secondary" className="ml-2 text-xs">current</Badge>`

**Confidence selector:**
- Segmented control or dropdown below options
- Options: "Confident" (default), "Uncertain", "Not Applicable"
- `text-sm text-muted-foreground`

**Navigation:**
- `flex justify-between mt-4`
- Left: `<Button variant="ghost" size="sm">← Previous</Button>` — disabled on first question
- Right: `<Button size="sm">Next →</Button>` — changes to "Save & Close" on last question
- Auto-save: response saved on option selection (before Next/Previous click)

**Category Completion Mini-Screen:**
After answering the last question:
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  className="text-center py-6"
>
  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
  <p className="text-base font-semibold mt-3">
    {categoryLabel} assessment complete
  </p>
  <p className="text-sm text-muted-foreground mt-1">
    Score: {score}/100 {delta !== 0 && `(${delta > 0 ? '↑' : '↓'}${Math.abs(delta)} from previous)`}
  </p>
  <p className="text-sm text-muted-foreground mt-1">
    Confidence: {confidenceLabel}
  </p>
  {tasksGenerated > 0 && (
    <p className="text-sm text-primary mt-2">
      {tasksGenerated} task{tasksGenerated > 1 ? 's' : ''} generated from your responses
    </p>
  )}
  <div className="flex justify-center gap-3 mt-4">
    <Button variant="ghost" size="sm" onClick={collapse}>Close</Button>
    {tasksGenerated > 0 && (
      <Button size="sm" onClick={goToActions}>View Tasks →</Button>
    )}
  </div>
</motion.div>
```

### 4.5 Risk Drivers Section

**Section header:**
- Title: `text-lg font-semibold text-foreground` — "WHAT'S COSTING YOU THE MOST"
- Sub: `text-sm text-muted-foreground` — "Specific risks ranked by dollar impact"

**Container:** `bg-card border border-border rounded-xl` — single card containing all drivers

**Each risk driver row:**
```
┌──────────────────────────────────────────────────────────┐
│  1    Financial Opacity                         -$180K   │
│       Financial Health · Score: 2 of 4                   │
│       "No buyer-grade financials connected"              │
│       [Connect QuickBooks]  [Upload Financials]          │
└──────────────────────────────────────────────────────────┘
```

- Rank: `text-lg font-bold text-muted-foreground/50 w-8` — left-aligned number
- Risk name: `text-base font-semibold text-foreground`
- Dollar impact: `text-base font-bold text-destructive` — right-aligned
- Category + score: `text-xs text-muted-foreground mt-0.5` — "Financial Health · Score: 2 of 4"
- Buyer logic: `text-sm text-muted-foreground italic mt-1` — in quotes
- CTAs: `flex gap-2 mt-2`
  - Primary CTA: `<Button size="sm">` — action specific to risk
  - Secondary CTA: `<Button variant="outline" size="sm">` — alternative action if applicable

**Dividers:** `<Separator />` between each row. No divider after last row.

**Show more:**
- After 5 rows: `<Button variant="ghost" className="w-full mt-3">Show all {total} risk drivers ↓</Button>`
- Expanded: shows full list, button changes to "Show less ↑"

**Empty state (no assessment):**
```tsx
<div className="text-center py-8">
  <p className="text-sm text-muted-foreground">
    Complete your first category assessment to see specific risk drivers.
  </p>
  <Button className="mt-3" onClick={scrollToGrid}>
    Start Assessment →
  </Button>
</div>
```

### 4.6 Animation Specifications

**Page Load:**
```tsx
<AnimatedStagger staggerDelay={0.1}>
  <AnimatedItem><PageHeader /></AnimatedItem>
  <AnimatedItem><CategoryGrid /></AnimatedItem>
  <AnimatedItem><RiskDrivers /></AnimatedItem>
</AnimatedStagger>
```

**BRI Score Update:**
When BRI changes after category completion, animate the header score:
```tsx
<motion.span
  key={briScore} // Re-renders on change
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
  {briScore}
</motion.span>
```

**Category Panel Expansion:**
Panel expands with height animation (see 4.4). Other panels in the grid reflow naturally via CSS grid.

**Auto-Save Indicator:**
On response save, show a brief "Saved ✓" indicator near the question:
```tsx
<AnimatePresence>
  {justSaved && (
    <motion.span
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="text-xs text-emerald-600 ml-2"
    >
      Saved ✓
    </motion.span>
  )}
</AnimatePresence>
```

### 4.7 Loading & Error States

**Loading:**
```tsx
// Header skeleton
<div className="flex justify-between items-start">
  <div>
    <Skeleton className="h-7 w-[240px]" />
    <Skeleton className="h-4 w-[200px] mt-2" />
  </div>
  <Skeleton className="h-14 w-[80px]" />
</div>

// Category grid skeletons
<div className="grid grid-cols-2 gap-4">
  {[1,2,3,4,5,6].map(i => (
    <Skeleton className="h-[180px] rounded-xl" key={i} />
  ))}
</div>

// Risk drivers skeleton
<Skeleton className="h-[300px] rounded-xl" />
```

**Error:** Same pattern as Mode 1 — centered error card with retry button.

**Partial error (questions fail to load for one category):**
Show error inline in the expanded panel: "Unable to load questions for this category. Please try again." with retry button. Other categories remain functional.

---

## 5. ENGAGEMENT & CONVERSION HOOKS

### 5.1 Assessment as Activation

The assessment is the primary activation mechanism. Every user who completes at least one category:
- Gets a personalized BRI score (not estimated)
- Sees dollar costs per category
- Sees specific risk drivers
- Gets tasks generated

This creates the emotional weight that drives conversion. "I know I'm leaving $380K on the table because of Financial Opacity" is infinitely more motivating than "Your BRI is 62."

### 5.2 Confidence as Engagement Loop

Low-confidence categories create a natural pull to return and deepen. The system never says "take another assessment." It says "Your Legal confidence is limited (1 of 3 questions). Answer 2 more questions to improve accuracy." This is a perpetual engagement mechanism.

### 5.3 Conversion Moments

1. **Risk driver task CTA (free tier):** User reads "Owner Dependency is costing you $165K" and clicks "Start: Document succession plan" → upgrade modal. Copy: "Start fixing the $165K Owner Dependency gap with your personalized action plan."
2. **Feature CTA (free tier):** User clicks "Connect QuickBooks" → upgrade modal. Copy: "Connect your financials for a buyer-grade valuation."
3. **Post-category-completion:** After completing a category, the mini-screen shows generated tasks with a "View Tasks →" button → upgrade modal for free users.

### 5.4 Analytics Events

| Event | Trigger | Properties |
|---|---|---|
| `diagnosis_viewed` | Page load | `briScore`, `hasAssessment`, `categoriesAssessed` |
| `category_panel_clicked` | Click on category panel | `category`, `score`, `confidence`, `action` (start/continue/review) |
| `category_expanded` | Panel expands to show questions | `category`, `questionsTotal`, `questionsAnswered` |
| `question_answered` | User selects an option | `questionId`, `category`, `selectedScore`, `confidenceLevel`, `isReassessment` |
| `question_confidence_changed` | User changes confidence level | `questionId`, `newConfidence`, `previousConfidence` |
| `category_completed` | All questions in category answered | `category`, `score`, `scoreChange`, `tasksGenerated` |
| `risk_driver_viewed` | Risk driver section enters viewport | `topRiskName`, `topDollarImpact` |
| `risk_driver_cta_clicked` | Click CTA on a risk driver | `riskName`, `category`, `dollarImpact`, `ctaType` |
| `show_all_risks_clicked` | Expand full risk driver list | `totalRisks` |
| `upgrade_prompted_diagnosis` | Upgrade modal opened from this page | `trigger` (risk_cta/feature_cta/task_cta) |

---

## 6. TECHNICAL GUIDANCE

### 6.1 Component Architecture

```
src/
  components/diagnosis/                # NEW directory
    DiagnosisPage.tsx                  # Client orchestrator
    DiagnosisHeader.tsx                # BRI score + title
    CategoryGrid.tsx                   # 2×3 grid container
    CategoryPanel.tsx                  # Individual category panel (collapsed + expanded)
    CategoryAssessmentFlow.tsx         # Question-by-question flow inside expanded panel
    QuestionDisplay.tsx                # Single question with options and confidence
    CategoryCompletionCard.tsx         # Mini celebration after category complete
    RiskDriversSection.tsx             # "What's Costing You The Most" full section
    RiskDriverRow.tsx                  # Individual risk driver row
    ConfidenceDots.tsx                 # Reusable confidence dot indicator
    DiagnosisLoading.tsx               # Full page skeleton
    DiagnosisError.tsx                 # Error state

  app/(dashboard)/dashboard/
    diagnosis/
      page.tsx                         # NEW route - server component
```

**Routing:** The new page lives at `/dashboard/diagnosis`. The existing `/dashboard/assessment/*` routes remain functional for backward compatibility but are not linked from the nav. Redirect `/dashboard/assessment` to `/dashboard/diagnosis` after validation.

### 6.2 Data Fetching

```tsx
// DiagnosisPage.tsx
const { selectedCompanyId } = useCompany()

// Primary data load
const { data: diagnosis, isLoading, refetch } = useQuery({
  queryKey: ['diagnosis', selectedCompanyId],
  queryFn: () => fetch(`/api/companies/${selectedCompanyId}/diagnosis`).then(r => r.json()),
  enabled: !!selectedCompanyId,
  staleTime: 30_000,
})

// Questions loaded on-demand when category expands
const loadCategoryQuestions = (category: BriCategory) => {
  return fetch(`/api/questions?category=${category}`).then(r => r.json())
}

// Responses loaded when category expands
const loadCategoryResponses = (assessmentId: string, category: BriCategory) => {
  return fetch(`/api/assessments/${assessmentId}/responses?category=${category}`).then(r => r.json())
}
```

Questions and responses are loaded **lazily** when the user expands a category panel. This keeps the initial page load fast (diagnosis endpoint returns scores and risk drivers, not full question sets).

### 6.3 Auto-Save Implementation

```tsx
// Inside CategoryAssessmentFlow.tsx
const saveResponse = useMutation({
  mutationFn: (response: { questionId: string; selectedOptionId: string; confidenceLevel: string }) =>
    fetch(`/api/assessments/${assessmentId}/responses`, {
      method: 'POST',
      body: JSON.stringify(response),
    }),
  onSuccess: () => {
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1500)
  },
})

// Triggered on option selection
const handleOptionSelect = (optionId: string) => {
  setSelectedOption(optionId)
  saveResponse.mutate({
    questionId: currentQuestion.id,
    selectedOptionId: optionId,
    confidenceLevel: currentConfidence,
  })
}
```

### 6.4 BRI Recalculation on Panel Close

When the user collapses a category panel (after making changes), trigger BRI recalculation:

```tsx
const handlePanelClose = async () => {
  if (hasChanges) {
    const result = await fetch(`/api/companies/${companyId}/recalculate-bri`, { method: 'POST' })
    const data = await result.json()

    // Update local state with new scores
    // Animate BRI change in header
    // Refresh risk drivers

    await refetchDiagnosis()
  }
  setExpandedCategory(null)
}
```

### 6.5 Performance Requirements

- **Initial page load:** < 1.5s (diagnosis endpoint returns pre-calculated scores and risk drivers)
- **Category expansion:** < 500ms (lazy-load questions + responses)
- **Auto-save response:** < 300ms (single upsert operation)
- **BRI recalculation:** < 1s (on panel close, creates snapshot)
- **Risk driver section:** Renders immediately from diagnosis endpoint (no additional fetch)

### 6.6 Testing Requirements

**Unit Tests (Vitest):**
- `calculateConfidence()` — verify dot calculation for all coverage ranges, verify decay logic
- `calculateQuestionDollarImpact()` — verify proportional distribution, verify N/A handling
- Risk driver sorting — verify descending dollar impact order
- CTA logic — verify correct CTA for each panel state

**Component Tests (Testing Library):**
- `CategoryPanel` — renders all states (empty, partial, complete, stale), correct CTA displayed
- `CategoryAssessmentFlow` — renders questions, handles option selection, shows auto-save indicator
- `RiskDriversSection` — renders top 5, handles show-all toggle, shows empty state
- `ConfidenceDots` — renders correct filled/empty dots for all levels
- `DiagnosisHeader` — renders BRI with animation, shows estimated badge

**E2E Tests (Playwright):**
- Load Diagnosis as new user → see estimated BRI, click "Start Assessment" on a category → questions appear
- Answer all questions in a category → see completion card, BRI updates
- Load as assessed user → see real scores, click risk driver CTA → navigate to task (or upgrade modal for free)
- Verify auto-save: answer question, refresh page → answer persisted

---

## 7. LAUNCH & ITERATION PLAN

### 7.1 MVP Scope (Sprint 1 — Ship This)

**Build:**
- [ ] `DiagnosisPage.tsx` orchestrator with data fetching
- [ ] `DiagnosisHeader.tsx` with BRI score and estimated badge
- [ ] `CategoryGrid.tsx` with 6 `CategoryPanel.tsx` components
- [ ] `CategoryPanel.tsx` collapsed state with score, confidence dots, dollar impact, CTAs
- [ ] `ConfidenceDots.tsx` reusable component
- [ ] `RiskDriversSection.tsx` with top 5 drivers, show-all toggle, empty state
- [ ] `RiskDriverRow.tsx` with risk name, dollar impact, buyer logic, CTA
- [ ] New API endpoint: `GET /api/companies/[id]/diagnosis`
- [ ] Add `riskDriverName` to Question model + migration + backfill
- [ ] Risk driver dollar impact calculation in diagnosis endpoint
- [ ] Confidence calculation from response counts and timestamps
- [ ] Free tier gating on task/feature CTAs
- [ ] Analytics events
- [ ] Nav update: "Diagnosis" replaces "Buyer View" in sidebar

**Skip for MVP:**
- Category assessment flow (inline expansion) — users click through to existing assessment wizard for now
- Auto-save (use existing save patterns from AssessmentWizard)
- BRI recalculation on panel close (use existing "complete assessment" flow)
- Confidence decay (visual only, implement in Sprint 2)
- Drift-triggered reassessment prompts (requires Signal Architecture)

### 7.2 Sprint 2 — Inline Assessment Flow

- [ ] `CategoryAssessmentFlow.tsx` — inline question-by-question experience
- [ ] `QuestionDisplay.tsx` with options, buyer logic, confidence selector
- [ ] Auto-save on option selection
- [ ] `CategoryCompletionCard.tsx` with score delta and tasks generated
- [ ] BRI recalculation endpoint: `POST /api/companies/[id]/recalculate-bri`
- [ ] BRI animation on header after recalculation
- [ ] Confidence decay display (90+ day penalty)
- [ ] Category-filtered question loading: `GET /api/questions?category=X`

### 7.3 Sprint 3 — Intelligence & Polish

- [ ] Drift-triggered reassessment prompts (amber border on affected categories)
- [ ] Question prioritization within categories (show highest-impact unanswered first)
- [ ] Risk driver CTA deep-linking to specific tasks
- [ ] Mobile-optimized assessment flow (single-column, larger touch targets)
- [ ] Redirect `/dashboard/assessment` → `/dashboard/diagnosis`
- [ ] Deprecate old assessment entry points (remove from nav, keep routes for bookmarks)

### 7.4 Success Metrics

| Metric | Current Baseline | Sprint 1 Target | Sprint 3 Target |
|---|---|---|---|
| Assessment start rate (% of onboarded users who start at least 1 category) | ~40% (estimated) | 55% | 70% |
| Assessment completion rate (% who complete all 6 categories) | ~25% (estimated) | 35% | 50% |
| Time to complete first category | Unknown | < 5 minutes | < 4 minutes |
| Risk driver CTA click rate | N/A (new) | 20% | 35% |
| Free → Growth conversion from Diagnosis page | Unknown | 4% | 8% |
| Reassessment rate (users who return to update within 90 days) | ~10% (estimated) | 20% | 35% |

### 7.5 What We'll Learn From v1

1. **Which categories do users start with?** If most start with Financial (because it has the highest dollar impact), that validates the bridge-to-diagnosis connection. If they start randomly, the "lowest confidence" highlight may need to be stronger.
2. **Where do users abandon?** If users start a category and don't finish, the questions may be too difficult or the options unclear. Track abandonment per question.
3. **Do risk drivers drive action?** If CTA click rates on risk drivers are high but conversion is low, the upgrade modal copy may need work. If click rates are low, the risk drivers may not feel actionable enough.
4. **Does confidence drive reassessment?** If users with low-confidence categories return to deepen, the mechanic works. If they don't, confidence dots may not be visible or meaningful enough.

---

## APPENDIX A: Complete Copy/Microcopy Reference

| Location | Copy |
|---|---|
| Page title (browser tab) | "Diagnosis — Exit OSx" |
| Page header title | "YOUR BUYER READINESS" |
| Page header sub | "How buyers evaluate your business" |
| BRI sub-label | "BRI Score" |
| Estimated badge | "Estimated" |
| Estimated sub-text | "Complete your first category to get a personalized score." |
| Confidence: 0 dots | "Not assessed" |
| Confidence: 1 dot | "Limited" |
| Confidence: 2 dots | "Partial" |
| Confidence: 3 dots | "Good" |
| Confidence: 4 dots | "Strong" |
| Dollar impact line | "Costing you ~$[X]" |
| Personal category note | "Affects your exit timeline, not buyer pricing" |
| Questions progress | "[X] of [Y] questions answered" |
| Last updated | "Last updated: [date]" |
| Stale warning | "Last updated: [date] — may need refresh" |
| Never assessed | "Not yet assessed" |
| Lowest confidence badge | "Lowest confidence — improve this first" |
| CTA: start | "Start Assessment →" |
| CTA: continue | "Continue →" |
| CTA: review | "Review Answers" |
| CTA: refresh | "Review & Refresh →" |
| CTA: maintaining | "Maintaining" |
| Completion: title | "[Category] assessment complete" |
| Completion: score | "Score: [X]/100 (↑[Y] from previous)" |
| Completion: tasks | "[N] task(s) generated from your responses" |
| Risk section title | "WHAT'S COSTING YOU THE MOST" |
| Risk section sub | "Specific risks ranked by dollar impact" |
| Risk section empty | "Complete your first category assessment to see specific risk drivers." |
| Show more button | "Show all [N] risk drivers ↓" |
| Show less button | "Show less ↑" |
| Auto-save indicator | "Saved ✓" |
| Question buyer logic prefix | (info icon, italic text) |
| Help text toggle | "More context ▾" / "Less ▴" |
| Confidence selector: confident | "Confident" |
| Confidence selector: uncertain | "Uncertain" |
| Confidence selector: na | "Not Applicable" |
| Last question button | "Save & Close" |
| Error: questions load | "Unable to load questions for this category. Please try again." |

## APPENDIX B: File Reference (Existing Code to Understand)

| File | Why It Matters |
|---|---|
| `src/components/assessment/AssessmentWizard.tsx` | Current assessment UI — understand question display, response saving, celebration flow |
| `src/components/assessment/QuestionCard.tsx` | Current question display — understand option rendering |
| `src/components/assessment/AssessmentResults.tsx` | Current results display — understand score presentation |
| `src/components/dashboard/RiskBreakdown.tsx` | Current BRI category display — being replaced |
| `src/components/dashboard/ActionCenter.tsx` | Current assessment status/CTA — being replaced |
| `src/app/api/assessments/[id]/complete/route.ts` | BRI calculation algorithm — reuse for recalculation endpoint |
| `src/app/api/assessments/[id]/responses/route.ts` | Response upsert — reuse for auto-save |
| `src/app/api/questions/route.ts` | Question fetching — add category filter |
| `src/lib/constants/bri-categories.ts` | BRI category labels and colors — reuse |
| `src/lib/project-assessments/prioritization-engine.ts` | Question prioritization — reuse for within-category ordering |
| `src/lib/playbook/generate-tasks.ts` | Task generation from responses — triggered on category completion |
| `src/app/api/companies/[id]/reassess/route.ts` | Reassessment logic — understand response update flow |
| `prisma/seed-data/bri-questions.ts` | Question definitions — reference for risk driver name mapping |
| `src/app/(dashboard)/dashboard/assessment/risk/page.tsx` | Project assessment flow — understand 10-min assessment pattern |
