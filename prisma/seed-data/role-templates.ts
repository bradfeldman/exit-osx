// Role Template Seed Data
// Built-in role templates for team permissions

export interface RoleTemplateSeedData {
  slug: string
  name: string
  description: string
  icon: string
  defaultPermissions: Record<string, boolean>
  isBuiltIn: boolean
}

export const roleTemplates: RoleTemplateSeedData[] = [
  {
    slug: 'owner',
    name: 'Owner',
    description: 'Full access to all features and data',
    icon: 'crown',
    isBuiltIn: true,
    defaultPermissions: {
      // Assessments - full access
      'assessments.company:view': true,
      'assessments.company:edit': true,
      'assessments.personal:view': true,
      'assessments.personal:edit': true,
      // Business Financials - full access
      'financials.statements:view': true,
      'financials.statements:edit': true,
      'financials.adjustments:view': true,
      'financials.adjustments:edit': true,
      'financials.dcf:view': true,
      'financials.dcf:edit': true,
      // Personal Financials - full access
      'personal.retirement:view': true,
      'personal.retirement:edit': true,
      'personal.net_worth:view': true,
      'personal.net_worth:edit': true,
      // Valuation - full access
      'valuation.summary:view': true,
      'valuation.detailed:view': true,
      // Data Room - full access
      'dataroom.financial:view': true,
      'dataroom.financial:upload': true,
      'dataroom.legal:view': true,
      'dataroom.legal:upload': true,
      'dataroom.operations:view': true,
      'dataroom.operations:upload': true,
      'dataroom.customers:view': true,
      'dataroom.customers:upload': true,
      'dataroom.employees:view': true,
      'dataroom.employees:upload': true,
      'dataroom.ip:view': true,
      'dataroom.ip:upload': true,
      // Playbook - full access
      'playbook.tasks:view': true,
      'playbook.tasks:complete': true,
      'playbook.tasks:create': true,
      'playbook.tasks:assign': true,
      // Team - full access
      'team.members:view': true,
      'team.members:invite': true,
      'team.members:manage': true,
      'team.members:remove': true,
    },
  },
  {
    slug: 'cpa',
    name: 'CPA / Accountant',
    description: 'Access to financials, valuation, and financial documents',
    icon: 'calculator',
    isBuiltIn: true,
    defaultPermissions: {
      // Assessments - view only company, no personal
      'assessments.company:view': true,
      'assessments.company:edit': false,
      'assessments.personal:view': false,
      'assessments.personal:edit': false,
      // Business Financials - full access
      'financials.statements:view': true,
      'financials.statements:edit': true,
      'financials.adjustments:view': true,
      'financials.adjustments:edit': true,
      'financials.dcf:view': true,
      'financials.dcf:edit': true,
      // Personal Financials - no access
      'personal.retirement:view': false,
      'personal.retirement:edit': false,
      'personal.net_worth:view': false,
      'personal.net_worth:edit': false,
      // Valuation - view only
      'valuation.summary:view': true,
      'valuation.detailed:view': true,
      // Data Room - financial only
      'dataroom.financial:view': true,
      'dataroom.financial:upload': true,
      'dataroom.legal:view': false,
      'dataroom.legal:upload': false,
      'dataroom.operations:view': false,
      'dataroom.operations:upload': false,
      'dataroom.customers:view': false,
      'dataroom.customers:upload': false,
      'dataroom.employees:view': false,
      'dataroom.employees:upload': false,
      'dataroom.ip:view': false,
      'dataroom.ip:upload': false,
      // Playbook - view only
      'playbook.tasks:view': true,
      'playbook.tasks:complete': false,
      'playbook.tasks:create': false,
      'playbook.tasks:assign': false,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
  {
    slug: 'attorney',
    name: 'Attorney',
    description: 'Access to legal documents and compliance data',
    icon: 'scale',
    isBuiltIn: true,
    defaultPermissions: {
      // Assessments - limited view
      'assessments.company:view': true,
      'assessments.company:edit': false,
      'assessments.personal:view': false,
      'assessments.personal:edit': false,
      // Business Financials - no access
      'financials.statements:view': false,
      'financials.statements:edit': false,
      'financials.adjustments:view': false,
      'financials.adjustments:edit': false,
      'financials.dcf:view': false,
      'financials.dcf:edit': false,
      // Personal Financials - no access
      'personal.retirement:view': false,
      'personal.retirement:edit': false,
      'personal.net_worth:view': false,
      'personal.net_worth:edit': false,
      // Valuation - no access
      'valuation.summary:view': false,
      'valuation.detailed:view': false,
      // Data Room - legal, operations, IP
      'dataroom.financial:view': false,
      'dataroom.financial:upload': false,
      'dataroom.legal:view': true,
      'dataroom.legal:upload': true,
      'dataroom.operations:view': true,
      'dataroom.operations:upload': true,
      'dataroom.customers:view': false,
      'dataroom.customers:upload': false,
      'dataroom.employees:view': true,
      'dataroom.employees:upload': false,
      'dataroom.ip:view': true,
      'dataroom.ip:upload': true,
      // Playbook - view only
      'playbook.tasks:view': true,
      'playbook.tasks:complete': false,
      'playbook.tasks:create': false,
      'playbook.tasks:assign': false,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
  {
    slug: 'wealth_advisor',
    name: 'Wealth Advisor',
    description: 'Access to personal financials, valuation, and personal readiness',
    icon: 'wallet',
    isBuiltIn: true,
    defaultPermissions: {
      // Assessments - personal focus
      'assessments.company:view': true,
      'assessments.company:edit': false,
      'assessments.personal:view': true,
      'assessments.personal:edit': true,
      // Business Financials - view only
      'financials.statements:view': true,
      'financials.statements:edit': false,
      'financials.adjustments:view': true,
      'financials.adjustments:edit': false,
      'financials.dcf:view': true,
      'financials.dcf:edit': false,
      // Personal Financials - full access
      'personal.retirement:view': true,
      'personal.retirement:edit': true,
      'personal.net_worth:view': true,
      'personal.net_worth:edit': true,
      // Valuation - view only
      'valuation.summary:view': true,
      'valuation.detailed:view': true,
      // Data Room - limited
      'dataroom.financial:view': true,
      'dataroom.financial:upload': false,
      'dataroom.legal:view': false,
      'dataroom.legal:upload': false,
      'dataroom.operations:view': false,
      'dataroom.operations:upload': false,
      'dataroom.customers:view': false,
      'dataroom.customers:upload': false,
      'dataroom.employees:view': false,
      'dataroom.employees:upload': false,
      'dataroom.ip:view': false,
      'dataroom.ip:upload': false,
      // Playbook - limited
      'playbook.tasks:view': true,
      'playbook.tasks:complete': false,
      'playbook.tasks:create': false,
      'playbook.tasks:assign': false,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
  {
    slug: 'ma_advisor',
    name: 'M&A Advisor',
    description: 'Full business access for deal preparation',
    icon: 'handshake',
    isBuiltIn: true,
    defaultPermissions: {
      // Assessments - full company access
      'assessments.company:view': true,
      'assessments.company:edit': true,
      'assessments.personal:view': false,
      'assessments.personal:edit': false,
      // Business Financials - full access
      'financials.statements:view': true,
      'financials.statements:edit': true,
      'financials.adjustments:view': true,
      'financials.adjustments:edit': true,
      'financials.dcf:view': true,
      'financials.dcf:edit': true,
      // Personal Financials - no access
      'personal.retirement:view': false,
      'personal.retirement:edit': false,
      'personal.net_worth:view': false,
      'personal.net_worth:edit': false,
      // Valuation - full view
      'valuation.summary:view': true,
      'valuation.detailed:view': true,
      // Data Room - full access
      'dataroom.financial:view': true,
      'dataroom.financial:upload': true,
      'dataroom.legal:view': true,
      'dataroom.legal:upload': true,
      'dataroom.operations:view': true,
      'dataroom.operations:upload': true,
      'dataroom.customers:view': true,
      'dataroom.customers:upload': true,
      'dataroom.employees:view': true,
      'dataroom.employees:upload': true,
      'dataroom.ip:view': true,
      'dataroom.ip:upload': true,
      // Playbook - full access
      'playbook.tasks:view': true,
      'playbook.tasks:complete': true,
      'playbook.tasks:create': true,
      'playbook.tasks:assign': true,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
  {
    slug: 'consultant',
    name: 'Consultant',
    description: 'Access to assessments, operations, and playbook',
    icon: 'briefcase',
    isBuiltIn: true,
    defaultPermissions: {
      // Assessments - full company access
      'assessments.company:view': true,
      'assessments.company:edit': true,
      'assessments.personal:view': false,
      'assessments.personal:edit': false,
      // Business Financials - limited view
      'financials.statements:view': true,
      'financials.statements:edit': false,
      'financials.adjustments:view': true,
      'financials.adjustments:edit': false,
      'financials.dcf:view': false,
      'financials.dcf:edit': false,
      // Personal Financials - no access
      'personal.retirement:view': false,
      'personal.retirement:edit': false,
      'personal.net_worth:view': false,
      'personal.net_worth:edit': false,
      // Valuation - summary only
      'valuation.summary:view': true,
      'valuation.detailed:view': false,
      // Data Room - operations focus
      'dataroom.financial:view': false,
      'dataroom.financial:upload': false,
      'dataroom.legal:view': false,
      'dataroom.legal:upload': false,
      'dataroom.operations:view': true,
      'dataroom.operations:upload': true,
      'dataroom.customers:view': true,
      'dataroom.customers:upload': false,
      'dataroom.employees:view': true,
      'dataroom.employees:upload': false,
      'dataroom.ip:view': false,
      'dataroom.ip:upload': false,
      // Playbook - full access
      'playbook.tasks:view': true,
      'playbook.tasks:complete': true,
      'playbook.tasks:create': true,
      'playbook.tasks:assign': false,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
  {
    slug: 'internal_team',
    name: 'Internal Team',
    description: 'Access to assessments and assigned tasks',
    icon: 'user',
    isBuiltIn: true,
    defaultPermissions: {
      // Assessments - company only
      'assessments.company:view': true,
      'assessments.company:edit': true,
      'assessments.personal:view': false,
      'assessments.personal:edit': false,
      // Business Financials - view only
      'financials.statements:view': true,
      'financials.statements:edit': false,
      'financials.adjustments:view': true,
      'financials.adjustments:edit': false,
      'financials.dcf:view': false,
      'financials.dcf:edit': false,
      // Personal Financials - no access
      'personal.retirement:view': false,
      'personal.retirement:edit': false,
      'personal.net_worth:view': false,
      'personal.net_worth:edit': false,
      // Valuation - summary only
      'valuation.summary:view': true,
      'valuation.detailed:view': false,
      // Data Room - view only
      'dataroom.financial:view': true,
      'dataroom.financial:upload': false,
      'dataroom.legal:view': true,
      'dataroom.legal:upload': false,
      'dataroom.operations:view': true,
      'dataroom.operations:upload': true,
      'dataroom.customers:view': true,
      'dataroom.customers:upload': false,
      'dataroom.employees:view': true,
      'dataroom.employees:upload': false,
      'dataroom.ip:view': false,
      'dataroom.ip:upload': false,
      // Playbook - can complete tasks
      'playbook.tasks:view': true,
      'playbook.tasks:complete': true,
      'playbook.tasks:create': false,
      'playbook.tasks:assign': false,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
  {
    slug: 'view_only',
    name: 'View Only',
    description: 'Read-only access across permitted areas',
    icon: 'eye',
    isBuiltIn: true,
    defaultPermissions: {
      // Assessments - view only
      'assessments.company:view': true,
      'assessments.company:edit': false,
      'assessments.personal:view': false,
      'assessments.personal:edit': false,
      // Business Financials - view only
      'financials.statements:view': true,
      'financials.statements:edit': false,
      'financials.adjustments:view': true,
      'financials.adjustments:edit': false,
      'financials.dcf:view': true,
      'financials.dcf:edit': false,
      // Personal Financials - no access
      'personal.retirement:view': false,
      'personal.retirement:edit': false,
      'personal.net_worth:view': false,
      'personal.net_worth:edit': false,
      // Valuation - view only
      'valuation.summary:view': true,
      'valuation.detailed:view': true,
      // Data Room - view only
      'dataroom.financial:view': true,
      'dataroom.financial:upload': false,
      'dataroom.legal:view': true,
      'dataroom.legal:upload': false,
      'dataroom.operations:view': true,
      'dataroom.operations:upload': false,
      'dataroom.customers:view': true,
      'dataroom.customers:upload': false,
      'dataroom.employees:view': true,
      'dataroom.employees:upload': false,
      'dataroom.ip:view': true,
      'dataroom.ip:upload': false,
      // Playbook - view only
      'playbook.tasks:view': true,
      'playbook.tasks:complete': false,
      'playbook.tasks:create': false,
      'playbook.tasks:assign': false,
      // Team - view only
      'team.members:view': true,
      'team.members:invite': false,
      'team.members:manage': false,
      'team.members:remove': false,
    },
  },
]
