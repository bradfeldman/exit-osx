'use client'

import {
  FileText,
  DollarSign,
  BarChart3,
  TrendingUp,
  ListChecks,
  Building2,
  AlertTriangle,
  Shield,
} from 'lucide-react'

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  company_profile: { label: 'Company Profile', icon: Building2 },
  financials: { label: 'Financials', icon: DollarSign },
  bri_scores: { label: 'BRI Scores', icon: BarChart3 },
  valuation: { label: 'Valuation', icon: TrendingUp },
  tasks: { label: 'Tasks', icon: ListChecks },
  signals: { label: 'Signals', icon: AlertTriangle },
  evidence: { label: 'Evidence', icon: Shield },
  dossier: { label: 'Dossier', icon: FileText },
}

const ALL_SOURCES = Object.keys(SOURCE_CONFIG)

interface CoachContextCardProps {
  activeSources: string[]
}

export function CoachContextCard({ activeSources }: CoachContextCardProps) {
  const activeSet = new Set(activeSources)

  return (
    <div className="flex flex-col gap-1 p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Context Sources
      </h3>
      <div className="space-y-1">
        {ALL_SOURCES.map((source) => {
          const config = SOURCE_CONFIG[source]
          const isActive = activeSet.has(source)
          const Icon = config.icon

          return (
            <div
              key={source}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                isActive
                  ? 'text-foreground bg-muted/50'
                  : 'text-muted-foreground/40'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
              <span>{config.label}</span>
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-green-500" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
