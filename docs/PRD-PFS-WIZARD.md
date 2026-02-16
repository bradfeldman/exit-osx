# PFS Onboarding Wizard — Complete Specification

**Date:** 2026-02-15
**Status:** Approved — Ready to Build
**Designed by:** 7 specialist agents (Wealth Advisor, Financial Modeling Engineer, Customer Success, UX Designer, Product Lead, Product Manager, Project Manager)

---

## Executive Summary

Replace the blank PFS form with a guided 6-step wizard that collects personal financial data through focused questions, then reveals financial insights with dramatic animation — creating a "holy shit, this is cool" moment. The wizard pre-fills 80%+ of the PFS, completes in under 4 minutes, and is FREE for all tiers (conversion driver).

**Core insight:** It converts an abstract business Value Gap into a personal retirement gap measured in years of your life. That is the most powerful retention and conversion mechanism we can build.

---

## PHASE 1: MVP (Build Now)

### The 6-Step Flow

#### Step 1: About You (30 seconds)
- **Age** (stepper, 18-100) — pre-filled from existing PFS if available
- **Marital status** (single/married toggle) — stored in notes JSON for future use
- Copy: "Let's build your financial picture in under 4 minutes."
- Validation: Age required, 18-100. Marital status required.

#### Step 2: Home & Real Estate (45 seconds)
- **Do you own a home?** (Yes/No toggle)
- If yes: Home value input + mortgage balance input
- **Other real estate?** (Yes/No → value + debt)
- Auto-creates Personal Asset (Real Estate) and Personal Liability (Mortgage)
- Skip: If "No" to both, proceed with $0

#### Step 3: Retirement Accounts (60 seconds)
- **Do you have retirement accounts?** (Yes/No toggle)
- If yes: Dynamic row entry (name + value), add more button
- Tax treatment badges appear in real-time ("Tax-free" for Roth, "Tax-deferred" for 401k)
- Uses existing `detectTaxTreatment()` from `account-type-detector.ts`
- Copy: "Many founders have most of their wealth in their business. Whatever you have is a great start."

#### Step 4: Other Assets (30 seconds)
- 4 simple currency fields: Cash & Savings, Investment Accounts, Vehicles, Other
- All optional, default $0
- Skip button available

#### Step 5: Debts (30 seconds)
- **Any debts besides mortgage?** (Yes/No toggle)
- If yes: Dynamic rows with category dropdown (Auto Loan, Student Loan, Credit Card, Personal Loan, Other) + amount
- Copy: "Most successful founders carry strategic debt while building value."

#### Step 6: The Reveal (the wow moment)

**Animation Timeline:**
```
T=0ms        Dark gradient card fades in
T=300ms      "Calculating your financial picture..." with pulsing dots
T=1500ms     Card scales up with spring physics
T=1800ms     "Your Net Worth" badge fades in
T=2000ms     Counter starts rolling from $0 to actual net worth
T=3500ms     Counter reaches final value (cubic ease-out deceleration)
T=2500ms     Confetti fires (if net worth > $500K; brand colors)
T=3800ms     Three insight cards appear in sequence (500ms stagger):
```

**Insight Card 1: Business Concentration**
- "Your business represents X% of your net worth"
- Green (<50%), Amber (50-80%), Red (>80%)
- Context: "The average diversified investor has less than 5% in any single asset."

**Insight Card 2: After-Tax Preview**
- "After taxes, your $X business becomes ~$Y"
- Uses 25% estimated tax haircut for MVP
- Shows both current valuation AND potential valuation (Value Gap closed)

**Insight Card 3: Retirement Gap Preview**
- "Your exit proceeds fund X years of retirement"
- Uses simplified calculation from existing retirement-calculator.ts
- Green if funded, amber if close, red if short

**CTAs:**
- Primary: "View Your Retirement Projections" → Retirement Calculator (if Growth+)
- Secondary: "View Your Full PFS" → existing PFS page with pre-filled data
- If free tier with locked Retirement Calculator: "Unlock Detailed Projections" → upgrade prompt

