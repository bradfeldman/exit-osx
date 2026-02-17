'use client'

import { Check, Link2 } from 'lucide-react'

interface SubTaskConnectProps {
  stepId: string
  title: string
  completed: boolean
  integrationKey: string | null
}

const INTEGRATION_NAMES: Record<string, string> = {
  quickbooks: 'QuickBooks',
  xero: 'Xero',
  stripe: 'Stripe',
}

export function SubTaskConnect({ title, completed, integrationKey }: SubTaskConnectProps) {
  const integrationName = integrationKey ? (INTEGRATION_NAMES[integrationKey] || integrationKey) : 'Integration'

  if (completed) {
    return (
      <div className="flex items-start gap-3 py-2">
        <Check className="w-4 h-4 mt-0.5 text-[var(--burnt-orange)] shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-muted-foreground line-through">{title}</span>
          <p className="text-xs text-emerald-600 mt-0.5">
            Connected to {integrationName}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-2">
      <p className="text-sm text-foreground mb-2">{title}</p>
      <button
        type="button"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-muted/30 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
      >
        <Link2 className="w-4 h-4" />
        Connect {integrationName}
        <span className="text-xs text-muted-foreground ml-1">(Coming soon)</span>
      </button>
    </div>
  )
}
