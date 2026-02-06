import type { BriCategory } from '@prisma/client'

export interface DisclosureQuestion {
  key: string
  text: string
  briCategory: BriCategory
  followUpText: string
  signalType: 'positive' | 'negative'
}

export const DISCLOSURE_QUESTIONS: DisclosureQuestion[] = [
  {
    key: 'key_employee_departure',
    text: 'Has any key employee left or indicated they may leave in the past 30 days?',
    briCategory: 'TRANSFERABILITY',
    followUpText: 'Which role or department was affected?',
    signalType: 'negative',
  },
  {
    key: 'lost_major_customer',
    text: 'Have you lost a customer that represents more than 10% of revenue?',
    briCategory: 'FINANCIAL',
    followUpText: 'Approximately what percentage of revenue did they represent?',
    signalType: 'negative',
  },
  {
    key: 'new_major_customer',
    text: 'Have you added a significant new customer or contract?',
    briCategory: 'FINANCIAL',
    followUpText: 'What approximate annual value does this represent?',
    signalType: 'positive',
  },
  {
    key: 'legal_issue',
    text: 'Has any legal issue, lawsuit, or regulatory concern emerged?',
    briCategory: 'LEGAL_TAX',
    followUpText: 'Briefly describe the nature of the issue.',
    signalType: 'negative',
  },
  {
    key: 'ip_documentation',
    text: 'Have you formalized or documented any intellectual property (patents, trademarks, trade secrets)?',
    briCategory: 'OPERATIONAL',
    followUpText: 'What type of IP was documented?',
    signalType: 'positive',
  },
  {
    key: 'revenue_decline',
    text: 'Has monthly revenue declined more than 10% compared to the same period last year?',
    briCategory: 'FINANCIAL',
    followUpText: 'What do you attribute the decline to?',
    signalType: 'negative',
  },
  {
    key: 'process_documented',
    text: 'Have you documented or improved any critical operational process?',
    briCategory: 'OPERATIONAL',
    followUpText: 'Which process was documented or improved?',
    signalType: 'positive',
  },
  {
    key: 'owner_dependency_reduced',
    text: 'Have you delegated any responsibility that previously only you could handle?',
    briCategory: 'TRANSFERABILITY',
    followUpText: 'What was delegated and to whom?',
    signalType: 'positive',
  },
  {
    key: 'market_disruption',
    text: 'Has a competitor, regulation, or market change significantly impacted your business outlook?',
    briCategory: 'MARKET',
    followUpText: 'Briefly describe the change and its potential impact.',
    signalType: 'negative',
  },
  {
    key: 'tax_structure_change',
    text: 'Have you made or plan to make any changes to your business or tax structure?',
    briCategory: 'LEGAL_TAX',
    followUpText: 'What type of structural change?',
    signalType: 'negative',
  },
  {
    key: 'exit_timeline_change',
    text: 'Has your desired timeline for exit or sale changed?',
    briCategory: 'PERSONAL',
    followUpText: 'What is your updated target timeline?',
    signalType: 'negative',
  },
  {
    key: 'recurring_revenue_growth',
    text: 'Has your recurring or contracted revenue increased as a share of total revenue?',
    briCategory: 'FINANCIAL',
    followUpText: 'What approximate percentage of revenue is now recurring?',
    signalType: 'positive',
  },
]
