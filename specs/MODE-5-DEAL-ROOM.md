# SPEC: Mode 5 — DEAL ROOM (The Execution Layer)

**Status:** Ready for Development
**Priority:** P2 — This is the expansion tier. It only matters after Modes 1-4 are working. But when it matters, it's the highest-value feature in the product — it's why someone pays $449/month. Build it right.
**Business Metric:** Revenue (Growth → Exit-Ready upgrade at $449/mo), Retention (active deal process = zero churn), Expansion (advisor referrals from impressed founders)
**Replaces:** Current `/dashboard/deal-tracker/` (DealTrackerDashboard, BuyerPipeline, BuyerCard, BuyerList, ProspectBuyerList), `/dashboard/data-room/` VDR features (access management, Q&A, analytics, watermarking — moved from Mode 4's simplified evidence view to full VDR here)

---

## 1. STRATEGIC CONTEXT

### Why This Exists

The Deal Room answers: **"I'm ready to sell. Help me run the process."**

The current system has two parallel deal tracking implementations (legacy `ProspectiveBuyer` and modern `Deal/DealBuyer` with Contact System v2), a 33-stage pipeline enum (`DealStage`), kanban boards that group those 33 stages into 8 columns, prospect import workflows, and a full VDR that lives on its own page. A founder looks at that and sees investment banker software. They don't think "I can use this." They think "I need to hire someone who understands this."

Mode 5 collapses all of this into a single Deal Room experience with three sections:

1. **Pipeline** — 6 visual stages, not 33. A founder can look at it and know exactly where every buyer stands.
2. **Data Room** — The full VDR (access control, watermarking, analytics, Q&A) activated from Mode 4's evidence library. Documents are already there. The Deal Room adds buyer-facing infrastructure.
3. **Activity Feed** — A unified timeline of everything happening across all buyers: stage changes, document views, meetings, offers.

The Deal Room only activates when the user has **earned** it: Evidence score 70%+, 90+ days on the platform, and Exit-Ready tier ($449/mo). This isn't feature gating — it's honest product design. A founder who tries to run a sale process at 12% evidence readiness will fail and blame the tool. Earned access protects both the user and the product.

### What Business Metric This Moves

- **Revenue (Tier Upgrade):** The Deal Room is the primary reason to upgrade from Growth ($179) to Exit-Ready ($449). The upgrade moment is earned — "Your evidence is 72% buyer-ready. Activate your Deal Room." — not sold with a features comparison page.
- **Retention (Active Deal = Zero Churn):** A founder managing active buyer conversations in Exit OSx is the lowest-churn user possible. They can't leave mid-process. The deal is in the tool. Their data room is live. Buyers are viewing documents. Churn is functionally zero during an active deal.
- **Expansion (Advisor Referrals):** Founders running deals hire advisors (M&A attorneys, CPAs, business brokers). When those advisors see Exit OSx's Deal Room, they think "my other clients should use this." One advisor referral = 3-5 new users.

### Current State vs. Desired State

| | Current | Desired |
|---|---|---|
| Systems | 2 parallel (ProspectiveBuyer + Deal/DealBuyer) | 1 unified Deal Room using the v2 Deal/DealBuyer system |
| Pipeline stages (UI) | 33 DealStage values shown in 8 kanban columns | 6 visual stages. Backend retains all 33 for data tracking. |
| Pipeline UX | Kanban board with drag-and-drop | Horizontal pipeline with buyer cards, click-to-manage |
| Data Room connection | Separate page (`/dashboard/data-room/`) | Integrated tab within Deal Room — same page, shared context |
| Activation | Always visible (gated by tier only) | Earned: Evidence 70%+ AND 90+ days AND Exit-Ready tier |
| Buyer addition | Complex modal with prospect import, CSV upload | Simplified "Add Buyer" with name + type + contact |
| Contacts | BuyerContact model with 7 roles | Simplified: Primary Contact + additional contacts. Roles optional. |
| Activity | Per-buyer activity log only | Unified activity feed across ALL buyers + data room |
| Offers | IOI/LOI amounts stored as fields | Dedicated offer comparison view with side-by-side |
| Analytics | Funnel, buyer mix, time-in-stage as separate API calls | Integrated dashboard showing engagement signals per buyer |

---

## 2. USER STORIES & SCENARIOS

### Primary User Stories

**US-1: First activation (Deal Room just unlocked)**
> As a business owner who just activated my Deal Room, I want to see my evidence library ready for buyer access, an empty pipeline with clear instructions on adding my first buyer, and confidence that I'm prepared to start the process.

**US-2: Adding first buyer**
> As a business owner starting outreach, I want to add a buyer with just a name, type, and contact email so that I can track them without filling out a complex form. I can add detail later.

**US-3: Managing active pipeline**
> As a business owner with 6 buyers at different stages, I want to see all of them at a glance — who's under NDA, who has an offer in, who's gone quiet — so that I can prioritize my time.

**US-4: Granting data room access**
> As a business owner who just executed an NDA with a buyer, I want to grant them data room access with the correct stage-based permissions, track what they view, and be notified when they engage with key documents.

**US-5: Comparing offers**
> As a business owner with 2 IOIs received, I want to compare them side-by-side — valuation, structure, terms, conditions — so that I can make an informed decision about which to advance.

**US-6: Running due diligence**
> As a business owner in due diligence with a selected buyer, I want to see what documents they've viewed, what questions they've asked, and what's still outstanding, so that I can keep the process moving.

### State Transitions

| State | Condition | What's Different |
|---|---|---|
| **Locked** | Evidence < 70% OR tenure < 90 days OR tier < Exit-Ready | Deal Room nav item shows lock icon. Click shows activation requirements with progress toward each. |
| **Ready to Activate** | All 3 criteria met, not yet activated | Deal Room nav item pulses subtly. Click shows activation prompt with CTA. |
| **Fresh** | Just activated, no buyers added | Welcome state with onboarding guidance. Pipeline is empty. Data Room tab shows evidence library. |
| **Building Pipeline** | 1-5 buyers, all in early stages | Pipeline shows buyers. Activity feed is sparse. Guidance: "Your next step is to send teasers to approved buyers." |
| **Active Process** | 3+ buyers past NDA, some viewing documents | Pipeline has meaningful distribution. Activity feed is busy. Data room analytics show engagement. |
| **Offer Stage** | 1+ IOIs or LOIs received | Offer comparison section appears. Urgency indicators on deadlines. Activity around key deal documents. |
| **Closing** | 1 buyer in DUE_DILIGENCE or later | Focus narrows to the selected buyer. Other buyers show as backup or withdrawn. DD checklist appears. |
| **Closed** | Deal closed | Celebration state. Summary of deal: valuation achieved, time to close, evidence score at close. Archive mode. |

### Edge Cases

**E-1: Evidence drops below 70% after activation**
Deal Room remains accessible (you can't yank it mid-process). Show a warning: "Your evidence score has dropped to 64%. Buyers may notice gaps. [Go to Evidence →]" Don't lock them out.

**E-2: User downgrades from Exit-Ready during active deal**
Show warning before downgrade: "You have an active deal with 4 buyers. Downgrading will deactivate your Deal Room and revoke all buyer access. Are you sure?" If they proceed, freeze the Deal Room (read-only, no new actions) rather than deleting data.

**E-3: Buyer goes silent (no activity in 14+ days)**
Show a subtle nudge on their card: "No activity in 16 days." Offer: "Send a check-in?" (future: email integration) or "Mark as withdrawn."

**E-4: Multiple deals simultaneously**
The v2 system supports multiple deals per company. For v1 of Mode 5, support ONE active deal. Show "You have an active deal. Close or terminate it before starting a new one." Multi-deal support is a future enhancement.

**E-5: Buyer requests access to documents that don't exist**
When a buyer asks a Q&A question about a document that isn't uploaded, surface it in the seller's activity feed with: "Buyer asked about [document type] — you don't have this uploaded. [Upload now →]" Links to Mode 4 evidence.

**E-6: User adds 20+ buyers**
Pipeline may get crowded. Show collapsed view for stages with 5+ buyers. Default sort within stage by tier (A → D) then recency.

---

## 3. DETAILED FUNCTIONAL REQUIREMENTS

### 3.1 Activation Gate

Before the Deal Room is accessible, three conditions must be met. This is checked on every navigation attempt.

```typescript
interface DealRoomActivation {
  evidenceReady: boolean        // Evidence score >= 70
  evidenceScore: number
  tenureReady: boolean          // Account age >= 90 days
  accountAgeDays: number
  tierReady: boolean            // Subscription tier = EXIT_READY
  currentTier: string
  isActivated: boolean          // User explicitly activated
  activatedAt: string | null
  canActivate: boolean          // All 3 conditions met
}
```

**Locked State UI:**
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  DEAL ROOM                                                       │
│                                                                  │
│  Your Deal Room activates when you're ready to run a             │
│  sale process. Here's where you stand:                           │
│                                                                  │
│  ✓ Evidence: 72% buyer-ready (70% required)                     │
│  ✓ Platform tenure: 94 days (90 required)                       │
│  ✗ Subscription: Growth (Exit-Ready required)                   │
│                                                                  │
│  [Upgrade to Exit-Ready →]                                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

When all three are met and user clicks "Activate Deal Room":
1. Set `dealRoomActivatedAt` on the Company model (new field)
2. Create the Deal record with a default code name ("Project [Company Adjective]")
3. Ensure the DataRoom exists (via `getOrCreateDataRoom`)
4. Navigate to the Deal Room page

### 3.2 Three-Tab Layout

The Deal Room has three tabs, always visible:

```
[Pipeline]  [Data Room]  [Activity]
```

**Pipeline** (default) — Buyer management with 6-stage visual pipeline
**Data Room** — Full VDR with access control, analytics, Q&A, watermarking
**Activity** — Unified timeline across all buyers and data room

### 3.3 Pipeline Tab

#### 6-Stage Visual Pipeline

```
IDENTIFIED → ENGAGED → UNDER NDA → OFFER RECEIVED → DILIGENCE → CLOSED
```

**Stage Mapping (UI → Backend):**

| Visual Stage | Backend DealStage Values | Description |
|---|---|---|
| **Identified** | IDENTIFIED, SELLER_REVIEWING, APPROVED | Buyer identified, may be under review |
| **Engaged** | TEASER_SENT, INTERESTED, NDA_SENT, NDA_NEGOTIATING | Active outreach, pre-NDA |
| **Under NDA** | NDA_EXECUTED, CIM_ACCESS, LEVEL_2_ACCESS, LEVEL_3_ACCESS, MANAGEMENT_MEETING_SCHEDULED, MANAGEMENT_MEETING_COMPLETED | NDA signed, sharing confidential info |
| **Offer Received** | IOI_REQUESTED, IOI_RECEIVED, IOI_ACCEPTED, LOI_REQUESTED, LOI_RECEIVED, LOI_SELECTED, LOI_BACKUP | Any offer-related activity |
| **Diligence** | DUE_DILIGENCE, PA_DRAFTING, PA_NEGOTIATING, CLOSING | Buyer selected, working toward close |
| **Closed** | CLOSED | Done |

**Exit stages** (DECLINED, PASSED, IOI_DECLINED, WITHDRAWN, TERMINATED) → shown in a collapsed "Exited (3)" section below the pipeline.

**Pipeline Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  YOUR PIPELINE                    8 buyers · 2 offers · 1 NDA   │
│                                                                  │
│  Identified    Engaged    Under NDA   Offers    Diligence  Close │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────┐  ┌────────┐  ┌──┐│
│  │ Acme   │  │ Vista  │  │ Silver │  │ Oak  │  │        │  │  ││
│  │ Corp   │  │ Equity │  │ Lake   │  │ Hill │  │        │  │  ││
│  │ Strat  │  │ Fin ·A │  │ Strat  │  │ Fin  │  │        │  │  ││
│  │        │  │        │  │ ·NDA   │  │ $3.2M│  │        │  │  ││
│  ├────────┤  ├────────┤  │ Oct 12 │  │ IOI  │  │        │  │  ││
│  │ Growth │  │ Tech   │  ├────────┤  ├──────┤  │        │  │  ││
│  │ Ptnrs  │  │ Hold.  │  │ River  │  │ Pine │  │        │  │  ││
│  │ Fin    │  │ Strat  │  │ Cap    │  │ Tree │  │        │  │  ││
│  │        │  │        │  │ Fin·B  │  │ Strat│  │        │  │  ││
│  │        │  │        │  │        │  │ $3.5M│  │        │  │  ││
│  │        │  │        │  │        │  │ LOI  │  │        │  │  ││
│  └────────┘  └────────┘  └────────┘  └──────┘  └────────┘  └──┘│
│                                                                  │
│  ─── Exited (3) ─────────────────────────────────────────────   │
│  Alpha Industries (Passed) · Beta Group (Withdrawn) · ...        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Buyer Card (In Pipeline)

Each buyer card shows:
- **Company name** (from DealBuyer → CanonicalCompany)
- **Buyer type** badge: Strategic / Financial / Individual
- **Tier** badge: A / B / C / D (only if set, not shown by default)
- **Sub-stage detail** (small text): "NDA Executed Oct 12" — the specific backend stage within the visual stage
- **Offer amount** (if IOI or LOI received): "$3.2M IOI"
- **Engagement indicator**: Hot (3+ doc views this week) / Warm (1-2) / Cold (none in 14+ days)

**Click Behavior:**
Clicking a buyer card opens a **Buyer Detail Panel** (slide-over from right, not a new page). Panel shows:
- Full buyer info (name, type, tier, contacts, rationale)
- Stage history timeline
- Data room engagement (documents viewed, time spent, last active)
- Offer details (if applicable)
- Meetings (scheduled and completed)
- Deal documents (NDA, IOI, LOI)
- Activity log (buyer-specific)
- Actions: Change Stage, Add Contact, Grant VDR Access, Log Meeting, Upload Document, Add Notes

#### Add Buyer Flow

**Simplified from current system.** Minimal fields to start, detail added later.

**Step 1:** Quick add form (inline, not modal)
```
Company Name: [_______________]
Type: [Strategic ▾]
Primary Contact: [name] [email]
Notes (optional): [_______________]

[Add to Pipeline →]
```

**On submit:**
1. Find or create `CanonicalCompany` (by name match)
2. Find or create `CanonicalPerson` (by email match)
3. Create `DealBuyer` with stage: IDENTIFIED
4. Create `DealContact` linked to buyer
5. Log activity
6. Buyer appears in "Identified" column

**No prospect import workflow in v1.** CSV import and prospect approval is advisor tooling, not founder tooling. If needed later, it lives in an admin or advisor portal.

#### Stage Change Flow

Clicking "Change Stage" on a buyer opens a stage selection panel.

**Shows only the 6 visual stages, not 33 backend stages.** When user selects a visual stage, map to the appropriate backend stage based on context:

```typescript
function resolveBackendStage(
  currentStage: DealStage,
  targetVisualStage: VisualStage,
  context: { hasNDA: boolean; hasIOI: boolean; hasLOI: boolean }
): DealStage {
  switch (targetVisualStage) {
    case 'identified': return DealStage.IDENTIFIED
    case 'engaged': return DealStage.TEASER_SENT
    case 'under_nda': return DealStage.NDA_EXECUTED
    case 'offer_received':
      if (context.hasLOI) return DealStage.LOI_RECEIVED
      return DealStage.IOI_RECEIVED
    case 'diligence': return DealStage.DUE_DILIGENCE
    case 'closed': return DealStage.CLOSED
  }
}
```

**Additional prompts on stage change:**
- Moving to "Under NDA": "Mark NDA as executed?" with date picker
- Moving to "Offer Received": "Enter offer details" (amount, type IOI/LOI, deadline)
- Moving to "Closed": "Congratulations! Enter final terms" (amount, date)
- Moving to "Exited": "Why did this buyer exit?" (Passed / Withdrawn / Declined + reason)

**VDR access auto-syncs** on stage change via existing `syncBuyerVDRAccess()` logic.

#### Offer Comparison View

When 2+ buyers have IOI or LOI amounts, show a comparison section above the pipeline:

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  OFFERS ON THE TABLE                                             │
│                                                                  │
│  ┌─────────────────┬─────────────────┐                          │
│  │ Oak Hill Capital │ Pine Tree Acq.  │                          │
│  │ Financial        │ Strategic       │                          │
│  │                  │                 │                          │
│  │ $3.2M IOI        │ $3.5M LOI       │                          │
│  │ Cash at close    │ 80% cash / 20%  │                          │
│  │                  │ earnout         │                          │
│  │ No exclusivity   │ 60-day excl.    │                          │
│  │                  │                 │                          │
│  │ Deadline: Nov 1  │ Deadline: Nov 15│                          │
│  │                  │                 │                          │
│  │ Engagement: 🟢   │ Engagement: 🟡   │                          │
│  │ 12 docs viewed   │ 4 docs viewed   │                          │
│  │                  │                 │                          │
│  │ [View Details]   │ [View Details]  │                          │
│  └─────────────────┴─────────────────┘                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Data Requirements:**
- Offer amount from `ioiAmount` or `loiAmount`
- Offer type from stage (IOI_RECEIVED vs LOI_RECEIVED)
- Deadline from `ioiDeadline` or `loiDeadline`
- Exclusivity from `exclusivityStart` / `exclusivityEnd`
- Engagement from VDR activity for buyer's contacts (doc views, downloads, last active)
- Structure/terms from `internalNotes` (free text, user-entered)

### 3.4 Data Room Tab

The Data Room tab surfaces the full VDR features that were hidden in Mode 4 (Evidence). The documents are the same — they were built up in Mode 4. The Deal Room adds the buyer-facing infrastructure.

**What Mode 4 (Evidence) provides:**
- Documents organized by 6 categories
- Evidence score and gaps
- Upload and versioning

**What Mode 5 (Deal Room) adds:**
- **Access Management** — Grant/revoke buyer access per stage
- **Stage-Gated Disclosure** — Teaser docs visible to ENGAGED buyers, full docs visible post-NDA
- **Watermarking** — PDFs watermarked with downloader's email on download
- **Download Analytics** — Who viewed what, when, for how long
- **Q&A System** — Buyers ask questions, seller responds
- **Activity Tracking** — Per-document, per-buyer engagement metrics

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  DATA ROOM                    Stage: Post-NDA · 3 buyers active │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Buyer Access                                              │  │
│  │                                                            │  │
│  │  Vista Equity  · Post-NDA · 8 docs viewed · Last: Oct 18  │  │
│  │  Silver Lake   · Post-NDA · 3 docs viewed · Last: Oct 15  │  │
│  │  River Cap     · Post-NDA · 1 doc viewed  · Last: Oct 12  │  │
│  │                                                            │  │
│  │  [Manage Access]                                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Documents by Category              18 docs · 72% ready   │  │
│  │  (Same view as Mode 4 Evidence, but with download stats)   │  │
│  │                                                            │  │
│  │  Financial    6 of 8  · 23 views · 8 downloads            │  │
│  │  Legal        4 of 6  · 12 views · 3 downloads            │  │
│  │  Operations   4 of 5  · 8 views  · 2 downloads            │  │
│  │  ...                                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Q&A (2 open questions)                                    │  │
│  │                                                            │  │
│  │  ? "Are customer contracts assignable?"                    │  │
│  │    Asked by Vista Equity · Oct 16 · Re: Customer Contracts │  │
│  │    [Answer]                                                │  │
│  │                                                            │  │
│  │  ? "What is the lease renewal date?"                       │  │
│  │    Asked by Silver Lake · Oct 14 · Re: Facility Lease      │  │
│  │    [Answer]                                                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Access Management:**
Reuses existing `DataRoomAccess` model and VDR sync logic. The "Manage Access" panel shows:
- Each buyer with their contacts
- Current access level (Viewer / Downloader) and max stage (Teaser / Post-NDA / DD)
- Toggle to grant/revoke per contact
- NDA status per contact
- Access auto-syncs with pipeline stage changes

**Document Analytics:**
Each document row shows aggregate stats (views, downloads across all buyers). Clicking a document shows per-buyer breakdown:
- Which buyer contacts viewed it
- How many times
- Time spent (from `DataRoomDocumentView.totalDuration`)
- Whether they downloaded

**Q&A Integration:**
Existing `DataRoomQuestion` and `DataRoomAnswer` models. Surface unanswered questions prominently. Threaded responses. Internal notes (not visible to buyers) supported.

### 3.5 Activity Tab

A unified timeline of everything happening in the deal process. This replaces per-buyer activity logs with a cross-buyer view that helps the founder see the big picture.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ACTIVITY                                        Last 30 days   │
│                                                                  │
│  Today                                                           │
│  ● Vista Equity viewed "Annual Financial Statements"    2:15 PM  │
│  ● Vista Equity downloaded "Customer Contracts"         1:30 PM  │
│  ● Silver Lake asked: "Are contracts assignable?"      11:00 AM  │
│                                                                  │
│  Yesterday                                                       │
│  ● Oak Hill Capital submitted IOI: $3.2M                4:00 PM  │
│  ● River Capital moved to Under NDA                    10:30 AM  │
│  ● You granted VDR access to River Capital             10:31 AM  │
│                                                                  │
│  Oct 15                                                          │
│  ● Silver Lake viewed 4 documents (Financial)           3:00 PM  │
│  ● Vista Equity completed management meeting           11:00 AM  │
│  ● Pine Tree Acquisitions moved to Engaged              9:00 AM  │
│                                                                  │
│  [Load more]                                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- `DealActivity2` (stage changes, contacts, meetings, documents)
- `DataRoomActivity` (document views, downloads, searches, Q&A)
- `DealStageHistory2` (stage transitions with timestamps)

**Filters:**
- By buyer (dropdown of all buyers)
- By type: Stage Changes / Document Activity / Meetings / Offers / Q&A
- By date range

**Engagement Signals:**
Surface important patterns automatically:
- "Vista Equity has viewed 12 documents in the last 3 days — high engagement" (green dot)
- "River Capital hasn't accessed the data room since Oct 12 — going cold?" (amber dot)
- "Oak Hill's IOI deadline is in 3 days" (red urgency)

### 3.6 API Changes

#### New Endpoint: `GET /api/companies/[id]/deal-room`

Primary endpoint for the Deal Room page. Returns everything needed for all three tabs.

```typescript
interface DealRoomResponse {
  // Activation status
  activation: DealRoomActivation

  // Deal info (null if not activated)
  deal: {
    id: string
    codeName: string
    status: DealStatus
    startedAt: string
    targetCloseDate: string | null
  } | null

  // Pipeline summary
  pipeline: {
    totalBuyers: number
    activeBuyers: number
    exitedBuyers: number
    offersReceived: number
    stages: Array<{
      visualStage: VisualStage
      label: string
      buyerCount: number
      buyers: Array<{
        id: string
        companyName: string
        buyerType: BuyerType
        tier: BuyerTier
        currentStage: DealStage       // backend stage
        stageUpdatedAt: string
        stageLabel: string            // human-readable backend stage
        primaryContact: {
          name: string
          email: string
          title: string | null
        } | null
        ioiAmount: number | null
        loiAmount: number | null
        offerType: 'IOI' | 'LOI' | null
        offerDeadline: string | null
        exclusivityEnd: string | null
        engagementLevel: 'hot' | 'warm' | 'cold' | 'none'
        lastActivity: string | null
        docViewsLast7Days: number
        internalNotes: string | null
        tags: string[]
      }>
    }>
    exitedBuyersSummary: Array<{
      id: string
      companyName: string
      exitStage: DealStage
      exitReason: string | null
      exitedAt: string
    }>
  }

  // Offers (for comparison view)
  offers: Array<{
    buyerId: string
    companyName: string
    buyerType: BuyerType
    offerType: 'IOI' | 'LOI'
    amount: number
    deadline: string | null
    exclusivityStart: string | null
    exclusivityEnd: string | null
    engagementLevel: 'hot' | 'warm' | 'cold'
    docViewsTotal: number
    lastActive: string | null
    notes: string | null
  }>

  // Data Room summary (for tab badge)
  dataRoom: {
    id: string
    stage: DataRoomStage
    activeBuyerAccessCount: number
    totalDocuments: number
    evidenceScore: number
    openQuestions: number
    recentViews: number               // last 7 days
    recentDownloads: number           // last 7 days
  }

  // Activity summary (for tab badge)
  recentActivityCount: number          // last 7 days
}
```

#### New Endpoint: `GET /api/companies/[id]/deal-room/activity`

Returns unified activity feed.

```typescript
interface DealRoomActivityResponse {
  activities: Array<{
    id: string
    type: 'stage_change' | 'document_view' | 'document_download' | 'question_asked' | 'question_answered' | 'meeting' | 'offer' | 'access_change' | 'note'
    buyerName: string | null
    buyerId: string | null
    contactName: string | null
    description: string
    metadata: Record<string, unknown>
    timestamp: string
    engagementSignal: 'positive' | 'neutral' | 'warning' | null
  }>
  hasMore: boolean
  cursor: string | null
}
```

#### New Endpoint: `POST /api/companies/[id]/deal-room/buyers`

Simplified buyer addition.

```typescript
interface AddBuyerBody {
  companyName: string
  buyerType: BuyerType
  contactName: string
  contactEmail: string
  contactTitle?: string
  notes?: string
}
```

#### Updated Endpoint: `PUT /api/deals/[dealId]/buyers/[buyerId]/stage`

Accepts visual stage and resolves to backend stage.

```typescript
interface StageChangeBody {
  visualStage?: VisualStage          // new: simplified stage
  backendStage?: DealStage           // existing: precise stage (optional override)
  notes?: string
  // Contextual fields based on stage
  ndaExecutedAt?: string
  offerAmount?: number
  offerType?: 'IOI' | 'LOI'
  offerDeadline?: string
  exclusivityStart?: string
  exclusivityEnd?: string
  exitReason?: string
  closedAmount?: number
  closedAt?: string
}
```

### 3.7 Data Model Changes

#### Company Model Addition

```prisma
model Company {
  // ... existing fields ...
  dealRoomActivatedAt  DateTime?  @map("deal_room_activated_at")
}
```

#### New Config: Visual Stage Mapping

```typescript
// src/lib/deal-room/visual-stages.ts

type VisualStage = 'identified' | 'engaged' | 'under_nda' | 'offer_received' | 'diligence' | 'closed'

const VISUAL_STAGES: Array<{
  id: VisualStage
  label: string
  color: string
  backendStages: DealStage[]
}> = [
  {
    id: 'identified',
    label: 'Identified',
    color: 'slate',
    backendStages: [DealStage.IDENTIFIED, DealStage.SELLER_REVIEWING, DealStage.APPROVED],
  },
  {
    id: 'engaged',
    label: 'Engaged',
    color: 'blue',
    backendStages: [DealStage.TEASER_SENT, DealStage.INTERESTED, DealStage.NDA_SENT, DealStage.NDA_NEGOTIATING],
  },
  {
    id: 'under_nda',
    label: 'Under NDA',
    color: 'indigo',
    backendStages: [DealStage.NDA_EXECUTED, DealStage.CIM_ACCESS, DealStage.LEVEL_2_ACCESS, DealStage.LEVEL_3_ACCESS, DealStage.MANAGEMENT_MEETING_SCHEDULED, DealStage.MANAGEMENT_MEETING_COMPLETED],
  },
  {
    id: 'offer_received',
    label: 'Offer Received',
    color: 'amber',
    backendStages: [DealStage.IOI_REQUESTED, DealStage.IOI_RECEIVED, DealStage.IOI_ACCEPTED, DealStage.LOI_REQUESTED, DealStage.LOI_RECEIVED, DealStage.LOI_SELECTED, DealStage.LOI_BACKUP],
  },
  {
    id: 'diligence',
    label: 'Diligence',
    color: 'purple',
    backendStages: [DealStage.DUE_DILIGENCE, DealStage.PA_DRAFTING, DealStage.PA_NEGOTIATING, DealStage.CLOSING],
  },
  {
    id: 'closed',
    label: 'Closed',
    color: 'emerald',
    backendStages: [DealStage.CLOSED],
  },
]

const EXIT_STAGES = [DealStage.DECLINED, DealStage.PASSED, DealStage.IOI_DECLINED, DealStage.WITHDRAWN, DealStage.TERMINATED]
```

#### No New Database Models Required

Mode 5 uses the existing v2 system (Deal, DealBuyer, DealContact, CanonicalCompany, CanonicalPerson) plus DataRoom models. The only schema change is `dealRoomActivatedAt` on Company.

### 3.8 Tier Gating

| Feature | Foundation (Free) | Growth ($179/mo) | Exit-Ready ($449/mo) |
|---|---|---|---|
| Deal Room nav item | Visible (locked) | Visible (locked) | Unlockable (when earned) |
| Activation requirements view | Yes (see progress) | Yes (see progress) | Yes (activate when ready) |
| Pipeline management | No | No | Yes |
| Data Room access control | No | No | Yes |
| Buyer VDR access grants | No | No | Yes |
| Watermarked downloads | No | No | Yes |
| Q&A system | No | No | Yes |
| Activity analytics | No | No | Yes |
| Offer comparison | No | No | Yes |

The Deal Room is exclusively Exit-Ready. No feature previews at lower tiers. The value of the Deal Room is communicated through Mode 4's Deal Room teaser, not through partial access.

---

## 4. DESIGN SPECIFICATIONS

### 4.1 Page Layout

```
Page: /dashboard/deal-room
Max width: 1200px (wider than other modes — pipeline needs horizontal space)
Padding: px-6 py-8
Background: var(--background)
```

### 4.2 Tab Navigation

```
Container: border-b border-border/50 mb-6

Tabs: flex gap-6
Each tab: pb-3 text-sm font-medium cursor-pointer transition-colors
  Active: text-foreground border-b-2 border-[var(--burnt-orange)]
  Inactive: text-muted-foreground hover:text-foreground

Tab badges:
  Pipeline: shows buyer count — "Pipeline (8)"
  Data Room: shows open questions — "Data Room" or "Data Room (2)" if questions pending
  Activity: shows unread count — "Activity" or "Activity (5)" if new items
```

### 4.3 Pipeline

```
Stage columns: grid grid-cols-6 gap-3

Column header:
  text-xs font-semibold tracking-wider text-muted-foreground uppercase
  Count badge: text-xs font-medium text-muted-foreground ml-1

Column container:
  min-h-[200px] rounded-lg bg-muted/20 border border-border/20 p-2

Buyer cards within column:
  rounded-lg bg-card border border-border/50 p-3 mb-2 cursor-pointer
  hover:border-[var(--burnt-orange)]/30 hover:shadow-sm transition-all

  Company name: text-sm font-medium text-foreground truncate
  Type badge: text-[10px] font-medium px-1.5 py-0.5 rounded-full
    Strategic: bg-blue-100 text-blue-700
    Financial: bg-purple-100 text-purple-700
    Individual: bg-amber-100 text-amber-700
  Tier badge (if set): text-[10px] font-medium ml-1
  Sub-stage: text-[10px] text-muted-foreground mt-1
  Offer amount (if present): text-xs font-semibold text-[var(--burnt-orange)] mt-1

Engagement dot on card:
  w-2 h-2 rounded-full absolute top-2 right-2
  Hot: bg-emerald-500 (3+ views this week)
  Warm: bg-amber-500 (1-2 views)
  Cold: bg-muted-foreground/30 (no views 14+ days)
  None: hidden (no VDR access yet)

Exited section:
  mt-4 border-t border-border/30 pt-3
  "Exited (3)" — text-xs text-muted-foreground cursor-pointer
  Collapsed by default. Expands to show exited buyers with reason.
```

### 4.4 Buyer Detail Panel (Slide-Over)

```
Panel: fixed inset-y-0 right-0 w-[500px] bg-card border-l border-border shadow-xl z-50
Backdrop: fixed inset-0 bg-black/20 z-40

Header:
  p-6 border-b border-border/50
  Company name: text-lg font-semibold
  Type + tier badges inline
  Close button: absolute top-4 right-4

Content: p-6 overflow-y-auto
  Sections (collapsible):
  - Overview (contacts, rationale, notes)
  - Stage History (timeline)
  - Data Room Engagement (docs viewed, time spent)
  - Offers (IOI/LOI details)
  - Meetings (scheduled + completed)
  - Deal Documents (NDA, CIM, etc.)
  - Activity Log (buyer-specific)

Actions (sticky bottom):
  p-4 border-t border-border/50 bg-card
  [Change Stage ▾]  [Add Contact]  [Log Meeting]  [...More]
```

### 4.5 Offer Comparison

```
Container: rounded-xl border border-amber-200/50 bg-amber-50/30 dark:bg-amber-900/10 p-6 mb-6
Only visible when 2+ offers exist

Header: "OFFERS ON THE TABLE" — text-sm font-semibold tracking-wider text-muted-foreground uppercase

Cards: grid grid-cols-2 gap-4 mt-4 (or grid-cols-3 if 3 offers)

Each offer card:
  rounded-lg border border-border/50 bg-card p-4
  Company: text-sm font-semibold
  Type: text-xs text-muted-foreground
  Amount: text-xl font-bold text-[var(--burnt-orange)] mt-2
  Type label: text-xs text-muted-foreground — "IOI" or "LOI"
  Terms: text-xs text-muted-foreground mt-2 (from notes, multiline)
  Deadline: text-xs mt-2
    > 7 days: text-muted-foreground
    3-7 days: text-amber-600
    < 3 days: text-rose-600 font-medium
  Engagement: text-xs mt-2 with dot indicator
  [View Details]: text-xs text-[var(--burnt-orange)] mt-3
```

### 4.6 Activity Feed

```
Container: space-y-6

Date groups:
  Date header: text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background py-2

Activity items: space-y-2

Each item: flex gap-3 py-2 px-2 rounded hover:bg-muted/20

  Dot: w-2 h-2 rounded-full mt-2 flex-shrink-0
    stage_change: bg-blue-500
    document_view: bg-emerald-500
    document_download: bg-purple-500
    question: bg-amber-500
    meeting: bg-indigo-500
    offer: bg-[var(--burnt-orange)]
    access: bg-slate-500

  Content:
    Description: text-sm text-foreground
    Buyer name bold, action normal weight
    e.g., "**Vista Equity** viewed Annual Financial Statements"

  Timestamp: text-xs text-muted-foreground ml-auto flex-shrink-0

Engagement signals (inline):
  Appears as a highlighted row with background
  bg-emerald-50/50 border-l-2 border-emerald-500: positive signal
  bg-amber-50/50 border-l-2 border-amber-500: warning signal
```

### 4.7 Locked State

```
Container: flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto

Icon: Lock from lucide — w-12 h-12 text-muted-foreground/40

Title: "Deal Room" — text-xl font-semibold text-foreground mt-4
Subtitle: "Your Deal Room activates when you're ready to run a sale process."
  — text-sm text-muted-foreground mt-2

Requirements: mt-8 space-y-3 text-left w-full

Each requirement: flex items-center gap-3
  Met: ✓ icon text-emerald-500 + text-foreground
  Not met: ✗ icon text-muted-foreground + text-muted-foreground
  Progress: show percentage or days

CTA (when all met): mt-8
  [Activate Deal Room →] — primary button bg-[var(--burnt-orange)]

CTA (when not met): mt-8
  Show the blocker CTA:
  If tier: [Upgrade to Exit-Ready →]
  If evidence: [Build Your Evidence →] (links to Mode 4)
  If tenure: "Available in {n} days"
```

### 4.8 Animations

```typescript
// Pipeline card hover
// Scale 1 → 1.02 on hover with shadow increase

// Buyer detail panel
// Slide in from right: x: 500 → 0, duration: 0.3s
// Backdrop: opacity 0 → 0.2

// Stage change
// Card animates from old column to new column position
// Old column count decrements, new increments

// Offer card urgency
// Deadline < 3 days: subtle pulse animation on deadline text

// Activity feed new items
// Slide down from top: y: -20 → 0, opacity: 0 → 1

// Engagement dot
// Hot: gentle pulse animation (scale 1 → 1.3 → 1, 2s loop)
```

### 4.9 Loading State

```
Skeleton:
  - Tab bar: visible immediately
  - Pipeline: 6 column skeletons h-[300px]
  - Offer section: h-40 skeleton (if applicable)
  - Activity: 5x h-10 skeletons staggered

TanStack Query:
  staleTime: 30_000
  refetchOnWindowFocus: true
  refetchInterval: 120_000  (2 minutes — deal activity is time-sensitive)
```

### 4.10 Mobile Responsiveness

```
< 640px (mobile):
  Pipeline: horizontal scroll with snap points (one stage visible at a time)
  Buyer cards: full-width within stage column
  Buyer detail: full-screen sheet (not side panel)
  Offer comparison: stacked vertically
  Activity: full-width, same layout but tighter spacing

640px-1024px (tablet):
  Pipeline: 3 columns visible, scroll for rest
  Buyer detail: 400px side panel
  max-width: 100% with px-4

> 1024px (desktop):
  Pipeline: all 6 columns visible
  max-width: 1200px centered
```

---

## 5. ENGAGEMENT HOOKS

### 5.1 Active Deal = Zero Churn

The Deal Room is the ultimate retention mechanism. A founder with buyers in the pipeline, documents being viewed, and offers pending cannot leave the platform. The switching cost is too high — their entire deal process lives here. This isn't a feature play; it's a business reality. Active Deal Room users should have <1% monthly churn.

### 5.2 Engagement Signals Drive Action

The activity feed surfaces buyer engagement patterns that create urgency:
- "Vista Equity viewed 12 documents in 3 days" → Buyer is serious, prioritize them
- "River Capital hasn't accessed the data room in 16 days" → Buyer may be losing interest, reach out
- "Oak Hill's IOI deadline is in 3 days" → Time pressure, make a decision

These signals give the founder something to DO every time they log in. Without them, the Deal Room is a static tracker. With them, it's a real-time command center.

### 5.3 Offer Comparison Creates Clarity

When 2+ offers are on the table, the comparison view helps founders make informed decisions instead of going with gut feel. This is Martell's "speed to clarity" — the faster a founder can evaluate offers, the better their outcome. The tool earns its $449/month by preventing a bad deal decision.

### 5.4 Data Room Analytics Build Confidence

Seeing buyers actively engage with documents ("Vista Equity downloaded your financials and spent 45 minutes reviewing them") builds seller confidence. Confident sellers negotiate better. Better negotiations mean better outcomes. Better outcomes mean stronger testimonials and referrals.

### 5.5 Analytics Events

| Event | Trigger | Properties |
|---|---|---|
| `deal_room_activated` | User activates Deal Room | `{ evidenceScore, accountAgeDays }` |
| `deal_room_viewed` | Page load | `{ tab, buyerCount, offerCount }` |
| `buyer_added` | New buyer created | `{ buyerType, hasContact }` |
| `buyer_stage_changed` | Stage updated | `{ buyerId, fromVisualStage, toVisualStage, fromBackendStage, toBackendStage }` |
| `buyer_detail_opened` | Click on buyer card | `{ buyerId, visualStage }` |
| `buyer_exited` | Buyer marked as exited | `{ buyerId, exitStage, exitReason }` |
| `offer_recorded` | IOI/LOI amount entered | `{ buyerId, offerType, amount }` |
| `offer_comparison_viewed` | Offers section scrolled into view | `{ offerCount }` |
| `vdr_access_granted` | Access granted to buyer contact | `{ buyerId, contactId, maxStage }` |
| `vdr_access_revoked` | Access revoked from contact | `{ buyerId, contactId }` |
| `qa_question_received` | Buyer asks question | `{ buyerId, hasDocumentContext }` |
| `qa_answer_sent` | Seller answers question | `{ questionId, responseTime }` |
| `activity_feed_viewed` | Activity tab opened | `{ activityCount }` |
| `engagement_signal_shown` | Hot/warm/cold signal displayed | `{ buyerId, level, docViews }` |
| `deal_closed` | Deal marked as closed | `{ finalAmount, daysToClose, buyerCount, evidenceScore }` |

---

## 6. TECHNICAL GUIDANCE

### 6.1 Component Architecture

```
src/components/deal-room/
├── DealRoomPage.tsx               # Page orchestrator (activation check, tab routing)
├── ActivationGate.tsx             # Locked/ready-to-activate state
├── DealRoomTabs.tsx               # Tab navigation with badges
│
├── pipeline/
│   ├── PipelineView.tsx           # 6-stage pipeline with buyer cards
│   ├── PipelineColumn.tsx         # Single stage column
│   ├── BuyerCard.tsx              # Compact buyer card in pipeline
│   ├── BuyerDetailPanel.tsx       # Slide-over with full buyer info
│   │   ├── BuyerOverview.tsx      # Name, type, contacts, notes
│   │   ├── StageHistory.tsx       # Stage change timeline
│   │   ├── BuyerEngagement.tsx    # VDR activity for this buyer
│   │   ├── OfferDetails.tsx       # IOI/LOI details
│   │   ├── BuyerMeetings.tsx      # Meeting list
│   │   ├── BuyerDocuments.tsx     # Deal-specific documents
│   │   └── BuyerActivityLog.tsx   # Per-buyer activity
│   ├── AddBuyerForm.tsx           # Inline quick-add form
│   ├── StageChangeFlow.tsx        # Stage selection with contextual prompts
│   ├── OfferComparison.tsx        # Side-by-side offer cards
│   └── ExitedBuyersSection.tsx    # Collapsed exited buyers
│
├── data-room/
│   ├── DealDataRoom.tsx           # VDR view with buyer context
│   ├── BuyerAccessPanel.tsx       # Access management per buyer
│   ├── DocumentAnalytics.tsx      # Per-document view/download stats
│   └── QASection.tsx              # Questions and answers
│
├── activity/
│   ├── ActivityFeed.tsx           # Unified activity timeline
│   ├── ActivityItem.tsx           # Single activity row
│   ├── EngagementSignal.tsx       # Hot/warm/cold indicators
│   └── ActivityFilters.tsx        # Buyer, type, date filters
│
└── shared/
    ├── BuyerTypeBadge.tsx         # Strategic/Financial/Individual badge
    ├── TierBadge.tsx              # A/B/C/D tier badge
    ├── EngagementDot.tsx          # Hot/warm/cold dot indicator
    └── OfferAmount.tsx            # Formatted offer amount with type
```

### 6.2 Data Fetching

```typescript
// Primary query — all Deal Room data
const { data, isLoading } = useQuery({
  queryKey: ['deal-room', companyId],
  queryFn: () => fetch(`/api/companies/${companyId}/deal-room`).then(r => r.json()),
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchInterval: 120_000,
  enabled: isActivated,  // don't fetch if not activated
})

// Activity feed — paginated, loaded on tab switch
const {
  data: activityData,
  fetchNextPage,
  hasNextPage,
} = useInfiniteQuery({
  queryKey: ['deal-room', 'activity', companyId, filters],
  queryFn: ({ pageParam }) =>
    fetch(`/api/companies/${companyId}/deal-room/activity?cursor=${pageParam ?? ''}&buyer=${filters.buyer}&type=${filters.type}`).then(r => r.json()),
  getNextPageParam: (lastPage) => lastPage.cursor,
  enabled: activeTab === 'activity',
})

// Buyer detail — loaded when panel opens
const { data: buyerDetail } = useQuery({
  queryKey: ['deal-room', 'buyer', selectedBuyerId],
  queryFn: () => fetch(`/api/deals/${dealId}/buyers/${selectedBuyerId}`).then(r => r.json()),
  enabled: !!selectedBuyerId,
})

// Stage change mutation
const changeStage = useMutation({
  mutationFn: ({ buyerId, visualStage, ...contextFields }) =>
    fetch(`/api/deals/${dealId}/buyers/${buyerId}/stage`, {
      method: 'PUT',
      body: JSON.stringify({ visualStage, ...contextFields }),
    }),
  onSuccess: () => {
    queryClient.invalidateQueries(['deal-room', companyId])
  },
})

// Add buyer mutation
const addBuyer = useMutation({
  mutationFn: (body: AddBuyerBody) =>
    fetch(`/api/companies/${companyId}/deal-room/buyers`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  onSuccess: () => {
    queryClient.invalidateQueries(['deal-room', companyId])
  },
})
```

### 6.3 Visual Stage Resolution

```typescript
// src/lib/deal-room/visual-stages.ts

export function getVisualStage(backendStage: DealStage): VisualStage | 'exited' {
  for (const vs of VISUAL_STAGES) {
    if (vs.backendStages.includes(backendStage)) return vs.id
  }
  if (EXIT_STAGES.includes(backendStage)) return 'exited'
  return 'identified'  // fallback
}

export function resolveBackendStage(
  currentStage: DealStage,
  targetVisual: VisualStage,
  context: {
    hasNDA?: boolean
    hasIOI?: boolean
    hasLOI?: boolean
    ndaExecutedAt?: string
    offerAmount?: number
    offerType?: 'IOI' | 'LOI'
  }
): DealStage {
  // Find the most appropriate backend stage based on visual stage + context
  switch (targetVisual) {
    case 'identified':
      return DealStage.IDENTIFIED
    case 'engaged':
      return DealStage.TEASER_SENT
    case 'under_nda':
      return DealStage.NDA_EXECUTED
    case 'offer_received':
      if (context.offerType === 'LOI' || context.hasLOI) return DealStage.LOI_RECEIVED
      if (context.offerType === 'IOI' || context.hasIOI) return DealStage.IOI_RECEIVED
      return DealStage.IOI_RECEIVED
    case 'diligence':
      return DealStage.DUE_DILIGENCE
    case 'closed':
      return DealStage.CLOSED
  }
}

export function calculateEngagementLevel(
  docViewsLast7Days: number,
  lastActivityDaysAgo: number | null
): 'hot' | 'warm' | 'cold' | 'none' {
  if (lastActivityDaysAgo === null) return 'none'
  if (docViewsLast7Days >= 3) return 'hot'
  if (docViewsLast7Days >= 1 || lastActivityDaysAgo <= 7) return 'warm'
  if (lastActivityDaysAgo > 14) return 'cold'
  return 'warm'
}
```

### 6.4 Consolidating Two Systems

The codebase has two parallel deal tracking systems. Mode 5 uses **only the v2 system** (Deal, DealBuyer, DealContact, CanonicalCompany, CanonicalPerson).

**Migration strategy:**
1. Mode 5 builds exclusively on v2 models
2. Legacy ProspectiveBuyer data can be migrated to v2 via a one-time migration script
3. Legacy API routes (`/api/companies/[id]/deal-tracker/`) remain functional for backwards compatibility but are not used by Mode 5 UI
4. After Mode 5 launch, deprecate legacy routes

**What to keep from legacy system:**
- VDR sync logic (`vdr-sync.ts`) — works with both systems, keep as-is
- Stage transition validation (`constants.ts` — `VALID_STAGE_TRANSITIONS`) — keep for backend validation
- Stage labels and colors — adapt for visual stages
- Activity types — reuse for unified activity feed

### 6.5 Performance Requirements

| Metric | Target |
|---|---|
| Deal Room page load | < 400ms |
| Pipeline render (20 buyers) | < 200ms |
| Buyer detail panel open | < 300ms |
| Stage change (including VDR sync) | < 500ms |
| Activity feed load (50 items) | < 300ms |
| Activity feed pagination | < 200ms |
| Add buyer | < 400ms |
| Engagement calculation per buyer | < 50ms |

### 6.6 Testing Requirements

**Unit Tests:**
- Visual stage mapping: verify all 33 backend stages map to exactly one of 6 visual stages
- Stage resolution: verify `resolveBackendStage()` returns valid backend stages
- Engagement calculation: verify hot/warm/cold thresholds
- Activation gate: verify all 3 conditions (evidence, tenure, tier) are checked
- Offer comparison: verify offers sorted and formatted correctly

**Integration Tests:**
- Add buyer flow: create buyer → appears in pipeline → buyer detail accessible
- Stage change flow: change visual stage → backend stage updates → VDR access syncs → activity logged
- VDR access: buyer moves to Under NDA → contacts get Post-NDA access → can view documents
- Offer recording: enter IOI amount → offer comparison appears → deadline tracking active
- Activity feed: perform actions across buyers → all appear in unified feed with correct timestamps

**E2E Tests:**
- Full deal lifecycle: activate Deal Room → add buyer → progress through stages → record offer → close deal
- Access control: grant access → buyer views document → seller sees analytics → revoke access
- Q&A flow: buyer asks question → seller notified → seller answers → buyer sees answer

---

## 7. LAUNCH PLAN

### Sprint 1: Activation + Pipeline (MVP)

**Deliverables:**
- [ ] Activation gate component with 3-condition check
- [ ] Database migration: add `dealRoomActivatedAt` to Company
- [ ] `DealRoomPage.tsx` with activation check and tab routing
- [ ] `PipelineView.tsx` with 6-stage columns
- [ ] `BuyerCard.tsx` compact card for pipeline
- [ ] `AddBuyerForm.tsx` inline quick-add (name + type + contact)
- [ ] Visual stage mapping config (`src/lib/deal-room/visual-stages.ts`)
- [ ] `StageChangeFlow.tsx` with visual stage selection + contextual prompts
- [ ] New API endpoint: `GET /api/companies/[id]/deal-room`
- [ ] New API endpoint: `POST /api/companies/[id]/deal-room/buyers`
- [ ] Updated stage change endpoint accepting `visualStage`
- [ ] Route: `/dashboard/deal-room`
- [ ] Nav item: "Deal Room" with lock indicator for non-activated users
- [ ] Redirect legacy routes: `/dashboard/deal-tracker/` → `/dashboard/deal-room`

**NOT in Sprint 1:** Buyer detail panel, offer comparison, Data Room tab, Activity tab, engagement signals.

### Sprint 2: Buyer Detail + Offers + Data Room

**Deliverables:**
- [ ] `BuyerDetailPanel.tsx` slide-over with all sections
- [ ] Stage history timeline within buyer detail
- [ ] `OfferComparison.tsx` side-by-side view (2+ offers)
- [ ] IOI/LOI recording in stage change flow
- [ ] Deadline tracking with urgency indicators
- [ ] `DealDataRoom.tsx` tab with buyer access panel
- [ ] `BuyerAccessPanel.tsx` showing per-buyer access levels
- [ ] VDR access auto-sync on stage change (existing logic, wired to new UI)
- [ ] Document analytics per category (views, downloads)
- [ ] `QASection.tsx` with open questions and response flow
- [ ] Engagement dot calculation and display on buyer cards
- [ ] `ExitedBuyersSection.tsx` collapsed section

### Sprint 3: Activity Feed + Analytics + Polish

**Deliverables:**
- [ ] `ActivityFeed.tsx` unified timeline across all sources
- [ ] Activity feed pagination with infinite scroll
- [ ] Activity filters (buyer, type, date range)
- [ ] Engagement signals (hot/warm/cold with explanatory text)
- [ ] Per-buyer VDR engagement in buyer detail panel
- [ ] Deal closed celebration state and summary
- [ ] New API endpoint: `GET /api/companies/[id]/deal-room/activity`
- [ ] Analytics events for all Deal Room interactions
- [ ] Mobile responsiveness (horizontal scroll pipeline, full-screen buyer detail)
- [ ] Performance optimization (lazy load buyer details, virtualize activity feed)
- [ ] Legacy data migration script (ProspectiveBuyer → DealBuyer)

### Success Metrics (30 days post-launch)

| Metric | Current Baseline | Target |
|---|---|---|
| Growth → Exit-Ready upgrade rate | ~5% (estimated) | 15%+ |
| Deal Room activation rate (eligible users) | N/A | 60% within 7 days of eligibility |
| Buyers added per activated user | N/A | 5+ in first month |
| Active deals (1+ buyer past Engaged) | N/A | 40% of activated users |
| Offers received per active deal | N/A | 1.5+ average |
| Monthly churn of users with active deals | N/A | < 1% |
| Avg time from activation to first offer | N/A | < 45 days |
| Data room document views per active deal | N/A | 20+ per month |
| Q&A response time (seller answers) | N/A | < 24 hours median |

---

## APPENDIX A: COPY TABLE

| Element | Copy |
|---|---|
| Nav item (locked) | Deal Room 🔒 |
| Nav item (ready) | Deal Room ✨ |
| Nav item (active) | Deal Room |
| Page title | YOUR PIPELINE |
| Pipeline stats | `{n} buyers · {n} offers · {n} under NDA` |
| Tab: Pipeline | Pipeline ({n}) |
| Tab: Data Room | Data Room |
| Tab: Data Room (questions) | Data Room ({n}) |
| Tab: Activity | Activity |
| Tab: Activity (new) | Activity ({n}) |
| Visual stage: Identified | Identified |
| Visual stage: Engaged | Engaged |
| Visual stage: Under NDA | Under NDA |
| Visual stage: Offer Received | Offer Received |
| Visual stage: Diligence | Diligence |
| Visual stage: Closed | Closed |
| Exited section | Exited ({n}) |
| Offer section title | OFFERS ON THE TABLE |
| Offer deadline > 7 days | Deadline: {date} |
| Offer deadline 3-7 days | Deadline: {date} (this week) |
| Offer deadline < 3 days | Deadline: {date} — action required |
| Engagement: hot | High engagement — {n} docs viewed this week |
| Engagement: warm | Active — last activity {date} |
| Engagement: cold | No activity in {n} days |
| Add buyer CTA | Add Buyer |
| Quick add placeholder | Company name... |
| Empty pipeline | Your pipeline is empty. Add your first buyer to start tracking the process. |
| Locked: title | Deal Room |
| Locked: subtitle | Your Deal Room activates when you're ready to run a sale process. |
| Locked: evidence met | ✓ Evidence: {n}% buyer-ready |
| Locked: evidence not met | ○ Evidence: {n}% buyer-ready (70% required) |
| Locked: tenure met | ✓ Platform tenure: {n} days |
| Locked: tenure not met | ○ Platform tenure: {n} days (90 required) |
| Locked: tier met | ✓ Subscription: Exit-Ready |
| Locked: tier not met | ○ Subscription: {tier} (Exit-Ready required) |
| Locked: CTA (tier) | Upgrade to Exit-Ready |
| Locked: CTA (evidence) | Build Your Evidence |
| Locked: CTA (tenure) | Available in {n} days |
| Activation CTA | Activate Deal Room |
| Closed celebration | Deal Closed |
| Closed summary | Congratulations. You sold your business for ${X}. The process took {n} days with {n} buyers evaluated. |
| Evidence drop warning | Your evidence score has dropped to {n}%. Buyers may notice gaps. |
| Downgrade warning | You have an active deal with {n} buyers. Downgrading will deactivate your Deal Room and revoke all buyer access. |
| Buyer silent nudge | No activity in {n} days |
| Buyer silent options | Send a check-in / Mark as withdrawn |
| Q&A: open questions | {n} open questions |
| Activity: date group | Today / Yesterday / {date} |
| Activity: load more | Load more |

## APPENDIX B: VISUAL STAGE → BACKEND STAGE REFERENCE

| Visual Stage | Backend Stages | VDR Access | Notes |
|---|---|---|---|
| Identified | IDENTIFIED, SELLER_REVIEWING, APPROVED | None | Pre-outreach. Internal tracking only. |
| Engaged | TEASER_SENT, INTERESTED, NDA_SENT, NDA_NEGOTIATING | Teaser (Viewer) | Active outreach. Teaser docs visible. |
| Under NDA | NDA_EXECUTED, CIM_ACCESS, LEVEL_2_ACCESS, LEVEL_3_ACCESS, MANAGEMENT_MEETING_SCHEDULED, MANAGEMENT_MEETING_COMPLETED | Post-NDA (Downloader) | Confidential info shared. CIM, financials accessible. |
| Offer Received | IOI_REQUESTED, IOI_RECEIVED, IOI_ACCEPTED, LOI_REQUESTED, LOI_RECEIVED, LOI_SELECTED, LOI_BACKUP | Post-NDA (Downloader) | Offer in play. Amounts and deadlines tracked. |
| Diligence | DUE_DILIGENCE, PA_DRAFTING, PA_NEGOTIATING, CLOSING | Due Diligence (Downloader) | Selected buyer. Full DD access. |
| Closed | CLOSED | Closed (Viewer) | Deal complete. Archive mode. |
| Exited | DECLINED, PASSED, IOI_DECLINED, WITHDRAWN, TERMINATED | Revoked | Buyer out of process. |

## APPENDIX C: EXISTING FILE REFERENCE

| File | Disposition |
|---|---|
| `src/app/(dashboard)/dashboard/deal-tracker/` (all pages) | Redirect to `/dashboard/deal-room`. Keep API routes for legacy compat. |
| `src/components/deal-tracker/DealTrackerDashboard.tsx` | Retire. Replaced by `DealRoomPage.tsx` |
| `src/components/deal-tracker/BuyerPipeline.tsx` | Retire. Replaced by `PipelineView.tsx` with 6 visual stages |
| `src/components/deal-tracker/BuyerCard.tsx` | Retire. Replaced by new `BuyerCard.tsx` (simpler) |
| `src/components/deal-tracker/BuyerList.tsx` | Retire. Table view eliminated in favor of pipeline-only |
| `src/components/deal-tracker/ProspectBuyerList.tsx` | Retire. Prospect import is not founder tooling. |
| `src/components/deal-tracker/StageChangeModal.tsx` | Retire. Replaced by `StageChangeFlow.tsx` with visual stages |
| `src/components/deal-tracker/AddBuyerModal.tsx` | Retire. Replaced by `AddBuyerForm.tsx` (inline, simpler) |
| `src/components/deals/DealBuyerPipeline.tsx` | Retire. Replaced by `PipelineView.tsx` |
| `src/components/deals/DealBuyerCard.tsx` | Retire. Replaced by new `BuyerCard.tsx` |
| `src/components/deals/AddBuyerToDealModal.tsx` | Retire. Replaced by `AddBuyerForm.tsx` |
| `src/lib/deal-tracker/constants.ts` | Keep — stage labels, colors, transition validation used by backend |
| `src/lib/deal-tracker/vdr-sync.ts` | Keep — VDR access sync logic is correct, used by Mode 5 |
| `src/app/api/companies/[id]/deal-tracker/` (all routes) | Keep for backwards compat. Not used by Mode 5 UI. |
| `src/app/api/deals/` (all routes) | Keep and extend. Mode 5 builds on v2 deal system. |
| `src/components/dataroom/DocumentPreview.tsx` | Keep — reused in Data Room tab |
| `src/components/dataroom/AccessManager.tsx` | Keep — reused/adapted for `BuyerAccessPanel.tsx` |
| `src/components/dataroom/AnalyticsPanel.tsx` | Keep — reused in Data Room tab |
| `src/components/dataroom/ActivityFeed.tsx` | Keep — feeds into unified activity |
| `src/components/dataroom/SearchFilters.tsx` | Keep — used in Data Room tab |
| `src/components/dataroom/NotificationBell.tsx` | Keep — used in Deal Room |
| `src/components/dataroom/DocumentAnalytics.tsx` | Keep — reused in Data Room tab |
| `src/lib/dataroom/dataroom-service.ts` | Keep — all functions used by Mode 5 |
| `prisma/schema.prisma` — Deal, DealBuyer, DealContact | Keep — primary models for Mode 5 |
| `prisma/schema.prisma` — CanonicalCompany, CanonicalPerson | Keep — identity models for buyer/contact dedup |
| `prisma/schema.prisma` — ProspectiveBuyer (legacy) | Keep in schema. Not used by Mode 5 UI. Migrate data to v2. |
| `prisma/schema.prisma` — DataRoom, DataRoomAccess, etc. | Keep — used for VDR functionality in Mode 5 |
| `prisma/schema.prisma` — DealStage enum (33 values) | Keep — backend tracking. UI shows 6 visual stages mapped from these. |