### Technical Architecture

#### Component Structure
```
src/components/pfs-wizard/
  PFSWizardFlow.tsx              — Main orchestrator (mirrors OnboardingFlow.tsx)
  steps/
    AgeStep.tsx                  — Step 1: Age + Marital Status
    HomeStep.tsx                 — Step 2: Home + Real Estate
    RetirementStep.tsx           — Step 3: Retirement Accounts
    OtherAssetsStep.tsx          — Step 4: Cash, Investments, Vehicles
    DebtsStep.tsx                — Step 5: Other Debts
    RevealStep.tsx               — Step 6: The Reveal + CTAs
  PFSWizardTypes.ts              — Shared types (PFSWizardData, PFSWizardStepProps)
  pfs-wizard-utils.ts            — Data mapping (wizard state → API payload)
```

#### Data Model
- **No schema changes** — all wizard data maps to existing PersonalFinancials fields
- Wizard metadata (maritalStatus, completionQuality, stepsSkipped) stored in `notes` field as JSON string
- Business value auto-pulled from latest ValuationSnapshot

#### State Management
- React state only during wizard (no sessionStorage — wizard is < 4 minutes)
- If user navigates away, data is lost — they restart
- Single PUT to `/api/companies/[id]/personal-financials` on completion
- Calls `refetchProgression()` to update ProgressionContext and unlock Retirement Calculator

#### Wizard State Interface
```typescript
interface PFSWizardData {
  // Step 1
  currentAge: number | null
  maritalStatus: 'single' | 'married' | null

  // Step 2
  ownsHome: boolean | null
  homeValue: number
  mortgageBalance: number
  hasOtherRealEstate: boolean
  otherRealEstateValue: number
  otherRealEstateDebt: number

  // Step 3
  hasRetirementAccounts: boolean | null
  retirementAccounts: Array<{
    id: string
    name: string
    value: number
  }>

  // Step 4
  cashAndSavings: number
  investmentAccounts: number
  vehicles: number
  otherAssets: number

  // Step 5
  hasOtherDebts: boolean | null
  debts: Array<{
    id: string
    category: string
    amount: number
  }>
}
```

#### Data Mapping (Wizard → API)
```typescript
// personalAssets JSON array:
[
  { name: "Primary Residence", type: "Real Estate", value: homeValue },
  { name: "Other Real Estate", type: "Real Estate", value: otherRealEstateValue },
  ...retirementAccounts.map(a => ({ name: a.name, type: "Retirement", value: a.value })),
  { name: "Cash & Savings", type: "Cash", value: cashAndSavings },
  { name: "Investment Accounts", type: "Investments", value: investmentAccounts },
  { name: "Vehicles", type: "Vehicles", value: vehicles },
  { name: "Other Assets", type: "Other", value: otherAssets },
]

// personalLiabilities JSON array:
[
  { name: "Mortgage", type: "Mortgage", balance: mortgageBalance },
  { name: "Other Real Estate Debt", type: "Mortgage", balance: otherRealEstateDebt },
  ...debts.map(d => ({ name: d.category, type: d.category, balance: d.amount })),
]

// retirementAccounts JSON array: (mapped separately with tax treatment)
retirementAccounts.map(a => ({
  name: a.name,
  value: a.value,
  taxTreatment: detectTaxTreatment(a.name, "Retirement Accounts"),
}))

// notes: JSON string with wizard metadata
{
  wizardCompleted: true,
  wizardCompletedAt: ISO date,
  wizardVersion: 1,
  maritalStatus: 'single' | 'married',
  completionQuality: 'full' | 'partial',
  stepsSkipped: number[],
}
```

