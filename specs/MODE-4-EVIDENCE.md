# SPEC: Mode 4 — EVIDENCE (The Proof Engine)

**Status:** Ready for Development
**Priority:** P1 — This is the retention anchor. The progress bar ("47% buyer-ready") is the number users track obsessively. It only goes up when they use the platform, and getting from 47% to 80% takes months of subscription payments. That's not manipulation — it's genuine value delivery measured visibly.
**Business Metric:** Retention (evidence score as ongoing engagement metric), Revenue (evidence progress → perceived ROI → churn prevention), Activation (evidence score as free-tier upgrade motivator)
**Replaces:** Current `/dashboard/data-room/page.tsx` (full VDR experience) during the building phase. The full VDR with access control, watermarking, Q&A, and analytics moves to Mode 5 (Deal Room).

---

## 1. STRATEGIC CONTEXT

### Why This Exists

The Evidence screen answers: **"What have I proven to a buyer and what's still missing?"**

The current system has a full-featured Virtual Data Room with 14 folder categories, hierarchical subfolder navigation, stage-gated access (PREPARATION → DUE_DILIGENCE), version history, document analytics, watermarked downloads, Q&A between buyers and sellers, and external access grants. It's a complete VDR — and it's completely wrong for a founder who is 3 months into preparing their business for exit.

A founder in build mode doesn't need a VDR. They need a **scorecard**. "What evidence do I have? What's missing? What matters most to a buyer?" The current data room has 14 categories with 60+ subfolder positions. A founder looks at that and thinks "I'll come back to this later." Later never comes. The data room sits empty while the user works through tasks in Mode 3, uploading proof documents ad hoc — but never connecting those documents to the bigger picture of buyer readiness.

Mode 4 flips the experience. Instead of a file manager organized by document type, it's an **evidence tracker organized by buyer impact**. Six categories (matching BRI), not fourteen. Each category shows: how many documents exist, what's missing, and why a buyer cares. Documents auto-populate from task completions (Mode 3) and financial integrations. The progress bar — "47% buyer-ready" — is the single most important retention metric in the product.

When the user reaches 70%+ evidence and activates Mode 5 (Deal Room), the full VDR features appear: access control, watermarking, Q&A, analytics, stage gating. Evidence mode is the builder. Deal Room is the distributor.

### What Business Metric This Moves

- **Retention:** The evidence score is the stickiest metric in the product. Users who see "47% buyer-ready" don't cancel — they want to get to 70%. Every document uploaded is a sunk cost that makes leaving feel expensive. That's Hormozi's value equation: high perceived value + high perceived likelihood of success = low churn.
- **Engagement:** Documents auto-populate from task completions, creating a passive accumulation effect. Users come back and see their score improved without explicitly "working on evidence." That surprise progress drives return visits.
- **Conversion:** Free tier users can see their evidence score and gaps but can't upload. Showing "You're 12% buyer-ready — you need Financial Statements, Tax Returns, and Customer Contracts" with buyer explanations creates upgrade pressure.
- **Mode 5 Activation:** Evidence score directly gates Deal Room access (70%+ required). This creates a natural progression that prevents users from trying to run a sale process before they're ready.

### Current State vs. Desired State

| | Current | Desired |
|---|---|---|
| Organization | 14 categories with 60+ subfolders (file manager) | 6 BRI-aligned categories with buyer impact ranking (scorecard) |
| Entry experience | Empty folder tree — "what goes where?" | Progress bar + gap list — "what's missing and why does it matter?" |
| Document source | Manual upload only | Auto-populated from task completions + manual upload |
| Missing items | No indication of what's missing | Each missing document has buyer psychology explanation + upload CTA |
| Progress tracking | Readiness percentage buried in data room | Evidence score ("47% buyer-ready") is hero metric, visible across modes |
| Buyer context | None — just file names | Every category and document has buyer-perspective explanation |
| VDR features | All visible (access control, Q&A, analytics, watermarking) | Hidden until Mode 5 activation — Mode 4 is build-only |
| Task connection | `TASK_PROOF` category exists but feels disconnected | Task evidence auto-appears in correct BRI category, linked to task |

---

## 2. USER STORIES & SCENARIOS

### Primary User Stories

**US-1: First-time user (no evidence yet)**
> As a business owner who just started, I want to see what documents a buyer would expect to find and why each matters, so that I understand what I need to collect and feel motivated to start uploading.

**US-2: Task completion user (evidence auto-populated)**
> As a business owner who just completed a task in Mode 3 and uploaded proof, I want to see that document automatically appear in the correct evidence category with my score updated, so that I feel my task work directly builds buyer readiness.

**US-3: Partial evidence user (some categories strong, others empty)**
> As a business owner with strong Financial evidence but no Legal or HR documents, I want to see exactly which categories are weak, what specific documents are missing, and what a buyer would think about those gaps, so that I know where to focus.

**US-4: High-evidence user (approaching 70%)**
> As a business owner at 68% buyer-ready, I want to see exactly what documents will push me past 70% and unlock the Deal Room, so that I'm motivated to close the remaining gaps.

**US-5: Returning user (documents aging)**
> As a business owner returning after 3 months, I want to see which of my documents are stale (financial statements from 2 years ago, expired insurance certificates), so that I can update them and maintain my evidence score.

**US-6: Free tier user**
> As a free tier user, I want to see my evidence score and what's missing, but I hit the upgrade wall when I try to upload documents or view buyer explanations in full. The score shows me the gap; the upgrade unlocks the ability to close it.

### State Transitions

| State | Condition | What's Different |
|---|---|---|
| **Empty** | No documents uploaded, no task proof linked | All 6 categories show "0 documents" with full "what buyers expect" list. Hero: "0% buyer-ready — here's what buyers look for." |
| **Starting** | 1-5 documents across 1-2 categories | Categories with documents show progress. Missing categories highlight "Critical gap" or "Important gap." Hero: "12% buyer-ready." |
| **Building** | 6-15 documents across 3+ categories | Meaningful progress visible. "Recently Added" section shows momentum. Missing items prioritized by buyer impact. |
| **Strong** | 16+ documents, 60%+ score | Most categories partially filled. Focus shifts to gaps and staleness. "Missing" section shows remaining high-impact items. |
| **Near-Ready** | 65-69% score | Deal Room teaser appears: "You're 3 documents away from unlocking your Deal Room." Urgency framing. |
| **Ready** | 70%+ score | Deal Room activation CTA. Evidence mode shifts to maintenance: "Keep these current." Staleness monitoring prominent. |

### Edge Cases

**E-1: Task proof uploaded but category unclear**
When a task's `briCategory` is `PERSONAL`, map to the closest evidence category. Personal readiness tasks rarely produce documents — if they do, place in "Operations" or "Other" with a note. If `briCategory` maps cleanly (FINANCIAL → Financial, LEGAL_TAX → Legal, etc.), use that mapping directly.

**E-2: Document uploaded directly (not from task)**
User uploads a document directly to a category. No task linkage. Document appears in the category immediately. Score updates. "Source: Direct upload" in metadata (vs. "Source: Task — Document org structure").

**E-3: Document becomes stale**
Documents with `updateFrequency` of MONTHLY, QUARTERLY, or ANNUALLY and `nextUpdateDue` in the past show a "Needs Update" indicator. Score does NOT decrease for stale documents (that would feel punitive), but the UI surfaces them prominently with: "Your [document] was last updated [date]. Buyers expect current versions."

