# Future Features

Deferred features and enhancements tracked for future implementation.

---

## Billing Ownership Transfer on User Deletion

**Context**: When an admin deletes a user who is the sole member of an organization, we now cascade-delete the orphaned org and its companies. However, when Stripe billing is live, we need additional handling:

- Cancel `stripeSubscriptionId` for deleted orgs before removing them
- For multi-member orgs, transfer billing ownership to another member if the deleted user was the billing contact
- Surface billing impact warnings in the admin UI danger zone

**Blocked on**: Stripe integration going live

**Related code**: `src/app/api/admin/users/[id]/route.ts` (DELETE handler)

---

# Beta Review Notes (Feb 13, 2026)

Items from product review prior to beta launch, organized by area.

---

## BETA INFRASTRUCTURE

### BF-001: Beta Feedback & Bug Reporting
- Add in-app mechanism for beta users to suggest features, report bugs, and request changes
- Should be easily accessible from anywhere in the app
- **Priority**: High (needed before beta launch)

### BF-002: Error Tracking & Logging
- Capture every error that occurs in production so we can proactively fix issues
- Consider integration with error tracking service (e.g. Sentry)
- **Priority**: High (needed before beta launch)

---

## ONBOARDING & ASSESSMENTS

### BF-003: Mandatory 6-Category Assessment in Onboarding
- Users currently can skip the initial assessment during onboarding
- The 6-category assessment is critical for generating relevant tasks
- Revamp onboarding flow so assessment cannot be skipped
- **Priority**: High

### BF-004: Replace Industry Lookup with Rich Business Description
- Remove the industry category lookup
- Replace with open-ended fields encouraging detailed business description: what they sell, who they sell to, what market they're in, etc.
- This richer data drives much better valuation multiples and relevance than a generalized industry category
- **Priority**: High

### BF-005: "I Don't Know" Option on Assessment Questions
- Add an "I don't know" escape hatch to all assessment questions
- Prevents users from stalling or abandoning assessments when they don't have an answer
- Especially important as assessments get more detailed
- **Priority**: Medium

---

## UI / LAYOUT

### BF-006: Company Name & BRI Score in Page Header
- Move company name and BRI score to the top of the page header area (left side)
- Remove company name from the nav bar (looks wrong there)
- Keeps user focused on their BRI improvement
- **Priority**: Medium

### BF-007: Remove Number Spinner Arrows Site-Wide
- Remove all up/down arrow spinners from number inputs across the entire site
- Replace with clean, easily-typed text inputs
- Especially problematic on the DCF page but must be fixed everywhere
- **Priority**: Medium

### BF-008: Responsive Layout Audit & Fix
- At certain viewport widths, layout breaks (e.g. FCF growth rate inputs disappear on DCF page)
- Full audit needed across all pages to ensure layouts work at all widths/resolutions
- **Priority**: High

---

## EVIDENCE & DATA ROOM

### BF-009: Redesign Evidence Page
- Current page gives user no context: what to upload, why, or what value they get
- Redesign with guided UX, clear purpose/value explanation, and step-by-step upload guidance
- **Priority**: High

### BF-010: Comprehensive Data Room Planning
- The data room needs full planning: use cases, UX research, feature scoping
- Design it as a real selling tool, not just a file dump
- Understand how evidence room (preparation phase) connects to data room (selling phase)
- **Priority**: High

### BF-011: Data Room Company-Level Permissions & Sharing
- Evidence room = preparing the business; Data room = sharing with prospects
- Add ability to share document sets with companies (not just individuals)
- Granular access: Company A sees Group X but not Group Y; Company B sees everything
- Invitation system for external parties
- Clean, organized external-facing interface for invited viewers
- **Priority**: High

### BF-012: Activity Page Empty State & Value Prop
- Activity page starts empty with no explanation
- Add empty state explaining the value: track who is viewing what documents and when
- Provide onboarding context so users understand why this matters
- **Priority**: Medium

---

## DEAL ROOM & PIPELINE

### BF-013: Overhaul Deal Room Contact Add/Edit
- If no company in the initial input, the company field isn't available when editing
- Full overhaul of the contact add and edit flow
- **Priority**: High

### BF-014: Auto-Add Prospect Company to Pipeline
- When a prospect/contact is added, their company should automatically appear in the pipeline
- Deduplicate by email domain: if 2 people from the same company, only one pipeline entry
- Prevent duplicate companies from being added based on email domain
- **Priority**: Medium

