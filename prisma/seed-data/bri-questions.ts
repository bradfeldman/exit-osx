// BRI (Buyer Readiness Index) Questions
// 6 Categories with weighted questions

export type BriCategory =
  | 'FINANCIAL'
  | 'TRANSFERABILITY'
  | 'OPERATIONAL'
  | 'MARKET'
  | 'LEGAL_TAX'
  | 'PERSONAL'

export interface QuestionOption {
  optionText: string
  scoreValue: number // 0.00 to 1.00
  displayOrder: number
}

export interface Question {
  briCategory: BriCategory
  questionText: string
  helpText: string
  displayOrder: number
  maxImpactPoints: number
  options: QuestionOption[]
}

// Category weights for final BRI calculation
export const categoryWeights: Record<BriCategory, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

export const briQuestions: Question[] = [
  // ==========================================
  // FINANCIAL (25% weight)
  // ==========================================
  {
    briCategory: 'FINANCIAL',
    questionText: 'How consistent has your revenue been over the past 3 years?',
    helpText: 'Buyers value predictable, stable revenue streams. Consistent growth or stability is more attractive than volatile swings.',
    displayOrder: 1,
    maxImpactPoints: 10,
    options: [
      { optionText: 'Highly volatile (>30% swings year over year)', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Somewhat volatile (15-30% swings)', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Relatively stable (5-15% variance)', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Very stable or consistent growth (<5% variance)', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'FINANCIAL',
    questionText: 'What percentage of your revenue comes from recurring sources?',
    helpText: 'Recurring revenue (subscriptions, contracts, retainers) is highly valued because it provides predictability.',
    displayOrder: 2,
    maxImpactPoints: 12,
    options: [
      { optionText: 'Less than 20% recurring', scoreValue: 0.00, displayOrder: 1 },
      { optionText: '20-40% recurring', scoreValue: 0.33, displayOrder: 2 },
      { optionText: '40-70% recurring', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'More than 70% recurring', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'FINANCIAL',
    questionText: 'How diversified is your customer base?',
    helpText: 'Customer concentration is a key risk factor. If your largest customer represents significant revenue, that creates dependency risk.',
    displayOrder: 3,
    maxImpactPoints: 10,
    options: [
      { optionText: 'Top customer is >50% of revenue', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Top customer is 25-50% of revenue', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Top customer is 10-25% of revenue', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'No single customer exceeds 10% of revenue', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'FINANCIAL',
    questionText: 'How accurate and up-to-date are your financial records?',
    helpText: 'Clean, accurate financials speed up due diligence and build buyer confidence.',
    displayOrder: 4,
    maxImpactPoints: 8,
    options: [
      { optionText: 'Financials are often delayed or contain errors', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Basic bookkeeping, reviewed quarterly', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Professional bookkeeping, monthly close', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Audited or CPA-reviewed financials, real-time reporting', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'FINANCIAL',
    questionText: 'What is your gross profit margin?',
    helpText: 'Higher margins indicate pricing power and operational efficiency, which buyers value highly.',
    displayOrder: 5,
    maxImpactPoints: 8,
    options: [
      { optionText: 'Below 30%', scoreValue: 0.00, displayOrder: 1 },
      { optionText: '30-50%', scoreValue: 0.33, displayOrder: 2 },
      { optionText: '50-70%', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Above 70%', scoreValue: 1.00, displayOrder: 4 },
    ],
  },

  // ==========================================
  // TRANSFERABILITY (20% weight)
  // ==========================================
  {
    briCategory: 'TRANSFERABILITY',
    questionText: 'How dependent is the business on you (the owner) for day-to-day operations?',
    helpText: 'The more the business can run without you, the more valuable it is to buyers.',
    displayOrder: 1,
    maxImpactPoints: 15,
    options: [
      { optionText: 'Business cannot function without me', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'I handle most key decisions and client relationships', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Team handles operations, I focus on strategy', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Business runs independently; I could step away for months', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'TRANSFERABILITY',
    questionText: 'Do you have a capable management team in place?',
    helpText: 'A strong second-level leadership team reduces key-person risk and enables growth.',
    displayOrder: 2,
    maxImpactPoints: 12,
    options: [
      { optionText: 'No dedicated management; I manage everyone directly', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'One or two leads, but limited autonomy', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Capable managers with defined responsibilities', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Experienced leadership team that could run the business', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'TRANSFERABILITY',
    questionText: 'How well documented are your business processes?',
    helpText: 'SOPs and documented processes make knowledge transfer easier and reduce transition risk.',
    displayOrder: 3,
    maxImpactPoints: 10,
    options: [
      { optionText: 'Most knowledge is in people\'s heads', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Some informal documentation exists', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Key processes are documented', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Comprehensive SOPs for all critical functions', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'TRANSFERABILITY',
    questionText: 'Are customer relationships dependent on you personally?',
    helpText: 'If customers buy because of their relationship with you, they may leave when you do.',
    displayOrder: 4,
    maxImpactPoints: 10,
    options: [
      { optionText: 'Most customers know only me', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Key customers have relationships with me primarily', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Customers work with my team but prefer me involved', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Customer relationships are with the company, not individuals', scoreValue: 1.00, displayOrder: 4 },
    ],
  },

  // ==========================================
  // OPERATIONAL (20% weight)
  // ==========================================
  {
    briCategory: 'OPERATIONAL',
    questionText: 'How scalable is your current business model?',
    helpText: 'Buyers want to grow the business. Scalability means you can add revenue without proportionally adding costs.',
    displayOrder: 1,
    maxImpactPoints: 12,
    options: [
      { optionText: 'Every new customer requires proportional new hires/costs', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Growth requires significant incremental investment', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Some operational leverage exists', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Highly scalable; revenue can grow faster than costs', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'OPERATIONAL',
    questionText: 'What is the quality of your technology infrastructure?',
    helpText: 'Modern, well-maintained systems reduce technical debt and integration challenges.',
    displayOrder: 2,
    maxImpactPoints: 8,
    options: [
      { optionText: 'Outdated systems with significant technical debt', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Functional but aging infrastructure', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Modern systems, some areas need updating', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Current, well-maintained tech stack', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'OPERATIONAL',
    questionText: 'How would you rate your employee retention?',
    helpText: 'High turnover signals cultural or operational issues and increases transition risk.',
    displayOrder: 3,
    maxImpactPoints: 8,
    options: [
      { optionText: 'High turnover (>30% annually)', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Moderate turnover (15-30% annually)', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Low turnover (5-15% annually)', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Very low turnover (<5% annually)', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'OPERATIONAL',
    questionText: 'Do you have formal vendor/supplier agreements?',
    helpText: 'Formal agreements provide stability and can be transferred to new ownership.',
    displayOrder: 4,
    maxImpactPoints: 6,
    options: [
      { optionText: 'Informal relationships only', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Mix of formal and informal', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Most key vendors under contract', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'All critical suppliers under formal agreement', scoreValue: 1.00, displayOrder: 4 },
    ],
  },

  // ==========================================
  // MARKET (15% weight)
  // ==========================================
  {
    briCategory: 'MARKET',
    questionText: 'What is the growth trajectory of your market?',
    helpText: 'Growing markets attract more buyers and support higher valuations.',
    displayOrder: 1,
    maxImpactPoints: 10,
    options: [
      { optionText: 'Declining market', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Flat or mature market', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Moderately growing (5-10% annually)', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'High growth market (>10% annually)', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'MARKET',
    questionText: 'How strong is your competitive position?',
    helpText: 'Market leaders and differentiated players command premium valuations.',
    displayOrder: 2,
    maxImpactPoints: 10,
    options: [
      { optionText: 'Highly commoditized, easily replaceable', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Some differentiation but many competitors', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Clear competitive advantages in our niche', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Market leader or strong differentiation', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'MARKET',
    questionText: 'Do you have proprietary products, IP, or processes?',
    helpText: 'Intellectual property creates barriers to entry and defensible market position.',
    displayOrder: 3,
    maxImpactPoints: 8,
    options: [
      { optionText: 'No proprietary assets', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Some trade secrets or know-how', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Proprietary processes or software', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Patents, trademarks, or significant IP portfolio', scoreValue: 1.00, displayOrder: 4 },
    ],
  },

  // ==========================================
  // LEGAL & TAX (10% weight)
  // ==========================================
  {
    briCategory: 'LEGAL_TAX',
    questionText: 'How clean is your corporate structure?',
    helpText: 'Complex structures, multiple entities, or unclear ownership complicate transactions.',
    displayOrder: 1,
    maxImpactPoints: 8,
    options: [
      { optionText: 'Complex structure with multiple entities or unclear ownership', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Some complexity that would need cleanup', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Relatively clean with minor issues', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Clean, simple structure ready for transaction', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'LEGAL_TAX',
    questionText: 'Are all contracts, licenses, and permits current and transferable?',
    helpText: 'Expired or non-transferable agreements create legal risk and deal friction.',
    displayOrder: 2,
    maxImpactPoints: 8,
    options: [
      { optionText: 'Multiple expired or non-transferable items', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Some items need renewal or have transfer restrictions', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Most items current, minor issues', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'All current and transferable', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'LEGAL_TAX',
    questionText: 'Any pending litigation, disputes, or regulatory issues?',
    helpText: 'Legal issues can derail deals or result in significant price adjustments.',
    displayOrder: 3,
    maxImpactPoints: 10,
    options: [
      { optionText: 'Active litigation or significant regulatory issues', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Minor disputes or potential issues', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Past issues fully resolved', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'No litigation history or regulatory concerns', scoreValue: 1.00, displayOrder: 4 },
    ],
  },

  // ==========================================
  // PERSONAL (10% weight)
  // ==========================================
  {
    briCategory: 'PERSONAL',
    questionText: 'How clear are you on your exit timeline?',
    helpText: 'A defined timeline helps you plan and communicate with potential buyers.',
    displayOrder: 1,
    maxImpactPoints: 6,
    options: [
      { optionText: 'No timeline in mind', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Vague idea (sometime in the next 5+ years)', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'General timeframe (2-5 years)', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Specific target date within 2 years', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'PERSONAL',
    questionText: 'Have you separated personal and business assets/expenses?',
    helpText: 'Commingled finances complicate due diligence and valuation.',
    displayOrder: 2,
    maxImpactPoints: 8,
    options: [
      { optionText: 'Significant commingling of personal/business', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Some personal expenses run through business', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Mostly separated with minor exceptions', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Completely separated', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
  {
    briCategory: 'PERSONAL',
    questionText: 'Are your key employees aware of and supportive of a potential sale?',
    helpText: 'Aligned key employees ease transition and reduce buyer concerns.',
    displayOrder: 3,
    maxImpactPoints: 8,
    options: [
      { optionText: 'Key employees unaware and might leave if sold', scoreValue: 0.00, displayOrder: 1 },
      { optionText: 'Unaware but likely supportive', scoreValue: 0.33, displayOrder: 2 },
      { optionText: 'Aware with mixed reactions', scoreValue: 0.67, displayOrder: 3 },
      { optionText: 'Aware and supportive, with retention plans in place', scoreValue: 1.00, displayOrder: 4 },
    ],
  },
]

// Helper to get questions by category
export function getQuestionsByCategory(category: BriCategory): Question[] {
  return briQuestions.filter(q => q.briCategory === category)
}

// Get total max impact points per category
export function getCategoryMaxPoints(category: BriCategory): number {
  return getQuestionsByCategory(category).reduce((sum, q) => sum + q.maxImpactPoints, 0)
}