**E-4: All documents in one category, nothing else**
User uploads 8 financial documents but nothing else. Financial category shows 100% but overall score is low. UI surfaces: "Your Financial evidence is strong, but buyers evaluate six categories. Legal and Operations gaps will stall your deal." Category-specific strengths don't compensate for category-level gaps.

**E-5: User deletes a document**
Score recalculates. If it drops below 70% and Deal Room was activated, show warning: "Removing this document drops your evidence below buyer-ready threshold. Your Deal Room will remain accessible, but buyers may notice gaps."

**E-6: QuickBooks or financial integration auto-syncs**
When financial data syncs (future feature), auto-create evidence entries for "Monthly P&L," "Balance Sheet," etc. These show "Source: QuickBooks (auto-synced)" and update automatically. Score increases without user action — the surprise progress that drives return visits.

---

## 3. DETAILED FUNCTIONAL REQUIREMENTS

### 3.1 Hero Evidence Bar

The most important UI element on this page. Shows the overall buyer-readiness score with a progress bar.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  YOUR EVIDENCE                               47% buyer-ready    │
│                                                                  │
│  ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│                                                                  │
│  18 documents · 6 categories · Last upload: Oct 18               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Score Calculation:**

The evidence score is NOT the current `calculateReadinessScore()` (which counts uploaded documents vs. expected documents per folder). The new score weights by **buyer impact**.

```typescript
interface EvidenceScoreConfig {
  // Weights per BRI-aligned evidence category (must sum to 1.0)
  categoryWeights: {
    financial: 0.30      // Buyers start here. No financials = no deal.
    legal: 0.20          // Contracts, compliance, corp docs
    operational: 0.15    // SOPs, vendor agreements, org chart
    customers: 0.15      // Customer concentration, contracts, pipeline
    team: 0.10           // Employee agreements, handbook, compensation
    ipTech: 0.10         // IP assignments, technology, licenses
  }
}

// Score per category = (documentsUploaded / documentsExpected) × categoryWeight × 100
// Total score = sum of all category scores, capped at 100
```

**Buyer Impact Labels:**
| Weight Range | Label | Color |
|---|---|---|
| 0.25-0.30 | Critical | text-rose-600 |
| 0.15-0.20 | Important | text-amber-600 |
| 0.10 | Moderate | text-sky-600 |

**Behavior:**
- Score updates in real-time after uploads (optimistic update)
- Progress bar animates smoothly on score change (CSS transition, 500ms)
- Score is also surfaced in Mode 1 (Value Home) and the global nav as a subtle indicator

### 3.2 Evidence Category Grid

Six categories displayed as cards, organized by buyer impact (highest to lowest).

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌─────────────┬────────────┬──────────┬───────────────────┐    │
│  │ Category    │ Documents  │ Status   │ Buyer Impact      │    │
│  ├─────────────┼────────────┼──────────┼───────────────────┤    │
│  │ Financial   │ 6 of 8     │ 75% ●●●○ │ Critical          │    │
│  │ Legal       │ 2 of 6     │ 33% ●○○○ │ Critical          │    │
│  │ Operations  │ 4 of 5     │ 80% ●●●○ │ Important         │    │
│  │ Customers   │ 1 of 4     │ 25% ●○○○ │ Important         │    │
│  │ Team/HR     │ 3 of 5     │ 60% ●●○○ │ Moderate          │    │
│  │ IP/Tech     │ 0 of 2     │  0% ○○○○ │ Moderate          │    │
│  └─────────────┴────────────┴──────────┴───────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Six Evidence Categories (BRI-aligned):**

| Evidence Category | Maps From DataRoomCategory | Expected Documents | Weight |
|---|---|---|---|
| Financial | FINANCIAL, TAX | 8 (3yr financials, monthly P&L, balance sheet, budget, tax returns, AR/AP aging, debt schedule, revenue by customer) | 0.30 |
| Legal | LEGAL, CORPORATE, INSURANCE | 6 (formation docs, operating agreement, contracts, litigation history, licenses, insurance certificates) | 0.20 |
| Operations | OPERATIONS, REAL_ESTATE, ENVIRONMENTAL | 5 (org chart, SOPs, vendor contracts, facility leases, equipment list) | 0.15 |
| Customers | CUSTOMERS, SALES_MARKETING | 4 (top customer list, customer contracts, sales pipeline, concentration analysis) | 0.15 |
| Team/HR | EMPLOYEES | 5 (employee census, employment agreements, benefits, compensation summary, handbook) | 0.10 |
| IP/Tech | IP, TECHNOLOGY | 2 (IP assignments, software licenses/tech architecture) | 0.10 |

**Confidence Dots Calculation:**
```typescript
function calculateDots(documentsUploaded: number, documentsExpected: number): number {
  const ratio = documentsUploaded / documentsExpected
  if (ratio === 0) return 0
  if (ratio < 0.34) return 1
  if (ratio < 0.67) return 2
  if (ratio < 1.0) return 3
  return 4  // all expected documents present
}
```

**Click Behavior:**
Clicking a category row expands it inline (same pattern as Mode 2 Diagnosis panels) to show:
- List of expected documents with status (uploaded / missing)
- Uploaded documents with metadata (date, source, staleness)
- Missing documents with buyer explanation and upload CTA
- Upload dropzone for adding new documents

### 3.3 Category Expanded View

When a user clicks a category row, it expands to show document-level detail.

**Layout (expanded Financial category):**
```
┌──────────────────────────────────────────────────────────────────┐
│  Financial                            6 of 8 · 75% · Critical   │
│                                                                  │
│  UPLOADED                                                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ✓ Annual Financial Statements (3 years)                   │  │
│  │    Uploaded Oct 18 · Source: Direct upload                  │  │
│  │    [View] [Replace]                                         │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  ✓ Monthly P&L (12 months)                                 │  │
│  │    Auto-synced Oct 18 · Source: QuickBooks                  │  │
│  │    [View]                                                   │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  ✓ Balance Sheet                                           │  │
│  │    Uploaded Oct 12 · Source: Task — Review financial health │  │
│  │    [View] [Replace]                                         │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  ...3 more uploaded                                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  MISSING                                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ⚠ Accounts Receivable Aging                               │  │
│  │    "Buyers analyze AR aging to assess collection risk.      │  │
│  │     30-60-90 day aging shows revenue quality. Without it,   │  │
│  │     buyers assume the worst about your receivables."        │  │
│  │    [Upload AR Aging Report]                                 │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  ⚠ Debt Schedule                                           │  │
│  │    "Every acquisition involves assumption or payoff of      │  │
│  │     debt. Buyers need to see all obligations — loans,       │  │
│  │     lines of credit, equipment financing — to calculate     │  │
│  │     true enterprise value."                                 │  │
│  │    [Upload Debt Schedule]                                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  📎 Drop files here to upload, or click to browse          │  │
│  │     PDF, DOCX, XLSX, JPG, PNG · Max 50MB                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Uploaded Document Row:**
- Checkmark icon + document name
- Upload date and source (Direct upload / Task name / Integration name)
- Staleness indicator if `nextUpdateDue` is past: "⚠ Last updated 8 months ago — buyers expect current versions"
- [View] opens document preview (existing `DocumentPreview.tsx` logic)
- [Replace] opens upload flow to create new version (existing versioning system)

**Missing Document Row:**
- Warning icon + document name
- Buyer psychology explanation in quotes (italic, muted text)
- Upload CTA button specific to that document
- Clicking the CTA opens file picker, uploads to the correct category/folder in the underlying data room, and creates the `DataRoomDocument` record

**Upload Dropzone:**
- Generic upload area at bottom of expanded category
- Drag-and-drop or click-to-browse
- Accepted types: PDF, DOCX, XLSX, JPG, PNG, CSV
- Max 50MB per file
- On upload: creates `DataRoomDocument` in the correct underlying folder, auto-names if matching a missing document template
- File validation uses existing `validateUploadedFile` from `src/lib/security`

### 3.4 Missing Documents Section (Collapsed View)

Below the category grid, show the highest-impact missing documents across all categories.

**Layout:**
```
  ─────── MISSING (Highest Impact First) ────────────────────────

  ⚠ Tax returns (last 3 years)                          Financial
    "Required in 100% of acquisitions. Buyers won't
     proceed past LOI without these."
    [Upload Tax Returns]

  ⚠ Customer contracts (top 5)                          Customers
    "Buyers need to verify revenue durability.
     Assignability clauses are critical."
    [Upload Contracts]

  ⚠ IP assignment agreements                             IP/Tech
    "Buyers verify that all IP is owned by the entity,
     not individuals. Missing IP assignments can
     kill a deal in diligence."
    [Upload IP Agreements]

  ⚠ Employment agreements (key employees)                Team/HR
    "Non-competes, non-solicits, and IP assignment
     clauses for key employees are standard diligence
     requests."
    [Upload Agreements]

  Showing 4 of 12 missing · [View all missing documents]
