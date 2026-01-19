// Task templates for generating playbook items based on BRI assessment responses
// Each template is tied to a question and generates tasks when the response score is below threshold

import { type RichTaskDescription, SAMPLE_CUSTOMER_CONCENTRATION_DESCRIPTION } from './rich-task-description'

export type ActionItemType =
  | 'TYPE_I_EVIDENCE'
  | 'TYPE_II_DOCUMENTATION'
  | 'TYPE_III_OPERATIONAL'
  | 'TYPE_IV_INSTITUTIONALIZE'
  | 'TYPE_V_RISK_REDUCTION'
  | 'TYPE_VI_ALIGNMENT'
  | 'TYPE_VII_READINESS'
  | 'TYPE_VIII_SIGNALING'
  | 'TYPE_IX_OPTIONS'
  | 'TYPE_X_DEFER'

export type EffortLevel = 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'MAJOR'
export type ComplexityLevel = 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'STRATEGIC'
export type BriCategory = 'FINANCIAL' | 'TRANSFERABILITY' | 'OPERATIONAL' | 'MARKET' | 'LEGAL_TAX' | 'PERSONAL'

export interface TaskTemplate {
  questionPattern: string // Pattern to match question text
  briCategory: BriCategory
  scoreThreshold: number // Generate task if score is below this (0-1)
  tasks: Array<{
    title: string
    description: string
    richDescription?: RichTaskDescription // Structured detailed description for the task
    actionType: ActionItemType
    effortLevel: EffortLevel
    complexity: ComplexityLevel
    estimatedHours?: number
    impactMultiplier: number // How much of the question's max impact this task addresses (legacy)
    // Answer Upgrade System fields
    upgradeFromScore: number // Score level this task applies to (user's current answer)
    upgradeToScore: number   // Score level after completion
  }>
}

