'use client'

import {
  DollarSign,
  Scale,
  Briefcase,
  Users,
  UserCheck,
  Cpu,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CategorySectionHeaderProps {
  id: string
  label: string
  buyerImpact: 'critical' | 'important' | 'moderate'
  documentsUploaded: number
  documentsExpected: number
  percentage: number
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  financial: DollarSign,
  legal: Scale,
  operational: Briefcase,
  customers: Users,
  team: UserCheck,
  ipTech: Cpu,
}

const BUYER_IMPACT_STYLES = {
  critical: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  important: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  moderate: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
}

const BUYER_IMPACT_LABELS = {
  critical: 'Critical',
  important: 'Important',
  moderate: 'Moderate',
}

/**
 * CategorySectionHeader
 *
 * Header for each evidence category section showing icon, name, progress ring,
 * document count, and buyer impact indicator.
 *
 * @example
 * <CategorySectionHeader
 *   id="financial"
 *   label="Financial Records"
 *   buyerImpact="critical"
 *   documentsUploaded={12}
 *   documentsExpected={15}
 *   percentage={80}
 * />
 */
export function CategorySectionHeader({
  id,
  label,
  buyerImpact,
  documentsUploaded,
  documentsExpected,
  percentage,
}: CategorySectionHeaderProps) {
  const Icon = CATEGORY_ICONS[id] || Briefcase

  // Progress ring configuration
  const size = 40
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  // Color logic: burnt-orange < 70%, emerald >= 70%
  const progressColor = percentage >= 70
    ? 'stroke-emerald-500'
    : 'stroke-primary'

  return (
    <div className="flex items-center gap-3 sm:gap-4 py-4">
      {/* Category Icon */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="w-5 h-5 text-foreground" />
        </div>
      </div>

      {/* Category Name + Document Count (stacked on mobile) */}
      <div className="flex-1 min-w-0">
        <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">{label}</h3>
        <p className="text-xs text-muted-foreground sm:hidden">
          {documentsUploaded}/{documentsExpected} docs
        </p>
      </div>

      {/* Mini Progress Ring */}
      <div className="flex-shrink-0 relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-muted fill-none"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={cn('fill-none transition-all duration-500', progressColor)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-semibold text-foreground">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>

      {/* Document Count (desktop only) */}
      <div className="flex-shrink-0 hidden sm:block">
        <p className="text-sm text-muted-foreground">
          {documentsUploaded} of {documentsExpected} uploaded
        </p>
      </div>

      {/* Buyer Impact Pill */}
      <div className="flex-shrink-0">
        <span
          className={cn(
            'inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium',
            BUYER_IMPACT_STYLES[buyerImpact]
          )}
        >
          {BUYER_IMPACT_LABELS[buyerImpact]}
        </span>
      </div>
    </div>
  )
}