#### Validation Rules
| Field | Rule | Error Message |
|---|---|---|
| currentAge | Required. Integer. 18-100 | "Please enter your age (18-100)" |
| maritalStatus | Required | "Please select your status" |
| homeValue | Required if ownsHome. 0-50,000,000 | "Please enter your home's approximate value" |
| mortgageBalance | Optional if ownsHome. 0-60,000,000 | "Please enter a valid mortgage balance" |
| retirementAccounts[].name | Required if value > 0 | "Please name this account" |
| retirementAccounts[].value | Required. 0-100,000,000 | "Please enter a valid amount" |
| debts[].category | Required | "Please select a category" |
| debts[].amount | Required. > 0 | "Please enter the amount owed" |

#### Entry Points
1. **Auto-trigger**: When user navigates to `/dashboard/financials/personal` with no existing PFS data
2. **Sidebar**: PFS link routes to wizard if `hasPersonalFinancials === false`
3. **Value Home**: "Complete Your Financial Picture" card (future sprint)

#### Edge Cases
| Case | Handling |
|---|---|
| No business valuation | Wizard still works. Reveal shows personal-only net worth. Business section shows "Complete your assessment to include business value" |
| Multiple businesses | Each company listed separately with latest valuation and 100% default ownership |
| User skips most steps | Minimum: Step 1 (age) required. Reveal adjusts: "Add personal assets for the complete picture" |
| Negative net worth | Shown in red. Message: "Many successful founders carry strategic debt while building value." |
| User returns after completion | Shows standard PFS form. "Re-run guided setup" link available |
| API failure on save | Toast error, retry button, data preserved in state |

#### Tier Gating
| Element | Foundation (Free) | Growth ($179) | Exit-Ready ($449) |
|---|---|---|---|
| PFS Wizard (all 6 steps) | Full | Full | Full |
| Reveal insights | Full | Full | Full |
| Retirement Calculator | Locked | Full | Full + sensitivity |
| Full PFS form editing | Full | Full | Full |

#### Success Metrics
| Metric | Target |
|---|---|
| Wizard completion rate | >65% |
| Median completion time | <4 minutes |
| Step-level drop-off | No step >20% |
| Retirement Calculator unlock rate | >25% of Growth users |
| Conversion lift (completers vs non) | +15% |
| Kill criteria | <40% completion OR negative conversion after 500 starts |

#### Analytics Events
| Event | Payload |
|---|---|
| `pfs_wizard_started` | `{ entryPoint, hasExistingData }` |
| `pfs_wizard_step_completed` | `{ stepNumber, stepName, timeSpentMs, fieldsCompleted }` |
| `pfs_wizard_step_skipped` | `{ stepNumber, stepName }` |
| `pfs_wizard_completed` | `{ totalTimeMs, stepsSkipped, netWorth, wealthConcentration }` |
| `pfs_wizard_abandoned` | `{ lastStep, totalTimeMs }` |
| `pfs_wizard_save_failed` | `{ error, retryCount }` |

#### Build Estimate
| Component | Estimate |
|---|---|
| PFSWizardFlow.tsx (orchestrator) | 1 day |
| Steps 1-5 (input components) | 2 days |
| Step 6 (Reveal) | 1.5 days |
| PFS page integration | 0.5 day |
| Utils + data mapping | 0.5 day |
| Testing | 1 day |
| **Total** | **6.5 days** |

---

## PHASE 2: Advanced Intelligence (Build Later)

### Full Inference Engine
**Owner:** Financial Modeling Engineer
**Location:** `src/lib/pfs-wizard/`

#### File Structure
```
src/lib/pfs-wizard/
  index.ts                    — Re-exports public API
  types.ts                    — All type definitions
  tax-calculator.ts           — Federal + state + NIIT tax waterfall
  exit-proceeds-calculator.ts — After-tax proceeds from business sale
  wealth-metrics.ts           — Concentration, runway, freedom number, lifestyle gap
  smart-defaults.ts           — Estimation engine for rough wizard answers
  sensitivity-analysis.ts     — Scenario modeling
  guardrails.ts               — Validation, sanity checks, anomaly detection
  constants.ts                — Tax brackets, default tables, benchmarks
```

