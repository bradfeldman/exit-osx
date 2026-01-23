'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HorizontalScrollContainerProps {
  children: React.ReactNode
  className?: string
  itemClassName?: string
}

export function HorizontalScrollContainer({
  children,
  className,
  itemClassName,
}: HorizontalScrollContainerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Touch handling for swipe
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    updateScrollButtons()

    // Add scroll listener
    container.addEventListener('scroll', updateScrollButtons)

    // Add resize observer
    const resizeObserver = new ResizeObserver(updateScrollButtons)
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('scroll', updateScrollButtons)
      resizeObserver.disconnect()
    }
  }, [updateScrollButtons])

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.8
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swipe left - scroll right
        scroll('right')
      } else {
        // Swipe right - scroll left
        scroll('left')
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      scroll('left')
    } else if (e.key === 'ArrowRight') {
      scroll('right')
    }
  }

  return (
    <div className={cn('relative group', className)}>
      {/* Left Arrow */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white shadow-lg border-gray-200',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
          'disabled:opacity-0',
          !canScrollLeft && 'hidden'
        )}
        onClick={() => scroll('left')}
        disabled={!canScrollLeft}
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* Scroll Container */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth',
          'snap-x snap-mandatory',
          'px-1 py-1', // Padding for shadow/border visibility
          itemClassName
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Financial periods"
      >
        {children}
      </div>

      {/* Right Arrow */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white shadow-lg border-gray-200',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
          'disabled:opacity-0',
          !canScrollRight && 'hidden'
        )}
        onClick={() => scroll('right')}
        disabled={!canScrollRight}
        aria-label="Scroll right"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* Mobile Navigation Hint */}
      <div className="md:hidden text-center text-xs text-gray-400 mt-2">
        Swipe to see more years
      </div>
    </div>
  )
}