```

**Priority Logic:**
Missing documents are sorted by: `categoryWeight × documentImportanceRank`. Financial documents (weight 0.30) always surface first. Within a category, documents are ordered by the `sortOrder` from the expected documents config.

**Behavior:**
- Shows top 4 missing documents by default
- "View all missing documents" expands to show all
- Each upload CTA opens file picker for that specific document
- After upload, the item animates out of the missing list and the next item surfaces
- Category column shows which evidence category the document belongs to

### 3.5 Recently Added Section

Shows documents recently uploaded or auto-synced, creating a sense of momentum.

**Layout:**
```
  ─────── RECENTLY ADDED ───────────────────────────────────────

  ✓ QuickBooks P&L (auto-synced)              Financial   Oct 18
  ✓ Organization chart                        Operations  Oct 12
  ✓ Updated lease agreement                   Operations  Oct 12
  ✓ Employee handbook v2                      Team/HR     Oct 7

  ✓ 4 documents added this month
```

**Data Requirements:**
- Documents with `createdAt` or `lastUpdatedAt` within last 30 days
- Sorted by most recent first
- Shows document name, category, and date
- Source indicator for auto-synced documents
- Monthly count at bottom

**Behavior:**
- Each row is clickable → opens document preview
- If no recent documents: section is hidden (not "0 documents added")

### 3.6 Deal Room Teaser (Conditional)

Appears when evidence score is 60%+ to create anticipation for Mode 5.

**Layout (65-69%):**
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  🔓 DEAL ROOM                                    Almost Ready   │
│                                                                  │
│  Your evidence is 68% buyer-ready. Upload 3 more documents to   │
│  unlock your Deal Room — where you'll manage buyer access,       │
│  track who's viewing what, and run your sale process.            │
│                                                                  │
│  What you'll unlock:                                             │
│  · Buyer access control with NDA tracking                        │
│  · Document watermarking and download analytics                  │
│  · Buyer Q&A with threaded responses                             │
│  · Stage-gated disclosure (Teaser → Post-NDA → Full DD)          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Layout (70%+):**
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ✓ DEAL ROOM READY                                               │
│                                                                  │
│  Your evidence is 73% buyer-ready. You've earned access to       │
│  your Deal Room.                                                 │
│                                                                  │
│  [Activate Deal Room →]                                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Requirements:**
- Only appears on Exit-Ready tier ($449/mo)
- Below 60%: not shown
- 60-69%: teaser with feature preview and "X documents away" count
- 70%+: activation CTA
- Deal Room activation requires 70%+ evidence AND 90+ days on the platform (prevents users from bulk-uploading garbage to unlock)

### 3.7 Expected Documents Config

A new configuration that defines what documents buyers expect per category. This replaces the folder-template approach with a buyer-oriented, weighted document checklist.

```typescript
interface ExpectedDocument {
  id: string                          // stable identifier
  name: string                        // display name
  category: EvidenceCategory          // which of the 6 categories
  buyerExplanation: string            // why a buyer cares (shown in missing section)
  importance: 'required' | 'expected' | 'helpful'
  // required: deal won't close without it
  // expected: buyers request in 90%+ of deals
  // helpful: strengthens the deal but not blockers
  sortOrder: number                   // within category
  matchesDataRoomCategory: DataRoomCategory[]  // maps to underlying data room folders
  updateFrequency: UpdateFrequency    // how often this should be refreshed
}

type EvidenceCategory = 'financial' | 'legal' | 'operational' | 'customers' | 'team' | 'ipTech'
```

**Document counts per category:**

| Category | Required | Expected | Helpful | Total |
|---|---|---|---|---|
| Financial | 4 (3yr financials, monthly P&L, balance sheet, tax returns) | 3 (budget, AR aging, debt schedule) | 1 (revenue by customer) | 8 |
| Legal | 3 (formation docs, operating agreement, material contracts) | 2 (litigation history, insurance certs) | 1 (licenses & permits) | 6 |
| Operations | 2 (org chart, SOPs/key processes) | 2 (vendor contracts, facility leases) | 1 (equipment list) | 5 |
| Customers | 2 (top customer list, customer contracts) | 1 (concentration analysis) | 1 (pipeline/churn data) | 4 |
| Team/HR | 2 (employee census, key employment agreements) | 2 (compensation summary, handbook) | 1 (benefit plan docs) | 5 |
| IP/Tech | 1 (IP assignments) | 1 (software licenses/tech docs) | 0 | 2 |
| **Total** | **14** | **11** | **5** | **30** |

**Score Calculation Detail:**
- Only `required` and `expected` documents count toward the score (not `helpful`)
- This gives 25 documents that matter for the score
- Each document's contribution = `categoryWeight / documentsInCategory`
- Example: Financial has weight 0.30 and 7 scoring documents → each financial doc contributes ~4.3 points

### 3.8 Auto-Population from Task Completions

When a task is completed in Mode 3 with proof documents, those documents should automatically map to the correct evidence category.

**Mapping Logic:**
```typescript
function mapTaskProofToEvidenceCategory(task: Task): EvidenceCategory {
  // Map BRI category to evidence category
  const mapping: Record<BriCategory, EvidenceCategory> = {
    FINANCIAL: 'financial',
    TRANSFERABILITY: 'operational',  // transferability tasks often produce operational docs
    OPERATIONAL: 'operational',
    MARKET: 'customers',            // market tasks relate to customer/pipeline evidence
    LEGAL_TAX: 'legal',
    PERSONAL: 'operational',        // personal readiness rarely produces evidence; fallback
  }
  return mapping[task.briCategory]
}
```

**Auto-Population Flow:**
1. User completes task in Mode 3 with proof document uploaded
2. Proof document is created as `DataRoomDocument` with `category: 'TASK_PROOF'` and `linkedTaskId`
3. New: also set `evidenceCategory` field on the document (see data model changes)
4. Evidence score recalculates including the new document
5. Next time user visits Mode 4, the document appears in the correct category with "Source: Task — [task title]"

**Document-to-Expected Matching:**
When a proof document is uploaded, attempt to match it to an expected document template:
```typescript
function matchToExpected(
  documentName: string,
  evidenceCategory: EvidenceCategory,
  expectedDocs: ExpectedDocument[]
): ExpectedDocument | null {
  // Fuzzy match document name against expected document names in the same category
  // e.g., "2024 P&L Statement.pdf" matches "Monthly P&L (12 months)"
  // If matched, mark that expected document as fulfilled
  // If no match, count as a general document in the category
}
```

This matching is best-effort. Unmatched documents still count toward the category's upload count but don't fulfill specific expected documents. Users can manually link documents to expected items via drag or dropdown.

### 3.9 API Changes

#### New Endpoint: `GET /api/companies/[id]/evidence`

Primary data source for the Evidence page.

**Response:**
```typescript
interface EvidenceResponse {
  // Overall score
  score: {
    percentage: number              // 0-100, weighted by buyer impact
    label: string                   // "47% buyer-ready"
    documentsUploaded: number       // total across all categories
    documentsExpected: number       // total expected (required + expected importance)
    lastUploadAt: string | null
  }

