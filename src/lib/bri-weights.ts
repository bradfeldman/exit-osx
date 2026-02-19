// Default BRI category weights that must sum to 1.0 (100%)
export const DEFAULT_BRI_WEIGHTS = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

export type BriWeights = typeof DEFAULT_BRI_WEIGHTS

// V2 DRS weights: PERSONAL excluded, redistributed to FINANCIAL (+5%) and TRANSFERABILITY (+5%)
// Used by Deal Readiness Score calculation — sum to 1.0 across 5 categories
export const DRS_WEIGHTS = {
  FINANCIAL: 0.30,
  TRANSFERABILITY: 0.25,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
}

export type DrsWeights = typeof DRS_WEIGHTS
