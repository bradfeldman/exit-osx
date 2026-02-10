'use client'

import { cn } from '@/lib/utils'
import { CONTACT_CATEGORY_COLORS, CONTACT_CATEGORY_LABELS } from '@/lib/contact-system/constants'

interface CategoryBadgeProps {
  category: string
  className?: string
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const colors = CONTACT_CATEGORY_COLORS[category] ?? CONTACT_CATEGORY_COLORS.OTHER

  return (
    <span
      className={cn(
        'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
        colors.bg,
        colors.text,
        colors.darkBg,
        colors.darkText,
        className
      )}
    >
      {CONTACT_CATEGORY_LABELS[category] ?? category}
    </span>
  )
}