  // Per-category breakdown
  categories: Array<{
    id: EvidenceCategory
    label: string                   // "Financial", "Legal", etc.
    buyerImpact: 'critical' | 'important' | 'moderate'
    weight: number                  // 0.30, 0.20, etc.
    documentsUploaded: number
    documentsExpected: number       // required + expected count
    percentage: number              // category-specific completion
    dots: number                    // 0-4 confidence dots

    // Documents in this category
    uploadedDocuments: Array<{
      id: string
      name: string
      uploadedAt: string
      source: 'direct' | 'task' | 'integration'
      sourceLabel: string | null    // task title or integration name
      isStale: boolean
      staleReason: string | null    // "Last updated 8 months ago"
      mimeType: string | null
      fileSize: number | null
      version: number
      matchedExpectedId: string | null  // which expected doc this fulfills
    }>

    // Missing documents in this category
    missingDocuments: Array<{
      id: string                    // expected document id
      name: string
      buyerExplanation: string
      importance: 'required' | 'expected' | 'helpful'
    }>
  }>

  // Top missing across all categories (for the collapsed missing section)
  topMissing: Array<{
    id: string
    name: string
    category: EvidenceCategory
    categoryLabel: string
    buyerExplanation: string
    importance: 'required' | 'expected'
  }>
  totalMissing: number

  // Recently added (last 30 days)
  recentlyAdded: Array<{
    id: string
    name: string
    category: EvidenceCategory
    categoryLabel: string
    addedAt: string
    source: 'direct' | 'task' | 'integration'
  }>

  // Deal Room readiness
  dealRoom: {
    eligible: boolean               // tier check (Exit-Ready)
    scoreReady: boolean             // 70%+ evidence
    tenureReady: boolean            // 90+ days on platform
    canActivate: boolean            // all conditions met
    isActivated: boolean            // already activated
    documentsToUnlock: number | null // how many more to reach 70%
  }
}
```

#### New Endpoint: `POST /api/companies/[id]/evidence/upload`

Simplified upload endpoint for evidence mode (wraps existing data room upload infrastructure).

```typescript
interface EvidenceUploadBody {
  category: EvidenceCategory
  expectedDocumentId?: string       // which expected document this fulfills
  fileName: string
  mimeType: string
  fileSize: number
}

interface EvidenceUploadResponse {
  document: {
    id: string
    name: string
    category: EvidenceCategory
  }
  uploadUrl: string                 // signed Supabase upload URL
  token: string                     // confirmation token
  newScore: number                  // updated evidence score (optimistic)
}
```

#### New Endpoint: `POST /api/companies/[id]/evidence/upload/confirm`

Confirms upload completion and triggers score recalculation.

```typescript
interface EvidenceUploadConfirmBody {
  documentId: string
  token: string
}

interface EvidenceUploadConfirmResponse {
  success: boolean
  score: {
    previous: number
    current: number
    delta: number
  }
}
```

#### New Endpoint: `POST /api/companies/[id]/evidence/link`

Manually link an uploaded document to an expected document template.

```typescript
interface EvidenceLinkBody {
  documentId: string
  expectedDocumentId: string
}
```

### 3.10 Data Model Changes

#### DataRoomDocument Additions

```prisma
model DataRoomDocument {
  // ... existing fields ...

  // Evidence mode: which of the 6 BRI-aligned categories this belongs to
  evidenceCategory   String?            @map("evidence_category")
  // e.g., "financial", "legal", "operational", "customers", "team", "ipTech"

  // Evidence mode: which expected document template this fulfills
  expectedDocumentId String?            @map("expected_document_id")
  // References the id from the ExpectedDocument config (not a DB relation — config is static)

  // Evidence mode: how this document was added
  evidenceSource     String?            @map("evidence_source")
  // "direct", "task", "integration"
}
```

**Migration notes:**
- All three fields default to `null`. Backfill for existing documents using `mapTaskProofToEvidenceCategory()` for task proofs and category-based mapping for other documents.
- Documents with `category: 'TASK_PROOF'` get `evidenceSource: 'task'`
- Documents in standard data room folders get `evidenceSource: 'direct'`
- `expectedDocumentId` is only populated when a document is explicitly matched (auto or manual)

#### No New Models Required

The evidence scoring, expected documents config, and category mapping are all computed from existing `DataRoomDocument` records + a static config file. No new database models needed.

### 3.11 Tier Gating

| Feature | Foundation (Free) | Growth ($179/mo) | Exit-Ready ($449/mo) |
|---|---|---|---|
| View evidence score + categories | Yes (see what's missing) | Yes | Yes |
| See buyer explanations (full) | Preview only (first line) | Yes | Yes |
| Upload documents | No (upgrade wall) | Yes | Yes |
| View/download uploaded documents | No | Yes | Yes |
| Document versioning | No | Yes | Yes |
| Deal Room teaser | No | No | Yes |
| Deal Room activation | No | No | Yes (at 70%+) |

**Upgrade wall copy:**
- On upload CTA (free tier): "Upgrade to Growth to start building buyer-ready evidence. Every document you upload increases your readiness score."
- On "View all missing" (free tier): "Upgrade to Growth to see the complete buyer checklist and start closing gaps."

---

## 4. DESIGN SPECIFICATIONS

### 4.1 Page Layout

```
Page: /dashboard/evidence
Max width: 900px (slightly wider than Actions — need room for the table)
Padding: px-6 py-8
Background: var(--background)
```

### 4.2 Hero Evidence Bar

```
Container: w-full rounded-xl border border-border/50 bg-card p-6

Row 1: flex justify-between items-center
  Left: "YOUR EVIDENCE" — text-sm font-semibold tracking-wider text-muted-foreground uppercase
  Right: "{n}% buyer-ready" — text-lg font-bold text-[var(--burnt-orange)]

Row 2: mt-3
  Progress bar container: h-3 rounded-full bg-muted overflow-hidden
  Fill: h-full rounded-full transition-all duration-500 ease-out
    0-33%: bg-rose-500
    34-66%: bg-amber-500
    67-100%: bg-emerald-500

Row 3: mt-2 flex justify-between
  Left: "{n} documents · {n} categories" — text-xs text-muted-foreground
  Right: "Last upload: {date}" — text-xs text-muted-foreground
