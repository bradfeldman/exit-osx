# WACC Redesign: Market-Calibrated Defaults & DCF/Multiple Convergence

**Status**: Design (not yet implemented)
**Date**: 2026-02-15
**Author**: Financial Modeling Engineer

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Current Architecture Analysis](#2-current-architecture-analysis)
3. [Design Overview](#3-design-overview)
4. [New WACC Defaults Engine](#4-new-wacc-defaults-engine)
5. [BRI to Company-Specific Risk Mapping](#5-bri-to-company-specific-risk-mapping)
6. [Size Premium Recalibration](#6-size-premium-recalibration)
7. [Cost of Debt Recalibration](#7-cost-of-debt-recalibration)
8. [Mid-Year Convention](#8-mid-year-convention)
9. [Convergence Check](#9-convergence-check)
10. [Implied WACC from Multiples](#10-implied-wacc-from-multiples)
11. [Database Schema Changes](#11-database-schema-changes)
12. [UI Changes](#12-ui-changes)
13. [Data Flow Diagram](#13-data-flow-diagram)
14. [Migration & Backwards Compatibility](#14-migration--backwards-compatibility)
15. [Test Plan](#15-test-plan)

---

## 1. Problem Statement

The current WACC calculation produces approximately 12% for a company with $1.29M EBITDA. Market reality for businesses of that size is 18-25%. This causes the DCF valuation to massively overshoot the EBITDA multiple-based valuation ($5.8M at 4.5x), destroying credibility in the DCF module.

**Root causes**:

1. **Size risk premium is too low**: Current tiers are revenue-based, max out at 6%, and have no granularity below $3M revenue. For a $1M EBITDA company, the size premium should be 5.5-7.0%.

2. **No Company-Specific Risk (CSR) premium**: The CAPM formula currently includes only `Rf + beta * ERP + sizeRiskPremium`. Real-world private company WACC includes a 5-10% CSR premium for businesses under $5M EBITDA. This is the single largest missing component.

3. **Cost of debt is too low**: The default of 6% reflects investment-grade corporate borrowing. SMBs with $1M EBITDA pay 10-12% on SBA/mezzanine debt.

4. **No convergence feedback**: Users have no way to see that their DCF is producing a 9x implied multiple when the market says 4.5x.

**Target benchmark (2026 estimates)**:

| Component | $1M EBITDA | $5M EBITDA | $50M EBITDA |
|---|---|---|---|
| Risk-Free Rate | 4.1% | 4.1% | 4.1% |
| Equity Risk Premium | 5.0% | 5.0% | 5.0% |
| Size Premium | 5.5%-7.0% | 3.0%-4.5% | 1.0%-2.5% |
| Company-Specific Risk | 5.0%-10.0% | 2.0%-5.0% | 0%-2.0% |
| Pre-Tax Cost of Debt | 10.0%-12.0% | 8.5%-10.0% | 7.0%-8.5% |
| **Estimated WACC** | **18%-25%** | **14%-18%** | **10%-13%** |

---

## 2. Current Architecture Analysis

### Files involved

| File | Role | Changes Needed |
|---|---|---|
| `src/lib/valuation/dcf-calculator.ts` | Core DCF math (WACC, PV, terminal value) | Add CSR to WACC formula, add mid-year convention, add implied WACC solver |
| `src/lib/valuation/auto-dcf.ts` | Automated DCF in snapshot pipeline | Replace hardcoded constants with new defaults engine |
| `src/app/api/companies/[id]/dcf/route.ts` | API for manual DCF page | Replace `SIZE_RISK_PREMIUM` with new defaults engine, add convergence data to response |
| `src/components/valuation/WACCCalculator.tsx` | UI: WACC sliders/inputs | Add CSR slider, update ranges, add convergence display |
| `src/app/(dashboard)/dashboard/valuation/page.tsx` | DCF page orchestrator | Wire convergence check, implied WACC display |
| `src/components/valuation/ValuationResults.tsx` | UI: DCF results display | Add convergence warning, implied WACC comparison |
| `prisma/schema.prisma` | Database schema | Add new fields to `DCFAssumptions` |
| `src/lib/security/validation.ts` | Zod validation schemas | Add new fields to `dcfAssumptionsSchema` |

### Current WACC formula

```
WACC = equityWeight * (Rf + beta * ERP + sizeRiskPremium) + debtWeight * Rd * (1 - T)
```

Current defaults for a $1M-$3M revenue company:
- Rf = 4.25%, ERP = 5.5%, beta = 1.0, sizeRiskPremium = 6%
- Rd = 6%, T = 25%, debtWeight = 20%, equityWeight = 80%
- Cost of Equity = 4.25% + 1.0 * 5.5% + 6.0% = 15.75%
- After-tax Cost of Debt = 6% * (1 - 0.25) = 4.5%
- **WACC = 0.80 * 15.75% + 0.20 * 4.5% = 13.5%**

This is 5-10 percentage points below market reality.

### Key constraint: user overrides

Users can manually configure every WACC component via the DCF page. The new defaults engine must:
1. Provide better starting defaults
2. Never overwrite user-saved assumptions (`isManuallyConfigured` flag)
3. Make the new CSR component visible and adjustable in the UI

---

## 3. Design Overview

### New WACC formula

```
WACC = equityWeight * (Rf + beta * ERP + sizeRiskPremium + companySpecificRisk) + debtWeight * Rd * (1 - T)
```

The key addition is `companySpecificRisk` (CSR), a new component that:
- Is derived from EBITDA tier and BRI score
- Is separately stored, displayed, and overridable
- Represents risks not captured by beta, ERP, or size premium

### New file

One new module: `src/lib/valuation/wacc-defaults.ts`

This module is the single source of truth for WACC component defaults. It replaces the scattered hardcoded constants in `auto-dcf.ts` and `dcf/route.ts`.

---

## 4. New WACC Defaults Engine

### Location

`src/lib/valuation/wacc-defaults.ts` (new file)

### Interface

```typescript
/**
 * EBITDA-based size tier for WACC calibration.
 * Uses EBITDA (not revenue) because EBITDA is the denominator in the
 * multiple-based valuation and thus the natural anchor for convergence.
 */
export interface EbitdaTier {
  label: string
  ebitdaMin: number       // inclusive
  ebitdaMax: number       // exclusive (Infinity for top tier)
  sizeRiskPremium: { low: number; high: number }
  companySpecificRisk: { low: number; high: number }
  preTaxCostOfDebt: { low: number; high: number }
  typicalDebtWeight: number
  typicalWaccRange: { low: number; high: number }
}

/**
 * Inputs to the WACC defaults engine.
 * All monetary values in USD. Rates as decimals (e.g., 0.05 = 5%).
 */
export interface WACCDefaultsInput {
  /** Adjusted EBITDA in USD. Primary driver of size tiering. */
  adjustedEbitda: number
  /** BRI score on 0-1 scale. Used to position CSR within tier range. */
  briScore: number
  /** Revenue size category from CoreFactors (optional fallback). */
  revenueSizeCategory?: string | null
  /** Industry classification for potential industry-specific adjustments. */
  icbSector?: string | null
  /** Derived cost of debt from financial statements, if available. */
  derivedCostOfDebt?: number | null
  /** Derived tax rate from financial statements, if available. */
  derivedTaxRate?: number | null
  /** Derived debt weight from balance sheet, if available. */
  derivedDebtWeight?: number | null
}

/**
 * Complete set of WACC component defaults.
 * Every field is a suggested starting value; users can override any of them.
 */
export interface WACCDefaults {
  riskFreeRate: number
  equityRiskPremium: number
  beta: number
  sizeRiskPremium: number
  companySpecificRisk: number
  preTaxCostOfDebt: number
  taxRate: number
  debtWeight: number
  equityWeight: number
  /** The WACC computed from these defaults. */
  computedWacc: number
  /** Which EBITDA tier was selected. */
  ebitdaTier: string
  /** Metadata: what drove each component value. */
  sources: {
    sizeRiskPremiumSource: string
    csrSource: string
    costOfDebtSource: string
    capitalStructureSource: string
  }
}
```

### EBITDA Tier Definitions

```typescript
/**
 * EBITDA-based tiers calibrated to 2026 market benchmarks.
 *
 * Sources:
 * - Pepperdine Private Capital Markets Report (2025)
 * - Duff & Phelps / Kroll Cost of Capital Navigator
 * - BVR (Business Valuation Resources) studies
 * - DealStats (BVR) median transaction WACC by size
 *
 * Last validated: 2026-02-15
 */
export const EBITDA_TIERS: EbitdaTier[] = [
  {
    label: 'Micro (<$500K EBITDA)',
    ebitdaMin: 0,
    ebitdaMax: 500_000,
    sizeRiskPremium: { low: 0.065, high: 0.080 },     // 6.5% - 8.0%
    companySpecificRisk: { low: 0.060, high: 0.120 },  // 6.0% - 12.0%
    preTaxCostOfDebt: { low: 0.110, high: 0.140 },     // 11.0% - 14.0%
    typicalDebtWeight: 0.15,
    typicalWaccRange: { low: 0.22, high: 0.30 },
  },
  {
    label: 'Small ($500K-$2M EBITDA)',
    ebitdaMin: 500_000,
    ebitdaMax: 2_000_000,
    sizeRiskPremium: { low: 0.055, high: 0.070 },     // 5.5% - 7.0%
    companySpecificRisk: { low: 0.050, high: 0.100 },  // 5.0% - 10.0%
    preTaxCostOfDebt: { low: 0.100, high: 0.120 },     // 10.0% - 12.0%
    typicalDebtWeight: 0.20,
    typicalWaccRange: { low: 0.18, high: 0.25 },
  },
  {
    label: 'Lower-Mid ($2M-$5M EBITDA)',
    ebitdaMin: 2_000_000,
    ebitdaMax: 5_000_000,
    sizeRiskPremium: { low: 0.040, high: 0.055 },     // 4.0% - 5.5%
    companySpecificRisk: { low: 0.030, high: 0.060 },  // 3.0% - 6.0%
    preTaxCostOfDebt: { low: 0.085, high: 0.100 },     // 8.5% - 10.0%
    typicalDebtWeight: 0.25,
    typicalWaccRange: { low: 0.14, high: 0.19 },
  },
  {
    label: 'Mid-Market ($5M-$10M EBITDA)',
    ebitdaMin: 5_000_000,
    ebitdaMax: 10_000_000,
    sizeRiskPremium: { low: 0.030, high: 0.045 },     // 3.0% - 4.5%
    companySpecificRisk: { low: 0.020, high: 0.050 },  // 2.0% - 5.0%
    preTaxCostOfDebt: { low: 0.080, high: 0.095 },     // 8.0% - 9.5%
    typicalDebtWeight: 0.30,
    typicalWaccRange: { low: 0.12, high: 0.17 },
  },
  {
    label: 'Upper-Mid ($10M-$25M EBITDA)',
    ebitdaMin: 10_000_000,
    ebitdaMax: 25_000_000,
    sizeRiskPremium: { low: 0.020, high: 0.035 },     // 2.0% - 3.5%
    companySpecificRisk: { low: 0.010, high: 0.030 },  // 1.0% - 3.0%
    preTaxCostOfDebt: { low: 0.075, high: 0.090 },     // 7.5% - 9.0%
    typicalDebtWeight: 0.35,
    typicalWaccRange: { low: 0.11, high: 0.15 },
  },
  {
    label: 'Large ($25M-$50M EBITDA)',
    ebitdaMin: 25_000_000,
    ebitdaMax: 50_000_000,
    sizeRiskPremium: { low: 0.015, high: 0.025 },     // 1.5% - 2.5%
    companySpecificRisk: { low: 0.005, high: 0.020 },  // 0.5% - 2.0%
    preTaxCostOfDebt: { low: 0.070, high: 0.085 },     // 7.0% - 8.5%
    typicalDebtWeight: 0.35,
    typicalWaccRange: { low: 0.10, high: 0.13 },
  },
  {
    label: 'Enterprise ($50M+ EBITDA)',
    ebitdaMin: 50_000_000,
    ebitdaMax: Infinity,
    sizeRiskPremium: { low: 0.010, high: 0.020 },     // 1.0% - 2.0%
    companySpecificRisk: { low: 0.000, high: 0.015 },  // 0.0% - 1.5%
    preTaxCostOfDebt: { low: 0.065, high: 0.080 },     // 6.5% - 8.0%
    typicalDebtWeight: 0.40,
    typicalWaccRange: { low: 0.09, high: 0.12 },
  },
]
```

### Core Function

```typescript
/**
 * Generate calibrated WACC component defaults based on EBITDA size and BRI score.
 *
 * This is the single source of truth for WACC defaults. It replaces the
 * hardcoded constants previously scattered across auto-dcf.ts and dcf/route.ts.
 *
 * The function:
 * 1. Selects the EBITDA tier (with log-interpolation between tiers)
 * 2. Uses BRI score to position within each tier's range
 * 3. Prefers derived financial data over defaults when available
 * 4. Validates the final WACC falls within the tier's expected range
 *
 * @param input - Company-specific data for calibration
 * @returns Complete WACC component defaults with audit trail
 */
export function calculateWACCDefaults(input: WACCDefaultsInput): WACCDefaults {
  // 1. Find the EBITDA tier
  const tier = findEbitdaTier(input.adjustedEbitda)

  // 2. Calculate size risk premium (interpolated)
  const sizeRiskPremium = interpolateSizeRiskPremium(input.adjustedEbitda)

  // 3. Calculate company-specific risk from BRI
  const companySpecificRisk = calculateCSRFromBRI(
    input.briScore,
    tier.companySpecificRisk.low,
    tier.companySpecificRisk.high
  )

  // 4. Determine cost of debt
  const preTaxCostOfDebt = determineCostOfDebt(input, tier)

  // 5. Determine capital structure
  const { debtWeight, equityWeight, capitalStructureSource } =
    determineCapitalStructure(input, tier)

  // 6. Determine tax rate
  const taxRate = input.derivedTaxRate ?? DEFAULT_TAX_RATE

  // 7. Compute WACC
  const costOfEquity =
    RISK_FREE_RATE +
    DEFAULT_BETA * EQUITY_RISK_PREMIUM +
    sizeRiskPremium +
    companySpecificRisk

  const afterTaxCostOfDebt = preTaxCostOfDebt * (1 - taxRate)
  const computedWacc = equityWeight * costOfEquity + debtWeight * afterTaxCostOfDebt

  return {
    riskFreeRate: RISK_FREE_RATE,
    equityRiskPremium: EQUITY_RISK_PREMIUM,
    beta: DEFAULT_BETA,
    sizeRiskPremium,
    companySpecificRisk,
    preTaxCostOfDebt,
    taxRate,
    debtWeight,
    equityWeight,
    computedWacc,
    ebitdaTier: tier.label,
    sources: {
      sizeRiskPremiumSource: `EBITDA-based tier: ${tier.label}`,
      csrSource: `BRI score ${(input.briScore * 100).toFixed(0)}% mapped to ${tier.label} CSR range`,
      costOfDebtSource: input.derivedCostOfDebt
        ? 'Derived from interest expense / total debt'
        : `Default for ${tier.label}`,
      capitalStructureSource,
    },
  }
}
```

### Market Constants

```typescript
/**
 * 10-Year US Treasury yield.
 * Source: Federal Reserve FRED, as of 2026-02-01.
 * Updated quarterly; check FRED for current value.
 * Last validated: 2026-02-15.
 */
const RISK_FREE_RATE = 0.041   // 4.1%

/**
 * Equity Risk Premium (ERP).
 * Source: Duff & Phelps / Kroll recommended ERP for 2026.
 * This is the forward-looking ERP based on supply-side model,
 * NOT the historical arithmetic mean.
 * Last validated: 2026-02-15.
 */
const EQUITY_RISK_PREMIUM = 0.050  // 5.0%

/**
 * Default unlevered beta for private SMBs.
 * Beta of 1.0 is standard for undiversified private businesses.
 * Users can override this on the DCF page.
 */
const DEFAULT_BETA = 1.0

/**
 * Default corporate tax rate (federal + estimated state blend).
 * 21% federal + ~4% blended state = ~25%.
 */
const DEFAULT_TAX_RATE = 0.25
```

**Note on constants vs. the current codebase**: The current code uses `RISK_FREE_RATE = 0.0425` and `MARKET_RISK_PREMIUM = 0.055`. The new defaults use 4.1% and 5.0% respectively. These are updated to 2026 estimates. The sum `Rf + ERP` moves from 9.75% to 9.1%, a 65bp decrease. However, the addition of CSR (5-10% for small companies) more than compensates, producing the correct total WACC range.

---

## 5. BRI to Company-Specific Risk Mapping

### Concept

Company-Specific Risk (CSR) captures risks unique to the subject company that are not reflected in beta, ERP, or the size premium. In SMB M&A, CSR includes:

- Customer concentration
- Owner dependency
- Regulatory/legal risk
- Revenue predictability
- Operational fragility
- Key employee retention risk

The BRI score already measures all of these through its six categories (Financial, Transferability, Operational, Market, Legal/Tax, Personal). A high BRI means low company-specific risk; a low BRI means high company-specific risk.

### Function

```typescript
/**
 * Map BRI score (0-1) to Company-Specific Risk premium within a tier's range.
 *
 * The mapping is:
 *   CSR = csrHigh - briScore * (csrHigh - csrLow)
 *
 * This is a linear inverse mapping:
 *   BRI = 1.0 (perfect) -> CSR = csrLow  (minimum risk for this size)
 *   BRI = 0.0 (worst)   -> CSR = csrHigh (maximum risk for this size)
 *
 * Example for $1M EBITDA tier (csrLow=5%, csrHigh=10%):
 *   BRI = 0.90 -> CSR = 10% - 0.90 * (10% - 5%) = 5.5%
 *   BRI = 0.70 -> CSR = 10% - 0.70 * (10% - 5%) = 6.5%
 *   BRI = 0.50 -> CSR = 10% - 0.50 * (10% - 5%) = 7.5%
 *   BRI = 0.30 -> CSR = 10% - 0.30 * (10% - 5%) = 8.5%
 *   BRI = 0.10 -> CSR = 10% - 0.10 * (10% - 5%) = 9.5%
 *
 * Why linear (not non-linear like the BRI->multiple discount)?
 * The BRI->multiple formula uses alpha=1.4 to create accelerating discounts
 * for low BRI scores. But CSR is an additive rate component, not a
 * multiplicative discount. A 1% CSR change has the same dollar impact
 * regardless of the starting level. Linear mapping is the correct
 * mathematical relationship for additive rate premia.
 *
 * @param briScore - BRI score on 0-1 scale (clamped internally)
 * @param csrLow - Minimum CSR for this tier (when BRI = 1.0)
 * @param csrHigh - Maximum CSR for this tier (when BRI = 0.0)
 * @returns Company-Specific Risk premium as a decimal
 */
export function calculateCSRFromBRI(
  briScore: number,
  csrLow: number,
  csrHigh: number
): number {
  // Clamp BRI to valid range
  const clampedBRI = Math.max(0, Math.min(1, briScore))

  // Linear inverse mapping: high BRI -> low CSR
  const csr = csrHigh - clampedBRI * (csrHigh - csrLow)

  // Round to 4 decimal places (basis-point precision)
  return Math.round(csr * 10000) / 10000
}
```

### Validation table

For the $500K-$2M EBITDA tier (CSR range: 5.0% - 10.0%):

| BRI Score | CSR Premium | Description |
|---|---|---|
| 0.90 (90%) | 5.5% | Well-prepared business, minimal specific risks |
| 0.70 (70%) | 6.5% | Good but some identified risk areas |
| 0.50 (50%) | 7.5% | Average readiness, moderate company risks |
| 0.30 (30%) | 8.5% | Significant risk factors present |
| 0.10 (10%) | 9.5% | Very high company-specific risk |

### Where BRI score comes from (when no assessment exists)

If the company has no BRI assessment, the system should use a default BRI of **0.50** (neutral). This produces the midpoint of the CSR range, which is a reasonable prior assumption. The `WACCDefaultsInput.briScore` field will be set to 0.50 by the caller when no assessment data is available.

---

## 6. Size Premium Recalibration

### Problem with current approach

The current size premium uses revenue-based tiers with hard jumps:

```typescript
// Current (revenue-based, hard jumps)
UNDER_500K:     6%
FROM_500K_TO_1M: 6%
FROM_1M_TO_3M:  6%
FROM_3M_TO_10M: 4%
FROM_10M_TO_25M: 4%
OVER_25M:       2.5%
```

Problems:
1. Revenue-based, but EBITDA is the valuation anchor
2. Only 3 distinct values (6%, 4%, 2.5%) -- no granularity
3. Hard jumps create discontinuities (a company at $2.99M revenue gets 6%, but $3.01M gets 4%)

### New approach: EBITDA-based with log interpolation

```typescript
/**
 * Size risk premium anchor points for log-linear interpolation.
 * Each point is (EBITDA, sizeRiskPremium).
 * Between points, interpolation is done on log(EBITDA) scale because
 * the relationship between size and risk premium is log-linear
 * (each doubling of size reduces the premium by roughly the same amount).
 *
 * Source: Kroll/Duff & Phelps size study (2025), adapted for private companies.
 * Private company size premiums are 1-2% higher than public company data
 * because of illiquidity and information asymmetry.
 */
const SIZE_PREMIUM_ANCHORS: Array<{ ebitda: number; premium: number }> = [
  { ebitda:    250_000, premium: 0.080 },  // 8.0%
  { ebitda:    500_000, premium: 0.070 },  // 7.0%
  { ebitda:  1_000_000, premium: 0.062 },  // 6.2%
  { ebitda:  2_000_000, premium: 0.055 },  // 5.5%
  { ebitda:  5_000_000, premium: 0.042 },  // 4.2%
  { ebitda: 10_000_000, premium: 0.032 },  // 3.2%
  { ebitda: 25_000_000, premium: 0.022 },  // 2.2%
  { ebitda: 50_000_000, premium: 0.015 },  // 1.5%
]

/**
 * Interpolate size risk premium based on EBITDA using log-linear interpolation.
 *
 * Log-linear interpolation: the premium varies linearly with log(EBITDA).
 * This reflects the empirical observation that the relationship between
 * company size and risk premium is approximately log-linear.
 *
 * Below the smallest anchor: uses the smallest anchor's premium (floor).
 * Above the largest anchor: uses the largest anchor's premium (ceiling).
 * Between anchors: log-linear interpolation.
 *
 * @param ebitda - Adjusted EBITDA in USD. Must be > 0.
 * @returns Size risk premium as a decimal (e.g., 0.062 = 6.2%)
 */
export function interpolateSizeRiskPremium(ebitda: number): number {
  if (ebitda <= 0) {
    return SIZE_PREMIUM_ANCHORS[0].premium  // Edge case: use maximum premium
  }

  const anchors = SIZE_PREMIUM_ANCHORS
  const logEbitda = Math.log(ebitda)

  // Below smallest anchor
  if (ebitda <= anchors[0].ebitda) {
    return anchors[0].premium
  }

  // Above largest anchor
  if (ebitda >= anchors[anchors.length - 1].ebitda) {
    return anchors[anchors.length - 1].premium
  }

  // Find the two anchors that bracket the EBITDA
  for (let i = 0; i < anchors.length - 1; i++) {
    if (ebitda >= anchors[i].ebitda && ebitda < anchors[i + 1].ebitda) {
      const logLow = Math.log(anchors[i].ebitda)
      const logHigh = Math.log(anchors[i + 1].ebitda)
      const t = (logEbitda - logLow) / (logHigh - logLow)
      const premium = anchors[i].premium + t * (anchors[i + 1].premium - anchors[i].premium)
      return Math.round(premium * 10000) / 10000
    }
  }

  // Should not reach here, but safety fallback
  return 0.04
}
```

### Validation: $1.29M EBITDA example

- Log interpolation between $1M (6.2%) and $2M (5.5%) anchors
- `t = (log(1.29M) - log(1M)) / (log(2M) - log(1M))` = `(14.069 - 13.816) / (14.509 - 13.816)` = `0.253 / 0.693` = **0.365**
- Premium = 6.2% + 0.365 * (5.5% - 6.2%) = 6.2% - 0.255% = **5.94%**

This is reasonable: a $1.29M EBITDA company should have a size premium close to the top of the $1M tier range, reflecting that it's still a small business.

---

## 7. Cost of Debt Recalibration

### Current problem

Default cost of debt is 6%, which is appropriate for investment-grade mid-market companies but far too low for SMBs. Actual SMB borrowing costs:

- SBA 7(a) loans: Prime + 2.75% = ~10.25% (2026)
- Mezzanine/seller notes: 10-14%
- Bank term loans for SMBs: 8-12%

### Function

```typescript
/**
 * Determine the appropriate cost of debt default.
 *
 * Priority:
 * 1. If derived from financial statements (interest expense / total debt),
 *    use the derived value (sanity-checked to 3%-20% range).
 * 2. Otherwise, use the midpoint of the EBITDA tier's range.
 *
 * @param input - WACCDefaultsInput with optional derived cost of debt
 * @param tier - The selected EBITDA tier
 * @returns Pre-tax cost of debt as decimal
 */
function determineCostOfDebt(
  input: WACCDefaultsInput,
  tier: EbitdaTier
): number {
  // Prefer derived cost of debt from financial statements
  if (
    input.derivedCostOfDebt !== null &&
    input.derivedCostOfDebt !== undefined &&
    input.derivedCostOfDebt >= 0.03 &&
    input.derivedCostOfDebt <= 0.20
  ) {
    return input.derivedCostOfDebt
  }

  // Default: midpoint of tier range
  return (tier.preTaxCostOfDebt.low + tier.preTaxCostOfDebt.high) / 2
}
```

### Validation: $1.29M EBITDA example

- Tier: Small ($500K-$2M EBITDA)
- Cost of debt range: 10.0% - 12.0%
- Default: midpoint = **11.0%**
- After-tax (at 25%): 11.0% * 0.75 = **8.25%**

---

## 8. Mid-Year Convention

### Current behavior

End-of-year discounting: `PV = FV / (1 + WACC)^n` where n = 1, 2, 3, 4, 5.

This assumes all cash flow arrives on the last day of the year. In reality, cash flows arrive throughout the year. The mid-year convention adjusts for this by discounting as if cash arrives mid-year.

### New behavior

Mid-year discounting: `PV = FV / (1 + WACC)^(n - 0.5)` where n = 1, 2, 3, 4, 5.

This shifts each discount period forward by 6 months, producing a higher present value. The effect is significant at high WACC values:

| WACC | End-of-Year PV($1, Year 1) | Mid-Year PV($1, Year 1) | Difference |
|---|---|---|---|
| 12% | $0.893 | $0.943 | +5.7% |
| 19% | $0.840 | $0.917 | +9.2% |
| 25% | $0.800 | $0.894 | +11.8% |

### Changes to `dcf-calculator.ts`

```typescript
// UPDATED interface
export interface DCFInputs {
  baseFCF: number
  growthRates: number[]
  wacc: number
  terminalMethod: 'gordon' | 'exit_multiple'
  perpetualGrowthRate: number
  exitMultiple?: number
  netDebt: number
  ebitdaGrowthRates?: number[]
  fcfToEbitdaRatio?: number
  useMidYearConvention: boolean  // NEW FIELD
}

// UPDATED present value function
/**
 * Calculate present value of a future cash flow.
 *
 * @param futureValue - The future cash flow amount
 * @param discountRate - WACC as decimal
 * @param years - The year number (1-indexed)
 * @param midYear - If true, uses mid-year convention (n - 0.5)
 * @returns Present value
 */
export function calculatePresentValue(
  futureValue: number,
  discountRate: number,
  years: number,
  midYear: boolean = false
): number {
  const period = midYear ? years - 0.5 : years
  return futureValue / Math.pow(1 + discountRate, period)
}
```

### Changes to `calculateDCF()`

```typescript
// In calculateDCF():
const presentValueFCF = projectedFCF.map((fcf, index) =>
  calculatePresentValue(fcf, inputs.wacc, index + 1, inputs.useMidYearConvention)
)

// Terminal value: discounted from end of year 5
// With mid-year convention, TV is still at end of year 5 (not mid-year)
// because the terminal value represents a lump sum at the end of the projection period
const tvDiscountPeriod = inputs.useMidYearConvention
  ? inputs.growthRates.length      // year 5 (NOT 4.5)
  : inputs.growthRates.length
const presentValueTerminal = calculatePresentValue(
  terminalValue, inputs.wacc, tvDiscountPeriod, false
)
```

**Important note**: The terminal value is NOT discounted with mid-year convention. The terminal value represents a lump-sum at the end of year 5, not a cash flow spread across year 5. Using mid-year convention for the terminal value would overstate the valuation. This is standard practice per Damodaran and McKinsey Valuation.

### Default behavior

`useMidYearConvention` defaults to `true` for new calculations. The auto-DCF pipeline and the manual DCF page both default to mid-year. Users can toggle it off.

---

## 9. Convergence Check

### Location

`src/lib/valuation/wacc-defaults.ts` (same new file as the defaults engine)

### Interface

```typescript
/**
 * Result of comparing DCF enterprise value to multiple-based enterprise value.
 */
export interface ConvergenceCheckResult {
  /** DCF enterprise value */
  dcfEnterpriseValue: number
  /** Multiple-based enterprise value */
  multipleEnterpriseValue: number
  /** Percentage divergence: (DCF - Multiple) / Multiple.
   *  Positive = DCF overshoots. Negative = DCF undershoots. */
  divergencePercent: number
  /** Absolute divergence in dollars */
  divergenceDollars: number
  /** Whether the divergence exceeds the warning threshold */
  isConverged: boolean
  /** Warning level */
  severity: 'converged' | 'minor' | 'significant' | 'extreme'
  /** Ordered list of likely reasons for divergence, most likely first */
  likelyReasons: DivergenceReason[]
  /** Specific suggestions for bringing the two closer */
  suggestions: ConvergenceSuggestion[]
}

export interface DivergenceReason {
  /** Short label */
  reason: string
  /** Detailed explanation */
  explanation: string
  /** Confidence that this is a contributing factor: high/medium/low */
  confidence: 'high' | 'medium' | 'low'
}

export interface ConvergenceSuggestion {
  /** Which WACC component or DCF assumption to adjust */
  component: string
  /** Current value */
  currentValue: number
  /** Suggested value for convergence */
  suggestedValue: number
  /** Direction of adjustment */
  direction: 'increase' | 'decrease'
  /** Impact explanation */
  explanation: string
}
```

### Function

```typescript
/**
 * Compare DCF enterprise value to multiple-based enterprise value and
 * diagnose divergence.
 *
 * Threshold levels:
 *   converged:   |divergence| <= 15%
 *   minor:       |divergence| <= 25%
 *   significant: |divergence| <= 50%
 *   extreme:     |divergence| > 50%
 *
 * @param dcfEV - Enterprise value from DCF calculation
 * @param multipleEV - Enterprise value from EBITDA multiple calculation
 * @param waccComponents - Current WACC components (for diagnosis)
 * @param growthRates - Current FCF growth rate assumptions
 * @param terminalGrowthRate - Terminal growth rate used in DCF
 * @param ebitdaMultiple - The EBITDA multiple used (finalMultiple from valuation)
 * @param adjustedEbitda - Adjusted EBITDA
 * @param impliedWacc - The implied WACC from the multiple-based valuation (from solveImpliedWACC)
 */
export function checkConvergence(
  dcfEV: number,
  multipleEV: number,
  waccComponents: {
    wacc: number
    sizeRiskPremium: number
    companySpecificRisk: number
    costOfDebt: number
  },
  growthRates: number[],
  terminalGrowthRate: number,
  ebitdaMultiple: number,
  adjustedEbitda: number,
  impliedWacc?: number
): ConvergenceCheckResult {
  // ... implementation
}
```

### Divergence diagnosis logic

The function identifies reasons for divergence in priority order:

1. **DCF overshoots (positive divergence)**:
   - If `componentWACC < impliedWACC`: "WACC is below the rate implied by the market multiple. The DCF is discounting cash flows at a rate that does not reflect the risk level that market participants are pricing in."
     - If `companySpecificRisk < tierMidpoint`: Suggest increasing CSR
     - If `sizeRiskPremium < tierMidpoint`: Suggest increasing size premium
     - If `costOfDebt < tierMidpoint`: Suggest increasing cost of debt
   - If `avgGrowthRate > 0.10` and `ebitdaMultiple < 5.0`: "Growth rate assumptions appear aggressive relative to the market multiple. A business trading at {multiple}x is not expected to grow at {rate}%."
     - Suggest reducing growth rates
   - If `terminalGrowthRate > 0.03`: "Terminal growth rate of {rate}% is above the long-term GDP growth rate. Most private businesses should use 2-3%."
     - Suggest reducing terminal growth rate

2. **DCF undershoots (negative divergence)**:
   - If `componentWACC > impliedWACC`: "WACC is above the rate implied by the market multiple. The discount rate may be too conservative for this company."
   - If growth rates are very low/zero: "Low or zero growth assumptions may understate the company's trajectory."

### Severity thresholds

```typescript
const CONVERGENCE_THRESHOLDS = {
  converged: 0.15,    // |divergence| <= 15%: no warning
  minor: 0.25,        // |divergence| <= 25%: informational
  significant: 0.50,  // |divergence| <= 50%: warning
  // > 50%: extreme warning
}
```

---

## 10. Implied WACC from Multiples

### Concept

Given the multiple-based enterprise value and the same FCF projections used in the DCF, we can reverse-engineer the discount rate that would make the DCF produce the same enterprise value. This is the "implied WACC" -- the discount rate the market is implicitly applying.

### Function

```typescript
/**
 * Solve for the WACC that makes a DCF valuation equal a target enterprise value.
 *
 * This uses a numerical root-finding approach (bisection method) because
 * there is no closed-form solution when the DCF includes 5 years of
 * varying growth rates plus a terminal value.
 *
 * The equation to solve:
 *   targetEV = sum(FCF_i / (1+r)^i, i=1..5) + TV / (1+r)^5
 *   where TV = FCF_5 * (1+g) / (r - g)  [Gordon Growth]
 *   or    TV = EBITDA_5 * exitMultiple    [Exit Multiple]
 *
 * Bisection method is chosen over Newton-Raphson because:
 * - The function is well-behaved and monotonically decreasing in WACC
 * - We have natural bounds: WACC in [terminalGrowthRate + 0.001, 0.50]
 * - No derivative computation needed
 * - Guaranteed convergence within bounds
 * - 50 iterations gives precision to ~10^-15, far more than needed
 *
 * @param targetEV - The enterprise value to match (from multiple-based valuation)
 * @param baseFCF - Base free cash flow (Year 0)
 * @param growthRates - 5-year growth rate assumptions (same as used in DCF)
 * @param terminalMethod - 'gordon' or 'exit_multiple'
 * @param terminalGrowthRate - Perpetual growth rate (for Gordon)
 * @param exitMultiple - Exit EBITDA multiple (for exit multiple method)
 * @param finalEBITDA - Base EBITDA for exit multiple terminal value
 * @param useMidYearConvention - Whether to use mid-year discounting
 * @returns The implied WACC as a decimal, or null if no solution exists
 */
export function solveImpliedWACC(
  targetEV: number,
  baseFCF: number,
  growthRates: number[],
  terminalMethod: 'gordon' | 'exit_multiple',
  terminalGrowthRate: number,
  exitMultiple?: number,
  finalEBITDA?: number,
  useMidYearConvention: boolean = true
): number | null {
  if (targetEV <= 0 || baseFCF <= 0) return null

  // Define the function f(wacc) = computedEV(wacc) - targetEV
  // We want to find wacc such that f(wacc) = 0
  const computeEV = (wacc: number): number | null => {
    // Project FCFs
    const fcfs: number[] = []
    let currentFCF = baseFCF
    for (const rate of growthRates) {
      currentFCF = currentFCF * (1 + rate)
      fcfs.push(currentFCF)
    }

    // PV of FCFs
    let pvFCF = 0
    for (let i = 0; i < fcfs.length; i++) {
      const period = useMidYearConvention ? i + 0.5 : i + 1
      pvFCF += fcfs[i] / Math.pow(1 + wacc, period)
    }

    // Terminal value
    let tv: number
    const finalFCF = fcfs[fcfs.length - 1]
    if (terminalMethod === 'gordon') {
      if (wacc <= terminalGrowthRate) return null
      tv = (finalFCF * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate)
    } else {
      if (!exitMultiple || !finalEBITDA) return null
      // Project EBITDA forward using FCF growth rates (simplified)
      let currentEBITDA = finalEBITDA
      for (const rate of growthRates) {
        currentEBITDA = currentEBITDA * (1 + rate)
      }
      tv = currentEBITDA * exitMultiple
    }

    // PV of terminal value (always end-of-year, not mid-year)
    const pvTV = tv / Math.pow(1 + wacc, growthRates.length)

    return pvFCF + pvTV
  }

  // Bisection method
  let lo = terminalGrowthRate + 0.001  // Must be > terminal growth rate
  let hi = 0.50                         // 50% upper bound

  // Check that a solution exists within bounds
  const evAtLo = computeEV(lo)
  const evAtHi = computeEV(hi)
  if (evAtLo === null || evAtHi === null) return null
  if (evAtLo < targetEV && evAtHi < targetEV) return null  // EV always below target
  if (evAtLo > targetEV && evAtHi > targetEV) return null  // Should not happen (higher WACC = lower EV)

  const MAX_ITERATIONS = 50
  const TOLERANCE = 0.0001  // 0.01% precision

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const mid = (lo + hi) / 2
    const evAtMid = computeEV(mid)
    if (evAtMid === null) {
      lo = mid  // Move away from the singularity
      continue
    }

    if (Math.abs(evAtMid - targetEV) / targetEV < TOLERANCE) {
      return Math.round(mid * 10000) / 10000  // Basis-point precision
    }

    if (evAtMid > targetEV) {
      lo = mid  // EV too high -> need higher WACC
    } else {
      hi = mid  // EV too low -> need lower WACC
    }
  }

  // Return best estimate after max iterations
  return Math.round(((lo + hi) / 2) * 10000) / 10000
}
```

### Usage in the API response

The implied WACC is computed server-side in the `GET /api/companies/[id]/dcf` route and included in the response payload. It requires the multiple-based valuation to be available (from the latest ValuationSnapshot).

```typescript
// In dcf/route.ts GET handler, after building the response:

// Fetch latest valuation snapshot for convergence comparison
const latestSnapshot = await prisma.valuationSnapshot.findFirst({
  where: { companyId },
  orderBy: { createdAt: 'desc' },
})

let convergenceData = null
if (latestSnapshot && financials?.ebitda && dcfAssumptions) {
  const multipleEV = Number(latestSnapshot.currentValue)
  const baseFCF = financials.freeCashFlow ?? financials.estimatedFCF ?? 0

  if (multipleEV > 0 && baseFCF > 0) {
    const growthRates = /* extract from assumptions */
    const impliedWacc = solveImpliedWACC(
      multipleEV,
      baseFCF,
      growthRates,
      'gordon',
      Number(dcfAssumptions.perpetualGrowthRate),
      undefined,
      undefined,
      true // mid-year convention
    )

    convergenceData = {
      multipleEnterpriseValue: multipleEV,
      multipleUsed: Number(latestSnapshot.finalMultiple),
      impliedWacc,
      briScore: Number(latestSnapshot.briScore),
    }
  }
}
```

---

## 11. Database Schema Changes

### DCFAssumptions model additions

```prisma
model DCFAssumptions {
  // ... existing fields ...

  // NEW: Company-Specific Risk premium (the major missing component)
  companySpecificRisk     Decimal? @map("company_specific_risk") @db.Decimal(5, 4)

  // NEW: Mid-year convention toggle
  useMidYearConvention    Boolean  @default(true) @map("use_mid_year_convention")

  // NEW: Pre-tax cost of debt (separate from costOfDebtOverride which was after-tax in some contexts)
  // This field stores the pre-tax cost of debt to avoid confusion
  preTaxCostOfDebt        Decimal? @map("pre_tax_cost_of_debt") @db.Decimal(5, 4)

  // NEW: Implied WACC from multiple-based valuation (computed, not user-input)
  impliedWaccFromMultiple Decimal? @map("implied_wacc_from_multiple") @db.Decimal(5, 4)

  // NEW: EBITDA tier label for audit trail
  ebitdaTier              String?  @map("ebitda_tier")

  // ... existing relations ...
}
```

### ValuationSnapshot additions

```prisma
model ValuationSnapshot {
  // ... existing fields ...

  // NEW: Store the implied WACC at snapshot time for trend analysis
  dcfImpliedWaccFromMultiple Decimal? @map("dcf_implied_wacc_from_multiple") @db.Decimal(5, 4)

  // NEW: Store CSR used in auto-DCF for audit trail
  dcfCompanySpecificRisk     Decimal? @map("dcf_company_specific_risk") @db.Decimal(5, 4)

  // ... existing relations ...
}
```

### Migration

```sql
-- Add new columns to dcf_assumptions
ALTER TABLE dcf_assumptions
  ADD COLUMN company_specific_risk DECIMAL(5,4),
  ADD COLUMN use_mid_year_convention BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN pre_tax_cost_of_debt DECIMAL(5,4),
  ADD COLUMN implied_wacc_from_multiple DECIMAL(5,4),
  ADD COLUMN ebitda_tier VARCHAR(255);

-- Add new columns to valuation_snapshots
ALTER TABLE valuation_snapshots
  ADD COLUMN dcf_implied_wacc_from_multiple DECIMAL(5,4),
  ADD COLUMN dcf_company_specific_risk DECIMAL(5,4);
```

---

## 12. UI Changes

### WACCCalculator.tsx

**Add Company-Specific Risk slider**

The component currently has four equity-side inputs: Risk-Free Rate, Market Risk Premium, Beta, Size Risk Premium. Add a fifth: Company-Specific Risk.

```typescript
// Updated INPUT_RANGES
const INPUT_RANGES = {
  riskFreeRate: { min: 0.030, max: 0.060, step: 0.001, default: 0.041 },
  marketRiskPremium: { min: 0.035, max: 0.070, step: 0.001, default: 0.050 },
  beta: { min: 0.5, max: 2.0, step: 0.01, default: 1.0 },
  sizeRiskPremium: { min: 0.01, max: 0.10, step: 0.001, default: 0.055 },
  companySpecificRisk: { min: 0, max: 0.15, step: 0.001, default: 0.05 },  // NEW
  costOfDebt: { min: 0.05, max: 0.20, step: 0.001, default: 0.11 },        // UPDATED range
  taxRate: { min: 0.15, max: 0.35, step: 0.01, default: 0.25 },
}
```

**Update WACCInputs interface**

```typescript
export interface WACCInputs {
  riskFreeRate: number
  marketRiskPremium: number
  beta: number
  sizeRiskPremium: number
  companySpecificRisk: number      // NEW
  costOfDebt: number | null
  taxRate: number | null
}
```

**Update Cost of Equity formula display**

```
Re = Rf + beta(Rm-Rf) + Size Premium + Company-Specific Risk
Re = 4.1% + 1.00 x 5.0% + 5.9% + 7.5%
Cost of Equity = 22.5%
```

### ValuationResults.tsx

**Add convergence panel** (new section below "Additional Metrics")

When convergence data is available, show:

```
+--------------------------------------------------+
| DCF vs. Multiple Convergence                      |
|                                                   |
| Component WACC:     19.2%                         |
| Implied WACC:       18.8%     [from 4.5x multiple]|
| Divergence:         +2.1%     CONVERGED            |
|                                                   |
| [If not converged:]                               |
| ! DCF overshoots by 35%                           |
|   Most likely reason: WACC too low                |
|   Suggestion: Increase CSR from 5% to 8%         |
+--------------------------------------------------+
```

**Color coding**:
- Converged (<=15%): green badge
- Minor (<=25%): yellow badge
- Significant (<=50%): orange badge
- Extreme (>50%): red badge with detailed explanation

### Valuation page (page.tsx)

**Wire up convergence data**:

```typescript
// In fetchAssumptions callback, add:
if (data.convergenceData) {
  setConvergenceData(data.convergenceData)
}

// Pass to ValuationResults:
<ValuationResults
  results={dcfResults}
  wacc={calculatedWACC}
  netDebt={netDebt}
  isLoading={false}
  workingCapital={workingCapital}
  convergenceData={convergenceData}  // NEW
  impliedWacc={convergenceData?.impliedWacc}  // NEW
/>
```

### Mid-year convention toggle

Add a toggle in the TerminalValuePanel or create a new "Advanced Settings" collapsible panel:

```
[ ] Use Mid-Year Convention (recommended)
    Cash flows are discounted as if received mid-year rather than year-end.
```

---

## 13. Data Flow Diagram

### Auto-DCF Pipeline (snapshot recalculation)

```
recalculateSnapshotForCompany()
  |
  +--> fetchCompany(companyId)
  |      -> adjustedEbitda, briScore, coreFactors
  |
  +--> calculateWACCDefaults({        <-- NEW: replaces hardcoded constants
  |      adjustedEbitda,
  |      briScore,
  |      revenueSizeCategory,
  |      derivedCostOfDebt,
  |      derivedTaxRate,
  |      derivedDebtWeight,
  |    })
  |    returns: {
  |      riskFreeRate, equityRiskPremium, beta,
  |      sizeRiskPremium, companySpecificRisk,
  |      preTaxCostOfDebt, taxRate,
  |      debtWeight, equityWeight,
  |      computedWacc
  |    }
  |
  +--> calculateWACC({                <-- UPDATED: includes CSR
  |      riskFreeRate, marketRiskPremium, beta,
  |      sizeRiskPremium, companySpecificRisk,
  |      costOfDebt, taxRate,
  |      debtWeight, equityWeight,
  |    })
  |
  +--> calculateDCF({                 <-- UPDATED: includes mid-year
  |      baseFCF, growthRates, wacc,
  |      terminalMethod: 'gordon',
  |      perpetualGrowthRate,
  |      netDebt,
  |      useMidYearConvention: true,
  |    })
  |
  +--> solveImpliedWACC(              <-- NEW
  |      multipleBasedEV,
  |      baseFCF, growthRates,
  |      'gordon', terminalGrowthRate,
  |      undefined, undefined, true
  |    )
  |
  +--> createValuationSnapshot({
         ...existingFields,
         dcfCompanySpecificRisk,       <-- NEW
         dcfImpliedWaccFromMultiple,   <-- NEW
       })
```

### Manual DCF Page (user interaction)

```
User opens DCF page
  |
  +--> GET /api/companies/{id}/dcf
  |      |
  |      +--> If no saved assumptions:
  |      |      calculateWACCDefaults(...)  <-- NEW: generates smart defaults
  |      |      Include in response as suggestedDefaults
  |      |      Include convergenceData with impliedWacc
  |      |
  |      +--> If saved assumptions exist:
  |             Return saved values
  |             Compute impliedWacc from latest snapshot
  |             Include convergenceData
  |
  +--> Frontend renders WACCCalculator with CSR slider
  |
  +--> User adjusts any WACC component
  |      |
  |      +--> useMemo recalculates WACC (includes CSR)
  |      +--> useMemo recalculates DCF results
  |      +--> Convergence check runs client-side
  |      +--> UI updates convergence panel in real-time
  |
  +--> User clicks "Save Assumptions"
         |
         +--> PUT /api/companies/{id}/dcf
                Save all components including CSR and mid-year flag
                Set isManuallyConfigured = true
```

---

## 14. Migration & Backwards Compatibility

### Existing manually-configured companies

Companies with `isManuallyConfigured = true` are NOT affected. Their saved assumptions are preserved exactly. The new CSR field will be `null` for these companies, and the WACC calculation will treat null CSR as 0 (backwards compatible).

### Existing auto-DCF calculations

Auto-DCF results will change on the next snapshot recalculation. The WACC will increase significantly for small companies. To manage this:

1. The migration adds new columns with `null` defaults -- no existing data changes
2. The next snapshot recalculation for each company will use the new defaults engine
3. Old snapshots retain their historical WACC values for trend analysis
4. A snapshot reason of `"WACC methodology update"` should be used for the first recalculation after deployment

### Backwards compatibility in WACC calculation

```typescript
// Updated calculateWACC to handle CSR being undefined/null
export function calculateWACC(inputs: WACCInputs): number {
  const costOfEquity = calculateCostOfEquity(
    inputs.riskFreeRate,
    inputs.marketRiskPremium,
    inputs.beta,
    inputs.sizeRiskPremium,
    inputs.companySpecificRisk ?? 0  // NEW: defaults to 0 if not provided
  )
  // ... rest unchanged
}
```

### WACCInputs interface update

```typescript
export interface WACCInputs {
  riskFreeRate: number
  marketRiskPremium: number
  beta: number
  sizeRiskPremium: number
  companySpecificRisk?: number  // NEW: optional for backwards compatibility
  costOfDebt: number
  taxRate: number
  debtWeight: number
  equityWeight: number
}
```

### Cost of Equity formula update

```typescript
export function calculateCostOfEquity(
  riskFreeRate: number,
  marketRiskPremium: number,
  beta: number,
  sizeRiskPremium: number,
  companySpecificRisk: number = 0  // NEW: defaults to 0
): number {
  return riskFreeRate + beta * marketRiskPremium + sizeRiskPremium + companySpecificRisk
}
```

---

## 15. Test Plan

### Unit tests for `wacc-defaults.ts`

```typescript
describe('calculateWACCDefaults', () => {
  // Tier selection
  it('selects Micro tier for $300K EBITDA')
  it('selects Small tier for $1.29M EBITDA')
  it('selects Lower-Mid tier for $3M EBITDA')
  it('selects Enterprise tier for $75M EBITDA')

  // WACC range validation
  it('produces WACC in 18-25% range for $1M EBITDA, BRI=0.50')
  it('produces WACC in 14-18% range for $5M EBITDA, BRI=0.50')
  it('produces WACC in 10-13% range for $50M EBITDA, BRI=0.50')

  // BRI sensitivity
  it('produces lower WACC for BRI=0.90 vs BRI=0.30 at same EBITDA')
  it('CSR range matches tier bounds for BRI=0 and BRI=1')

  // Derived values
  it('uses derived cost of debt when available and in range')
  it('falls back to tier default when derived cost of debt is out of range')
  it('uses derived capital structure when available')
})

describe('interpolateSizeRiskPremium', () => {
  it('returns 8.0% for $250K EBITDA (anchor point)')
  it('returns 6.2% for $1M EBITDA (anchor point)')
  it('returns ~5.94% for $1.29M EBITDA (interpolated)')
  it('returns 1.5% for $50M EBITDA (anchor point)')
  it('returns 8.0% for $0 EBITDA (floor)')
  it('returns 1.5% for $100M EBITDA (ceiling)')
  it('interpolation is monotonically decreasing')
})

describe('calculateCSRFromBRI', () => {
  it('returns csrLow when BRI=1.0')
  it('returns csrHigh when BRI=0.0')
  it('returns midpoint when BRI=0.5')
  it('clamps BRI to [0,1] range')
  it('handles csrLow === csrHigh gracefully')
})
```

### Unit tests for convergence check

```typescript
describe('checkConvergence', () => {
  it('reports converged when DCF and multiple within 15%')
  it('reports minor divergence at 20%')
  it('reports significant divergence at 40%')
  it('reports extreme divergence at 60%')
  it('identifies WACC too low as primary reason when DCF overshoots')
  it('identifies aggressive growth as reason when growth > 10% and multiple < 5x')
  it('suggests increasing CSR when CSR is below tier midpoint')
})
```

### Unit tests for implied WACC solver

```typescript
describe('solveImpliedWACC', () => {
  it('returns correct WACC for a known DCF (textbook example)')
  it('returns null for negative target EV')
  it('returns null for zero base FCF')
  it('handles Gordon growth terminal value correctly')
  it('handles exit multiple terminal value correctly')
  it('converges to within 1bp of true value')
  it('works with mid-year convention')
  it('works with end-of-year convention')
})
```

### Integration tests

```typescript
describe('WACC redesign integration', () => {
  it('$1.29M EBITDA company: WACC defaults produce convergence with 4.5x multiple', () => {
    // Setup: $1.29M EBITDA, BRI=0.65, industry 3.0x-6.0x
    const defaults = calculateWACCDefaults({
      adjustedEbitda: 1_290_000,
      briScore: 0.65,
    })
    // WACC should be ~19%
    expect(defaults.computedWacc).toBeGreaterThanOrEqual(0.17)
    expect(defaults.computedWacc).toBeLessThanOrEqual(0.22)

    // Run DCF with these defaults
    const dcf = calculateDCF({
      baseFCF: 1_290_000 * 0.70, // FCF ~70% of EBITDA
      growthRates: [0.05, 0.04, 0.03, 0.025, 0.025],
      wacc: defaults.computedWacc,
      terminalMethod: 'gordon',
      perpetualGrowthRate: 0.025,
      netDebt: 0,
      useMidYearConvention: true,
    })

    // Implied multiple should be in the 4-6x range
    const impliedMultiple = dcf.enterpriseValue / 1_290_000
    expect(impliedMultiple).toBeGreaterThanOrEqual(3.5)
    expect(impliedMultiple).toBeLessThanOrEqual(6.5)
  })
})
```

### Convergence validation across size spectrum

| EBITDA | BRI | Expected WACC | Expected Multiple | DCF Implied Multiple |
|---|---|---|---|---|
| $500K | 0.50 | 22-27% | 3.0-4.0x | 3.0-4.5x |
| $1.29M | 0.65 | 18-21% | 4.0-5.0x | 4.0-5.5x |
| $5M | 0.70 | 14-17% | 5.0-6.5x | 5.0-7.0x |
| $10M | 0.75 | 12-15% | 5.5-7.5x | 5.5-7.5x |
| $50M | 0.80 | 10-12% | 7.0-10.0x | 7.0-10.0x |

The convergence check should report "converged" (<=15% divergence) for all of these scenarios when using the new defaults.

---

## Summary of Changes by File

| File | Action | Description |
|---|---|---|
| `src/lib/valuation/wacc-defaults.ts` | **NEW** | WACC defaults engine: tier definitions, CSR mapping, size premium interpolation, convergence check, implied WACC solver |
| `src/lib/valuation/dcf-calculator.ts` | **MODIFY** | Add CSR to WACCInputs/costOfEquity; add mid-year convention to calculatePresentValue/calculateDCF; update DCFInputs |
| `src/lib/valuation/auto-dcf.ts` | **MODIFY** | Replace hardcoded constants with `calculateWACCDefaults()` call; pass CSR to WACC calc; enable mid-year convention |
| `src/app/api/companies/[id]/dcf/route.ts` | **MODIFY** | Use `calculateWACCDefaults()` for suggested defaults; add convergence data and implied WACC to GET response; save CSR in PUT |
| `src/components/valuation/WACCCalculator.tsx` | **MODIFY** | Add CSR slider; update ranges; update formula display |
| `src/components/valuation/ValuationResults.tsx` | **MODIFY** | Add convergence panel; display implied WACC vs component WACC |
| `src/app/(dashboard)/dashboard/valuation/page.tsx` | **MODIFY** | Wire CSR state; wire convergence data; wire mid-year toggle |
| `prisma/schema.prisma` | **MODIFY** | Add `companySpecificRisk`, `useMidYearConvention`, `preTaxCostOfDebt`, `impliedWaccFromMultiple`, `ebitdaTier` to DCFAssumptions; add `dcfImpliedWaccFromMultiple`, `dcfCompanySpecificRisk` to ValuationSnapshot |
| `src/lib/security/validation.ts` | **MODIFY** | Add new fields to `dcfAssumptionsSchema` |
| `src/__tests__/wacc-defaults.test.ts` | **NEW** | Tests for all new functions |

---

## Appendix A: Worked Example ($1.29M EBITDA)

**Input**: adjustedEbitda = $1,290,000, briScore = 0.65

**Step 1: Tier selection** -> Small ($500K-$2M EBITDA)

**Step 2: Size risk premium** (log interpolation)
- Between $1M (6.2%) and $2M (5.5%)
- t = log(1.29M/1M) / log(2M/1M) = 0.365
- **Size premium = 5.94%**

**Step 3: Company-Specific Risk**
- Tier CSR range: 5.0% - 10.0%
- CSR = 10.0% - 0.65 * (10.0% - 5.0%) = 10.0% - 3.25% = **6.75%**

**Step 4: Cost of equity**
- Re = 4.1% + 1.0 * 5.0% + 5.94% + 6.75% = **21.79%**

**Step 5: Cost of debt**
- Tier default midpoint: (10% + 12%) / 2 = **11.0%**
- After-tax: 11.0% * (1 - 0.25) = **8.25%**

**Step 6: WACC**
- Debt weight: 20% (tier default)
- WACC = 0.80 * 21.79% + 0.20 * 8.25% = 17.43% + 1.65% = **19.08%**

**Step 7: DCF (with mid-year convention)**
- Base FCF = $1,290,000 * 0.70 = $903,000
- Growth rates: [5%, 4%, 3%, 2.5%, 2.5%]
- Terminal growth: 2.5%
- Terminal value (Gordon) = FCF_5 * 1.025 / (0.1908 - 0.025) = $1,028,766 * 1.025 / 0.1658 = **$6,358,539**
- PV of FCFs (mid-year):
  - Year 1: $948,150 / 1.1908^0.5 = $869,076
  - Year 2: $986,076 / 1.1908^1.5 = $758,584
  - Year 3: $1,015,658 / 1.1908^2.5 = $656,011
  - Year 4: $1,041,050 / 1.1908^3.5 = $564,430
  - Year 5: $1,067,076 / 1.1908^4.5 = $485,895
  - Sum PV FCFs = **$3,333,996**
- PV of terminal value: $6,358,539 / 1.1908^5 = **$2,632,428**
- Enterprise Value = $3,333,996 + $2,632,428 = **$5,966,424**
- **Implied EBITDA multiple = $5,966,424 / $1,290,000 = 4.62x**

**Step 8: Convergence check**
- Multiple-based EV (from snapshot at 4.5x final multiple): $1,290,000 * 4.5 = $5,805,000
- DCF EV: $5,966,424
- Divergence: ($5,966,424 - $5,805,000) / $5,805,000 = **+2.8%**
- Severity: **converged** (within 15% threshold)

This is a dramatic improvement over the current state (12% WACC producing ~9x implied multiple with 100%+ divergence).
