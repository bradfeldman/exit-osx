/**
 * Rich Task Description Types
 *
 * Structured content for detailed task descriptions that help users
 * understand why a task matters, what to do, and how it impacts their exit.
 */

export interface SubTask {
  title: string
  items: string[]
}

export interface RichTaskDescription {
  /** Why this task applies specifically to the user's business */
  whyThisApplies: string

  /** Why this is a buyer risk that must be addressed */
  buyerRisk: {
    mainQuestion: string
    consequences: string[]
    conclusion: string
  }

  /** What successful completion looks like */
  successCriteria: {
    overview: string
    outcomes: string[]
  }

  /** Detailed sub-tasks to complete */
  subTasks: SubTask[]

  /** Required output format/deliverables */
  outputFormat: {
    description: string
    formats: string[]
    guidance: string
  }

  /** How this task impacts exit outcomes */
  exitImpact: {
    overview: string
    benefits: string[]
  }
}

/**
 * Helper to check if a task has a rich description
 */
export function hasRichDescription(richDescription: unknown): richDescription is RichTaskDescription {
  if (!richDescription || typeof richDescription !== 'object') return false
  const rd = richDescription as Record<string, unknown>
  return (
    typeof rd.whyThisApplies === 'string' &&
    typeof rd.buyerRisk === 'object' &&
    typeof rd.successCriteria === 'object' &&
    Array.isArray(rd.subTasks) &&
    typeof rd.outputFormat === 'object' &&
    typeof rd.exitImpact === 'object'
  )
}

/**
 * Sample rich description for Customer Concentration Risk Mitigation task
 */
export const SAMPLE_CUSTOMER_CONCENTRATION_DESCRIPTION: RichTaskDescription = {
  whyThisApplies: `Your revenue is meaningfully influenced by a limited number of customers. While this is common in many strong businesses, buyers view customer concentration as a transferability risk until it is clearly explained and mitigated.

This task exists to ensure that customer concentration is not treated as an unknown or unmanaged risk during diligence. Proper documentation allows buyers to understand why concentration exists, how stable the revenue truly is, and what protects the business if customer behavior changes.

Without this documentation, buyers may assume worst-case scenarios and respond with valuation discounts, holdbacks, earn-outs, or delayed closing timelines.`,

  buyerRisk: {
    mainQuestion: "What happens to the business if one major customer reduces spend or leaves?",
    consequences: [
      "Reducing valuation multiples",
      "Introducing contingent consideration",
      "Increasing escrow or holdback requirements",
      "Extending diligence or walking away altogether"
    ],
    conclusion: "This task converts concentration from a perceived risk into a defined, explainable, and mitigated risk, improving confidence and deal outcomes."
  },

  successCriteria: {
    overview: "This task is successfully completed when a buyer can clearly see that:",
    outcomes: [
      "Customer concentration is fully disclosed and understood",
      "The revenue tied to key customers is durable and defensible",
      "Practical mitigation mechanisms are already in place",
      "The business is not dependent on any single relationship to survive"
    ]
  },

  subTasks: [
    {
      title: "Customer Concentration Overview",
      items: [
        "Identify top customers by revenue (e.g., top 1, 3, 5, 10)",
        "Show each as a percentage of total revenue",
        "Include historical trends to demonstrate stability or improvement"
      ]
    },
    {
      title: "Root Cause Explanation",
      items: [
        "Explain why concentration exists (market structure, contract size, strategic focus)",
        "Clarify whether concentration is intentional or structural"
      ]
    },
    {
      title: "Revenue Durability Factors",
      items: [
        "Contract terms (length, renewals, termination rights)",
        "Length and stability of customer relationships",
        "Switching costs, integrations, or operational dependence",
        "Historical retention, expansion, or renewal behavior"
      ]
    },
    {
      title: "Operational Mitigation Mechanisms",
      items: [
        "Account management ownership",
        "Renewal and upsell processes",
        "Diversification within customer accounts (products, geographies, end users)"
      ]
    },
    {
      title: "Forward-Looking Risk Reduction",
      items: [
        "Active pipeline or diversification initiatives",
        "Near-term actions already underway",
        "Realistic expectations, not aspirational promises"
      ]
    }
  ],

  outputFormat: {
    description: "Provide a clear, buyer-ready document in one of the following formats:",
    formats: [
      "Short written memo (2–4 pages)",
      "Structured slide deck (5–10 slides)",
      "Data-supported narrative section suitable for a CIM or data room"
    ],
    guidance: "The output should be factual, concise, and supported by data where possible. Avoid marketing language. The goal is clarity, not persuasion."
  },

  exitImpact: {
    overview: "Completing this task reduces perceived transferability risk and helps:",
    benefits: [
      "Preserve valuation multiples",
      "Limit earn-outs and contingent structures",
      "Shorten diligence timelines",
      "Increase buyer confidence and competitive tension"
    ]
  }
}