```

### 4.3 Evidence Category Table

```
Container: mt-8 rounded-xl border border-border/50 bg-card overflow-hidden

Header row: px-4 py-3 bg-muted/30 border-b border-border/30
  grid grid-cols-[1fr_100px_100px_120px] gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider
  Columns: Category | Documents | Status | Buyer Impact

Category rows: divide-y divide-border/20
  Each row: px-4 py-4 grid grid-cols-[1fr_100px_100px_120px] gap-4 items-center
  hover:bg-muted/20 cursor-pointer transition-colors

  Column 1 (Category):
    text-sm font-medium text-foreground
    Icon (from lucide) + label

  Column 2 (Documents):
    text-sm text-muted-foreground
    "{uploaded} of {expected}"

  Column 3 (Status):
    flex items-center gap-1
    "{percentage}%" — text-sm text-muted-foreground
    Dots: 4 circles, each w-2 h-2 rounded-full
      Filled: bg-[var(--burnt-orange)]
      Empty: bg-muted-foreground/20

  Column 4 (Buyer Impact):
    text-xs font-medium px-2 py-0.5 rounded-full
    Critical: bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400
    Important: bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400
    Moderate: bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400

Expanded state:
  When clicked, row expands below (AnimatePresence, layout animation)
  Background: bg-muted/10 p-6
  Shows uploaded docs, missing docs, upload dropzone (see 3.3)
  Click row again to collapse
```

### 4.4 Missing Documents Section

```
Section container: mt-8

Divider: flex items-center gap-3
  Line: flex-1 h-px bg-border/50
  Label: "MISSING (HIGHEST IMPACT FIRST)" — text-xs font-semibold tracking-wider text-muted-foreground uppercase whitespace-nowrap

Missing rows: mt-4 space-y-4

Each missing item:
  Container: rounded-lg border border-border/30 p-4

  Row 1: flex items-center justify-between
    Left: flex items-center gap-2
      ⚠ icon: w-4 h-4 text-amber-500
      Document name: text-sm font-medium text-foreground
    Right:
      Category badge: text-xs text-muted-foreground

  Row 2: mt-2
    Buyer explanation: text-sm text-muted-foreground italic leading-relaxed pl-6
    (indented to align with document name)

  Row 3: mt-3 pl-6
    Upload CTA: inline-flex items-center gap-1.5 text-sm font-medium text-[var(--burnt-orange)]
    hover:underline cursor-pointer
    Icon: Upload (lucide) w-3.5 h-3.5

"View all" link: mt-4 text-sm text-muted-foreground hover:text-foreground cursor-pointer
  "Showing {n} of {total} missing · View all missing documents"
```

### 4.5 Recently Added Section

```
Section container: mt-8

Divider: same style as Missing section
  Label: "RECENTLY ADDED"

Rows: mt-3 space-y-1

Each row: flex items-center justify-between py-2 px-1 rounded hover:bg-muted/20
  Left: flex items-center gap-2
    ✓ icon: w-4 h-4 text-emerald-500
    Name: text-sm text-muted-foreground
  Right: flex items-center gap-4
    Category: text-xs text-muted-foreground
    Date: text-xs text-muted-foreground

Summary: mt-3
  "✓ {n} documents added this month" — text-sm text-muted-foreground
```

### 4.6 Deal Room Teaser

```
Container: mt-8 rounded-xl border border-dashed border-border/50 p-6

Not eligible (below 60% or wrong tier):
  Hidden

Teaser (60-69%, Exit-Ready tier):
  Row 1: flex items-center gap-2
    🔓 icon: w-5 h-5 text-muted-foreground
    "DEAL ROOM" — text-sm font-semibold tracking-wider text-muted-foreground uppercase
    "Almost Ready" — text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700

  Row 2: mt-3
    Copy — text-sm text-muted-foreground leading-relaxed

  Row 3: mt-4
    Feature list: grid grid-cols-2 gap-2
    Each feature: flex items-center gap-1.5
      · bullet: text-muted-foreground
      Feature text: text-xs text-muted-foreground

Ready (70%+, Exit-Ready tier):
  Border changes to: border-solid border-emerald-500/30
  Background: bg-emerald-50/50 dark:bg-emerald-900/10

  Row 1: flex items-center gap-2
    ✓ icon: w-5 h-5 text-emerald-500
    "DEAL ROOM READY" — text-sm font-semibold tracking-wider text-emerald-600 uppercase

  Row 2: mt-2
    Copy — text-sm text-muted-foreground

  Row 3: mt-4
    [Activate Deal Room →] — primary button bg-[var(--burnt-orange)] text-white px-6 py-2 rounded-lg
```

### 4.7 Empty State

```
Container: (replaces category grid when no documents exist)

Within hero bar:
  Score shows "0% buyer-ready"
  Progress bar empty

Below hero:
  flex flex-col items-center py-12 text-center

  Icon: FileCheck from lucide — w-12 h-12 text-muted-foreground/40

  Title: "Build your buyer-ready evidence" — text-lg font-semibold text-foreground mt-4
  Subtitle: "Buyers evaluate six categories of evidence during due diligence.
    Start with the documents you already have."
    — text-sm text-muted-foreground mt-2 max-w-lg

  Quick start cards: grid grid-cols-2 gap-3 mt-6 max-w-lg
    Each card: rounded-lg border border-border/50 p-4 text-left hover:bg-muted/30 cursor-pointer
      Category icon + name
      "Upload your first {category} document"
      Clicking opens upload flow for that category
```

### 4.8 Animations

```typescript
// Score counter animation on page load
// Counts up from 0 to actual percentage over 1s
const useCountUp = (target: number, duration: number = 1000) => {
  // Animate from 0 to target using requestAnimationFrame
}

// Progress bar fill animation
// CSS transition: transition-all duration-700 ease-out
// Triggered after count-up completes

// Category row expand
const expandVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: 'auto', opacity: 1, transition: { duration: 0.3 } }
}

// Upload success
// Document row slides in from right with spring animation
// Score counter re-animates delta (+4.3%)

// Missing item removal (after upload)
const removeVariants = {
  exit: { opacity: 0, x: -20, height: 0, transition: { duration: 0.3 } }
}

// Stagger sections on page load
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}
```

### 4.9 Loading State

```
Skeleton layout:
  - Hero bar: h-20 rounded-xl bg-muted animate-pulse
  - Category table: h-[280px] rounded-xl bg-muted animate-pulse mt-8
  - Missing section: 3x h-24 rounded-lg bg-muted animate-pulse mt-8 space-y-3

TanStack Query config:
  staleTime: 60_000  (60s — evidence changes less frequently than tasks)
  refetchOnWindowFocus: true
  refetchInterval: 300_000  (5 minutes)
```

### 4.10 Mobile Responsiveness

```
< 640px (mobile):
  - Category table becomes stacked cards (each category as a card, not a table row)
  - Columns stack vertically within each card
  - Missing documents: full width, no two-column layout
  - Upload dropzone: full width
  - Deal Room teaser: single column feature list

640px-1024px (tablet):
  - Table layout preserved but tighter spacing
  - max-width: 100% with px-4

> 1024px (desktop):
  - max-width: 900px centered
