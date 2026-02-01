'use client'

import Link from 'next/link'
import { motion } from '@/lib/motion'
import { DealStatus } from '@prisma/client'
import { cn } from '@/lib/utils'
import { Calendar, Users, Building2, ChevronRight } from 'lucide-react'
import type { Deal } from './types'

const STATUS_COLORS: Record<DealStatus, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700' },
  CLOSED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  TERMINATED: { bg: 'bg-red-100', text: 'text-red-700' },
  ON_HOLD: { bg: 'bg-amber-100', text: 'text-amber-700' },
}

const STATUS_LABELS: Record<DealStatus, string> = {
  ACTIVE: 'Active',
  CLOSED: 'Closed',
  TERMINATED: 'Terminated',
  ON_HOLD: 'On Hold',
}

interface DealCardProps {
  deal: Deal
}

export function DealCard({ deal }: DealCardProps) {
  const statusColors = STATUS_COLORS[deal.status]

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Link href={`/dashboard/deals/${deal.id}`}>
      <motion.div
        whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-background rounded-xl border shadow-sm p-4 cursor-pointer group"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {deal.codeName}
              </h3>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                  statusColors.bg,
                  statusColors.text
                )}
              >
                {STATUS_LABELS[deal.status]}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span className="truncate">{deal.company.name}</span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Description */}
        {deal.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {deal.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="font-medium">{deal._count.buyers}</span>
              <span>buyer{deal._count.buyers !== 1 ? 's' : ''}</span>
            </span>
            {deal.targetCloseDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>Target: {formatDate(deal.targetCloseDate)}</span>
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
