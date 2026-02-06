# Bug Report: Valuation Inconsistency During Onboarding

**Severity:** Critical
**Status:** Root Cause Identified
**Date:** 2026-02-04

## Executive Summary

The valuation displayed during onboarding uses a **fundamentally different calculation** than the rest of the application. This creates a jarring experience where users see one value during onboarding, then different values on the dashboard. The bug has persisted because developers fixed symptoms without identifying the root cause: **three separate calculation formulas exist in the codebase**.

---

## Root Causes Identified

### Bug #1: LINEAR vs NON-LINEAR Formula (CRITICAL)

**Location:** `src/components/onboarding/OnboardingFlow.tsx` lines 342-345

```typescript
// ONBOARDING - Uses LINEAR formula
const potentialValue = industryPreviewData?.valuationHigh || formData.annualRevenue * 2.5
const briRatio = scanResults.briScore / 100
const currentValue = Math.round(potentialValue * briRatio)  // ❌ LINEAR!
```

**Correct formula in** `src/lib/valuation/recalculate-snapshot.ts` lines 294-301:

```typescript
// BACKEND - Uses NON-LINEAR formula with ALPHA=1.4
const baseMultiple = industryMultipleLow + coreScore * (industryMultipleHigh - industryMultipleLow)
const discountFraction = Math.pow(1 - briScore, ALPHA)  // ✅ NON-LINEAR
const finalMultiple = industryMultipleLow + (baseMultiple - industryMultipleLow) * (1 - discountFraction)
const currentValue = adjustedEbitda * finalMultiple
```

**Impact Example (BRI Score = 70):**
| Formula | Calculation | Result |
|---------|-------------|--------|
| Onboarding (Linear) | `$1M × 0.70` | $700,000 |
| Backend (Non-linear) | `$1M × (1 - 0.30^1.4)` | ~$815,000 |
| **Difference** | | **+16.4%** |

---

### Bug #2: potentialValue Calculated Differently

**Onboarding calculates:**
```typescript
potentialValue = adjustedEbitda × multipleHigh  // e.g., EBITDA × 6.0
```

**Backend (recalculate-snapshot.ts) calculates:**
```typescript
potentialEbitda = adjustedEbitda × ebitdaImprovementMultiplier  // Up to 1.25x
potentialValue = potentialEbitda × baseMultiple  // baseMultiple < multipleHigh
```

The backend considers **EBITDA improvement potential** from closing BRI gaps, while onboarding does not.

---

### Bug #3: Core Score Formula Mismatch (6 factors vs 5 factors)

**Dashboard** (`src/app/api/companies/[id]/dashboard/route.ts` lines 29-90) uses **6 factors**:
```typescript
const scores = [
  factorScores.revenueSizeCategory[...],  // ✅ INCLUDED
  factorScores.revenueModel[...],
  factorScores.grossMarginProxy[...],
  factorScores.laborIntensity[...],
  factorScores.assetIntensity[...],
  factorScores.ownerInvolvement[...],
]
return scores.reduce((a, b) => a + b, 0) / scores.length  // Divides by 6
```

**Onboarding-snapshot & recalculate-snapshot** use **5 factors**:
```typescript
const scores = [
  // ❌ revenueSizeCategory NOT INCLUDED
  factorScores.revenueModel[...],
  factorScores.grossMarginProxy[...],
  factorScores.laborIntensity[...],
  factorScores.assetIntensity[...],
  factorScores.ownerInvolvement[...],
]
return scores.reduce((a, b) => a + b, 0) / scores.length  // Divides by 5
```

**Impact Example ($1M revenue company with optimal defaults):**
| Location | Core Score Calculation | Result |
|----------|----------------------|--------|
| Onboarding/Recalculate | `(1+1+1+1+1)/5` | **1.0** |
| Dashboard | `(0.4+1+1+1+1+1)/6` | **0.9** |

This 10% difference in Core Score compounds through the multiple calculation.

---