```

---

## 5. ENGAGEMENT HOOKS

### 5.1 Core Engagement Loop

```
Complete Task (Mode 3) → Evidence Auto-Populates → Score Increases → See Progress → Complete More Tasks
```

This is the cross-mode engagement loop. Task completion in Mode 3 automatically feeds Mode 4. Users see their evidence score go up without explicitly "working on evidence." That surprise progress drives both return visits to Mode 4 and continued task work in Mode 3.

### 5.2 Gap Awareness Loop

```
See Missing Documents → Read Buyer Explanation → Feel Urgency → Upload Document → Score Increases → See Next Gap
```

The buyer psychology explanations create urgency without being pushy. "Buyers won't proceed past LOI without these" is a fact, not a sales tactic. Each upload creates a small dopamine hit (score increases) and immediately surfaces the next gap.

### 5.3 Deal Room Aspiration

```
See Deal Room Teaser → Understand What's Locked → Calculate Documents Needed → Upload to Reach 70% → Unlock Deal Room
```

The Deal Room teaser at 60%+ creates a clear goal. "3 documents away from unlocking your Deal Room" is specific, achievable, and motivating. It prevents the "I'll never be ready" feeling by making the finish line visible.

### 5.4 Staleness Monitoring

```
Document Ages → "Needs Update" Appears → User Refreshes Document → Score Maintained → Document Fresh Again
```

Staleness doesn't decrease the score (that would feel punitive), but it creates visual friction. A category showing "⚠ 2 documents need updates" pulls the user back to keep things current. This is the monthly retention hook — evidence doesn't just build, it requires maintenance.

### 5.5 Conversion Moments (Free → Paid)

**Moment 1: Evidence score visibility.** Free users see "12% buyer-ready" with the full gap list. They know what's missing. They can't fix it without upgrading. The score creates the urgency; the upgrade unlocks the action.

**Moment 2: Buyer explanation depth.** Free users see the first line of buyer explanations. Full explanations require Growth. "Required in 100% of acquisitions..." is visible. The rest — the nuanced explanation of consequences — requires upgrade.

**Moment 3: After task completion.** When a free user completes (hypothetically) their first task in Mode 3, the follow-up "Upload proof to your evidence library" CTA hits the upgrade wall. The task is done but the evidence isn't captured.

### 5.6 Analytics Events

| Event | Trigger | Properties |
|---|---|---|
| `evidence_viewed` | Page load | `{ score, categoriesCount, documentsCount, missingCount }` |
| `evidence_category_expanded` | Click on category row | `{ category, docsUploaded, docsExpected, percentage }` |
| `evidence_category_collapsed` | Close category panel | `{ category, timeOpen }` |
| `evidence_upload_started` | File selected for upload | `{ category, expectedDocId, mimeType, fileSize }` |
| `evidence_upload_completed` | Upload confirmed | `{ category, expectedDocId, previousScore, newScore, delta }` |
| `evidence_upload_failed` | Upload error | `{ category, error, mimeType, fileSize }` |
| `evidence_document_viewed` | Click "View" on document | `{ documentId, category }` |
| `evidence_document_replaced` | New version uploaded | `{ documentId, category, previousVersion }` |
| `evidence_missing_viewed` | "View all missing" clicked | `{ totalMissing }` |
| `evidence_missing_upload_clicked` | Upload CTA on missing item | `{ expectedDocId, category }` |
| `evidence_deal_room_teaser_viewed` | Teaser scrolled into view | `{ score, eligible }` |
| `evidence_deal_room_activated` | "Activate Deal Room" clicked | `{ score, tenure }` |
| `evidence_stale_document_viewed` | Stale document indicator seen | `{ documentId, category, daysSinceUpdate }` |
| `upgrade_wall_hit` | Free user attempts gated action | `{ action, category, score }` |

---

## 6. TECHNICAL GUIDANCE

### 6.1 Component Architecture

```
src/components/evidence/
├── EvidencePage.tsx               # Page orchestrator (data fetching, layout)
├── HeroEvidenceBar.tsx            # Score display with animated progress bar
│   └── ScoreCounter.tsx           # Animated count-up number
├── EvidenceCategoryTable.tsx      # 6-category table with expand behavior
│   └── CategoryRow.tsx            # Single category row (compact + expanded)
│       ├── UploadedDocList.tsx     # Uploaded documents within category
│       │   └── UploadedDocRow.tsx  # Single doc with view/replace actions
│       ├── MissingDocList.tsx      # Missing documents within category
│       │   └── MissingDocRow.tsx   # Single missing doc with buyer explanation
│       └── UploadDropzone.tsx      # Drag-and-drop upload area
├── MissingDocumentsSection.tsx    # Cross-category missing docs (collapsed view)
├── RecentlyAddedSection.tsx       # Last 30 days uploads
├── DealRoomTeaser.tsx             # Conditional Deal Room preview/CTA
├── EmptyState.tsx                 # No documents state
└── EvidenceUploadDialog.tsx       # Upload confirmation + category assignment
```

### 6.2 Expected Documents Config

```
src/lib/evidence/
├── expected-documents.ts          # Static config: 30 expected documents per category
├── evidence-categories.ts         # 6 categories with weights and buyer impact
├── score-calculator.ts            # Evidence score calculation (weighted by category)
├── document-matcher.ts            # Fuzzy matching uploaded docs to expected templates
└── category-mapper.ts             # Map DataRoomCategory → EvidenceCategory
```

### 6.3 Data Fetching

```typescript
// Primary query — loads on page mount
const { data, isLoading } = useQuery({
  queryKey: ['evidence', companyId],
  queryFn: () => fetch(`/api/companies/${companyId}/evidence`).then(r => r.json()),
  staleTime: 60_000,
  refetchOnWindowFocus: true,
})

