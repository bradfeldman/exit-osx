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
