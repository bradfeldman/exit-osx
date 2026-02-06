'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileCheck,
  DollarSign,
  Scale,
  Settings,
  Users,
  Briefcase,
  Cpu,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORY_CARDS = [
  {
    id: 'financial',
    label: 'Financial',
    icon: DollarSign,
    description: 'Tax returns, P&L, balance sheets',
    impact: 'critical' as const,
  },
  {
    id: 'legal',
    label: 'Legal',
    icon: Scale,
    description: 'Contracts, formation docs, insurance',
    impact: 'critical' as const,
  },
  {
    id: 'operational',
    label: 'Operations',
    icon: Settings,
    description: 'Org chart, SOPs, vendor agreements',
    impact: 'important' as const,
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    description: 'Customer list, contracts, pipeline',
    impact: 'important' as const,
  },
  {
    id: 'team',
    label: 'Team/HR',
    icon: Briefcase,
    description: 'Employee agreements, handbook',
    impact: 'moderate' as const,
  },
  {
    id: 'ipTech',
    label: 'IP/Tech',
    icon: Cpu,
    description: 'IP assignments, software licenses',
    impact: 'moderate' as const,
  },
]

const IMPACT_COLORS = {
  critical: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400',
  important: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  moderate: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400',
}

interface EvidenceEmptyStateProps {
  onCategoryClick?: (categoryId: string) => void
}

export function EvidenceEmptyState({ onCategoryClick }: EvidenceEmptyStateProps) {
  const router = useRouter()
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const handleCardClick = (categoryId: string) => {
    if (onCategoryClick) {
      onCategoryClick(categoryId)
    } else {
      // For now, scroll to show that they need to upload - will be enhanced with upload modal
      // This is the MVP behavior; sprint 2 adds actual upload modals
      router.push(`/dashboard/evidence?category=${categoryId}`)
    }
  }

  return (
    <div className="flex flex-col items-center py-12 text-center">
      <FileCheck className="w-12 h-12 text-muted-foreground/40" />
      <h2 className="text-lg font-semibold text-foreground mt-4">
        Build your buyer-ready evidence
      </h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-lg">
        Buyers evaluate six categories of evidence during due diligence.
        Start with the documents you already have.
      </p>

      {/* Quick Start Category Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-8 w-full max-w-2xl">
        {CATEGORY_CARDS.map((card) => {
          const Icon = card.icon
          const isHovered = hoveredCard === card.id
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className={cn(
                'rounded-xl border border-border/50 p-4 text-left transition-all duration-200',
                'hover:bg-muted/30 hover:border-primary/30 hover:shadow-sm',
                isHovered && 'border-primary/30 bg-muted/30'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  'bg-muted'
                )}>
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {card.label}
                    </span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize',
                      IMPACT_COLORS[card.impact]
                    )}>
                      {card.impact}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {card.description}
                  </p>
                </div>
              </div>
              <div className={cn(
                'flex items-center gap-1.5 mt-3 text-xs font-medium',
                'text-primary transition-opacity',
                isHovered ? 'opacity-100' : 'opacity-60'
              )}>
                <Upload className="w-3.5 h-3.5" />
                Upload your first document
              </div>
            </button>
          )
        })}
      </div>

      {/* Helpful tip */}
      <p className="text-xs text-muted-foreground mt-6 max-w-md">
        Start with Financial documents — buyers request these in 100% of deals.
        Tax returns and financial statements are the most impactful.
      </p>
    </div>
  )
}