// Upload mutation — optimistic score update
const uploadEvidence = useMutation({
  mutationFn: async ({ category, expectedDocId, file }) => {
    // 1. Get upload URL
    const { uploadUrl, documentId, token, newScore } = await fetch(
      `/api/companies/${companyId}/evidence/upload`,
      { method: 'POST', body: JSON.stringify({ category, expectedDocumentId: expectedDocId, fileName: file.name, mimeType: file.type, fileSize: file.size }) }
    ).then(r => r.json())

    // 2. Upload file to Supabase
    await fetch(uploadUrl, { method: 'PUT', body: file })

    // 3. Confirm upload
    return fetch(`/api/companies/${companyId}/evidence/upload/confirm`, {
      method: 'POST', body: JSON.stringify({ documentId, token })
    }).then(r => r.json())
  },
  onMutate: async ({ category, expectedDocId }) => {
    // Optimistic: increment score, move doc from missing to uploaded
    await queryClient.cancelQueries(['evidence', companyId])
    const prev = queryClient.getQueryData(['evidence', companyId])
    // ... optimistic update
    return { prev }
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['evidence', companyId], context.prev)
  },
  onSettled: () => {
    queryClient.invalidateQueries(['evidence', companyId])
    // Also invalidate Mode 1 (Value Home) since evidence score may surface there
    queryClient.invalidateQueries(['dashboard', companyId])
  },
})
```

### 6.4 Relationship to Existing Data Room

Mode 4 (Evidence) is a **view layer** on top of the existing data room infrastructure. It does NOT replace the data room backend.

```
Evidence Mode (Mode 4)           Data Room Backend (existing)
─────────────────────           ──────────────────────────────
6 evidence categories    →      15 DataRoomCategory enums
Expected documents       →      DataRoomDocument records
Upload via evidence      →      Creates DataRoomDocument + uploads to Supabase
Score calculation        →      Queries DataRoomDocument by evidenceCategory
View/replace documents   →      Uses existing preview/download/version endpoints
```

**What Evidence Mode uses from existing infrastructure:**
- `DataRoomDocument` model (all fields)
- Supabase storage bucket and signed URL generation
- `validateUploadedFile` from `src/lib/security`
- `DocumentPreview.tsx` component for viewing
- Version history system for document replacement
- File path generation for storage

**What Evidence Mode does NOT use:**
- Folder hierarchy navigation (replaced by 6-category view)
- Stage-gated access (that's Mode 5)
- External access grants (that's Mode 5)
- Q&A system (that's Mode 5)
- Activity feed (simplified to "Recently Added")
- Watermarking (that's Mode 5)
- Analytics dashboard (that's Mode 5)

### 6.5 Performance Requirements

| Metric | Target |
|---|---|
| Evidence page load (API) | < 300ms |
| Score calculation | < 100ms (cached, invalidated on upload) |
| Upload start (get signed URL) | < 200ms |
| Upload confirm + score recalculation | < 500ms |
| Category expand animation | < 300ms |
| Document preview load | < 1s |

### 6.6 Caching Strategy

- **Evidence data:** Cache for 60s. Invalidate on any upload, replace, or delete.
- **Score:** Computed server-side as part of evidence response. Cached as part of the response.
- **Expected documents config:** Static — can be loaded at build time or cached indefinitely.
- **Upload URLs:** Not cached — generated fresh for each upload (security).

### 6.7 Testing Requirements

**Unit Tests:**
- Score calculation: verify weighted category scoring produces correct percentages
- Category mapping: verify all `DataRoomCategory` values map to an `EvidenceCategory`
- Dots calculation: verify 0/1/2/3/4 dots based on ratio thresholds
- Document matcher: verify fuzzy matching against expected document templates
- Staleness detection: verify documents past `nextUpdateDue` are flagged
- Importance filtering: verify only required + expected docs count toward score

**Integration Tests:**
- Upload flow: select file → get URL → upload to Supabase → confirm → score updates
- Task proof auto-population: complete task with proof → evidence category receives document
- Document replacement: upload new version → old version archived → score unchanged
- Deal Room gate: verify 70% + 90 days + Exit-Ready tier are all checked

**E2E Tests:**
- Full journey: assessment → tasks generated → task completed with proof → evidence auto-populated → score increases → eventually hit 70% → Deal Room teaser → activation
- Empty state → first upload → score appears → second upload → score increases

---

## 7. LAUNCH PLAN

### Sprint 1: Evidence View (MVP)

**Deliverables:**
- [ ] Expected documents config file (`src/lib/evidence/expected-documents.ts`) with all 30 documents
- [ ] Evidence categories config (`src/lib/evidence/evidence-categories.ts`) with weights
- [ ] Score calculator (`src/lib/evidence/score-calculator.ts`)
- [ ] Category mapper (`src/lib/evidence/category-mapper.ts`)
- [ ] Database migration: add `evidenceCategory`, `expectedDocumentId`, `evidenceSource` to DataRoomDocument
- [ ] Backfill existing documents with evidence categories
- [ ] New API endpoint: `GET /api/companies/[id]/evidence`
- [ ] `EvidencePage.tsx` with data fetching
- [ ] `HeroEvidenceBar.tsx` with animated progress bar and score
- [ ] `EvidenceCategoryTable.tsx` with 6 categories (no expand yet)
- [ ] `MissingDocumentsSection.tsx` with top 4 missing items
- [ ] `RecentlyAddedSection.tsx`
- [ ] `EmptyState.tsx`
- [ ] Route: `/dashboard/evidence`
- [ ] Nav item: add "Evidence" to sidebar

**NOT in Sprint 1:** Category expand, upload from evidence page, Deal Room teaser, document preview.

### Sprint 2: Upload & Category Detail

**Deliverables:**
- [ ] Category row expand with uploaded docs, missing docs, upload dropzone
- [ ] `UploadDropzone.tsx` with drag-and-drop
- [ ] New API endpoints: `POST /api/companies/[id]/evidence/upload` and `/upload/confirm`
- [ ] `EvidenceUploadDialog.tsx` for category assignment
- [ ] Score recalculation on upload with optimistic update
- [ ] Document matcher for auto-matching uploads to expected documents
- [ ] Manual linking (`POST /api/companies/[id]/evidence/link`)
- [ ] Document view integration (existing `DocumentPreview.tsx`)
- [ ] Document replace (new version) flow
- [ ] Staleness indicators on documents past `nextUpdateDue`
- [ ] Analytics events for upload and view actions
- [ ] Tier gating: free users see score but can't upload

### Sprint 3: Auto-Population & Deal Room Gate

**Deliverables:**
- [ ] Task proof auto-population: on task completion, set `evidenceCategory` and `evidenceSource` on proof documents
- [ ] Auto-match task proofs to expected documents where possible
- [ ] Score counter animation (count-up on page load)
- [ ] Upload success animation (score delta, missing item removal)
- [ ] Deal Room teaser component (60-69% + Exit-Ready tier)
- [ ] Deal Room ready component (70%+ with activation CTA)
- [ ] Deal Room activation logic (score + tenure + tier check)
- [ ] Monthly "documents added" summary in Recently Added
- [ ] Mobile responsiveness pass
- [ ] Performance optimization

### Success Metrics (30 days post-launch)

| Metric | Current Baseline | Target |
|---|---|---|
| Evidence page visits per user per week | ~0.5 (data room is rarely visited) | 2+ |
| Documents uploaded per user per month | ~2 (estimated) | 6+ |
| Evidence score progression per month | Not tracked | +8-12% per active month |
| Users reaching 50%+ evidence within 6 months | Not tracked | 30% of active users |
| Task proof → evidence auto-population rate | 0% (not implemented) | 80%+ of task proofs correctly mapped |
| Churn rate for users with 40%+ evidence | Not tracked | < 3% monthly |
| Deal Room activation rate (eligible users) | N/A (not implemented) | 20% within first month of eligibility |

---

## APPENDIX A: COPY TABLE

| Element | Copy |
|---|---|
| Page title | YOUR EVIDENCE |
| Score format | `{n}% buyer-ready` |
| Hero stats | `{n} documents · {n} categories · Last upload: {date}` |
| Hero stats (no uploads) | `Start building buyer-ready evidence` |
| Category table headers | Category / Documents / Status / Buyer Impact |
| Category docs format | `{uploaded} of {expected}` |
| Buyer impact: Critical | Critical |
| Buyer impact: Important | Important |
| Buyer impact: Moderate | Moderate |
| Missing section label | MISSING (HIGHEST IMPACT FIRST) |
| Missing count | `Showing {n} of {total} missing · View all missing documents` |
| Recently added label | RECENTLY ADDED |
| Recently added summary | `✓ {n} documents added this month` |
| Uploaded doc source: direct | Source: Direct upload |
| Uploaded doc source: task | Source: Task — {task title} |
| Uploaded doc source: integration | Source: {integration name} (auto-synced) |
| Stale document | `⚠ Last updated {n} months ago — buyers expect current versions` |
| Empty state title | Build your buyer-ready evidence |
| Empty state subtitle | Buyers evaluate six categories of evidence during due diligence. Start with the documents you already have. |
| Deal Room teaser (60-69%) | Your evidence is {n}% buyer-ready. Upload {n} more documents to unlock your Deal Room. |
| Deal Room ready (70%+) | Your evidence is {n}% buyer-ready. You've earned access to your Deal Room. |
| Deal Room CTA | Activate Deal Room |
| Free tier upgrade (upload) | Upgrade to Growth to start building buyer-ready evidence. Every document you upload increases your readiness score. |
| Free tier upgrade (view all) | Upgrade to Growth to see the complete buyer checklist and start closing gaps. |
| Upload dropzone | Drop files here to upload, or click to browse |
| Upload dropzone hint | PDF, DOCX, XLSX, JPG, PNG · Max 50MB |

## APPENDIX B: EXPECTED DOCUMENTS REFERENCE

### Financial (8 documents, weight 0.30)

| Document | Importance | Buyer Explanation |
|---|---|---|
| Annual Financial Statements (3 years) | Required | "Buyers need 3 years of audited or reviewed financials to assess trend lines, margins, and revenue quality. This is the first document requested in every deal." |
| Monthly P&L (trailing 12 months) | Required | "Monthly granularity reveals seasonality, one-time events, and run-rate accuracy. Buyers use this to validate annual numbers and project forward." |
| Balance Sheet (current) | Required | "Working capital, debt levels, and asset composition directly affect purchase price structure and cash-at-close calculations." |
| Tax Returns (3 years) | Required | "Required in 100% of acquisitions. Buyers cross-reference tax returns against financials. Discrepancies raise red flags that delay or kill deals." |
| Budget & Projections | Expected | "Projections show management credibility. Realistic, assumption-backed projections strengthen valuation. Aggressive projections without support damage credibility." |
| Accounts Receivable Aging | Expected | "AR aging reveals collection efficiency and revenue quality. High concentrations in 60-90+ days signal cash flow risk to buyers." |
| Debt Schedule | Expected | "Every acquisition involves assumption or payoff of debt. Buyers need a complete picture of all obligations to calculate true enterprise value." |
| Revenue by Customer | Helpful | "Revenue concentration analysis helps buyers assess customer dependency risk. Top 10 customers with percentages is standard." |

### Legal (6 documents, weight 0.20)

| Document | Importance | Buyer Explanation |
|---|---|---|
| Formation Documents | Required | "Articles of incorporation, certificates of formation, and amendments prove the entity's legal existence and authority to transact." |
| Operating Agreement / Bylaws | Required | "Governance documents reveal transfer restrictions, consent requirements, and authority provisions that directly affect deal structure." |
| Material Contracts | Required | "Contracts with customers, vendors, and partners are evaluated for assignment clauses, change-of-control provisions, and termination rights." |
| Litigation History | Expected | "Pending or threatened litigation is a deal-killer if undisclosed. A clean litigation summary builds confidence; surprises during DD destroy it." |
| Insurance Certificates | Expected | "Current coverage levels, claims history, and policy gaps are standard diligence items. Missing coverage creates post-close liability risk." |
| Licenses & Permits | Helpful | "Industry-specific licenses and permits must transfer with the business. Non-transferable licenses can delay or restructure deals." |

### Operations (5 documents, weight 0.15)

| Document | Importance | Buyer Explanation |
|---|---|---|
| Organizational Chart | Required | "Buyers need to understand the management team, reporting structure, and key person dependencies. The org chart is their first map of the business." |
| Key Processes & SOPs | Required | "Documented processes prove the business can run without the owner. This is the #1 transferability signal buyers evaluate." |
| Vendor Contracts | Expected | "Material vendor relationships, contract terms, and concentration risk affect operations continuity post-acquisition." |
| Facility Leases | Expected | "Lease terms, assignment provisions, and remaining obligations are standard diligence items that affect deal structure." |
| Equipment List | Helpful | "A depreciation schedule and condition assessment of major equipment helps buyers understand capital requirements." |

### Customers (4 documents, weight 0.15)

| Document | Importance | Buyer Explanation |
|---|---|---|
| Top Customer List | Required | "Revenue by customer with contract status shows concentration risk and revenue durability. This is evaluated in every deal." |
| Customer Contracts | Required | "Buyers review key customer contracts for terms, assignability, auto-renewal provisions, and termination clauses." |
| Customer Concentration Analysis | Expected | "A clear analysis of revenue concentration with mitigation strategy demonstrates management awareness and reduces buyer risk perception." |
| Sales Pipeline / Churn Data | Helpful | "Pipeline visibility and historical churn rates help buyers project future revenue and assess growth trajectory." |

### Team/HR (5 documents, weight 0.10)

| Document | Importance | Buyer Explanation |
|---|---|---|
| Employee Census | Required | "Headcount, tenure, roles, and compensation structure help buyers assess workforce stability and integration complexity." |
| Key Employee Agreements | Required | "Employment agreements for key employees — including non-competes, non-solicits, and IP assignments — protect deal value post-close." |
| Compensation Summary | Expected | "Total compensation including benefits, bonuses, and equity helps buyers model post-close operating costs." |
| Employee Handbook | Expected | "A current handbook demonstrates HR compliance and reduces post-close employment liability risk." |
| Benefit Plan Documents | Helpful | "Health, retirement, and equity plan details are needed to assess continuation costs and integration complexity." |

### IP/Tech (2 documents, weight 0.10)

| Document | Importance | Buyer Explanation |
|---|---|---|
| IP Assignment Agreements | Required | "Buyers verify that all intellectual property is owned by the entity, not individuals. Missing IP assignments can kill a deal in diligence." |
| Software Licenses / Tech Architecture | Expected | "Technology stack, third-party dependencies, and license compliance are evaluated for risk and scalability." |

## APPENDIX C: EXISTING FILE REFERENCE

| File | Disposition |
|---|---|
| `src/app/(dashboard)/dashboard/data-room/page.tsx` | Keep — becomes Mode 5 (Deal Room) entry point. Evidence gets its own route. |
| `src/components/dataroom/DocumentPreview.tsx` | Keep — reused by Evidence for document viewing |
| `src/components/dataroom/VersionHistory.tsx` | Keep — reused by Evidence for document replacement |
| `src/components/dataroom/AccessManager.tsx` | Keep — Mode 5 only |
| `src/components/dataroom/AnalyticsPanel.tsx` | Keep — Mode 5 only |
| `src/components/dataroom/ActivityFeed.tsx` | Keep — Mode 5 only |
| `src/components/dataroom/SearchFilters.tsx` | Keep — Mode 5 only |
| `src/components/dataroom/NotificationBell.tsx` | Keep — Mode 5 only |
| `src/components/dataroom/DocumentAnalytics.tsx` | Keep — Mode 5 only |
| `src/components/dataroom/UserAccessReport.tsx` | Keep — Mode 5 only |
| `src/lib/dataroom/dataroom-service.ts` | Keep and extend. Add evidence-specific query functions. |
| `src/lib/dataroom/default-folders.ts` | Keep — still used for underlying data room folder structure |
| `src/lib/dataroom/constants.ts` | Keep — add evidence category constants |
| `src/app/api/companies/[id]/dataroom/` (all routes) | Keep — used by Mode 5 and as backend for Evidence uploads |
| `src/app/api/tasks/[id]/proof/route.ts` | Keep and extend — add `evidenceCategory` assignment on proof upload |
| `prisma/schema.prisma` — DataRoomDocument | Keep and extend — add `evidenceCategory`, `expectedDocumentId`, `evidenceSource` fields |
| `prisma/schema.prisma` — all other DataRoom models | Keep — used by Mode 5 |