### Bug #4: Data Flow Creates Inconsistent States

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ONBOARDING FLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  QuickScanStep → OnboardingFlow.handleQuickScanComplete()               │
│       │                                                                  │
│       ▼                                                                  │
│  Calculate riskResults using LINEAR formula (BUG #1)                    │
│       │                                                                  │
│       ▼                                                                  │
│  RiskResultsStep displays these values to user                          │
│       │                                                                  │
│       ▼                                                                  │
│  handleComplete() → POST /api/companies/[id]/onboarding-snapshot        │
│       │                                                                  │
│       ▼                                                                  │
│  API stores UI values directly (preserves wrong LINEAR values)          │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DASHBOARD DISPLAY                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  GET /api/companies/[id]/dashboard                                      │
│       │                                                                  │
│       ▼                                                                  │
│  if (shouldUseSnapshotValues) {                                         │
│      return latestSnapshot.currentValue  // Returns LINEAR values       │
│  } else {                                                               │
│      // RECALCULATES with NON-LINEAR formula                            │
│      return adjustedEbitda * recalculatedFinalMultiple                  │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

The `shouldUseSnapshotValues` flag means:
- **Immediately after onboarding:** Shows LINEAR values (wrong, but matches what user saw)
- **After uploading financials:** Recalculates with NON-LINEAR (correct, but different)
- **After enabling DCF:** Recalculates (different again)
- **After setting custom multiples:** Recalculates (different again)

Users see values "jump" as they use different features.

---

## Files Requiring Changes

### Priority 1: Fix the LINEAR formula in OnboardingFlow.tsx

**File:** `src/components/onboarding/OnboardingFlow.tsx`
**Lines:** 323-373 (`handleQuickScanComplete` function)

Replace the linear calculation with the correct non-linear formula:
```typescript
// BEFORE (wrong)
const briRatio = scanResults.briScore / 100
const currentValue = Math.round(potentialValue * briRatio)

// AFTER (correct)
const ALPHA = 1.4
const briScoreNormalized = scanResults.briScore / 100
const coreScore = 1.0  // Onboarding defaults are all optimal
const baseMultiple = multipleLow + coreScore * (multipleHigh - multipleLow)
const discountFraction = Math.pow(1 - briScoreNormalized, ALPHA)
const finalMultiple = multipleLow + (baseMultiple - multipleLow) * (1 - discountFraction)
const currentValue = Math.round(adjustedEbitda * finalMultiple)
const potentialValue = Math.round(adjustedEbitda * baseMultiple)
```

### Priority 2: Standardize Core Score calculation

**Option A (Recommended):** Remove `revenueSizeCategory` from dashboard Core Score calculation
- Revenue already affects valuation through `revenue × multiple`
- Including it in Core Score double-counts revenue impact

**Option B:** Add `revenueSizeCategory` to recalculate-snapshot and onboarding-snapshot
- More complex, requires passing revenue category through more places

**Files to modify:**
- `src/app/api/companies/[id]/dashboard/route.ts` (if Option A)
- OR `src/lib/valuation/recalculate-snapshot.ts` AND `src/app/api/companies/[id]/onboarding-snapshot/route.ts` (if Option B)

### Priority 3: Create shared valuation utility

Extract the valuation formula into a single shared module:

```typescript
// src/lib/valuation/calculate-valuation.ts (NEW FILE)
export const ALPHA = 1.4

export interface ValuationInputs {
  adjustedEbitda: number
  industryMultipleLow: number
  industryMultipleHigh: number
  coreScore: number  // 0-1
  briScore: number   // 0-1
}

export function calculateValuation(inputs: ValuationInputs) {
  const { adjustedEbitda, industryMultipleLow, industryMultipleHigh, coreScore, briScore } = inputs

  const baseMultiple = industryMultipleLow + coreScore * (industryMultipleHigh - industryMultipleLow)
  const discountFraction = Math.pow(1 - briScore, ALPHA)
  const finalMultiple = industryMultipleLow + (baseMultiple - industryMultipleLow) * (1 - discountFraction)

  const currentValue = adjustedEbitda * finalMultiple
  const potentialValue = adjustedEbitda * baseMultiple
  const valueGap = potentialValue - currentValue

  return {
    currentValue,
    potentialValue,
    valueGap,
    baseMultiple,
    finalMultiple,
    discountFraction,
  }
}
```

Then update all locations to use this shared function:
- `src/components/onboarding/OnboardingFlow.tsx`
- `src/app/api/companies/[id]/onboarding-snapshot/route.ts`
- `src/lib/valuation/recalculate-snapshot.ts`
- `src/app/api/companies/[id]/dashboard/route.ts`
- `src/lib/valuation/improve-snapshot-for-task.ts`

---

## Test Case to Verify Fix

```typescript
// tests/integration/valuation-consistency.test.ts
describe('Valuation Consistency', () => {
  it('should produce identical values across onboarding and dashboard', async () => {
    // Setup: Create company with known values
    const revenue = 1_000_000
    const briScore = 70  // 0-100 scale
    const industryMultipleLow = 3.0
    const industryMultipleHigh = 6.0

    // Step 1: Simulate onboarding calculation
    const onboardingResult = calculateOnboardingValuation({
      revenue,
      briScore,
      industryMultipleLow,
      industryMultipleHigh,
    })

    // Step 2: Create company and complete onboarding
    const company = await createTestCompany({ revenue })
    await completeOnboarding(company.id, { briScore })

    // Step 3: Fetch dashboard values
    const dashboardResponse = await fetch(`/api/companies/${company.id}/dashboard`)
    const dashboard = await dashboardResponse.json()

    // Assert: Values should match within 1%
    expect(dashboard.tier1.currentValue).toBeCloseTo(onboardingResult.currentValue, -2)
    expect(dashboard.tier1.potentialValue).toBeCloseTo(onboardingResult.potentialValue, -2)
    expect(dashboard.tier1.valueGap).toBeCloseTo(onboardingResult.valueGap, -2)
  })
})
```

---

## Why Previous Fixes Failed

1. **Symptom-based fixes:** Developers saw "wrong values on dashboard" and tried to fix the dashboard, when the bug originates in onboarding
2. **Multiple formula locations:** With 5+ places calculating valuations, fixing one doesn't fix others
3. **Conditional logic masks the bug:** The `shouldUseSnapshotValues` flag means the bug only manifests in certain states
4. **No integration tests:** Unit tests pass because each formula is internally consistent; only integration tests would catch the mismatch

---

## Recommended Fix Order

1. **Create shared `calculateValuation()` utility** (prevents future divergence)
2. **Fix OnboardingFlow.tsx** to use the shared utility
3. **Fix Core Score formula** to be consistent (recommend removing revenueSizeCategory)
4. **Update onboarding-snapshot API** to recalculate values server-side instead of trusting UI
5. **Add integration test** to prevent regression
6. **Remove `shouldUseSnapshotValues` conditional** - always use consistent calculation

---

## Quick Verification Steps

To verify the bug exists, compare these two calculations for a company with:
- Revenue: $1,000,000
- BRI Score: 70
- Industry multiples: 3.0 - 6.0

**What onboarding shows:**
```
potentialValue = $1M × 0.15 × 6.0 = $900,000  (estimated EBITDA × high multiple)
currentValue = $900,000 × 0.70 = $630,000  (LINEAR)
valueGap = $270,000
```

**What dashboard should show (correct formula):**
```
coreScore = 1.0 (optimal defaults)
baseMultiple = 3.0 + 1.0 × (6.0 - 3.0) = 6.0
discountFraction = (1 - 0.70)^1.4 = 0.1866
finalMultiple = 3.0 + (6.0 - 3.0) × (1 - 0.1866) = 5.44
currentValue = $150,000 × 5.44 = $816,000
potentialValue = $150,000 × 6.0 = $900,000
valueGap = $84,000
```

**Discrepancy:** $630,000 vs $816,000 = **29.5% difference**