#### Tax Waterfall (replaces 25% estimate)
```
Gross Enterprise Value
  × Ownership Percentage
  = Gross Proceeds to Owner
  - Transaction Costs (6-10% broker + $50K-$125K fixed)
  = Net Proceeds Before Tax
  - Cost Basis
  = Taxable Gain
  - QSBS Exclusion (Section 1202, up to $10M if C-Corp, 5+ years)
  - Depreciation Recapture (taxed at 25%)
  = Net Taxable Capital Gain
  - Federal LTCG (progressive: 0% / 15% / 20%, stacks on ordinary income)
  - NIIT (3.8% on gains above $200K/$250K)
  - State Income Tax
  = After-Tax Proceeds
  - Outstanding Business Debt
  = Final Take-Home
```

#### Federal LTCG Brackets (2026 projected)
| Filing Status | 0% Rate | 15% Rate | 20% Rate |
|---|---|---|---|
| Single | $0-$48,350 | $48,350-$533,400 | $533,400+ |
| Married Filing Jointly | $0-$96,700 | $96,700-$600,050 | $600,050+ |

**Critical:** Capital gains stack on top of ordinary income for bracket determination.

#### QSBS Analysis (Section 1202)
- C-Corporation stock only (NOT S-Corp, LLC)
- Held ≥ 5 years, gross assets < $50M at issuance
- Excludes lesser of $10M or 10x adjusted basis
- Non-conforming states: CA, MS, AL
- If eligible, potential savings of $500K-$2M+

#### Smart Defaults (Pre-Population)
Uses SCF (Survey of Consumer Finances) 2022 data, age-based and income-based:

**Retirement Account Estimation:**
```
totalRetirement = SCF_median(age) × incomeMultiplier(income) × businessOwnerPremium
```
- Age 35-44: median $85K, P75 $250K
- Age 45-54: median $165K, P75 $475K
- Age 55-64: median $225K, P75 $700K

**Home Value Estimation:**
```
homeValue = stateMedian × incomeScalar(income)
mortgage = homeValue × stateLTV × agePaydownFactor(age)
```
- State medians range $150K (AR, WV) to $850K (CA, HI)
- LTV paydown: 95% at 25-34, 60% at 45-54, 20% at 65-74

**Confidence Scoring:**
```typescript
interface InferredValue<T> {
  value: T
  confidence: 'high' | 'medium' | 'low'
  explanation: string
  marginOfError: number       // 0.25 = ±25%
  rangeLow: T
  rangeHigh: T
  isUserOverride: boolean
}
```

#### Wealth Metrics
1. **Freedom Number** = (annualSpending - guaranteedIncome) / SWR
   - SWR: 3.5% (age <50), 3.75% (50-59), 4.0% (60+)
2. **Retirement Runway** = year-by-year simulation with growth, inflation, SS
3. **Passive Income** = investableAssets × 4% + Social Security + other
4. **Lifestyle Gap** = annualSpending - totalPassiveIncome
5. **Break-Even Business Value** = bisection method to find minimum sale price for funded retirement

#### Sensitivity Analysis (3×3 grid)
- **Sale price:** -20%, base, +20%
- **Timeline:** now, +3 years, +5 years
- **Lifestyle:** -20% spending, base, +20% spending

#### Guardrails (16 anomaly detection rules)
- G-001: retirementAge ≤ currentAge (warning)
- G-020: concentration > 90% (critical)
- G-030: spending > 1.5× EBITDA (warning)
- G-040: mortgage > homeValue (warning)
- G-070: cash < 3 months expenses (warning)
- G-080: QSBS not eligible due to entity type (info)

### Progressive Follow-Up Questions (Tier 2)
Surface 1 per session over 7-14 days, each with dollar-impact framing:

1. **Entity type** — "This determines whether you pay tax once or twice. Difference: $500K-$1M+"
2. **Are you married?** — Doubles QSBS exclusion
3. **Children/dependents?** — Gifting strategies
4. **Estate plan status?** — "Without one, your state decides who gets your assets"
5. **Advisory team?** — CPA, attorney, wealth advisor
6. **Annual retirement contributions** — Accumulation modeling
7. **Other significant assets/liabilities** — Catch-all

### Dollar-Impact Ranking of Planning Levers
1. Entity structure: $200K-$1M impact
2. State tax planning: $0-$665K impact
3. Deal structure: $150K-$500K impact
4. Pre-exit gifting: $100K-$500K impact
5. Charitable strategies: $75K-$300K impact
6. Retirement optimization: $25K-$100K impact

### Schema Changes (Phase 2 only)
```prisma
model PersonalFinancials {
  // ... existing fields ...
  monthlySpending    Decimal?  // Enables exit number calculation
  stateCode          String?   // Residence state for tax calc
  maritalStatus      String?   // SINGLE, MARRIED
  wizardCompletedAt  DateTime? // Timestamp for analytics
}

model Company {
  // ... existing fields ...
  entityType         String?   // C_CORP, S_CORP, LLC, etc.
}
```

### Additional Phase 2 Features
- Ballpark mode (range selectors vs exact inputs)
- Category card selection pattern (vs simple inputs)
- Running total sticky bar
- Detailed composition bar chart on reveal
- "Your Exit Number" calculation step
- Server-side inference API endpoint
- Spouse/partner financial data
- PDF export from wizard

### Worked Example (from Financial Modeling Engineer)

**Owner:** Age 52, California, MFJ, S-Corp, 15 years, $4.5M valuation, 100% ownership

| Step | Amount |
|---|---|
| Gross EV | $4,500,000 |
| Transaction costs (6% + $100K fixed) | -$370,000 |
| Net before tax | $4,130,000 |
| Cost basis | -$200,000 |
| Taxable gain | $3,930,000 |
| Federal LTCG (progressive brackets) | -$741,493 |
| NIIT (3.8%) | -$139,840 |
| CA state tax (13.3%) | -$522,690 |
| **Total tax** | **-$1,404,023** |
| **Effective rate** | **35.7%** |
| **Final take-home** | **$2,725,977** |

Post-exit: $4.03M investable → $191K/year passive income → $25K/year lifestyle gap → works 3 more years to close it.

---

## Files Referenced
- PFS page: `src/app/(dashboard)/dashboard/financials/personal/page.tsx`
- PFS API: `src/app/api/companies/[id]/personal-financials/route.ts`
- Validation: `src/lib/security/validation.ts` (personalFinancialsSchema)
- Retirement calculator: `src/lib/retirement/retirement-calculator.ts`
- Account type detector: `src/lib/retirement/account-type-detector.ts`
- Onboarding wizard: `src/components/onboarding/OnboardingFlow.tsx`
- Valuation reveal: `src/components/onboarding/steps/ValuationRevealStep.tsx`
- Celebration: `src/components/onboarding/steps/CelebrationStep.tsx`
- Motion: `src/lib/motion.tsx` (LazyMotion, m as motion, AnimatePresence)
- Progression: `src/contexts/ProgressionContext.tsx`
- Sidebar nav: `src/components/layout/Sidebar.tsx`
- Prisma schema: `prisma/schema.prisma` (PersonalFinancials at line 269)

---

## Killed Features (Never build without new data)
1. Asset-by-asset entry in wizard (use full form)
2. Monte Carlo simulation on reveal
3. Real-time recalc during input
4. Save and continue later (it's 4 minutes)
5. Plaid/bank connections
6. Cost basis input in wizard
7. Tax optimization recommendations (liability concern)
8. PDF export from wizard
9. Spouse data (Phase 2+)
10. 529/education savings (Phase 2+)
11. Custom asset categories in wizard (available on full form)