export const taskTemplates: TaskTemplate[] = [
  // ==========================================
  // FINANCIAL
  // ==========================================
  {
    questionPattern: 'revenue been over the past 3 years',
    briCategory: 'FINANCIAL',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Implement revenue forecasting system',
        description: 'Create a rolling 12-month revenue forecast with variance tracking to demonstrate predictability to buyers.',
        actionType: 'TYPE_I_EVIDENCE',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 20,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Diversify revenue streams',
        description: 'Identify and develop 2-3 new revenue streams to reduce dependency on volatile sources.',
        actionType: 'TYPE_III_OPERATIONAL',
        effortLevel: 'HIGH',
        complexity: 'STRATEGIC',
        estimatedHours: 80,
        impactMultiplier: 0.8,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'recurring sources',
    briCategory: 'FINANCIAL',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Convert project clients to retainer agreements',
        description: 'Identify top 10 project-based clients and create retainer or subscription proposals.',
        actionType: 'TYPE_III_OPERATIONAL',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 30,
        impactMultiplier: 0.6,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Launch subscription or maintenance program',
        description: 'Create a recurring revenue program (maintenance contracts, subscription tier, or SaaS model).',
        actionType: 'TYPE_IV_INSTITUTIONALIZE',
        effortLevel: 'HIGH',
        complexity: 'STRATEGIC',
        estimatedHours: 60,
        impactMultiplier: 0.9,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'cash flow',
    briCategory: 'FINANCIAL',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Implement 13-week cash flow forecast',
        description: 'Create a rolling 13-week cash flow forecast with weekly updates to demonstrate cash predictability to buyers.',
        actionType: 'TYPE_I_EVIDENCE',
        effortLevel: 'LOW',
        complexity: 'MODERATE',
        estimatedHours: 12,
        impactMultiplier: 0.4,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Establish cash reserve policy',
        description: 'Create and fund a cash reserve equal to 3-6 months of operating expenses to smooth volatility.',
        actionType: 'TYPE_V_RISK_REDUCTION',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 20,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
      {
        title: 'Optimize working capital cycle',
        description: 'Reduce DSO (days sales outstanding) and optimize inventory/payables to improve cash flow stability.',
        actionType: 'TYPE_III_OPERATIONAL',
        effortLevel: 'HIGH',
        complexity: 'STRATEGIC',
        estimatedHours: 60,
        impactMultiplier: 0.7,
        upgradeFromScore: 0.67,
        upgradeToScore: 1.00,
      },
    ],
  },
  {
    questionPattern: 'negative operating cash flow',
    briCategory: 'FINANCIAL',
    scoreThreshold: 0.75,
    tasks: [
      {
        title: 'Analyze and document cash flow patterns',
        description: 'Create a month-by-month analysis of operating cash flow for the past 24-36 months, identifying periods of negative cash flow and their root causes.',
        actionType: 'TYPE_I_EVIDENCE',
        effortLevel: 'LOW',
        complexity: 'MODERATE',
        estimatedHours: 12,
        impactMultiplier: 0.4,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.25,
      },
      {
        title: 'Implement cash flow improvement plan',
        description: 'Address root causes of negative cash flow periods through improved collections, adjusted payment terms, or seasonal planning.',
        actionType: 'TYPE_III_OPERATIONAL',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 30,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.25,
        upgradeToScore: 0.50,
      },
      {
        title: 'Establish working capital management system',
        description: 'Implement systematic working capital management including AR/AP optimization and inventory controls to minimize negative cash flow occurrences.',
        actionType: 'TYPE_IV_INSTITUTIONALIZE',
        effortLevel: 'HIGH',
        complexity: 'COMPLEX',
        estimatedHours: 50,
        impactMultiplier: 0.6,
        upgradeFromScore: 0.50,
        upgradeToScore: 0.75,
      },
      {
        title: 'Achieve consistent positive operating cash flow',
        description: 'Demonstrate 12+ consecutive months of positive operating cash flow through documented operational improvements.',
        actionType: 'TYPE_VII_READINESS',
        effortLevel: 'HIGH',
        complexity: 'STRATEGIC',
        estimatedHours: 80,
        impactMultiplier: 0.8,
        upgradeFromScore: 0.75,
        upgradeToScore: 1.00,
      },
    ],
  },
  {
    questionPattern: 'customer base',
    briCategory: 'FINANCIAL',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Develop customer acquisition strategy',
        description: 'Create a plan to acquire new customers and reduce dependency on top accounts.',
        actionType: 'TYPE_V_RISK_REDUCTION',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 25,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Document customer concentration risk mitigation',
        description: 'Create a risk assessment and mitigation plan for customer concentration to present to buyers.',
        richDescription: SAMPLE_CUSTOMER_CONCENTRATION_DESCRIPTION,
        actionType: 'TYPE_II_DOCUMENTATION',
        effortLevel: 'LOW',
        complexity: 'SIMPLE',
        estimatedHours: 8,
        impactMultiplier: 0.3,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'financial records',
    briCategory: 'FINANCIAL',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Implement monthly close process',
        description: 'Establish a formal monthly financial close with reconciliation and review procedures.',
        actionType: 'TYPE_IV_INSTITUTIONALIZE',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 40,
        impactMultiplier: 0.6,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Engage CPA for financial review',
        description: 'Hire a CPA firm to review or audit your financials for the past 2-3 years.',
        actionType: 'TYPE_I_EVIDENCE',
        effortLevel: 'MODERATE',
        complexity: 'SIMPLE',
        estimatedHours: 20,
        impactMultiplier: 0.8,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'gross profit margin',
    briCategory: 'FINANCIAL',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Conduct pricing analysis',
        description: 'Review pricing across all products/services and identify opportunities to increase margins.',
        actionType: 'TYPE_III_OPERATIONAL',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 20,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Reduce cost of goods sold',
        description: 'Identify and implement cost reduction strategies without impacting quality.',
        actionType: 'TYPE_III_OPERATIONAL',
        effortLevel: 'HIGH',
        complexity: 'COMPLEX',
        estimatedHours: 60,
        impactMultiplier: 0.7,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },

  // ==========================================
  // TRANSFERABILITY
  // ==========================================
  {
    questionPattern: 'dependent is the business on you',
    briCategory: 'TRANSFERABILITY',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Document your daily responsibilities',
        description: 'Create a detailed list of all tasks you perform and identify which can be delegated.',
        actionType: 'TYPE_II_DOCUMENTATION',
        effortLevel: 'LOW',
        complexity: 'SIMPLE',
        estimatedHours: 8,
        impactMultiplier: 0.3,
        upgradeFromScore: 0.00, // "Business cannot function without me"
        upgradeToScore: 0.33,   // "I handle most key decisions"
      },
      {
        title: 'Delegate key responsibilities',
        description: 'Systematically transfer 3-5 of your key functions to team members over the next 90 days.',
        actionType: 'TYPE_IV_INSTITUTIONALIZE',
        effortLevel: 'HIGH',
        complexity: 'COMPLEX',
        estimatedHours: 80,
        impactMultiplier: 0.8,
        upgradeFromScore: 0.33, // "I handle most key decisions"
        upgradeToScore: 0.67,   // "Team handles operations, I focus on strategy"
      },
      {
        title: 'Take a 2-week vacation test',
        description: 'Plan a 2-week absence to test business continuity without your involvement.',
        actionType: 'TYPE_VII_READINESS',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 20,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.67, // "Team handles operations, I focus on strategy"
        upgradeToScore: 1.00,   // "Business runs independently"
      },
    ],
  },
  {
    questionPattern: 'management team',
    briCategory: 'TRANSFERABILITY',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Define organizational structure',
        description: 'Create a clear org chart with defined roles, responsibilities, and reporting lines.',
        actionType: 'TYPE_II_DOCUMENTATION',
        effortLevel: 'LOW',
        complexity: 'SIMPLE',
        estimatedHours: 6,
        impactMultiplier: 0.3,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Hire or promote key managers',
        description: 'Identify gaps in management and create a hiring plan for critical leadership roles.',
        actionType: 'TYPE_III_OPERATIONAL',
        effortLevel: 'MAJOR',
        complexity: 'STRATEGIC',
        estimatedHours: 120,
        impactMultiplier: 0.9,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
      {
        title: 'Implement management incentive plan',
        description: 'Create retention bonuses or equity incentives for key management to stay through transition.',
        actionType: 'TYPE_VI_ALIGNMENT',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 20,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.67,
        upgradeToScore: 1.00,
      },
    ],
  },
  {
    questionPattern: 'documented are your business processes',
    briCategory: 'TRANSFERABILITY',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Create SOP documentation project',
        description: 'Identify top 10 critical processes and document step-by-step procedures for each.',
        actionType: 'TYPE_II_DOCUMENTATION',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 40,
        impactMultiplier: 0.7,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Implement knowledge management system',
        description: 'Set up a wiki or documentation platform to centralize institutional knowledge.',
        actionType: 'TYPE_IV_INSTITUTIONALIZE',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 30,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'customer relationships dependent on you',
    briCategory: 'TRANSFERABILITY',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Introduce team members to key accounts',
        description: 'Schedule meetings to introduce account managers to your top 10 customer relationships.',
        actionType: 'TYPE_III_OPERATIONAL',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 20,
        impactMultiplier: 0.6,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Implement CRM system',
        description: 'Deploy a CRM to capture customer history, preferences, and relationship details.',
        actionType: 'TYPE_IV_INSTITUTIONALIZE',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 40,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },

  // ==========================================
  // OPERATIONAL
  // ==========================================
  {
    questionPattern: 'scalable',
    briCategory: 'OPERATIONAL',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Automate manual processes',
        description: 'Identify and automate 3-5 time-intensive manual processes.',
        actionType: 'TYPE_III_OPERATIONAL',
        effortLevel: 'HIGH',
        complexity: 'COMPLEX',
        estimatedHours: 60,
        impactMultiplier: 0.6,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Create scalability roadmap',
        description: 'Document what infrastructure, technology, and people investments are needed to 2x revenue.',
        actionType: 'TYPE_II_DOCUMENTATION',
        effortLevel: 'LOW',
        complexity: 'MODERATE',
        estimatedHours: 12,
        impactMultiplier: 0.4,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'technology infrastructure',
    briCategory: 'OPERATIONAL',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Conduct technology audit',
        description: 'Review all systems and identify technical debt, security issues, and upgrade needs.',
        actionType: 'TYPE_I_EVIDENCE',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 20,
        impactMultiplier: 0.4,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Create technology modernization plan',
        description: 'Develop a prioritized roadmap for updating critical systems and infrastructure.',
        actionType: 'TYPE_II_DOCUMENTATION',
        effortLevel: 'MODERATE',
        complexity: 'COMPLEX',
        estimatedHours: 30,
        impactMultiplier: 0.6,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'employee retention',
    briCategory: 'OPERATIONAL',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Conduct employee satisfaction survey',
        description: 'Survey employees to understand engagement levels and identify improvement areas.',
        actionType: 'TYPE_I_EVIDENCE',
        effortLevel: 'LOW',
        complexity: 'SIMPLE',
        estimatedHours: 8,
        impactMultiplier: 0.3,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Implement retention program',
        description: 'Create competitive compensation, benefits, and growth opportunities to reduce turnover.',
        actionType: 'TYPE_IV_INSTITUTIONALIZE',
        effortLevel: 'HIGH',
        complexity: 'COMPLEX',
        estimatedHours: 60,
        impactMultiplier: 0.7,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'vendor.*supplier',
    briCategory: 'OPERATIONAL',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Formalize vendor agreements',
        description: 'Convert informal vendor relationships to formal contracts with clear terms.',
        actionType: 'TYPE_II_DOCUMENTATION',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 25,
        impactMultiplier: 0.6,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Create vendor backup plan',
        description: 'Identify alternative suppliers for critical vendors to reduce dependency risk.',
        actionType: 'TYPE_V_RISK_REDUCTION',
        effortLevel: 'LOW',
        complexity: 'SIMPLE',
        estimatedHours: 10,
        impactMultiplier: 0.4,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },

  // ==========================================
  // MARKET
  // ==========================================
  {
    questionPattern: 'growth.*market',
    briCategory: 'MARKET',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Document market opportunity',
        description: 'Create a market analysis showing TAM, SAM, and SOM with growth projections.',
        actionType: 'TYPE_I_EVIDENCE',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 20,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Identify adjacent market opportunities',
        description: 'Research and document expansion opportunities into related growing markets.',
        actionType: 'TYPE_IX_OPTIONS',
        effortLevel: 'MODERATE',
        complexity: 'STRATEGIC',
        estimatedHours: 30,
        impactMultiplier: 0.6,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'competitive position',
    briCategory: 'MARKET',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Create competitive analysis',
        description: 'Document key competitors, your differentiation, and competitive advantages.',
        actionType: 'TYPE_I_EVIDENCE',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 15,
        impactMultiplier: 0.4,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Strengthen market positioning',
        description: 'Develop and implement strategies to differentiate and strengthen market position.',
        actionType: 'TYPE_III_OPERATIONAL',
        effortLevel: 'HIGH',
        complexity: 'STRATEGIC',
        estimatedHours: 60,
        impactMultiplier: 0.7,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'proprietary.*IP',
    briCategory: 'MARKET',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Conduct IP audit',
        description: 'Inventory all intellectual property including trade secrets, trademarks, and patents.',
        actionType: 'TYPE_I_EVIDENCE',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 20,
        impactMultiplier: 0.4,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Protect key intellectual property',
        description: 'File trademarks, patents, or document trade secrets for critical IP.',
        actionType: 'TYPE_V_RISK_REDUCTION',
        effortLevel: 'HIGH',
        complexity: 'COMPLEX',
        estimatedHours: 50,
        impactMultiplier: 0.7,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },

  // ==========================================
  // LEGAL & TAX
  // ==========================================
  {
    questionPattern: 'corporate structure',
    briCategory: 'LEGAL_TAX',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Review and clean up corporate structure',
        description: 'Work with attorney to simplify entity structure and resolve ownership issues.',
        actionType: 'TYPE_V_RISK_REDUCTION',
        effortLevel: 'MODERATE',
        complexity: 'COMPLEX',
        estimatedHours: 30,
        impactMultiplier: 0.7,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Organize corporate documents',
        description: 'Create a data room with all corporate records, filings, and governing documents.',
        actionType: 'TYPE_II_DOCUMENTATION',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 20,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'contracts.*licenses.*permits',
    briCategory: 'LEGAL_TAX',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Audit contracts and agreements',
        description: 'Review all contracts for expiration dates, assignability, and change of control provisions.',
        actionType: 'TYPE_I_EVIDENCE',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 25,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Renew expiring licenses and permits',
        description: 'Identify and renew all expiring business licenses, permits, and certifications.',
        actionType: 'TYPE_V_RISK_REDUCTION',
        effortLevel: 'LOW',
        complexity: 'SIMPLE',
        estimatedHours: 10,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'litigation.*disputes.*regulatory',
    briCategory: 'LEGAL_TAX',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Resolve pending legal matters',
        description: 'Work with counsel to settle or resolve any outstanding disputes or litigation.',
        actionType: 'TYPE_V_RISK_REDUCTION',
        effortLevel: 'HIGH',
        complexity: 'COMPLEX',
        estimatedHours: 60,
        impactMultiplier: 0.8,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Document litigation history',
        description: 'Prepare a summary of all past litigation with outcomes for due diligence.',
        actionType: 'TYPE_II_DOCUMENTATION',
        effortLevel: 'LOW',
        complexity: 'SIMPLE',
        estimatedHours: 8,
        impactMultiplier: 0.3,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },

  // ==========================================
  // PERSONAL
  // ==========================================
  {
    questionPattern: 'exit timeline',
    briCategory: 'PERSONAL',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Define exit timeline and goals',
        description: 'Document your target exit date, minimum acceptable price, and ideal deal structure.',
        actionType: 'TYPE_VI_ALIGNMENT',
        effortLevel: 'LOW',
        complexity: 'SIMPLE',
        estimatedHours: 4,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Create personal financial plan',
        description: 'Work with advisor to understand your post-exit financial needs and deal requirements.',
        actionType: 'TYPE_VII_READINESS',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 15,
        impactMultiplier: 0.6,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'personal and business assets',
    briCategory: 'PERSONAL',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Separate personal expenses',
        description: 'Remove all personal expenses from business accounts and document adjustments.',
        actionType: 'TYPE_I_EVIDENCE',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 20,
        impactMultiplier: 0.6,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Transfer personal assets',
        description: 'Move any personal assets (vehicles, property) out of the business.',
        actionType: 'TYPE_V_RISK_REDUCTION',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 15,
        impactMultiplier: 0.5,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
  {
    questionPattern: 'key employees aware',
    briCategory: 'PERSONAL',
    scoreThreshold: 0.67,
    tasks: [
      {
        title: 'Develop key employee communication plan',
        description: 'Create a timeline and script for when and how to inform key employees of sale plans.',
        actionType: 'TYPE_VI_ALIGNMENT',
        effortLevel: 'LOW',
        complexity: 'MODERATE',
        estimatedHours: 8,
        impactMultiplier: 0.4,
        upgradeFromScore: 0.00,
        upgradeToScore: 0.33,
      },
      {
        title: 'Create employee retention agreements',
        description: 'Develop stay bonuses or retention packages for critical employees.',
        actionType: 'TYPE_VI_ALIGNMENT',
        effortLevel: 'MODERATE',
        complexity: 'MODERATE',
        estimatedHours: 20,
        impactMultiplier: 0.7,
        upgradeFromScore: 0.33,
        upgradeToScore: 0.67,
      },
    ],
  },
]

// Get templates matching a question
export function getTemplatesForQuestion(questionText: string): TaskTemplate[] {
  return taskTemplates.filter(template =>
    new RegExp(template.questionPattern, 'i').test(questionText)
  )
}
