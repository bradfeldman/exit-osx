# PRD: Valuation Engine V2 -- WACC Recalibration, Convergence Engine, BRI Integration, and Confidence Scoring

**Author:** Exit OSx Product
**Status:** Draft
**Created:** 2026-02-15
**Last Updated:** 2026-02-15
**Staircase Phase:** Phase 2 ($100K-$500K MRR) -- Conversion bottleneck
**Bottleneck Addressed:** Conversion -- credible valuation output is the #1 driver of upgrade from Foundation to Growth

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Success Metrics](#2-success-metrics)
3. [Value Equation Impact](#3-value-equation-impact)
4. [Phased Delivery Plan](#4-phased-delivery-plan)
5. [Phase 1: WACC Recalibration](#5-phase-1-wacc-recalibration)
6. [Phase 2: BRI-to-WACC Integration](#6-phase-2-bri-to-wacc-integration)
7. [Phase 3: Valuation Convergence Engine](#7-phase-3-valuation-convergence-engine)
8. [Phase 4: Confidence Score](#8-phase-4-confidence-score)
9. [Database Schema Changes](#9-database-schema-changes)
10. [API Changes](#10-api-changes)
11. [UI/UX Changes](#11-uiux-changes)
12. [Calibration Validation Test Scenarios](#12-calibration-validation-test-scenarios)
13. [Testing Requirements](#13-testing-requirements)
14. [Out of Scope](#14-out-of-scope)
15. [Risks and Mitigations](#15-risks-and-mitigations)
16. [Dependencies](#16-dependencies)
17. [Decision Log](#17-decision-log)

---

## 1. Problem Statement

Exit OSx's DCF valuation engine produces WACCs that are 5-10 percentage points below market benchmarks for mid-market companies ($1M-$25M revenue), leading to inflated DCF valuations that undermine credibility with founders and their advisors. Specifically:

1. **Cost of debt defaults to 6%**, but mid-market companies with $1M-$5M EBITDA typically face 8.5-10% borrowing costs. This alone can swing enterprise value by 15-25%.

2. **Size premium uses revenue-based tiers** with only three effective brackets (6%, 4%, 2.5%), when the industry standard is EBITDA-based tiering with finer granularity. A $500K-revenue service business and a $500K-revenue SaaS company get the same size premium despite vastly different risk profiles.

3. **Company-Specific Risk (CSR) is completely absent** from the WACC calculation. CSR typically accounts for 2-10% of the discount rate for companies in our target segment. This is the single largest gap in the current model.

4. **No mid-year discounting convention.** The current model discounts all cash flows as if received at year-end. The mid-year convention (industry standard for going-concern businesses) assumes cash flows arrive evenly throughout the year, increasing present values by approximately WACC/2 percent.

5. **DCF and multiple-based valuations diverge without explanation.** A founder sees a $3.2M EBITDA-multiple valuation on the dashboard and an $8.1M DCF valuation in the DCF module. No tool explains why or which to trust. This erodes confidence in the entire platform.

6. **BRI score reduces the EBITDA multiple** but has no connection to the DCF discount rate, even though BRI sub-dimensions (e.g., customer concentration, key-person risk) directly correspond to the risk factors that drive CSR. Two parallel risk systems with no bridge.

**What this replaces:** Spreadsheet-based WACC calculations from M&A advisors ($2K-$5K engagement) and manual reconciliation of multiple valuation methods ($3K-$8K).

**Why we win:** Real-time, transparent WACC calculation that adapts to the company's specific risk profile, with automated convergence analysis that replaces hours of manual reconciliation.

---

## 2. Success Metrics

| Metric | Current Baseline | Phase 1 Target | Phase 4 Target | Measurement |
|--------|-----------------|----------------|----------------|-------------|
| Median WACC for $1M EBITDA company | ~12.5% | 18-22% | 18-22% | Aggregate across all companies in tier |
| DCF-to-Multiple divergence | Unmeasured | <30% median | <20% median | `abs(dcfEV - multipleEV) / multipleEV` |
| DCF page engagement (saves per user/month) | Unmeasured | +25% | +50% | Analytics: `dcf_result_viewed` events |
| Foundation-to-Growth conversion among DCF users | Baseline TBD | +15% | +30% | Cohort analysis |
| User-reported valuation credibility (NPS sub-score) | Baseline TBD | +10 points | +20 points | In-app survey |
| Advisor recommendation rate | Baseline TBD | Unchanged | +20% | Referral tracking |

---

## 3. Value Equation Impact

```
Value = (Dream Outcome x Perceived Likelihood) / (Time Delay x Effort & Sacrifice)
```

| Variable | How This PRD Moves It | Specific Impact |
|----------|----------------------|-----------------|
| Dream Outcome (up) | More credible valuation = higher confidence in exit price target | "My DCF shows $4.2M and my multiple says $3.8M -- I trust both" |
| Perceived Likelihood (up) | Convergence analysis shows WHY values differ and HOW to close gaps | "I know exactly which 3 risks are discounting my DCF by $800K" |
| Time Delay (down) | Automatic BRI-to-WACC mapping replaces manual CSR estimation | Instant WACC update when BRI changes vs. re-engaging advisor |
| Effort & Sacrifice (down) | Confidence score tells user whether to investigate further or proceed | "87% confidence -- I can use this number in negotiations" |

**Value Stack:**
```
Feature: WACC Recalibration + Convergence Engine
What it replaces: $5K-$13K in advisory fees for WACC calibration + valuation reconciliation
What it costs the user: Included in Exit-Ready tier ($449/month)
Value multiple: 12-29x monthly cost (annualized replacement)
User reaction test: "I get institutional-grade WACC analysis and method reconciliation for $449/month?"
```

**Replacement Value:**
```
Feature: BRI-to-WACC Integration
Replaces: 6-10 hours of advisor time mapping qualitative risks to discount rates
Advisory cost replaced: $3,000-$5,000 per engagement
Platform cost: Included in Growth tier ($179/month)
Buyback ratio: 17-28x per month
```

---

## 4. Phased Delivery Plan

### Phase Sequence and Rationale

```
Phase 1: WACC Recalibration (4-5 eng days)
    |
    v
Phase 2: BRI-to-WACC Integration (3-4 eng days)
    |
    v
Phase 3: Convergence Engine (4-5 eng days)
    |
    v
Phase 4: Confidence Score (2-3 eng days)
```

**Total estimated effort: 13-17 engineering days**

**Why this order:**

1. **Phase 1 first** because it fixes wrong numbers. Every WACC we produce today is indefensibly low for our target segment. This is a credibility problem that erodes trust. Foundation before features.
2. **Phase 2 second** because it creates the BRI-to-WACC bridge that makes the DCF dynamic. Without it, DCF is a static calculator disconnected from the BRI improvement loop that drives retention.
3. **Phase 3 third** because convergence analysis requires both the multiple-based valuation (existing) and a credible DCF (Phase 1+2) to compare against. Building convergence before the DCF is calibrated would surface misleading divergence.
4. **Phase 4 last** because confidence scoring aggregates signals from all prior phases. It is the capstone, not the foundation.

### Tier Gating

| Feature | Foundation (Free) | Growth ($179) | Exit-Ready ($449) |
|---------|:-:|:-:|:-:|
| WACC calculation with CSR | View only (see WACC, can't adjust) | Full interactive | Full interactive |
| BRI-to-WACC mapping | See that BRI affects WACC | See dollar impact per category | Full narrative + adjustment |
| Convergence analysis | See divergence percentage | Root cause bullets | Full investigation Q&A |
| Confidence score | See score (no breakdown) | See component breakdown | Full recommendations |
| Mid-year discounting | N/A (no DCF access) | Toggle available | Toggle available |
| Sensitivity table | N/A | Standard table | Extended + CSR axis |

---

## 5. Phase 1: WACC Recalibration

### 5.1 Scope

Replace all WACC defaults and size premium logic across three code paths (auto-DCF, manual DCF page, and the WACCCalculator component) with EBITDA-based tiering, a Company-Specific Risk (CSR) premium, updated cost-of-debt defaults, and mid-year discounting.

### 5.2 Current State Analysis

**Files affected:**
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/auto-dcf.ts` -- hardcoded constants at lines 17-25
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/lib/valuation/dcf-calculator.ts` -- `WACCInputs` interface, `calculateWACC`, `calculatePresentValue`
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/app/(dashboard)/dashboard/valuation/page.tsx` -- `DEFAULT_ASSUMPTIONS` at lines 41-60, WACC calc at lines 268-280
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/src/components/valuation/WACCCalculator.tsx` -- `INPUT_RANGES` at lines 24-31, UI layout
- `/Users/bradfeldman/Documents/Exit-OSx/Exit-OSx/prisma/schema.prisma` -- `DCFAssumptions` model (lines 1031-1057), `ValuationSnapshot` model (lines 392-432)

**Current problems identified in each file:**

| File | Problem | Impact |
|------|---------|--------|
| `auto-dcf.ts:20` | `DEFAULT_COST_OF_DEBT = 0.06` | 2-4% WACC understatement |
| `auto-dcf.ts:28-35` | `SIZE_RISK_PREMIUM` keyed by revenue category, only 3 effective tiers | Wrong basis (revenue not EBITDA), too coarse |
| `auto-dcf.ts` | No CSR premium anywhere | 2-10% WACC understatement |
| `dcf-calculator.ts:27-36` | `WACCInputs` has no `csrPremium` field | CSR cannot be included in calculation |
| `dcf-calculator.ts:86-92` | `calculatePresentValue` uses end-of-year discounting | ~WACC/2 % systematic undervaluation |
| `valuation/page.tsx:46` | `sizeRiskPremium: 0.02` (2% default) | Too low for most mid-market companies |
| `valuation/page.tsx:276` | `costOfDebt = assumptions.costOfDebtOverride \|\| 0.06` | 6% default too low |
| `WACCCalculator.tsx:29` | `sizeRiskPremium: { max: 0.06 }` | Slider cap too low; CSR not even represented |
| `DCFAssumptions` schema | No `csrPremium` column | Cannot persist CSR |
| `ValuationSnapshot` schema | `dcfWacc: Decimal(5,4)` | Only stores WACC, not its components |

### 5.3 EBITDA-Based Size Premium Tiers

Replace the current `SIZE_RISK_PREMIUM` record (revenue-keyed, 3 effective values) with an EBITDA-keyed function.

**New tier table (source: Duff & Phelps / Kroll size study, adapted for lower-middle-market):**

| EBITDA Range | Size Premium (default) | Size Premium (range) | Rationale |
|-------------|----------------------|---------------------|-----------|
| < $500K | 7.0% | 6.0% - 8.0% | Micro-business, extreme concentration risk |
| $500K - $1M | 6.0% | 5.5% - 7.0% | Small business, limited management depth |
| $1M - $3M | 5.0% | 4.0% - 6.0% | Lower-middle market entry |
| $3M - $5M | 4.0% | 3.0% - 5.0% | Lower-middle market |
| $5M - $10M | 3.0% | 2.5% - 4.0% | Middle market |
| $10M - $25M | 2.0% | 1.5% - 3.0% | Upper-middle market |
| $25M - $50M | 1.5% | 1.0% - 2.5% | Approaching institutional |
| > $50M | 1.0% | 0.5% - 1.5% | Institutional |

**Implementation:**

```typescript
// New function: getSizeRiskPremium(ebitda: number): { default: number, low: number, high: number }
// Replaces: SIZE_RISK_PREMIUM record keyed by revenueSizeCategory
```

**Migration from revenue-based to EBITDA-based:**
- Auto-DCF path: Already has access to `adjustedEbitda` from income statement. Switch lookup.
- Manual DCF path: Uses `ebitda` state from page component. Switch lookup.
- When EBITDA is unavailable: Fall back to revenue-estimated EBITDA using existing `estimateEbitdaFromRevenue()`.
- Schema: The `sizeRiskPremium` column in `DCFAssumptions` remains as an override. The default is now computed from EBITDA, not revenue category.

### 5.4 Company-Specific Risk (CSR) Premium

CSR captures risks not reflected in beta, size premium, or market risk premium. For companies in the Exit OSx target segment ($1M-$25M revenue), CSR is typically the largest single component of the discount rate.

**CSR Default Ranges by EBITDA Tier:**

| EBITDA Range | CSR Default | CSR Range | Key Risk Drivers |
|-------------|-------------|-----------|-----------------|
| < $500K | 8.0% | 5.0% - 12.0% | Everything -- survival risk |
| $500K - $1M | 6.5% | 5.0% - 10.0% | Key person, customer concentration, cash flow |
| $1M - $3M | 5.0% | 3.0% - 8.0% | Management depth, customer diversification |
| $3M - $5M | 3.5% | 2.0% - 5.0% | Operational maturity, market position |
| $5M - $10M | 2.5% | 1.5% - 4.0% | Process documentation, team depth |
| $10M - $25M | 1.5% | 0.5% - 3.0% | Governance, compliance |
| $25M - $50M | 1.0% | 0% - 2.0% | Minimal company-specific risk |
| > $50M | 0.5% | 0% - 1.0% | De minimis |

**CSR in the WACC formula:**

Current CAPM: `Re = Rf + beta * MRP + SizeRP`

New CAPM: `Re = Rf + beta * MRP + SizeRP + CSR`

CSR is additive to cost of equity, not to WACC directly. This is the standard Ibbotson/Duff & Phelps build-up approach.

**CSR in the data model:**
- Add `csrPremium` column to `DCFAssumptions` (nullable Decimal(5,4))
- Add `csrPremium` field to `WACCInputs` interface
- When null/not set: use EBITDA-tier default
- When set: use override value
- Store the effective CSR in the snapshot for audit trail

### 5.5 Cost of Debt Defaults

**New default ranges by EBITDA tier:**

| EBITDA Range | Cost of Debt Default | Range |
|-------------|---------------------|-------|
| < $500K | 12.0% | 10.0% - 15.0% |
| $500K - $1M | 10.5% | 9.0% - 12.0% |
| $1M - $3M | 9.5% | 8.5% - 11.0% |
| $3M - $5M | 9.0% | 8.0% - 10.0% |
| $5M - $10M | 8.5% | 7.5% - 9.5% |
| $10M - $25M | 8.0% | 7.0% - 9.0% |
| $25M - $50M | 7.5% | 6.5% - 8.5% |
| > $50M | 7.0% | 6.0% - 8.0% |

These replace the hardcoded `DEFAULT_COST_OF_DEBT = 0.06` in `auto-dcf.ts` and the `0.06` fallback on `valuation/page.tsx:276`.

The derived cost-of-debt logic in `auto-dcf.ts:122-130` (interest expense / total debt) is retained as a superior signal when available, with the sanity-check range adjusted from `[0.01, 0.20]` to `[0.04, 0.20]`.

### 5.6 Mid-Year Discounting Convention

**Current formula (end-of-year):**
```
PV = FCF / (1 + WACC)^n
```

**New formula (mid-year):**
```
PV = FCF / (1 + WACC)^(n - 0.5)
```

This shifts each cash flow 6 months earlier, reflecting the assumption that cash arrives evenly throughout the year rather than in a lump sum on December 31.

Terminal value discounting also adjusts:
```
PV_terminal = TV / (1 + WACC)^(N - 0.5)   // mid-year on final projection year
```

**Impact:** For WACC = 20%, mid-year convention increases PV by approximately 9.5%. For WACC = 15%, approximately 7%. This partially offsets the WACC increase from CSR, preventing sticker shock.

**Implementation:**
- Add `useMidYearConvention: boolean` to `DCFInputs` (default: `true`)
- Modify `calculatePresentValue` to accept an optional `midYear: boolean` parameter
- Modify `calculateDCF` to pass the convention through
- DCF page toggle: "Mid-Year Convention" switch (defaults ON)
- Auto-DCF: always uses mid-year convention

### 5.7 Harmonizing Defaults Across Code Paths

**Problem:** Three places define WACC defaults independently:
1. `auto-dcf.ts` lines 17-25 (server-side auto calculation)
2. `valuation/page.tsx` lines 41-60 (`DEFAULT_ASSUMPTIONS` for manual DCF page)
3. `WACCCalculator.tsx` lines 24-31 (`INPUT_RANGES` for slider bounds)

**Solution:** Create a single source of truth: `/src/lib/valuation/wacc-defaults.ts`

```typescript
// wacc-defaults.ts -- SINGLE SOURCE OF TRUTH for all WACC parameters
export const WACC_MARKET_CONSTANTS = {
  riskFreeRate: 0.0425,     // 10Y Treasury yield, Jan 2026
  marketRiskPremium: 0.055, // Duff & Phelps ERP
  defaultBeta: 1.0,
  terminalGrowthRate: 0.025,
  defaultTaxRate: 0.25,
  defaultDebtWeight: 0.20,
  defaultEquityWeight: 0.80,
}

export function getSizeRiskPremium(ebitda: number): { default: number, low: number, high: number }
export function getCSRPremium(ebitda: number): { default: number, low: number, high: number }
export function getCostOfDebt(ebitda: number): { default: number, low: number, high: number }
```

All three consuming files import from this module. No hardcoded WACC constants remain in any other file.

### 5.8 Phase 1 Acceptance Criteria

**AC-1.1: EBITDA-Based Size Premium**
- Given a company with $2M EBITDA
- When the auto-DCF runs
- Then the size risk premium used is 5.0% (not the old revenue-based lookup)

**AC-1.2: CSR Premium Included in WACC**
- Given a company with $1M EBITDA and no CSR override
- When WACC is calculated
- Then WACC includes a 6.5% CSR default
- And the WACC calculator UI shows a CSR slider
- And the cost of equity formula display shows `Re = Rf + beta(MRP) + SizeRP + CSR`

**AC-1.3: Cost of Debt Default Updated**
- Given a company with $3M EBITDA and no cost-of-debt override
- When auto-DCF runs
- Then cost of debt defaults to 9.0% (not 6.0%)
- And the DCF page shows 9.0% as the pre-filled default (user can override)

**AC-1.4: Mid-Year Discounting**
- Given a DCF with WACC = 20%, base FCF = $500K, 5-year projection
- When mid-year convention is ON (default)
- Then Year 1 PV = $500K * (1.05) / (1.20)^0.5 = ~$479K (vs end-of-year ~$438K)
- And the toggle is visible on the DCF page
- And changing the toggle immediately recalculates all present values

**AC-1.5: Default Harmonization**
- Given the auto-DCF path, the manual DCF page path, and the WACC calculator UI
- When a company with $5M EBITDA has no saved assumptions
- Then all three paths produce the same default WACC value (within 0.01%)

**AC-1.6: Backward Compatibility**
- Given a company with existing saved DCF assumptions (overrides)
- When the user loads the DCF page
- Then their overrides are preserved and used (not replaced by new defaults)
- And only un-overridden fields use new defaults

**AC-1.7: Existing Test Suite Passes**
- Given the existing `valuation.test.ts` golden-file tests
- When tests run after Phase 1 changes
- Then all existing tests pass (DCF changes do not affect the EBITDA-multiple valuation formula)
- And new tests cover WACC calculation with CSR and EBITDA-tier lookup

**AC-1.8: Schema Migration**
- Given the Prisma schema migration adds `csrPremium` and `useMidYearConvention` to `DCFAssumptions`
- When the migration runs against staging and production
- Then existing rows retain their current values
- And new columns default to `null` (meaning "use EBITDA-tier default")
- And the `ValuationSnapshot` model gets a `dcfCsrPremium` column for audit

### 5.9 Phase 1 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Existing users see dramatically different DCF values | High | High | Only users with saved assumptions are affected; new defaults apply only when no override exists. Show "defaults updated" banner on DCF page for 30 days. |
| WACC so high that DCF values become meaninglessly low | Medium | Medium | Mid-year convention offsets ~50% of the increase. Sensitivity table helps users explore the range. CSR slider lets users reduce if they disagree. |
| Size premium tiers don't match user's EBITDA exactly | Low | Low | Use the midpoint of the tier range; user can override via slider. |

---

## 6. Phase 2: BRI-to-WACC Integration

### 6.1 Scope

Create a transparent, auditable mapping from BRI sub-dimension scores to the Company-Specific Risk premium in the WACC. Higher BRI = lower CSR = lower WACC = higher DCF valuation. This creates the bridge between the readiness improvement loop (BRI tasks) and the DCF valuation.

### 6.2 BRI-to-CSR Mapping

**Concept:** The CSR premium ranges from a tier-specific maximum (worst case) to a tier-specific minimum (best case). The BRI score interpolates within this range.

```
CSR = CSR_max - (BRI_score * (CSR_max - CSR_min))
```

Where `CSR_max` and `CSR_min` are the tier-specific bounds from Section 5.4.

**Example for $1M EBITDA company (CSR range: 5.0% - 10.0%):**

| BRI Score | CSR Premium | WACC Impact vs Default |
|-----------|------------|----------------------|
| 0.90 | 5.5% | -1.0% (lower WACC, higher value) |
| 0.70 | 6.5% | 0% (matches default) |
| 0.50 | 7.5% | +1.0% (higher WACC, lower value) |
| 0.30 | 8.5% | +2.0% |
| 0.10 | 9.5% | +3.0% |

**BRI Score = 0.70 produces the tier default CSR.** This anchors the mapping so that a "typical" company in the BRI range gets the expected discount rate, while companies above/below adjust proportionally.

### 6.3 BRI Sub-Dimension Risk Narratives

Each BRI category maps to specific CSR risk factors. These narratives are displayed in the DCF page alongside the CSR slider to explain *why* the discount rate is what it is.

| BRI Category | CSR Risk Factors | Risk Narrative Template |
|-------------|-----------------|------------------------|
| FINANCIAL (0.25) | Cash flow predictability, revenue quality, margin stability | "Financial controls are {score_label}. Buyers perceive {risk_level} uncertainty in cash flow projections, adding approximately {csr_contribution_bps}bps to the discount rate." |
| TRANSFERABILITY (0.20) | Key-person risk, management depth, process documentation | "Business transferability is {score_label}. Key-person dependency and management depth contribute approximately {csr_contribution_bps}bps of company-specific risk." |
| OPERATIONAL (0.20) | Process maturity, scalability, technology debt | "Operational readiness is {score_label}. Process maturity and scalability concerns add approximately {csr_contribution_bps}bps to the discount rate." |
| MARKET (0.15) | Customer concentration, competitive position, market dynamics | "Market position is {score_label}. Customer concentration and competitive dynamics contribute approximately {csr_contribution_bps}bps of risk." |
| LEGAL_TAX (0.10) | Compliance gaps, litigation exposure, tax structure | "Legal and tax readiness is {score_label}. Compliance gaps and structural risks add approximately {csr_contribution_bps}bps." |
| PERSONAL (0.10) | Owner readiness, succession planning, decision capacity | "Personal readiness is {score_label}. Owner transition risk contributes approximately {csr_contribution_bps}bps." |

**CSR contribution per category:**

```
csr_contribution_i = BRI_weight_i * (1 - category_score_i) * (CSR_max - CSR_min)
```

This means a perfect score in a category eliminates its contribution to CSR. A zero score adds the full weighted share.

### 6.4 Auto-Recalculation on BRI Change

When a BRI score changes (via task completion, assessment re-take, or answer upgrade):

1. `recalculateSnapshotForCompany()` already runs and creates a new snapshot
2. **New behavior:** If the company has auto-DCF enabled (not manually configured), the auto-DCF recalculates with updated CSR derived from the new BRI score
3. The new snapshot stores both the updated multiple-based valuation AND the updated DCF valuation
4. The dashboard shows movement in both valuations

**Guard:** If the user has manually overridden CSR (via the DCF page slider), BRI changes do NOT override their manual CSR. The user has explicitly taken control. A subtle indicator shows "CSR manually set -- BRI changes will not update this value. Reset to automatic?"

### 6.5 Phase 2 Acceptance Criteria

**AC-2.1: BRI-to-CSR Mapping**
- Given a company with $1M EBITDA and BRI score = 0.85
- When CSR is calculated automatically
- Then CSR = 5.0% + (1 - 0.85) * (10.0% - 5.0%) = 5.75%
- And this is lower than the 6.5% default (rewarding high readiness)

**AC-2.2: BRI Sub-Dimension Narratives**
- Given a company with TRANSFERABILITY score = 0.30
- When the user views the CSR breakdown on the DCF page
- Then the transferability narrative shows a warning-level message
- And the contribution to CSR is displayed in basis points

**AC-2.3: Auto-Recalculation**
- Given a company with auto-DCF enabled
- When the user completes a task that improves FINANCIAL BRI from 0.50 to 0.65
- Then a new snapshot is created
- And the snapshot's `dcfCsrPremium` reflects the lower CSR
- And the snapshot's `dcfWacc` is lower than the previous snapshot's
- And the snapshot's `dcfEnterpriseValue` is higher than the previous snapshot's

**AC-2.4: Manual Override Respected**
- Given a user who has set CSR to 3.0% manually on the DCF page
- When their BRI score changes
- Then the DCF WACC does NOT change
- And a message displays: "CSR is manually set. BRI changes will not update the discount rate."

**AC-2.5: Dollar Impact Display**
- Given a company with $2M EBITDA, current CSR = 6.0%, current DCF EV = $4.5M
- When the user completes a task that would reduce CSR by 0.5%
- Then the task completion confirmation shows the estimated DCF value increase
- And the Value Ledger entry includes the DCF impact alongside the multiple-based impact

### 6.6 Phase 2 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| BRI-to-CSR mapping feels arbitrary to sophisticated users | Medium | Medium | Show the math transparently. Every number is auditable. Users can override. |
| Small BRI changes produce confusing WACC/value jumps | Medium | Low | Round CSR changes to nearest 25bps before applying. Don't show changes smaller than $5K impact. |
| Creates circular dependency: BRI affects value, value affects tasks, tasks affect BRI | Low | High | BRI-to-CSR mapping is one-directional. Task dollar values come from the multiple-based system, not DCF. DCF is informational, not the driver of task prioritization. |

---

## 7. Phase 3: Valuation Convergence Engine

### 7.1 Scope

Build an automated analysis engine that compares DCF and EBITDA-multiple valuations, identifies the root causes of divergence, generates targeted investigation questions, and recommends specific adjustments to bring the methods into alignment.

### 7.2 Convergence Calculation

**Divergence metric:**

```
divergence = (dcfEV - multipleEV) / multipleEV * 100
```

| Divergence | Severity | Interpretation |
|-----------|----------|---------------|
| < 10% | Low | Methods agree. High confidence. |
| 10% - 25% | Moderate | Reasonable variance. Investigation optional. |
| 25% - 50% | Significant | Investigate root causes. Adjustments likely needed. |
| > 50% | Critical | One method is likely miscalibrated or data is incomplete. |

**Implied WACC from multiple-based valuation:**

The multiple-based enterprise value implies a WACC. We reverse-engineer it:

```
Given: multipleEV = EBITDA * finalMultiple
Assume: same FCF projections and terminal growth rate as DCF model
Solve for: WACC where DCF(WACC) = multipleEV
```

This is a numerical solve (binary search / Newton's method). The implied WACC tells the user: "Your multiple-based valuation implies a 16.2% discount rate. Your DCF uses 22.1%. The 5.9% gap explains the $1.2M valuation difference."

### 7.3 Root Cause Analysis

When divergence exceeds 25%, the engine analyzes potential causes. Each cause has a detection rule and a significance estimate.

| Root Cause | Detection Logic | Significance |
|-----------|----------------|-------------|
| WACC too high/low relative to size | Compare WACC components to tier benchmarks | Dollar impact of WACC being at benchmark vs current |
| Growth rates misaligned with industry | Compare projected growth to industry benchmarks | Dollar impact of using industry average growth |
| Terminal value assumptions aggressive | Check: TV > 70% of enterprise value | Dollar impact of terminal value adjustment |
| EBITDA multiple outdated | Check: industry multiples last refreshed > 90 days ago | Flag for refresh |
| CSR disconnected from BRI | Check: manual CSR vs BRI-implied CSR > 200bps | Dollar impact of alignment |
| Cost of debt derived from bad data | Check: derived cost of debt vs benchmark range for tier | Dollar impact of using benchmark |
| Capital structure atypical | Check: debt weight > 50% or < 5% | Dollar impact of using industry average structure |
| FCF-to-EBITDA ratio unusual | Check: FCF/EBITDA < 0.4 or > 0.95 | Flag data quality concern |

### 7.4 Investigation Questions

For each root cause identified, generate 1-3 targeted questions for the business owner. These are NOT generic questions -- they are specific to the detected divergence.

**Example -- WACC too high:**
- "Your discount rate (22.1%) is above the typical range for a $3M EBITDA business (14-18%). Do you have specific risks -- pending litigation, a key contract renewal, or a major customer at risk -- that justify a higher discount?"
- "Your company-specific risk premium is {csr}%. This accounts for {dollar_impact} of the valuation difference. Would you characterize your business risk as higher, lower, or about the same as a typical company your size?"

**Example -- Growth rates misaligned:**
- "Your projected growth (3% flat) is below the {industry} average of {industry_growth}%. Has growth decelerated recently, or is this conservative planning?"
- "Using industry-average growth rates would increase your DCF value by approximately {dollar_impact}. Do your financial projections support higher growth?"

**Example -- Terminal value dominant:**
- "Terminal value accounts for {tv_pct}% of your DCF enterprise value. This means {dollar_impact} of your valuation depends on assumptions about performance beyond Year 5. Have you stress-tested this assumption?"

### 7.5 Adjustment Recommendations

Based on the root cause analysis, the engine suggests specific parameter adjustments.

```typescript
interface ConvergenceAdjustment {
  parameter: 'wacc' | 'growthRates' | 'terminalGrowthRate' | 'exitMultiple' | 'csrPremium' | 'costOfDebt'
  currentValue: number | number[]
  suggestedValue: number | number[]
  rationale: string
  dollarImpact: number  // How much this adjustment changes DCF EV
  confidence: 'high' | 'medium' | 'low'
}
```

Adjustments are displayed as a ranked list (highest dollar-impact first) with one-click "Apply" buttons. Applying an adjustment updates the DCF assumptions and immediately recalculates.

### 7.6 Phase 3 Acceptance Criteria

**AC-3.1: Divergence Calculation**
- Given a company with multipleEV = $3.2M and dcfEV = $4.8M
- When the convergence engine runs
- Then divergence = +50.0% (DCF higher)
- And severity = "Critical"
- And the UI displays both values side-by-side with the divergence percentage

**AC-3.2: Implied WACC**
- Given a company with multipleEV = $3.2M, EBITDA = $800K, FCF projections, and terminal growth = 2.5%
- When the convergence engine runs
- Then an implied WACC is calculated (within 0.5% accuracy via iterative solve)
- And it is displayed alongside the explicit WACC: "Your DCF uses 21.5%. Your multiple implies 15.8%."

**AC-3.3: Root Cause Identification**
- Given a divergence > 25%
- When the convergence engine analyzes root causes
- Then at least one root cause is identified with a dollar-impact estimate
- And root causes are ranked by dollar impact (descending)

**AC-3.4: Investigation Questions**
- Given the root cause "WACC too high relative to tier benchmark"
- When investigation questions are generated
- Then 1-3 specific questions are displayed, referencing the actual numbers (not generic templates)
- And each question includes the dollar impact of the related adjustment

**AC-3.5: One-Click Adjustments**
- Given an adjustment recommendation to reduce CSR from 6.0% to 4.5%
- When the user clicks "Apply"
- Then the CSR override is updated in DCF assumptions
- And the DCF recalculates immediately (without page reload)
- And the divergence metric updates in real-time
- And the adjustment is logged for audit trail

**AC-3.6: Edge Case -- No DCF Available**
- Given a company with no financial data (no FCF)
- When the user views the convergence section
- Then a message displays: "Enter financial data to enable DCF valuation and convergence analysis"
- And no errors are thrown

**AC-3.7: Edge Case -- Identical Valuations**
- Given DCF EV equals multiple EV (within 1%)
- When the convergence engine runs
- Then divergence = "< 1%"
- And a success message displays: "Strong convergence. Both methods produce consistent valuations."
- And no root cause analysis or investigation questions are shown

### 7.7 Phase 3 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Implied WACC solve fails to converge | Low | Medium | Bound the search to [1%, 50%]. If solve fails, display "unable to compute" with explanation. |
| Root cause analysis gives wrong diagnosis | Medium | High | Every diagnosis includes the data it was based on. User can see and challenge the logic. Never hide the inputs. |
| Users blindly click "Apply" on all adjustments, creating non-sensical DCF | Medium | Medium | Show running divergence as adjustments are applied. Warn if applying would create divergence in the opposite direction. Provide "Reset to defaults" button. |
| AI-generated investigation questions feel generic | Medium | Low | Use company-specific data (industry, EBITDA, growth rates, BRI scores) in every question. No template is ever shown without specific numbers. |

---

## 8. Phase 4: Confidence Score

### 8.1 Scope

Produce a 0-100 "Valuation Confidence" score that communicates how much the user should trust the numbers they see. This is NOT the valuation itself -- it is a meta-assessment of the valuation's reliability.

### 8.2 Confidence Score Components

| Component | Weight | Score Range | Measurement |
|-----------|--------|------------|-------------|
| Method Convergence | 30% | 0-100 | 100 if divergence < 5%. Linear decay: 0 at divergence > 60%. |
| Data Quality | 25% | 0-100 | Composite of: actual vs estimated EBITDA, FCF availability, number of historical periods, balance sheet completeness |
| WACC Calibration | 20% | 0-100 | 100 if all WACC components within tier benchmark ranges. Deductions for each out-of-range component. |
| BRI Completeness | 15% | 0-100 | Percentage of assessment questions answered (not the BRI score itself -- a company can have low BRI but high completeness, meaning the assessment is thorough even if results are unfavorable) |
| Investigation Completion | 10% | 0-100 | Percentage of convergence investigation questions answered/addressed |

### 8.3 Confidence Score Formula

```
confidenceScore = (
  convergenceScore * 0.30 +
  dataQualityScore * 0.25 +
  waccCalibrationScore * 0.20 +
  briCompletenessScore * 0.15 +
  investigationScore * 0.10
)
```

### 8.4 Data Quality Sub-Score Breakdown

| Factor | Points (of 100) | Condition |
|--------|----------------|-----------|
| EBITDA source | 25 | 25 = actual financials, 15 = estimated from revenue, 0 = missing |
| FCF available | 20 | 20 = cash flow statement uploaded, 0 = estimated/missing |
| Historical periods | 20 | 20 = 3+ years, 15 = 2 years, 10 = 1 year, 0 = none |
| Balance sheet | 15 | 15 = complete (debt + equity + cash), 5 = partial, 0 = missing |
| Industry multiples matched | 10 | 10 = subsector match, 7 = sector, 5 = supersector, 2 = industry, 0 = default |
| Growth rates derived | 10 | 10 = derived from historical, 5 = user-entered, 0 = platform defaults |

### 8.5 Confidence Score Display

**Visual treatment:** Gauge-style meter with three zones:
- 0-40: Red -- "Low Confidence -- significant data gaps reduce reliability"
- 41-70: Yellow -- "Moderate Confidence -- key inputs may need verification"
- 71-100: Green -- "High Confidence -- valuation is well-supported"

**Actionable guidance:** For each component below 70, show a specific action:
- Convergence < 70: "Run convergence analysis to identify and resolve divergence"
- Data Quality < 70: "Upload [specific missing document] to improve data quality"
- WACC Calibration < 70: "Review WACC components flagged as outside benchmarks"
- BRI Completeness < 70: "Complete [N remaining] assessment questions"
- Investigation < 70: "Address [N] investigation questions"

### 8.6 Phase 4 Acceptance Criteria

**AC-4.1: Confidence Score Calculation**
- Given a company with: DCF-multiple divergence = 8%, actual EBITDA, 3 years FCF history, WACC within benchmarks, 100% BRI completion, no investigation questions pending
- When confidence score is calculated
- Then score >= 90
- And the display shows green zone

**AC-4.2: Component Breakdown**
- Given a confidence score of 62
- When the user clicks to expand the score
- Then each of the 5 components is shown with its individual score and weight
- And components below 70 have actionable guidance (specific, not generic)

**AC-4.3: Score Updates in Real-Time**
- Given the user uploads a balance sheet
- When the upload completes
- Then the Data Quality sub-score increases
- And the overall Confidence Score updates without page reload

**AC-4.4: Edge Case -- No DCF**
- Given a company with no DCF data
- When confidence score is calculated
- Then the Method Convergence component scores 0 (not N/A)
- And the overall score reflects this gap
- And guidance says "Enable DCF valuation to improve confidence"

**AC-4.5: Tier Gating**
- Given a Foundation-tier user
- When they view the confidence score
- Then they see the overall score number and zone color
- And they do NOT see the component breakdown or actionable guidance (gated to Growth tier)

---

## 9. Database Schema Changes

### 9.1 DCFAssumptions Model (Modify)

```prisma
model DCFAssumptions {
  // ... existing fields ...

  // Phase 1: New fields
  csrPremium               Decimal?  @map("csr_premium") @db.Decimal(5, 4)
  useMidYearConvention     Boolean   @default(true) @map("use_mid_year_convention")

  // Phase 3: Convergence tracking
  lastConvergenceAnalysis  DateTime? @map("last_convergence_analysis")
  convergenceDivergence    Decimal?  @map("convergence_divergence") @db.Decimal(5, 4)
  impliedWacc              Decimal?  @map("implied_wacc") @db.Decimal(5, 4)

  // Phase 4: Investigation tracking
  investigationResponses   Json?     @map("investigation_responses")
}
```

### 9.2 ValuationSnapshot Model (Modify)

```prisma
model ValuationSnapshot {
  // ... existing fields ...

  // Phase 1: WACC component audit trail
  dcfCsrPremium            Decimal?  @map("dcf_csr_premium") @db.Decimal(5, 4)
  dcfSizeRiskPremium       Decimal?  @map("dcf_size_risk_premium") @db.Decimal(5, 4)
  dcfCostOfDebt            Decimal?  @map("dcf_cost_of_debt") @db.Decimal(5, 4)
  dcfUseMidYear            Boolean?  @map("dcf_use_mid_year")

  // Phase 3: Convergence data at snapshot time
  convergenceDivergence    Decimal?  @map("convergence_divergence") @db.Decimal(5, 4)

  // Phase 4: Confidence score at snapshot time
  confidenceScore          Decimal?  @map("confidence_score") @db.Decimal(5, 2)
  confidenceComponents     Json?     @map("confidence_components")
}
```

### 9.3 New Model: ConvergenceAnalysis (Phase 3)

```prisma
model ConvergenceAnalysis {
  id                    String   @id @default(cuid())
  companyId             String   @map("company_id")
  dcfEnterpriseValue    Decimal  @map("dcf_enterprise_value") @db.Decimal(15, 2)
  multipleEnterpriseValue Decimal @map("multiple_enterprise_value") @db.Decimal(15, 2)
  divergencePercent     Decimal  @map("divergence_percent") @db.Decimal(5, 2)
  impliedWacc           Decimal? @map("implied_wacc") @db.Decimal(5, 4)
  explicitWacc          Decimal  @map("explicit_wacc") @db.Decimal(5, 4)
  rootCauses            Json     @map("root_causes")
  adjustments           Json     @map("adjustments")
  investigationQuestions Json    @map("investigation_questions")
  createdAt             DateTime @default(now()) @map("created_at")
  company               Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId, createdAt])
  @@map("convergence_analyses")
}
```

### 9.4 Migration Strategy

- All new columns are nullable with no default (except `useMidYearConvention` which defaults `true`)
- No data migration needed for Phase 1 -- existing rows get null, code falls back to EBITDA-tier defaults
- No existing column types change
- Decimal precision (5,4) is consistent with existing `dcfWacc` column
- `convergence_analyses` is a new table, no migration risk

---

## 10. API Changes

### 10.1 Modified: `GET /api/companies/[id]/dcf`

**Response additions (Phase 1):**
```json
{
  "suggestedDefaults": {
    "sizeRiskPremium": 0.05,
    "csrPremium": 0.065,
    "costOfDebt": 0.095,
    "sizeRiskPremiumRange": { "low": 0.04, "high": 0.06 },
    "csrPremiumRange": { "low": 0.05, "high": 0.10 },
    "costOfDebtRange": { "low": 0.085, "high": 0.11 },
    "ebitdaTier": "$500K-$1M"
  }
}
```

### 10.2 Modified: `PUT /api/companies/[id]/dcf`

**Request additions (Phase 1):**
```json
{
  "csrPremium": 0.065,
  "useMidYearConvention": true
}
```

### 10.3 New: `GET /api/companies/[id]/convergence` (Phase 3)

**Response:**
```json
{
  "divergence": {
    "percent": 42.5,
    "severity": "significant",
    "dcfEnterpriseValue": 4800000,
    "multipleEnterpriseValue": 3200000,
    "direction": "dcf_higher"
  },
  "impliedWacc": {
    "fromMultiple": 0.158,
    "explicit": 0.215,
    "gap": 0.057
  },
  "rootCauses": [
    {
      "id": "wacc_high",
      "title": "WACC above tier benchmark",
      "dollarImpact": 820000,
      "details": "Your WACC (21.5%) is above the typical range for $3M EBITDA businesses (14-18%)."
    }
  ],
  "investigationQuestions": [
    {
      "id": "q1",
      "rootCauseId": "wacc_high",
      "question": "Do you have specific risks that justify a higher discount rate?",
      "context": "Pending litigation, key customer risk, regulatory uncertainty",
      "answered": false
    }
  ],
  "adjustments": [
    {
      "id": "adj1",
      "parameter": "csrPremium",
      "currentValue": 0.065,
      "suggestedValue": 0.045,
      "rationale": "Aligning CSR with BRI score of 0.78",
      "dollarImpact": 540000,
      "confidence": "medium"
    }
  ]
}
```

### 10.4 New: `POST /api/companies/[id]/convergence/apply-adjustment` (Phase 3)

**Request:**
```json
{
  "adjustmentId": "adj1"
}
```

**Response:**
```json
{
  "success": true,
  "updatedDCF": { "enterpriseValue": 4260000, "wacc": 0.195 },
  "newDivergence": { "percent": 33.1, "severity": "significant" }
}
```

### 10.5 New: `GET /api/companies/[id]/confidence` (Phase 4)

**Response:**
```json
{
  "overallScore": 62,
  "zone": "moderate",
  "components": {
    "convergence": { "score": 45, "weight": 0.30, "guidance": "Run convergence analysis" },
    "dataQuality": { "score": 75, "weight": 0.25, "guidance": null },
    "waccCalibration": { "score": 80, "weight": 0.20, "guidance": null },
    "briCompleteness": { "score": 55, "weight": 0.15, "guidance": "Complete 8 remaining questions" },
    "investigation": { "score": 30, "weight": 0.10, "guidance": "Address 3 investigation questions" }
  }
}
```

---

## 11. UI/UX Changes

### 11.1 Phase 1: WACC Calculator Redesign

**Current layout (single section, 4 sliders):**
```
WACC Calculator
  Risk-Free Rate    [slider] 4.25%
  Market Risk Premium [slider] 5.50%
  Beta              [slider] 1.00
  Size Risk Premium [slider] 2.00%
  ---
  Cost of Debt      [input]  6.00%
  Tax Rate          [input]  25%
  ---
  Calculated WACC: 12.95%
```

**New layout (3 sections, 5 sliders + formula):**
```
WACC Calculator

COST OF EQUITY (CAPM + Build-Up)
  Risk-Free Rate        [slider] 4.25%   (10Y Treasury)
  Market Risk Premium   [slider] 5.50%   (Duff & Phelps ERP)
  Beta                  [slider] 1.00
  Size Risk Premium     [slider] 5.00%   (Based on $2M EBITDA)  <-- NEW default
  Company-Specific Risk [slider] 5.00%   (Based on BRI: 70%)   <-- NEW
  ---
  Re = 4.25% + 1.0(5.50%) + 5.00% + 5.00% = 19.75%

COST OF DEBT
  Pre-Tax Cost of Debt  [slider] 9.50%   (Based on $2M EBITDA)  <-- UPDATED default
  Tax Rate              [slider] 25%
  After-Tax Cost of Debt: 7.13%

WACC
  Equity Weight: 80%    Debt Weight: 20%
  WACC = 80%(19.75%) + 20%(7.13%) = 17.23%
  [i] Mid-year convention applied                              <-- NEW

  [ ] Use mid-year discounting convention (recommended)        <-- NEW toggle
```

**Slider range updates for WACCCalculator.tsx:**

| Input | Old Range | New Range |
|-------|----------|-----------|
| sizeRiskPremium | 0% - 6% | 0.5% - 8% |
| costOfDebt | 3% - 15% | 4% - 15% |
| NEW: csrPremium | N/A | 0% - 12% |

**Benchmark indicators:** Each slider shows a small marker for the "benchmark default" position based on EBITDA tier. If the user moves the slider away from the benchmark, a tooltip shows the deviation.

### 11.2 Phase 2: BRI Risk Narrative Panel

New collapsible section below the CSR slider on the DCF page:

```
COMPANY-SPECIFIC RISK BREAKDOWN
  CSR: 5.75% (BRI: 0.85)

  FINANCIAL (25% weight)           Score: 0.90   CSR: +0.38%  [====------]
  TRANSFERABILITY (20% weight)     Score: 0.75   CSR: +0.75%  [===-------]
  OPERATIONAL (20% weight)         Score: 0.85   CSR: +0.45%  [====------]
  MARKET (15% weight)              Score: 0.80   CSR: +0.45%  [===-------]
  LEGAL/TAX (10% weight)           Score: 0.70   CSR: +0.45%  [===-------]
  PERSONAL (10% weight)            Score: 0.90   CSR: +0.15%  [==========]

  [Improve BRI to reduce discount rate -->]
```

Each category row expands on click to show the risk narrative.

### 11.3 Phase 3: Convergence Dashboard

New card on the DCF page (right column, above sensitivity table):

```
VALUATION CONVERGENCE

  EBITDA Multiple: $3,200,000    DCF: $4,800,000
  [===============|=============================]
         ^                    ^
       Multiple              DCF

  Divergence: +50.0% (Critical)
  Implied WACC from multiple: 15.8%
  Your DCF WACC: 21.5%  (Gap: 5.7%)

  ROOT CAUSES (ranked by impact)
  1. WACC above benchmark    -$820K    [Investigate]
  2. Growth below industry   -$340K    [Investigate]
  3. Terminal value dominant  -$180K    [Investigate]

  RECOMMENDED ADJUSTMENTS
  1. Reduce CSR to 4.5%     +$540K  [Apply] [Dismiss]
  2. Increase Year 1 growth  +$180K  [Apply] [Dismiss]
```

### 11.4 Phase 4: Confidence Badge

Small badge displayed on the DCF valuation result card and on the dashboard scorecard:

```
DCF Enterprise Value: $4,260,000
Confidence: 62/100 [===========------] Moderate
            [View breakdown]
```

Expansion shows the 5-component breakdown with actionable guidance per component.

---

## 12. Calibration Validation Test Scenarios

These test scenarios verify that the recalibrated engine produces outputs within expected ranges. Each scenario has known inputs and expected outputs based on industry benchmarks.

### 12.1 Scenario A: Small Service Business ($500K EBITDA)

```
Inputs:
  EBITDA: $500,000
  FCF: $350,000 (70% conversion)
  Growth rates: [8%, 6%, 5%, 4%, 3%]
  Industry: Professional Services
  BRI: 0.55
  Capital structure: 10% debt, 90% equity
  No debt on balance sheet

Expected WACC Components:
  Risk-Free Rate: 4.25%
  Market Risk Premium: 5.50%
  Beta: 1.0
  Size Premium: 6.0% (for $500K-$1M EBITDA tier)
  CSR: 7.25% (from BRI mapping: CSR_max=10.0%, CSR_min=5.0%, BRI=0.55)
    CSR = 10.0% - 0.55 * (10.0% - 5.0%) = 7.25%
  Cost of Equity: 4.25% + 5.50% + 6.0% + 7.25% = 23.0%
  Cost of Debt: N/A (no debt)
  WACC: 23.0% (all equity)

Expected DCF (mid-year, Gordon growth):
  Year 1 FCF: $378K, PV @ 23%, mid-year: $378K / 1.23^0.5 = $341K
  Year 2 FCF: $401K, PV @ 23%, mid-year: $401K / 1.23^1.5 = $296K
  Year 3 FCF: $421K, PV @ 23%, mid-year: $421K / 1.23^2.5 = $252K
  Year 4 FCF: $438K, PV @ 23%, mid-year: $438K / 1.23^3.5 = $213K
  Year 5 FCF: $451K, PV @ 23%, mid-year: $451K / 1.23^4.5 = $178K
  Sum of FCF PV: ~$1,280K
  Terminal Value: $451K * 1.025 / (0.23 - 0.025) = ~$2,254K
  PV of TV @ mid-year: $2,254K / 1.23^4.5 = ~$889K
  Enterprise Value: ~$2,169K
  Implied multiple: ~4.3x

Expected multiple-based value (for comparison):
  With BRI=0.55, alpha=1.4:
  discountFraction = (1 - 0.55)^1.4 = 0.45^1.4 = ~0.318
  If industry multiples 3.0x-6.0x, coreScore=0.65:
  baseMultiple = 3.0 + 0.65 * 3.0 = 4.95x
  finalMultiple = 3.0 + (4.95 - 3.0) * (1 - 0.318) = 3.0 + 1.33 = 4.33x
  multipleEV = $500K * 4.33 = $2,165K
  Divergence: ($2,169K - $2,165K) / $2,165K = 0.2% (Excellent convergence)
```

### 12.2 Scenario B: Mid-Market SaaS ($3M EBITDA)

```
Inputs:
  EBITDA: $3,000,000
  FCF: $2,100,000 (70% conversion)
  Growth rates: [15%, 12%, 10%, 8%, 5%]
  Industry: Software (SaaS)
  BRI: 0.78
  Capital structure: 20% debt, 80% equity
  Cost of debt (derived): 8.5%
  Tax rate: 25%

Expected WACC Components:
  Risk-Free Rate: 4.25%
  Market Risk Premium: 5.50%
  Beta: 1.0
  Size Premium: 4.0% ($3M-$5M tier)
  CSR: 2.84% (CSR range 2.0%-5.0%, BRI=0.78)
    CSR = 5.0% - 0.78 * (5.0% - 2.0%) = 2.66%
  Cost of Equity: 4.25% + 5.50% + 4.0% + 2.66% = 16.41%
  After-tax Cost of Debt: 8.5% * (1 - 0.25) = 6.375%
  WACC: 80% * 16.41% + 20% * 6.375% = 14.40%

Expected WACC range: 14-18% for $3M-$5M EBITDA --> 14.40% is within range. PASS.
```

### 12.3 Scenario C: Established Manufacturing ($10M EBITDA)

```
Inputs:
  EBITDA: $10,000,000
  FCF: $6,500,000 (65% conversion)
  Growth rates: [4%, 3.5%, 3%, 2.5%, 2.5%]
  Industry: Manufacturing
  BRI: 0.82
  Capital structure: 35% debt, 65% equity
  Cost of debt (derived): 7.5%
  Tax rate: 25%

Expected WACC Components:
  Risk-Free Rate: 4.25%
  Market Risk Premium: 5.50%
  Beta: 1.0
  Size Premium: 2.0% ($10M-$25M tier)
  CSR: 1.04% (CSR range 0.5%-3.0%, BRI=0.82)
    CSR = 3.0% - 0.82 * (3.0% - 0.5%) = 0.95%
  Cost of Equity: 4.25% + 5.50% + 2.0% + 0.95% = 12.70%
  After-tax Cost of Debt: 7.5% * 0.75 = 5.625%
  WACC: 65% * 12.70% + 35% * 5.625% = 10.22%

Expected WACC range: 10-13% for $10M-$25M EBITDA --> 10.22% is within range. PASS.
```

### 12.4 Scenario D: High-Risk Startup ($200K EBITDA)

```
Inputs:
  EBITDA: $200,000
  FCF: $120,000 (60% conversion)
  Growth rates: [20%, 15%, 10%, 8%, 5%]
  BRI: 0.35
  All equity, no debt

Expected WACC Components:
  Size Premium: 7.0% (<$500K tier)
  CSR: 9.1% (CSR range 5.0%-12.0%, BRI=0.35)
    CSR = 12.0% - 0.35 * (12.0% - 5.0%) = 9.55%
  Cost of Equity: 4.25% + 5.50% + 7.0% + 9.55% = 26.30%
  WACC: 26.30%

Expected WACC range: 18-25% (for <$500K) --> 26.30% is above range due to very low BRI.
This is EXPECTED behavior: extremely low BRI (0.35) pushes CSR to the high end, resulting in
a WACC above the typical range. The system is correctly penalizing poor readiness.

Validation: If BRI improves to 0.70, CSR drops to:
  CSR = 12.0% - 0.70 * 7.0% = 7.10%
  New WACC = 4.25% + 5.50% + 7.0% + 7.10% = 23.85%
  This is within the 18-25% range. PASS.
```

---

## 13. Testing Requirements

### 13.1 Unit Tests (Phase 1)

| Test | File | Assertion |
|------|------|-----------|
| EBITDA tier lookup returns correct size premium for each tier boundary | `wacc-defaults.test.ts` | `getSizeRiskPremium(500000)` returns tier for $500K-$1M |
| EBITDA tier lookup returns correct CSR for each tier boundary | `wacc-defaults.test.ts` | `getCSRPremium(3000000)` returns tier for $3M-$5M |
| EBITDA tier lookup returns correct cost-of-debt for each tier | `wacc-defaults.test.ts` | `getCostOfDebt(1000000)` returns 9.5% default |
| WACC with CSR included produces higher value than without | `dcf-calculator.test.ts` | WACC with CSR > WACC without CSR |
| Mid-year convention produces higher PV than end-of-year | `dcf-calculator.test.ts` | `calculatePresentValue(100, 0.20, 1, true)` > `calculatePresentValue(100, 0.20, 1, false)` |
| Mid-year PV difference is approximately WACC/2 | `dcf-calculator.test.ts` | Difference within 1% of expected |
| Existing golden-file tests still pass | `valuation.test.ts` | All existing tests green (EBITDA-multiple formula untouched) |
| Default harmonization: all three paths produce same WACC | `wacc-defaults.test.ts` | Auto-DCF WACC == manual page WACC == component WACC for same inputs |
| Backward compatibility: saved overrides are not clobbered | `auto-dcf.test.ts` | Company with saved `sizeRiskPremium = 0.03` still uses 0.03 |

### 13.2 Unit Tests (Phase 2)

| Test | File | Assertion |
|------|------|-----------|
| BRI=0.70 produces tier-default CSR | `bri-csr-mapping.test.ts` | `csrFromBRI(0.70, tier)` == tier default |
| BRI=1.00 produces tier-minimum CSR | `bri-csr-mapping.test.ts` | `csrFromBRI(1.00, tier)` == `CSR_min` |
| BRI=0.00 produces tier-maximum CSR | `bri-csr-mapping.test.ts` | `csrFromBRI(0.00, tier)` == `CSR_max` |
| CSR monotonically decreases as BRI increases | `bri-csr-mapping.test.ts` | For BRI 0 to 1 in 0.1 steps, CSR is monotonically decreasing |
| Category CSR contributions sum to total CSR adjustment | `bri-csr-mapping.test.ts` | Sum of category contributions == total CSR |
| Manual CSR override is not affected by BRI change | `auto-dcf.test.ts` | Auto-DCF respects `isManuallyConfigured` flag |

### 13.3 Unit Tests (Phase 3)

| Test | File | Assertion |
|------|------|-----------|
| Divergence calculation is correct | `convergence.test.ts` | `(4.8M - 3.2M) / 3.2M = 0.50` |
| Severity classification is correct at boundaries | `convergence.test.ts` | 9.99% = "low", 10.00% = "moderate", 25.00% = "significant", 50.01% = "critical" |
| Implied WACC solve converges for realistic inputs | `convergence.test.ts` | Result within 0.5% of analytic solution |
| Implied WACC solve handles edge cases | `convergence.test.ts` | Returns null for negative FCF, zero EBITDA |
| Root causes are ranked by dollar impact descending | `convergence.test.ts` | First root cause has largest `dollarImpact` |
| Adjustment application updates DCF assumptions | `convergence.test.ts` | `applyAdjustment()` modifies the correct field |

### 13.4 Integration Tests

| Test | Scope | Assertion |
|------|-------|-----------|
| Full snapshot pipeline with CSR | Phase 1+2 | `recalculateSnapshotForCompany()` stores `dcfCsrPremium` in snapshot |
| DCF page load with new defaults | Phase 1 | Page renders without errors, shows CSR slider, displays EBITDA-tier defaults |
| Convergence API returns valid response | Phase 3 | `GET /api/companies/[id]/convergence` returns 200 with valid schema |
| Adjustment application round-trip | Phase 3 | POST adjustment -> GET convergence shows updated divergence |
| Confidence score calculation end-to-end | Phase 4 | `GET /api/companies/[id]/confidence` returns score in [0, 100] |

### 13.5 Calibration Tests (Golden File)

Add a new test file `wacc-calibration.test.ts` that encodes Scenarios A-D from Section 12 as golden-file assertions. These prevent regression if constants are changed.

```typescript
it('Scenario A: $500K EBITDA service business produces WACC ~23%', () => {
  const wacc = calculateCalibratedWACC({ ebitda: 500000, bri: 0.55, debtWeight: 0 })
  expect(wacc).toBeCloseTo(0.23, 1)
})

it('Scenario B: $3M EBITDA SaaS produces WACC ~14.4%', () => {
  const wacc = calculateCalibratedWACC({ ebitda: 3000000, bri: 0.78, debtWeight: 0.20, costOfDebt: 0.085 })
  expect(wacc).toBeCloseTo(0.144, 1)
})

it('Scenario C: $10M EBITDA manufacturing produces WACC ~10.2%', () => {
  const wacc = calculateCalibratedWACC({ ebitda: 10000000, bri: 0.82, debtWeight: 0.35, costOfDebt: 0.075 })
  expect(wacc).toBeCloseTo(0.102, 1)
})
```

---

## 14. Out of Scope

| Item | Rationale | Where It Belongs |
|------|-----------|-----------------|
| Monte Carlo simulation for valuation ranges | High build cost, low user-facing value at current phase. Sensitivity tables provide 80% of the insight. | Phase 3+ (LATER) |
| Dynamic beta from public comparables | Requires comp database integration. Beta = 1.0 default is defensible for SMB. | Phase 3+ (LATER) |
| Real-time Treasury rate feed for risk-free rate | 4.25% is manually updateable; rate changes slowly. Adds infrastructure complexity for minimal value. | NEVER (update constants quarterly) |
| WACC audit report export (PDF) | Valuable but not until the WACC is credible. Build after Phase 1 validation. | Phase 2+ (NEXT) |
| AI-generated narrative valuation summary | Phase 3 covers investigation questions. Full narrative generation is a separate feature. | LATER |
| Multi-scenario DCF (bull/bear/base) | Sensitivity table covers this partially. Full scenario modeling is Exit-Ready Phase 3. | LATER |
| Weighted-average of DCF and multiple valuation | Users need to understand divergence before we blend. Phase 3 surfaces divergence; blending is premature. | LATER (only if users demand it) |
| Custom BRI-to-CSR mapping weights | Default mapping is sufficient. Users can override CSR directly. Custom mapping adds complexity without validated demand. | KILLED unless user research shows need |
| Industry-specific WACC benchmarks from external data providers | Cost prohibitive for current stage. EBITDA-tier defaults are defensible and transparent. | Phase 3+ if revenue supports data licensing |
| Regression analysis of BRI-to-valuation sensitivity | Interesting analytics but not user-facing value. Internal analysis only. | DEFER |

---

## 15. Risks and Mitigations

### 15.1 Technical Risks

| Risk | Phase | Likelihood | Impact | Mitigation |
|------|-------|-----------|--------|------------|
| Existing saved DCF assumptions produce different WACCs after code changes | 1 | High | Medium | Saved overrides are preserved. Only un-overridden fields use new defaults. Add migration logic to NOT overwrite existing non-null columns. |
| `Decimal(5,4)` overflow for high CSR values | 1 | Low | High | CSR max is 12% (0.12), well within Decimal(5,4) range of 9.9999. But validate input bounds in the API. |
| Implied WACC binary search diverges | 3 | Low | Medium | Cap iterations at 100, bound search to [0.01, 0.50]. Return null if no convergence. |
| Auto-DCF + BRI creates circular recalculation loops | 2 | Low | High | BRI change triggers ONE snapshot recalculation. Snapshot creation does NOT trigger BRI recalculation. One-directional dependency. |

### 15.2 Product Risks

| Risk | Phase | Likelihood | Impact | Mitigation |
|------|-------|-----------|--------|------------|
| Users perceive higher WACC as "the platform got worse" | 1 | High | High | Frame as "more accurate, calibrated to market benchmarks." Show benchmark comparisons. Blog post explaining the change. In-app banner for 30 days. |
| Users don't understand CSR and ignore it | 1 | Medium | Low | Smart defaults mean CSR works without user interaction. BRI narratives (Phase 2) make it concrete. |
| Convergence analysis confuses non-financial founders | 3 | Medium | Medium | Gate behind Exit-Ready tier. Simple divergence indicator on Growth tier. Full analysis for sophisticated users only. |
| Confidence score becomes a vanity metric | 4 | Medium | Low | Tie actionable guidance to each component. Users see specific steps to improve, not just a number. |

### 15.3 Business Risks

| Risk | Phase | Likelihood | Impact | Mitigation |
|------|-------|-----------|--------|------------|
| Advisors challenge our WACC methodology | 1-2 | Medium | Medium | Transparent formula display. Every input is auditable. Provide "methodology notes" link. Benchmarks cited with sources. |
| Competitors copy the BRI-to-WACC integration | 2 | Low | Low | Execution speed and data accumulation are our moat. Feature is defensible through compounding user data. |
| DCF engagement drops because values are lower | 1 | Low | Medium | Monitor DCF page views and save rates for 30 days post-launch. If engagement drops >20%, add "what changed" explainer. |

---

## 16. Dependencies

### 16.1 Phase 1 Dependencies

| Dependency | Status | Blocker? |
|-----------|--------|----------|
| P0 bug fix: alphaConstant schema default 0.40 vs code 1.4 | Identified in roadmap NOW-4 | YES -- must fix before any DCF schema changes to avoid data confusion |
| P0 bug fix: Decimal(4,2) overflow for high multiples | Identified in roadmap NOW-5 | YES -- new Decimal columns must use correct precision |
| Existing `ValuationSnapshot.dcfWacc` column (Decimal 5,4) | Exists | No -- we add columns alongside, don't modify |
| `DCFAssumptions` model exists with `isManuallyConfigured` flag | Exists | No -- we extend, don't break |
| EBITDA available on Company model (`annualEbitda`) | Exists | No -- fallback to revenue-estimated EBITDA exists |

### 16.2 Phase 2 Dependencies

| Dependency | Status | Blocker? |
|-----------|--------|----------|
| Phase 1 complete (CSR field exists in data model) | This PRD | YES |
| BRI scoring functions in `bri-scoring.ts` | Exists | No |
| `recalculateSnapshotForCompany()` exists and handles auto-DCF | Exists | No -- extend to pass BRI-derived CSR |
| P1 bug fix: BRI weights in 6+ files with no single source of truth | Identified in roadmap | SOFT -- code will work but maintenance debt remains |

### 16.3 Phase 3 Dependencies

| Dependency | Status | Blocker? |
|-----------|--------|----------|
| Phase 1 + Phase 2 complete | This PRD | YES |
| Both DCF and multiple-based valuations exist for a company | Partial -- multiple-based always exists; DCF requires financial data | No -- graceful degradation when DCF unavailable |
| Industry multiples are reasonably current | Existing cron job refreshes | No -- stale multiples flagged as a convergence root cause |

### 16.4 Phase 4 Dependencies

| Dependency | Status | Blocker? |
|-----------|--------|----------|
| Phase 3 complete (convergence data) | This PRD | YES for convergence component; other components can ship independently |
| Assessment question count available | Exists in BRI scoring | No |
| Financial data completeness detectable | Exists in auto-DCF checks | No |

---

## 17. Decision Log

| Decision | Date | Rationale | Alternatives Considered |
|----------|------|-----------|------------------------|
| Use EBITDA-based tiers instead of revenue-based | 2026-02-15 | EBITDA is a better proxy for business quality and risk than revenue. A $5M revenue company with 5% margins has different risk than one with 25% margins. | Hybrid (revenue + margin), industry-specific tiers |
| BRI = 0.70 maps to tier-default CSR | 2026-02-15 | 0.70 is the median BRI for active users (estimated). Anchoring at the median means half of users see CSR go down (reward) and half see it go up (penalty). | BRI = 0.50 (mathematical midpoint), BRI = 0.80 (aspirational anchor) |
| Mid-year convention defaults ON | 2026-02-15 | Industry standard for going concerns. Partially offsets the WACC increase from CSR, reducing sticker shock on DCF values. | Default OFF with recommendation to enable; always ON with no toggle |
| CSR is additive to cost of equity, not to WACC directly | 2026-02-15 | Ibbotson/Duff & Phelps build-up methodology. CSR represents equity risk, not blended capital risk. | Add to WACC directly (simpler but methodologically incorrect) |
| Gate convergence analysis behind Exit-Ready tier | 2026-02-15 | Convergence analysis serves sophisticated users who have both DCF and multiple valuations. These users are likely Exit-Ready candidates. Growth-tier users see divergence percentage only. | Full access for Growth tier; separate add-on pricing |
| Store WACC component breakdown in snapshot | 2026-02-15 | Audit trail is essential for financial software. When defaults change, we need to know what values were used for each historical snapshot. | Store only computed WACC (simpler but no audit trail) |
| Binary search for implied WACC instead of analytical solve | 2026-02-15 | Numerical solve is more robust across different terminal value methods. Analytical solution exists only for Gordon growth model. | Analytical formula for Gordon only; Newton's method (faster but less stable) |
| Confidence score includes "investigation completion" at only 10% weight | 2026-02-15 | Investigation questions are Phase 3 feature; giving them high weight would penalize users who haven't reached Phase 3 yet. Weight increases in future versions as investigation becomes standard workflow. | Equal weighting across all 5 components; no investigation component |

---

## Appendix A: File Impact Summary

| File | Phase | Change Type | Description |
|------|-------|-------------|-------------|
| `src/lib/valuation/wacc-defaults.ts` | 1 | **NEW** | Single source of truth for all WACC constants and tier lookups |
| `src/lib/valuation/dcf-calculator.ts` | 1 | Modify | Add `csrPremium` to `WACCInputs`, add `useMidYearConvention` to `DCFInputs`, update `calculateCostOfEquity`, `calculatePresentValue`, `calculateDCF` |
| `src/lib/valuation/auto-dcf.ts` | 1 | Modify | Remove hardcoded constants, import from `wacc-defaults.ts`, add CSR to WACC calculation, add mid-year convention |
| `src/app/(dashboard)/dashboard/valuation/page.tsx` | 1 | Modify | Import defaults from `wacc-defaults.ts`, add CSR state, add mid-year toggle, update `DEFAULT_ASSUMPTIONS` |
| `src/components/valuation/WACCCalculator.tsx` | 1 | Modify | Add CSR slider, update `INPUT_RANGES`, update formula display, add `WACCInputs.csrPremium` |
| `src/components/valuation/index.ts` | 1 | Modify | Export updated types |
| `prisma/schema.prisma` | 1, 3, 4 | Modify | Add columns to `DCFAssumptions`, `ValuationSnapshot`; add `ConvergenceAnalysis` model |
| `src/lib/valuation/bri-csr-mapping.ts` | 2 | **NEW** | BRI-to-CSR mapping function and risk narratives |
| `src/lib/valuation/recalculate-snapshot.ts` | 2 | Modify | Pass BRI-derived CSR to auto-DCF |
| `src/lib/valuation/convergence.ts` | 3 | **NEW** | Convergence calculation, implied WACC solve, root cause analysis |
| `src/app/api/companies/[id]/convergence/route.ts` | 3 | **NEW** | Convergence API endpoint |
| `src/lib/valuation/confidence.ts` | 4 | **NEW** | Confidence score calculation |
| `src/app/api/companies/[id]/confidence/route.ts` | 4 | **NEW** | Confidence score API endpoint |
| `src/__tests__/wacc-defaults.test.ts` | 1 | **NEW** | Tests for tier lookups and constant harmonization |
| `src/__tests__/wacc-calibration.test.ts` | 1 | **NEW** | Golden-file calibration tests (Scenarios A-D) |
| `src/__tests__/bri-csr-mapping.test.ts` | 2 | **NEW** | Tests for BRI-to-CSR mapping |
| `src/__tests__/convergence.test.ts` | 3 | **NEW** | Tests for convergence engine |
| `src/__tests__/confidence.test.ts` | 4 | **NEW** | Tests for confidence scoring |

---

## Appendix B: DRIP Matrix Classification

| Feature | Category | Priority | Rationale |
|---------|----------|----------|-----------|
| WACC Recalibration (Phase 1) | **R -- Replace** | Highest | Replaces wrong defaults with market-calibrated values. Trust-critical. |
| BRI-to-WACC Integration (Phase 2) | **P -- Produce** | High | Creates the retention loop: BRI improvement -> DCF improvement -> perceived value. |
| Convergence Engine (Phase 3) | **R -- Replace** | High | Replaces $5K-$8K advisory reconciliation. Strong value multiple. |
| Confidence Score (Phase 4) | **D -- Delegate** | Medium | AI/system handles quality assessment that users would otherwise do manually (or not at all). |

---

## Appendix C: Compounding Value Assessment

| Feature | Data Accumulation | Content Accumulation | Learning Accumulation | Score |
|---------|:-:|:-:|:-:|:-:|
| WACC Recalibration | Low (static tiers) | Low | Low | 1/3 |
| BRI-to-WACC Integration | High (BRI history drives CSR trend) | Medium (risk narratives build over time) | Medium (CSR calibration improves with data) | 2.5/3 |
| Convergence Engine | Medium (historical divergence trends) | High (investigation Q&A accumulates) | High (adjustment patterns inform recommendations) | 2.5/3 |
| Confidence Score | High (improves as data accumulates) | Low | Medium | 2/3 |

BRI-to-WACC Integration and Convergence Engine score highest on compounding -- they become more valuable over time as the user's data improves and their engagement history informs recommendations. This supports the Phase 2/3 priority.

---

*End of PRD*
