'use client'

import { cn } from '@/lib/utils'

interface CategoryNavProps {
  categories: Array<{
    id: string
    label: string
    documentsUploaded: number
    documentsExpected: number
  }>
  activeTab: string // 'all' | category id
  onTabChange: (tab: string) => void
}

export function CategoryNav({ categories, activeTab, onTabChange }: CategoryNavProps) {
  return (
    <div className="sticky top-[4.5rem] z-30 bg-muted dark:bg-background py-2 border-b border-border/30">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Gradient fade on mobile scroll */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-muted dark:from-background to-transparent pointer-events-none md:hidden" />

        <div className="flex gap-2 overflow-x-auto snap-x scrollbar-hide -mx-1 px-1">
          {/* All tab */}
          <button
            onClick={() => onTabChange('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap snap-start',
              activeTab === 'all'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            All
          </button>

          {/* Category tabs */}
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onTabChange(category.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap snap-start',
                activeTab === category.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {category.label}
              <span className="text-xs opacity-70 ml-1">
                ({category.documentsUploaded}/{category.documentsExpected})
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