### BF-015: Pipeline Archive Functionality
- Users should be able to archive a company from the pipeline
- Archived companies are hidden from the main pipeline view
- Toggle to view archived companies and restore them to active pipeline
- **Priority**: Medium

### BF-016: Trello-Style Drag-and-Drop Pipeline
- Pipeline should work like a Kanban board (Trello-style)
- Drag companies from one stage to the next as they progress
- **Priority**: Medium

---

## FINANCIALS & VALUATION

### BF-017: Add Xero Integration
- Add Xero as a financial data source alongside the existing QuickBooks integration
- **Priority**: Medium

### BF-018: AI-Powered EBITDA Bridge
- Analyze detailed financials from QuickBooks, Xero, or uploaded statements
- Auto-generate a detailed EBITDA bridge with all identifiable adjustments
- Include non-obvious adjustments: personal taxes paid through business, family on payroll, personal dining, vehicles, etc.
- Provide plain-English context for each adjustment (e.g. "$20K in fine dining likely personal — added 80% back = $16,000 to EBITDA")
- Let user accept, reject, or modify each adjustment
- Let user add their own custom adjustments
- Do most of the work upfront so the user doesn't have to
- **Priority**: High

### BF-019: Pre-Populate DCF Page with Estimated FCF
- DCF page should never be empty on first visit
- If only revenue is available: estimate EBITDA using range of multiples to derive FCF
- If actual financials available: use real numbers
- **Priority**: Medium

### BF-020: Restore Working Capital on DCF Page
- Working capital calculation was previously on the DCF page and was removed
- Add it back
- **Priority**: Medium

### BF-021: Remove DCF Valuation Toggle & Weight to DCF
- Remove the toggle between DCF and multiple-based valuation
- When financials are available, weight valuation heavily toward DCF
- Add a comparison view showing how DCF value converges with multiple-based value depending on WACC assumptions
- **Priority**: Medium

### BF-022: Auto-Populate WACC Inputs from Company & Market Data
- Beta, Market Risk Premium, and Size Premium should be derived automatically
- Size Premium based on company revenue
- Beta and Market Risk Premium from market data sources
- Users can override any value
- Add a "Reset to best available data" button
- **Priority**: Medium

---

## PERSONAL FINANCIAL STATEMENT

### BF-023: Plaid Integration for PFS
- Connect to a financial data aggregation service (e.g. Plaid) to auto-pull:
  - Bank account balances
  - Stock/bond/investment holdings
- Don't make users manually enter all this data
- **Priority**: Medium

### BF-024: Guided PFS Onboarding Wizard
- Smart conditional onboarding flow:
  - Ask for address → if they own, look up market value automatically
  - If they own: ask about mortgage, HELOC
  - If they rent: skip mortgage questions entirely
- Slick, step-by-step walkthrough to populate PFS
- **Priority**: Medium

---

## GROWTH & ENGAGEMENT

### BF-025: Transform Exit Readiness Report into Viral Growth Tool
- Current report is a weak email sent after onboarding with no real value
- Redesign as a high-quality shareable report including:
  - The good, bad, and ugly from their assessment
  - Actionable recommendations for improvement
  - How Exit OSx will help them get there
- Make it something users want to forward around, driving organic awareness
- **Priority**: High

---

## COLLABORATION & ACCESS

### BF-026: Lightweight Task Invitations (Limited Access)
- When someone is invited to complete a task (e.g. "Sally, upload the payroll report"), they should NOT need full system access
- Create a frictionless limited-access flow: invited user receives a link, can complete just their specific task (e.g. upload a document), and nothing more
- Lower the barrier to getting external people involved in limited ways
- **Priority**: High

---

## UI CONSISTENCY & CLEANUP

### BF-027: Delete Account Danger Zone Styling
- The Delete Account section in Settings > Account tab should match the Danger Zone format used in the Company tab
- Currently inconsistent styling
- **Priority**: Low

### BF-028: Fix Login Event Naming
- Login analytics event naming is incorrect/inconsistent
- Needs to be fixed for accurate tracking
- **Priority**: Low

### BF-029: Delete Finder Copy Artifacts
- Remove leftover Finder copy artifacts from the codebase
- **Priority**: Low
