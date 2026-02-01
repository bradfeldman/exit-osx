'use client'

import { LazyMotion, domAnimation, m, AnimatePresence, useInView } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'

/**
 * MotionProvider - Wraps app with LazyMotion for reduced bundle size
 * Uses domAnimation features (~60% smaller than full framer-motion)
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  )
}

// Re-export m as motion for backward compatibility
// Components using these will benefit from lazy loading when wrapped in MotionProvider
export { m as motion, AnimatePresence, useInView }
export type { HTMLMotionProps }
